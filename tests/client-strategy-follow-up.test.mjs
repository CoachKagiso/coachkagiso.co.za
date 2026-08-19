import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateClientStrategyThemes,
  buildClientStrategyPlanEmail,
  getClientStrategyCheckpointSchedule,
  normalizeClientStrategyCheckpointOutcome,
} from '../lib/client-strategy-follow-up.ts';
import { normalizeClientStrategyPlanContent } from '../lib/client-strategy-plan.ts';

test('creates one adjustable Microsoft Teams follow-up around Day 14 for Career Clarity', () => {
  assert.deepEqual(
    getClientStrategyCheckpointSchedule('career-clarity', '2026-07-19T08:00:00.000Z'),
    [
      {
        key: 'teams_day_14',
        label: '15-minute Microsoft Teams follow-up',
        dueAt: '2026-08-02T08:00:00.000Z',
        windowLabel: 'Around Day 14',
      },
    ],
  );
});

test('creates the later VIP WhatsApp and Microsoft Teams follow-up windows', () => {
  const schedule = getClientStrategyCheckpointSchedule('glow-up-vip', '2026-07-19T08:00:00.000Z');

  assert.deepEqual(schedule, [
    {
      key: 'whatsapp_day_10_14',
      label: 'WhatsApp check-in',
      dueAt: '2026-07-31T08:00:00.000Z',
      windowLabel: 'Days 10–14',
    },
    {
      key: 'teams_day_28_30',
      label: '15-minute Microsoft Teams follow-up',
      dueAt: '2026-08-17T08:00:00.000Z',
      windowLabel: 'Days 28–30',
    },
  ]);
});

test('normalizes the minimal follow-up record without progress scoring or themes', () => {
  assert.deepEqual(
    normalizeClientStrategyCheckpointOutcome({
      status: 'done',
      notes: '  The direction is clearer, but the proof still needs work.  ',
      dueAt: '2026-08-02T10:00:00.000Z',
    }),
    {
      status: 'done',
      notes: 'The direction is clearer, but the proof still needs work.',
      dueAt: '2026-08-02T10:00:00.000Z',
    },
  );

  assert.throws(
    () => normalizeClientStrategyCheckpointOutcome({
      status: 'completed',
      notes: 'Old status.',
      dueAt: '2026-08-02T10:00:00.000Z',
    }),
    /done or not done/i,
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

test('includes the approved Glow Up interview preparation in the delivery email', () => {
  const content = normalizeClientStrategyPlanContent('glow-up-vip', {
    kind: 'glow_up_30_day',
    focusStatement: 'Align the client story and proof.',
    outcome: 'Present the same credible position across applications and interviews.',
    days1To7: { focus: 'Clarify', actions: ['Choose the direction'], coachSupport: ['Review the position'] },
    days8To14: { focus: 'Strengthen', actions: ['Update the CV'], coachSupport: ['Review the CV'] },
    days15To21: { focus: 'Prepare', actions: ['Shape interview stories'], coachSupport: ['Review the stories'] },
    days22To30: { focus: 'Apply', actions: ['Practise the examples'], coachSupport: ['Complete the review'] },
    progressSignals: ['The client explains the direction consistently'],
    interviewPrep: {
      likelyQuestions: ['Question one?', 'Question two?', 'Question three?', 'Question four?', 'Question five?'],
      starExample: {
        title: 'Recovering a delayed rollout',
        situation: 'A delayed rollout needed clear ownership.',
        task: 'Restore a credible delivery path.',
        action: 'Reset ownership and stakeholder updates.',
        result: '[Confirm: verified delivery outcome].',
        completionStatus: 'confirm_details',
      },
      storyPrompts: [
        { experience: 'Acting manager assignment', prompt: 'Show how trust was established.' },
        { experience: 'Cross-functional rollout', prompt: 'Show how conflict was resolved.' },
        { experience: 'Leadership programme', prompt: 'Show how the learning changed a decision.' },
      ],
      researchChecklist: ['Company strategy', 'Role requirements', 'Panel functions', 'Success questions', 'Recent announcements'],
      watchOutFor: {
        risk: 'The panel may probe for measurable outcomes.',
        handling: 'Use only verified outcomes and name what still needs confirmation.',
      },
    },
  }, { requireInterviewPrep: true });

  const email = buildClientStrategyPlanEmail({
    serviceSlug: 'glow-up-vip',
    recipientName: 'Naledi Mokoena',
    content,
  });

  assert.match(email.text, /Interview preparation/);
  assert.match(email.text, /Recovering a delayed rollout/);
  assert.match(email.html, /Likely interview questions/);
  assert.match(email.html, /Watch out for/);
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

  assert.equal(email.subject, 'Your Career Development Plan | Career Clarity');
  assert.match(email.text, /^Hi Lerato,/);
  assert.match(email.text, /Session Summary & Agreements/);
  assert.match(email.text, /What became clearer/);
  assert.match(email.text, /Client commitments/);
  assert.match(email.text, /Career Development Plan/);
  assert.match(email.text, /Your 30-day roadmap/);
  assert.match(email.text, /Minimum viable commitment/);
  assert.match(email.text, /First 14 Days/);
  assert.match(email.text, /Days 8 to 14/);
  assert.doesNotMatch(email.html, /<script>alert\(1\)<\/script>/);
  assert.match(email.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(email.html, /Session Summary &amp; Agreements/);
  assert.doesNotMatch(`${email.subject}${email.text}${email.html}`, /—/);
});
