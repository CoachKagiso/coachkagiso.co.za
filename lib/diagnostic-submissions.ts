import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { getDiagnosticAdminKey } from '@/lib/env';
import { addSastDaysAsDateKey, getEffectiveNextFollowUpAt } from '@/lib/follow-up-utils';
import {
  isDiagnosticLeadSource,
  normalizeLeadSource,
  type DiagnosticLeadSource,
} from '@/lib/lead-sources';

export type { DiagnosticLeadSource } from '@/lib/lead-sources';

const ARCHETYPE_KEYS = ['A', 'B', 'C', 'D', 'E'] as const;
const LEGACY_SELECT =
  'id, first_name, email, answers, score, archetype_key, archetype_name, archetype_payload, submitted_at';
const CRM_BASE_SELECT = `${LEGACY_SELECT}, lead_status, lead_notes, next_follow_up_at, last_contacted_at, updated_at`;
const CRM_SELECT = `${LEGACY_SELECT}, lead_status, lead_notes, follow_up_count, next_follow_up_at, last_contacted_at, updated_at`;
const SOURCE_SELECT = `${CRM_SELECT}, source, download_link`;

export type DiagnosticArchetypeKey = (typeof ARCHETYPE_KEYS)[number];
export type DiagnosticLeadStatus =
  | 'new'
  | 'contacted'
  | 'discovery_booked'
  | 'paid'
  | 'follow_up_later'
  | 'not_a_fit'
  | 'nurture'
  | 'closed'
  | 'archived';

export const diagnosticLeadStatuses: {
  value: DiagnosticLeadStatus;
  label: string;
  shortLabel: string;
}[] = [
  { value: 'new', label: 'New lead', shortLabel: 'New' },
  { value: 'contacted', label: 'Emailed / contacted', shortLabel: 'Contacted' },
  { value: 'discovery_booked', label: 'Discovery booked', shortLabel: 'Booked' },
  { value: 'paid', label: 'Paid client', shortLabel: 'Paid' },
  { value: 'follow_up_later', label: 'Follow up later', shortLabel: 'Follow up' },
  { value: 'not_a_fit', label: 'Not a fit', shortLabel: 'Not a fit' },
  { value: 'nurture', label: 'Nurture', shortLabel: 'Nurture' },
  { value: 'closed', label: 'Closed', shortLabel: 'Closed' },
  { value: 'archived', label: 'Archived', shortLabel: 'Archived' },
];

export type DiagnosticSubmission = {
  id: string;
  first_name: string;
  email: string;
  answers: Record<string, string>;
  score: Record<string, number>;
  archetype_key: DiagnosticArchetypeKey;
  archetype_name: string;
  archetype_payload: {
    name?: string;
    service?: string;
    href?: string;
    tagline?: string;
    diagnosis?: string;
    action?: string;
    source?: string;
    whatsapp?: string | null;
    focus?: string | null;
  };
  source: DiagnosticLeadSource;
  download_link: string | null;
  submitted_at: string;
  lead_status: DiagnosticLeadStatus;
  lead_notes: string | null;
  follow_up_count: number;
  next_follow_up_at: string | null;
  last_contacted_at: string | null;
  updated_at: string | null;
};

export function isDiagnosticArchetypeKey(value?: string | null): value is DiagnosticArchetypeKey {
  return Boolean(value && ARCHETYPE_KEYS.includes(value as DiagnosticArchetypeKey));
}

export function isDiagnosticLeadStatus(value?: string | null): value is DiagnosticLeadStatus {
  return Boolean(
    value && diagnosticLeadStatuses.some((status) => status.value === value)
  );
}

export function isDiagnosticAdminAuthorized(providedKey?: string | null) {
  const expectedKey = getDiagnosticAdminKey();
  return Boolean(expectedKey && providedKey && providedKey === expectedKey);
}

