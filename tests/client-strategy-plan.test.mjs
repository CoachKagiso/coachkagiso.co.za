import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CLIENT_STRATEGY_PLAN_PROMPT_VERSION,
  buildClientStrategyPlanHorizonExtensionSystemPrompt,
  buildClientStrategyPlanHorizonExtensionUserPrompt,
  buildClientStrategyPlanShell,
  buildClientStrategyPlanSectionSystemPrompt,
  buildClientStrategyPlanSystemPrompt,
  findUnsupportedPlanNumbers,
  getIncompleteClientStrategyPlanSections,
  getClientStrategyPlanDefinition,
  mergeClientStrategyPlanHorizonExtension,
  mergeClientStrategyPlanSection,
  normalizeClientStrategyPlanContent,
  getClientStrategyPlanFinalWeek,
  getClientStrategyPlanExtensionGaps,
  groupClientStrategyPlanWeeks,
  hasClientStrategyPlanExtensionGaps,
} from '../lib/client-strategy-plan.ts';

/**
 * The decision-support fields a Career Clarity development plan must return from v7 onward.
 * `finalWeek` controls how far the weekly rhythm runs, matching the plan horizon.
 */
function careerClarityDecisionSupport(finalWeek = 4) {
  const weeklyRhythm = [];
  for (let weekNumber = 3; weekNumber <= finalWeek; weekNumber += 1) {
    weeklyRhythm.push({
      weekNumber,
      theme: `Week ${weekNumber} focus`,
      actions: [`Run the scorecard review for week ${weekNumber}.`],
    });
  }

  return {
    decisionFramework: {
      decisionStatement: 'Decide whether to stay in the current role or pursue a new one.',
      criteria: [
        {
          criterion: 'The role gives real decision-making scope.',
          currentRoleEvidence: 'Ask for one decision to own outright this month.',
          marketEvidence: 'Ask each interviewer what decisions the role owns.',
        },
        {
          criterion: 'The workload is sustainable.',
          currentRoleEvidence: 'Track how many evenings the week actually takes.',
          marketEvidence: 'Ask how the team handles peak periods.',
        },
        {
          criterion: 'The work uses her strongest evidence.',
          currentRoleEvidence: 'Note which tasks draw on that evidence.',
          marketEvidence: 'Compare the job specification against her scorecard.',
        },
      ],
      stayThreshold: 'Staying is right if the decision scope widens and the workload settles.',
      decisionCheckpoint: 'Review the criteria at the agreed follow-up and make the call.',
    },
    positioning: {
      currentRecruiterRead: 'A capable operator whose scope is not obvious from the CV.',
      targetRecruiterRead: 'Someone who owns decisions and can show the outcome.',
      positioningStatement: 'I lead [Confirm: the specific area] and I am accountable for [Confirm: the outcome].',
      achievementPrompts: [
        'What did you decide that nobody else could have decided?',
        'What changed because you were in the room?',
        'What would have gone wrong without you?',
      ],
    },
    weeklyRhythm,
    marketSignalRitual: {
      cadence: 'Once a week',
      steps: [
        'Read one real job specification for the direction you are testing.',
        'Mark every requirement your CV already proves.',
      ],
      reflectionPrompt: 'Which gap showed up again this week?',
    },
    progressSignals: [
      'You can describe your value without hedging.',
      'The scorecard settles a decision rather than reopening it.',
      'You notice the same gap repeatedly, so you know what to work on.',
    ],
  };
}

test('normalizes a new Career Clarity career development plan with a 30-day horizon', () => {
  const plan = normalizeClientStrategyPlanContent('career-clarity', {
    kind: 'career_clarity_development_plan',
    openingDiagnostic: 'The client values meaningful work, has demonstrated calm cross-functional leadership, and needs a clearer way to translate that evidence into a focused next move.',
    permissionLine: 'This plan is a tool, not a scorecard. If you miss a week, returning to the plan still counts as progress.',
    focusStatement: 'Build a clear direction, then test it deliberately.',
    outcome: 'The client can assess opportunities against a grounded set of career criteria.',
    planHorizonDays: 30,
    milestones: {
      day30: [
        'Write and use a concise opportunity scorecard.',
        'Align the CV summary with the chosen direction.',
      ],
    },
    minimumViableCommitment: 'Spend twenty minutes each week reviewing one opportunity against the scorecard.',
    checkpointCondition: 'At the 15-minute Microsoft Teams follow-up around Day 14, review whether the scorecard is making decisions clearer.',
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
  }, { requireCareerDevelopmentFields: true });

  assert.equal(plan.kind, 'career_clarity_development_plan');
  assert.equal(plan.planHorizonDays, 30);
  assert.deepEqual(plan.milestones.day30, [
    'Write and use a concise opportunity scorecard.',
    'Align the CV summary with the chosen direction.',
  ]);
  assert.equal(plan.milestones.day60, undefined);
  assert.equal(plan.milestones.day90, undefined);
});

test('requires the full career development structure for newly generated plans', () => {
  assert.throws(
    () => normalizeClientStrategyPlanContent('career-clarity', {
      kind: 'career_clarity_14_day',
      focusStatement: 'Choose a direction.',
      outcome: 'A clear decision.',
      days1To3: { focus: 'Clarify', actions: ['Write the criteria'] },
      days4To7: { focus: 'Gather proof', actions: ['Review evidence'] },
      days8To14: { focus: 'Test', actions: ['Test the language'] },
      checkInQuestions: ['What changed?'],
      coachFollowUp: ['Review the decision'],
    }, { requireCareerDevelopmentFields: true }),
    /career development plan schema/i,
  );
});

test('loads a legacy 14-day Career Clarity record into the career development plan schema', () => {
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

  assert.equal(plan.kind, 'career_clarity_development_plan');
  assert.equal(plan.planHorizonDays, 30);
  assert.equal(plan.openingDiagnostic, 'Build a clear direction, then test it deliberately.');
  assert.equal(plan.minimumViableCommitment, '[Confirm: one small recurring weekly action]');
  assert.deepEqual(plan.days1To3.actions, ['Write the role criteria', 'Remove options that do not fit']);
  assert.deepEqual(plan.milestones.day30, [
    'Write the role criteria',
    'Remove options that do not fit',
    'Match existing evidence to the role criteria',
  ]);
});

