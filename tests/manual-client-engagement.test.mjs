import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getManualClientIntakeFields,
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

const validCareerClarityIntake = {
  cvNoted: 'Noted',
  currentRole: 'Operations coordinator considering a move.',
  clarityQuestion: 'Whether to target operations or project roles.',
  previousAttempts: 'Applied broadly without tailoring the CV.',
  stuckScale: '4',
  skillStrength: 'Colleagues come to me to untangle broken processes.',
};

test('adds service-aware manual questions for the two strategy services', () => {
  // These mirror the live Cal.com booking questions, so a manual engagement collects the same
  // answers the AI tools expect to read later.
  assert.deepEqual(
    getManualClientIntakeFields(careerClarity).map((field) => field.name),
    ['cvNoted', 'currentRole', 'clarityQuestion', 'previousAttempts', 'stuckScale', 'skillStrength', 'additionalInfo'],
  );
  assert.deepEqual(
    getManualClientIntakeFields(glowUp).map((field) => field.name),
    ['cvNoted', 'linkedinUrl', 'targetRole', 'interviewHistory', 'jobSearchAttempts', 'biggestChallenge', 'additionalInfo'],
  );
});

test('the stuck scale is a 1 to 5 radio, matching the booking form', () => {
  const stuckScale = getManualClientIntakeFields(careerClarity).find((field) => field.name === 'stuckScale');
  assert.ok(stuckScale, 'career clarity must ask how stuck the client feels');
  assert.equal(stuckScale.type, 'radio');
  assert.deepEqual(stuckScale.options, ['1', '2', '3', '4', '5']);
});

test('only the closing catch-all question is optional', () => {
  for (const service of [careerClarity, glowUp]) {
    const optional = getManualClientIntakeFields(service)
      .filter((field) => !field.required)
      .map((field) => field.name);
    assert.ok(optional.includes('additionalInfo'), `${service.slug} should not force the catch-all answer`);
  }
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
      ...validCareerClarityIntake,
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
    intake: { ...validCareerClarityIntake },
  };

  assert.throws(
    () => normalizeManualClientEngagement(base, careerClarity),
    /Confirm that the payment has been verified/,
  );
  const [firstRequired] = getManualClientIntakeFields(careerClarity).filter((field) => field.required);
  assert.throws(
    () => normalizeManualClientEngagement({ ...base, paymentVerified: true, intake: {} }, careerClarity),
    (error) => error.message.includes(firstRequired.label) && error.message.includes('is required'),
  );
});
