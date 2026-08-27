import assert from 'node:assert/strict';
import test from 'node:test';
import { buildBookingConfirmUrl, shouldHandOffToCheckout } from '../lib/cal-embed-booking.ts';

test('hands a confirmed booking off to checkout', () => {
  assert.equal(shouldHandOffToCheckout({ uid: 'cal-booking-123', status: 'ACCEPTED' }), true);
});

test('leaves a booking that still needs approval on the Cal.com success screen', () => {
  // This is what fires while "Requires confirmation" is still switched on, so the handoff has to
  // stay dormant rather than send the client to a checkout that has no payment record behind it.
  assert.equal(shouldHandOffToCheckout({ uid: 'cal-booking-123', status: 'PENDING' }), false);
  assert.equal(shouldHandOffToCheckout({ uid: 'cal-booking-123', status: ' pending ' }), false);
});

test('does not hand off without a booking UID to look the payment up by', () => {
  assert.equal(shouldHandOffToCheckout({ status: 'ACCEPTED' }), false);
  assert.equal(shouldHandOffToCheckout({ uid: '   ', status: 'ACCEPTED' }), false);
});

test('hands off when Cal.com sends no status at all', () => {
  assert.equal(shouldHandOffToCheckout({ uid: 'cal-booking-123' }), true);
});

test('builds a confirm URL that survives a UID needing encoding', () => {
  assert.equal(
    buildBookingConfirmUrl('/book/clarity/confirm', 'uid with spaces&x=1'),
    '/book/clarity/confirm?uid=uid%20with%20spaces%26x%3D1',
  );
});