test('loads a legacy Glow Up record into the career development plan schema', () => {
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

  assert.equal(plan.kind, 'glow_up_development_plan');
  assert.deepEqual(plan.days22To30.coachSupport, ['Complete the closing review']);
  assert.equal(plan.interviewPrep, null);
  assert.equal(getClientStrategyPlanDefinition('glow-up-vip').durationDays, 30);
  assert.equal(getClientStrategyPlanDefinition('career-clarity').durationDays, 30);
  assert.equal(CLIENT_STRATEGY_PLAN_PROMPT_VERSION, 'client-strategy-plan-v8-plain-language');
});

test('normalizes the required Glow Up interview preparation section', () => {
  const plan = normalizeClientStrategyPlanContent('glow-up-vip', {
    kind: 'glow_up_30_day',
    focusStatement: 'Align the client story and visible proof.',
    outcome: 'The client can present a consistent professional position.',
    days1To7: { focus: 'Clarify', actions: ['Choose the direction'], coachSupport: ['Review the positioning'] },
    days8To14: { focus: 'Strengthen', actions: ['Update the CV'], coachSupport: ['Review the CV'] },
    days15To21: { focus: 'Prepare', actions: ['Shape interview stories'], coachSupport: ['Challenge unsupported claims'] },
    days22To30: { focus: 'Apply', actions: ['Use the new story consistently'], coachSupport: ['Complete the review'] },
    progressSignals: ['The client can explain the target direction clearly'],
    interviewPrep: {
      likelyQuestions: [
        'Tell us about a complex rollout you led.',
        'How do you align stakeholders with competing priorities?',
        'How do you recover a delayed programme?',
        'Which measures tell you that delivery is on track?',
        'Why does this role fit your next career step?',
      ],
      starExample: {
        title: 'Recovering a delayed rollout',
        situation: 'The client inherited a delayed rollout with unclear ownership.',
        task: 'The client needed to restore a credible delivery path.',
        action: 'The client reset ownership, milestones, and stakeholder updates.',
        result: '[Confirm: the verified delivery outcome and evidence].',
        completionStatus: 'confirm_details',
      },
      storyPrompts: [
        { experience: 'Acting team manager assignment', prompt: 'Shape the example around how the client established trust and accountability.' },
        { experience: 'Cross-functional rollout', prompt: 'Identify the conflict, the client action, and the verified result.' },
        { experience: 'MDP certificate', prompt: 'Connect the learning to a specific leadership decision.' },
      ],
      researchChecklist: [
        'Confirm the company strategy and current priorities.',
        'Review the role requirements against the CV evidence.',
        'Identify the likely panel functions.',
        'Prepare questions about success in the role.',
        'Check recent company announcements without assuming they will be discussed.',
      ],
      watchOutFor: {
        risk: 'The panel may probe for measurable outcomes that are not yet clear in the CV.',
        handling: 'Use only verified outcomes and explain what evidence can be confirmed after the interview.',
      },
    },
  }, { requireInterviewPrep: true });

  assert.equal(plan.interviewPrep?.likelyQuestions.length, 5);
  assert.equal(plan.interviewPrep?.storyPrompts.length, 3);
  assert.equal(plan.interviewPrep?.researchChecklist.length, 5);
  assert.equal(plan.interviewPrep?.starExample.completionStatus, 'confirm_details');
});

