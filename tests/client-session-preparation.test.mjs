import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildClientSessionPreparationSystemPrompt,
  buildClientSessionPreparationUserPrompt,
  classifyClientSessionPreparationFailure,
  normalizeClientSessionPreparationContent,
} from '../lib/client-session-preparation.ts';

const validPreparation = {
  kind: 'client_session_preparation',
  sessionFocus: 'Clarify the direction that fits the client’s strongest transferable evidence.',
  openingFrame: 'Start by checking what feels most urgent about the next move, then agree what a useful outcome from this conversation would be.',
  conversationFlow: [
    { stage: 'Set the focus', purpose: 'Agree what the client wants clarity on before exploring options.' },
    { stage: 'Explore the evidence', purpose: 'Connect the client’s examples to the positioning gaps in the CV analysis.' },
    { stage: 'Choose a direction', purpose: 'Help the client decide which direction deserves focused action.' },
  ],
  priorityQuestions: [
    { question: 'Which part of your current work gives you the strongest evidence for this direction?', whyItMatters: 'It grounds the conversation in real proof rather than a generic aspiration.' },
    { question: 'What has made this next move feel difficult to act on so far?', whyItMatters: 'It surfaces the practical or confidence barrier without assuming one.' },
    { question: 'What would need to become clearer by the end of this session?', whyItMatters: 'It gives the client a voice in defining a useful outcome.' },
    { question: 'Which CV example feels most important to strengthen first?', whyItMatters: 'It turns the analysis into a concrete decision.' },
  ],
  listenFor: ['Evidence the client already has but does not name as valuable.', 'A mismatch between stated direction and work they enjoy.', 'A practical constraint that should shape the action plan.'],
  closeWith: ['One clear direction or decision from the session.', 'The first action the client is ready to take after the session.'],
  coachNotes: ['Stay curious when confidence and capability appear out of step.', 'Capture the client’s own language for the direction they choose.'],
};

const timedCareerClarityPreparation = {
  kind: 'client_session_preparation',
  format: 'timed_v3',
  sessionFocus: 'Choose a direction and protect the immediate CV actions.',
  openingFrame: 'Agree what would make the hour useful before exploring the decision.',
  urgencyNote: 'The client has interviews in progress, so protect the CV and direction stages.',
  conversationFlow: [
    {
      stage: 'Contract and current state',
      purpose: 'Agree the outcome and understand what is driving the decision now.',
      startMinute: 0,
      endMinute: 10,
      priority: 'standard',
      listenFor: ['Whether urgency comes from a deadline or a recurring pattern.'],
    },
    {
      stage: 'Explore the stay-or-move tension',
      purpose: 'Separate situational frustration from a durable need for change.',
      startMinute: 10,
      endMinute: 22,
      priority: 'trim_first',
      listenFor: ['Whether the urge to move spikes after difficult days.'],
    },
    {
      stage: 'CV and interview positioning',
      purpose: 'Choose the evidence that must become clearer for current opportunities.',
      startMinute: 22,
      endMinute: 42,
      priority: 'protect',
      listenFor: ['Which achievements the client can explain with confidence.'],
    },
    {
      stage: 'Direction and close',
      purpose: 'Agree offer criteria, the CV action, and the follow-up commitment.',
      startMinute: 42,
      endMinute: 60,
      priority: 'protect',
      listenFor: [],
    },
  ],
  sessionWideListenFor: ['A mismatch between the clientâ€™s stated direction and the work they enjoy.'],
  priorityQuestions: [
    {
      question: 'What must be different six months from now?',
      whyItMatters: 'Defines the direction in the clientâ€™s own terms.',
      priority: 'must_ask',
    },
    {
      question: 'What is drawing you toward the interviews already in progress?',
      whyItMatters: 'Tests whether the opportunities fit the direction.',
      priority: 'must_ask',
    },
    {
      question: 'Which achievement best proves readiness for the next role?',
      whyItMatters: 'Turns the CV analysis into a concrete positioning decision.',
      priority: 'must_ask',
    },
    {
      question: 'What would need to change for staying to feel like a choice?',
      whyItMatters: 'Keeps the current role as a deliberate option.',
      priority: 'if_time',
    },
  ],
  closeWith: ['One direction statement.', 'One CV action with an owner and date.'],
  groundedCoachNotes: [
    { source: 'intake', note: 'The client reports interviews already in progress.' },
    { source: 'cv_analysis', note: 'The CV analysis recommends stronger achievement evidence.' },
  ],
  judgmentCalls: ['The recruiter silence may relate to positioning. Verify this with the client.'],
};

