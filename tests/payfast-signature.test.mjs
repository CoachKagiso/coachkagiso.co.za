import assert from 'node:assert/strict';
import test from 'node:test';

import { orderPayFastCheckoutFields } from '../lib/payfast-signature.ts';

test('orders accepted-booking checkout fields according to PayFast custom integration requirements', () => {
  const unorderedFields = {
    merchant_id: '10000100',
    merchant_key: 'merchant-key',
    return_url: 'https://example.com/thanks',
    cancel_url: 'https://example.com/cancel',
    notify_url: 'https://example.com/notify',
    m_payment_id: 'career-clarity-abc',
    amount: '800.00',
    item_name: 'Career Clarity Session',
    custom_str1: 'career-clarity',
    email_address: 'client@example.com',
    name_first: 'Lerato',
    name_last: 'Mokoena',
    custom_str4: 'cal-booking-123',
  };

  assert.deepEqual(Object.keys(orderPayFastCheckoutFields(unorderedFields)), [
    'merchant_id',
    'merchant_key',
    'return_url',
    'cancel_url',
    'notify_url',
    'name_first',
    'name_last',
    'email_address',
    'm_payment_id',
    'amount',
    'item_name',
    'custom_str1',
    'custom_str4',
  ]);
});
