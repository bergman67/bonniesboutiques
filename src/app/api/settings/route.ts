import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveReturnAddress } from '@/lib/shipping';
import { verifyAdminPin } from '@/lib/auth/adminAuth';

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

    const url = request.nextUrl ?? new URL(request.url);
    const isAdmin = url.searchParams.get('admin') === 'true';

    // Self-healing fallback: seed geminiApiKey from env if not present in DB
    if (!settings.geminiApiKey && process.env.GEMINI_API_KEY) {
      try {
        settings = await prisma.storeSettings.update({
          where: { id: 'default' },
          data: { geminiApiKey: process.env.GEMINI_API_KEY },
        });
      } catch (seedErr) {
        console.warn('Auto-seed geminiApiKey failed:', seedErr);
      }
    }

    const effectiveSecretKey = settings.stripeSecretKey || process.env.STRIPE_SECRET_KEY || null;
    const effectivePublishableKey = settings.stripePublishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;
    const effectiveShippoKey = settings.shippoApiKey || process.env.SHIPPO_API_KEY || null;
    const effectiveGeminiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY || null;

    const publicSettings = {
      enableStripe: settings.enableStripe && Boolean(effectiveSecretKey),
      enableVenmo: settings.enableVenmo,
      enablePaypal: settings.enablePaypal,
      venmoHandle: settings.venmoHandle,
      paypalEmail: settings.paypalEmail,
      shippingFlatRate: settings.shippingFlatRate,
      freeShippingThreshold: settings.freeShippingThreshold,
      stripeConfigured: Boolean(effectiveSecretKey),
    };

    // Public request (storefront checkout or non-admin query)
    if (!isAdmin) {
      return NextResponse.json(publicSettings);
    }

    // Admin authentication: strictly check header 'x-admin-pin' (disallow query param to prevent URL leak)
    const providedPin = request.headers.get('x-admin-pin') || '';
    const requiredPin = settings.adminPin || process.env.ADMIN_PASSWORD || '';

    // If no PIN is configured in DB/env yet, prompt first-time setup and omit sensitive return address & secrets
    if (!requiredPin) {
      return NextResponse.json({
        requiresAuth: false,
        hasAdminPin: false,
        ...publicSettings,
      });
    }

    // If PIN does not match, return auth required without sensitive fields (HTTP 401)
    if (!verifyAdminPin(providedPin, requiredPin)) {
      return NextResponse.json(
        { error: 'Unauthorized', requiresAuth: true, hasAdminPin: true },
        { status: 401 }
      );
    }

    // Admin authenticated successfully: resolve return address
    const addressResolution = await resolveReturnAddress(settings, effectiveShippoKey);

    return NextResponse.json({
      id: settings.id,
      requiresAuth: false,
      hasAdminPin: true,
      adminPinConfigured: true,
      activeAddressSource: addressResolution.activeAddressSource,
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
      shippoConfigured: Boolean(effectiveShippoKey),
      shippoKeyMasked: maskKey(effectiveShippoKey),
      geminiConfigured: Boolean(effectiveGeminiKey),
      geminiKeyMasked: maskKey(effectiveGeminiKey),
      geminiKeySource: settings.geminiApiKey ? 'database' : (process.env.GEMINI_API_KEY ? 'env' : 'none'),
      autoCreateLabel: settings.autoCreateLabel,
      autoPrintQueue: settings.autoPrintQueue,
      returnName: settings.returnName || "Bonnie's Boutique",
      returnStreet: settings.returnStreet || '',
      returnCity: settings.returnCity || '',
      returnState: settings.returnState || '',
      returnZip: settings.returnZip || '',
      defaultWeightOz: settings.defaultWeightOz ?? 4.0,
      shippoReturnAddress: addressResolution.activeAddressSource === 'shippo_address_book' ? addressResolution.address : null,
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

    const requiredPin = existing?.adminPin || process.env.ADMIN_PASSWORD || '';
    const providedPin = request.headers.get('x-admin-pin') || body.verifyPin || '';

    // If an adminPin is already set, always require it to update settings
    if (requiredPin && !verifyAdminPin(providedPin, requiredPin)) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Admin Password' }, { status: 401 });
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

    if (typeof body.shippoApiKey === 'string') {
      const trimmedShippo = body.shippoApiKey.trim();
      if (trimmedShippo === '') {
        updateData.shippoApiKey = null;
      } else if (!trimmedShippo.includes('••••')) {
        updateData.shippoApiKey = trimmedShippo;
      }
    }
    if (body.geminiApiKey === null) {
      updateData.geminiApiKey = null;
    } else if (typeof body.geminiApiKey === 'string') {
      const trimmedGemini = body.geminiApiKey.trim();
      if (trimmedGemini !== '' && !trimmedGemini.includes('••••')) {
        updateData.geminiApiKey = trimmedGemini;
      }
    }
    if (typeof body.autoCreateLabel === 'boolean') {
      updateData.autoCreateLabel = body.autoCreateLabel;
    }
    if (typeof body.autoPrintQueue === 'boolean') {
      updateData.autoPrintQueue = body.autoPrintQueue;
    }
    if (typeof body.returnName === 'string') {
      updateData.returnName = body.returnName.trim() || "Bonnie's Boutique";
    }
    if (typeof body.returnStreet === 'string') {
      updateData.returnStreet = body.returnStreet.trim() || null;
    }
    if (typeof body.returnCity === 'string') {
      updateData.returnCity = body.returnCity.trim() || null;
    }
    if (typeof body.returnState === 'string') {
      updateData.returnState = body.returnState.trim() || null;
    }
    if (typeof body.returnZip === 'string') {
      updateData.returnZip = body.returnZip.trim() || null;
    }
    if (body.defaultWeightOz !== undefined) {
      updateData.defaultWeightOz = Math.max(0.5, parseFloat(body.defaultWeightOz) || 4.0);
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
    const effectiveShippoKey = updated.shippoApiKey || process.env.SHIPPO_API_KEY || null;
    const effectiveGeminiKey = updated.geminiApiKey || process.env.GEMINI_API_KEY || null;
    const addressResolution = await resolveReturnAddress(updated, effectiveShippoKey);

    return NextResponse.json({
      success: true,
      stripeConfigured: Boolean(effectiveSecretKey),
      stripeSecretKeyMasked: maskKey(effectiveSecretKey),
      shippoConfigured: Boolean(effectiveShippoKey),
      shippoKeyMasked: maskKey(effectiveShippoKey),
      geminiConfigured: Boolean(effectiveGeminiKey),
      geminiKeyMasked: maskKey(effectiveGeminiKey),
      activeAddressSource: addressResolution.activeAddressSource,
    });
  } catch (error) {
    console.error('Failed to update store settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return PUT(request);
}