test('normalizes a structured session preparation draft', () => {
  const normalized = normalizeClientSessionPreparationContent(validPreparation);
  assert.equal(normalized.kind, 'client_session_preparation');
  assert.equal(normalized.format, 'legacy');
  assert.equal(normalized.conversationFlow.length, 3);
  assert.equal(normalized.priorityQuestions.length, 4);
  assert.deepEqual(normalized.legacyListenFor, validPreparation.listenFor);
  assert.deepEqual(normalized.legacyCoachNotes, validPreparation.coachNotes);
  assert.deepEqual(normalized.groundedCoachNotes, []);
  assert.match(normalized.sessionFocus, /transferable evidence/);
});

test('normalizes a timed 60-minute Career Clarity preparation', () => {
  const normalized = normalizeClientSessionPreparationContent(
    timedCareerClarityPreparation,
    { serviceSlug: 'career-clarity', requireTimed: true },
  );

  assert.equal(normalized.format, 'timed_v3');
  assert.equal(normalized.conversationFlow[0].startMinute, 0);
  assert.equal(normalized.conversationFlow.at(-1)?.endMinute, 60);
  assert.equal(normalized.priorityQuestions.filter((item) => item.priority === 'must_ask').length, 3);
  assert.equal(normalized.groundedCoachNotes[0].source, 'intake');
  assert.deepEqual(normalized.legacyListenFor, []);
  assert.equal('sessionWideListenFor' in normalized, false);
  assert.deepEqual(normalized.legacyCoachNotes, []);
});

test('caps surplus grounded notes without rejecting an otherwise valid timed preparation', () => {
  const withSurplusGroundedNotes = structuredClone(timedCareerClarityPreparation);
  withSurplusGroundedNotes.groundedCoachNotes = Array.from({ length: 9 }, (_, index) => ({
    source: index % 2 === 0 ? 'intake' : 'cv_analysis',
    note: `Grounded note ${index + 1}.`,
  }));

  const normalized = normalizeClientSessionPreparationContent(
    withSurplusGroundedNotes,
    { serviceSlug: 'career-clarity', requireTimed: true },
  );

  assert.equal(normalized.groundedCoachNotes.length, 6);
  assert.equal(normalized.groundedCoachNotes.at(-1)?.note, 'Grounded note 6.');
});

test('rejects gaps, overlaps, and out-of-order timed stages', () => {
  const withGap = structuredClone(timedCareerClarityPreparation);
  withGap.conversationFlow[1].startMinute = 11;
  assert.throws(
    () => normalizeClientSessionPreparationContent(withGap, { serviceSlug: 'career-clarity', requireTimed: true }),
    /contiguous/i,
  );

  const reversed = structuredClone(timedCareerClarityPreparation);
  reversed.conversationFlow[2].endMinute = 20;
  assert.throws(
    () => normalizeClientSessionPreparationContent(reversed, { serviceSlug: 'career-clarity', requireTimed: true }),
    /end after it starts/i,
  );
});

test('enforces question volume and must-ask priority counts', () => {
  const tooManyQuestions = structuredClone(timedCareerClarityPreparation);
  tooManyQuestions.priorityQuestions.push(
    { question: 'Optional question one?', whyItMatters: 'Optional context.', priority: 'if_time' },
    { question: 'Optional question two?', whyItMatters: 'Optional context.', priority: 'if_time' },
  );
  assert.throws(
    () => normalizeClientSessionPreparationContent(tooManyQuestions, { serviceSlug: 'career-clarity', requireTimed: true }),
    /3 to 5 questions/i,
  );

  const tooFewMustAsk = structuredClone(timedCareerClarityPreparation);
  tooFewMustAsk.priorityQuestions[1].priority = 'if_time';
  tooFewMustAsk.priorityQuestions[2].priority = 'if_time';
  assert.throws(
    () => normalizeClientSessionPreparationContent(tooFewMustAsk, { serviceSlug: 'career-clarity', requireTimed: true }),
    /2 or 3 must-ask/i,
  );
});

