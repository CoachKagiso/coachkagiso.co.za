import type { SupabaseClient } from '@supabase/supabase-js';
import { EMAIL_TEMPLATES, type EmailTemplate } from '@/lib/email-templates';
import {
  DEFAULT_OPENROUTER_PRIMARY_MODEL,
  DEFAULT_OPENROUTER_SECONDARY_MODEL,
} from '@/lib/ai-models';
import {
  DEFAULT_ASSISTANT_CONVERSATIONS,
  DEFAULT_ASSISTANT_PREFERENCES,
  type AssistantConversationStore,
  type AssistantPreferences,
} from '@/lib/assistant-preferences';

export type SettingsMap = Record<string, unknown>;

export type BusinessProfileSettings = {
  name: string;
  email: string;
  website: string;
  timezone: string;
  profilePhotoUrl?: string;
};

export type BusinessHourBlock = {
  start: string;
  end: string;
};

export type BusinessHoursSettings = {
  weekdays: BusinessHourBlock;
  saturday: BusinessHourBlock | null;
  sunday: null;
};

export type ServiceSetting = {
  name: string;
  slug: string;
  price: number;
  turnaround: string;
  active: boolean;
};

export type AiConfigSettings = {
  primary_model: string;
  secondary_model?: string;
  model_provider: 'zai' | 'openrouter';
  zai_api_key?: string;
  openrouter_api_key?: string;
  test_mode: boolean;
};

export type NotificationSettings = {
  new_lead: boolean;
  follow_up_due: boolean;
  lead_magnet_download: boolean;
  masterclass_reservation: boolean;
  overdue_delivery: boolean;
  payment_confirmed: boolean;
  intake_submitted: boolean;
  cal_booking: boolean;
  sent_email_log: boolean;
};

export type GoalHorizon = 'short_term' | 'ninety_day' | 'one_year' | 'long_term';
export type GoalCategory =
  | 'clients'
  | 'revenue'
  | 'brand_visibility'
  | 'social_growth'
  | 'content'
  | 'operations';
export type GoalStatus = 'not_started' | 'active' | 'at_risk' | 'achieved' | 'paused';
export type GoalLinkedArea = 'leads' | 'pipeline' | 'clients' | 'finance' | 'content' | 'calendar' | 'messages' | 'tasks';

export type BusinessGoal = {
  id: string;
  title: string;
  horizon: GoalHorizon;
  category: GoalCategory;
  metricLabel: string;
  currentValue: number;
  targetValue: number;
  deadline: string;
  priority: number;
  status: GoalStatus;
  linkedArea: GoalLinkedArea;
  notes: string;
};

export type BusinessGoalsSettings = {
  goals: BusinessGoal[];
  updatedAt?: string | null;
};

export type {
  AssistantConversationStore,
  AssistantPreferences,
};

export type StoredEmailTemplate = EmailTemplate & {
  active: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type EmailTemplateRow = {
  template_id: string;
  archetype_name: string;
  subject: string;
  body: string;
  recommended_service: string;
  booking_key: string;
  source?: string | null;
  download_key?: string | null;
  variant: number;
  sequence_index: number;
  stage_label: string;
  active: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export const DEFAULT_SERVICES: ServiceSetting[] = [
  { name: '48-Hour CV Review', slug: 'cv-review-48hr', price: 150, turnaround: '2 working days', active: true },
  { name: 'CV Revamp', slug: 'cv-revamp', price: 400, turnaround: '5 working days', active: true },
  { name: 'Cover Letter', slug: 'cover-letter', price: 150, turnaround: '5 working days', active: true },
  { name: 'LinkedIn Optimisation', slug: 'linkedin-optimisation', price: 300, turnaround: '5 working days', active: true },
  { name: 'CV + LinkedIn Bundle', slug: 'cv-linkedin-bundle', price: 500, turnaround: '7 working days', active: true },
  { name: 'Career Clarity Session', slug: 'career-clarity', price: 800, turnaround: 'Session-based', active: true },
  { name: 'Glow Up VIP Package', slug: 'glow-up-vip', price: 1200, turnaround: '30 days', active: true },
  { name: 'Saturday Masterclass', slug: 'saturday-masterclass', price: 450, turnaround: 'Cohort-based', active: true },
  { name: 'First 90 Days Coaching', slug: 'first-90-days', price: 900, turnaround: 'Session-based', active: true },
  { name: 'Leadership Launchpad', slug: 'leadership-launchpad', price: 2000, turnaround: 'Session-based', active: true },
];

export const DEFAULT_BUSINESS_GOALS: BusinessGoalsSettings = {
  goals: [],
  updatedAt: null,
};

export const DEFAULT_SETTINGS = {
  business_profile: {
    name: 'Coach Kagiso',
    email: 'hello@coachkagiso.co.za',
    website: 'coachkagiso.co.za',
    timezone: 'Africa/Johannesburg',
    profilePhotoUrl: '/images/author/ck-profile.png',
  } satisfies BusinessProfileSettings,
  services: DEFAULT_SERVICES,
  business_hours: {
    weekdays: { start: '17:30', end: '19:00' },
    saturday: { start: '09:00', end: '12:00' },
    sunday: null,
  } satisfies BusinessHoursSettings,
  ai_config: {
    primary_model: DEFAULT_OPENROUTER_PRIMARY_MODEL,
    secondary_model: DEFAULT_OPENROUTER_SECONDARY_MODEL,
    model_provider: 'openrouter',
    zai_api_key: '',
    openrouter_api_key: '',
    test_mode: false,
  } satisfies AiConfigSettings,
  notifications: {
    new_lead: true,
    follow_up_due: true,
    lead_magnet_download: true,
    masterclass_reservation: true,
    overdue_delivery: true,
    payment_confirmed: true,
    intake_submitted: true,
    cal_booking: true,
    sent_email_log: false,
  } satisfies NotificationSettings,
  business_goals: DEFAULT_BUSINESS_GOALS satisfies BusinessGoalsSettings,
  assistant_preferences: DEFAULT_ASSISTANT_PREFERENCES satisfies AssistantPreferences,
  assistant_conversations: DEFAULT_ASSISTANT_CONVERSATIONS satisfies AssistantConversationStore,
} as const;

export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

function isMissingSettingsTableError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String((error as { message?: unknown }).message || '') : '';
  const code = 'code' in error ? String((error as { code?: unknown }).code || '') : '';
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    message.includes("Could not find the table 'public.settings'") ||
    message.includes("Could not find the table 'public.email_templates'") ||
    message.includes('relation "public.settings" does not exist') ||
    message.includes('relation "public.email_templates" does not exist')
  );
}

