import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildBookingCheckoutPath,
  createBookingPaymentToken,
  getBookingPaymentId,
  getBookingPaymentServiceForBookingPage,
  getBookingPaymentServiceSlug,
  verifyBookingPaymentToken,
} from '../lib/booking-payment.ts';

const secret = 'test-secret-that-is-long-enough-for-hmac';
const acceptedAt = new Date('2026-07-13T10:00:00.000Z');

test('maps accepted paid Cal.com events to checkout services', () => {
  assert.equal(getBookingPaymentServiceSlug('career-clarity'), 'career-clarity');
  assert.equal(getBookingPaymentServiceSlug('glow-up-vip'), 'glow-up-vip');
  assert.equal(getBookingPaymentServiceSlug('discovery-call'), null);
  assert.equal(getBookingPaymentServiceSlug('constructor'), null);
});

test('creates a booking-specific token that verifies during its payment window', () => {
  const token = createBookingPaymentToken(
    {
      serviceSlug: 'career-clarity',
      bookingUid: 'cal-booking-123',
      email: 'client@example.com',
      name: 'Client Name',
    },
    secret,
    acceptedAt,
  );

  assert.deepEqual(verifyBookingPaymentToken(token, secret, new Date('2026-07-14T09:59:59.000Z')), {
    serviceSlug: 'career-clarity',
    bookingUid: 'cal-booking-123',
    email: 'client@example.com',
    name: 'Client Name',
    expiresAt: new Date('2026-07-15T10:00:00.000Z').getTime(),
  });
});

test('rejects tampered and expired booking payment tokens', () => {
  const token = createBookingPaymentToken(
    {
      serviceSlug: 'glow-up-vip',
      bookingUid: 'cal-booking-456',
      email: 'client@example.com',
      name: 'Client Name',
    },
    secret,
    acceptedAt,
  );

  assert.equal(verifyBookingPaymentToken(`${token.slice(0, -1)}x`, secret, acceptedAt), null);
  assert.equal(verifyBookingPaymentToken(token, secret, new Date('2026-07-15T10:00:01.000Z')), null);
});

test('does not create a payment token without a Cal.com booking id', () => {
  assert.throws(
    () => createBookingPaymentToken(
      {
        serviceSlug: 'career-clarity',
        bookingUid: '   ',
        email: 'client@example.com',
        name: 'Client Name',
      },
      secret,
      acceptedAt,
    ),
    /Booking UID is required/,
  );
});

test('derives one stable opaque payment id per accepted booking', () => {
  const first = getBookingPaymentId('career-clarity', 'cal-booking-123');
  const second = getBookingPaymentId('career-clarity', 'cal-booking-123');

  assert.equal(first, second);
  assert.match(first, /^career-clarity-[a-f0-9]{32}$/);
  assert.equal(first.includes('cal-booking-123'), false);
});

test('maps the public booking pages to their paid checkout services', () => {
  assert.equal(getBookingPaymentServiceForBookingPage('clarity'), 'career-clarity');
  assert.equal(getBookingPaymentServiceForBookingPage('glow-up'), 'glow-up-vip');
  assert.equal(getBookingPaymentServiceForBookingPage('discovery'), null);
  assert.equal(getBookingPaymentServiceForBookingPage('constructor'), null);
});

test('builds a checkout path that survives token characters needing encoding', () => {
  const token = createBookingPaymentToken(
    {
      serviceSlug: 'career-clarity',
      bookingUid: 'cal-booking-123',
      email: 'client@example.com',
      name: 'Client Name',
    },
    secret,
    acceptedAt,
  );
  const path = buildBookingCheckoutPath('career-clarity', token);

  assert.ok(path.startsWith('/buy/career-clarity?booking_token='));
  assert.equal(
    new URL(path, 'https://coachkagiso.co.za').searchParams.get('booking_token'),
    token,
  );
});
