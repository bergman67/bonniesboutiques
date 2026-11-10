import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildMasterAutopilotQueue, checkPlatformCredentials } from '@/lib/studio/socialPublisher';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

const STATE_PATH = path.join(process.cwd(), 'public', 'exports', 'autopilot-state.json');

export async function GET() {
  const queue = buildMasterAutopilotQueue();
  const credentials = checkPlatformCredentials(process.env);

  let state = {
    enabled: true,
    cadenceCron: 'CRON_TZ=America/New_York 0 * * * *',
    cadenceLabel: 'Hourly 24/7 Continuous Rotation',
    currentQueueIndex: 0,
    totalEpisodesInPool: queue.length,
    lastRunAt: null,
    nextScheduledDescription: 'Top of every hour (24/7 continuous loop)',
    history: [],
  };

  if (fs.existsSync(STATE_PATH)) {
    try {
      state = {
        ...state,
        ...JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')),
        totalEpisodesInPool: queue.length,
      };
    } catch {
      // ignore parse error
    }
  }

  const upcomingEpisodes = [];
  for (let i = 0; i < 6; i++) {
    const ep = queue[(state.currentQueueIndex + i) % queue.length];
    upcomingEpisodes.push({
      queuePosition: ((state.currentQueueIndex + i) % queue.length) + 1,
      skitId: ep.skitId,
      title: ep.title,
      category: ep.category,
      productTitle: ep.productTitle,
      videoFilename: ep.videoFilename,
      durationSeconds: ep.durationSeconds,
    });
  }

  return NextResponse.json({
    state,
    credentials,
    upcomingEpisodes,
  });
}

export async function POST(req: Request) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode === 'live' ? 'live' : 'dry_run';
    const skitId = typeof body.skitId === 'string' ? body.skitId : undefined;

    const args = ['scripts/publish-socials.mjs'];
    if (mode === 'dry_run') args.push('--dry-run');
    if (skitId) args.push(`--skit=${skitId}`);

    const output = execFileSync('node', args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 120000,
    });

    const state = fs.existsSync(STATE_PATH)
      ? JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'))
      : null;

    return NextResponse.json({
      ok: true,
      output,
      state,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to run autopilot publisher';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
