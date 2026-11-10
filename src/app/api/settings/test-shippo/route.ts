import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveReturnAddress } from '@/lib/shipping';
import { verifyAdminPin } from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';

async function handleShippoTest(request: NextRequest, body: Record<string, unknown> = {}) {
  try {
    const settings = await prisma.storeSettings.findUnique({
      where: { id: 'default' },
    });

    const requiredPin = settings?.adminPin || process.env.ADMIN_PASSWORD || '';
    const providedPin = request.headers.get('x-admin-pin') || '';

    if (!requiredPin) {
      return NextResponse.json(
        { ok: false, valid: false, error: 'Admin PIN must be configured before testing Shippo.' },
        { status: 401 }
      );
    }

    if (!verifyAdminPin(providedPin, requiredPin)) {
      return NextResponse.json(
        { ok: false, valid: false, error: 'Unauthorized: Invalid admin PIN' },
        { status: 401 }
      );
    }

    let apiKey = typeof body.shippoApiKey === 'string' ? body.shippoApiKey.trim() : '';

    if (!apiKey || apiKey.includes('••••')) {
      apiKey = settings?.shippoApiKey || process.env.SHIPPO_API_KEY || '';
    }

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, valid: false, error: 'No Shippo API Token found. Paste your shippo_live_... or shippo_test_... token first.' },
        { status: 400 }
      );
    }

    const carrierRes = await fetch('https://api.goshippo.com/carrier_accounts/?results=5', {
      headers: {
        Authorization: `ShippoToken ${apiKey}`,
      },
    });

    if (!carrierRes.ok) {
      return NextResponse.json(
        { ok: false, valid: false, error: 'Invalid Shippo API Token. Please double-check the token from goshippo.com.' },
        { status: 400 }
      );
    }

    const carrierData = await carrierRes.json();
    const isLive = apiKey.startsWith('shippo_live_');
    const carriers = Array.isArray(carrierData.results)
      ? carrierData.results.map((c: { carrier?: string }) => (c.carrier || '').toUpperCase()).filter(Boolean)
      : ['USPS'];

    const tempSettings = {
      ...settings,
      ...(typeof body.returnName === 'string' ? { returnName: body.returnName } : {}),
      ...(typeof body.returnStreet === 'string' ? { returnStreet: body.returnStreet } : {}),
      ...(typeof body.returnCity === 'string' ? { returnCity: body.returnCity } : {}),
      ...(typeof body.returnState === 'string' ? { returnState: body.returnState } : {}),
      ...(typeof body.returnZip === 'string' ? { returnZip: body.returnZip } : {}),
    };

    const resolved = await resolveReturnAddress(tempSettings, apiKey);

    return NextResponse.json({
      ok: true,
      valid: true,
      mode: isLive ? 'LIVE' : 'TEST',
      carriers: carriers.length > 0 ? Array.from(new Set(carriers)).join(', ') : 'USPS',
      activeAddressSource: resolved.activeAddressSource,
      address: resolved.address,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, valid: false, error: (err as Error).message || 'Failed to verify Shippo connection' },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return handleShippoTest(request, body);
}

export async function GET(request: NextRequest) {
  return handleShippoTest(request, {});
}
