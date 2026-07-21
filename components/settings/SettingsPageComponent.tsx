'use client';

import { useMemo, useRef, useState } from 'react';
import type { WheelEvent } from 'react';
import {
  Bell,
  Bot,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Clock3,
  Eye,
  EyeOff,
  Flag,
  Loader2,
  Mail,
  Plus,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Target,
  Trash2,
  UserRound,
} from 'lucide-react';
import {
  DEFAULT_ASSISTANT_PREFERENCES,
  assistantPersonalityProfiles,
  normalizeAssistantPreferences,
} from '@/lib/assistant-preferences';
import { EMAIL_TEMPLATES, getBookingLink, getDownloadLink } from '@/lib/email-templates';
import { leadSourceLabels, normalizeLeadSource } from '@/lib/lead-sources';
import DashboardProfileAvatar from '@/components/dashboard/DashboardProfileAvatar';
import FilterDropdown from '@/components/FilterDropdown';
import DashboardTimePicker from '@/components/DashboardTimePicker';
import { normalizeBusinessGoalsSettings } from '@/lib/settings';
import {
  DEFAULT_OPENROUTER_PRIMARY_MODEL,
  DEFAULT_OPENROUTER_SECONDARY_MODEL,
  normalizeOpenRouterModel,
  OPENROUTER_MODEL_OPTIONS,
} from '@/lib/ai-models';
import type {
  AiConfigSettings,
  AssistantPreferences,
  BusinessGoal,
  BusinessGoalsSettings,
  BusinessHoursSettings,
  BusinessProfileSettings,
  GoalCategory,
  GoalHorizon,
  GoalLinkedArea,
  GoalStatus,
  NotificationSettings,
  ServiceSetting,
  SettingsMap,
  StoredEmailTemplate,
} from '@/lib/settings';

type SettingsPageComponentProps = {
  adminKey: string;
  settings: SettingsMap;
  emailTemplates: StoredEmailTemplate[];
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function containScrollableWheel<T extends HTMLElement>(event: WheelEvent<T>) {
  const target = event.currentTarget;
  if (target.scrollHeight <= target.clientHeight) return;

  const deltaY =
    event.deltaMode === 1
      ? event.deltaY * 16
      : event.deltaMode === 2
        ? event.deltaY * target.clientHeight
        : event.deltaY;

  event.preventDefault();
  event.stopPropagation();
  target.scrollTop += deltaY;
}

const settingsNavItems = [
  {
    id: 'business_profile',
    title: 'Business Profile',
    description: 'Identity, email, website',
    icon: UserRound,
  },
  {
    id: 'business_goals',
    title: 'Goals',
    description: 'Targets, timelines, focus',
    icon: Flag,
  },
  {
    id: 'services',
    title: 'Services',
    description: 'Prices, turnaround, active state',
    icon: BriefcaseBusiness,
  },
  {
    id: 'business_hours',
    title: 'Business Hours',
    description: 'Weekly coaching windows',
    icon: Clock3,
  },
  {
    id: 'email_templates',
    title: 'Email Templates',
    description: 'Lead sequences by archetype',
    icon: Mail,
  },
  {
    id: 'ai_config',
    title: 'AI Model',
    description: 'OpenRouter model and API key',
    icon: Sparkles,
  },
  {
    id: 'assistant_preferences',
    title: 'AI Assistant',
    description: 'Personality, memory, behavior',
    icon: Bot,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Dashboard event alerts',
    icon: Bell,
  },
] as const;

type SettingsSectionId = (typeof settingsNavItems)[number]['id'];

const sectionDefaults = {
  business_profile: {
    name: 'Coach Kagiso',
    email: 'hello@coachkagiso.co.za',
    website: 'coachkagiso.co.za',
    timezone: 'Africa/Johannesburg',
  },
  business_hours: {
    weekdays: { start: '17:30', end: '19:00' },
    saturday: { start: '09:00', end: '12:00' },
    sunday: null,
  },
  ai_config: {
    primary_model: DEFAULT_OPENROUTER_PRIMARY_MODEL,
    secondary_model: DEFAULT_OPENROUTER_SECONDARY_MODEL,
    model_provider: 'openrouter',
    test_mode: false,
    zai_api_key: '',
    openrouter_api_key: '',
  },
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
  },
  assistant_preferences: DEFAULT_ASSISTANT_PREFERENCES,
} as const;

const notificationRows = [
  ['new_lead', 'New lead', 'New diagnostic submission arrives'],
  ['follow_up_due', 'Follow-up due', "Lead's follow-up date is today"],
  ['lead_magnet_download', 'Lead magnet download', 'A visitor requests a downloadable resource'],
  ['masterclass_reservation', 'Masterclass reservation', 'A visitor joins the masterclass reserve list'],
  ['overdue_delivery', 'Overdue delivery', "Client's delivery is past deadline"],
  ['payment_confirmed', 'Payment confirmed', 'PayFast confirms a payment'],
  ['intake_submitted', 'Intake submitted', 'A paid client submits their intake brief'],
  ['cal_booking', 'Cal.com booking', 'New session booked via Cal.com'],
  ['sent_email_log', 'Sent email log', 'Record added to sent_emails'],
] as const;

const goalHorizonOptions: { value: GoalHorizon; label: string }[] = [
  { value: 'short_term', label: 'Short term' },
  { value: 'ninety_day', label: '90-day' },
  { value: 'one_year', label: '12-month' },
  { value: 'long_term', label: 'Long term' },
];

const goalCategoryOptions: { value: GoalCategory; label: string }[] = [
  { value: 'clients', label: 'Clients' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'brand_visibility', label: 'Brand visibility' },
  { value: 'social_growth', label: 'Social growth' },
  { value: 'content', label: 'Content' },
  { value: 'operations', label: 'Operations' },
];

const goalStatusOptions: { value: GoalStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'active', label: 'Active' },
  { value: 'at_risk', label: 'At risk' },
  { value: 'achieved', label: 'Achieved' },
  { value: 'paused', label: 'Paused' },
];

const goalLinkedAreaOptions: { value: GoalLinkedArea; label: string }[] = [
  { value: 'leads', label: 'Leads' },
  { value: 'pipeline', label: 'Pipeline' },
  { value: 'clients', label: 'Clients' },
  { value: 'finance', label: 'Finance' },
  { value: 'content', label: 'Content' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'messages', label: 'Messages' },
  { value: 'tasks', label: 'Tasks' },
];

function coerceArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function getSetting<T>(settings: SettingsMap, key: string, fallback: T): T {
  return {
    ...fallback,
    ...((settings[key] || {}) as Partial<T>),
  };
}

