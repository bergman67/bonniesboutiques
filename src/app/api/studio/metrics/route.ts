import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';

const ROOT_DIR = process.cwd();
const METRICS_JSON_PATH = path.join(ROOT_DIR, 'public', 'exports', 'social-metrics.json');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isRefreshRequested = searchParams.get('refresh') === '1';

    if (isRefreshRequested) {
      const authErr = await requireAdminAuth(request);
      if (authErr) return authErr;
    }

    const shouldRefresh = isRefreshRequested || !fs.existsSync(METRICS_JSON_PATH);

    if (shouldRefresh) {
      try {
        execFileSync('node', ['scripts/track-metrics.mjs'], {
          cwd: ROOT_DIR,
          stdio: 'ignore',
          timeout: 25000,
        });
      } catch {
        // Fallback to cached JSON if running in serverless environment without local CLI
      }
    }

    if (fs.existsSync(METRICS_JSON_PATH)) {
      const data = JSON.parse(fs.readFileSync(METRICS_JSON_PATH, 'utf8'));
      return NextResponse.json(data);
    }

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      goalViews: 100000,
      totalViews: 0,
      remainingViews: 100000,
      progressPercent: 0,
      totalLikes: 0,
      totalComments: 0,
      totalFollowers: 0,
      totalVideosPublished: 0,
      platforms: [],
      topVideos: [],
      snapshots: [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load metrics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
