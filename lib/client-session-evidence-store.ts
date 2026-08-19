import {
  MAX_SESSION_EVIDENCE_CONTEXT_CHARACTERS,
  normalizeSessionEvidenceText,
  type SessionDebriefSuggestions,
  type SessionEvidenceRecord,
} from '@/lib/client-session-evidence';
import { prepareSessionEvidenceFile } from '@/lib/client-session-evidence-server';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export const SESSION_EVIDENCE_STORAGE_NOT_READY = 'SESSION_EVIDENCE_STORAGE_NOT_READY';
export const SESSION_EVIDENCE_PROMPT_VERSION = 'session-evidence-debrief-v1';

type SessionEvidenceRow = {
  id: string;
  payment_id: string;
  service_slug: 'career-clarity' | 'glow-up-vip';
  version: number;
  replaces_evidence_id: string | null;
  change_reason: 'upload' | 'context_update' | 'remove_file';
  file_name: string | null;
  content_type: string | null;
  extension: string | null;
  size_bytes: number | null;
  storage_path: string | null;
  extracted_text: string;
  extraction_truncated: boolean;
  additional_context: string;
  created_at: string;
};

const EVIDENCE_SELECT =
  'id, payment_id, service_slug, version, replaces_evidence_id, change_reason, file_name, content_type, extension, size_bytes, storage_path, extracted_text, extraction_truncated, additional_context, created_at';

function isMissingEvidenceStorage(message?: string) {
  return Boolean(
    message &&
      (message.includes('client_session_evidence') || message.includes('schema cache')),
  );
}

function normalizeEvidenceRow(row: SessionEvidenceRow): SessionEvidenceRecord & {
  extractionTruncated: boolean;
  changeReason: SessionEvidenceRow['change_reason'];
  replacesEvidenceId: string | null;
} {
  return {
    id: row.id,
    paymentId: row.payment_id,
    serviceSlug: row.service_slug,
    version: Number(row.version),
    replacesEvidenceId: row.replaces_evidence_id,
    changeReason: row.change_reason,
    fileName: row.file_name,
    contentType: row.content_type,
    extension: row.extension,
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    storagePath: row.storage_path,
    extractedText: row.extracted_text || '',
    extractionTruncated: Boolean(row.extraction_truncated),
    additionalContext: row.additional_context || '',
    createdAt: row.created_at,
  };
}

export async function getLatestClientSessionEvidenceState(paymentId: string) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('client_session_evidence')
    .select(EVIDENCE_SELECT)
    .eq('payment_id', paymentId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    if (isMissingEvidenceStorage(result.error.message)) {
      return { storageReady: false, evidence: null };
    }
    throw new Error(result.error.message);
  }
  return {
    storageReady: true,
    evidence: result.data ? normalizeEvidenceRow(result.data as SessionEvidenceRow) : null,
  };
}

export async function getClientSessionEvidence(paymentId: string, evidenceId: string) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('client_session_evidence')
    .select(EVIDENCE_SELECT)
    .eq('payment_id', paymentId)
    .eq('id', evidenceId)
    .maybeSingle();

  if (result.error) {
    if (isMissingEvidenceStorage(result.error.message)) {
      throw new Error(SESSION_EVIDENCE_STORAGE_NOT_READY);
    }
    throw new Error(result.error.message);
  }
  return result.data ? normalizeEvidenceRow(result.data as SessionEvidenceRow) : null;
}