async function postJson<T>(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

async function patchJson<T>(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createGoal(): BusinessGoal {
  return {
    id: createId('goal'),
    title: 'New business goal',
    horizon: 'ninety_day',
    category: 'clients',
    metricLabel: 'Target',
    currentValue: 0,
    targetValue: 0,
    deadline: '',
    priority: 3,
    status: 'active',
    linkedArea: 'leads',
    notes: '',
  };
}

function getGoalProgress(goal: BusinessGoal) {
  if (!goal.targetValue || goal.targetValue <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)));
}

function getGoalStatusClass(status: GoalStatus) {
  if (status === 'achieved') return 'border-[#0F766E]/25 bg-[#ECFDF5] text-[#0F766E]';
  if (status === 'at_risk') return 'border-[#A24E37]/25 bg-[#FEF2F2] text-[#A24E37]';
  if (status === 'paused') return 'border-[#6B6B6B]/20 bg-[#F3F4F6] text-[#6B6B6B]';
  if (status === 'not_started') return 'border-[#8C7466]/25 bg-[#F8F6F4] text-[#8C7466]';
  return 'border-[#142334]/15 bg-[#EAF0F5] text-[#142334]';
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-[#142334]' : 'bg-[#D1D5DB]'}`}
      aria-pressed={checked}
      aria-label={label}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
          checked ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  );
}

function SettingsPanel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof UserRound;
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-[min(760px,calc(100vh-190px))] rounded-[16px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between gap-4 border-b border-[#F0EDE8] px-5 py-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[8px] bg-[#F5F3EE] text-[#142334]">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8C7466]">Settings</p>
            <h2 className="mt-1 truncate font-serif text-[24px] leading-tight text-[#142334]">{title}</h2>
          </div>
        </div>
      </div>
      <div className="p-5 md:p-6">
        {children}
      </div>
    </section>
  );
}