export type DiagnosticSubmissionFilters = {
  archetype?: string | null;
  status?: string | null;
  service?: string | null;
  source?: string | null;
  followUp?: string | null;
  query?: string | null;
  from?: string | null;
  to?: string | null;
};

function isMissingCrmColumn(message?: string) {
  return Boolean(
    message &&
      ['lead_status', 'lead_notes', 'next_follow_up_at', 'last_contacted_at', 'updated_at'].some((column) =>
        message.includes(column)
      )
  );
}

function isMissingFollowUpCountColumn(message?: string) {
  return Boolean(message && message.includes('follow_up_count'));
}

function isMissingSourceColumn(message?: string) {
  return Boolean(message && (message.includes('source') || message.includes('download_link')));
}

function normalizeSubmission(row: Partial<DiagnosticSubmission>) {
  const status = isDiagnosticLeadStatus(row.lead_status) ? row.lead_status : 'new';
  const followUpCount = Number.isFinite(Number(row.follow_up_count)) ? Number(row.follow_up_count) : 0;
  const nextFollowUpAt = getEffectiveNextFollowUpAt({
    followUpCount,
    lastContactedAt: row.last_contacted_at,
    leadStatus: status,
    nextFollowUpAt: row.next_follow_up_at,
    submittedAt: row.submitted_at,
  });

  return {
    ...row,
    lead_status: status,
    lead_notes: row.lead_notes || null,
    follow_up_count: followUpCount,
    next_follow_up_at: nextFollowUpAt,
    last_contacted_at: row.last_contacted_at || null,
    updated_at: row.updated_at || null,
    source: normalizeLeadSource(row.source),
    download_link: row.download_link || null,
  } as DiagnosticSubmission;
}

function normalizeFilters(filtersOrArchetype?: string | null | DiagnosticSubmissionFilters) {
  if (typeof filtersOrArchetype === 'string' || filtersOrArchetype === null || filtersOrArchetype === undefined) {
    return { archetype: filtersOrArchetype };
  }

  return filtersOrArchetype;
}

