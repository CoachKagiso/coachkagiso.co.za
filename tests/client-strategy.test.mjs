import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildClientStrategyClientChoiceLabel,
  buildClientStrategyWorkspaceHref,
  CLIENT_STRATEGY_REOPEN_WINDOW_DAYS,
  isClientCvServiceSlug,
  countCompletedDebriefFields,
  getClientStrategyAccess,
  getClientStrategyPlanLabel,
  getClientIntakeCardGroup,
  orderClientIntakeKeys,
  isClientStrategyServiceSlug,
  normalizeClientStrategyWorkspaceView,
  normalizeSessionDebrief,
} from '../lib/client-strategy.ts';

test('limits strategy workspaces to Career Clarity and Glow Up engagements', () => {
  assert.equal(isClientStrategyServiceSlug('career-clarity'), true);
  assert.equal(isClientStrategyServiceSlug('glow-up-vip'), true);
  assert.equal(isClientStrategyServiceSlug('cv-revamp'), false);
  assert.equal(isClientStrategyServiceSlug('masterclass'), false);
});

test('limits CV Analyzer workspaces to the five client CV services', () => {
  for (const slug of ['cv-review', 'cv-revamp', 'cover-letter', 'linkedin', 'bundle']) {
    assert.equal(isClientCvServiceSlug(slug), true);
  }
  assert.equal(isClientCvServiceSlug('masterclass'), false);
});

test('normalizes only the structured session debrief fields', () => {
  assert.deepEqual(
    normalizeSessionDebrief({
      clarityShift: '  The client chose a product operations direction.  ',
      commitments: 'Rewrite the top three achievement bullets and send the positioning summary by Tuesday.',
      sensitivityNotes: 'Be direct, but do not make the pivot sound urgent.',
      unexpectedField: 'must not be persisted',
    }),
    {
      clarityShift: 'The client chose a product operations direction.',
      commitments: 'Rewrite the top three achievement bullets and send the positioning summary by Tuesday.',
      sensitivityNotes: 'Be direct, but do not make the pivot sound urgent.',
    },
  );
});

test('rejects a debrief field that exceeds the safe draft limit', () => {
  assert.throws(
    () => normalizeSessionDebrief({ commitments: 'x'.repeat(4001) }),
    /Commitments made must be 4000 characters or fewer/,
  );
});

test('reports debrief progress without treating whitespace as completed', () => {
  const debrief = normalizeSessionDebrief({
    clarityShift: 'A clear next role.',
    commitments: 'Apply selectively for 30 days.',
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
  assert.equal(
    buildClientStrategyWorkspaceHref('dashboard-session', 'career-clarity-booking/123', 'prep'),
    '/resources/career-diagnostic/submissions?tab=career-tools&client=career-clarity-booking%2F123&view=prep',
  );
  assert.equal(getClientStrategyPlanLabel('career-clarity'), '14-day follow-up');
  assert.equal(getClientStrategyPlanLabel('glow-up-vip'), '30-day support plan');
});

test('normalizes Career Tools views and falls back to client context', () => {
  for (const view of ['context', 'cv', 'prep', 'strategy']) {
    assert.equal(normalizeClientStrategyWorkspaceView(view), view);
  }
  assert.equal(normalizeClientStrategyWorkspaceView('unknown'), 'context');
  assert.equal(normalizeClientStrategyWorkspaceView(undefined), 'context');
});

test('keeps identity fields in the identity group', () => {
  for (const key of ['email', 'phone', 'fullName', 'whatsapp', 'attendeePhoneNumber']) {
    assert.equal(getClientIntakeCardGroup(key), 'identity');
  }
  for (const key of ['stuckScale', 'currentRole', 'yearsInRole', 'additionalInfo', 'clarityQuestion', 'previousAttempts', 'additionalContext']) {
    assert.equal(getClientIntakeCardGroup(key), 'context');
  }
});

test('orders Career Clarity identity fields before the booking questions', () => {
  assert.deepEqual(
    orderClientIntakeKeys(['additionalInfo', 'email', 'stuckScale', 'fullName', 'currentRole', 'phone', 'clarityGoal', 'alreadyTried']),
    ['fullName', 'email', 'phone', 'currentRole', 'clarityGoal', 'alreadyTried', 'stuckScale', 'additionalInfo'],
  );
  assert.deepEqual(
    orderClientIntakeKeys(['additional_context', 'email', 'stuck_scale', 'full_name', 'current_role']),
    ['full_name', 'email', 'current_role', 'stuck_scale', 'additional_context'],
  );
});

test('keeps active strategy clients selectable regardless of payment age', () => {
  const access = getClientStrategyAccess(
    {
      serviceSlug: 'career-clarity',
      isDelivered: false,
      deliveredAt: null,
    },
    {},
    new Date('2026-07-21T10:00:00.000Z'),
  );

  assert.equal(access.status, 'active');
  assert.equal(access.selectable, true);
  assert.equal(access.canUseCvAnalyzer, true);
  assert.equal(access.canUseStrategyTab, true);
});

test('keeps a completed strategy client selectable for 30 days after delivery', () => {
  const now = new Date('2026-07-21T10:00:00.000Z');
  const access = getClientStrategyAccess(
    {
      serviceSlug: 'glow-up-vip',
      isDelivered: true,
      deliveredAt: '2026-06-21T11:00:00.000Z',
    },
    {},
    now,
  );

  assert.equal(CLIENT_STRATEGY_REOPEN_WINDOW_DAYS, 30);
  assert.equal(access.status, 'recently-completed');
  assert.equal(access.daysRemaining, 1);
  assert.equal(access.selectable, true);
  assert.equal(access.canUseStrategyTab, true);
});

test('archives a completed strategy client once the 30-day window expires', () => {
  const access = getClientStrategyAccess(
    {
      serviceSlug: 'career-clarity',
      isDelivered: true,
      deliveredAt: '2026-06-21T09:59:59.999Z',
    },
    {},
    new Date('2026-07-21T10:00:00.000Z'),
  );

  assert.equal(access.status, 'archived');
  assert.equal(access.daysRemaining, 0);
  assert.equal(access.selectable, false);
  assert.equal(access.canUseCvAnalyzer, false);
  assert.equal(access.canUseStrategyTab, false);
});

test('uses a conservative archive state when a completed client has no valid delivery date', () => {
  const access = getClientStrategyAccess(
    {
      serviceSlug: 'glow-up-vip',
      isDelivered: true,
      deliveredAt: null,
    },
    {},
    new Date('2026-07-21T10:00:00.000Z'),
  );

  assert.equal(access.status, 'archived');
  assert.equal(access.selectable, false);
});

test('keeps supported CV-only services active without a strategy tab', () => {
  const access = getClientStrategyAccess(
    {
      serviceSlug: 'cv-revamp',
      isDelivered: false,
      deliveredAt: null,
    },
    {},
    new Date('2026-07-21T10:00:00.000Z'),
  );

  assert.equal(access.status, 'active');
  assert.equal(access.selectable, true);
  assert.equal(access.canUseCvAnalyzer, true);
  assert.equal(access.canUseStrategyTab, false);
});

test('marks cohort services ineligible for the client workspace', () => {
  const access = getClientStrategyAccess(
    {
      serviceSlug: 'masterclass',
      isDelivered: true,
      deliveredAt: '2026-06-21T09:59:59.999Z',
    },
    {},
    new Date('2026-07-21T10:00:00.000Z'),
  );

  assert.equal(access.status, 'ineligible');
  assert.equal(access.selectable, false);
  assert.equal(access.canUseCvAnalyzer, false);
  assert.equal(access.canUseStrategyTab, false);
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
