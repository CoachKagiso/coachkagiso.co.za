import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateClientStrategyThemes,
  buildClientStrategyPlanEmail,
  getClientStrategyCheckpointSchedule,
  normalizeClientStrategyCheckpointOutcome,
} from '../lib/client-strategy-follow-up.ts';
import { normalizeClientStrategyPlanContent } from '../lib/client-strategy-plan.ts';

test('creates a midpoint and final checkpoint for a delivered Career Clarity plan', () => {
  assert.deepEqual(
    getClientStrategyCheckpointSchedule('career-clarity', '2026-07-19T08:00:00.000Z'),
    [
      {
        key: 'day_7',
        label: 'Day 7 midpoint check-in',
        dueAt: '2026-07-26T08:00:00.000Z',
      },
      {
        key: 'day_14',
        label: 'Day 14 outcome review',
        dueAt: '2026-08-02T08:00:00.000Z',
      },
    ],
  );
});

test('creates four weekly checkpoints for a delivered Glow Up plan', () => {
  const schedule = getClientStrategyCheckpointSchedule('glow-up-vip', '2026-07-19T08:00:00.000Z');

  assert.deepEqual(schedule.map((checkpoint) => checkpoint.key), ['day_7', 'day_14', 'day_21', 'day_30']);
  assert.equal(schedule.at(-1)?.dueAt, '2026-08-18T08:00:00.000Z');
});

test('normalizes a completed checkpoint outcome without changing plan content', () => {
  assert.deepEqual(
    normalizeClientStrategyCheckpointOutcome({
      status: 'completed',
      progressStatus: 'partly_on_track',
      notes: '  The direction is clearer, but the proof still needs work.  ',
      themes: ['career_direction', 'evidence_gap', 'career_direction'],
    }),
    {
      status: 'completed',
      progressStatus: 'partly_on_track',
      notes: 'The direction is clearer, but the proof still needs work.',
      themes: ['career_direction', 'evidence_gap'],
    },
  );

  assert.throws(
    () => normalizeClientStrategyCheckpointOutcome({
      status: 'completed',
      progressStatus: 'on_track',
      notes: 'Client supplied an unexpected tag.',
      themes: ['private_client_name'],
    }),
    /Choose only the approved learning themes/,
  );
});

test('reports a theme only after three distinct clients share it', () => {
  assert.deepEqual(
    aggregateClientStrategyThemes([
      { paymentId: 'client-a', themes: ['career_direction', 'confidence_language'] },
      { paymentId: 'client-a', themes: ['career_direction'] },
      { paymentId: 'client-b', themes: ['career_direction'] },
      { paymentId: 'client-c', themes: ['career_direction'] },
      { paymentId: 'client-d', themes: ['confidence_language'] },
    ]),
    [
      {
        key: 'career_direction',
        label: 'Career direction',
        clientCount: 3,
      },
    ],
  );
});

test('renders a branded, escaped email from the approved plan content', () => {
  const content = normalizeClientStrategyPlanContent('career-clarity', {
    kind: 'career_clarity_14_day',
    focusStatement: 'Choose a focused product operations direction.',
    outcome: 'Explain the direction with confidence.',
    days1To3: {
      focus: 'Name the direction',
      actions: ['Write the role criteria', 'Remove <script>alert(1)</script> from the notes'],
    },
    days4To7: { focus: 'Gather proof', actions: ['Match evidence to the role criteria'] },
    days8To14: { focus: 'Test the language', actions: ['Ask a trusted peer for feedback'] },
    checkInQuestions: ['What now feels clearer?'],
    coachFollowUp: ['Review the direction statement'],
  });

  const email = buildClientStrategyPlanEmail({
    serviceSlug: 'career-clarity',
    recipientName: 'Lerato Molefe',
    content,
  });

  assert.equal(email.subject, 'Your personalized 14-day Career Clarity plan');
  assert.match(email.text, /^Hi Lerato,/);
  assert.match(email.text, /Days 8 to 14/);
  assert.doesNotMatch(email.html, /<script>alert\(1\)<\/script>/);
  assert.match(email.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(`${email.subject}${email.text}${email.html}`, /—/);
});

