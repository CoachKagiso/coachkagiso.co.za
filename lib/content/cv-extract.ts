import path from 'node:path';
import { pathToFileURL } from 'node:url';

const pdfWorkerUrl = pathToFileURL(
  path.join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'),
).href;

export const MAX_CV_FILE_BYTES = 8 * 1024 * 1024;

const NULL_CHAR = new RegExp(String.fromCharCode(0), 'g');

export function getCvFileExtension(name: string) {
  const index = name.lastIndexOf('.');
  return index === -1 ? '' : name.slice(index).toLowerCase();
}

export function normalizeCvText(value: string) {
  return value
    .replace(NULL_CHAR, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

export function isSupportedCvFile(file: File) {
  const extension = getCvFileExtension(file.name);
  return extension === '.pdf' || extension === '.docx' || extension === '.txt';
}

export async function extractTextFromCvFile(file: File) {
  const extension = getCvFileExtension(file.name);

  if (file.size <= 0) {
    throw new Error('Upload a CV file with content.');
  }

  if (file.size > MAX_CV_FILE_BYTES) {
    throw new Error('CV file must be 8MB or smaller.');
  }

  if (extension === '.doc') {
    throw new Error('Old .doc files are not supported yet. Save the CV as .docx or PDF first.');
  }

  if (!isSupportedCvFile(file)) {
    throw new Error('Upload a PDF, Word .docx, or plain text CV.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (extension === '.txt') {
    return normalizeCvText(buffer.toString('utf8'));
  }

  if (extension === '.docx') {
    const mammoth = await import('mammoth');
    const extracted = await mammoth.extractRawText({ buffer });
    return normalizeCvText(extracted.value || '');
  }

  const { PDFParse } = await import('pdf-parse');
  PDFParse.setWorker(pdfWorkerUrl);
  const parser = new PDFParse({ data: buffer });
  try {
    const extracted = await parser.getText();
    return normalizeCvText(extracted.text || '');
  } finally {
    await parser.destroy();
  }
}
