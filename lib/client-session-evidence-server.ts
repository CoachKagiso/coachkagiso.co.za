import { extractTextFromCvFile } from '@/lib/content/cv-extract';
import {
  MAX_SESSION_EVIDENCE_EXTRACTED_CHARACTERS,
  normalizeSessionEvidenceText,
  validateSessionEvidenceUpload,
} from '@/lib/client-session-evidence';

export async function prepareSessionEvidenceFile(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const validated = validateSessionEvidenceUpload({
    name: file.name,
    type: file.type,
    size: file.size,
    bytes,
  });

  const extracted = validated.extension === 'md'
    ? normalizeSessionEvidenceText(Buffer.from(bytes).toString('utf8'), Number.MAX_SAFE_INTEGER)
    : await extractTextFromCvFile(file);

  if (!extracted) {
    throw new Error(
      validated.extension === 'pdf'
        ? 'This PDF has no readable text. Upload a text-based PDF or paste the transcript below.'
        : 'No readable text could be extracted from this session document.',
    );
  }

  return {
    bytes,
    validated,
    extractedText: extracted.slice(0, MAX_SESSION_EVIDENCE_EXTRACTED_CHARACTERS),
    extractionTruncated: extracted.length > MAX_SESSION_EVIDENCE_EXTRACTED_CHARACTERS,
  };
}
