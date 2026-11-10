import { NextResponse } from 'next/server';

export async function GET() {
  return new NextResponse('tiktok-developers-site-verification=iemAiGhzS2S2nKm2YNUqDXRnwacMqL6b', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
