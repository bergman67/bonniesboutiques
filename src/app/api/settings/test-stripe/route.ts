import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    let secretKey = body.stripeSecretKey?.trim();

    if (!secretKey || secretKey.includes('••••')) {
      const settings = await prisma.storeSettings.findUnique({
        where: { id: 'default' },
      });
      secretKey = settings?.stripeSecretKey || process.env.STRIPE_SECRET_KEY || '';
    }

    if (!secretKey) {
      return NextResponse.json(
        { valid: false, error: 'No Stripe Secret Key found. Paste your sk_live_... or sk_test_... key first.' },
        { status: 400 }
      );
    }

    if (!secretKey.startsWith('sk_') && !secretKey.startsWith('rk_')) {
      return NextResponse.json(
        { valid: false, error: 'Key must start with "sk_live_", "sk_test_", or "rk_". Make sure you copied the Secret Key, not the Publishable Key!' },
        { status: 400 }
      );
    }

    const stripe = new Stripe(secretKey);
    const balance = await stripe.balance.retrieve();

    const isLive = balance.livemode || secretKey.startsWith('sk_live_') || secretKey.startsWith('rk_live_');
    const currency = balance.available?.[0]?.currency?.toUpperCase() || 'USD';

    return NextResponse.json({
      valid: true,
      mode: isLive ? 'LIVE' : 'TEST',
      accountName: isLive ? 'Bonnie\'s Boutique (Live Stripe)' : 'Bonnie\'s Boutique (Test Mode)',
      chargesEnabled: true,
      Currency: currency,
    });
  } catch (err) {
    return NextResponse.json(
      { valid: false, error: (err as Error).message || 'Failed to verify Stripe key' },
      { status: 400 }
    );
  }
}
