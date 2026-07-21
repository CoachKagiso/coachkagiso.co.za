import type { ClientStrategyServiceSlug } from './client-strategy';
import type {
  CareerClarityPlanContent,
  ClientStrategyPlanContent,
  GlowUpPlanContent,
} from './client-strategy-plan';

export const CLIENT_STRATEGY_THEME_OPTIONS = [
  { key: 'career_direction', label: 'Career direction' },
  { key: 'confidence_language', label: 'Confidence and language' },
  { key: 'evidence_gap', label: 'Evidence gap' },
  { key: 'cv_positioning', label: 'CV positioning' },
  { key: 'linkedin_visibility', label: 'LinkedIn visibility' },
  { key: 'interview_readiness', label: 'Interview readiness' },
  { key: 'application_strategy', label: 'Application strategy' },
  { key: 'accountability', label: 'Accountability' },
  { key: 'capacity', label: 'Capacity and workload' },
  { key: 'role_fit', label: 'Role fit' },
] as const;

export type ClientStrategyThemeKey = (typeof CLIENT_STRATEGY_THEME_OPTIONS)[number]['key'];
export type ClientStrategyCheckpointStatus = 'pending' | 'completed' | 'skipped';
export type ClientStrategyProgressStatus = 'on_track' | 'partly_on_track' | 'blocked' | 'complete';

export type ClientStrategyCheckpointOutcome = {
  status: Exclude<ClientStrategyCheckpointStatus, 'pending'>;
  progressStatus: ClientStrategyProgressStatus | null;
  notes: string;
  themes: ClientStrategyThemeKey[];
};

const THEME_LABELS = new Map<string, string>(
  CLIENT_STRATEGY_THEME_OPTIONS.map((theme) => [theme.key, theme.label]),
);
const PROGRESS_STATUSES = new Set<ClientStrategyProgressStatus>([
  'on_track',
  'partly_on_track',
  'blocked',
  'complete',
]);
const MAX_OUTCOME_NOTES_LENGTH = 4000;
const MAX_OUTCOME_THEMES = 5;

