import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import { generateShippingLabelForOrder } from '@/lib/shipping';
import { calculateOrderPricing, MIN_ORDER_SUBTOTAL } from '@/lib/coupons';

type CartItem = {
  id: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
};

function buildStripeLineItems(
  items: CartItem[],
  origin: string,
  targetDiscountedCents: number,
  couponCode?: string,
  percentOff?: number
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const sanitized = items.map((item) => ({
    title: String(item.title || 'Handcrafted Trinket'),
    priceCents: Math.max(1, Math.round((Number(item.price) || 0) * 100)),
    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    images: item.imageUrl
      ? item.imageUrl.startsWith('http')
        ? [item.imageUrl]
        : [`${origin}${item.imageUrl}`]
      : [],
  }));

  if (!couponCode || !percentOff || percentOff <= 0) {
    return sanitized.map((it) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: it.title,
          images: it.images,
        },
        unit_amount: it.priceCents,
      },
      quantity: it.quantity,
    }));
  }

  const multiplier = Math.max(0, 100 - percentOff) / 100;
  const discounted = sanitized.map((it) => ({
    ...it,
    discUnitCents: Math.max(1, Math.floor(it.priceCents * multiplier)),
  }));

  const currentSum = discounted.reduce((acc, it) => acc + it.discUnitCents * it.quantity, 0);
  const diff = targetDiscountedCents - currentSum;
  const promoNote = `Includes code ${couponCode} (${percentOff}% off)`;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  discounted.forEach((it, idx) => {
    const isLast = idx === discounted.length - 1;
    if (!isLast || diff === 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: it.title,
            description: promoNote,
            images: it.images,
          },
          unit_amount: it.discUnitCents,
        },
        quantity: it.quantity,
      });
    } else if (it.quantity === 1) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: it.title,
            description: promoNote,
            images: it.images,
          },
          unit_amount: Math.max(1, it.discUnitCents + diff),
        },
        quantity: 1,
      });
    } else {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: it.title,
            description: promoNote,
            images: it.images,
          },
          unit_amount: it.discUnitCents,
        },
        quantity: it.quantity - 1,
      });
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: it.title,
            description: promoNote,
            images: it.images,
          },
          unit_amount: Math.max(1, it.discUnitCents + diff),
        },
        quantity: 1,
      });
    }
  });

  return lineItems;
}