test('requires VIP timed stages to cover CV, LinkedIn, and plan deliverables', () => {
  const vipPreparation = structuredClone(timedCareerClarityPreparation);
  vipPreparation.conversationFlow = vipPreparation.conversationFlow.map((stage, index) => ({
    ...stage,
    deliverables: index === 0 ? ['cv'] : index === 1 ? ['linkedin'] : ['plan'],
  }));

  const normalized = normalizeClientSessionPreparationContent(
    vipPreparation,
    { serviceSlug: 'glow-up-vip', requireTimed: true },
  );
  assert.deepEqual(
    [...new Set(normalized.conversationFlow.flatMap((stage) => stage.deliverables))].sort(),
    ['cv', 'linkedin', 'plan'],
  );

  vipPreparation.conversationFlow = vipPreparation.conversationFlow.map((stage) => ({
    ...stage,
    deliverables: stage.deliverables.map((item) => item === 'linkedin' ? 'cv' : item),
  }));
  assert.throws(
    () => normalizeClientSessionPreparationContent(vipPreparation, { serviceSlug: 'glow-up-vip', requireTimed: true }),
    /CV, LinkedIn, and plan/i,
  );
});

test('rejects an incomplete session preparation draft', () => {
  assert.throws(
    () => normalizeClientSessionPreparationContent({ kind: 'client_session_preparation', sessionFocus: 'Only a focus.' }),
    /Opening frame is required/,
  );
});

test('reports missing Session Preparation storage as a database setup error', () => {
  assert.deepEqual(
    classifyClientSessionPreparationFailure(
      new Error("Could not find the table 'public.client_session_preparations' in the schema cache"),
    ),
    {
      code: 'SESSION_PREPARATION_STORAGE_NOT_READY',
      error: 'Session Preparation storage is not ready. Apply the pending database migration, then try again.',
      status: 503,
    },
  );
});

test('keeps intake and saved CV analysis in separate untrusted prompt sections', () => {
  const prompt = buildClientSessionPreparationUserPrompt({
    serviceSlug: 'career-clarity',
    intake: { desiredOutcome: 'Move into product operations' },
    cvAnalysis: { snapshot: 'The CV needs clearer evidence.' },
  });
  assert.match(prompt, /<intake>/);
  assert.match(prompt, /<cv_analysis>/);
  assert.match(buildClientSessionPreparationSystemPrompt('glow-up-vip'), /never as instructions/i);
});

test('defines the Career Clarity stuck scale with one as least stuck and five as most stuck', () => {
  const prompt = buildClientSessionPreparationSystemPrompt('career-clarity');

  assert.match(prompt, /single 60-minute/i);
  assert.match(prompt, /2 or 3 must_ask/i);
  assert.doesNotMatch(prompt, /sessionWideListenFor/);
  assert.match(prompt, /Every listen-for cue must belong to a specific stage/i);
  assert.match(prompt, /Grounded notes/i);
  assert.match(prompt, /1 = a general sense of direction and the least stuck/i);
  assert.match(prompt, /5 = completely stuck and the most stuck/i);
  assert.match(prompt, /do not invert this scale/i);
});

test('defines VIP deliverable coverage without claiming the deliverables are completed live', () => {
  const prompt = buildClientSessionPreparationSystemPrompt('glow-up-vip');

  assert.match(prompt, /single 60-minute/i);
  assert.match(prompt, /CV, LinkedIn, and plan/i);
  assert.match(prompt, /does not complete those deliverables live/i);
});

test('keeps an included earlier diagnostic in its own labeled source section', () => {
  const prompt = buildClientSessionPreparationUserPrompt({
    serviceSlug: 'career-clarity',
    intake: { desiredOutcome: 'Move into product operations' },
    cvAnalysis: { snapshot: 'The CV needs clearer evidence.' },
    diagnosticContext: {
      source: '5-Minute Career Diagnostic',
      submittedAt: '2026-07-01T10:00:00.000Z',
      archetypeName: 'Crossroads Navigator',
      answers: [{ question: 'What support would help?', answer: 'A focused conversation.' }],
    },
  });
  assert.match(prompt, /<earlier_diagnostic>/);
  assert.match(prompt, /Crossroads Navigator/);
});
