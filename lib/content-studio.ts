import { createSupabaseServiceClient } from '@/lib/supabase-server';
import type { ClientOperation } from '@/lib/client-operations';
import type { DiagnosticSubmission } from '@/lib/diagnostic-submissions';

export const contentPillars = ['career_growth', 'leadership', 'personal_brand', 'mentorship'] as const;
export const contentPlatforms = ['linkedin', 'tiktok', 'instagram', 'facebook', 'email'] as const;
export const contentCalendarStatuses = ['idea', 'draft', 'scheduled', 'published'] as const;
export const contentBacklogStatuses = ['idea', 'draft', 'in_progress', 'used'] as const;
export const contentBacklogSources = ['signal_brief', 'create', 'manual'] as const;

export type ContentPillar = (typeof contentPillars)[number];
export type ContentPlatform = (typeof contentPlatforms)[number];
export type ContentCalendarStatus = (typeof contentCalendarStatuses)[number];
export type ContentBacklogStatus = (typeof contentBacklogStatuses)[number];
export type ContentBacklogSource = (typeof contentBacklogSources)[number];

export type DashboardContext = {
  topArchetype: string;
  strongestTheme: string;
  leadsThisWeek: number;
  topService: string;
  topServiceCount: number;
  topServiceProjectedRevenue: number;
  hotLeadsCount: number;
  commonAnxieties: string[];
};

