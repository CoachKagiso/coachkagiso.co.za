import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cleanPrivateCvFilename,
  validatePrivateCvUpload,
} from '../lib/cv-upload-validation.ts';

test('accepts a PDF whose extension, MIME type, and signature agree', () => {
  assert.deepEqual(
    validatePrivateCvUpload({
      name: 'Lerato CV 2026.pdf',
      type: 'application/pdf',
      size: 12,
      bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]),
    }),
    {
      filename: 'Lerato-CV-2026.pdf',
      contentType: 'application/pdf',
    },
  );
});

test('rejects mismatched extensions and forged document signatures', () => {
  assert.throws(
    () => validatePrivateCvUpload({
      name: 'client.docx',
      type: 'application/pdf',
      size: 12,
      bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
    }),
    /filename does not match/,
  );
  assert.throws(
    () => validatePrivateCvUpload({
      name: 'client.pdf',
      type: 'application/pdf',
      size: 12,
      bytes: new Uint8Array([0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74]),
    }),
    /contents do not match/,
  );
  assert.throws(
    () => validatePrivateCvUpload({
      name: 'client.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 12,
      bytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x7a, 0x69, 0x70]),
    }),
    /structure could not be verified/,
  );
});

test('bounds and cleans stored filenames', () => {
  assert.equal(cleanPrivateCvFilename('../../Lerato Mokoena CV.pdf'), '..-..-Lerato-Mokoena-CV.pdf');
  assert.throws(
    () => validatePrivateCvUpload({
      name: 'client.pdf',
      type: 'application/pdf',
      size: 11 * 1024 * 1024,
      bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
    }),
    /10MB or smaller/,
  );
});
