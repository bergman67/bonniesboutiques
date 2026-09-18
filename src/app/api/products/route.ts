import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(products);
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const product = await prisma.product.create({
      data: {
        title: json.title,
        description: json.description,
        price: json.price ? parseFloat(json.price) : null,
        imageUrl: json.imageUrl,
        isDraft: json.isDraft ?? false
      }
    });
    return NextResponse.json(product, { status: 201 });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
