import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!directUrl) {
  console.error('❌ Neither DIRECT_URL nor DATABASE_URL is defined in .env');
  process.exit(1);
}

const maskedUrl = directUrl.replace(/:[^:@]+@/, ':***@');
console.log(`🔐 Connecting to PostgreSQL using: ${maskedUrl}`);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directUrl
    }
  }
});

/**
 * Cleanly strips SQL comments and breaks script into discrete executable statements.
 */
function parseSqlStatements(sqlContent) {
  const lines = sqlContent.split('\n');
  const cleanedLines = [];
  let inBlockComment = false;

  for (const line of lines) {
    let cleaned = line;
    if (inBlockComment) {
      const endCommentIdx = cleaned.indexOf('*/');
      if (endCommentIdx !== -1) {
        cleaned = cleaned.substring(endCommentIdx + 2);
        inBlockComment = false;
      } else {
        continue;
      }
    }
    while (cleaned.includes('/*')) {
      const startCommentIdx = cleaned.indexOf('/*');
      const endCommentIdx = cleaned.indexOf('*/', startCommentIdx + 2);
      if (endCommentIdx !== -1) {
        cleaned = cleaned.substring(0, startCommentIdx) + cleaned.substring(endCommentIdx + 2);
      } else {
        cleaned = cleaned.substring(0, startCommentIdx);
        inBlockComment = true;
        break;
      }
    }
    const singleCommentIdx = cleaned.indexOf('--');
    if (singleCommentIdx !== -1) {
      cleaned = cleaned.substring(0, singleCommentIdx);
    }
    cleanedLines.push(cleaned);
  }

  const cleanedSql = cleanedLines.join('\n');
  return cleanedSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

async function applyHardening() {
  const migrationPath = path.resolve(__dirname, '../prisma/migrations/20261027210000_enable_rls_lockdown/migration.sql');
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration SQL file not found at: ${migrationPath}`);
  }

  console.log(`📖 Reading migration SQL: ${migrationPath}`);
  const sqlContent = fs.readFileSync(migrationPath, 'utf8');
  const statements = parseSqlStatements(sqlContent);
  console.log(`📋 Found ${statements.length} SQL statements to execute.`);

  console.log('\n🚀 Executing migration statements...');
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.replace(/\s+/g, ' ').substring(0, 60);
    try {
      await prisma.$executeRawUnsafe(stmt);
      console.log(`  [${i + 1}/${statements.length}] ✅ Executed: ${preview}...`);
    } catch (err) {
      console.error(`  [${i + 1}/${statements.length}] ❌ Failed executing: ${preview}...`);
      console.error(`     Error: ${err.message}`);
      throw err;
    }
  }

  // Double check all public tables and ensure 100% have RLS enabled and forced
  console.log('\n🔍 Verifying all public tables have Row-Level Security active...');
  const publicTables = await prisma.$queryRawUnsafe(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename ASC
  `);

  console.log('📊 Current public tables RLS status:');
  for (const table of publicTables) {
    console.log(`  - Table "${table.tablename}": rowsecurity = ${table.rowsecurity}`);
    if (!table.rowsecurity) {
      console.log(`    ⚠️ Enabling and forcing RLS on "${table.tablename}"...`);
      await prisma.$executeRawUnsafe(`ALTER TABLE public."${table.tablename}" ENABLE ROW LEVEL SECURITY;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE public."${table.tablename}" FORCE ROW LEVEL SECURITY;`);
    }
  }

  // Re-verify final state
  const finalTables = await prisma.$queryRawUnsafe(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename ASC
  `);

  const unsecureTables = finalTables.filter(t => !t.rowsecurity);
  if (unsecureTables.length > 0) {
    throw new Error(`Security failure: Found tables without RLS: ${unsecureTables.map(t => t.tablename).join(', ')}`);
  }

  console.log('\n✅ Supabase PostgreSQL RLS Hardening & PostgREST Lockdown applied successfully!');
  console.log(`✅ 100% of tables in schema 'public' (${finalTables.length} tables) have rowsecurity = true.`);
}

applyHardening()
  .catch((err) => {
    console.error('\n❌ Fatal error applying RLS hardening:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