function addUtcDays(value: string, days: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('A valid delivery date is required.');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function getClientStrategyCheckpointSchedule(
  serviceSlug: ClientStrategyServiceSlug,
  deliveredAt: string,
) {
  const checkpoints = serviceSlug === 'career-clarity'
    ? [
        { key: 'day_7', label: 'Day 7 midpoint check-in', day: 7 },
        { key: 'day_14', label: 'Day 14 outcome review', day: 14 },
      ]
    : [
        { key: 'day_7', label: 'Day 7 progress check-in', day: 7 },
        { key: 'day_14', label: 'Day 14 progress check-in', day: 14 },
        { key: 'day_21', label: 'Day 21 progress check-in', day: 21 },
        { key: 'day_30', label: 'Day 30 outcome review', day: 30 },
      ];

  return checkpoints.map(({ key, label, day }) => ({
    key,
    label,
    dueAt: addUtcDays(deliveredAt, day),
  }));
}

export function normalizeClientStrategyCheckpointOutcome(
  value: unknown,
): ClientStrategyCheckpointOutcome {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const status = source.status;
  if (status !== 'completed' && status !== 'skipped') {
    throw new Error('Choose completed or skipped for this checkpoint.');
  }

  const notes = typeof source.notes === 'string' ? source.notes.trim() : '';
  if (notes.length > MAX_OUTCOME_NOTES_LENGTH) {
    throw new Error(`Checkpoint notes must be ${MAX_OUTCOME_NOTES_LENGTH} characters or fewer.`);
  }

  const rawThemes = Array.isArray(source.themes) ? source.themes : [];
  const themes = [...new Set(rawThemes.filter((theme): theme is string => typeof theme === 'string'))];
  if (themes.some((theme) => !THEME_LABELS.has(theme))) {
    throw new Error('Choose only the approved learning themes.');
  }
  if (themes.length > MAX_OUTCOME_THEMES) {
    throw new Error(`Choose no more than ${MAX_OUTCOME_THEMES} learning themes.`);
  }

  if (status === 'skipped') {
    return { status, progressStatus: null, notes, themes: [] };
  }

  if (!PROGRESS_STATUSES.has(source.progressStatus as ClientStrategyProgressStatus)) {
    throw new Error('Choose a valid progress status.');
  }

  return {
    status,
    progressStatus: source.progressStatus as ClientStrategyProgressStatus,
    notes,
    themes: themes as ClientStrategyThemeKey[],
  };
}

export function aggregateClientStrategyThemes(
  rows: Array<{ paymentId: string; themes: string[] }>,
  minimumClients = 3,
) {
  const clientsByTheme = new Map<ClientStrategyThemeKey, Set<string>>();
  for (const row of rows) {
    for (const theme of new Set(row.themes)) {
      if (!THEME_LABELS.has(theme)) continue;
      const key = theme as ClientStrategyThemeKey;
      const clients = clientsByTheme.get(key) || new Set<string>();
      clients.add(row.paymentId);
      clientsByTheme.set(key, clients);
    }
  }

  return [...clientsByTheme.entries()]
    .filter(([, clients]) => clients.size >= minimumClients)
    .map(([key, clients]) => ({
      key,
      label: THEME_LABELS.get(key) || key,
      clientCount: clients.size,
    }))
    .sort((left, right) => right.clientCount - left.clientCount || left.label.localeCompare(right.label));
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || 'there';
}

function textList(title: string, items: string[]) {
  return `${title}\n${items.map((item) => `- ${item}`).join('\n')}`;
}

function htmlList(title: string, items: string[]) {
  return `<h3 style="margin:24px 0 8px;color:#2f3a32;font-size:16px;">${escapeHtml(title)}</h3><ul style="margin:0;padding-left:20px;color:#414a43;line-height:1.7;">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function careerClaritySections(content: CareerClarityPlanContent) {
  return [
    { label: 'Days 1 to 3', focus: content.days1To3.focus, actions: content.days1To3.actions },
    { label: 'Days 4 to 7', focus: content.days4To7.focus, actions: content.days4To7.actions },
    { label: 'Days 8 to 14', focus: content.days8To14.focus, actions: content.days8To14.actions },
  ];
}

function glowUpSections(content: GlowUpPlanContent) {
  return [
    { label: 'Days 1 to 7', focus: content.days1To7.focus, actions: content.days1To7.actions, coachSupport: content.days1To7.coachSupport },
    { label: 'Days 8 to 14', focus: content.days8To14.focus, actions: content.days8To14.actions, coachSupport: content.days8To14.coachSupport },
    { label: 'Days 15 to 21', focus: content.days15To21.focus, actions: content.days15To21.actions, coachSupport: content.days15To21.coachSupport },
    { label: 'Days 22 to 30', focus: content.days22To30.focus, actions: content.days22To30.actions, coachSupport: content.days22To30.coachSupport },
  ];
}

export function buildClientStrategyPlanEmail(input: {
  serviceSlug: ClientStrategyServiceSlug;
  recipientName: string;
  content: ClientStrategyPlanContent;
}) {
  const name = firstName(input.recipientName);
  const isCareerClarity = input.serviceSlug === 'career-clarity';
  const subject = isCareerClarity
    ? 'Your personalized 14-day Career Clarity plan'
    : 'Your personalized 30-day Glow Up support plan';
  const sections: Array<{ label: string; focus: string; actions: string[]; coachSupport?: string[] }> = isCareerClarity
    ? careerClaritySections(input.content as CareerClarityPlanContent)
    : glowUpSections(input.content as GlowUpPlanContent);

  const sectionText = sections.map((section) => [
    section.label,
    `Focus: ${section.focus}`,
    textList('Your actions', section.actions),
    section.coachSupport ? textList('Coach support', section.coachSupport) : '',
  ].filter(Boolean).join('\n')).join('\n\n');

  const closingText = isCareerClarity
    ? [
        textList('Check-in questions', (input.content as CareerClarityPlanContent).checkInQuestions),
        textList('Coach follow-up', (input.content as CareerClarityPlanContent).coachFollowUp),
      ].join('\n\n')
    : textList('Progress signals', (input.content as GlowUpPlanContent).progressSignals);

  const text = [
    `Hi ${name},`,
    '',
    'Thank you for the work you brought into our session. Here is the plan we shaped around your priorities.',
    '',
    `Plan focus: ${input.content.focusStatement}`,
    `Intended outcome: ${input.content.outcome}`,
    '',
    sectionText,
    '',
    closingText,
    '',
    'Take this one step at a time. I will use our check-ins to help you review what is moving and what needs support.',
    '',
    'Kagiso',
  ].join('\n');

  const sectionHtml = sections.map((section) => `
    <div style="margin-top:24px;padding:20px;border:1px solid #dfe5df;border-radius:12px;background:#fbfcfa;">
      <p style="margin:0 0 6px;color:#7a5f3d;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">${escapeHtml(section.label)}</p>
      <h2 style="margin:0;color:#253029;font-size:20px;line-height:1.35;">${escapeHtml(section.focus)}</h2>
      ${htmlList('Your actions', section.actions)}
      ${section.coachSupport ? htmlList('Coach support', section.coachSupport) : ''}
    </div>`).join('');

  const closingHtml = isCareerClarity
    ? `${htmlList('Check-in questions', (input.content as CareerClarityPlanContent).checkInQuestions)}${htmlList('Coach follow-up', (input.content as CareerClarityPlanContent).coachFollowUp)}`
    : htmlList('Progress signals', (input.content as GlowUpPlanContent).progressSignals);

  const html = `<!doctype html>
<html lang="en"><body style="margin:0;background:#f1f3ef;font-family:Arial,sans-serif;color:#253029;">
  <div style="display:none;max-height:0;overflow:hidden;">Your personalized career support plan from Coach Kagiso.</div>
  <div style="max-width:640px;margin:0 auto;padding:28px 16px;">
    <div style="padding:32px;border-radius:18px;background:#ffffff;box-shadow:0 8px 28px rgba(37,48,41,.08);">
      <p style="margin:0 0 24px;color:#7a5f3d;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Coach Kagiso</p>
      <h1 style="margin:0 0 18px;font-size:28px;line-height:1.2;">Hi ${escapeHtml(name)},</h1>
      <p style="margin:0 0 18px;color:#414a43;line-height:1.7;">Thank you for the work you brought into our session. Here is the plan we shaped around your priorities.</p>
      <div style="padding:20px;border-radius:12px;background:#edf2ea;">
        <p style="margin:0 0 8px;"><strong>Plan focus:</strong> ${escapeHtml(input.content.focusStatement)}</p>
        <p style="margin:0;"><strong>Intended outcome:</strong> ${escapeHtml(input.content.outcome)}</p>
      </div>
      ${sectionHtml}
      <div style="margin-top:28px;">${closingHtml}</div>
      <p style="margin:28px 0 0;color:#414a43;line-height:1.7;">Take this one step at a time. I will use our check-ins to help you review what is moving and what needs support.</p>
      <p style="margin:22px 0 0;font-weight:700;">Kagiso</p>
    </div>
  </div>
</body></html>`;

  return { subject, text, html };
}
