import {
  canIncludeDiagnosticContext,
  normalizeDiagnosticContextStatus,
  requiresRenewedDiagnosticConsent,
  selectIncludedDiagnosticContext,
  type DiagnosticContextStatus,
  type EarlierDiagnosticContext,
} from '@/lib/client-diagnostic-context';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

type DiagnosticRow = {
  id: string;
  first_name: string;
  email: string;
  source: string | null;
  answers: Record<string, string> | null;
  archetype_name: string | null;
  submitted_at: string;
  coaching_context_consent?: boolean | null;
  coaching_context_consent_at?: string | null;
  coaching_context_consent_version?: string | null;
};

type LinkRow = {
  id: string;
  payment_id: string;
  diagnostic_submission_id: string;
  status: string;
  match_method: 'email' | 'manual';
  consent_source: 'future_form' | 'direct_client' | null;
  consent_recorded_at: string | null;
  status_changed_at: string;
  status_changed_by: string;
  created_at: string;
  updated_at: string;
};

export type DiagnosticContextCandidate = EarlierDiagnosticContext & {
  firstName: string;
  email: string;
  coachingContextConsent: boolean;
  coachingContextConsentAt: string | null;
  coachingContextConsentVersion: string | null;
};

export type ClientDiagnosticContextLink = {
  id: string;
  paymentId: string;
  diagnosticSubmissionId: string;
  status: DiagnosticContextStatus;
  matchMethod: 'email' | 'manual';
  consentSource: 'future_form' | 'direct_client' | null;
  consentRecordedAt: string | null;
  statusChangedAt: string;
  statusChangedBy: string;
  diagnostic: DiagnosticContextCandidate;
};

const DIAGNOSTIC_SELECT =
  'id, first_name, email, source, answers, archetype_name, submitted_at, coaching_context_consent, coaching_context_consent_at, coaching_context_consent_version';
const LEGACY_DIAGNOSTIC_SELECT =
  'id, first_name, email, source, answers, archetype_name, submitted_at';
const LINK_SELECT =
  'id, payment_id, diagnostic_submission_id, status, match_method, consent_source, consent_recorded_at, status_changed_at, status_changed_by, created_at, updated_at';

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function hasAnswers(row: DiagnosticRow) {
  return Boolean(row.answers && Object.keys(row.answers).length > 0);
}

function normalizeCandidate(row: DiagnosticRow): DiagnosticContextCandidate {
  return {
    id: String(row.id),
    firstName: String(row.first_name || ''),
    email: normalizeEmail(row.email),
    source: String(row.source || 'diagnostic'),
    submittedAt: String(row.submitted_at),
    archetypeName: row.archetype_name ? String(row.archetype_name) : null,
    answers: row.answers || {},
    coachingContextConsent: row.coaching_context_consent === true,
    coachingContextConsentAt: row.coaching_context_consent_at ? String(row.coaching_context_consent_at) : null,
    coachingContextConsentVersion: row.coaching_context_consent_version
      ? String(row.coaching_context_consent_version)
      : null,
  };
}

function isMissingLinkTable(message?: string) {
  return Boolean(message && (message.includes('client_diagnostic_context_links') || message.includes('schema cache')));
}

function isMissingConsentColumns(message?: string) {
  return Boolean(message && message.includes('coaching_context_consent'));
}

async function getDiagnosticRowsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const supabase = createSupabaseServiceClient();
  const result = await supabase.from('diagnostic_submissions').select(DIAGNOSTIC_SELECT).in('id', ids);
  if (result.error && isMissingConsentColumns(result.error.message)) {
    const fallback = await supabase.from('diagnostic_submissions').select(LEGACY_DIAGNOSTIC_SELECT).in('id', ids);
    if (fallback.error) throw new Error(fallback.error.message);
    return ((fallback.data || []) as unknown as DiagnosticRow[]).filter(hasAnswers).map(normalizeCandidate);
  }
  if (result.error) throw new Error(result.error.message);
  return ((result.data || []) as unknown as DiagnosticRow[]).filter(hasAnswers).map(normalizeCandidate);
}

async function searchDiagnosticRows(query: string, emails: string[]) {
  const supabase = createSupabaseServiceClient();
  const run = (select: string) => {
    let request = supabase
      .from('diagnostic_submissions')
      .select(select)
      .order('submitted_at', { ascending: false })
      .limit(20);
    if (query) {
      request = query.includes('@')
        ? request.eq('email', normalizeEmail(query))
        : request.ilike('first_name', `%${query.replace(/[%_]/g, '')}%`);
    } else if (emails.length > 0) {
      request = request.in('email', emails);
    }
    return request;
  };

  const result = await run(DIAGNOSTIC_SELECT);
  if (result.error && isMissingConsentColumns(result.error.message)) {
    const fallback = await run(LEGACY_DIAGNOSTIC_SELECT);
    if (fallback.error) throw new Error(fallback.error.message);
    return ((fallback.data || []) as unknown as DiagnosticRow[]).filter(hasAnswers).map(normalizeCandidate);
  }
  if (result.error) throw new Error(result.error.message);
  return ((result.data || []) as unknown as DiagnosticRow[]).filter(hasAnswers).map(normalizeCandidate);
}

