import { NextRequest, NextResponse } from 'next/server';
import { validatePromoCode, calculateOrderPricing } from '@/lib/coupons';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const code = typeof body.code === 'string' ? body.code : '';
    const subtotal = typeof body.subtotal === 'number' ? body.subtotal : 0;

    const validation = validatePromoCode(code, subtotal);
    if (!validation.valid) {
      return NextResponse.json(validation, { status: 400 });
    }

    const pricing = calculateOrderPricing({
      subtotal,
      promoCode: validation.code,
    });

    return NextResponse.json({
      ...validation,
      pricing,
    });
  } catch {
    return NextResponse.json(
      { valid: false, error: 'Unable to validate promo code right now.' },
      { status: 500 }
    );
  }
}
