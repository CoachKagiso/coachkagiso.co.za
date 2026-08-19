import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import ts from 'typescript';
import {
  buildClientStrategyPlanShell,
  mergeClientStrategyPlanSection,
  normalizeClientStrategyPlanContent,
} from '../lib/client-strategy-plan.ts';

async function compileModule(t, sourcePath, replacements) {
  let source = await readFile(sourcePath, 'utf8');
  for (const [search, replacement] of replacements) source = source.replaceAll(search, replacement);
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText
    .replaceAll('"react/jsx-runtime"', JSON.stringify(import.meta.resolve('react/jsx-runtime')));
  const directory = await mkdtemp(path.join(tmpdir(), 'plan-export-'));
  const modulePath = path.join(directory, `${path.basename(sourcePath).replace(/\.[^.]+$/, '')}.mjs`);
  await writeFile(modulePath, compiled, 'utf8');
  t.after(() => rm(directory, { recursive: true, force: true }));
  return import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
}

function buildNinetyDayPlan() {
  const withSummary = mergeClientStrategyPlanSection(
    'career-clarity',
    buildClientStrategyPlanShell('career-clarity'),
    'session_summary',
    {
      sessionSummary: {
        sessionDate: '[Confirm: session date]',
        purpose: 'Decide whether to stay in the current role or pursue new opportunities.',
        whereThingsStood: 'The client was weighing an active search against staying, with no way to compare the two.',
        themesExplored: ['Decision criteria', 'How the CV reads to recruiters'],
        clarityGained: ['Decision scope and sustainable workload are the criteria that actually matter.'],
        agreedOutcome: 'Build a scorecard and test it against the current role and the market.',
        clientCommitments: ['Write the role scorecard.'],
        coachCommitments: ['Review the CV positioning.'],
        openPoints: ['[Confirm: follow-up date]'],
      },
    },
  );

  const weeklyRhythm = [];
  for (let weekNumber = 3; weekNumber <= 13; weekNumber += 1) {
    weeklyRhythm.push({
      weekNumber,
      theme: `Week ${weekNumber} focus`,
      actions: [`Run the evidence loop and record what changed in week ${weekNumber}.`],
    });
  }

  // The horizon belongs to the plan, not to the model reply, so the base plan is widened to 90
  // days before the section is generated into it.
  const ninetyDayBase = normalizeClientStrategyPlanContent('career-clarity', {
    ...withSummary,
    planHorizonDays: 90,
    milestones: {
      day30: ['Use the role scorecard on every live opportunity.', 'Align the CV summary with the direction.'],
      day60: ['Compare both directions against the scorecard.', 'Rewrite the CV summary using confirmed evidence.'],
      day90: ['Make the stay-or-go call against the criteria.', 'Agree the next step with Kagiso.'],
    },
  });

  const content = mergeClientStrategyPlanSection('career-clarity', ninetyDayBase, 'development_plan', {
    milestones: {
      day30: ['Use the role scorecard on every live opportunity.', 'Align the CV summary with the direction.'],
      day60: ['Compare both directions against the scorecard.', 'Rewrite the CV summary using confirmed evidence.'],
      day90: ['Make the stay-or-go call against the criteria.', 'Agree the next step with Kagiso.'],
    },
    minimumViableCommitment: 'Review one opportunity against the role scorecard each week.',
    checkpointCondition: 'Review the criteria at the Day 14 Microsoft Teams follow-up.',
    days1To3: { focus: 'Define the criteria', actions: ['Write the role scorecard.'] },
    days4To7: { focus: 'Align the evidence', actions: ['Match CV evidence to the target direction.'] },
    days8To14: { focus: 'Test the direction', actions: ['Use the scorecard on live opportunities.'] },
    checkInQuestions: ['Which criterion changed a decision this week?'],
    coachFollowUp: ['Review the CV summary and the role scorecard.'],
    decisionFramework: {
      decisionStatement: 'Decide whether to stay in the current role or pursue new opportunities by the end of the plan.',
      criteria: [
        {
          criterion: 'The role gives real decision-making scope.',
          currentRoleEvidence: 'Ask to own one decision outright this month and note what happens.',
          marketEvidence: 'Ask each interviewer which decisions the role owns without escalation.',
        },
        {
          criterion: 'The workload is sustainable.',
          currentRoleEvidence: 'Track how many evenings the week actually takes.',
          marketEvidence: 'Ask how the team handles peak periods and who covers them.',
        },
        {
          criterion: 'The work uses her strongest evidence.',
          currentRoleEvidence: 'Note which tasks draw on the evidence she wants to be known for.',
          marketEvidence: 'Compare each job specification against the role scorecard.',
        },
      ],
      stayThreshold: 'Staying is right if the decision scope widens and the workload settles within the plan.',
      decisionCheckpoint: 'Review all three criteria at the agreed follow-up and make the call there.',
    },
    positioning: {
      currentRecruiterRead: 'A capable operator whose actual scope is not obvious from the CV.',
      targetRecruiterRead: 'Someone who owns decisions and can show what changed as a result.',
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
        'Write one line on the gap that showed up.',
      ],
      reflectionPrompt: 'Which gap showed up again this week, and what would close it?',
    },
    progressSignals: [
      'You can describe your value without hedging.',
      'The scorecard settles a decision instead of reopening it.',
      'The same gap stops surprising you.',
    ],
  });

  return {
    id: 'plan-render-test',
    workspaceId: 'workspace-render-test',
    paymentId: 'payment-render-test',
    serviceSlug: 'career-clarity',
    durationDays: 14,
    version: 1,
    status: 'approved',
    generatedContent: content,
    editedContent: content,
    sourceSnapshot: { workspaceVersion: 1, intakeId: null, intakeSubmittedAt: null, cv: { included: false, issue: null } },
    generatorProvider: 'test',
    generatorModel: 'test',
    promptVersion: 'test',
    generatedAt: new Date().toISOString(),
    approvedBy: 'Kagiso',
    approvedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const options = {
  format: 'pdf',
  includeSessionSummary: true,
  includeDevelopmentPlan: true,
  includeInterviewPrep: false,
};

test('a 90-day Career Clarity plan renders to valid PDF and DOCX buffers', async (t) => {
  const plan = buildNinetyDayPlan();

  const pdfModule = await compileModule(
    t,
    path.resolve('components/career-tools/ClientStrategyPlanPdf.tsx'),
    [
      ["'@react-pdf/renderer'", JSON.stringify(import.meta.resolve('@react-pdf/renderer'))],
      ["'@/lib/client-strategy-plan-export'", JSON.stringify(pathToFileURL(path.resolve('lib/client-strategy-plan-export.ts')).href)],
    ],
  );
  const docxModule = await compileModule(
    t,
    path.resolve('lib/client-strategy-plan-docx.ts'),
    [
      ["'docx'", JSON.stringify(import.meta.resolve('docx'))],
      ["'./client-strategy-plan-export'", JSON.stringify(pathToFileURL(path.resolve('lib/client-strategy-plan-export.ts')).href)],
      ["'@/lib/client-strategy-plan-export'", JSON.stringify(pathToFileURL(path.resolve('lib/client-strategy-plan-export.ts')).href)],
    ],
  );

  const pdfBuffer = await renderToBuffer(createElement(pdfModule.default, {
    plan,
    clientName: 'Test Client',
    options,
  }));
  const docxBuffer = await docxModule.buildClientStrategyPlanDocx({
    plan,
    clientName: 'Test Client',
    options: { ...options, format: 'docx' },
  });

  assert.equal(pdfBuffer.subarray(0, 4).toString(), '%PDF');
  assert.ok(pdfBuffer.length > 5000, 'the PDF should carry real content, not just a cover page');
  assert.equal(docxBuffer.subarray(0, 2).toString(), 'PK');
  assert.ok(docxBuffer.length > 5000);

  if (process.env.PLAN_EXPORT_QA_DIR) {
    await mkdir(process.env.PLAN_EXPORT_QA_DIR, { recursive: true });
    await writeFile(path.join(process.env.PLAN_EXPORT_QA_DIR, 'career-clarity-90-day.pdf'), pdfBuffer);
    await writeFile(path.join(process.env.PLAN_EXPORT_QA_DIR, 'career-clarity-90-day.docx'), docxBuffer);
  }
});
