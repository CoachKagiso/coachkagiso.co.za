import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const MAX_CV_FILE_BYTES = 8 * 1024 * 1024;

/**
 * pdf-parse pins its own pdfjs and refuses any worker built from a different one, so the worker has
 * to come from whichever copy npm actually installed for it.
 *
 * If the nested copy exists it exists *because* it conflicts with the top-level pdfjs-dist, which
 * makes it the matching one. If it is absent, pdf-parse's dependency was hoisted and the top-level
 * copy is the matching one. Naming the top-level path unconditionally is what put a 6.x worker
 * behind a 5.x API and failed every PDF upload with a version mismatch.
 *
 * The bundler cannot trace pdf-parse's own relative worker lookup, so an absolute path is required
 * here - calling setWorker() with no argument leaves it hunting for a file beside the built chunk.
 */
let cachedPdfWorkerUrl: string | null = null;

function resolvePdfWorkerUrl() {
  if (cachedPdfWorkerUrl) return cachedPdfWorkerUrl;

  const workerSubPath = path.join('pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');
  const candidates = [
    path.join(process.cwd(), 'node_modules', 'pdf-parse', 'node_modules', workerSubPath),
    path.join(process.cwd(), 'node_modules', workerSubPath),
  ];

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error('Could not locate the PDF worker. Reinstall dependencies and try again.');
  }

  cachedPdfWorkerUrl = pathToFileURL(found).href;
  return cachedPdfWorkerUrl;
}

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

async function ensurePdfServerDomApis() {
  const runtime = globalThis as typeof globalThis & { DOMMatrix?: typeof DOMMatrix };
  if (typeof runtime.DOMMatrix !== 'undefined') return;

  const { default: DOMMatrixShim } = (await import('@thednp/dommatrix')) as unknown as { default: typeof DOMMatrix };
  runtime.DOMMatrix = DOMMatrixShim;
}

export type CvDocumentExtract = {
  text: string;
  /**
   * Pages, for PDFs only. .docx and .txt have no fixed pagination - the page count depends on
   * whoever opens them - so it is null rather than guessed. Nothing downstream may treat a null
   * as "short".
   */
  pageCount: number | null;
};

/**
 * Text extraction throws layout away: columns, tables, fonts, margins, images and any photo are
 * gone by the time anything reads the result. Page count is the one structural fact that survives
 * a PDF, so it is returned alongside the text rather than left on the floor - it is the difference
 * between an analyst knowing a CV runs six pages and guessing at its length from word count.
 */
export async function extractCvDocument(file: File): Promise<CvDocumentExtract> {
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
    return { text: normalizeCvText(buffer.toString('utf8')), pageCount: null };
  }

  if (extension === '.docx') {
    const mammoth = await import('mammoth');
    const extracted = await mammoth.extractRawText({ buffer });
    return { text: normalizeCvText(extracted.value || ''), pageCount: null };
  }

  await ensurePdfServerDomApis();
  const { PDFParse } = await import('pdf-parse');
  PDFParse.setWorker(resolvePdfWorkerUrl());
  const parser = new PDFParse({ data: buffer });
  try {
    const extracted = await parser.getText();
    const total = Number(extracted.total);
    return {
      text: normalizeCvText(extracted.text || ''),
      pageCount: Number.isInteger(total) && total > 0 ? total : null,
    };
  } finally {
    await parser.destroy();
  }
}

export async function extractTextFromCvFile(file: File) {
  const extracted = await extractCvDocument(file);
  return extracted.text;
}
