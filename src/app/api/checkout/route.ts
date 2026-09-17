import { NextRequest, NextResponse } from 'next/server';

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
  // To enable real Stripe payments, add STRIPE_SECRET_KEY to your .env
  // then uncomment the block below:
  //
  // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  // const session = await stripe.checkout.sessions.create({
  //   payment_method_types: ['card'],
  //   mode: 'payment',
  //   customer_email: form.email,
  //   shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
  //   line_items: items.map((item: CartItem) => ({
  //     price_data: {
  //       currency: 'usd',
  //       product_data: {
  //         name: item.title,
  //         images: item.imageUrl ? [`${process.env.NEXT_PUBLIC_BASE_URL}${item.imageUrl}`] : [],
  //       },
  //       unit_amount: Math.round(item.price * 100),
  //     },
  //     quantity: item.quantity,
  //   })),
  //   success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  //   cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout`,
  // });
  // return NextResponse.json({ url: session.url });
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
