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
  Loader2,
  Mail,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  UserRound,
} from 'lucide-react';
import {
  DEFAULT_ASSISTANT_PREFERENCES,
  assistantToneLabels,
  normalizeAssistantPreferences,
} from '@/lib/assistant-preferences';
import { EMAIL_TEMPLATES, getBookingLink, getDownloadLink } from '@/lib/email-templates';
import { leadSourceLabels, normalizeLeadSource } from '@/lib/lead-sources';
import DashboardProfileAvatar from '@/components/dashboard/DashboardProfileAvatar';
import FilterDropdown from '@/components/FilterDropdown';
import DashboardTimePicker from '@/components/DashboardTimePicker';
import type {
  AiConfigSettings,
  AssistantPreferences,
  BusinessHoursSettings,
  BusinessProfileSettings,
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
    description: 'Test and production routing',
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
    primary_model: 'glm-5.1',
    secondary_model: 'glm-5.1',
    model_provider: 'zai',
    test_mode: true,
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

const openRouterModelOptions = [
  { value: 'google/gemini-pro-3.1', label: 'google/gemini-pro-3.1' },
  { value: 'google/gemini-flash-3.1', label: 'google/gemini-flash-3.1' },
  { value: 'google/gemini-3.5-flash', label: 'google/gemini-3.5-flash' },
  { value: 'xiaomi/mimo-v2.5-pro', label: 'xiaomi/mimo-v2.5-pro' },
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
  const [notifications, setNotifications] = useState<NotificationSettings>(
    getSetting(settings, 'notifications', sectionDefaults.notifications),
  );
  const [templates, setTemplates] = useState<StoredEmailTemplate[]>(emailTemplates);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [previewTemplate, setPreviewTemplate] = useState<StoredEmailTemplate | null>(null);
  const [showZaiKey, setShowZaiKey] = useState(false);
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  const [testStatus, setTestStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [productionOpen, setProductionOpen] = useState(false);
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

  async function testAiConnection(provider: 'zai' | 'openrouter') {
    setTestStatus(null);
    setSaveStates((current) => ({ ...current, [`${provider}_test`]: 'saving' }));
    try {
      await postJson('/api/settings/ai-test', {
        adminKey,
        provider,
        apiKey: provider === 'zai' ? aiConfig.zai_api_key : aiConfig.openrouter_api_key,
        model: provider === 'zai' ? aiConfig.primary_model || 'glm-5.1' : aiConfig.primary_model || 'google/gemini-pro-3.1',
      });
      setTestStatus({
        tone: 'success',
        message: provider === 'zai' ? 'Connected to GLM 5.1' : 'Connected to production model',
      });
      setSaveStates((current) => ({ ...current, [`${provider}_test`]: 'idle' }));
    } catch (error) {
      setTestStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Connection failed. Check the API key.',
      });
      setSaveStates((current) => ({ ...current, [`${provider}_test`]: 'idle' }));
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
              {aiConfig.test_mode !== false && (
                <div className="rounded-[8px] border border-[#F59E0B] bg-[#FEF3C7] px-4 py-3 text-[#92400E]">
                  <p className="text-[13px] font-bold">Test configuration active</p>
                  <p className="mt-1 text-[13px] leading-relaxed">Currently routing to GLM 5.1 via Z.ai for testing. Do not use with real lead data during this phase. Switch to production models below when testing is complete.</p>
                </div>
              )}
              <div className="grid gap-4 rounded-[8px] bg-[#F8F6F4] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Current model</p>
                <p className="font-serif text-[28px] leading-tight text-[#142334]">GLM 5.1 via Z.ai {aiConfig.test_mode !== false ? '(Test mode)' : ''}</p>
                <label className="grid gap-2">
                  <span className="studio-label">Z.ai API key</span>
                  <span className="relative">
                    <input
                      type={showZaiKey ? 'text' : 'password'}
                      value={aiConfig.zai_api_key || ''}
                      onChange={(event) => setAiConfig({ ...aiConfig, zai_api_key: event.target.value })}
                      className="studio-input h-11 w-full pr-12"
                      placeholder="Paste ZAI_API_KEY"
                    />
                    <button type="button" onClick={() => setShowZaiKey((value) => !value)} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-[#142334]/65 hover:bg-[#F5F3EE]" aria-label={showZaiKey ? 'Hide Z.ai key' : 'Show Z.ai key'}>
                      {showZaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </span>
                  <span className="text-[12px] text-[#6B6B6B]">Add this key to your Vercel environment variables as ZAI_API_KEY.</span>
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" className="studio-secondary-button" onClick={() => void saveSetting('ai_config', aiConfig)}>
                    <Save className="h-4 w-4" /> Save key
                  </button>
                  <button type="button" className="studio-primary-button" onClick={() => void testAiConnection('zai')} disabled={saveStates.zai_test === 'saving'}>
                    {saveStates.zai_test === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Test connection
                  </button>
                </div>
              </div>
              <details
                open={productionOpen}
                onToggle={(event) => setProductionOpen(event.currentTarget.open)}
                className="relative z-10 overflow-visible rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA] shadow-[0_1px_2px_rgba(20,35,52,0.04)]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 border-b border-[#E4D8CB] bg-white px-4 py-3 transition hover:bg-[#F8F6F4] [&::-webkit-details-marker]:hidden">
                  <span className="font-serif text-[20px] text-[#142334]">Switch to production models</span>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] text-[#8C7466]">
                    <ChevronDown className={`h-4 w-4 transition-transform ${productionOpen ? 'rotate-180' : ''}`} />
                  </span>
                </summary>
                <div className="grid gap-4 p-4">
                  <p className="text-[13px] leading-relaxed text-[#6B6B6B]">When testing is complete, switch to production models via OpenRouter for better instruction-following and POPIA compliance.</p>
                  <label className="grid gap-2">
                    <span className="studio-label">OpenRouter API key</span>
                    <span className="relative">
                      <input type={showOpenRouterKey ? 'text' : 'password'} className="studio-input h-11 w-full pr-12" value={aiConfig.openrouter_api_key || ''} onChange={(event) => setAiConfig({ ...aiConfig, openrouter_api_key: event.target.value })} />
                      <button type="button" onClick={() => setShowOpenRouterKey((value) => !value)} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-[#142334]/65 hover:bg-[#F5F3EE]" aria-label={showOpenRouterKey ? 'Hide OpenRouter key' : 'Show OpenRouter key'}>
                        {showOpenRouterKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </span>
                  </label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <span className="studio-label">Primary model</span>
                      <FilterDropdown
                        name="primary_model"
                        value={aiConfig.primary_model || 'google/gemini-pro-3.1'}
                        onChange={(value) => setAiConfig({ ...aiConfig, primary_model: value })}
                        ariaLabel="Choose primary AI model"
                        options={openRouterModelOptions}
                      />
                      <span className="text-[12px] text-[#6B6B6B]">Used for content generation, brand voice, and Transform mode guardrail.</span>
                    </div>
                    <div className="grid gap-2">
                      <span className="studio-label">Secondary model</span>
                      <FilterDropdown
                        name="secondary_model"
                        value={aiConfig.secondary_model || 'google/gemini-flash-3.1'}
                        onChange={(value) => setAiConfig({ ...aiConfig, secondary_model: value })}
                        ariaLabel="Choose secondary AI model"
                        options={openRouterModelOptions}
                      />
                      <span className="text-[12px] text-[#6B6B6B]">Used for Polish and Format Check. Faster and cheaper.</span>
                    </div>
                  </div>
                  <p className="rounded-[8px] bg-[#FEF3C7] px-4 py-3 text-[12px] font-semibold text-[#92400E]">Transform mode always uses the Primary model. This is required for the copyright guardrail to function reliably.</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="studio-primary-button"
                      onClick={() => {
                        if (!aiConfig.openrouter_api_key?.trim()) {
                          setTestStatus({ tone: 'error', message: 'OpenRouter key is required before switching to production.' });
                          return;
                        }
                        const nextConfig = {
                          ...aiConfig,
                          primary_model: aiConfig.primary_model || 'google/gemini-pro-3.1',
                          secondary_model: aiConfig.secondary_model || 'google/gemini-flash-3.1',
                          model_provider: 'openrouter' as const,
                          test_mode: false,
                        };
                        setAiConfig(nextConfig);
                        void saveSetting('ai_config', nextConfig);
                      }}
                    >
                      <Save className="h-4 w-4" /> Save production config
                    </button>
                    <button type="button" className="studio-secondary-button" onClick={() => void testAiConnection('openrouter')} disabled={saveStates.openrouter_test === 'saving'}>
                      {saveStates.openrouter_test === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Test production connection
                    </button>
                  </div>
                </div>
              </details>
              {testStatus && <p className={`text-[13px] font-semibold ${testStatus.tone === 'success' ? 'text-[#0F766E]' : 'text-[#A24E37]'}`}>{testStatus.message}</p>}
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

              <div className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
                <div className="grid gap-2">
                  <span className="studio-label">Tone</span>
                  <FilterDropdown
                    name="assistant_tone"
                    value={assistantPreferences.tone}
                    onChange={(value) => setAssistantPreferences({ ...assistantPreferences, tone: value as AssistantPreferences['tone'] })}
                    ariaLabel="Choose assistant tone"
                    options={Object.entries(assistantToneLabels).map(([value, label]) => ({ value, label }))}
                  />
                </div>
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
