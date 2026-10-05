import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

type CartItem = {
  id: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
};

export async function POST(request: NextRequest) {
  const { items, form, total } = await request.json();

  // ─── STRIPE INTEGRATION ─────────────────────────────────────────
  if (form.paymentMethod === 'stripe') {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://btboutique.com';
    
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: form.email,
        shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
        shipping_options: [
          {
            shipping_rate_data: {
              type: 'fixed_amount',
              fixed_amount: {
                amount: total >= 20 ? 0 : 399,
                currency: 'usd',
              },
              display_name: total >= 20 ? 'Free Shipping' : 'Standard Shipping',
            },
          },
        ],
        line_items: items.map((item: CartItem) => ({
          price_data: {
            currency: 'usd',
            product_data: {
              name: item.title,
              images: item.imageUrl ? (item.imageUrl.startsWith('http') ? [item.imageUrl] : [`${baseUrl}${item.imageUrl}`]) : [],
            },
            unit_amount: Math.round(item.price * 100),
          },
          quantity: item.quantity,
        })),
        success_url: `${baseUrl}/checkout?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout`,
      });
      return NextResponse.json({ url: session.url });
    } catch (err) {
      console.error('Stripe error:', err);
      return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
  }
  // ────────────────────────────────────────────────────────────────

  // For now: log the order and return success
  console.log('📦 New Order:', {
    customer: `${form.firstName} ${form.lastName}`,
    email: form.email,
    address: `${form.address}, ${form.city}, ${form.state} ${form.zip}`,
    payment: form.paymentMethod,
    items: items.map((i: CartItem) => `${i.quantity}x ${i.title}`),
    total: `$${total.toFixed(2)}`,
  });

  return NextResponse.json({ success: true });
}