export async function POST(request: NextRequest) {
  try {
    const { items, form, total, promoCode, attribution } = await request.json();

    // Load store settings from DB (or fallback defaults)
    const settings = await prisma.storeSettings.findUnique({
      where: { id: 'default' },
    });

    const shippingFlatRate = settings?.shippingFlatRate ?? 4.99;
    const freeShippingThreshold = settings?.freeShippingThreshold ?? 25.0;

    const rawSubtotal =
      Array.isArray(items) && items.length > 0
        ? items.reduce(
            (sum: number, item: CartItem) =>
              sum + Math.max(0, Number(item.price) || 0) * Math.max(1, Math.floor(Number(item.quantity) || 1)),
            0
          )
        : Number(total) || 0;

    const pricing = calculateOrderPricing({
      subtotal: rawSubtotal,
      promoCode: typeof promoCode === 'string' ? promoCode : null,
      shippingFlatRate,
      freeShippingThreshold,
    });

    if (!pricing.meetsMinimumOrder) {
      return NextResponse.json(
        {
          error: `Minimum order subtotal is $${MIN_ORDER_SUBTOTAL.toFixed(2)} before discounts (currently $${pricing.preDiscountSubtotal.toFixed(2)}). Add a $2 velvet gift pouch or $3 ink refill pack to complete checkout!`,
        },
        { status: 400 }
      );
    }

    const subtotal = pricing.discountedSubtotal;
    const shippingCost = pricing.shippingCost;
    const finalTotal = pricing.finalTotal;

    const customerName = `${form?.firstName || ''} ${form?.lastName || ''}`.trim() || 'Guest';
    const shippingAddress = `${form?.address || ''}, ${form?.city || ''}, ${form?.state || ''} ${form?.zip || ''} (${form?.country || 'US'})`.trim();

    // 1. Save Order to Database
    const order = await prisma.order.create({
      data: {
        customerName,
        customerEmail: form?.email || '',
        customerPhone: form?.phone || null,
        shippingAddress,
        paymentMethod: form?.paymentMethod || 'stripe',
        paymentStatus: 'pending',
        itemsJson: JSON.stringify(items || []),
        subtotal,
        shippingCost,
        total: finalTotal,
      },
    });

    // ─── STRIPE INTEGRATION ─────────────────────────────────────────
    if (form?.paymentMethod === 'stripe') {
      const stripeSecretKey = settings?.stripeSecretKey || process.env.STRIPE_SECRET_KEY;

      if (!stripeSecretKey) {
        return NextResponse.json(
          { error: 'Card payments are not configured yet. Please add your Stripe Secret Key in the Admin Portal (/admin) under Store & Stripe Settings, or choose Venmo/PayPal.' },
          { status: 500 }
        );
      }

      const stripe = new Stripe(stripeSecretKey);
      const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'https://btboutiqe.com';

      try {
        const targetDiscountedCents = Math.round(pricing.discountedSubtotal * 100);
        const lineItems = buildStripeLineItems(
          Array.isArray(items) ? items : [],
          origin,
          targetDiscountedCents,
          pricing.coupon?.code,
          pricing.coupon?.percentOff
        );

        const metadata: Record<string, string> = {
          orderId: order.id,
          preDiscountSubtotal: pricing.preDiscountSubtotal.toFixed(2),
        };
        if (pricing.coupon) {
          metadata.promoCode = pricing.coupon.code;
          metadata.discountAmount = pricing.discountAmount.toFixed(2);
        }
        if (attribution && typeof attribution === 'object') {
          if (attribution.utm_source) metadata.utm_source = String(attribution.utm_source).slice(0, 120);
          if (attribution.utm_medium) metadata.utm_medium = String(attribution.utm_medium).slice(0, 120);
          if (attribution.utm_campaign) metadata.utm_campaign = String(attribution.utm_campaign).slice(0, 120);
        }

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'payment',
          customer_email: form?.email || undefined,
          client_reference_id: order.id,
          metadata,
          shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
          shipping_options: [
            {
              shipping_rate_data: {
                type: 'fixed_amount',
                fixed_amount: {
                  amount: Math.round(shippingCost * 100),
                  currency: 'usd',
                },
                display_name:
                  shippingCost === 0
                    ? 'Free US Shipping (USPS Ground Advantage)'
                    : pricing.shippingTierLabel,
              },
            },
          ],
          line_items: lineItems,
          success_url: `${origin}/checkout?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
          cancel_url: `${origin}/checkout`,
        });

        await prisma.order.update({
          where: { id: order.id },
          data: { stripeSessionId: session.id },
        });

        return NextResponse.json({ url: session.url, orderId: order.id });
      } catch (err) {
        console.error('Stripe error:', err);
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
      }
    }
    // ────────────────────────────────────────────────────────────────

    // Security invariant: ONLY auto-generate live Shippo USPS postage once paymentStatus === 'paid'.
    // Unpaid 'pending' manual orders (Venmo/PayPal) wait until payment is verified in Admin.
    if (settings?.autoCreateLabel !== false && order.paymentStatus === 'paid') {
      await generateShippingLabelForOrder(order.id).catch(() => {});
    }

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (err) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: (err as Error).message || 'Checkout failed' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { orderId, sessionId } = body;

    // 1. Require valid sessionId string
    if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
      return NextResponse.json(
        { error: 'Missing or invalid Stripe sessionId' },
        { status: 400 }
      );
    }

    const settings = await prisma.storeSettings.findUnique({
      where: { id: 'default' },
    });
    const stripeSecretKey = settings?.stripeSecretKey || process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'Stripe configuration missing on server' },
        { status: 500 }
      );
    }

    // 2. Retrieve and verify session directly with Stripe API
    const stripe = new Stripe(stripeSecretKey);
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId.trim());
    } catch (_stripeErr) {
      return NextResponse.json(
        { error: 'Invalid or unverified Stripe checkout session' },
        { status: 400 }
      );
    }

    // 3. Ensure payment is captured and paid
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: `Payment not completed. Session status: ${session.payment_status}` },
        { status: 400 }
      );
    }

    // 4. Resolve and verify corresponding order
    let targetOrderId = orderId;
    if (!targetOrderId && session.client_reference_id) {
      targetOrderId = session.client_reference_id;
    }

    const order = targetOrderId
      ? await prisma.order.findUnique({ where: { id: targetOrderId } })
      : await prisma.order.findFirst({ where: { stripeSessionId: sessionId.trim() } });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found for verified Stripe session' },
        { status: 404 }
      );
    }

    // Anti-spoofing check: ensure session client_reference_id matches target order if set
    if (session.client_reference_id && session.client_reference_id !== order.id) {
      return NextResponse.json(
        { error: 'Stripe session does not match the specified order' },
        { status: 400 }
      );
    }

    // Prevent cross-order session hijacking if order already had a different stripeSessionId
    if (order.stripeSessionId && order.stripeSessionId !== session.id) {
      return NextResponse.json(
        { error: 'Stripe session mismatch with existing order session' },
        { status: 400 }
      );
    }

    // 5. Update order to paid
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'paid',
        stripeSessionId: session.id,
      },
    });

    // 6. Generate shipping label if autoCreateLabel enabled
    if (settings?.autoCreateLabel !== false) {
      await generateShippingLabelForOrder(order.id).catch((err) => {
        console.error('[checkout] Shipping label generation failed:', err);
      });
    }

    return NextResponse.json({ success: true, orderId: updated.id });
  } catch (err) {
    console.error('Order status update error:', err);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}
