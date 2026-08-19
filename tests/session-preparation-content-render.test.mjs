import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { normalizeClientSessionPreparationContent } from '../lib/client-session-preparation.ts';

async function loadSessionPreparationContent(t) {
  const sourcePath = path.resolve('components/career-tools/SessionPreparationContent.tsx');
  const source = (await readFile(sourcePath, 'utf8'))
    .replace(
      "import SessionPreparationEditor from '@/components/career-tools/SessionPreparationEditor';",
      'const SessionPreparationEditor = () => null;',
    )
    .replace(
      "import SessionPreparationExportDialog from '@/components/career-tools/SessionPreparationExportDialog';",
      'const SessionPreparationExportDialog = () => null;',
    )
    .replace(
      "import SessionPreparationPrintView from '@/components/career-tools/SessionPreparationPrintView';",
      'const SessionPreparationPrintView = () => null;',
    )
    .replace(
      /import \{\s*DEFAULT_SESSION_PREPARATION_EXPORT_OPTIONS,\s*type SessionPreparationExportOptions,\s*\} from '@\/lib\/client-session-preparation-export';/,
      "const DEFAULT_SESSION_PREPARATION_EXPORT_OPTIONS = { layout: 'full', format: 'pdf', includeGuide: true, includeLens: false, includeCues: true };",
    );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText
    .replaceAll('"react/jsx-runtime"', JSON.stringify(import.meta.resolve('react/jsx-runtime')))
    .replaceAll("'react'", JSON.stringify(import.meta.resolve('react')))
    .replaceAll("'lucide-react'", JSON.stringify(import.meta.resolve('lucide-react')));

  const directory = await mkdtemp(path.join(tmpdir(), 'session-prep-render-'));
  const modulePath = path.join(directory, 'SessionPreparationContent.mjs');
  await writeFile(modulePath, compiled, 'utf8');
  t.after(() => rm(directory, { recursive: true, force: true }));
  return (await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`)).default;
}

const timedContent = normalizeClientSessionPreparationContent({
  kind: 'client_session_preparation',
  format: 'timed_v3',
  sessionFocus: 'Choose a direction and protect the immediate interview actions.',
  openingFrame: 'Agree what would make the hour useful before exploring the decision.',
  urgencyNote: 'Interviews are in progress, so protect the positioning and close.',
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
      stage: 'Explore the tension',
      purpose: 'Separate situational frustration from a durable need for change.',
      startMinute: 10,
      endMinute: 22,
      priority: 'trim_first',
      listenFor: ['Whether the urge to move spikes after difficult days.'],
    },
    {
      stage: 'Interview positioning',
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
  priorityQuestions: [
    {
      question: 'What must be different six months from now?',
      whyItMatters: 'Defines the direction in the client own terms.',
      priority: 'must_ask',
    },
    {
      question: 'What is drawing you toward the interviews already in progress?',
      whyItMatters: 'Tests whether the opportunities fit the direction.',
      priority: 'must_ask',
    },
    {
      question: 'What would need to change for staying to feel deliberate?',
      whyItMatters: 'Keeps the current role as an intentional option.',
      priority: 'if_time',
    },
  ],
  closeWith: ['One direction statement.', 'One CV action with an owner and date.'],
  groundedCoachNotes: [
    { source: 'intake', note: 'The client reports interviews already in progress.' },
  ],
  judgmentCalls: ['Positioning may be contributing to recruiter silence. Verify this with the client.'],
}, { serviceSlug: 'career-clarity', requireTimed: true });

const legacyContent = normalizeClientSessionPreparationContent({
  kind: 'client_session_preparation',
  sessionFocus: 'Clarify whether the next move is deliberate or reactive.',
  openingFrame: 'Start with what has changed since the client completed the intake.',
  conversationFlow: [
    { stage: 'Current state', purpose: 'Understand what is driving the decision now.' },
    { stage: 'Explore the tension', purpose: 'Compare staying and moving without forcing a conclusion.' },
    { stage: 'Direction and close', purpose: 'Agree the most useful next action.' },
  ],
  priorityQuestions: [
    { question: 'What has changed?', whyItMatters: 'Updates the original context.' },
    { question: 'What does staying represent?', whyItMatters: 'Clarifies the value of the current role.' },
    { question: 'What does moving represent?', whyItMatters: 'Clarifies the appeal of a new role.' },
    { question: 'What decision is needed next?', whyItMatters: 'Creates a practical close.' },
  ],
  listenFor: [
    'Whether the urge to move spikes after difficult days.',
    'Whether the interviews already lined up share a coherent direction.',
    'Whether carrying the team is becoming a recurring burnout driver.',
  ],
  closeWith: ['One clear next decision.', 'One action with an owner and date.'],
  coachNotes: ['The written context is richer than the scale response.', 'Verify assumptions before naming a cause.'],
});

test('renders timed stages and question priorities from a freshly normalized preparation', async (t) => {
  const SessionPreparationContent = await loadSessionPreparationContent(t);
  const html = renderToStaticMarkup(createElement(SessionPreparationContent, {
    preparation: {
      id: 'render-test-preparation',
      paymentId: 'render-test-payment',
      serviceSlug: 'career-clarity',
      version: 3,
      content: timedContent,
      sourceSnapshot: {
        intake: { intakeId: 'intake-1', submittedAt: '2026-07-29T08:00:00.000Z', included: true },
        cvAnalysis: { reportId: 'report-1', createdAt: '2026-07-29T08:05:00.000Z', included: true },
      },
      generatorProvider: 'test',
      generatorModel: 'test',
      promptVersion: 'client-session-preparation-v4',
      createdAt: '2026-07-29T08:10:00.000Z',
    },
  }));

  assert.match(html, /Career Clarity · 60 min · Microsoft Teams/);
  assert.match(html, />Edit preparation</);
  assert.match(html, />Export</);
  assert.match(html, /Timed conversation flow/);
  assert.match(html, /0-10 min/);
  assert.match(html, /10-22 min/);
  assert.match(html, />Trim first</);
  assert.match(html, />Protect</);
  assert.match(html, /Must-ask questions/);
  assert.equal((html.match(/>Must ask</g) || []).length, 2);
  assert.match(html, /If time · 1 optional question/);
  assert.match(html, /<details[^>]*>[\s\S]*Listen for[\s\S]*Whether urgency comes from a deadline/);
  assert.doesNotMatch(html, /<details[^>]*\sopen(?:=|>)/);
});

test('renders legacy cues as collapsed unmapped general notes without a regeneration prompt', async (t) => {
  const SessionPreparationContent = await loadSessionPreparationContent(t);
  const html = renderToStaticMarkup(createElement(SessionPreparationContent, {
    preparation: {
      id: 'legacy-render-test-preparation',
      paymentId: 'legacy-render-test-payment',
      serviceSlug: 'career-clarity',
      version: 2,
      content: legacyContent,
      sourceSnapshot: {
        intake: { intakeId: 'intake-1', submittedAt: '2026-07-27T08:00:00.000Z', included: true },
        cvAnalysis: { reportId: 'report-1', createdAt: '2026-07-27T08:05:00.000Z', included: true },
      },
      generatorProvider: 'test',
      generatorModel: 'test',
      promptVersion: 'client-session-preparation-v2',
      createdAt: '2026-07-27T08:10:00.000Z',
    },
  }));

  assert.match(html, /Career Clarity · 60 min · Microsoft Teams/);
  assert.match(html, />Legacy prep</);
  assert.match(html, />Conversation flow</);
  assert.doesNotMatch(html, /Timed conversation flow/);
  assert.match(html, /General notes for this session/);
  assert.match(html, /These cues were not mapped to individual stages/);
  assert.match(html, /Whether carrying the team is becoming a recurring burnout driver/);
  assert.doesNotMatch(html, /regenerate/i);
  assert.doesNotMatch(html, /<details[^>]*\sopen(?:=|>)/);
});
