import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CV_COACH_MOVE_SLUGS,
  asyncServices,
  buildCvCoachMoveLabelUnion,
  buildCvCoachMoveRulesPrompt,
  formatServiceCatalogueLines,
  getCvCoachMoveLabels,
  isCvCoachMoveLabel,
  normalizeCvCoachMoveLabel,
} from '../lib/buying-flow.ts';

test('coach move labels come from the real service catalogue', () => {
  assert.deepEqual(
    getCvCoachMoveLabels(),
    CV_COACH_MOVE_SLUGS.map((slug) => asyncServices[slug].title),
  );
  assert.deepEqual(getCvCoachMoveLabels(), [
    'CV Revamp',
    'Cover Letter',
    'LinkedIn Optimisation',
    'CV + LinkedIn Bundle',
  ]);
});

test('bookings and events are not recommendable coach moves', () => {
  for (const slug of ['career-clarity', 'glow-up-vip', 'masterclass']) {
    assert.equal(CV_COACH_MOVE_SLUGS.includes(slug), false, `${slug} must not be a coach move`);
  }
});

test('the rules prompt quotes real prices and never the invented ones', () => {
  const prompt = buildCvCoachMoveRulesPrompt();
  for (const price of ['R150', 'R400', 'R300', 'R500']) {
    assert.ok(prompt.includes(price), `expected ${price} in the coach move prompt`);
  }
  assert.equal(prompt.includes('R350'), false, 'R350 LinkedIn Profile price must be gone');
  assert.equal(prompt.includes('R750'), false, 'R750 bundle price must be gone');
  assert.equal(prompt.includes('LinkedIn Profile'), false);
  assert.equal(prompt.includes('CV + LinkedIn + Cover Letter Bundle'), false);
});

test('bundle guidance no longer promises a cover letter', () => {
  const bundleLine = buildCvCoachMoveRulesPrompt()
    .split('\n')
    .find((line) => line.includes('CV + LinkedIn Bundle'));
  assert.ok(bundleLine);
  assert.equal(/cover letter/i.test(bundleLine), false);
});

test('the label union lists every coach move as a quoted literal', () => {
  const union = buildCvCoachMoveLabelUnion();
  assert.equal(union.split(' | ').length, CV_COACH_MOVE_SLUGS.length);
  for (const label of getCvCoachMoveLabels()) {
    assert.ok(union.includes(`'${label}'`), `expected '${label}' in the union`);
  }
});

test('validation rejects the invented labels and accepts the real ones', () => {
  assert.equal(isCvCoachMoveLabel('LinkedIn Profile'), false);
  assert.equal(isCvCoachMoveLabel('CV + LinkedIn + Cover Letter Bundle'), false);
  assert.equal(isCvCoachMoveLabel('LinkedIn Optimisation'), true);
  assert.equal(isCvCoachMoveLabel('CV + LinkedIn Bundle'), true);
  assert.equal(isCvCoachMoveLabel('Discovery Call'), false);
});

test('legacy saved labels normalize onto the real services', () => {
  assert.equal(normalizeCvCoachMoveLabel('LinkedIn Profile'), 'LinkedIn Optimisation');
  assert.equal(normalizeCvCoachMoveLabel('CV + LinkedIn + Cover Letter Bundle'), 'CV + LinkedIn Bundle');
  assert.equal(normalizeCvCoachMoveLabel('CV Revamp'), 'CV Revamp');
  assert.equal(normalizeCvCoachMoveLabel(''), '');
  assert.equal(normalizeCvCoachMoveLabel('Something invented'), '');
});

test('the catalogue lines use the masterclass price label, not the bare amount', () => {
  const [line] = formatServiceCatalogueLines(['masterclass'], new Date('2026-01-01T00:00:00Z'));
  assert.ok(line.includes('Saturday Masterclass'));
  assert.ok(line.includes('early bird'));
  assert.ok(line.includes('R450'));
  assert.ok(line.includes('R500'));
});

test('the catalogue defaults to every service', () => {
  assert.equal(formatServiceCatalogueLines().length, Object.keys(asyncServices).length);
});