function isMissingEmailTemplateExtensionError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String((error as { message?: unknown }).message || '') : '';
  return (
    message.includes('source') ||
    message.includes('download_key') ||
    message.includes("Could not find the 'source' column") ||
    message.includes("Could not find the 'download_key' column") ||
    message.includes('schema cache')
  );
}

export function mergeSettings(settings: SettingsMap): SettingsMap {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
  };
}

export function stripSecretsFromSettings(settings: SettingsMap): SettingsMap {
  const aiConfig = {
    ...(DEFAULT_SETTINGS.ai_config as AiConfigSettings),
    ...((settings.ai_config || {}) as Partial<AiConfigSettings>),
    zai_api_key: '',
    openrouter_api_key: '',
  };

  return {
    ...settings,
    ai_config: aiConfig,
  };
}

const goalHorizons: GoalHorizon[] = ['short_term', 'ninety_day', 'one_year', 'long_term'];
const goalCategories: GoalCategory[] = ['clients', 'revenue', 'brand_visibility', 'social_growth', 'content', 'operations'];
const goalStatuses: GoalStatus[] = ['not_started', 'active', 'at_risk', 'achieved', 'paused'];
const goalLinkedAreas: GoalLinkedArea[] = ['leads', 'pipeline', 'clients', 'finance', 'content', 'calendar', 'messages', 'tasks'];

function cleanString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function cleanNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function cleanPriority(value: unknown) {
  const priority = Math.round(cleanNumber(value, 3));
  return Math.max(1, Math.min(priority, 5));
}

function pickValue<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function normalizeBusinessGoalsSettings(value: unknown): BusinessGoalsSettings {
  const source = (value && typeof value === 'object' ? value : {}) as Partial<BusinessGoalsSettings>;
  const rawGoals = Array.isArray(source.goals) ? source.goals : [];

  return {
    goals: rawGoals.slice(0, 40).map((goal, index) => {
      const item = (goal && typeof goal === 'object' ? goal : {}) as Partial<BusinessGoal>;
      return {
        id: cleanString(item.id, `goal-${index + 1}`) || `goal-${index + 1}`,
        title: cleanString(item.title, 'Untitled goal') || 'Untitled goal',
        horizon: pickValue(item.horizon, goalHorizons, 'ninety_day'),
        category: pickValue(item.category, goalCategories, 'clients'),
        metricLabel: cleanString(item.metricLabel, 'Progress') || 'Progress',
        currentValue: cleanNumber(item.currentValue, 0),
        targetValue: cleanNumber(item.targetValue, 0),
        deadline: cleanString(item.deadline, ''),
        priority: cleanPriority(item.priority),
        status: pickValue(item.status, goalStatuses, 'active'),
        linkedArea: pickValue(item.linkedArea, goalLinkedAreas, 'leads'),
        notes: cleanString(item.notes, ''),
      };
    }),
    updatedAt: cleanString(source.updatedAt, '') || null,
  };
}

