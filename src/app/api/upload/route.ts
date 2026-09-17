import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  const data = await request.formData();
  const file: File | null = data.get('file') as unknown as File;

  if (!file) {
    return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  // Upload to Supabase Storage bucket named "products"
  const { data: uploadData, error } = await supabase
    .storage
    .from('products')
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: false
    });

  if (error) {
    console.error('Supabase upload error:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload to cloud storage' }, { status: 500 });
  }

  // Get the public URL
  const { data: { publicUrl } } = supabase
    .storage
    .from('products')
    .getPublicUrl(filename);

  return NextResponse.json({ success: true, url: publicUrl });
}