test('requires confirmation placeholders when a STAR example is incomplete', () => {
  const incompletePlan = {
    kind: 'glow_up_30_day',
    focusStatement: 'Align the client story.',
    outcome: 'Present a consistent position.',
    days1To7: { focus: 'Clarify', actions: ['Choose the direction'], coachSupport: ['Review it'] },
    days8To14: { focus: 'Strengthen', actions: ['Update the CV'], coachSupport: ['Review it'] },
    days15To21: { focus: 'Prepare', actions: ['Shape stories'], coachSupport: ['Review them'] },
    days22To30: { focus: 'Apply', actions: ['Practise'], coachSupport: ['Check in'] },
    progressSignals: ['The client explains the direction clearly'],
    interviewPrep: {
      likelyQuestions: ['Question one?', 'Question two?', 'Question three?', 'Question four?', 'Question five?'],
      starExample: {
        title: 'A story',
        situation: 'Known situation.',
        task: 'Known task.',
        action: 'Known action.',
        result: 'An unsupported result.',
        completionStatus: 'confirm_details',
      },
      storyPrompts: [
        { experience: 'Experience one', prompt: 'Prompt one' },
        { experience: 'Experience two', prompt: 'Prompt two' },
        { experience: 'Experience three', prompt: 'Prompt three' },
      ],
      researchChecklist: ['One', 'Two', 'Three', 'Four', 'Five'],
      watchOutFor: { risk: 'A weak point.', handling: 'A grounded response.' },
    },
  };

  assert.throws(
    () => normalizeClientStrategyPlanContent('glow-up-vip', incompletePlan, { requireInterviewPrep: true }),
    /\[Confirm:/,
  );
});

test('keeps interview preparation exclusive to the Glow Up plan prompt', () => {
  const glowUpPrompt = buildClientStrategyPlanSystemPrompt('glow-up-vip');
  const clarityPrompt = buildClientStrategyPlanSystemPrompt('career-clarity');

  assert.match(glowUpPrompt, /5 to 8 likely interview questions/i);
  assert.match(glowUpPrompt, /\[Confirm:/);
  assert.doesNotMatch(clarityPrompt, /STAR example/i);
});

test('prompts both services as editable career development plans with service-specific opening periods', () => {
  const clarityPrompt = buildClientStrategyPlanSystemPrompt('career-clarity');
  const glowUpPrompt = buildClientStrategyPlanSystemPrompt('glow-up-vip');

  for (const prompt of [clarityPrompt, glowUpPrompt]) {
    assert.match(prompt, /career development plan/i);
    assert.match(prompt, /openingDiagnostic/);
    assert.match(prompt, /planHorizonDays/);
    assert.match(prompt, /minimumViableCommitment/);
    assert.match(prompt, /checkpointCondition/);
    assert.match(prompt, /tool, not a scorecard/i);
    assert.match(prompt, /30 by default/i);
  }
  assert.match(clarityPrompt, /First 14 Days/);
  assert.match(clarityPrompt, /15-minute Microsoft Teams/i);
  assert.match(glowUpPrompt, /First 30 Days/);
  assert.match(glowUpPrompt, /WhatsApp check-in/i);
  assert.match(glowUpPrompt, /Days 10 to 14/i);
  assert.match(glowUpPrompt, /Days 28 to 30/i);
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

test('creates an incomplete section-aware shell without pretending any report is ready', () => {
  const plan = buildClientStrategyPlanShell('career-clarity');

  assert.deepEqual(plan.sectionStatus, {
    sessionSummary: 'not_generated',
    developmentPlan: 'not_generated',
  });
  assert.deepEqual(
    getIncompleteClientStrategyPlanSections(plan),
    ['session_summary', 'development_plan'],
  );
});

test('merges a generated session summary without replacing development-plan content', () => {
  const plan = buildClientStrategyPlanShell('career-clarity');
  const originalMilestones = plan.milestones;

  const merged = mergeClientStrategyPlanSection('career-clarity', plan, 'session_summary', {
    sessionSummary: {
      sessionDate: '[Confirm: session date]',
      purpose: 'Clarify whether the client should stay in the current role or pursue a better-supported environment.',
      whereThingsStood: 'The client had interviews in progress while still carrying significant responsibility in the current team.',
      themesExplored: ['Role fit and sustainability', 'CV positioning and interview choices'],
      clarityGained: ['The next role needs both growth and a healthier support structure.'],
      agreedOutcome: 'Use clear criteria to assess current and incoming opportunities.',
      clientCommitments: ['Compare each active opportunity against the agreed role criteria.'],
      coachCommitments: ['Review the client CV positioning against the chosen direction.'],
      openPoints: ['[Confirm: the agreed session follow-up date]'],
    },
  });

  assert.equal(merged.sectionStatus.sessionSummary, 'generated');
  assert.equal(merged.sectionStatus.developmentPlan, 'not_generated');
  assert.deepEqual(merged.milestones, originalMilestones);
  assert.equal(merged.focusStatement, merged.sessionSummary.purpose);
  assert.equal(merged.outcome, merged.sessionSummary.agreedOutcome);
});

test('merges development-plan output without changing an approved session summary', () => {
  const withSummary = mergeClientStrategyPlanSection(
    'career-clarity',
    buildClientStrategyPlanShell('career-clarity'),
    'session_summary',
    {
      sessionSummary: {
        sessionDate: '[Confirm: session date]',
        purpose: 'Clarify the next career direction.',
        whereThingsStood: 'The client was weighing an active job search against remaining in the current role.',
        themesExplored: ['Direction', 'Role fit'],
        clarityGained: ['Support and sustainable expectations are non-negotiable criteria.'],
        agreedOutcome: 'Assess opportunities against a grounded role scorecard.',
        clientCommitments: ['Write the role scorecard.'],
        coachCommitments: ['Review the CV positioning.'],
        openPoints: ['[Confirm: follow-up date]'],
      },
    },
  );
  const summaryBefore = withSummary.sessionSummary;

  const merged = mergeClientStrategyPlanSection('career-clarity', withSummary, 'development_plan', {
    planHorizonDays: 30,
    milestones: {
      day30: ['Use the role scorecard on every active opportunity.', 'Align the CV summary with the selected direction.'],
    },
    minimumViableCommitment: 'Review one opportunity against the role scorecard each week.',
    checkpointCondition: 'If the criteria are still unclear by the Day 14 Microsoft Teams follow-up, revisit them with Kagiso.',
    days1To3: { focus: 'Define the criteria', actions: ['Write the role scorecard.'] },
    days4To7: { focus: 'Align the evidence', actions: ['Match CV evidence to the target direction.'] },
    days8To14: { focus: 'Test the direction', actions: ['Use the scorecard on the active interviews.'] },
    checkInQuestions: ['Which criterion changed a decision?'],
    coachFollowUp: ['Review the CV summary and role scorecard.'],
    ...careerClarityDecisionSupport(),
  });

  assert.deepEqual(merged.sessionSummary, summaryBefore);
  assert.equal(merged.sectionStatus.sessionSummary, 'generated');
  assert.equal(merged.sectionStatus.developmentPlan, 'generated');
  assert.deepEqual(getIncompleteClientStrategyPlanSections(merged), []);
});

test('accepts a section-wrapped development plan and a numeric-string horizon', () => {
  const withSummary = mergeClientStrategyPlanSection(
    'career-clarity',
    buildClientStrategyPlanShell('career-clarity'),
    'session_summary',
    {
      sessionSummary: {
        sessionDate: '[Confirm: session date]',
        purpose: 'Clarify the next career direction.',
        whereThingsStood: 'The client was weighing active interviews against remaining in the current role.',
        themesExplored: ['Direction', 'Role fit'],
        clarityGained: ['Support and sustainable expectations are non-negotiable criteria.'],
        agreedOutcome: 'Assess opportunities against a grounded role scorecard.',
        clientCommitments: ['Write the role scorecard.'],
        coachCommitments: ['Review the CV positioning.'],
        openPoints: ['[Confirm: follow-up date]'],
      },
    },
  );

  const merged = mergeClientStrategyPlanSection('career-clarity', withSummary, 'development_plan', {
    developmentPlan: {
      planHorizonDays: '30',
      milestones: {
        day30: ['Use the scorecard on each active opportunity.', 'Align the CV summary with the chosen direction.'],
      },
      minimumViableCommitment: 'Review one opportunity against the role scorecard each week.',
      checkpointCondition: 'Review the result at the Day 14 Microsoft Teams follow-up.',
      days1To3: { focus: 'Define the criteria', actions: ['Write the role scorecard.'] },
      days4To7: { focus: 'Align the evidence', actions: ['Match CV evidence to the target direction.'] },
      days8To14: { focus: 'Test the direction', actions: ['Use the scorecard on the active interviews.'] },
      checkInQuestions: ['Which criterion changed a decision?'],
      coachFollowUp: ['Review the CV summary and role scorecard.'],
      ...careerClarityDecisionSupport(),
    },
  });

  assert.equal(merged.planHorizonDays, 30);
  assert.equal(merged.sectionStatus.developmentPlan, 'generated');
  assert.equal(merged.milestones.day30[0], 'Use the scorecard on each active opportunity.');
});

test('requires interview preparation only for Glow Up VIP completion', () => {
  const clarity = buildClientStrategyPlanShell('career-clarity');
  const vip = buildClientStrategyPlanShell('glow-up-vip');

  assert.deepEqual(getIncompleteClientStrategyPlanSections(clarity), [
    'session_summary',
    'development_plan',
  ]);
  assert.deepEqual(getIncompleteClientStrategyPlanSections(vip), [
    'session_summary',
    'development_plan',
    'interview_prep',
  ]);
  assert.throws(
    () => mergeClientStrategyPlanSection('career-clarity', clarity, 'interview_prep', {}),
    /Glow Up VIP/i,
  );
});

test('uses focused prompts for each independently generated section', () => {
  const summaryPrompt = buildClientStrategyPlanSectionSystemPrompt('career-clarity', 'session_summary');
  const developmentPrompt = buildClientStrategyPlanSectionSystemPrompt('glow-up-vip', 'development_plan');
  const interviewPrompt = buildClientStrategyPlanSectionSystemPrompt('glow-up-vip', 'interview_prep');

  assert.match(summaryPrompt, /Session Summary & Agreements/i);
  assert.doesNotMatch(summaryPrompt, /days22To30/);
  assert.match(developmentPrompt, /days22To30/);
  assert.match(developmentPrompt, /"planHorizonDays": 30/);
  assert.doesNotMatch(developmentPrompt, /"planHorizonDays": "30 \| 60 \| 90"/);
  assert.doesNotMatch(developmentPrompt, /STAR example/i);
  assert.match(interviewPrompt, /STAR example/i);
  assert.doesNotMatch(interviewPrompt, /planHorizonDays/);
});

/** The contiguous weeks an extension has to return, now that an empty rhythm counts as a gap. */
function extensionWeeks(fromWeek, toWeek) {
  const weeks = [];
  for (let weekNumber = fromWeek; weekNumber <= toWeek; weekNumber += 1) {
    weeks.push({ weekNumber, theme: `Week ${weekNumber} focus`, actions: [`Run week ${weekNumber}.`] });
  }
  return weeks;
}

test('extends a 30-day plan to 60 days without replacing approved plan content', () => {
  const current = normalizeClientStrategyPlanContent('career-clarity', {
    kind: 'career_clarity_development_plan',
    openingDiagnostic: 'The client needs a clearer way to compare active opportunities.',
    permissionLine: 'This plan is a tool, not a scorecard. If you miss a week, returning to the plan still counts as progress.',
    focusStatement: 'Choose a sustainable next role.',
    outcome: 'The client can assess opportunities against clear criteria.',
    planHorizonDays: 30,
    milestones: {
      day30: ['Write the role scorecard.', 'Use the scorecard on active interviews.'],
    },
    minimumViableCommitment: 'Review one opportunity against the scorecard every week.',
    checkpointCondition: 'Review progress during the Day 14 Microsoft Teams follow-up.',
    days1To3: { focus: 'Define the criteria', actions: ['Write the role scorecard.'] },
    days4To7: { focus: 'Align the evidence', actions: ['Match CV evidence to the criteria.'] },
    days8To14: { focus: 'Test the direction', actions: ['Use the scorecard in active interviews.'] },
    checkInQuestions: ['Which criterion changed a decision?'],
    coachFollowUp: ['Review the CV positioning.'],
  }, { requireCareerDevelopmentFields: true });

  const extended = mergeClientStrategyPlanHorizonExtension(
    'career-clarity',
    current,
    60,
    {
      milestones: {
        day60: [
          'Compare interview feedback against the role scorecard.',
          'Refine the CV positioning using verified feedback.',
        ],
      },
      weeklyRhythm: extensionWeeks(3, 8),
    },
  );

  assert.equal(extended.planHorizonDays, 60);
  assert.deepEqual(extended.milestones.day30, current.milestones.day30);
  assert.deepEqual(extended.milestones.day60, [
    'Compare interview feedback against the role scorecard.',
    'Refine the CV positioning using verified feedback.',
  ]);
  assert.deepEqual(extended.days1To3, current.days1To3);
  assert.equal(extended.focusStatement, current.focusStatement);
});

test('extends directly from 30 to 90 days by requiring both missing milestone groups', () => {
  const current = buildClientStrategyPlanShell('glow-up-vip');

  assert.throws(
    () => mergeClientStrategyPlanHorizonExtension(
      'glow-up-vip',
      current,
      90,
      { milestones: { day90: ['Review the positioning.', 'Choose the next focus.'] } },
    ),
    /Day 60 milestones/i,
  );

  const extended = mergeClientStrategyPlanHorizonExtension(
    'glow-up-vip',
    current,
    90,
    {
      milestones: {
        day60: ['Test the new positioning in live applications.', 'Refine the LinkedIn evidence.'],
        day90: ['Review the evidence from the search.', 'Choose the next development focus.'],
      },
    },
  );

  assert.equal(extended.planHorizonDays, 90);
  assert.deepEqual(extended.milestones.day30, current.milestones.day30);
  assert.equal(extended.milestones.day60?.length, 2);
  assert.equal(extended.milestones.day90?.length, 2);
});

test('a Career Clarity 30 to 90 jump keeps Day 60 and fills every intervening week', () => {
  const current = normalizeClientStrategyPlanContent('career-clarity', {
    ...buildClientStrategyPlanShell('career-clarity'),
    planHorizonDays: 30,
    milestones: { day30: ['Write the role scorecard.', 'Use it on live roles.'] },
    weeklyRhythm: [
      { weekNumber: 3, theme: 'Week 3 focus', actions: ['Run the evidence loop.'] },
      { weekNumber: 4, theme: 'Week 4 focus', actions: ['Run the evidence loop.'] },
    ],
  }, { requireCareerDevelopmentFields: true });

  const weeklyRhythm = [];
  for (let week = 5; week <= 13; week += 1) {
    weeklyRhythm.push({ weekNumber: week, theme: `Week ${week} focus`, actions: [`Run the loop in week ${week}.`] });
  }

  const extended = mergeClientStrategyPlanHorizonExtension('career-clarity', current, 90, {
    milestones: {
      day60: ['Compare feedback against the scorecard.', 'Refine the CV positioning.'],
      day90: ['Make the stay-or-go call.', 'Agree the next step.'],
    },
    weeklyRhythm,
  });

  assert.equal(extended.planHorizonDays, 90);
  assert.equal(extended.milestones.day60?.length, 2);
  assert.equal(extended.milestones.day90?.length, 2);
  assert.deepEqual(
    extended.weeklyRhythm.map((week) => week.weekNumber),
    [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  );

  // A reply that jumps straight to the Day 90 weeks has to be rejected, not silently accepted
  // with a gap where the 60-day stretch should be.
  assert.throws(
    () => mergeClientStrategyPlanHorizonExtension('career-clarity', current, 90, {
      milestones: {
        day60: ['Compare feedback against the scorecard.', 'Refine the CV positioning.'],
        day90: ['Make the stay-or-go call.', 'Agree the next step.'],
      },
      weeklyRhythm: weeklyRhythm.filter((week) => week.weekNumber >= 9),
    }),
    /missing Week 5/i,
  );
});

test('extending a 60-day plan to 90 days preserves the existing Day 60 milestones', () => {
  const current = {
    ...buildClientStrategyPlanShell('career-clarity'),
    planHorizonDays: 60,
    milestones: {
      day30: ['Complete the first action.', 'Complete the second action.'],
      day60: ['Keep this Day 60 action.', 'Keep this second Day 60 action.'],
    },
  };

  const extended = mergeClientStrategyPlanHorizonExtension(
    'career-clarity',
    current,
    90,
    {
      milestones: {
        day60: ['Do not replace this.', 'Do not replace this either.'],
        day90: ['Review the longer-term evidence.', 'Choose the next development priority.'],
      },
      weeklyRhythm: extensionWeeks(3, 13),
    },
  );

  assert.deepEqual(extended.milestones.day60, current.milestones.day60);
  assert.deepEqual(extended.milestones.day90, [
    'Review the longer-term evidence.',
    'Choose the next development priority.',
  ]);
});

test('horizon extension prompts request only missing milestones and preserve the current plan', () => {
  const systemPrompt = buildClientStrategyPlanHorizonExtensionSystemPrompt(
    'career-clarity',
    30,
    90,
    { gaps: { milestoneDays: [60, 90], weekRange: null } },
  );
  const userPrompt = buildClientStrategyPlanHorizonExtensionUserPrompt({
    serviceSlug: 'career-clarity',
    targetHorizon: 90,
    currentPlan: buildClientStrategyPlanShell('career-clarity'),
    intake: { targetRole: 'Operations Manager' },
    debrief: {
      clarityShift: 'The client wants a role with clearer ownership.',
      commitments: 'Use a role scorecard.',
      sensitivityNotes: '',
      interviewStoryEvidence: '',
    },
    cvText: '',
    cvAnalysis: null,
  });

  assert.match(systemPrompt, /Day 60 and Day 90 milestones only/i);
  assert.match(systemPrompt, /Do not rewrite/i);
  assert.match(userPrompt, /current_editable_draft_plan/i);
  assert.match(userPrompt, /target_horizon_days>90/i);
});

function mergeCareerClarityDevelopmentPlan(current, overrides = {}, finalWeek = 4) {
  return mergeClientStrategyPlanSection('career-clarity', current, 'development_plan', {
    planHorizonDays: 30,
    milestones: { day30: ['Use the role scorecard on each opportunity.', 'Align the CV summary.'] },
    minimumViableCommitment: 'Review one opportunity against the role scorecard each week.',
    checkpointCondition: 'Review the criteria at the Day 14 Microsoft Teams follow-up.',
    days1To3: { focus: 'Define the criteria', actions: ['Write the role scorecard.'] },
    days4To7: { focus: 'Align the evidence', actions: ['Match CV evidence to the direction.'] },
    days8To14: { focus: 'Test the direction', actions: ['Use the scorecard on live opportunities.'] },
    checkInQuestions: ['Which criterion changed a decision?'],
    coachFollowUp: ['Review the CV summary and role scorecard.'],
    ...careerClarityDecisionSupport(finalWeek),
    ...overrides,
  });
}

test('the week boundary matches each supported horizon', () => {
  assert.equal(getClientStrategyPlanFinalWeek(30), 4);
  assert.equal(getClientStrategyPlanFinalWeek(60), 8);
  assert.equal(getClientStrategyPlanFinalWeek(90), 13);
});

test('a Career Clarity development plan carries decision support through the merge', () => {
  const merged = mergeCareerClarityDevelopmentPlan(buildClientStrategyPlanShell('career-clarity'));

  assert.equal(merged.decisionFramework.criteria.length, 3);
  assert.match(merged.decisionFramework.decisionStatement, /stay in the current role/i);
  assert.equal(merged.positioning.achievementPrompts.length, 3);
  assert.equal(merged.marketSignalRitual.steps.length, 2);
  assert.equal(merged.progressSignals.length, 3);
  assert.deepEqual(merged.weeklyRhythm.map((week) => week.weekNumber), [3, 4]);
});

test('a Career Clarity development plan is rejected when decision support is missing', () => {
  const shell = buildClientStrategyPlanShell('career-clarity');
  const cases = [
    ['decisionFramework', /Decision framework is required/i],
    ['positioning', /Positioning is required/i],
    ['marketSignalRitual', /Market signal ritual is required/i],
  ];

  for (const [field, expected] of cases) {
    assert.throws(() => mergeCareerClarityDevelopmentPlan(shell, { [field]: undefined }), expected, `${field} must be required`);
  }
  assert.throws(
    () => mergeCareerClarityDevelopmentPlan(shell, { weeklyRhythm: [] }),
    /Weekly rhythm requires one entry/i,
  );
});

test('the weekly rhythm must cover every week to the end of the horizon', () => {
  // The horizon now comes from the saved plan rather than the model reply, so the base plan is
  // what makes this a 60-day case.
  const sixtyDay = normalizeClientStrategyPlanContent('career-clarity', {
    ...buildClientStrategyPlanShell('career-clarity'),
    planHorizonDays: 60,
    milestones: {
      day30: ['Use the scorecard.', 'Align the CV summary.'],
      day60: ['Compare two directions.', 'Decide the priority.'],
    },
  }, { requireCareerDevelopmentFields: true });

  const sixtyDayMilestones = {
    day30: ['Use the scorecard.', 'Align the CV summary.'],
    day60: ['Compare two directions.', 'Decide the priority.'],
  };

  assert.throws(
    () => mergeCareerClarityDevelopmentPlan(sixtyDay, { milestones: sixtyDayMilestones }, 4),
    /missing Week 5/i,
    'a 60-day plan that stops at Week 4 must be rejected',
  );

  const merged = mergeCareerClarityDevelopmentPlan(sixtyDay, { milestones: sixtyDayMilestones }, 8);
  assert.equal(merged.planHorizonDays, 60);
  assert.deepEqual(merged.weeklyRhythm.map((week) => week.weekNumber), [3, 4, 5, 6, 7, 8]);
});

test('duplicate weeks are rejected and out-of-order weeks are sorted', () => {
  const shell = buildClientStrategyPlanShell('career-clarity');

  assert.throws(
    () => mergeCareerClarityDevelopmentPlan(shell, {
      weeklyRhythm: [
        { weekNumber: 3, theme: 'First', actions: ['Do the first thing.'] },
        { weekNumber: 3, theme: 'Again', actions: ['Do it again.'] },
      ],
    }),
    /more than one entry for Week 3/i,
  );

  const merged = mergeCareerClarityDevelopmentPlan(shell, {
    weeklyRhythm: [
      { weekNumber: 4, theme: 'Second', actions: ['Do the second thing.'] },
      { weekNumber: 3, theme: 'First', actions: ['Do the first thing.'] },
    ],
  });
  assert.deepEqual(merged.weeklyRhythm.map((week) => week.weekNumber), [3, 4]);
});

test('a plan saved before v7 still loads and stays editable', () => {
  // Legacy rows have none of the decision-support fields. They must not fail to load, and
  // saving an edit must not demand fields the plan never had.
  const legacy = normalizeClientStrategyPlanContent('career-clarity', {
    kind: 'career_clarity_development_plan',
    openingDiagnostic: 'A grounded read of where the client stands today.',
    permissionLine: 'This plan is a tool, not a scorecard. If you miss a week, returning to the plan still counts as progress.',
    focusStatement: 'Build a clear direction, then test it deliberately.',
    outcome: 'The client can assess opportunities against grounded criteria.',
    planHorizonDays: 30,
    milestones: { day30: ['Use the scorecard.', 'Align the CV summary.'] },
    minimumViableCommitment: 'Review one opportunity each week.',
    checkpointCondition: 'Review at the Day 14 follow-up.',
    days1To3: { focus: 'Define', actions: ['Write the scorecard.'] },
    days4To7: { focus: 'Align', actions: ['Match the evidence.'] },
    days8To14: { focus: 'Test', actions: ['Use the scorecard.'] },
    checkInQuestions: ['Which criterion changed a decision?'],
    coachFollowUp: ['Review the CV summary.'],
  });

  assert.equal(legacy.decisionFramework, null);
  assert.equal(legacy.positioning, null);
  assert.equal(legacy.marketSignalRitual, null);
  assert.deepEqual(legacy.weeklyRhythm, []);
  assert.deepEqual(legacy.progressSignals, []);

  // Re-normalizing a legacy plan the way a manual save does must not throw.
  assert.doesNotThrow(() => normalizeClientStrategyPlanContent('career-clarity', legacy, {
    requireCareerDevelopmentFields: true,
  }));
});

test('extending a horizon brings the weekly rhythm with it', () => {
  const base = mergeCareerClarityDevelopmentPlan(buildClientStrategyPlanShell('career-clarity'));

  const extended = mergeClientStrategyPlanHorizonExtension('career-clarity', base, 60, {
    milestones: { day60: ['Compare the two directions.', 'Decide the priority.'] },
    weeklyRhythm: [5, 6, 7, 8].map((weekNumber) => ({
      weekNumber,
      theme: `Week ${weekNumber} focus`,
      actions: [`Continue the loop in week ${weekNumber}.`],
    })),
  });

  assert.equal(extended.planHorizonDays, 60);
  assert.deepEqual(extended.weeklyRhythm.map((week) => week.weekNumber), [3, 4, 5, 6, 7, 8]);
  assert.deepEqual(extended.decisionFramework, base.decisionFramework, 'the extension must not rewrite the decision framework');

  assert.throws(
    () => mergeClientStrategyPlanHorizonExtension('career-clarity', base, 60, {
      milestones: { day60: ['Compare the two directions.', 'Decide the priority.'] },
      weeklyRhythm: [{ weekNumber: 5, theme: 'Only one week', actions: ['Do one thing.'] }],
    }),
    /missing Week 6/i,
  );
});

test('a legacy plan with no rhythm at all gets one when it is extended', () => {
  const legacy = normalizeClientStrategyPlanContent('career-clarity', {
    ...buildClientStrategyPlanShell('career-clarity'),
    openingDiagnostic: 'A grounded read of where the client stands today.',
    focusStatement: 'Build a clear direction.',
    outcome: 'Assess opportunities against grounded criteria.',
    milestones: { day30: ['Use the scorecard.', 'Align the CV summary.'] },
  });

  // A plan that never had a rhythm used to be extended without one, which shipped a 60-day plan
  // to a client with every week from Week 3 blank. The whole span now counts as a gap.
  const gaps = getClientStrategyPlanExtensionGaps(legacy, 60);
  assert.deepEqual(gaps.weekRange, { from: 3, to: 8 });

  assert.throws(
    () => mergeClientStrategyPlanHorizonExtension('career-clarity', legacy, 60, {
      milestones: { day60: ['Compare the two directions.', 'Decide the priority.'] },
    }),
    /Week 3 to Week 8/i,
    'an extension that returns no weeks must be refused',
  );

  const extended = mergeClientStrategyPlanHorizonExtension('career-clarity', legacy, 60, {
    milestones: { day60: ['Compare the two directions.', 'Decide the priority.'] },
    weeklyRhythm: extensionWeeks(3, 8),
  });

  assert.equal(extended.planHorizonDays, 60);
  assert.deepEqual(extended.weeklyRhythm.map((week) => week.weekNumber), [3, 4, 5, 6, 7, 8]);
  assert.equal(hasClientStrategyPlanExtensionGaps(getClientStrategyPlanExtensionGaps(extended, 60)), false);
});

test('the Career Clarity development prompt asks for decision support, the Glow Up one does not', () => {
  const clarity = buildClientStrategyPlanSectionSystemPrompt('career-clarity', 'development_plan');
  const glowUp = buildClientStrategyPlanSectionSystemPrompt('glow-up-vip', 'development_plan');

  assert.match(clarity, /decisionFramework/);
  assert.match(clarity, /stayThreshold/);
  assert.match(clarity, /currentRecruiterRead/);
  assert.match(clarity, /weeklyRhythm/);
  assert.match(clarity, /marketSignalRitual/);
  assert.match(clarity, /Week 3 to Week 4, which is the final week of this 30 day plan/i);
  assert.match(clarity, /Do not decide for the client/i);
  assert.match(clarity, /Do not set application quotas/i);

  assert.doesNotMatch(glowUp, /decisionFramework/);
  assert.doesNotMatch(glowUp, /weeklyRhythm/);
});

test('the horizon extension prompt requests new weeks only when the plan has a rhythm', () => {
  const withRhythm = buildClientStrategyPlanHorizonExtensionSystemPrompt('career-clarity', 30, 60, {
    gaps: { milestoneDays: [60], weekRange: { from: 5, to: 8 } },
  });
  assert.match(withRhythm, /Week 5 to Week 8/);
  assert.match(withRhythm, /weeklyRhythm/);
  assert.match(withRhythm, /Do not rewrite[^\n]*decision framework/i);

  const withoutRhythm = buildClientStrategyPlanHorizonExtensionSystemPrompt('career-clarity', 30, 60, {
    gaps: { milestoneDays: [60], weekRange: null },
  });
  assert.doesNotMatch(withoutRhythm, /weeklyRhythm/);

  // A horizon whose milestones are already written asks for the weeks alone.
  const weeksOnly = buildClientStrategyPlanHorizonExtensionSystemPrompt('career-clarity', 60, 90, {
    gaps: { milestoneDays: [], weekRange: { from: 9, to: 13 } },
  });
  assert.match(weeksOnly, /Week 9 to Week 13/);
  assert.doesNotMatch(weeksOnly, /"milestones"/);

  assert.throws(
    () => buildClientStrategyPlanHorizonExtensionSystemPrompt('career-clarity', 90, 90, {
      gaps: { milestoneDays: [], weekRange: null },
    }),
    /already covers everything/i,
  );
});

function ninetyDayCareerClarityPlan() {
  const weeklyRhythm = [];
  for (let week = 3; week <= 13; week += 1) {
    weeklyRhythm.push({ weekNumber: week, theme: `Week ${week}`, actions: [`Run week ${week}.`] });
  }
  return normalizeClientStrategyPlanContent('career-clarity', {
    ...buildClientStrategyPlanShell('career-clarity'),
    planHorizonDays: 90,
    milestones: {
      day30: ['Use the scorecard.', 'Align the CV.'],
      day60: ['Compare directions.', 'Rewrite the summary.'],
      day90: ['Make the call.', 'Agree the next step.'],
    },
    weeklyRhythm,
  }, { requireCareerDevelopmentFields: true });
}

function careerClaritySectionReply(overrides = {}) {
  return {
    milestones: { day30: ['Fresh A.', 'Fresh B.'] },
    minimumViableCommitment: 'Do one small thing each week.',
    checkpointCondition: 'Review at the Day 14 follow-up.',
    days1To3: { focus: 'Define', actions: ['Write the scorecard.'] },
    days4To7: { focus: 'Align', actions: ['Match the evidence.'] },
    days8To14: { focus: 'Test', actions: ['Use it live.'] },
    checkInQuestions: ['What changed?'],
    coachFollowUp: ['Review the CV.'],
    decisionFramework: {
      decisionStatement: 'Stay or move by the end of the plan.',
      criteria: [1, 2, 3].map((n) => ({
        criterion: `Criterion ${n}.`,
        currentRoleEvidence: `Test it internally ${n}.`,
        marketEvidence: `Test it externally ${n}.`,
      })),
      stayThreshold: 'Staying works if scope widens.',
      decisionCheckpoint: 'Decide at the follow-up.',
    },
    positioning: {
      currentRecruiterRead: 'Capable but vague.',
      targetRecruiterRead: 'Owns decisions.',
      positioningStatement: 'I lead [Confirm: the area].',
      achievementPrompts: ['What did you decide?', 'What changed?', 'What would have broken?'],
    },
    weeklyRhythm: [
      { weekNumber: 3, theme: 'W3', actions: ['Run it.'] },
      { weekNumber: 4, theme: 'W4', actions: ['Run it.'] },
    ],
    marketSignalRitual: {
      cadence: 'Once a week',
      steps: ['Read a spec.', 'Mark the gap.'],
      reflectionPrompt: 'Which gap repeated?',
    },
    progressSignals: ['Clearer language.', 'Faster decisions.', 'Fewer surprises.'],
    ...overrides,
  };
}

test('a regenerated section cannot shorten the horizon the coach chose', () => {
  const plan = ninetyDayCareerClarityPlan();

  // A model reply shaped for 30 days must be refused outright. Accepting it silently dropped
  // Weeks 5 to 13 and the Day 60 and Day 90 milestones from an approved 90-day plan.
  assert.throws(
    () => mergeClientStrategyPlanSection('career-clarity', plan, 'development_plan', careerClaritySectionReply()),
    /Day 60 milestones/i,
  );

  // Milestones present but the rhythm still short: the missing weeks must be named.
  assert.throws(
    () => mergeClientStrategyPlanSection('career-clarity', plan, 'development_plan', careerClaritySectionReply({
      milestones: { day30: ['A.', 'B.'], day60: ['C.', 'D.'], day90: ['E.', 'F.'] },
    })),
    /missing Week 5/i,
  );
});

test('a regenerated section refreshes every week without losing the horizon', () => {
  const plan = ninetyDayCareerClarityPlan();
  const weeklyRhythm = [];
  for (let week = 3; week <= 13; week += 1) {
    weeklyRhythm.push({ weekNumber: week, theme: `Fresh week ${week}`, actions: [`New action ${week}.`] });
  }

  const regenerated = mergeClientStrategyPlanSection('career-clarity', plan, 'development_plan', careerClaritySectionReply({
    milestones: { day30: ['A.', 'B.'], day60: ['C.', 'D.'], day90: ['E.', 'F.'] },
    weeklyRhythm,
  }));

  assert.equal(regenerated.planHorizonDays, 90);
  assert.deepEqual(
    regenerated.weeklyRhythm.map((week) => week.weekNumber),
    [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  );
  assert.equal(regenerated.weeklyRhythm[0].theme, 'Fresh week 3');
  assert.deepEqual(regenerated.milestones.day90, ['E.', 'F.']);
});

test('regenerating a section rebuilds the plan at its existing horizon, not back at 30 days', () => {
  const thirtyDay = buildClientStrategyPlanSectionSystemPrompt('career-clarity', 'development_plan');
  assert.match(thirtyDay, /"planHorizonDays": 30/);
  assert.match(thirtyDay, /Week 3 to Week 4/);
  assert.doesNotMatch(thirtyDay, /"day60"/);
  assert.doesNotMatch(thirtyDay, /"day90"/);

  const ninetyDay = buildClientStrategyPlanSectionSystemPrompt('career-clarity', 'development_plan', {
    planHorizonDays: 90,
  });
  assert.match(ninetyDay, /"planHorizonDays": 90/);
  assert.match(ninetyDay, /Week 3 to Week 13, which is the final week of this 90 day plan/i);
  assert.match(ninetyDay, /"day60"/);
  assert.match(ninetyDay, /"day90"/);

  const sixtyDay = buildClientStrategyPlanSectionSystemPrompt('career-clarity', 'development_plan', {
    planHorizonDays: 60,
  });
  assert.match(sixtyDay, /"planHorizonDays": 60/);
  assert.match(sixtyDay, /"day60"/);
  assert.doesNotMatch(sixtyDay, /"day90"/);
});

test('a placeheld Day 60 can be rewritten by AI at the same horizon', () => {
  const placeheld = normalizeClientStrategyPlanContent('career-clarity', {
    ...buildClientStrategyPlanShell('career-clarity'),
    planHorizonDays: 60,
    milestones: {
      day30: ['Write the role scorecard.', 'Use it on live roles.'],
      // Exactly what the manual horizon selector inserts.
      day60: ['[Confirm: first Day 60 action]', '[Confirm: second Day 60 action]'],
    },
  }, { requireCareerDevelopmentFields: true });

  const gaps = getClientStrategyPlanExtensionGaps(placeheld, 60);
  assert.deepEqual(gaps.milestoneDays, [60]);
  assert.equal(hasClientStrategyPlanExtensionGaps(gaps), true);

  const filled = mergeClientStrategyPlanHorizonExtension('career-clarity', placeheld, 60, {
    milestones: { day60: ['Compare both directions.', 'Rewrite the CV summary.'] },
    weeklyRhythm: extensionWeeks(3, 8),
  });
  assert.equal(filled.planHorizonDays, 60);
  assert.deepEqual(filled.milestones.day60, ['Compare both directions.', 'Rewrite the CV summary.']);

  // Once written, the same horizon has nothing left to generate.
  assert.equal(
    hasClientStrategyPlanExtensionGaps(getClientStrategyPlanExtensionGaps(filled, 60)),
    false,
  );
  assert.throws(
    () => mergeClientStrategyPlanHorizonExtension('career-clarity', filled, 60, {}),
    /already covers everything/i,
  );
});

test('weeks group under the milestone each stretch is working toward', () => {
  const weeks = [];
  for (let weekNumber = 3; weekNumber <= 13; weekNumber += 1) {
    weeks.push({ weekNumber, theme: `Week ${weekNumber}`, actions: [`Run week ${weekNumber}.`] });
  }

  assert.deepEqual(
    groupClientStrategyPlanWeeks(weeks, 90).map((block) => [block.milestoneDay, block.fromWeek, block.toWeek]),
    [[30, 3, 4], [60, 5, 8], [90, 9, 13]],
  );

  // A shorter horizon only opens the blocks it reaches.
  assert.deepEqual(
    groupClientStrategyPlanWeeks(weeks.slice(0, 6), 60).map((block) => block.milestoneDay),
    [30, 60],
  );
  assert.deepEqual(groupClientStrategyPlanWeeks(weeks.slice(0, 2), 30).map((block) => block.milestoneDay), [30]);

  // Every week must survive grouping: losing written content is worse than an odd label.
  const grouped = groupClientStrategyPlanWeeks(weeks, 90).flatMap((block) => block.weeks.map((week) => week.weekNumber));
  assert.deepEqual(grouped, weeks.map((week) => week.weekNumber));

  assert.deepEqual(groupClientStrategyPlanWeeks([], 90), []);
});

test('weeks stranded past a shortened horizon are kept, not dropped', () => {
  const weeks = [3, 4, 5, 6].map((weekNumber) => ({
    weekNumber,
    theme: `Week ${weekNumber}`,
    actions: [`Run week ${weekNumber}.`],
  }));

  const blocks = groupClientStrategyPlanWeeks(weeks, 30);
  const kept = blocks.flatMap((block) => block.weeks.map((week) => week.weekNumber));
  assert.deepEqual(kept, [3, 4, 5, 6], 'weeks past the horizon must still appear somewhere');
});
