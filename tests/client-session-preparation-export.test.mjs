import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeSessionPreparationExportOptions,
  sessionPreparationExportFileName,
} from '../lib/client-session-preparation-export.ts';

test('defaults session preparation exports to a full guide-only PDF', () => {
  assert.deepEqual(normalizeSessionPreparationExportOptions({}), {
    layout: 'full',
    format: 'pdf',
    includeGuide: true,
    includeLens: false,
    includeCues: true,
  });
});

test('keeps private coaching notes opt-in and disables cues without the guide', () => {
  assert.deepEqual(normalizeSessionPreparationExportOptions({
    layout: 'compact',
    format: 'docx',
    includeGuide: false,
    includeLens: true,
    includeCues: true,
  }), {
    layout: 'compact',
    format: 'docx',
    includeGuide: false,
    includeLens: true,
    includeCues: false,
  });
});

test('rejects an export with no selected content', () => {
  assert.throws(
    () => normalizeSessionPreparationExportOptions({ includeGuide: false, includeLens: false }),
    /Choose Session Guide, Coaching Lens, or both/,
  );
});

test('builds a safe client-specific export filename', () => {
  assert.equal(
    sessionPreparationExportFileName({
      clientName: 'Xoliswa Mashinini',
      serviceSlug: 'career-clarity',
      extension: 'pdf',
    }),
    'Xoliswa-Mashinini-Career-Clarity-Session-Preparation.pdf',
  );
});
