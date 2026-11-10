-- ==============================================================================
-- Supabase PostgreSQL Row Level Security (RLS) Hardening & PostgREST Lockdown
-- Bonnie's Boutique (B&T Trinkets) - Requirement R1 & Gate A
-- ==============================================================================

-- 1. Enable and Force Row Level Security on all public tables
ALTER TABLE public."Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Product" FORCE ROW LEVEL SECURITY;

ALTER TABLE public."StoreSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StoreSettings" FORCE ROW LEVEL SECURITY;

ALTER TABLE public."Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Order" FORCE ROW LEVEL SECURITY;

-- 2. Create _prisma_migrations table if not exists, enable & force RLS, revoke public privileges
CREATE TABLE IF NOT EXISTS public."_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_prisma_migrations" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."_prisma_migrations" FROM anon, authenticated;

-- 3. Defend future tables created in schema public from inheriting public access
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- 4. Revoke direct table permissions on sensitive tables from anon and authenticated
REVOKE ALL ON TABLE public."StoreSettings" FROM anon, authenticated;
REVOKE ALL ON TABLE public."Order" FROM anon, authenticated;

-- 5. Restrict Product permissions: revoke all write privileges, grant only SELECT
REVOKE ALL ON TABLE public."Product" FROM anon, authenticated;
GRANT SELECT ON TABLE public."Product" TO anon, authenticated;

-- 6. Clean up existing policies for idempotency
DROP POLICY IF EXISTS "Public can view published products" ON public."Product";
DROP POLICY IF EXISTS "Service role full access on Product" ON public."Product";
DROP POLICY IF EXISTS "Service role full access on StoreSettings" ON public."StoreSettings";
DROP POLICY IF EXISTS "Service role full access on Order" ON public."Order";
DROP POLICY IF EXISTS "Service role full access on _prisma_migrations" ON public."_prisma_migrations";

-- 7. Define explicit restrictive RLS policies
-- Public/anon can only SELECT published items (where isDraft = false)
CREATE POLICY "Public can view published products"
  ON public."Product"
  FOR SELECT
  TO anon, authenticated
  USING ("isDraft" = false);

-- Explicit full access policies for service_role
CREATE POLICY "Service role full access on Product"
  ON public."Product"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on StoreSettings"
  ON public."StoreSettings"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on Order"
  ON public."Order"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on _prisma_migrations"
  ON public."_prisma_migrations"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
