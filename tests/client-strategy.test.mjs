import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildClientStrategyClientChoiceLabel,
  buildClientStrategyWorkspaceHref,
  CLIENT_STRATEGY_REOPEN_WINDOW_DAYS,
  countCompletedDebriefFields,
  getClientStrategyAccess,
  getClientStrategyPlanLabel,
  isClientStrategyServiceSlug,
  normalizeSessionDebrief,
} from '../lib/client-strategy.ts';

test('limits strategy workspaces to Career Clarity and Glow Up engagements', () => {
  assert.equal(isClientStrategyServiceSlug('career-clarity'), true);
  assert.equal(isClientStrategyServiceSlug('glow-up-vip'), true);
  assert.equal(isClientStrategyServiceSlug('cv-revamp'), false);
  assert.equal(isClientStrategyServiceSlug('masterclass'), false);
});

test('normalizes only the structured session debrief fields', () => {
  assert.deepEqual(
    normalizeSessionDebrief({
      clarityShift: '  The client chose a product operations direction.  ',
      blockers: 'Confidence when translating public-sector experience.',
      strengthsEvidence: 'Led a cross-functional rollout across three teams.',
      decisions: 'Target product operations roles first.',
      clientCommitments: 'Rewrite the top three achievement bullets.',
      coachCommitments: 'Send the positioning summary by Tuesday.',
      toneNotes: 'Be direct, but do not make the pivot sound urgent.',
      unexpectedField: 'must not be persisted',
    }),
    {
      clarityShift: 'The client chose a product operations direction.',
      blockers: 'Confidence when translating public-sector experience.',
      strengthsEvidence: 'Led a cross-functional rollout across three teams.',
      decisions: 'Target product operations roles first.',
      clientCommitments: 'Rewrite the top three achievement bullets.',
      coachCommitments: 'Send the positioning summary by Tuesday.',
      toneNotes: 'Be direct, but do not make the pivot sound urgent.',
    },
  );
});

test('rejects a debrief field that exceeds the safe draft limit', () => {
  assert.throws(
    () => normalizeSessionDebrief({ blockers: 'x'.repeat(4001) }),
    /Key blockers or risks must be 4000 characters or fewer/,
  );
});

test('reports debrief progress without treating whitespace as completed', () => {
  const debrief = normalizeSessionDebrief({
    clarityShift: 'A clear next role.',
    blockers: '   ',
    decisions: 'Apply selectively for 30 days.',
  });

  assert.equal(countCompletedDebriefFields(debrief), 2);
});

test('builds a stable Career Tools workspace link and service-specific plan label', () => {
  assert.equal(
    buildClientStrategyWorkspaceHref('private key', 'career-clarity-booking/123'),
    '/resources/career-diagnostic/submissions?key=private+key&tab=career-tools&client=career-clarity-booking%2F123',
  );
  assert.equal(
    buildClientStrategyWorkspaceHref('dashboard-session', 'career-clarity-booking/123'),
    '/resources/career-diagnostic/submissions?tab=career-tools&client=career-clarity-booking%2F123',
  );
  assert.equal(getClientStrategyPlanLabel('career-clarity'), '14-day follow-up');
  assert.equal(getClientStrategyPlanLabel('glow-up-vip'), '30-day support plan');
});

test('keeps active strategy clients selectable regardless of payment age', () => {
  const access = getClientStrategyAccess(
    {
      serviceSlug: 'career-clarity',
      isDelivered: false,
      deliveredAt: null,
    },
    new Date('2026-07-21T10:00:00.000Z'),
  );

  assert.deepEqual(access, {
    status: 'active',
    daysRemaining: null,
  });
});

test('keeps a completed strategy client selectable for 30 days after delivery', () => {
  const now = new Date('2026-07-21T10:00:00.000Z');
  const access = getClientStrategyAccess(
    {
      serviceSlug: 'glow-up-vip',
      isDelivered: true,
      deliveredAt: '2026-06-21T11:00:00.000Z',
    },
    now,
  );

  assert.equal(CLIENT_STRATEGY_REOPEN_WINDOW_DAYS, 30);
  assert.deepEqual(access, {
    status: 'recently-completed',
    daysRemaining: 1,
  });
});

test('archives a completed strategy client once the 30-day window expires', () => {
  const access = getClientStrategyAccess(
    {
      serviceSlug: 'career-clarity',
      isDelivered: true,
      deliveredAt: '2026-06-21T09:59:59.999Z',
    },
    new Date('2026-07-21T10:00:00.000Z'),
  );

  assert.deepEqual(access, {
    status: 'archived',
    daysRemaining: 0,
  });
});

test('uses a conservative archive state when a completed client has no valid delivery date', () => {
  const access = getClientStrategyAccess(
    {
      serviceSlug: 'glow-up-vip',
      isDelivered: true,
      deliveredAt: null,
    },
    new Date('2026-07-21T10:00:00.000Z'),
  );

  assert.deepEqual(access, {
    status: 'archived',
    daysRemaining: 0,
  });
});

test('does not expose unrelated services in the Strategy Workspace selector', () => {
  const access = getClientStrategyAccess(
    {
      serviceSlug: 'cv-revamp',
      isDelivered: false,
      deliveredAt: null,
    },
    new Date('2026-07-21T10:00:00.000Z'),
  );

  assert.deepEqual(access, {
    status: 'ineligible',
    daysRemaining: null,
  });
});

test('labels active, recent, and test client choices clearly', () => {
  assert.equal(
    buildClientStrategyClientChoiceLabel(
      { buyerName: 'Naledi M', serviceName: 'Career Clarity', isTest: false },
      { status: 'active', daysRemaining: null },
    ),
    'Active: Naledi M - Career Clarity',
  );
  assert.equal(
    buildClientStrategyClientChoiceLabel(
      { buyerName: 'Test Client', serviceName: 'Glow Up VIP', isTest: true },
      { status: 'recently-completed', daysRemaining: 0 },
    ),
    'Recently completed, expires today: Test Client - Glow Up VIP - TEST',
  );
});
