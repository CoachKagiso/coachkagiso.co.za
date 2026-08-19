import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildClientStrategyPlanShell } from '../lib/client-strategy-plan.ts';
import {
  DEFAULT_CLIENT_STRATEGY_PLAN_EXPORT_OPTIONS,
  buildClientStrategyPlanExportSections,
  clientStrategyPlanExportFileName,
  getClientStrategyPlanExportAvailability,
  resolveClientStrategyPlanExportOptions,
  validateClientStrategyPlanExport,
} from '../lib/client-strategy-plan-export.ts';

function samplePlan(serviceSlug = 'career-clarity') {
  const content = buildClientStrategyPlanShell(serviceSlug);
  content.sectionStatus.sessionSummary = 'generated';
  content.sectionStatus.developmentPlan = 'generated';
  content.sessionSummary.purpose = 'Clarify the next career move.';
  content.milestones.day30 = ['Complete the role scorecard.'];
  return {
    id: 'plan-1',
    workspaceId: 'workspace-1',
    paymentId: 'payment-1',
    serviceSlug,
    durationDays: serviceSlug === 'glow-up-vip' ? 30 : 14,
    version: 3,
    status: 'draft',
    generatedContent: content,
    editedContent: content,
    sourceSnapshot: { workspaceVersion: 1, intakeId: null, intakeSubmittedAt: null, cv: { included: false, issue: null } },
    generatorProvider: 'test',
    generatorModel: 'test',
    promptVersion: 'test',
    generatedAt: new Date().toISOString(),
    approvedBy: null,
    approvedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

test('builds selected session and development sections from saved edited content', () => {
  const plan = samplePlan();
  const options = {
    format: 'pdf',
    includeSessionSummary: true,
    includeDevelopmentPlan: true,
    includeInterviewPrep: false,
  };
  validateClientStrategyPlanExport(plan.editedContent, options);
  const sections = buildClientStrategyPlanExportSections(plan, options);
  assert.deepEqual(sections.map((section) => section.title), [
    'Session Summary & Agreements',
    'Career Development Plan · 30 days',
  ]);
  assert.match(JSON.stringify(sections), /Complete the role scorecard/);
});

test('uses safe client-pack filenames', () => {
  assert.equal(
    clientStrategyPlanExportFileName({
      clientName: 'Lerato M.',
      serviceSlug: 'career-clarity',
      version: 3,
      extension: 'docx',
    }),
    'lerato-m-career-clarity-client-pack-v3.docx',
  );
});

test('a Career Clarity plan reports interview prep as unavailable', () => {
  const availability = getClientStrategyPlanExportAvailability(samplePlan().editedContent);
  assert.deepEqual(availability, {
    includeSessionSummary: true,
    includeDevelopmentPlan: true,
    includeInterviewPrep: false,
  });
});

test('the default options do not ask a Career Clarity plan for interview prep', () => {
  // The picker shows interview prep unchecked for these plans, so the request must match it.
  // Sending it anyway is what made the whole export fail with a Glow Up VIP error.
  const content = samplePlan().editedContent;
  assert.equal(DEFAULT_CLIENT_STRATEGY_PLAN_EXPORT_OPTIONS.includeInterviewPrep, true);

  const resolved = resolveClientStrategyPlanExportOptions(
    content,
    DEFAULT_CLIENT_STRATEGY_PLAN_EXPORT_OPTIONS,
  );

  assert.equal(resolved.includeInterviewPrep, false);
  assert.equal(resolved.includeSessionSummary, true);
  assert.equal(resolved.includeDevelopmentPlan, true);
  assert.equal(resolved.format, 'pdf');
  assert.doesNotThrow(() => validateClientStrategyPlanExport(content, resolved));
});

test('resolved options clear sections that were never generated', () => {
  const content = samplePlan().editedContent;
  content.sectionStatus.sessionSummary = 'not_generated';

  const resolved = resolveClientStrategyPlanExportOptions(content, {
    format: 'docx',
    includeSessionSummary: true,
    includeDevelopmentPlan: true,
    includeInterviewPrep: true,
  });

  assert.equal(resolved.includeSessionSummary, false);
  assert.equal(resolved.includeDevelopmentPlan, true);
  assert.doesNotThrow(() => validateClientStrategyPlanExport(content, resolved));
});

test('a Glow Up VIP plan keeps interview prep once it is generated', () => {
  const plan = samplePlan('glow-up-vip');
  const content = plan.editedContent;
  content.sectionStatus.interviewPrep = 'generated';
  content.interviewPrep = {
    likelyQuestions: ['Tell me about a time you led a change.'],
    starExample: {
      title: 'Team turnaround',
      situation: 'Situation',
      task: 'Task',
      action: 'Action',
      result: 'Result',
      completionStatus: 'complete',
    },
    storyPrompts: [{ experience: 'Migration project', prompt: 'Shape this into a story.' }],
    researchChecklist: ['Read the annual report.'],
    watchOutFor: { risk: 'Short tenure', handling: 'Name it early.' },
  };

  assert.equal(getClientStrategyPlanExportAvailability(content).includeInterviewPrep, true);
  const resolved = resolveClientStrategyPlanExportOptions(
    content,
    DEFAULT_CLIENT_STRATEGY_PLAN_EXPORT_OPTIONS,
  );
  assert.equal(resolved.includeInterviewPrep, true);
  assert.doesNotThrow(() => validateClientStrategyPlanExport(content, resolved));
});

test('an ungenerated Glow Up VIP interview prep is cleared rather than rejected', () => {
  const content = samplePlan('glow-up-vip').editedContent;
  const resolved = resolveClientStrategyPlanExportOptions(
    content,
    DEFAULT_CLIENT_STRATEGY_PLAN_EXPORT_OPTIONS,
  );
  assert.equal(resolved.includeInterviewPrep, false);
  assert.doesNotThrow(() => validateClientStrategyPlanExport(content, resolved));
});

test('the client pack carries the decision, positioning, weekly, and evidence sections', () => {
  const plan = samplePlan();
  Object.assign(plan.editedContent, {
    decisionFramework: {
      decisionStatement: 'Decide whether to stay in the current role or pursue a new one.',
      criteria: [{
        criterion: 'The role gives real decision-making scope.',
        currentRoleEvidence: 'Ask for one decision to own outright this month.',
        marketEvidence: 'Ask each interviewer what decisions the role owns.',
      }],
      stayThreshold: 'Staying is right if the decision scope widens.',
      decisionCheckpoint: 'Review the criteria at the agreed follow-up.',
    },
    positioning: {
      currentRecruiterRead: 'A capable operator whose scope is not obvious.',
      targetRecruiterRead: 'Someone who owns decisions and shows the outcome.',
      positioningStatement: 'I lead [Confirm: the area] and own [Confirm: the outcome].',
      achievementPrompts: ['What did you decide that nobody else could have decided?'],
    },
    weeklyRhythm: [
      { weekNumber: 3, theme: 'Test the criteria', actions: ['Run the scorecard once.'] },
      { weekNumber: 4, theme: 'Review the evidence', actions: ['Compare both directions.'] },
    ],
    marketSignalRitual: {
      cadence: 'Once a week',
      steps: ['Read one real job specification.'],
      reflectionPrompt: 'Which gap showed up again?',
    },
    progressSignals: ['You can describe your value without hedging.'],
  });

  const sections = buildClientStrategyPlanExportSections(plan, {
    format: 'pdf',
    includeSessionSummary: false,
    includeDevelopmentPlan: true,
    includeInterviewPrep: false,
  });
  const titles = sections.map((section) => section.title);

  assert.ok(titles.some((title) => title.startsWith('Career Development Plan')));
  assert.ok(titles.includes('Making Your Decision'));
  assert.ok(titles.includes('How You Present Your Value'));
  // Weeks are grouped under the milestone they build toward, so a 30-day plan has one block.
  assert.ok(titles.includes('Weeks 3 to 4 · Working Toward Day 30'));
  assert.ok(titles.includes('Your Weekly Evidence Loop'));

  const decision = sections.find((section) => section.title === 'Making Your Decision');
  assert.match(decision.entries[0].body, /stay in the current role/i);
  assert.ok(decision.entries[1].items.some((item) => /current role/i.test(item)));
  assert.ok(decision.entries[1].items.some((item) => /market/i.test(item)));

  const weekly = sections.find((section) => section.title.startsWith('Weeks 3 to 4'));
  assert.equal(weekly.entries.length, 2);
  assert.match(weekly.entries[0].heading, /Week 3 · Test the criteria/);
});

test('a plan saved before v7 exports without empty decision sections', () => {
  const sections = buildClientStrategyPlanExportSections(samplePlan(), {
    format: 'pdf',
    includeSessionSummary: false,
    includeDevelopmentPlan: true,
    includeInterviewPrep: false,
  });
  const titles = sections.map((section) => section.title);

  assert.ok(titles.some((title) => title.startsWith('Career Development Plan')));
  assert.equal(titles.includes('Making Your Decision'), false);
  assert.equal(titles.includes('How You Present Your Value'), false);
  assert.equal(titles.some((title) => /^Weeks \d+ to \d+ · Working Toward/.test(title)), false);
  assert.equal(titles.includes('Your Weekly Evidence Loop'), false);
});

test('Career Tools editors use the shared auto-growing textarea', async () => {
  const component = await readFile(new URL('../components/career-tools/AutoGrowTextarea.tsx', import.meta.url), 'utf8');
  const editor = await readFile(new URL('../components/career-tools/PlanContentEditor.tsx', import.meta.url), 'utf8');
  assert.match(component, /scrollHeight/);
  assert.match(component, /overflowY = 'hidden'/);
  assert.match(editor, /AutoGrowTextarea/);
  assert.doesNotMatch(editor, /resize-y/);
});
