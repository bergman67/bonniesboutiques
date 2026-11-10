import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(products, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authErr = await requireAdminAuth(request);
  if (authErr) return authErr;

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
    try {
      revalidatePath('/');
      revalidatePath(`/products/${product.id}`);
    } catch {
      // Safe when invoked directly in unit/E2E tests outside Next.js request store
    }
    return NextResponse.json(product, { status: 201 });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
