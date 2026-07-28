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

test('normalizes a structured session preparation draft', () => {
  const normalized = normalizeClientSessionPreparationContent(validPreparation);
  assert.equal(normalized.kind, 'client_session_preparation');
  assert.equal(normalized.conversationFlow.length, 3);
  assert.equal(normalized.priorityQuestions.length, 4);
  assert.match(normalized.sessionFocus, /transferable evidence/);
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

  assert.match(prompt, /1 = a general sense of direction and the least stuck/i);
  assert.match(prompt, /5 = completely stuck and the most stuck/i);
  assert.match(prompt, /do not invert this scale/i);
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
