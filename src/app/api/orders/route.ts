import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, paymentStatus, labelPrinted } = body;
    if (!id) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }
    const updateData: Record<string, unknown> = {};
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (typeof labelPrinted === 'boolean') updateData.labelPrinted = labelPrinted;

    const updated = await prisma.order.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }
    await prisma.order.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete order:', error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}