function SaveButton({ state, label }: { state: SaveState; label: string }) {
  return (
    <button type="submit" disabled={state === 'saving'} className="studio-primary-button">
      {state === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {state === 'saving' ? 'Saving...' : state === 'saved' ? 'Saved' : label}
    </button>
  );
}

function StatusMessage({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  return (
    <p className={`text-[13px] font-semibold ${state === 'error' ? 'text-[#A24E37]' : 'text-[#0F766E]'}`}>
      {state === 'error' ? 'Could not save. Try again.' : 'Saved.'}
    </p>
  );
}

export default function SettingsPageComponent({
  adminKey,
  settings,
  emailTemplates,
}: SettingsPageComponentProps) {
  const [profile, setProfile] = useState<BusinessProfileSettings>(
    getSetting(settings, 'business_profile', sectionDefaults.business_profile),
  );
  const [services, setServices] = useState<ServiceSetting[]>(coerceArray(settings.services, []));
  const [hours, setHours] = useState<BusinessHoursSettings>(
    getSetting(settings, 'business_hours', sectionDefaults.business_hours),
  );
  const [aiConfig, setAiConfig] = useState<AiConfigSettings>(
    getSetting(settings, 'ai_config', sectionDefaults.ai_config),
  );
  const [assistantPreferences, setAssistantPreferences] = useState<AssistantPreferences>(
    normalizeAssistantPreferences(getSetting(settings, 'assistant_preferences', sectionDefaults.assistant_preferences)),
  );
  const [businessGoals, setBusinessGoals] = useState<BusinessGoalsSettings>(
    normalizeBusinessGoalsSettings(settings.business_goals),
  );
  const [notifications, setNotifications] = useState<NotificationSettings>(
    getSetting(settings, 'notifications', sectionDefaults.notifications),
  );
  const [templates, setTemplates] = useState<StoredEmailTemplate[]>(emailTemplates);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [previewTemplate, setPreviewTemplate] = useState<StoredEmailTemplate | null>(null);
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  const [testStatus, setTestStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('business_profile');
  const [photoUploadState, setPhotoUploadState] = useState<SaveState>('idle');

  const templateSections = useMemo(() => {
    function groupByArchetype(sectionTemplates: StoredEmailTemplate[]) {
      return sectionTemplates.reduce<Record<string, StoredEmailTemplate[]>>((acc, template) => {
        acc[template.archetypeName] = acc[template.archetypeName] || [];
        acc[template.archetypeName].push(template);
        return acc;
      }, {});
    }

    const diagnostics = templates.filter((template) => normalizeLeadSource(template.source) === 'diagnostic');
    const leadMagnets = templates.filter((template) => ['first_90_days', 'linkedin_headline'].includes(normalizeLeadSource(template.source)));
    const waitlist = templates.filter((template) => normalizeLeadSource(template.source) === 'masterclass_waitlist');

    return [
      { title: 'DIAGNOSTICS', groups: groupByArchetype(diagnostics) },
      { title: 'LEAD MAGNETS', groups: groupByArchetype(leadMagnets) },
      { title: 'MASTERCLASS WAITLIST', groups: groupByArchetype(waitlist) },
    ];
  }, [templates]);

  const goalSummary = useMemo(() => {
    const activeGoals = businessGoals.goals.filter((goal) => !['achieved', 'paused'].includes(goal.status));
    const highestPriority = [...activeGoals].sort((a, b) => b.priority - a.priority)[0];
    return {
      active: activeGoals.length,
      atRisk: businessGoals.goals.filter((goal) => goal.status === 'at_risk').length,
      achieved: businessGoals.goals.filter((goal) => goal.status === 'achieved').length,
      highestPriority,
    };
  }, [businessGoals]);
  const primaryModel = normalizeOpenRouterModel(aiConfig.primary_model, DEFAULT_OPENROUTER_PRIMARY_MODEL);
  const secondaryModel = normalizeOpenRouterModel(aiConfig.secondary_model, DEFAULT_OPENROUTER_SECONDARY_MODEL);

  async function saveSetting(key: string, value: unknown) {
    setSaveStates((current) => ({ ...current, [key]: 'saving' }));
    try {
      await postJson('/api/settings', { adminKey, settingKey: key, value });
      setSaveStates((current) => ({ ...current, [key]: 'saved' }));
      window.setTimeout(() => setSaveStates((current) => ({ ...current, [key]: 'idle' })), 1800);
    } catch {
      setSaveStates((current) => ({ ...current, [key]: 'error' }));
    }
  }

  async function saveTemplate(template: StoredEmailTemplate) {
    setSaveStates((current) => ({ ...current, [template.id]: 'saving' }));
    try {
      const data = await patchJson<{ template: StoredEmailTemplate }>('/api/email/templates', {
        adminKey,
        templateId: template.id,
        subject: template.subject,
        body: template.body,
      });
      setTemplates((current) => current.map((item) => (item.id === template.id ? data.template : item)));
      setSaveStates((current) => ({ ...current, [template.id]: 'saved' }));
      window.setTimeout(() => setSaveStates((current) => ({ ...current, [template.id]: 'idle' })), 1800);
    } catch {
      setSaveStates((current) => ({ ...current, [template.id]: 'error' }));
    }
  }

  async function resetTemplate(template: StoredEmailTemplate) {
    const confirmed = window.confirm('Reset this template to the default copy?');
    if (!confirmed) return;

    const data = await patchJson<{ template: StoredEmailTemplate }>('/api/email/templates', {
      adminKey,
      intent: 'reset_default',
      templateId: template.id,
    });
    setTemplates((current) => current.map((item) => (item.id === template.id ? data.template : item)));
  }

  async function setArchetypeActive(archetypeName: string, active: boolean) {
    const data = await patchJson<{ templates: StoredEmailTemplate[] }>('/api/email/templates', {
      adminKey,
      intent: 'set_archetype_active',
      archetypeName,
      active,
    });
    setTemplates((current) =>
      current.map((template) => data.templates.find((item) => item.id === template.id) || template),
    );
  }

  function updateTemplate(id: string, updates: Partial<StoredEmailTemplate>) {
    setTemplates((current) => current.map((template) => (template.id === id ? { ...template, ...updates } : template)));
  }

  function applyAssistantPersonality(tone: AssistantPreferences['tone']) {
    const profile = assistantPersonalityProfiles[tone];
    setAssistantPreferences((current) => ({
      ...current,
      tone,
      conversationStyle: profile.conversationStyle,
      behaviorInstructions: profile.behaviorInstructions,
      avoidInstructions: profile.avoidInstructions,
      greetNaturally: tone !== 'focused_operator',
      allowEmojis: tone !== 'focused_operator',
    }));
  }

  function updateBusinessGoal(id: string, updates: Partial<BusinessGoal>) {
    setBusinessGoals((current) => ({
      ...current,
      goals: current.goals.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal)),
    }));
  }

  function addBusinessGoal() {
    setBusinessGoals((current) => ({
      ...current,
      goals: [...current.goals, createGoal()],
    }));
  }

  function removeBusinessGoal(id: string) {
    setBusinessGoals((current) => ({
      ...current,
      goals: current.goals.filter((goal) => goal.id !== id),
    }));
  }

  function saveBusinessGoals() {
    const nextGoals = normalizeBusinessGoalsSettings({
      ...businessGoals,
      updatedAt: new Date().toISOString(),
    });
    setBusinessGoals(nextGoals);
    void saveSetting('business_goals', nextGoals);
  }

  function getOpenRouterConfig(): AiConfigSettings {
    return {
      ...aiConfig,
      primary_model: primaryModel,
      secondary_model: secondaryModel,
      model_provider: 'openrouter',
      test_mode: false,
    };
  }

  function saveAiConfiguration() {
    const nextConfig = getOpenRouterConfig();
    setAiConfig(nextConfig);
    void saveSetting('ai_config', nextConfig);
  }

  async function testAiConnection() {
    setTestStatus(null);
    setSaveStates((current) => ({ ...current, openrouter_test: 'saving' }));

    try {
      await postJson('/api/settings/ai-test', {
        adminKey,
        apiKey: aiConfig.openrouter_api_key,
        model: primaryModel,
      });
      setTestStatus({
        tone: 'success',
        message: `Connected to ${primaryModel}`,
      });
      setSaveStates((current) => ({ ...current, openrouter_test: 'idle' }));
    } catch (error) {
      setTestStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Connection failed. Check the API key.',
      });
      setSaveStates((current) => ({ ...current, openrouter_test: 'idle' }));
    }
  }

  function renderPreview(template: StoredEmailTemplate) {
    return template.body
      .split('{{firstName}}')
      .join('Thabo')
      .split('[BOOKING LINK]')
      .join(getBookingLink(template.bookingKey))
      .split('[DOWNLOAD LINK]')
      .join(template.downloadKey ? getDownloadLink(template.downloadKey) : 'Download link');
  }

  async function uploadProfilePhoto(file: File) {
    setPhotoUploadState('saving');
    const formData = new FormData();
    formData.set('adminKey', adminKey);
    formData.set('photo', file);

    try {
      const response = await fetch('/api/settings/profile-photo', {
        method: 'POST',
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as {
        profilePhotoUrl?: string;
        businessProfile?: BusinessProfileSettings;
        error?: string;
      };
      if (!response.ok || !data.profilePhotoUrl) throw new Error(data.error || 'Could not upload photo.');

      const nextProfile = data.businessProfile || { ...profile, profilePhotoUrl: data.profilePhotoUrl };
      setProfile(nextProfile);
      window.dispatchEvent(new CustomEvent('coach-profile-photo-updated', {
        detail: { profilePhotoUrl: data.profilePhotoUrl },
      }));
      setPhotoUploadState('saved');
      window.setTimeout(() => setPhotoUploadState('idle'), 1800);
    } catch {
      setPhotoUploadState('error');
    }
  }

  return (
    <div className="min-h-screen rounded-[8px] bg-[#F5F3EE] p-3 md:p-4">
      <div className="mx-auto grid max-w-[1240px] gap-4">
        <header className="flex flex-col gap-3 rounded-[16px] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">Settings / Overview</p>
            <h1 className="mt-2 font-serif text-[34px] leading-tight text-[#142334]">Settings</h1>
          </div>
          <p className="max-w-[360px] text-[13px] leading-relaxed text-[#6B6B6B]">Configure the dashboard one section at a time without chasing cards down the page.</p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <nav className="flex gap-2 overflow-x-auto rounded-[16px] bg-white p-2 shadow-[0_1px_3px_rgba(0,0,0,0.06)] lg:grid lg:overflow-visible" aria-label="Settings sections">
              {settingsNavItems.map(({ id, title, description, icon: Icon }) => {
                const active = activeSection === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveSection(id)}
                    className={`flex min-w-[190px] items-center gap-3 rounded-[10px] px-3 py-3 text-left transition lg:min-w-0 ${
                      active
                        ? 'bg-[#142334] text-white'
                        : 'text-[#142334]/72 hover:bg-[#F7F1EC] hover:text-[#142334]'
                    }`}
                  >
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[8px] ${active ? 'bg-white/12' : 'bg-[#F5F3EE]'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-bold">{title}</span>
                      <span className={`mt-0.5 hidden truncate text-[11px] lg:block ${active ? 'text-white/62' : 'text-[#6B6B6B]'}`}>
                        {description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="min-w-0">
          {activeSection === 'business_profile' && (
          <SettingsPanel title="Business Profile" icon={UserRound}>
            <form
              className="grid gap-5"
              onSubmit={(event) => {
                event.preventDefault();
                void saveSetting('business_profile', profile);
              }}
            >
              <div className="flex flex-col gap-4 rounded-[12px] bg-[#F8F6F4] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <DashboardProfileAvatar
                    src={profile.profilePhotoUrl || '/images/author/ck-profile.png'}
                    alt="Coach Kagiso profile"
                    className="h-20 w-20 rounded-full border border-[#E4D8CB] object-cover"
                  />
                  <div>
                    <p className="studio-label">Profile photo</p>
                    <p className="mt-1 max-w-md text-[12px] leading-relaxed text-[#6B6B6B]">
                      Updating this image changes the dashboard avatars that show Coach Kagiso.
                    </p>
                    {photoUploadState === 'saved' && <p className="mt-2 text-[12px] font-semibold text-[#0F766E]">Photo updated.</p>}
                    {photoUploadState === 'error' && <p className="mt-2 text-[12px] font-semibold text-[#A24E37]">Could not upload photo. Try a JPG, PNG, or WebP under 5MB.</p>}
                  </div>
                </div>
                <label className="studio-secondary-button w-fit cursor-pointer">
                  {photoUploadState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
                  {photoUploadState === 'saving' ? 'Uploading...' : 'Upload photo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={photoUploadState === 'saving'}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (file) void uploadProfilePhoto(file);
                    }}
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="studio-label">Display name</span>
                  <input className="studio-input h-11" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} />
                </label>
                <label className="grid gap-2">
                  <span className="studio-label">Contact email</span>
                  <input className="studio-input h-11" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} />
                </label>
                <label className="grid gap-2">
                  <span className="studio-label">Website</span>
                  <input className="studio-input h-11" value={profile.website} onChange={(event) => setProfile({ ...profile, website: event.target.value })} />
                </label>
                <div className="grid gap-2">
                  <span className="studio-label">Timezone</span>
                  <FilterDropdown
                    name="timezone"
                    value={profile.timezone}
                    onChange={(value) => setProfile({ ...profile, timezone: value })}
                    ariaLabel="Choose business profile timezone"
                    options={[
                      { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (SAST, UTC+2)' },
                    ]}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <SaveButton state={saveStates.business_profile || 'idle'} label="Save profile" />
                <StatusMessage state={saveStates.business_profile || 'idle'} />
              </div>
            </form>
          </SettingsPanel>
          )}

          {activeSection === 'business_goals' && (
          <SettingsPanel title="Goals" icon={Flag}>
            <form
              className="grid gap-5"
              onSubmit={(event) => {
                event.preventDefault();
                saveBusinessGoals();
              }}
            >
              <div className="grid gap-3 rounded-[8px] bg-[#142334] p-4 text-white md:grid-cols-[1fr_auto] md:items-center">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Active goals</p>
                    <p className="mt-2 font-serif text-[34px] leading-none">{goalSummary.active}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">At risk</p>
                    <p className="mt-2 font-serif text-[34px] leading-none">{goalSummary.atRisk}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Achieved</p>
                    <p className="mt-2 font-serif text-[34px] leading-none">{goalSummary.achieved}</p>
                  </div>
                </div>
                <button type="button" className="studio-secondary-button border-white/20 bg-white text-[#142334] hover:bg-[#F8F6F4]" onClick={addBusinessGoal}>
                  <Plus className="h-4 w-4" /> Add goal
                </button>
              </div>

              {goalSummary.highestPriority && (
                <div className="rounded-[8px] border border-[#D8C8BB] bg-[#F8F6F4] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">Top focus</p>
                  <p className="mt-2 font-serif text-[24px] leading-tight text-[#142334]">{goalSummary.highestPriority.title}</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#142334]/66">
                    {goalSummary.highestPriority.metricLabel}: {goalSummary.highestPriority.currentValue} / {goalSummary.highestPriority.targetValue || 'set target'}.
                    {goalSummary.highestPriority.deadline ? ` Due ${goalSummary.highestPriority.deadline}.` : ' Add a deadline when you are ready.'}
                  </p>
                </div>
              )}

              <div className="grid gap-4">
                {businessGoals.goals.length === 0 ? (
                  <div className="grid place-items-center rounded-[8px] border border-dashed border-[#D8C8BB] bg-[#FCFBFA] px-5 py-10 text-center">
                    <Target className="h-8 w-8 text-[#C9AD98]" />
                    <p className="mt-4 font-serif text-[24px] leading-tight text-[#142334]">Add the first goal</p>
                    <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[#6B6B6B]">
                      Give the assistant a target, a timeline, and a metric so every recommendation has a direction.
                    </p>
                    <button type="button" className="studio-primary-button mt-5" onClick={addBusinessGoal}>
                      <Plus className="h-4 w-4" /> Add goal
                    </button>
                  </div>
                ) : (
                  businessGoals.goals.map((goal, index) => {
                    const progress = getGoalProgress(goal);
                    const statusLabel = goalStatusOptions.find((option) => option.value === goal.status)?.label || 'Active';

                    return (
                      <div key={goal.id} className="rounded-[8px] border border-[#E4D8CB] bg-[#FCFBFA] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <label className="grid min-w-0 flex-1 gap-2">
                            <span className="studio-label">Goal {index + 1}</span>
                            <input
                              className="studio-input h-11"
                              value={goal.title}
                              onChange={(event) => updateBusinessGoal(goal.id, { title: event.target.value })}
                            />
                          </label>
                          <div className="flex items-center gap-2">
                            <span className={`mt-7 inline-flex h-9 items-center rounded-full border px-3 text-[11px] font-semibold uppercase tracking-[0.13em] ${getGoalStatusClass(goal.status)}`}>
                              {statusLabel}
                            </span>
                            <button
                              type="button"
                              className="studio-ghost-icon mt-7"
                              onClick={() => removeBusinessGoal(goal.id)}
                              aria-label={`Remove ${goal.title}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-4">
                          <div className="grid gap-2">
                            <span className="studio-label">Timeline</span>
                            <FilterDropdown
                              name={`goal-${goal.id}-horizon`}
                              value={goal.horizon}
                              onChange={(value) => updateBusinessGoal(goal.id, { horizon: value as GoalHorizon })}
                              ariaLabel="Choose goal timeline"
                              options={goalHorizonOptions}
                            />
                          </div>
                          <div className="grid gap-2">
                            <span className="studio-label">Category</span>
                            <FilterDropdown
                              name={`goal-${goal.id}-category`}
                              value={goal.category}
                              onChange={(value) => updateBusinessGoal(goal.id, { category: value as GoalCategory })}
                              ariaLabel="Choose goal category"
                              options={goalCategoryOptions}
                            />
                          </div>
                          <div className="grid gap-2">
                            <span className="studio-label">Status</span>
                            <FilterDropdown
                              name={`goal-${goal.id}-status`}
                              value={goal.status}
                              onChange={(value) => updateBusinessGoal(goal.id, { status: value as GoalStatus })}
                              ariaLabel="Choose goal status"
                              options={goalStatusOptions}
                            />
                          </div>
                          <div className="grid gap-2">
                            <span className="studio-label">Dashboard area</span>
                            <FilterDropdown
                              name={`goal-${goal.id}-linked-area`}
                              value={goal.linkedArea}
                              onChange={(value) => updateBusinessGoal(goal.id, { linkedArea: value as GoalLinkedArea })}
                              ariaLabel="Choose linked dashboard area"
                              options={goalLinkedAreaOptions}
                            />
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-4">
                          <label className="grid gap-2">
                            <span className="studio-label">Metric</span>
                            <input
                              className="studio-input h-11"
                              value={goal.metricLabel}
                              onChange={(event) => updateBusinessGoal(goal.id, { metricLabel: event.target.value })}
                            />
                          </label>
                          <label className="grid gap-2">
                            <span className="studio-label">Current</span>
                            <input
                              className="studio-input h-11"
                              type="number"
                              value={goal.currentValue}
                              onChange={(event) => updateBusinessGoal(goal.id, { currentValue: Number(event.target.value || 0) })}
                            />
                          </label>
                          <label className="grid gap-2">
                            <span className="studio-label">Target</span>
                            <input
                              className="studio-input h-11"
                              type="number"
                              value={goal.targetValue}
                              onChange={(event) => updateBusinessGoal(goal.id, { targetValue: Number(event.target.value || 0) })}
                            />
                          </label>
                          <label className="grid gap-2">
                            <span className="studio-label">Deadline</span>
                            <input
                              className="studio-input h-11"
                              type="date"
                              value={goal.deadline}
                              onChange={(event) => updateBusinessGoal(goal.id, { deadline: event.target.value })}
                            />
                          </label>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-[120px_1fr]">
                          <label className="grid gap-2">
                            <span className="studio-label">Priority</span>
                            <input
                              className="studio-input h-11"
                              type="number"
                              min={1}
                              max={5}
                              value={goal.priority}
                              onChange={(event) => updateBusinessGoal(goal.id, { priority: Number(event.target.value || 1) })}
                            />
                          </label>
                          <label className="grid gap-2">
                            <span className="studio-label">Notes for the AI</span>
                            <textarea
                              className="studio-input min-h-[88px] resize-y py-3 leading-relaxed"
                              value={goal.notes}
                              onChange={(event) => updateBusinessGoal(goal.id, { notes: event.target.value })}
                            />
                          </label>
                        </div>

                        <div className="mt-4">
                          <div className="flex items-center justify-between gap-4 text-[12px] font-semibold text-[#142334]/62">
                            <span>{progress}% progress</span>
                            <span>{goal.targetValue > 0 ? `${goal.currentValue} / ${goal.targetValue}` : 'Target not set'}</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E6DDD6]">
                            <div className="h-full rounded-full bg-[#C9AD98]" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <SaveButton state={saveStates.business_goals || 'idle'} label="Save goals" />
                <StatusMessage state={saveStates.business_goals || 'idle'} />
              </div>
            </form>
          </SettingsPanel>
          )}

          {activeSection === 'services' && (
          <SettingsPanel title="Services" icon={BriefcaseBusiness}>
            <form
              className="grid gap-5"
              onSubmit={(event) => {
                event.preventDefault();
                void saveSetting('services', services);
              }}
            >
              <div className="overflow-x-auto">
                <table className="min-w-[820px] w-full border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[#E4D8CB] text-[11px] uppercase tracking-[0.14em] text-[#8C7466]">
                      <th className="py-3 pr-4">Service name</th>
                      <th className="py-3 pr-4">Slug</th>
                      <th className="py-3 pr-4">Price</th>
                      <th className="py-3 pr-4">Turnaround</th>
                      <th className="py-3 pr-4">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service, index) => (
                      <tr key={service.slug} className="border-b border-[#F0EDE8]">
                        <td className="py-3 pr-4 font-semibold text-[#142334]">{service.name}</td>
                        <td className="py-3 pr-4 text-[#6B6B6B]">{service.slug}</td>
                        <td className="py-3 pr-4">
                          <input
                            className="studio-input h-10 w-28"
                            type="number"
                            value={service.price}
                            onChange={(event) => {
                              const next = [...services];
                              next[index] = { ...service, price: Number(event.target.value || 0) };
                              setServices(next);
                            }}
                          />
                        </td>
                        <td className="py-3 pr-4">
                          <input
                            className="studio-input h-10 min-w-[180px]"
                            value={service.turnaround}
                            onChange={(event) => {
                              const next = [...services];
                              next[index] = { ...service, turnaround: event.target.value };
                              setServices(next);
                            }}
                          />
                        </td>
                        <td className="py-3 pr-4">
                          <Toggle
                            checked={service.active}
                            label={`Toggle ${service.name}`}
                            onChange={(active) => {
                              const next = [...services];
                              next[index] = { ...service, active };
                              setServices(next);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <SaveButton state={saveStates.services || 'idle'} label="Save services" />
                <StatusMessage state={saveStates.services || 'idle'} />
              </div>
            </form>
          </SettingsPanel>
          )}

          {activeSection === 'business_hours' && (
          <SettingsPanel title="Business Hours" icon={Clock3}>
            <form
              className="grid gap-5"
              onSubmit={(event) => {
                event.preventDefault();
                void saveSetting('business_hours', hours);
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-3 rounded-[8px] bg-[#F8F6F4] p-4">
                  <p className="studio-label">Weekday coaching window</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DashboardTimePicker
                      name="weekdayStart"
                      value={hours.weekdays.start}
                      onChange={(value) => setHours({ ...hours, weekdays: { ...hours.weekdays, start: value } })}
                      ariaLabel="Choose weekday coaching start time"
                      placeholder="Start time"
                    />
                    <DashboardTimePicker
                      name="weekdayEnd"
                      value={hours.weekdays.end}
                      onChange={(value) => setHours({ ...hours, weekdays: { ...hours.weekdays, end: value } })}
                      ariaLabel="Choose weekday coaching end time"
                      placeholder="End time"
                    />
                  </div>
                  <p className="text-[12px] text-[#6B6B6B]">Mon-Fri fixed</p>
                </div>
                <div className="grid gap-3 rounded-[8px] bg-[#F8F6F4] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="studio-label">Saturday</p>
                    <label className="flex items-center gap-2 text-[12px] font-semibold text-[#6B6B6B]">
                      <input
                        type="checkbox"
                        checked={!hours.saturday}
                        onChange={(event) => setHours({ ...hours, saturday: event.target.checked ? null : { start: '09:00', end: '12:00' } })}
                        className="h-4 w-4 accent-[#142334]"
                      />
                      No Saturday coaching
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DashboardTimePicker
                      name="saturdayStart"
                      value={hours.saturday?.start || ''}
                      onChange={(value) => setHours({ ...hours, saturday: { start: value, end: hours.saturday?.end || '12:00' } })}
                      ariaLabel="Choose Saturday coaching start time"
                      placeholder="Start time"
                      disabled={!hours.saturday}
                    />
                    <DashboardTimePicker
                      name="saturdayEnd"
                      value={hours.saturday?.end || ''}
                      onChange={(value) => setHours({ ...hours, saturday: { start: hours.saturday?.start || '09:00', end: value } })}
                      ariaLabel="Choose Saturday coaching end time"
                      placeholder="End time"
                      disabled={!hours.saturday}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                  const active = index < 5 || (index === 5 && hours.saturday);
                  const label = index < 5 ? `${hours.weekdays.start}-${hours.weekdays.end}` : index === 5 && hours.saturday ? `${hours.saturday.start}-${hours.saturday.end}` : 'No coaching';
                  return (
                    <div key={day} className={`rounded-[8px] px-3 py-4 text-center ${active ? 'bg-[#C9AD98]' : 'bg-[#F0EDE8]'}`}>
                      <p className="text-[12px] font-bold text-[#142334]">{day}</p>
                      <p className="mt-2 text-[11px] leading-tight text-[#142334]/72">{label}</p>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <SaveButton state={saveStates.business_hours || 'idle'} label="Save hours" />
                <StatusMessage state={saveStates.business_hours || 'idle'} />
              </div>
            </form>
          </SettingsPanel>
          )}

          {activeSection === 'email_templates' && (
          <SettingsPanel title="Email Templates" icon={Mail}>
            <div className="grid gap-6">
              {templateSections.map((section) => (
                <div key={section.title} className="grid gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">{section.title}</p>
                  {Object.entries(section.groups).map(([archetypeName, group]) => {
                    const groupActive = group.every((template) => template.active);
                    const source = normalizeLeadSource(group[0]?.source);
                    return (
                      <details key={`${section.title}-${archetypeName}`} className="rounded-[8px] border border-[#E4D8CB] bg-[#FCFBFA] p-4">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                          <span>
                            <span className="block font-serif text-[18px] leading-tight text-[#142334]">{archetypeName}</span>
                            <span className="mt-1 block text-[12px] text-[#6B6B6B]">
                              {group[0]?.recommendedService || 'Recommended service'} - {leadSourceLabels[source]}
                            </span>
                          </span>
                          <span className="flex items-center gap-3">
                            <Toggle checked={groupActive} label={`Toggle ${archetypeName}`} onChange={(active) => void setArchetypeActive(archetypeName, active)} />
                            <ChevronDown className="h-4 w-4 text-[#8C7466]" />
                          </span>
                        </summary>
                        <div className="mt-5 grid gap-5">
                          {group.map((template) => (
                            <TemplateEditor
                              key={template.id}
                              template={template}
                              saveState={saveStates[template.id] || 'idle'}
                              onChange={(updates) => updateTemplate(template.id, updates)}
                              onSave={() => void saveTemplate(template)}
                              onPreview={() => setPreviewTemplate(template)}
                              onReset={() => void resetTemplate(template)}
                            />
                          ))}
                        </div>
                      </details>
                    );
                  })}
                </div>
              ))}
            </div>
          </SettingsPanel>
          )}

          {activeSection === 'ai_config' && (
          <SettingsPanel title="AI Model Configuration" icon={Sparkles}>
            <div className="grid gap-5">
              <div className="grid gap-4 rounded-[8px] bg-[#F8F6F4] p-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">OpenRouter</p>
                  <p className="mt-1 font-serif text-[25px] leading-tight text-[#142334]">Active model: {primaryModel}</p>
                </div>
                <label className="grid gap-2">
                  <span className="studio-label">OpenRouter API key</span>
                  <span className="relative">
                    <input
                      type={showOpenRouterKey ? 'text' : 'password'}
                      value={aiConfig.openrouter_api_key || ''}
                      onChange={(event) => setAiConfig({ ...aiConfig, openrouter_api_key: event.target.value })}
                      className="studio-input h-11 w-full pr-12"
                      placeholder="Paste your OpenRouter API key"
                    />
                    <button type="button" onClick={() => setShowOpenRouterKey((value) => !value)} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-[#142334]/65 hover:bg-[#F5F3EE]" aria-label={showOpenRouterKey ? 'Hide OpenRouter key' : 'Show OpenRouter key'}>
                      {showOpenRouterKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </span>
                  <span className="text-[12px] text-[#6B6B6B]">This saved key works with every OpenRouter model below. Keep it when switching models, or replace it here before saving.</span>
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <span className="studio-label">Active model</span>
                    <FilterDropdown
                      name="primary_model"
                      value={primaryModel}
                      onChange={(value) => setAiConfig({ ...aiConfig, primary_model: value, model_provider: 'openrouter', test_mode: false })}
                      ariaLabel="Choose active AI model"
                      options={OPENROUTER_MODEL_OPTIONS}
                    />
                    <span className="text-[12px] text-[#6B6B6B]">Used for content generation, brand voice, and Transform mode guardrail.</span>
                  </div>
                  <div className="grid gap-2">
                    <span className="studio-label">Quick tasks model</span>
                    <FilterDropdown
                      name="secondary_model"
                      value={secondaryModel}
                      onChange={(value) => setAiConfig({ ...aiConfig, secondary_model: value, model_provider: 'openrouter', test_mode: false })}
                      ariaLabel="Choose quick tasks AI model"
                      options={OPENROUTER_MODEL_OPTIONS}
                    />
                    <span className="text-[12px] text-[#6B6B6B]">Used for Polish and Format Check. It uses the same saved OpenRouter key.</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-[8px] border border-[#E8DDD2] bg-white px-4 py-3">
                  <div className="grid gap-0.5">
                    <span className="text-[13px] font-semibold text-[#142334]">Reasoning / Extended Thinking</span>
                    <span className="text-[12px] text-[#6B6B6B]">ON = model thinks deeply before responding (slower, higher quality). OFF = direct responses (faster, cheaper).</span>
                  </div>
                  <Toggle
                    checked={aiConfig.reasoning_enabled ?? false}
                    onChange={(checked) => setAiConfig({ ...aiConfig, reasoning_enabled: checked })}
                    label="Toggle reasoning / extended thinking"
                  />
                </div>
                <p className="rounded-[8px] bg-[#FEF3C7] px-4 py-3 text-[12px] font-semibold text-[#92400E]">Transform mode always uses the active model. This is required for the copyright guardrail to function reliably.</p>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" className="studio-primary-button" onClick={saveAiConfiguration}>
                    <Save className="h-4 w-4" /> Save OpenRouter settings
                  </button>
                  <button type="button" className="studio-secondary-button" onClick={() => void testAiConnection()} disabled={saveStates.openrouter_test === 'saving'}>
                    {saveStates.openrouter_test === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Test active model
                  </button>
                </div>
                {testStatus && <p role="status" className={`text-[13px] font-semibold ${testStatus.tone === 'success' ? 'text-[#0F766E]' : 'text-[#A24E37]'}`}>{testStatus.message}</p>}
              </div>
            </div>
          </SettingsPanel>
          )}

          {activeSection === 'assistant_preferences' && (
          <SettingsPanel title="AI Assistant" icon={Bot}>
            <form
              className="grid gap-5"
              onSubmit={(event) => {
                event.preventDefault();
                void saveSetting('assistant_preferences', assistantPreferences);
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="studio-label">Your name</span>
                  <input
                    className="studio-input h-11"
                    value={assistantPreferences.userName}
                    onChange={(event) => setAssistantPreferences({ ...assistantPreferences, userName: event.target.value })}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="studio-label">Assistant name</span>
                  <input
                    className="studio-input h-11"
                    value={assistantPreferences.assistantName}
                    onChange={(event) => setAssistantPreferences({ ...assistantPreferences, assistantName: event.target.value })}
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="studio-label">Role</span>
                <input
                  className="studio-input h-11"
                  value={assistantPreferences.roleDescription}
                  onChange={(event) => setAssistantPreferences({ ...assistantPreferences, roleDescription: event.target.value })}
                />
              </label>

              <div className="grid gap-3">
                <span className="studio-label">Personality mode</span>
                <div className="grid gap-3 lg:grid-cols-3">
                  {Object.entries(assistantPersonalityProfiles).map(([value, profile]) => {
                    const tone = value as AssistantPreferences['tone'];
                    const active = assistantPreferences.tone === tone;
                    const Icon = tone === 'bubbly_friend' ? Sparkles : tone === 'focused_operator' ? BriefcaseBusiness : Bot;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => applyAssistantPersonality(tone)}
                        className={`group min-h-[150px] rounded-[10px] border p-4 text-left transition ${
                          active
                            ? 'border-[#142334] bg-[#142334] text-white shadow-[0_12px_28px_rgba(20,35,52,0.18)]'
                            : 'border-[#E4D8CB] bg-[#FCFBFA] text-[#142334] hover:border-[#C9AD98] hover:bg-[#F8F6F4]'
                        }`}
                        aria-pressed={active}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className={`grid h-9 w-9 place-items-center rounded-[8px] ${active ? 'bg-white/12' : 'bg-[#F5F3EE]'}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          {active && <Check className="h-4 w-4 shrink-0" />}
                        </span>
                        <span className="mt-4 block font-serif text-[20px] leading-tight">{profile.label}</span>
                        <span className={`mt-2 block text-[12px] leading-relaxed ${active ? 'text-white/72' : 'text-[#6B6B6B]'}`}>
                          {profile.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-[8px] bg-[#F8F6F4] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">Mode preview</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#142334]/72">
                    {assistantPreferences.tone === 'bubbly_friend'
                      ? 'Hey girl, I am here. What are we fixing, finessing, or making money from today?'
                      : assistantPreferences.tone === 'focused_operator'
                        ? 'Ready. Send the task, and I will keep it direct.'
                        : 'Hey Kagiso, I am here. What are we thinking through today?'}
                  </p>
                </div>
                {assistantPreferences.tone === 'bubbly_friend' && (
                  <div className="grid gap-4 rounded-[10px] border border-[#E4D8CB] bg-[#FCFBFA] p-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">Bubbly Friend extras</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-[#6B6B6B]">
                        These guide the greeting without locking the assistant into a repeated script.
                      </p>
                    </div>
                    <label className="grid gap-2">
                      <span className="studio-label">Names it can rotate</span>
                      <input
                        className="studio-input h-11"
                        value={assistantPreferences.bubblyNicknames.join(', ')}
                        onChange={(event) => setAssistantPreferences({
                          ...assistantPreferences,
                          bubblyNicknames: event.target.value.split(',').map((item) => item.trim()).filter(Boolean),
                        })}
                      />
                      <span className="text-[12px] text-[#6B6B6B]">Separate names with commas. The assistant can rotate these and make short variations.</span>
                    </label>
                    <label className="grid gap-2">
                      <span className="studio-label">Encouragement style</span>
                      <textarea
                        value={assistantPreferences.encouragementStyle}
                        onChange={(event) => setAssistantPreferences({ ...assistantPreferences, encouragementStyle: event.target.value })}
                        rows={3}
                        className="studio-input min-h-[96px] resize-y py-3 leading-relaxed"
                      />
                    </label>
                  </div>
                )}
                <label className="grid gap-2">
                  <span className="studio-label">Conversation style</span>
                  <input
                    className="studio-input h-11"
                    value={assistantPreferences.conversationStyle}
                    onChange={(event) => setAssistantPreferences({ ...assistantPreferences, conversationStyle: event.target.value })}
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="studio-label">How it should behave</span>
                <textarea
                  value={assistantPreferences.behaviorInstructions}
                  onChange={(event) => setAssistantPreferences({ ...assistantPreferences, behaviorInstructions: event.target.value })}
                  rows={5}
                  className="studio-input min-h-[130px] resize-y py-3 leading-relaxed"
                />
              </label>

              <label className="grid gap-2">
                <span className="studio-label">What it should avoid</span>
                <textarea
                  value={assistantPreferences.avoidInstructions}
                  onChange={(event) => setAssistantPreferences({ ...assistantPreferences, avoidInstructions: event.target.value })}
                  rows={4}
                  className="studio-input min-h-[112px] resize-y py-3 leading-relaxed"
                />
              </label>

              <div className="grid gap-3 rounded-[8px] bg-[#F8F6F4] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[14px] font-semibold text-[#142334]">Natural greetings</p>
                    <p className="mt-1 text-[12px] text-[#6B6B6B]">Simple hellos stay conversational.</p>
                  </div>
                  <Toggle
                    checked={assistantPreferences.greetNaturally}
                    label="Toggle natural greetings"
                    onChange={(greetNaturally) => setAssistantPreferences({ ...assistantPreferences, greetNaturally })}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-[#E4D8CB] pt-3">
                  <div>
                    <p className="text-[14px] font-semibold text-[#142334]">Contextual emojis</p>
                    <p className="mt-1 text-[12px] text-[#6B6B6B]">Allow emojis only when they fit the moment.</p>
                  </div>
                  <Toggle
                    checked={assistantPreferences.allowEmojis}
                    label="Toggle contextual emojis"
                    onChange={(allowEmojis) => setAssistantPreferences({ ...assistantPreferences, allowEmojis })}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-[#E4D8CB] pt-3">
                  <div>
                    <p className="text-[14px] font-semibold text-[#142334]">Proactive briefings</p>
                    <p className="mt-1 text-[12px] text-[#6B6B6B]">Let the assistant surface dashboard priorities without being asked.</p>
                  </div>
                  <Toggle
                    checked={assistantPreferences.proactiveBriefings}
                    label="Toggle proactive briefings"
                    onChange={(proactiveBriefings) => setAssistantPreferences({ ...assistantPreferences, proactiveBriefings })}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <SaveButton state={saveStates.assistant_preferences || 'idle'} label="Save assistant" />
                <StatusMessage state={saveStates.assistant_preferences || 'idle'} />
                <button
                  type="button"
                  className="studio-secondary-button"
                  onClick={() => setAssistantPreferences(DEFAULT_ASSISTANT_PREFERENCES)}
                >
                  <RotateCcw className="h-4 w-4" /> Reset defaults
                </button>
              </div>
            </form>
          </SettingsPanel>
          )}

          {activeSection === 'notifications' && (
          <SettingsPanel title="Notifications" icon={Bell}>
            <div className="grid gap-3">
              {notificationRows.map(([key, label, description]) => (
                <div key={key} className="flex items-center justify-between gap-4 rounded-[8px] bg-[#F8F6F4] p-4">
                  <div>
                    <p className="text-[14px] font-semibold text-[#142334]">{label}</p>
                    <p className="mt-1 text-[12px] text-[#6B6B6B]">{description}</p>
                  </div>
                  <Toggle
                    checked={notifications[key]}
                    label={`Toggle ${label}`}
                    onChange={(checked) => {
                      const next = { ...notifications, [key]: checked };
                      setNotifications(next);
                      void saveSetting('notifications', next);
                    }}
                  />
                </div>
              ))}
              <p className="text-[12px] text-[#6B6B6B]">Coming soon: Email notifications, Slack alerts</p>
            </div>
          </SettingsPanel>
          )}
          </div>
        </div>
      </div>

      {previewTemplate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div
            data-lenis-prevent-wheel
            onWheel={containScrollableWheel}
            className="max-h-[80vh] w-full max-w-[720px] overflow-y-auto overscroll-contain rounded-[16px] bg-white p-6 [scrollbar-gutter:stable]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">Preview</p>
                <h2 className="mt-2 font-serif text-[28px] text-[#142334]">{previewTemplate.stageLabel}</h2>
              </div>
              <button type="button" className="studio-ghost-icon" onClick={() => setPreviewTemplate(null)} aria-label="Close preview">
                <Check className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-5 text-[13px] font-semibold uppercase tracking-[0.14em] text-[#6B6B6B]">Subject</p>
            <p className="mt-2 text-[16px] font-semibold text-[#142334]">{previewTemplate.subject.split('{{firstName}}').join('Thabo')}</p>
            <p className="mt-5 text-[13px] font-semibold uppercase tracking-[0.14em] text-[#6B6B6B]">Body</p>
            <div className="mt-2 whitespace-pre-wrap rounded-[8px] bg-[#F8F6F4] p-4 font-mono text-[13px] leading-relaxed text-[#142334]">
              {renderPreview(previewTemplate)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateEditor({
  template,
  saveState,
  onChange,
  onSave,
  onPreview,
  onReset,
}: {
  template: StoredEmailTemplate;
  saveState: SaveState;
  onChange: (updates: Partial<StoredEmailTemplate>) => void;
  onSave: () => void;
  onPreview: () => void;
  onReset: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function insertToken(token: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange({ body: `${template.body}${token}` });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextBody = `${template.body.slice(0, start)}${token}${template.body.slice(end)}`;
    onChange({ body: nextBody });
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = start + token.length;
      textarea.selectionEnd = start + token.length;
    });
  }

  return (
    <div className="rounded-[8px] border border-[#E4D8CB] bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full bg-[#F7F1EC] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7B5D49]">
          {template.stageLabel}
        </span>
        {template.manualOnly && (
          <span className="inline-flex rounded-full bg-[#FEF3C7] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#92400E]">
            Manual trigger
          </span>
        )}
      </div>
      <div className="mt-4 grid gap-4">
        <label className="grid gap-2">
          <span className="studio-label">Subject</span>
          <input className="studio-input h-11" value={template.subject} onChange={(event) => onChange({ subject: event.target.value })} />
        </label>
        <label className="grid gap-2">
          <span className="studio-label">Body</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="studio-ghost-button h-9" onClick={() => insertToken('{{firstName}}')}>
              {'{{firstName}}'}
            </button>
            <button type="button" className="studio-ghost-button h-9" onClick={() => insertToken('[BOOKING LINK]')}>
              [BOOKING LINK]
            </button>
            {template.downloadKey && (
              <button type="button" className="studio-ghost-button h-9" onClick={() => insertToken('[DOWNLOAD LINK]')}>
                [DOWNLOAD LINK]
              </button>
            )}
            <button type="button" className="studio-secondary-button h-9" onClick={onPreview}>
              Preview
            </button>
            <button type="button" className="studio-ghost-button h-9" onClick={onReset}>
              <RotateCcw className="h-4 w-4" /> Reset to default
            </button>
          </div>
          <textarea
            ref={textareaRef}
            data-lenis-prevent-wheel
            className="studio-input h-[200px] resize-y overflow-y-auto overscroll-contain px-3 py-3 font-mono text-[13px] leading-relaxed [scrollbar-gutter:stable]"
            value={template.body}
            onChange={(event) => onChange({ body: event.target.value })}
            onWheel={containScrollableWheel}
          />
        </label>
        <div className="flex justify-end">
          <button type="button" disabled={saveState === 'saving'} className="studio-secondary-button" onClick={onSave}>
            {saveState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saveState === 'saved' ? 'Saved' : 'Save template'}
          </button>
        </div>
      </div>
    </div>
  );
}
