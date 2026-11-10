import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

/**
 * Constant-time PIN verification using SHA-256 pre-hashing to prevent timing attacks
 * and eliminate buffer length mismatch exceptions.
 */
export function verifyAdminPin(
  providedPin: string | null | undefined,
  requiredPin: string | null | undefined
): boolean {
  if (!providedPin || !requiredPin) return false;
  const trimmedProvided = String(providedPin).trim();
  const trimmedRequired = String(requiredPin).trim();
  if (!trimmedProvided || !trimmedRequired) return false;

  const hashProvided = crypto.createHash('sha256').update(trimmedProvided).digest();
  const hashRequired = crypto.createHash('sha256').update(trimmedRequired).digest();

  return crypto.timingSafeEqual(hashProvided, hashRequired);
}

/**
 * Retrieves the effective admin PIN from StoreSettings DB or process.env.ADMIN_PASSWORD.
 */
export async function getRequiredAdminPin(): Promise<string> {
  try {
    const settings = await prisma.storeSettings.findUnique({
      where: { id: 'default' },
      select: { adminPin: true },
    });
    return settings?.adminPin?.trim() || process.env.ADMIN_PASSWORD?.trim() || '';
  } catch {
    return process.env.ADMIN_PASSWORD?.trim() || '';
  }
}

/**
 * Helper to authenticate an incoming admin request.
 * Returns null if authorized, or a 401 NextResponse if unauthorized.
 */
export async function requireAdminAuth(
  request: NextRequest | Request
): Promise<NextResponse | null> {
  const providedPin = request.headers.get('x-admin-pin') || '';
  const requiredPin = await getRequiredAdminPin();

  if (!requiredPin || !verifyAdminPin(providedPin, requiredPin)) {
    return NextResponse.json(
      { error: 'Unauthorized: Valid x-admin-pin header required' },
      { status: 401 }
    );
  }

  return null;
}
