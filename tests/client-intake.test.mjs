import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearClientIntakeDraftField,
  coerceEditedIntakeValue,
  evaluateClientSessionPreparationReadiness,
  hasMeaningfulIntake,
  hasMeaningfulClientContext,
  mergeClientIntake,
  shouldPersistClientIntakeEdit,
} from '../lib/client-intake.ts';

test('merges the latest Kagiso override without changing the original form data', () => {
  const original = { currentRole: 'Operations manager', desiredOutcome: 'A clearer direction' };
  const overrides = [
    {
      id: 'one', paymentId: 'payment-1', fieldName: 'currentRole', value: 'Product operations manager',
      editedAt: '2026-07-27T08:00:00.000Z', editedBy: 'kagiso_dashboard', source: 'kagiso_override', editBatchId: 'batch-1',
    },
    {
      id: 'two', paymentId: 'payment-1', fieldName: 'additionalContext', value: 'Shared over WhatsApp',
      editedAt: '2026-07-27T08:01:00.000Z', editedBy: 'kagiso_dashboard', source: 'kagiso_override', editBatchId: 'batch-1',
    },
  ];

  const merged = mergeClientIntake(original, overrides);
  assert.equal(merged.formData.currentRole, 'Product operations manager');
  assert.equal(merged.formData.additionalContext, 'Shared over WhatsApp');
  assert.equal(original.currentRole, 'Operations manager');
  assert.equal(merged.latestByField.get('currentRole')?.editedBy, 'kagiso_dashboard');
});

test('a Kagiso-entered value counts as intake when no client submission exists', () => {
  const merged = mergeClientIntake({}, [{
    id: 'one', paymentId: 'payment-1', fieldName: 'additionalContext', value: 'The client emailed a career pivot goal',
    editedAt: '2026-07-27T08:00:00.000Z', editedBy: 'kagiso_dashboard', source: 'kagiso_override', editBatchId: 'batch-1',
  }]);

  assert.equal(hasMeaningfulIntake(merged.formData), true);
});

test('placeholder answers do not count as meaningful intake', () => {
  assert.equal(hasMeaningfulIntake({ currentRole: 'NA', clarityGoal: 'N/A', additionalInfo: 'Not provided' }), false);
});

test('identity details alone do not make session context ready', () => {
  assert.equal(hasMeaningfulClientContext({ fullName: 'Xoliswa', email: 'xoliswa@example.com', currentRole: 'NA' }), false);
  assert.equal(hasMeaningfulClientContext({ fullName: 'Xoliswa', email: 'xoliswa@example.com', additionalContext: 'Answers received by email and reviewed by Kagiso.' }), true);
});

test('clearing a field is represented by the latest override while the original remains retrievable', () => {
  const original = { blockers: 'Lack of confidence' };
  const merged = mergeClientIntake(original, [{
    id: 'one', paymentId: 'payment-1', fieldName: 'blockers', value: '',
    editedAt: '2026-07-27T08:00:00.000Z', editedBy: 'kagiso_dashboard', source: 'kagiso_override', editBatchId: 'batch-1',
  }]);

  assert.equal(merged.formData.blockers, '');
  assert.equal(original.blockers, 'Lack of confidence');
  assert.equal(hasMeaningfulIntake(merged.formData), false);
});

test('persists a blank override when clearing an existing placeholder answer', () => {
  assert.equal(shouldPersistClientIntakeEdit('NA', '', true), true);
  assert.equal(shouldPersistClientIntakeEdit('N/A', '', true), true);
});

test('does not create an artificial intake field for a new blank value', () => {
  assert.equal(shouldPersistClientIntakeEdit(undefined, '', false), false);
  assert.equal(shouldPersistClientIntakeEdit(undefined, 'Context received over LinkedIn', false), true);
});

test('clears only the selected intake draft field', () => {
  assert.deepEqual(
    clearClientIntakeDraftField(
      { currentRole: 'Consultant', clarityGoal: 'Choose a direction' },
      'currentRole',
    ),
    { currentRole: '', clarityGoal: 'Choose a direction' },
  );
});

test('verified Additional Context satisfies readiness without booking or diagnostic answers', () => {
  assert.deepEqual(
    evaluateClientSessionPreparationReadiness({
      formData: {
        currentRole: 'NA',
        clarityGoal: 'N/A',
        additionalContext: 'The client shared her career concerns in a LinkedIn conversation.',
      },
      contextVerified: true,
      hasCvAnalysis: true,
    }),
    {
      hasIntake: true,
      hasMeaningfulContext: true,
      contextVerified: true,
      hasCvAnalysis: true,
      canGenerate: true,
    },
  );
});

test('saved Additional Context still requires explicit coach verification', () => {
  const readiness = evaluateClientSessionPreparationReadiness({
    formData: { additionalContext: 'Context copied from the client conversation.' },
    contextVerified: false,
    hasCvAnalysis: true,
  });
  assert.equal(readiness.hasMeaningfulContext, true);
  assert.equal(readiness.hasIntake, false);
  assert.equal(readiness.canGenerate, false);
});

test('preserves structured answers when an edited value is valid JSON', () => {
  assert.deepEqual(coerceEditedIntakeValue('["pivot", "leadership"]', ['pivot']), ['pivot', 'leadership']);
  assert.equal(coerceEditedIntakeValue('true', false), true);
});
