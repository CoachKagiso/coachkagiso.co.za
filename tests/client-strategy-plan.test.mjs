import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CLIENT_STRATEGY_PLAN_PROMPT_VERSION,
  findUnsupportedPlanNumbers,
  getClientStrategyPlanDefinition,
  normalizeClientStrategyPlanContent,
} from '../lib/client-strategy-plan.ts';

test('normalizes a Career Clarity plan into the dedicated 14-day schema', () => {
  const plan = normalizeClientStrategyPlanContent('career-clarity', {
    kind: 'career_clarity_14_day',
    focusStatement: '  Build a clear direction — then test it deliberately.  ',
    outcome: "It's clear what the client wants and why they are ready.",
    days1To3: {
      focus: 'Name the direction',
      actions: ['Write the role criteria', 'Remove options that do not fit'],
      ignored: 'not persisted',
    },
    days4To7: {
      focus: 'Gather proof',
      actions: ['Match existing evidence to the role criteria'],
    },
    days8To14: {
      focus: 'Test the decision',
      actions: ["Review the language so it doesn't undersell the client"],
    },
    checkInQuestions: ['What now feels clearer?', 'What still needs a decision?'],
    coachFollowUp: ['Review the final direction statement'],
    fabricatedField: 'must not be persisted',
  });

  assert.deepEqual(plan, {
    kind: 'career_clarity_14_day',
    focusStatement: 'Build a clear direction, then test it deliberately.',
    outcome: 'It is clear what the client wants and why they are ready.',
    days1To3: {
      focus: 'Name the direction',
      actions: ['Write the role criteria', 'Remove options that do not fit'],
    },
    days4To7: {
      focus: 'Gather proof',
      actions: ['Match existing evidence to the role criteria'],
    },
    days8To14: {
      focus: 'Test the decision',
      actions: ['Review the language so it does not undersell the client'],
    },
    checkInQuestions: ['What now feels clearer?', 'What still needs a decision?'],
    coachFollowUp: ['Review the final direction statement'],
  });
});

test('normalizes a Glow Up plan into the dedicated 30-day schema', () => {
  const plan = normalizeClientStrategyPlanContent('glow-up-vip', {
    kind: 'glow_up_30_day',
    focusStatement: 'Align the client story and visible proof.',
    outcome: 'The client has a consistent professional position.',
    days1To7: {
      focus: 'Clarify the position',
      actions: ['Choose the strongest career theme'],
      coachSupport: ['Review the positioning statement'],
    },
    days8To14: {
      focus: 'Strengthen the material',
      actions: ['Align the CV summary with the chosen direction'],
      coachSupport: ['Review the revised summary'],
    },
    days15To21: {
      focus: 'Make the proof visible',
      actions: ['Prepare one evidence example for each priority capability'],
      coachSupport: ['Challenge any unsupported claim'],
    },
    days22To30: {
      focus: 'Use the new position consistently',
      actions: ['Apply the same language across client-facing profiles'],
      coachSupport: ['Complete the closing review'],
    },
    progressSignals: ['The client can state the target direction without hedging'],
  });

  assert.equal(plan.kind, 'glow_up_30_day');
  assert.deepEqual(plan.days22To30.coachSupport, ['Complete the closing review']);
  assert.equal(getClientStrategyPlanDefinition('glow-up-vip').durationDays, 30);
  assert.equal(getClientStrategyPlanDefinition('career-clarity').durationDays, 14);
  assert.equal(CLIENT_STRATEGY_PLAN_PROMPT_VERSION, 'client-strategy-plan-v1');
});

test('rejects incomplete or cross-service plan shapes', () => {
  assert.throws(
    () => normalizeClientStrategyPlanContent('career-clarity', {
      kind: 'glow_up_30_day',
      focusStatement: 'Wrong schema.',
    }),
    /Career Clarity plan schema/,
  );

  assert.throws(
    () => normalizeClientStrategyPlanContent('career-clarity', {
      kind: 'career_clarity_14_day',
      focusStatement: 'Choose a direction.',
      outcome: 'A clear decision.',
      days1To3: { focus: 'Clarify', actions: [] },
      days4To7: { focus: 'Gather proof', actions: ['Review evidence'] },
      days8To14: { focus: 'Test', actions: ['Test the language'] },
      checkInQuestions: ['What changed?'],
      coachFollowUp: ['Review the decision'],
    }),
    /Days 1 to 3 requires at least one action/,
  );
});

test('flags numerical claims or targets that are absent from the saved source context', () => {
  const plan = normalizeClientStrategyPlanContent('career-clarity', {
    kind: 'career_clarity_14_day',
    focusStatement: 'Move toward product operations.',
    outcome: 'Use evidence from three cross-functional teams.',
    days1To3: { focus: 'Clarify', actions: ['List 5 target employers'] },
    days4To7: { focus: 'Gather proof', actions: ['Use evidence from 3 teams'] },
    days8To14: { focus: 'Test', actions: ['Ask for feedback'] },
    checkInQuestions: ['What changed?'],
    coachFollowUp: ['Review the direction'],
  });

  assert.deepEqual(
    findUnsupportedPlanNumbers(plan, 'The client led work across 3 teams.'),
    ['5'],
  );
});
