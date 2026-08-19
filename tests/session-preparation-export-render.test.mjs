import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import ts from 'typescript';
import { normalizeClientSessionPreparationContent } from '../lib/client-session-preparation.ts';

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
  const directory = await mkdtemp(path.join(tmpdir(), 'session-prep-export-'));
  const modulePath = path.join(directory, `${path.basename(sourcePath).replace(/\.[^.]+$/, '')}.mjs`);
  await writeFile(modulePath, compiled, 'utf8');
  t.after(() => rm(directory, { recursive: true, force: true }));
  return import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
}

const content = normalizeClientSessionPreparationContent({
  kind: 'client_session_preparation',
  format: 'timed_v3',
  sessionFocus: 'Choose a clear direction while protecting the interviews already in progress.',
  openingFrame: 'Agree what would make the hour useful, then separate immediate interview pressure from the longer-term career decision.',
  urgencyNote: 'Interviews are already in progress, so protect positioning and next actions.',
  conversationFlow: [
    { stage: 'Contract and current state', purpose: 'Agree the outcome and understand what is driving the decision now.', startMinute: 0, endMinute: 10, priority: 'standard', listenFor: ['Whether urgency comes from a deadline or a recurring pattern.'] },
    { stage: 'Explore the tension', purpose: 'Separate situational frustration from a durable need for change.', startMinute: 10, endMinute: 22, priority: 'trim_first', listenFor: ['Whether the urge to move spikes after difficult days.'] },
    { stage: 'Interview positioning', purpose: 'Choose the evidence that must become clearer for current opportunities.', startMinute: 22, endMinute: 42, priority: 'protect', listenFor: ['Which achievements the client can explain with confidence.'] },
    { stage: 'Direction and close', purpose: 'Agree offer criteria, the CV action, and the follow-up commitment.', startMinute: 42, endMinute: 60, priority: 'protect', listenFor: [] },
  ],
  priorityQuestions: [
    { question: 'What must be different six months from now?', whyItMatters: 'Defines the direction in the client own terms.', priority: 'must_ask' },
    { question: 'What is drawing you toward the interviews already in progress?', whyItMatters: 'Tests whether the opportunities fit the direction.', priority: 'must_ask' },
    { question: 'What would need to change for staying to feel deliberate?', whyItMatters: 'Keeps the current role as an intentional option.', priority: 'if_time' },
  ],
  closeWith: ['One direction statement.', 'One CV action with an owner and date.'],
  groundedCoachNotes: [
    { source: 'intake', note: 'The client reports interviews already in progress.' },
    { source: 'cv_analysis', note: 'The CV analysis shows strong progression but limited achievement evidence.' },
  ],
  judgmentCalls: ['Positioning may be contributing to recruiter silence. Verify this with the client.'],
}, { serviceSlug: 'career-clarity', requireTimed: true });

const preparation = {
  id: 'export-test-preparation',
  paymentId: 'export-test-payment',
  serviceSlug: 'career-clarity',
  version: 3,
  generatedContent: content,
  content,
  sourceSnapshot: {
    intake: { intakeId: 'intake-1', submittedAt: '2026-07-29T08:00:00.000Z', included: true },
    cvAnalysis: { reportId: 'report-1', createdAt: '2026-07-29T08:05:00.000Z', included: true },
  },
  generatorProvider: 'test',
  generatorModel: 'test',
  promptVersion: 'client-session-preparation-v4',
  createdAt: '2026-07-29T08:10:00.000Z',
  updatedAt: '2026-07-29T08:10:00.000Z',
};

const options = {
  layout: 'full',
  format: 'pdf',
  includeGuide: true,
  includeLens: true,
  includeCues: true,
};

test('renders the reviewed preparation to valid PDF and DOCX buffers', async (t) => {
  const pdfModule = await compileModule(
    t,
    path.resolve('components/career-tools/SessionPreparationPdf.tsx'),
    [["'@react-pdf/renderer'", JSON.stringify(import.meta.resolve('@react-pdf/renderer'))]],
  );
  const docxModule = await compileModule(
    t,
    path.resolve('lib/client-session-preparation-docx.ts'),
    [["'docx'", JSON.stringify(import.meta.resolve('docx'))]],
  );

  const pdfBuffer = await renderToBuffer(createElement(pdfModule.default, {
    preparation,
    clientName: 'Test Client',
    options,
  }));
  const compactPdfBuffer = await renderToBuffer(createElement(pdfModule.default, {
    preparation,
    clientName: 'Test Client',
    options: { ...options, layout: 'compact' },
  }));
  const docxBuffer = await docxModule.buildSessionPreparationDocx({
    preparation,
    clientName: 'Test Client',
    options: { ...options, format: 'docx' },
  });

  assert.equal(pdfBuffer.subarray(0, 4).toString(), '%PDF');
  assert.ok(pdfBuffer.length > 5000);
  assert.equal(compactPdfBuffer.subarray(0, 4).toString(), '%PDF');
  assert.ok(compactPdfBuffer.length > 5000);
  assert.equal(docxBuffer.subarray(0, 2).toString(), 'PK');
  assert.ok(docxBuffer.length > 5000);

  if (process.env.SESSION_PREP_EXPORT_QA_DIR) {
    await mkdir(process.env.SESSION_PREP_EXPORT_QA_DIR, { recursive: true });
    await writeFile(path.join(process.env.SESSION_PREP_EXPORT_QA_DIR, 'session-preparation-full.pdf'), pdfBuffer);
    await writeFile(path.join(process.env.SESSION_PREP_EXPORT_QA_DIR, 'session-preparation-compact.pdf'), compactPdfBuffer);
    await writeFile(path.join(process.env.SESSION_PREP_EXPORT_QA_DIR, 'session-preparation-full.docx'), docxBuffer);
  }
});
