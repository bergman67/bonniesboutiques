import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 120) : '';
    const topic = typeof body?.topic === 'string' ? body.topic.trim().slice(0, 120) : 'vip-signup';
    const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 2000) : '';
    const source = typeof body?.source === 'string' ? body.source.trim().slice(0, 80) : 'storefront';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const entry = {
      id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      email,
      name: name || null,
      topic,
      message: message || null,
      source,
      createdAt: new Date().toISOString(),
    };

    try {
      const exportsDir = path.join(process.cwd(), 'public', 'exports');
      const leadsPath = path.join(exportsDir, 'leads.json');
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }
      let existing: unknown[] = [];
      if (fs.existsSync(leadsPath)) {
        const raw = fs.readFileSync(leadsPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) existing = parsed;
      }
      existing.push(entry);
      fs.writeFileSync(leadsPath, JSON.stringify(existing, null, 2), 'utf8');
    } catch {
      // Safe fallback on read-only serverless file systems
      console.info('[leads] Captured lead:', JSON.stringify(entry));
    }

    return NextResponse.json({
      success: true,
      couponCode: 'WELCOME10',
      message: "You're in! Code WELCOME10 (10% off) is ready for checkout.",
    });
  } catch {
    return NextResponse.json(
      { error: 'Unable to save your request right now. Please try again.' },
      { status: 500 }
    );
  }
}