export async function getClientDiagnosticContextWorkspace(paymentId: string, query = '') {
  const supabase = createSupabaseServiceClient();
  const [paymentResult, intakeResult, linkResult] = await Promise.all([
    supabase
      .from('payments')
      .select('payment_id, buyer_email, status')
      .eq('payment_id', paymentId)
      .maybeSingle(),
    supabase
      .from('intake_submissions')
      .select('form_data')
      .eq('payment_id', paymentId)
      .eq('duplicate_attempt', false)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('client_diagnostic_context_links')
      .select(LINK_SELECT)
      .eq('payment_id', paymentId)
      .maybeSingle(),
  ]);

  if (paymentResult.error) throw new Error(paymentResult.error.message);
  if (!paymentResult.data || paymentResult.data.status !== 'confirmed') return null;
  if (intakeResult.error) throw new Error(intakeResult.error.message);
  if (linkResult.error && !isMissingLinkTable(linkResult.error.message)) throw new Error(linkResult.error.message);

  const intakeForm = (intakeResult.data?.form_data || {}) as Record<string, unknown>;
  const emails = [...new Set([
    normalizeEmail(paymentResult.data.buyer_email),
    normalizeEmail(intakeForm.email),
  ].filter(Boolean))];
  const linkRow = linkResult.error ? null : linkResult.data as LinkRow | null;
  const candidates = await searchDiagnosticRows(query.trim().slice(0, 120), query ? [] : emails);
  const linkedCandidates = linkRow
    ? await getDiagnosticRowsByIds([String(linkRow.diagnostic_submission_id)])
    : [];
  const allCandidates = [...linkedCandidates, ...candidates].filter(
    (candidate, index, list) => list.findIndex((item) => item.id === candidate.id) === index,
  );
  const linkedDiagnostic = linkRow
    ? allCandidates.find((candidate) => candidate.id === String(linkRow.diagnostic_submission_id)) || null
    : null;
  const link: ClientDiagnosticContextLink | null = linkRow && linkedDiagnostic
    ? {
        id: String(linkRow.id),
        paymentId: String(linkRow.payment_id),
        diagnosticSubmissionId: String(linkRow.diagnostic_submission_id),
        status: normalizeDiagnosticContextStatus(linkRow.status),
        matchMethod: linkRow.match_method,
        consentSource: linkRow.consent_source,
        consentRecordedAt: linkRow.consent_recorded_at ? String(linkRow.consent_recorded_at) : null,
        statusChangedAt: String(linkRow.status_changed_at),
        statusChangedBy: String(linkRow.status_changed_by),
        diagnostic: linkedDiagnostic,
      }
    : null;

  return {
    link,
    autoCandidate: allCandidates.find((candidate) => emails.includes(candidate.email)) || null,
    candidates: query ? allCandidates : [],
  };
}

export async function setClientDiagnosticContextLink(input: {
  paymentId: string;
  diagnosticSubmissionId: string;
  status: DiagnosticContextStatus;
  matchMethod: 'email' | 'manual';
  clientConsentConfirmed: boolean;
}) {
  const [workspace, candidates] = await Promise.all([
    getClientDiagnosticContextWorkspace(input.paymentId),
    getDiagnosticRowsByIds([input.diagnosticSubmissionId]),
  ]);
  if (!workspace) throw new Error('Eligible confirmed client not found.');
  const diagnostic = candidates[0];
  if (!diagnostic) throw new Error('Diagnostic submission with answers not found.');

  const existing = workspace.link;
  let consentSource = existing?.consentSource || null;
  let consentRecordedAt = existing?.consentRecordedAt || null;
  const requiresRenewedPermission = requiresRenewedDiagnosticConsent(existing?.status || null, input.status);
  if (requiresRenewedPermission) {
    consentSource = null;
    consentRecordedAt = null;
  } else if (diagnostic.coachingContextConsent && diagnostic.coachingContextConsentAt) {
    consentSource = 'future_form';
    consentRecordedAt = diagnostic.coachingContextConsentAt;
  }
  if (input.clientConsentConfirmed) {
    consentSource = 'direct_client';
    consentRecordedAt = new Date().toISOString();
  }

  if (input.status === 'included' && !canIncludeDiagnosticContext({
    consentConfirmed: Boolean(consentSource),
    consentRecordedAt,
  })) {
    throw new Error('Record the client’s permission before including diagnostic answers.');
  }

  const now = new Date().toISOString();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from('client_diagnostic_context_links').upsert({
    payment_id: input.paymentId,
    diagnostic_submission_id: input.diagnosticSubmissionId,
    status: input.status,
    match_method: input.matchMethod,
    consent_source: consentSource,
    consent_recorded_at: consentRecordedAt,
    status_changed_at: now,
    status_changed_by: 'kagiso_dashboard',
    updated_at: now,
  }, { onConflict: 'payment_id' });
  if (error) throw new Error(error.message);
  return getClientDiagnosticContextWorkspace(input.paymentId);
}

export async function getIncludedClientDiagnosticContext(paymentId: string) {
  const supabase = createSupabaseServiceClient();
  const linkResult = await supabase
    .from('client_diagnostic_context_links')
    .select(LINK_SELECT)
    .eq('payment_id', paymentId)
    .eq('status', 'included')
    .maybeSingle();
  if (linkResult.error) {
    if (isMissingLinkTable(linkResult.error.message)) return null;
    throw new Error(linkResult.error.message);
  }
  const linkRow = linkResult.data as LinkRow | null;
  if (!linkRow?.consent_recorded_at) return null;
  const diagnostics = await getDiagnosticRowsByIds([String(linkRow.diagnostic_submission_id)]);
  const diagnostic = diagnostics[0] || null;
  return diagnostic
    ? selectIncludedDiagnosticContext({ status: normalizeDiagnosticContextStatus(linkRow.status), diagnostic })
    : null;
}
