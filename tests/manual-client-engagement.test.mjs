import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getManualClientIntakeFields,
  manualClientRequiresCv,
  normalizeManualClientEngagement,
} from '../lib/manual-client-engagement.ts';

const careerClarity = {
  slug: 'career-clarity',
  requiresCvUpload: false,
  fields: [],
};

const glowUp = {
  slug: 'glow-up-vip',
  requiresCvUpload: false,
  fields: [],
};

const linkedIn = {
  slug: 'linkedin',
  requiresCvUpload: false,
  fields: [],
};

const cvRevamp = {
  slug: 'cv-revamp',
  requiresCvUpload: true,
  fields: [
    { name: 'fullName', label: 'Full name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'targetRole', label: 'Target role', type: 'textarea', required: true },
  ],
};

test('adds service-aware manual questions for the two strategy services', () => {
  assert.deepEqual(
    getManualClientIntakeFields(careerClarity).map((field) => field.name),
    ['currentRole', 'desiredOutcome', 'biggestBlocker', 'decisionNeeded'],
  );
  assert.deepEqual(
    getManualClientIntakeFields(glowUp).map((field) => field.name),
    ['currentRole', 'targetRole', 'linkedinUrl', 'interviewHistory', 'biggestChallenge', 'thirtyDayOutcome'],
  );
  assert.equal(manualClientRequiresCv(careerClarity), true);
  assert.equal(manualClientRequiresCv(glowUp), true);
  assert.equal(manualClientRequiresCv(linkedIn), false);
});

test('reuses existing service questions without duplicating identity fields', () => {
  const fields = getManualClientIntakeFields(cvRevamp);
  assert.equal(fields.some((field) => field.name === 'fullName'), false);
  assert.equal(fields.some((field) => field.name === 'email'), false);
  assert.equal(fields.some((field) => field.name === 'targetRole'), true);
});

test('normalizes a verified manual strategy engagement', () => {
  const result = normalizeManualClientEngagement({
    fullName: '  Lerato Mokoena ',
    email: ' LERATO@example.com ',
    whatsapp: '+27 82 123 4567',
    serviceSlug: 'career-clarity',
    paymentMethod: 'eft',
    amount: '800',
    paidAt: '2026-07-18T10:00:00+02:00',
    paymentReference: ' EFT-1024 ',
    paymentVerified: true,
    isTest: 'true',
    intake: {
      currentRole: 'Operations coordinator considering a move.',
      desiredOutcome: 'Choose a realistic next direction.',
      biggestBlocker: 'Unsure how experience transfers.',
      decisionNeeded: 'Whether to target operations or project roles.',
      ignored: 'must not be stored',
    },
  }, careerClarity);

  assert.equal(result.fullName, 'Lerato Mokoena');
  assert.equal(result.email, 'lerato@example.com');
  assert.equal(result.amount, 800);
  assert.equal(result.isTest, true);
  assert.equal(result.paymentReference, 'EFT-1024');
  assert.equal('ignored' in result.intake, false);
});

test('rejects unverified payments and incomplete questionnaire answers', () => {
  const base = {
    fullName: 'Lerato Mokoena',
    email: 'lerato@example.com',
    serviceSlug: 'career-clarity',
    paymentMethod: 'cash',
    amount: 800,
    paidAt: '2026-07-18T10:00:00+02:00',
    intake: {
      currentRole: 'Operations coordinator.',
      desiredOutcome: 'Choose a direction.',
      biggestBlocker: 'Positioning.',
      decisionNeeded: 'Which role family to target.',
    },
  };

  assert.throws(
    () => normalizeManualClientEngagement(base, careerClarity),
    /Confirm that the payment has been verified/,
  );
  assert.throws(
    () => normalizeManualClientEngagement({ ...base, paymentVerified: true, intake: {} }, careerClarity),
    /current role and career situation.*required/i,
  );
});
