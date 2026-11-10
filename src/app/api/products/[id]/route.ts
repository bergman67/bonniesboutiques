import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const authErr = await requireAdminAuth(request);
  if (authErr) return authErr;

  try {
    const json = await request.json();
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        title: json.title,
        description: json.description,
        price: json.price !== undefined && json.price !== null ? parseFloat(json.price) : undefined,
        imageUrl: json.imageUrl,
        isDraft: json.isDraft
      }
    });
    try {
      revalidatePath('/');
      revalidatePath(`/products/${params.id}`);
    } catch {
      // Safe when invoked directly in unit/E2E tests outside Next.js request store
    }
    return NextResponse.json(product);
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  return PUT(request, context);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const authErr = await requireAdminAuth(request);
  if (authErr) return authErr;

  try {
    await prisma.product.deleteMany({
      where: { id: params.id }
    });
    try {
      revalidatePath('/');
      revalidatePath(`/products/${params.id}`);
    } catch {
      // Safe when invoked directly in unit/E2E tests outside Next.js request store
    }
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