export async function saveClientSessionEvidence(input: {
  paymentId: string;
  serviceSlug: 'career-clarity' | 'glow-up-vip';
  file: File | null;
  additionalContext: string;
  removeFile: boolean;
}) {
  if (input.additionalContext.length > MAX_SESSION_EVIDENCE_CONTEXT_CHARACTERS) {
    throw new Error(`Additional context must be ${MAX_SESSION_EVIDENCE_CONTEXT_CHARACTERS.toLocaleString('en-ZA')} characters or fewer.`);
  }
  const additionalContext = normalizeSessionEvidenceText(
    input.additionalContext,
    MAX_SESSION_EVIDENCE_CONTEXT_CHARACTERS,
  );
  const currentState = await getLatestClientSessionEvidenceState(input.paymentId);
  if (!currentState.storageReady) throw new Error(SESSION_EVIDENCE_STORAGE_NOT_READY);
  const current = currentState.evidence;

  let uploadedStoragePath: string | null = null;
  let fileFields = input.removeFile
    ? {
        file_name: null,
        content_type: null,
        extension: null,
        size_bytes: null,
        storage_path: null,
        extracted_text: '',
        extraction_truncated: false,
      }
    : {
        file_name: current?.fileName || null,
        content_type: current?.contentType || null,
        extension: current?.extension || null,
        size_bytes: current?.sizeBytes || null,
        storage_path: current?.storagePath || null,
        extracted_text: current?.extractedText || '',
        extraction_truncated: current?.extractionTruncated || false,
      };

  const supabase = createSupabaseServiceClient();
  if (input.file) {
    const prepared = await prepareSessionEvidenceFile(input.file);
    const evidenceId = crypto.randomUUID();
    uploadedStoragePath = `clients/${input.paymentId}/session-evidence/${evidenceId}.${prepared.validated.extension}`;
    const uploadResult = await supabase.storage
      .from('client-uploads')
      .upload(uploadedStoragePath, prepared.bytes, {
        contentType: prepared.validated.contentType,
        cacheControl: '3600',
        upsert: false,
      });
    if (uploadResult.error) throw new Error(uploadResult.error.message);

    fileFields = {
      file_name: prepared.validated.filename,
      content_type: prepared.validated.contentType,
      extension: prepared.validated.extension,
      size_bytes: prepared.validated.size,
      storage_path: uploadedStoragePath,
      extracted_text: prepared.extractedText,
      extraction_truncated: prepared.extractionTruncated,
    };
  }

  if (!fileFields.extracted_text && !additionalContext) {
    if (input.removeFile && current) {
      // An empty revision is intentional: it clears the current evidence without
      // destructively deleting the private revision history.
    } else {
      throw new Error('Upload session notes or add context before saving evidence.');
    }
  }

  const result = await supabase
    .from('client_session_evidence')
    .insert({
      payment_id: input.paymentId,
      service_slug: input.serviceSlug,
      version: Number(current?.version || 0) + 1,
      replaces_evidence_id: current?.id || null,
      change_reason: input.file ? 'upload' : input.removeFile ? 'remove_file' : 'context_update',
      ...fileFields,
      additional_context: additionalContext,
    })
    .select(EVIDENCE_SELECT)
    .single();

  if (result.error) {
    if (uploadedStoragePath) {
      await supabase.storage.from('client-uploads').remove([uploadedStoragePath]);
    }
    if (isMissingEvidenceStorage(result.error.message)) {
      throw new Error(SESSION_EVIDENCE_STORAGE_NOT_READY);
    }
    throw new Error(result.error.message);
  }
  return normalizeEvidenceRow(result.data as SessionEvidenceRow);
}

export async function saveClientSessionEvidenceSuggestions(input: {
  paymentId: string;
  serviceSlug: 'career-clarity' | 'glow-up-vip';
  evidenceId: string;
  preparationId: string;
  suggestions: SessionDebriefSuggestions;
  generatorProvider: string;
  generatorModel: string;
}) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('client_session_evidence_suggestions')
    .insert({
      payment_id: input.paymentId,
      service_slug: input.serviceSlug,
      evidence_id: input.evidenceId,
      preparation_id: input.preparationId,
      suggestions: input.suggestions,
      generator_provider: input.generatorProvider,
      generator_model: input.generatorModel,
      prompt_version: SESSION_EVIDENCE_PROMPT_VERSION,
    })
    .select('id, created_at')
    .single();

  if (result.error) {
    if (isMissingEvidenceStorage(result.error.message)) {
      throw new Error(SESSION_EVIDENCE_STORAGE_NOT_READY);
    }
    throw new Error(result.error.message);
  }
  return {
    id: String(result.data.id),
    createdAt: String(result.data.created_at),
  };
}
