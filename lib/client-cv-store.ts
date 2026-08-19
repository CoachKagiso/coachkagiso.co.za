import { MAX_CV_FILE_BYTES } from '@/lib/content/cv-extract';
import {
  extractSupabaseStorageLocation,
  isAllowedClientStrategyCvUrl,
} from '@/lib/client-strategy-cv';
import { normalizeCvCoachMoveLabel } from '@/lib/buying-flow';
import { validatePrivateCvUpload } from '@/lib/cv-upload-validation';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export type ClientCvSource = {
  storagePath: string | null;
  externalUrl: string | null;
  fileName: string | null;
  contentType: string | null;
  origin: 'stored' | 'external' | null;
};

export type ClientCvSourceSummary = Omit<ClientCvSource, 'storagePath' | 'externalUrl'> & {
  available: boolean;
};

export type ClientCvAnalysisReportRow = {
  id: string;
  payment_id: string;
  report: unknown;
  analysis_mode: 'simple' | 'advanced';
  target_role: string | null;
  cv_file_name: string | null;
  cv_path: string | null;
  version: number;
  created_at: string;
};

type ClientCvVersionRow = {
  id: string;
  payment_id: string;
  storage_path: string;
  file_name: string;
  content_type: string;
  extension: string;
  size_bytes: number;
  source: string;
  created_at: string;
};

function isMissingCurrentCvPath(message: string) {
  return message.includes('current_cv_path') || message.includes('schema cache');
}

function inferFileName(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const candidate = decodeURIComponent(url.pathname.split('/').pop() || '').trim();
    return candidate || 'client-cv';
  } catch {
    return null;
  }
}

async function getPaymentCvPointer(paymentId: string) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('payments')
    .select('payment_id, status, current_cv_path')
    .eq('payment_id', paymentId)
    .maybeSingle();

  if (!result.error) return result.data as { payment_id: string; status: string; current_cv_path: string | null } | null;
  if (!isMissingCurrentCvPath(result.error.message)) throw new Error(result.error.message);

  const fallback = await supabase
    .from('payments')
    .select('payment_id, status')
    .eq('payment_id', paymentId)
    .maybeSingle();
  if (fallback.error) throw new Error(fallback.error.message);
  return fallback.data ? { ...fallback.data, current_cv_path: null } as { payment_id: string; status: string; current_cv_path: string | null } : null;
}

export async function getClientCvSource(paymentId: string): Promise<ClientCvSource | null> {
  const pointer = await getPaymentCvPointer(paymentId);
  if (!pointer || pointer.status !== 'confirmed') return null;

  const supabase = createSupabaseServiceClient();
  const intakeResult = await supabase
    .from('intake_submissions')
    .select('cv_file_url, submitted_at')
    .eq('payment_id', paymentId)
    .eq('duplicate_attempt', false)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (intakeResult.error) throw new Error(intakeResult.error.message);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  if (pointer.current_cv_path) {
    const versionResult = await supabase
      .from('client_cv_versions')
      .select('id, payment_id, storage_path, file_name, content_type, extension, size_bytes, source, created_at')
      .eq('payment_id', paymentId)
      .eq('storage_path', pointer.current_cv_path)
      .maybeSingle();

    if (versionResult.error && !versionResult.error.message.includes('client_cv_versions')) {
      throw new Error(versionResult.error.message);
    }

    const version = versionResult.data as ClientCvVersionRow | null;
    return {
      storagePath: pointer.current_cv_path,
      externalUrl: null,
      fileName: version?.file_name || inferFileName(pointer.current_cv_path),
      contentType: version?.content_type || null,
      origin: 'stored',
    };
  }

  const externalUrl = intakeResult.data?.cv_file_url ? String(intakeResult.data.cv_file_url) : null;
  if (!externalUrl) {
    return { storagePath: null, externalUrl: null, fileName: null, contentType: null, origin: null };
  }

  const storageLocation = extractSupabaseStorageLocation(externalUrl, supabaseUrl);
  if (storageLocation?.bucket === 'client-uploads') {
    return {
      storagePath: storageLocation.path,
      externalUrl: null,
      fileName: inferFileName(externalUrl),
      contentType: null,
      origin: 'stored',
    };
  }

  return {
    storagePath: null,
    externalUrl: isAllowedClientStrategyCvUrl(externalUrl, supabaseUrl) ? externalUrl : null,
    fileName: inferFileName(externalUrl),
    contentType: null,
    origin: 'external',
  };
}

export function summarizeClientCvSource(source: ClientCvSource | null): ClientCvSourceSummary {
  return {
    available: Boolean(source?.storagePath || source?.externalUrl),
    fileName: source?.fileName || null,
    contentType: source?.contentType || null,
    origin: source?.origin || null,
  };
}

