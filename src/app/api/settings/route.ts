import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';


function maskKey(key: string | null | undefined): string {
  if (!key) return '';
  if (key.length <= 12) return '••••••••';
  return `${key.slice(0, 7)}••••••••${key.slice(-4)}`;
}

export async function GET(request: NextRequest) {
  try {
    let settings = await prisma.storeSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await prisma.storeSettings.create({
        data: { id: 'default' },
      });
    }

    const isAdmin = request.nextUrl.searchParams.get('admin') === 'true';
    const effectiveSecretKey = settings.stripeSecretKey || process.env.STRIPE_SECRET_KEY || null;
    const effectivePublishableKey = settings.stripePublishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;

    if (!isAdmin) {
      return NextResponse.json({
        enableStripe: settings.enableStripe && Boolean(effectiveSecretKey),
        enableVenmo: settings.enableVenmo,
        enablePaypal: settings.enablePaypal,
        venmoHandle: settings.venmoHandle,
        paypalEmail: settings.paypalEmail,
        shippingFlatRate: settings.shippingFlatRate,
        freeShippingThreshold: settings.freeShippingThreshold,
        stripeConfigured: Boolean(effectiveSecretKey),
      });
    }

    return NextResponse.json({
      id: settings.id,
      stripeConfigured: Boolean(effectiveSecretKey),
      stripeKeySource: settings.stripeSecretKey ? 'database' : process.env.STRIPE_SECRET_KEY ? 'env' : 'none',
      stripeSecretKeyMasked: maskKey(effectiveSecretKey),
      stripePublishableKey: effectivePublishableKey || '',
      venmoHandle: settings.venmoHandle,
      paypalEmail: settings.paypalEmail || '',
      enableStripe: settings.enableStripe,
      enableVenmo: settings.enableVenmo,
      enablePaypal: settings.enablePaypal,
      shippingFlatRate: settings.shippingFlatRate,
      freeShippingThreshold: settings.freeShippingThreshold,
      hasAdminPin: Boolean(settings.adminPin),
    });
  } catch (error) {
    console.error('Failed to fetch store settings:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const existing = await prisma.storeSettings.findUnique({
      where: { id: 'default' },
    });

    // If an adminPin is already set, verify it if provided or required
    if (existing?.adminPin && body.verifyPin !== undefined) {
      if (body.verifyPin !== existing.adminPin) {
        return NextResponse.json({ error: 'Invalid Admin PIN' }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = {};

    // Only update stripeSecretKey if user entered a non-masked real key (or explicitly cleared it)
    if (typeof body.stripeSecretKey === 'string') {
      const trimmed = body.stripeSecretKey.trim();
      if (trimmed === '') {
        updateData.stripeSecretKey = null;
      } else if (!trimmed.includes('••••')) {
        updateData.stripeSecretKey = trimmed;
      }
    }

    if (typeof body.stripePublishableKey === 'string') {
      updateData.stripePublishableKey = body.stripePublishableKey.trim() || null;
    }
    if (typeof body.venmoHandle === 'string') {
      updateData.venmoHandle = body.venmoHandle.trim() || '@BonniesBoutique';
    }
    if (typeof body.paypalEmail === 'string') {
      updateData.paypalEmail = body.paypalEmail.trim() || null;
    }
    if (typeof body.enableStripe === 'boolean') {
      updateData.enableStripe = body.enableStripe;
    }
    if (typeof body.enableVenmo === 'boolean') {
      updateData.enableVenmo = body.enableVenmo;
    }
    if (typeof body.enablePaypal === 'boolean') {
      updateData.enablePaypal = body.enablePaypal;
    }
    if (body.shippingFlatRate !== undefined) {
      updateData.shippingFlatRate = Math.max(0, parseFloat(body.shippingFlatRate) || 0);
    }
    if (body.freeShippingThreshold !== undefined) {
      updateData.freeShippingThreshold = Math.max(0, parseFloat(body.freeShippingThreshold) || 0);
    }
    if (typeof body.newAdminPin === 'string') {
      updateData.adminPin = body.newAdminPin.trim() || null;
    }

    const updated = await prisma.storeSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        ...updateData,
      },
      update: updateData,
    });

    const effectiveSecretKey = updated.stripeSecretKey || process.env.STRIPE_SECRET_KEY || null;

    return NextResponse.json({
      success: true,
      stripeConfigured: Boolean(effectiveSecretKey),
      stripeSecretKeyMasked: maskKey(effectiveSecretKey),
    });
  } catch (error) {
    console.error('Failed to update store settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
