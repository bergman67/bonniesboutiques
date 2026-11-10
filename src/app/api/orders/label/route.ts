import { NextRequest, NextResponse } from 'next/server';
import { generateShippingLabelForOrder } from '@/lib/shipping';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

export async function POST(request: NextRequest) {
  const authErr = await requireAdminAuth(request);
  if (authErr) return authErr;

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
