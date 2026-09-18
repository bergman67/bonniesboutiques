import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const json = await request.json();
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        title: json.title,
        description: json.description,
        price: json.price ? parseFloat(json.price) : null,
        imageUrl: json.imageUrl,
        isDraft: json.isDraft
      }
    });
    return NextResponse.json(product);
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.product.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