export type ContentCalendarItem = {
  id: string;
  title: string;
  pillar: ContentPillar;
  platform: ContentPlatform;
  publishDate: string;
  status: ContentCalendarStatus;
  draftContent: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContentBacklogItem = {
  id: string;
  title: string;
  pillar: ContentPillar | null;
  platform: ContentPlatform | null;
  status: ContentBacklogStatus;
  source: ContentBacklogSource;
  content: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type ContentCalendarRow = {
  id: string;
  title: string;
  pillar: ContentPillar;
  platform: ContentPlatform;
  publish_date: string;
  status: ContentCalendarStatus;
  draft_content: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ContentBacklogRow = {
  id: string;
  title: string;
  pillar: ContentPillar | null;
  platform: ContentPlatform | null;
  status: ContentBacklogStatus;
  source: ContentBacklogSource;
  content: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentCalendarInput = {
  title: string;
  pillar: ContentPillar;
  platform: ContentPlatform;
  publishDate: string;
  status?: ContentCalendarStatus;
  draftContent?: string | null;
  notes?: string | null;
};

export type ContentBacklogInput = {
  title: string;
  pillar?: ContentPillar | null;
  platform?: ContentPlatform | null;
  status?: ContentBacklogStatus;
  source?: ContentBacklogSource;
  content?: string | null;
  notes?: string | null;
};

const contentSignalByArchetype = {
  A: 'career plateau frustration',
  B: 'quiet career pivoting',
  C: 'burnout and capacity pressure',
  D: 'career transition anxiety',
  E: 'career growth clarity',
} as const;

const archetypeLabels = {
  A: 'Plateaued Performer',
  B: 'Quiet Pivoter',
  C: 'Burnt-Out Builder',
  D: 'Lost Pivoter',
  E: 'Engaged Strategist',
} as const;

const serviceEstimateByName: Record<string, number> = {
  '48-hour cv review': 150,
  'cv review': 150,
  'cv revamp': 400,
  'cover letter': 150,
  'linkedin optimisation': 300,
  'linkedin optimization': 300,
  'cv + linkedin bundle': 500,
  'cv and linkedin bundle': 500,
  'career clarity session': 800,
  'glow up vip package': 1200,
  'saturday masterclass': 450,
};

function normalizeCalendarRow(row: ContentCalendarRow): ContentCalendarItem {
  return {
    id: row.id,
    title: row.title,
    pillar: row.pillar,
    platform: row.platform,
    publishDate: row.publish_date,
    status: row.status,
    draftContent: row.draft_content,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeBacklogRow(row: ContentBacklogRow): ContentBacklogItem {
  return {
    id: row.id,
    title: row.title,
    pillar: row.pillar,
    platform: row.platform,
    status: row.status,
    source: row.source,
    content: row.content,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isMissingContentTable(message?: string) {
  return Boolean(
    message &&
      (message.includes('content_calendar') ||
        message.includes('content_backlog') ||
        message.includes('Could not find the table') ||
        message.includes('does not exist'))
  );
}

function toCalendarPayload(input: ContentCalendarInput) {
  return {
    title: input.title.trim(),
    pillar: input.pillar,
    platform: input.platform,
    publish_date: input.publishDate,
    status: input.status || 'idea',
    draft_content: input.draftContent || null,
    notes: input.notes || null,
  };
}

function toBacklogPayload(input: ContentBacklogInput) {
  return {
    title: input.title.trim(),
    pillar: input.pillar || null,
    platform: input.platform || null,
    status: input.status || 'idea',
    source: input.source || 'manual',
    content: input.content || null,
    notes: input.notes || null,
  };
}

export function isContentPillar(value?: string | null): value is ContentPillar {
  return Boolean(value && contentPillars.includes(value as ContentPillar));
}

export function isContentPlatform(value?: string | null): value is ContentPlatform {
  return Boolean(value && contentPlatforms.includes(value as ContentPlatform));
}

export function isContentCalendarStatus(value?: string | null): value is ContentCalendarStatus {
  return Boolean(value && contentCalendarStatuses.includes(value as ContentCalendarStatus));
}

export function isContentBacklogStatus(value?: string | null): value is ContentBacklogStatus {
  return Boolean(value && contentBacklogStatuses.includes(value as ContentBacklogStatus));
}

export function isContentBacklogSource(value?: string | null): value is ContentBacklogSource {
  return Boolean(value && contentBacklogSources.includes(value as ContentBacklogSource));
}

function getServiceEstimate(serviceName: string) {
  const key = serviceName.toLowerCase().trim();
  return serviceEstimateByName[key] || 0;
}

function getPriorityScore(submission: DiagnosticSubmission) {
  const submittedAt = new Date(submission.submitted_at).getTime();
  const ageDays = Math.floor((Date.now() - submittedAt) / (24 * 60 * 60 * 1000));
  const service = submission.archetype_payload?.service || '';
  let score = 30;

  if (submission.lead_status === 'new') score += 35;
  if (submission.lead_status === 'follow_up_later') score += 15;
  if (submission.next_follow_up_at && new Date(submission.next_follow_up_at).getTime() <= Date.now()) score += 30;
  if (!submission.last_contacted_at) score += 10;
  if (ageDays <= 2) score += 20;
  if (service.includes('Glow Up') || service.includes('Career Clarity')) score += 15;
  if (submission.archetype_key === 'D' || submission.archetype_key === 'C') score += 10;
  if (['discovery_booked', 'paid'].includes(submission.lead_status)) score -= 20;
  if (['not_a_fit', 'archived', 'closed'].includes(submission.lead_status)) score -= 45;

  return Math.max(0, Math.min(score, 100));
}

function getAnxietyThemes(submissions: DiagnosticSubmission[]) {
  const themes = [
    { label: 'career transition anxiety', patterns: ['pivot', 'transition', 'change careers', 'stuck', 'lost'] },
    { label: 'visibility and confidence pressure', patterns: ['visible', 'visibility', 'confidence', 'linkedin', 'brand'] },
    { label: 'burnout and capacity pressure', patterns: ['burnout', 'tired', 'overwhelmed', 'capacity', 'pressure'] },
    { label: 'career plateau frustration', patterns: ['plateau', 'promoted', 'promotion', 'growth', 'stagnant'] },
    { label: 'CV and positioning uncertainty', patterns: ['cv', 'resume', 'positioning', 'profile', 'interview'] },
  ];

  const counts = new Map<string, number>();

  submissions.forEach((submission) => {
    const answerText = Object.values(submission.answers || {}).join(' ').toLowerCase();
    themes.forEach((theme) => {
      if (theme.patterns.some((pattern) => answerText.includes(pattern))) {
        counts.set(theme.label, (counts.get(theme.label) || 0) + 1);
      }
    });

    const archetypeTheme = contentSignalByArchetype[submission.archetype_key];
    counts.set(archetypeTheme, (counts.get(archetypeTheme) || 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => label);
}

export function buildDashboardContext(
  submissions: DiagnosticSubmission[],
  operations: ClientOperation[]
): DashboardContext {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const leadsThisWeek = submissions.filter((submission) => new Date(submission.submitted_at).getTime() >= weekAgo).length;
  const archetypeCounts = submissions.reduce<Record<string, number>>((acc, submission) => {
    acc[submission.archetype_key] = (acc[submission.archetype_key] || 0) + 1;
    return acc;
  }, {});
  const topArchetypeEntry = Object.entries(archetypeCounts).sort((a, b) => b[1] - a[1])[0];
  const topArchetypeKey = topArchetypeEntry?.[0] as keyof typeof archetypeLabels | undefined;
  const topArchetypeCount = topArchetypeEntry?.[1] || 0;
  const topArchetypePercent = submissions.length ? Math.round((topArchetypeCount / submissions.length) * 100) : 0;
  const strongestTheme = topArchetypeKey ? contentSignalByArchetype[topArchetypeKey] : 'not enough diagnostic signal yet';
  const topArchetype = topArchetypeKey
    ? `${archetypeLabels[topArchetypeKey]} (${topArchetypePercent}%)`
    : 'No submissions yet';

  const serviceCounts = submissions.reduce<Record<string, number>>((acc, submission) => {
    const serviceName = submission.archetype_payload?.service || 'No service signal yet';
    acc[serviceName] = (acc[serviceName] || 0) + 1;
    return acc;
  }, {});
  const serviceEntry = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0];
  const topServiceFromLeads = serviceEntry?.[0];
  const topServiceCount = serviceEntry?.[1] || 0;
  const topPaidService = operations
    .filter((operation) => operation.payment.status === 'confirmed')
    .reduce<Record<string, number>>((acc, operation) => {
      acc[operation.serviceTitle] = (acc[operation.serviceTitle] || 0) + 1;
      return acc;
    }, {});
  const topPaidServiceName = Object.entries(topPaidService).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topService = topServiceFromLeads || topPaidServiceName || 'No service demand yet';
  const topServiceProjectedRevenue = topServiceCount * getServiceEstimate(topService);
  const hotLeadsCount = submissions.filter(
    (submission) =>
      !['paid', 'archived', 'not_a_fit', 'closed'].includes(submission.lead_status) &&
      (submission.lead_status === 'discovery_booked' || getPriorityScore(submission) >= 80)
  ).length;
  const commonAnxieties = getAnxietyThemes(submissions);

  return {
    topArchetype,
    strongestTheme,
    leadsThisWeek,
    topService,
    topServiceCount,
    topServiceProjectedRevenue,
    hotLeadsCount,
    commonAnxieties: commonAnxieties.length ? commonAnxieties : ['not enough diagnostic signal yet'],
  };
}

export async function listContentCalendarItems() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('content_calendar')
    .select('id, title, pillar, platform, publish_date, status, draft_content, notes, created_at, updated_at')
    .order('publish_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingContentTable(error.message)) return [];
    throw new Error(error.message);
  }
  return ((data || []) as ContentCalendarRow[]).map(normalizeCalendarRow);
}

export async function listContentBacklogItems() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('content_backlog')
    .select('id, title, pillar, platform, status, source, content, notes, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingContentTable(error.message)) return [];
    throw new Error(error.message);
  }
  return ((data || []) as ContentBacklogRow[]).map(normalizeBacklogRow);
}

export async function createContentCalendarItem(input: ContentCalendarInput) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('content_calendar')
    .insert(toCalendarPayload(input))
    .select('id, title, pillar, platform, publish_date, status, draft_content, notes, created_at, updated_at')
    .single();

  if (error) throw new Error(error.message);
  return normalizeCalendarRow(data as ContentCalendarRow);
}

export async function updateContentCalendarItem(id: string, input: Partial<ContentCalendarInput>) {
  const supabase = createSupabaseServiceClient();
  const payload: Record<string, string | null> = {};

  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.pillar !== undefined) payload.pillar = input.pillar;
  if (input.platform !== undefined) payload.platform = input.platform;
  if (input.publishDate !== undefined) payload.publish_date = input.publishDate;
  if (input.status !== undefined) payload.status = input.status;
  if (input.draftContent !== undefined) payload.draft_content = input.draftContent || null;
  if (input.notes !== undefined) payload.notes = input.notes || null;

  const { data, error } = await supabase
    .from('content_calendar')
    .update(payload)
    .eq('id', id)
    .select('id, title, pillar, platform, publish_date, status, draft_content, notes, created_at, updated_at')
    .single();

  if (error) throw new Error(error.message);
  return normalizeCalendarRow(data as ContentCalendarRow);
}

export async function deleteContentCalendarItem(id: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from('content_calendar').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function createContentBacklogItem(input: ContentBacklogInput) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('content_backlog')
    .insert(toBacklogPayload(input))
    .select('id, title, pillar, platform, status, source, content, notes, created_at, updated_at')
    .single();

  if (error) throw new Error(error.message);
  return normalizeBacklogRow(data as ContentBacklogRow);
}

export async function updateContentBacklogItem(id: string, input: Partial<ContentBacklogInput>) {
  const supabase = createSupabaseServiceClient();
  const payload: Record<string, string | null> = {};

  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.pillar !== undefined) payload.pillar = input.pillar || null;
  if (input.platform !== undefined) payload.platform = input.platform || null;
  if (input.status !== undefined) payload.status = input.status;
  if (input.source !== undefined) payload.source = input.source;
  if (input.content !== undefined) payload.content = input.content || null;
  if (input.notes !== undefined) payload.notes = input.notes || null;

  const { data, error } = await supabase
    .from('content_backlog')
    .update(payload)
    .eq('id', id)
    .select('id, title, pillar, platform, status, source, content, notes, created_at, updated_at')
    .single();

  if (error) throw new Error(error.message);
  return normalizeBacklogRow(data as ContentBacklogRow);
}

export async function deleteContentBacklogItem(id: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from('content_backlog').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
