import assert from 'node:assert/strict';
import test from 'node:test';

import {
  INSTALMENT_MAX_AMOUNT,
  INSTALMENT_MIN_AMOUNT,
  buildInstalmentPlans,
  formatInstalmentAmount,
  getInstalmentPlans,
  isInstalmentEligible,
} from '../lib/instalments.ts';

// buildInstalmentPlans is the pure split maths and is asserted directly, so
// these stay meaningful whether or not instalments are switched on yet.

test('drops the cents on a clean split and keeps them on an uneven one', () => {
  assert.equal(formatInstalmentAmount(300), 'R300');
  assert.equal(formatInstalmentAmount(266.6666), 'R266.67');
});

test('splits the Glow Up VIP package across both providers', () => {
  const [payflex, moreTyme] = buildInstalmentPlans(1200);

  assert.equal(payflex.headline, '4 x R300');
  assert.equal(payflex.cadence, 'fortnightly');
  assert.equal(payflex.schedule, 'R300 today, then 3 payments of R300 every 2 weeks.');

  assert.equal(moreTyme.headline, 'R600 + 2 x R300');
  assert.equal(moreTyme.cadence, 'monthly');
  assert.equal(moreTyme.schedule, 'R600 today, then R300 in 30 days and R300 in 60 days.');
});

test('splits the Career Clarity Session without losing cents', () => {
  const [payflex, moreTyme] = buildInstalmentPlans(800);

  assert.equal(payflex.headline, '4 x R200');
  assert.equal(moreTyme.headline, 'R400 + 2 x R200');
});

test('never advertises instalments outside the supported order range', () => {
  assert.equal(isInstalmentEligible(INSTALMENT_MIN_AMOUNT - 1), false);
  assert.equal(isInstalmentEligible(INSTALMENT_MAX_AMOUNT + 1), false);
  assert.deepEqual(getInstalmentPlans(INSTALMENT_MIN_AMOUNT - 1), []);
  assert.deepEqual(getInstalmentPlans(INSTALMENT_MAX_AMOUNT + 1), []);
});
