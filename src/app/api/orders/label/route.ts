import { NextRequest, NextResponse } from 'next/server';
import { generateShippingLabelForOrder } from '@/lib/shipping';

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const result = await generateShippingLabelForOrder(orderId);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Could not create label', status: result.status }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating shipping label:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to generate label' }, { status: 500 });
  }
}
