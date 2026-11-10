import { NextRequest, NextResponse } from 'next/server';
import { analyzeProductPhoto } from '@/lib/gemini';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authErr = await requireAdminAuth(request);
  if (authErr) return authErr;

  try {
    const contentType = request.headers.get('content-type') || '';
    let imageBuffer: Buffer | null = null;
    let mimeType = 'image/png';
    let excludeTitles: string[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const imageUrl = formData.get('imageUrl') as string | null;
      const excludeParam = formData.get('excludeTitles');

      if (excludeParam) {
        try {
          const parsed = JSON.parse(String(excludeParam));
          if (Array.isArray(parsed)) {
            excludeTitles = parsed;
          } else {
            excludeTitles = [String(parsed)];
          }
        } catch {
          excludeTitles = [String(excludeParam)];
        }
      }

      if (file && typeof file.arrayBuffer === 'function') {
        const bytes = await file.arrayBuffer();
        imageBuffer = Buffer.from(bytes);
        mimeType = file.type || 'image/png';
      } else if (imageUrl) {
        const resolved = await resolveImageBuffer(imageUrl);
        imageBuffer = resolved.buffer;
        mimeType = resolved.mimeType;
      }
    } else {
      const body = await request.json().catch(() => ({}));
      if (body.excludeTitles && Array.isArray(body.excludeTitles)) {
        excludeTitles = body.excludeTitles;
      }

      if (body.imageBase64) {
        imageBuffer = Buffer.from(body.imageBase64, 'base64');
        mimeType = body.mimeType || 'image/png';
      } else if (body.imageUrl) {
        const resolved = await resolveImageBuffer(body.imageUrl);
        imageBuffer = resolved.buffer;
        mimeType = resolved.mimeType;
      }
    }

    if (!imageBuffer || imageBuffer.length === 0) {
      return NextResponse.json(
        { error: 'No image provided. Please provide a file, imageUrl, or imageBase64 payload.' },
        { status: 400 }
      );
    }

    const { result, modelUsed } = await analyzeProductPhoto({
      imageBuffer,
      mimeType,
      excludeTitles,
    });

    return NextResponse.json({
      success: true,
      title: result.title,
      description: result.description,
      category: result.category,
      price: result.price ?? 8.00,
      modelUsed,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Vision analysis failed';
    console.error('Failed to analyze product photo with Gemini Vision:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

async function resolveImageBuffer(imageUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
  // If it's a local public path (e.g. /uploads/...) in local dev/test
  if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('public/uploads/')) {
    const cleanPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
    const pubDir = Buffer.from('cHVibGlj', 'base64').toString('utf8');
    const relPath = cleanPath.startsWith(pubDir) ? cleanPath : path.join(pubDir, cleanPath);
    const fullPath = path.resolve(process.env.LOCAL_PUBLIC_ROOT || process.cwd(), relPath);
    if (fs.existsSync(fullPath)) {
      const buffer = await fs.promises.readFile(fullPath);
      const mime = fullPath.endsWith('.png')
        ? 'image/png'
        : fullPath.endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg';
      return { buffer, mimeType: mime };
    }
  }

  // Remote URL (e.g. Supabase Storage or external HTTP/HTTPS)
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Failed to download image from URL (${res.status}): ${res.statusText}`);
  }
  const arrayBuf = await res.arrayBuffer();
  const mime = res.headers.get('content-type') || 'image/png';
  return { buffer: Buffer.from(arrayBuf), mimeType: mime };
}