export async function saveClientCvVersion(input: {
  paymentId: string;
  file: File;
  source: 'analyzer' | 'intake' | 'manual' | 'cal-import';
}) {
  const bytes = new Uint8Array(await input.file.arrayBuffer());
  if (input.file.size > MAX_CV_FILE_BYTES) throw new Error('CV file must be 8MB or smaller.');

  const validated = validatePrivateCvUpload({
    name: input.file.name,
    type: input.file.type,
    size: input.file.size,
    bytes,
  });
  const versionId = crypto.randomUUID();
  const storagePath = `clients/${input.paymentId}/cv-history/${versionId}.${validated.extension}`;
  const supabase = createSupabaseServiceClient();
  const uploadResult = await supabase.storage
    .from('client-uploads')
    .upload(storagePath, bytes, {
      contentType: validated.contentType,
      cacheControl: '3600',
      upsert: false,
    });
  if (uploadResult.error) throw new Error(uploadResult.error.message);

  const versionResult = await supabase
    .from('client_cv_versions')
    .insert({
      id: versionId,
      payment_id: input.paymentId,
      storage_path: storagePath,
      file_name: validated.filename,
      content_type: validated.contentType,
      extension: validated.extension,
      size_bytes: validated.size,
      source: input.source,
    })
    .select('id, payment_id, storage_path, file_name, content_type, extension, size_bytes, source, created_at')
    .single();
  if (versionResult.error) throw new Error(versionResult.error.message);

  const pointerResult = await supabase
    .from('payments')
    .update({ current_cv_path: storagePath })
    .eq('payment_id', input.paymentId);
  if (pointerResult.error) throw new Error(pointerResult.error.message);

  return {
    version: versionResult.data as ClientCvVersionRow,
    source: {
      storagePath,
      externalUrl: null,
      fileName: validated.filename,
      contentType: validated.contentType,
      origin: 'stored' as const,
    },
  };
}

// Reports saved before the coach-move catalogue was grounded can still hold invented service
// labels. Normalizing here covers both readers: the analyzer dashboard and the strategy-plan prompt.
function withNormalizedCoachMove(row: ClientCvAnalysisReportRow | null) {
  if (!row || !row.report || typeof row.report !== 'object' || Array.isArray(row.report)) return row;
  const report = row.report as Record<string, unknown>;
  const coachMove = report.recommendedCoachMove;
  if (!coachMove || typeof coachMove !== 'object' || Array.isArray(coachMove)) return row;
  const label = (coachMove as Record<string, unknown>).label;
  if (typeof label !== 'string') return row;

  const normalized = normalizeCvCoachMoveLabel(label);
  if (normalized === label) return row;

  return {
    ...row,
    report: {
      ...report,
      recommendedCoachMove: { ...(coachMove as Record<string, unknown>), label: normalized },
    },
  };
}

/**
 * Clears every generated CV report and re-points the "current" CV back to the intake upload,
 * so a full workspace reset leaves the onboarding CV in place instead of removing it outright.
 */
export async function resetClientCvAnalysis(paymentId: string) {
  const supabase = createSupabaseServiceClient();
  const deleteResult = await supabase
    .from('cv_analysis_reports')
    .delete()
    .eq('payment_id', paymentId)
    .select('id');
  if (deleteResult.error && !deleteResult.error.message.includes('cv_analysis_reports')) {
    throw new Error(deleteResult.error.message);
  }
  const pointerResult = await supabase
    .from('payments')
    .update({ current_cv_path: null })
    .eq('payment_id', paymentId);
  if (pointerResult.error && !isMissingCurrentCvPath(pointerResult.error.message)) {
    throw new Error(pointerResult.error.message);
  }
  return (deleteResult.data || []).length;
}

export async function getLatestClientCvAnalysisReport(paymentId: string) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('cv_analysis_reports')
    .select('id, payment_id, report, analysis_mode, target_role, cv_file_name, cv_path, version, created_at')
    .eq('payment_id', paymentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) {
    if (result.error.message.includes('cv_analysis_reports')) return null;
    throw new Error(result.error.message);
  }
  return withNormalizedCoachMove(result.data as ClientCvAnalysisReportRow | null);
}

export async function saveClientCvAnalysisReport(input: {
  paymentId: string;
  report: unknown;
  analysisMode: 'simple' | 'advanced';
  targetRole: string;
  cvFileName: string | null;
  cvPath: string | null;
}) {
  const supabase = createSupabaseServiceClient();
  const latestResult = await supabase
    .from('cv_analysis_reports')
    .select('version')
    .eq('payment_id', input.paymentId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestResult.error) throw new Error(latestResult.error.message);

  const result = await supabase
    .from('cv_analysis_reports')
    .insert({
      payment_id: input.paymentId,
      report: input.report,
      analysis_mode: input.analysisMode,
      target_role: input.targetRole || null,
      cv_file_name: input.cvFileName,
      cv_path: input.cvPath,
      version: Number(latestResult.data?.version || 0) + 1,
    })
    .select('id, payment_id, report, analysis_mode, target_role, cv_file_name, cv_path, version, created_at')
    .single();
  if (result.error) throw new Error(result.error.message);
  return result.data as ClientCvAnalysisReportRow;
}
