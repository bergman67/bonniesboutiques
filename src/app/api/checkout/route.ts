import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';

type CartItem = {
  id: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const { items, form, total } = await request.json();

    // Load store settings from DB (or fallback defaults)
    const settings = await prisma.storeSettings.findUnique({
      where: { id: 'default' },
    });

    const shippingFlatRate = settings?.shippingFlatRate ?? 3.99;
    const freeShippingThreshold = settings?.freeShippingThreshold ?? 20.0;

    const subtotal = Array.isArray(items)
      ? items.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0)
      : total || 0;

    const shippingCost = subtotal >= freeShippingThreshold ? 0 : shippingFlatRate;
    const finalTotal = subtotal + shippingCost;

    const customerName = `${form.firstName || ''} ${form.lastName || ''}`.trim() || 'Guest';
    const shippingAddress = `${form.address || ''}, ${form.city || ''}, ${form.state || ''} ${form.zip || ''} (${form.country || 'US'})`.trim();

    // 1. Save Order to Database
    const order = await prisma.order.create({
      data: {
        customerName,
        customerEmail: form.email || '',
        customerPhone: form.phone || null,
        shippingAddress,
        paymentMethod: form.paymentMethod || 'stripe',
        paymentStatus: 'pending',
        itemsJson: JSON.stringify(items || []),
        subtotal,
        shippingCost,
        total: finalTotal,
      },
    });

    // ─── STRIPE INTEGRATION ─────────────────────────────────────────
    if (form.paymentMethod === 'stripe') {
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
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'payment',
          customer_email: form.email || undefined,
          client_reference_id: order.id,
          shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
          shipping_options: [
            {
              shipping_rate_data: {
                type: 'fixed_amount',
                fixed_amount: {
                  amount: Math.round(shippingCost * 100),
                  currency: 'usd',
                },
                display_name: shippingCost === 0 ? 'Free Shipping' : 'Standard Shipping',
              },
            },
          ],
          line_items: items.map((item: CartItem) => ({
            price_data: {
              currency: 'usd',
              product_data: {
                name: item.title,
                images: item.imageUrl
                  ? item.imageUrl.startsWith('http')
                    ? [item.imageUrl]
                    : [`${origin}${item.imageUrl}`]
                  : [],
              },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: item.quantity,
          })),
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

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (err) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: (err as Error).message || 'Checkout failed' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { orderId, sessionId } = await request.json();
    if (orderId) {
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'paid', ...(sessionId ? { stripeSessionId: sessionId } : {}) },
      });
    } else if (sessionId) {
      await prisma.order.updateMany({
        where: { stripeSessionId: sessionId },
        data: { paymentStatus: 'paid' },
      });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Order status update error:', err);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}
