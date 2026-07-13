import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const BOOKING_PAYMENT_WINDOW_HOURS = 48;

export type BookingPaymentServiceSlug = 'career-clarity' | 'glow-up-vip';

export type BookingPaymentClaims = {
  serviceSlug: BookingPaymentServiceSlug;
  bookingUid: string;
  email: string;
  name: string;
  expiresAt: number;
};

const EVENT_SERVICE_MAP: Record<string, BookingPaymentServiceSlug> = {
  'career-clarity': 'career-clarity',
  'glow-up-vip': 'glow-up-vip',
};

function isBookingPaymentServiceSlug(value: unknown): value is BookingPaymentServiceSlug {
  return value === 'career-clarity' || value === 'glow-up-vip';
}

function sign(encodedClaims: string, secret: string) {
  return createHmac('sha256', secret).update(encodedClaims).digest('base64url');
}

export function getBookingPaymentSecret() {
  return process.env.BOOKING_PAYMENT_SECRET?.trim() || process.env.CAL_WEBHOOK_SECRET?.trim() || '';
}

export function getBookingPaymentServiceSlug(eventSlug: string) {
  return EVENT_SERVICE_MAP[eventSlug] || null;
}

export function createBookingPaymentToken(
  input: Omit<BookingPaymentClaims, 'expiresAt'>,
  secret: string,
  now = new Date(),
) {
  if (!secret) throw new Error('Booking payment token secret is missing');
  if (!input.bookingUid.trim()) throw new Error('Booking UID is required');

  const claims: BookingPaymentClaims = {
    serviceSlug: input.serviceSlug,
    bookingUid: input.bookingUid.trim(),
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    expiresAt: now.getTime() + BOOKING_PAYMENT_WINDOW_HOURS * 60 * 60 * 1000,
  };
  const encodedClaims = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');

  return `${encodedClaims}.${sign(encodedClaims, secret)}`;
}

export function verifyBookingPaymentToken(token: string, secret: string, now = new Date()) {
  if (!token || !secret || token.length > 4096) return null;

  const [encodedClaims, receivedSignature, extra] = token.split('.');
  if (!encodedClaims || !receivedSignature || extra) return null;

  const expectedSignature = sign(encodedClaims, secret);
  const received = Buffer.from(receivedSignature, 'utf8');
  const expected = Buffer.from(expectedSignature, 'utf8');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  try {
    const claims = JSON.parse(Buffer.from(encodedClaims, 'base64url').toString('utf8')) as Partial<BookingPaymentClaims>;
    if (
      !isBookingPaymentServiceSlug(claims.serviceSlug) ||
      typeof claims.bookingUid !== 'string' ||
      claims.bookingUid.length < 1 ||
      claims.bookingUid.length > 255 ||
      typeof claims.email !== 'string' ||
      !claims.email.includes('@') ||
      claims.email.length > 254 ||
      typeof claims.name !== 'string' ||
      claims.name.length > 160 ||
      typeof claims.expiresAt !== 'number' ||
      !Number.isFinite(claims.expiresAt) ||
      claims.expiresAt < now.getTime()
    ) {
      return null;
    }

    return claims as BookingPaymentClaims;
  } catch {
    return null;
  }
}

export function getBookingPaymentId(serviceSlug: BookingPaymentServiceSlug, bookingUid: string) {
  const digest = createHash('sha256').update(`${serviceSlug}:${bookingUid}`).digest('hex').slice(0, 32);
  return `${serviceSlug}-${digest}`;
}