function getDateBoundary(value: string | null | undefined, boundary: 'start' | 'end') {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00+02:00`);
  if (Number.isNaN(date.getTime())) return null;

  if (boundary === 'end') {
    date.setHours(23, 59, 59, 999);
  }

  return date.toISOString();
}

export async function listDiagnosticSubmissions(
  filtersOrArchetype?: string | null | DiagnosticSubmissionFilters
) {
  const filters = normalizeFilters(filtersOrArchetype);
  const supabase = createSupabaseServiceClient();
  const submittedFrom = getDateBoundary(filters.from, 'start');
  const submittedTo = getDateBoundary(filters.to, 'end');
  let query = supabase
    .from('diagnostic_submissions')
    .select(SOURCE_SELECT)
    .order('submitted_at', { ascending: false })
    .limit(250);

  if (isDiagnosticArchetypeKey(filters.archetype)) {
    query = query.eq('archetype_key', filters.archetype);
  }

  if (isDiagnosticLeadStatus(filters.status)) {
    query = query.eq('lead_status', filters.status);
  }

  if (isDiagnosticLeadSource(filters.source)) {
    query = query.eq('source', filters.source);
  }

  if (submittedFrom) {
    query = query.gte('submitted_at', submittedFrom);
  }

  if (submittedTo) {
    query = query.lte('submitted_at', submittedTo);
  }

  const result = await query;
  let data: unknown[] | null = result.data;
  let error = result.error;

  if (error && isMissingSourceColumn(error.message)) {
    let sourceFallbackQuery = supabase
      .from('diagnostic_submissions')
      .select(CRM_SELECT)
      .order('submitted_at', { ascending: false })
      .limit(250);

    if (isDiagnosticArchetypeKey(filters.archetype)) {
      sourceFallbackQuery = sourceFallbackQuery.eq('archetype_key', filters.archetype);
    }

    if (isDiagnosticLeadStatus(filters.status)) {
      sourceFallbackQuery = sourceFallbackQuery.eq('lead_status', filters.status);
    }

    if (submittedFrom) {
      sourceFallbackQuery = sourceFallbackQuery.gte('submitted_at', submittedFrom);
    }

    if (submittedTo) {
      sourceFallbackQuery = sourceFallbackQuery.lte('submitted_at', submittedTo);
    }

    const sourceFallbackResult = await sourceFallbackQuery;
    data = sourceFallbackResult.data;
    error = sourceFallbackResult.error;
  }

  if (error && isMissingFollowUpCountColumn(error.message)) {
    let baseCrmQuery = supabase
      .from('diagnostic_submissions')
      .select(CRM_BASE_SELECT)
      .order('submitted_at', { ascending: false })
      .limit(250);

    if (isDiagnosticArchetypeKey(filters.archetype)) {
      baseCrmQuery = baseCrmQuery.eq('archetype_key', filters.archetype);
    }

    if (isDiagnosticLeadStatus(filters.status)) {
      baseCrmQuery = baseCrmQuery.eq('lead_status', filters.status);
    }

    if (submittedFrom) {
      baseCrmQuery = baseCrmQuery.gte('submitted_at', submittedFrom);
    }

    if (submittedTo) {
      baseCrmQuery = baseCrmQuery.lte('submitted_at', submittedTo);
    }

    const baseCrmResult = await baseCrmQuery;
    data = baseCrmResult.data;
    error = baseCrmResult.error;
  }

  if (error && isMissingCrmColumn(error.message)) {
    let legacyQuery = supabase
      .from('diagnostic_submissions')
      .select(LEGACY_SELECT)
      .order('submitted_at', { ascending: false })
      .limit(250);

    if (isDiagnosticArchetypeKey(filters.archetype)) {
      legacyQuery = legacyQuery.eq('archetype_key', filters.archetype);
    }

    if (submittedFrom) {
      legacyQuery = legacyQuery.gte('submitted_at', submittedFrom);
    }

    if (submittedTo) {
      legacyQuery = legacyQuery.lte('submitted_at', submittedTo);
    }

    const legacyResult = await legacyQuery;
    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  let submissions = (data || []).map((row) => normalizeSubmission(row as Partial<DiagnosticSubmission>));

  if (isDiagnosticLeadStatus(filters.status)) {
    submissions = submissions.filter((submission) => submission.lead_status === filters.status);
  }

  if (isDiagnosticLeadSource(filters.source)) {
    submissions = submissions.filter((submission) => submission.source === filters.source);
  }

  if (filters.service) {
    const service = filters.service.toLowerCase();
    submissions = submissions.filter((submission) =>
      (submission.archetype_payload?.service || '').toLowerCase() === service
    );
  }

  if (filters.followUp) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    submissions = submissions.filter((submission) => {
      if (filters.followUp === 'none') return !submission.next_follow_up_at;
      if (!submission.next_follow_up_at) return false;

      const followUpDate = new Date(submission.next_follow_up_at);
      if (filters.followUp === 'due') return followUpDate.getTime() <= today.getTime();
      if (filters.followUp === 'scheduled') return followUpDate.getTime() > today.getTime();
      return true;
    });
  }

  if (filters.query) {
    const queryText = filters.query.trim().toLowerCase();
    if (queryText) {
      submissions = submissions.filter((submission) =>
        [submission.first_name, submission.email, submission.archetype_name, submission.archetype_payload?.service]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(queryText))
      );
    }
  }

  return submissions;
}

export async function getDiagnosticSubmissionById(id: string) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('diagnostic_submissions')
    .select(SOURCE_SELECT)
    .eq('id', id)
    .maybeSingle();
  let data: unknown | null = result.data;
  let error = result.error;

  if (error && isMissingSourceColumn(error.message)) {
    const sourceFallbackResult = await supabase
      .from('diagnostic_submissions')
      .select(CRM_SELECT)
      .eq('id', id)
      .maybeSingle();
    data = sourceFallbackResult.data;
    error = sourceFallbackResult.error;
  }

  if (error && isMissingFollowUpCountColumn(error.message)) {
    const baseCrmResult = await supabase
      .from('diagnostic_submissions')
      .select(CRM_BASE_SELECT)
      .eq('id', id)
      .maybeSingle();
    data = baseCrmResult.data;
    error = baseCrmResult.error;
  }

  if (error && isMissingCrmColumn(error.message)) {
    const legacyResult = await supabase
      .from('diagnostic_submissions')
      .select(LEGACY_SELECT)
      .eq('id', id)
      .maybeSingle();
    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  return data ? normalizeSubmission(data as Partial<DiagnosticSubmission>) : null;
}

export async function updateDiagnosticSubmissionCrm(
  id: string,
  values: {
    lead_status?: DiagnosticLeadStatus;
    lead_notes?: string | null;
    follow_up_count?: number;
    next_follow_up_at?: string | null;
    last_contacted_at?: string | null;
  }
) {
  const supabase = createSupabaseServiceClient();
  const updatePayload = {
    ...values,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('diagnostic_submissions')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    if (isMissingFollowUpCountColumn(error.message) && 'follow_up_count' in updatePayload) {
      const { follow_up_count: _followUpCount, ...payloadWithoutFollowUpCount } = updatePayload;
      const retry = await supabase
        .from('diagnostic_submissions')
        .update(payloadWithoutFollowUpCount)
        .eq('id', id);

      if (!retry.error) return;
      throw new Error(retry.error.message);
    }

    throw new Error(error.message);
  }
}

type SourceLeadInput = {
  source: Exclude<DiagnosticLeadSource, 'diagnostic'>;
  firstName: string;
  email: string;
  downloadLink?: string | null;
  metadata?: Record<string, unknown>;
};

const sourceLeadProfiles: Record<
  Exclude<DiagnosticLeadSource, 'diagnostic'>,
  {
    archetypeKey: DiagnosticArchetypeKey;
    archetypeName: string;
    service: string;
    href: string;
    tagline: string;
    diagnosis: string;
    action: string;
  }
> = {
  first_90_days: {
    archetypeKey: 'E',
    archetypeName: 'First 90 Days Checklist',
    service: 'Career Clarity Session',
    href: '/book/clarity',
    tagline: 'Downloaded the First 90 Days Checklist.',
    diagnosis: 'Lead magnet download from a professional looking for first-90-days support.',
    action: 'Send the checklist sequence and invite them into a clarity conversation if they need support.',
  },
  linkedin_headline: {
    archetypeKey: 'B',
    archetypeName: 'SA LinkedIn Headline Builder',
    service: 'CV + LinkedIn Bundle',
    href: '/buy/bundle',
    tagline: 'Downloaded the SA LinkedIn Headline Builder.',
    diagnosis: 'Lead magnet download from a professional interested in LinkedIn positioning.',
    action: 'Send the LinkedIn sequence and offer a profile/CV positioning upgrade.',
  },
  masterclass_waitlist: {
    archetypeKey: 'E',
    archetypeName: 'Masterclass Waitlist',
    service: 'Saturday Masterclass',
    href: '/book/masterclass',
    tagline: 'Joined the Saturday Masterclass waitlist.',
    diagnosis: 'Waitlist lead waiting for bookings to open.',
    action: 'Send confirmation now, then manually send the bookings-open email when dates are live.',
  },
};

function getSourceLeadPayload(input: SourceLeadInput) {
  const profile = sourceLeadProfiles[input.source];
  return {
    first_name: input.firstName,
    email: input.email,
    answers: {},
    score: { A: 0, B: 0, C: 0, D: 0, E: 0 },
    archetype_key: profile.archetypeKey,
    archetype_name: profile.archetypeName,
    archetype_payload: {
      name: profile.archetypeName,
      service: profile.service,
      href: profile.href,
      tagline: profile.tagline,
      diagnosis: profile.diagnosis,
      action: profile.action,
      source: input.source,
      ...(input.metadata || {}),
    },
    source: input.source,
    download_link: input.downloadLink || null,
  };
}

export async function upsertSourceLead(input: SourceLeadInput) {
  const supabase = createSupabaseServiceClient();
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim();
  const now = new Date();
  const payload = getSourceLeadPayload({ ...input, email, firstName });

  const existing = await supabase
    .from('diagnostic_submissions')
    .select('id')
    .eq('email', email)
    .eq('source', input.source)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    if (isMissingSourceColumn(existing.error.message)) return null;
    throw new Error(existing.error.message);
  }

  if (existing.data?.id) {
    const { data, error } = await supabase
      .from('diagnostic_submissions')
      .update({
        first_name: firstName,
        download_link: payload.download_link,
        archetype_payload: payload.archetype_payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.data.id)
      .select(SOURCE_SELECT)
      .single();

    if (error) {
      if (isMissingSourceColumn(error.message)) return null;
      throw new Error(error.message);
    }

    return normalizeSubmission(data as Partial<DiagnosticSubmission>);
  }

  const { data, error } = await supabase
    .from('diagnostic_submissions')
    .insert({
      ...payload,
      lead_status: 'contacted',
      follow_up_count: 0,
      last_contacted_at: now.toISOString(),
      next_follow_up_at: input.source === 'masterclass_waitlist' ? null : addSastDaysAsDateKey(now, 4),
    })
    .select(SOURCE_SELECT)
    .single();

  if (error) {
    if (isMissingSourceColumn(error.message)) return null;
    throw new Error(error.message);
  }

  return normalizeSubmission(data as Partial<DiagnosticSubmission>);
}

export async function deleteDiagnosticSubmission(id: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from('diagnostic_submissions')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteDiagnosticSubmissions(ids: string[]) {
  if (ids.length === 0) return;

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from('diagnostic_submissions')
    .delete()
    .in('id', ids);

  if (error) {
    throw new Error(error.message);
  }
}

function escapeCsv(value: string | number | null | undefined) {
  const stringValue = String(value ?? '');
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function buildDiagnosticCsv(submissions: DiagnosticSubmission[]) {
  const headers = [
    'submitted_at',
    'first_name',
    'email',
    'source',
    'archetype_key',
    'archetype_name',
    'lead_status',
    'follow_up_count',
    'next_follow_up_at',
    'last_contacted_at',
    'lead_notes',
    'download_link',
    'recommended_service',
    'recommended_href',
    'tagline',
    'diagnosis',
    'action',
    'score_a',
    'score_b',
    'score_c',
    'score_d',
    'score_e',
    'q1',
    'q2',
    'q3',
    'q4',
    'q5',
    'q6',
    'q7',
    'q8',
    'q9',
    'q10',
  ];

  const rows = submissions.map((submission) => {
    const scores = submission.score || {};
    const answers = submission.answers || {};
    const payload = submission.archetype_payload || {};

    return [
      submission.submitted_at,
      submission.first_name,
      submission.email,
      submission.source,
      submission.archetype_key,
      submission.archetype_name,
      submission.lead_status,
      submission.follow_up_count,
      submission.next_follow_up_at,
      submission.last_contacted_at,
      submission.lead_notes,
      submission.download_link,
      payload.service || '',
      payload.href || '',
      payload.tagline || '',
      payload.diagnosis || '',
      payload.action || '',
      scores.A ?? 0,
      scores.B ?? 0,
      scores.C ?? 0,
      scores.D ?? 0,
      scores.E ?? 0,
      answers['0'] || '',
      answers['1'] || '',
      answers['2'] || '',
      answers['3'] || '',
      answers['4'] || '',
      answers['5'] || '',
      answers['6'] || '',
      answers['7'] || '',
      answers['8'] || '',
      answers['9'] || '',
    ]
      .map(escapeCsv)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
