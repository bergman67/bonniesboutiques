import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    let apiKey = body.shippoApiKey?.trim();

    if (!apiKey || apiKey.includes('••••')) {
      const settings = await prisma.storeSettings.findUnique({
        where: { id: 'default' },
      });
      apiKey = settings?.shippoApiKey || process.env.SHIPPO_API_KEY || '';
    }

    if (!apiKey) {
      return NextResponse.json(
        { valid: false, error: 'No Shippo API Token found. Paste your shippo_live_... or shippo_test_... token first.' },
        { status: 400 }
      );
    }

    const res = await fetch('https://api.goshippo.com/carrier_accounts/?results=5', {
      headers: {
        Authorization: `ShippoToken ${apiKey}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { valid: false, error: 'Invalid Shippo API Token. Please double-check the token from goshippo.com.' },
        { status: 400 }
      );
    }

    const data = await res.json();
    const isLive = apiKey.startsWith('shippo_live_');
    const carriers = Array.isArray(data.results)
      ? data.results.map((c: { carrier?: string }) => (c.carrier || '').toUpperCase()).filter(Boolean)
      : ['USPS'];

    return NextResponse.json({
      valid: true,
      mode: isLive ? 'LIVE' : 'TEST',
      carriers: carriers.length > 0 ? Array.from(new Set(carriers)).join(', ') : 'USPS',
    });
  } catch (err) {
    return NextResponse.json(
      { valid: false, error: (err as Error).message || 'Failed to verify Shippo token' },
      { status: 400 }
    );
  }
}
