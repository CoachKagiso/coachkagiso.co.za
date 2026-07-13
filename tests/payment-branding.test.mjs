import assert from 'node:assert/strict';
import test from 'node:test';

import { paymentMethodLogos, paymentProcessorLogo } from '../lib/payment-branding.ts';

test('presents PayFast separately from the supported payment methods', () => {
  assert.deepEqual(paymentProcessorLogo, {
    name: 'PayFast by Network',
    src: '/Payfast logo.png',
  });

  assert.deepEqual(
    paymentMethodLogos.map(({ name, src }) => ({ name, src })),
    [
      { name: 'Visa', src: '/Visa.png' },
      { name: 'Mastercard', src: '/Master Card.png' },
      { name: 'Instant EFT', src: '/instantEFT_hi-Res_logo_png.png' },
      { name: 'Apple Pay', src: '/Apple Pay.png' },
      { name: 'Mobicred', src: '/mobicred_logoMark_grp.png' },
    ],
  );
});
