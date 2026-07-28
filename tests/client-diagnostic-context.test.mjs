import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canIncludeDiagnosticContext,
  formatDiagnosticContextForPreparation,
  normalizeDiagnosticContextStatus,
  requiresRenewedDiagnosticConsent,
  selectIncludedDiagnosticContext,
} from '../lib/client-diagnostic-context.ts';

const diagnostic = {
  id: 'diagnostic-1',
  source: 'diagnostic',
  submittedAt: '2026-07-01T10:00:00.000Z',
  archetypeName: 'Crossroads Navigator',
  answers: { 0: 'D', 1: 'C' },
};

test('only an included diagnostic link can enter Session Preparation', () => {
  assert.equal(selectIncludedDiagnosticContext({ status: 'pending', diagnostic }), null);
  assert.equal(selectIncludedDiagnosticContext({ status: 'excluded', diagnostic }), null);
  assert.equal(selectIncludedDiagnosticContext({ status: 'revoked', diagnostic }), null);
  assert.deepEqual(selectIncludedDiagnosticContext({ status: 'included', diagnostic }), diagnostic);
});

test('a pending diagnostic produces the same preparation source as no match', () => {
  assert.deepEqual(
    selectIncludedDiagnosticContext({ status: 'pending', diagnostic }),
    selectIncludedDiagnosticContext(null),
  );
});

test('included status requires recorded client consent', () => {
  assert.equal(canIncludeDiagnosticContext({ consentConfirmed: false, consentRecordedAt: null }), false);
  assert.equal(canIncludeDiagnosticContext({ consentConfirmed: true, consentRecordedAt: '2026-07-27T12:00:00.000Z' }), true);
});

test('unknown stored statuses fail closed to pending', () => {
  assert.equal(normalizeDiagnosticContextStatus('included'), 'included');
  assert.equal(normalizeDiagnosticContextStatus('unexpected'), 'pending');
  assert.equal(normalizeDiagnosticContextStatus(null), 'pending');
});

test('revoked permission must be renewed before the record can be included again', () => {
  assert.equal(requiresRenewedDiagnosticConsent('revoked', 'included'), true);
  assert.equal(requiresRenewedDiagnosticConsent('excluded', 'included'), false);
});

test('diagnostic answer codes are expanded into readable client-authored context', () => {
  const formatted = formatDiagnosticContextForPreparation(diagnostic, [
    {
      prompt: 'When you imagine your career a year from now, what comes up first?',
      options: { D: 'Honestly, I have no clear picture.' },
    },
    {
      prompt: 'If you had to name the real frustration under everything, what would it be?',
      options: { C: 'The work takes more from me than it gives back.' },
    },
  ]);
  assert.equal(formatted.source, '5-Minute Career Diagnostic');
  assert.equal(formatted.answers.length, 2);
  assert.match(formatted.answers[0].question, /career a year from now/i);
  assert.match(formatted.answers[0].answer, /no clear picture/i);
});