function toEmailTemplateRow(template: EmailTemplate) {
  return {
    template_id: template.id,
    archetype_name: template.archetypeName,
    subject: template.subject,
    body: template.body,
    recommended_service: template.recommendedService,
    booking_key: template.bookingKey,
    source: template.source || 'diagnostic',
    download_key: template.downloadKey || null,
    variant: template.variant,
    sequence_index: template.sequenceIndex,
    stage_label: template.stageLabel,
    active: true,
  };
}

function toLegacyEmailTemplateRow(template: EmailTemplate) {
  const { source: _source, download_key: _downloadKey, ...row } = toEmailTemplateRow(template);
  return row;
}

export function mapEmailTemplateRow(row: EmailTemplateRow): StoredEmailTemplate {
  const fallback = EMAIL_TEMPLATES.find((template) => template.id === row.template_id);
  return {
    id: row.template_id as EmailTemplate['id'],
    archetypeName: row.archetype_name,
    subject: row.subject,
    body: row.body,
    recommendedService: row.recommended_service,
    bookingKey: row.booking_key,
    source: fallback?.source || (row.source as EmailTemplate['source']) || 'diagnostic',
    downloadKey: fallback?.downloadKey || row.download_key || undefined,
    manualOnly: fallback?.manualOnly,
    variant: row.variant as EmailTemplate['variant'],
    sequenceIndex: row.sequence_index as EmailTemplate['sequenceIndex'],
    stageLabel: row.stage_label as EmailTemplate['stageLabel'],
    active: row.active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function seedSettings(supabase: SupabaseClient) {
  const rows = Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({
    key,
    value,
  }));

  const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key', ignoreDuplicates: true });
  if (isMissingSettingsTableError(error)) return;
  if (error) throw new Error(error.message);
}

export async function loadSettings(supabase: SupabaseClient) {
  const { data, error } = await supabase.from('settings').select('key, value');
  if (isMissingSettingsTableError(error)) return DEFAULT_SETTINGS;
  if (error) throw new Error(error.message);

  const settings = Object.fromEntries((data || []).map((row: { key: string; value: unknown }) => [row.key, row.value]));
  return mergeSettings(settings);
}

export async function upsertSetting(supabase: SupabaseClient, key: string, value: unknown) {
  if (!SETTING_KEYS.includes(key)) {
    throw new Error('Invalid settings key.');
  }

  const { error } = await supabase
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (error) throw new Error(error.message);
}

export async function seedEmailTemplates(supabase: SupabaseClient) {
  const { error } = await supabase
    .from('email_templates')
    .upsert(EMAIL_TEMPLATES.map(toEmailTemplateRow), { onConflict: 'template_id', ignoreDuplicates: true });

  if (isMissingSettingsTableError(error)) return;
  if (isMissingEmailTemplateExtensionError(error)) {
    const legacy = await supabase
      .from('email_templates')
      .upsert(EMAIL_TEMPLATES.map(toLegacyEmailTemplateRow), { onConflict: 'template_id', ignoreDuplicates: true });
    if (isMissingSettingsTableError(legacy.error)) return;
    if (legacy.error) throw new Error(legacy.error.message);
    return;
  }
  if (error) throw new Error(error.message);
}

export async function listStoredEmailTemplates(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('archetype_name', { ascending: true })
    .order('sequence_index', { ascending: true });

  if (isMissingSettingsTableError(error)) {
    return EMAIL_TEMPLATES.map((template) => ({ ...template, active: true }));
  }
  if (error) throw new Error(error.message);

  const hasMissingDefaults =
    !data?.length || EMAIL_TEMPLATES.some((template) => !data.some((row) => row.template_id === template.id));

  if (hasMissingDefaults) {
    await seedEmailTemplates(supabase);
    const seeded = await supabase
      .from('email_templates')
      .select('*')
      .order('archetype_name', { ascending: true })
      .order('sequence_index', { ascending: true });
    if (seeded.error) throw new Error(seeded.error.message);
    return (seeded.data || []).map((row) => mapEmailTemplateRow(row as EmailTemplateRow));
  }

  return data.map((row) => mapEmailTemplateRow(row as EmailTemplateRow));
}

export async function updateStoredEmailTemplate(
  supabase: SupabaseClient,
  templateId: string,
  updates: { subject?: string; body?: string; active?: boolean },
) {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof updates.subject === 'string') payload.subject = updates.subject;
  if (typeof updates.body === 'string') payload.body = updates.body;
  if (typeof updates.active === 'boolean') payload.active = updates.active;

  const { data, error } = await supabase
    .from('email_templates')
    .update(payload)
    .eq('template_id', templateId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return mapEmailTemplateRow(data as EmailTemplateRow);
}

export async function setArchetypeTemplatesActive(supabase: SupabaseClient, archetypeName: string, active: boolean) {
  const { data, error } = await supabase
    .from('email_templates')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('archetype_name', archetypeName)
    .select('*');

  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapEmailTemplateRow(row as EmailTemplateRow));
}
