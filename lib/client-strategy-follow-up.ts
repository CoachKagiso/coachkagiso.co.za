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
export type ClientStrategyCheckpointStatus = 'pending' | 'done' | 'not_done';
export type ClientStrategyProgressStatus = 'on_track' | 'partly_on_track' | 'blocked' | 'complete';

export type ClientStrategyCheckpointOutcome = {
  status: ClientStrategyCheckpointStatus;
  dueAt: string;
  notes: string;
};

const THEME_LABELS = new Map<string, string>(
  CLIENT_STRATEGY_THEME_OPTIONS.map((theme) => [theme.key, theme.label]),
);
const MAX_OUTCOME_NOTES_LENGTH = 4000;

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
        {
          key: 'teams_day_14',
          label: '15-minute Microsoft Teams follow-up',
          day: 14,
          windowLabel: 'Around Day 14',
        },
      ]
    : [
        {
          key: 'whatsapp_day_10_14',
          label: 'WhatsApp check-in',
          day: 12,
          windowLabel: 'Days 10–14',
        },
        {
          key: 'teams_day_28_30',
          label: '15-minute Microsoft Teams follow-up',
          day: 29,
          windowLabel: 'Days 28–30',
        },
      ];

  return checkpoints.map(({ key, label, day, windowLabel }) => ({
    key,
    label,
    dueAt: addUtcDays(deliveredAt, day),
    windowLabel,
  }));
}

export function normalizeClientStrategyCheckpointOutcome(
  value: unknown,
): ClientStrategyCheckpointOutcome {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const status = source.status;
  if (status !== 'pending' && status !== 'done' && status !== 'not_done') {
    throw new Error('Choose pending, done or not done for this follow-up.');
  }

  const notes = typeof source.notes === 'string' ? source.notes.trim() : '';
  if (notes.length > MAX_OUTCOME_NOTES_LENGTH) {
    throw new Error(`Checkpoint notes must be ${MAX_OUTCOME_NOTES_LENGTH} characters or fewer.`);
  }

  const dueAt = typeof source.dueAt === 'string' ? source.dueAt.trim() : '';
  if (!dueAt || Number.isNaN(new Date(dueAt).getTime())) {
    throw new Error('Choose a valid follow-up date.');
  }

  return {
    status,
    dueAt: new Date(dueAt).toISOString(),
    notes,
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

function planMilestoneEntries(content: ClientStrategyPlanContent) {
  return [
    { label: 'By Day 30', items: content.milestones.day30 },
    ...(content.milestones.day60 ? [{ label: 'By Day 60', items: content.milestones.day60 }] : []),
    ...(content.milestones.day90 ? [{ label: 'By Day 90', items: content.milestones.day90 }] : []),
  ];
}

function sessionSummaryText(content: ClientStrategyPlanContent) {
  const summary = content.sessionSummary;
  return [
    'Session Summary & Agreements',
    `Session date: ${summary.sessionDate}`,
    `Purpose: ${summary.purpose}`,
    '',
    'Where things stood',
    summary.whereThingsStood,
    '',
    textList('What we explored', summary.themesExplored),
    '',
    textList('What became clearer', summary.clarityGained),
    '',
    `Agreed outcome: ${summary.agreedOutcome}`,
    '',
    textList('Client commitments', summary.clientCommitments),
    '',
    textList('Kagiso commitments', summary.coachCommitments),
    ...(summary.openPoints.length
      ? ['', textList('Open points or confirmations', summary.openPoints)]
      : []),
  ].join('\n');
}

function sessionSummaryHtml(content: ClientStrategyPlanContent) {
  const summary = content.sessionSummary;
  return `
    <div style="padding:22px;border:1px solid #d8c8bb;border-radius:12px;background:#fcfbfa;">
      <p style="margin:0 0 6px;color:#7a5f3d;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Session Summary &amp; Agreements</p>
      <p style="margin:0 0 16px;color:#6b6b6b;font-size:13px;"><strong>Session date:</strong> ${escapeHtml(summary.sessionDate)}</p>
      <h2 style="margin:0 0 8px;color:#253029;font-size:20px;line-height:1.35;">${escapeHtml(summary.purpose)}</h2>
      <p style="margin:0;color:#414a43;font-size:16px;line-height:1.7;">${escapeHtml(summary.whereThingsStood)}</p>
      ${htmlList('What we explored', summary.themesExplored)}
      ${htmlList('What became clearer', summary.clarityGained)}
      <p style="margin:24px 0 0;color:#414a43;line-height:1.7;"><strong>Agreed outcome:</strong> ${escapeHtml(summary.agreedOutcome)}</p>
      ${htmlList('Client commitments', summary.clientCommitments)}
      ${htmlList('Kagiso commitments', summary.coachCommitments)}
      ${summary.openPoints.length ? htmlList('Open points or confirmations', summary.openPoints) : ''}
    </div>`;
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

function glowUpInterviewPrepText(content: GlowUpPlanContent) {
  const prep = content.interviewPrep;
  if (!prep) return '';
  return [
    'Interview preparation',
    '',
    textList('Likely interview questions', prep.likelyQuestions),
    '',
    `Worked STAR example: ${prep.starExample.title}`,
    `Situation: ${prep.starExample.situation}`,
    `Task: ${prep.starExample.task}`,
    `Action: ${prep.starExample.action}`,
    `Result: ${prep.starExample.result}`,
    '',
    'Stories to prepare',
    ...prep.storyPrompts.map((item) => `- ${item.experience}: ${item.prompt}`),
    '',
    textList('Company and panel research checklist', prep.researchChecklist),
    '',
    'Watch out for',
    `Likely probe: ${prep.watchOutFor.risk}`,
    `How to handle it: ${prep.watchOutFor.handling}`,
  ].join('\n');
}

function glowUpInterviewPrepHtml(content: GlowUpPlanContent) {
  const prep = content.interviewPrep;
  if (!prep) return '';
  const star = prep.starExample;
  return `
    <div style="margin-top:28px;padding:22px;border:1px solid #d8c8bb;border-radius:12px;background:#fcfbfa;">
      <p style="margin:0 0 6px;color:#7a5f3d;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Interview preparation</p>
      ${htmlList('Likely interview questions', prep.likelyQuestions)}
      <h3 style="margin:24px 0 8px;color:#2f3a32;font-size:16px;">Worked STAR example: ${escapeHtml(star.title)}</h3>
      <p style="margin:7px 0;color:#414a43;line-height:1.7;"><strong>Situation:</strong> ${escapeHtml(star.situation)}</p>
      <p style="margin:7px 0;color:#414a43;line-height:1.7;"><strong>Task:</strong> ${escapeHtml(star.task)}</p>
      <p style="margin:7px 0;color:#414a43;line-height:1.7;"><strong>Action:</strong> ${escapeHtml(star.action)}</p>
      <p style="margin:7px 0;color:#414a43;line-height:1.7;"><strong>Result:</strong> ${escapeHtml(star.result)}</p>
      <h3 style="margin:24px 0 8px;color:#2f3a32;font-size:16px;">Stories to prepare</h3>
      <ul style="margin:0;padding-left:20px;color:#414a43;line-height:1.7;">
        ${prep.storyPrompts.map((item) => `<li><strong>${escapeHtml(item.experience)}:</strong> ${escapeHtml(item.prompt)}</li>`).join('')}
      </ul>
      ${htmlList('Company and panel research checklist', prep.researchChecklist)}
      <div style="margin-top:24px;padding:16px;border-radius:10px;background:#fff1cc;color:#6d4911;">
        <p style="margin:0 0 8px;font-weight:700;">Watch out for</p>
        <p style="margin:0 0 7px;line-height:1.7;"><strong>Likely probe:</strong> ${escapeHtml(prep.watchOutFor.risk)}</p>
        <p style="margin:0;line-height:1.7;"><strong>How to handle it:</strong> ${escapeHtml(prep.watchOutFor.handling)}</p>
      </div>
    </div>`;
}

export function buildClientStrategyPlanEmail(input: {
  serviceSlug: ClientStrategyServiceSlug;
  recipientName: string;
  content: ClientStrategyPlanContent;
}) {
  const name = firstName(input.recipientName);
  const isCareerClarity = input.serviceSlug === 'career-clarity';
  const subject = `Your Career Development Plan | ${isCareerClarity ? 'Career Clarity' : 'Glow Up VIP'}`;
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
  const interviewPrepText = isCareerClarity ? '' : glowUpInterviewPrepText(input.content as GlowUpPlanContent);
  const milestoneText = planMilestoneEntries(input.content)
    .map((milestone) => textList(milestone.label, milestone.items))
    .join('\n\n');
  const openingPeriod = isCareerClarity ? 'First 14 Days' : 'First 30 Days';

  const text = [
    `Hi ${name},`,
    '',
    sessionSummaryText(input.content),
    '',
    'Your Career Development Plan',
    '',
    input.content.permissionLine,
    '',
    `Plan focus: ${input.content.focusStatement}`,
    `Intended outcome: ${input.content.outcome}`,
    '',
    `Your ${input.content.planHorizonDays}-day roadmap`,
    milestoneText,
    '',
    `Minimum viable commitment: ${input.content.minimumViableCommitment}`,
    `Checkpoint condition: ${input.content.checkpointCondition}`,
    '',
    openingPeriod,
    '',
    sectionText,
    '',
    closingText,
    interviewPrepText ? `\n${interviewPrepText}` : '',
    '',
    'Take this one step at a time. Returning to the plan after a difficult week still counts as progress.',
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
  const interviewPrepHtml = isCareerClarity ? '' : glowUpInterviewPrepHtml(input.content as GlowUpPlanContent);
  const milestoneHtml = planMilestoneEntries(input.content)
    .map((milestone) => htmlList(milestone.label, milestone.items))
    .join('');
  const summaryHtml = sessionSummaryHtml(input.content);

  const html = `<!doctype html>
<html lang="en"><body style="margin:0;background:#f1f3ef;font-family:Arial,sans-serif;color:#253029;">
  <div style="display:none;max-height:0;overflow:hidden;">Your career development plan from Coach Kagiso.</div>
  <div style="max-width:640px;margin:0 auto;padding:28px 16px;">
    <div style="padding:32px;border-radius:18px;background:#ffffff;box-shadow:0 8px 28px rgba(37,48,41,.08);">
      <p style="margin:0 0 24px;color:#7a5f3d;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Coach Kagiso</p>
      <h1 style="margin:0 0 18px;font-size:28px;line-height:1.2;">Hi ${escapeHtml(name)},</h1>
      ${summaryHtml}
      <p style="margin:30px 0 6px;color:#7a5f3d;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Career development plan</p>
      <p style="margin:0 0 24px;padding:16px;border-left:4px solid #c9ad98;background:#f7f2ed;color:#414a43;line-height:1.7;">${escapeHtml(input.content.permissionLine)}</p>
      <div style="padding:20px;border-radius:12px;background:#edf2ea;">
        <p style="margin:0 0 8px;"><strong>Plan focus:</strong> ${escapeHtml(input.content.focusStatement)}</p>
        <p style="margin:0;"><strong>Intended outcome:</strong> ${escapeHtml(input.content.outcome)}</p>
      </div>
      <div style="margin-top:28px;padding:22px;border:1px solid #d8c8bb;border-radius:12px;background:#fcfbfa;">
        <p style="margin:0 0 6px;color:#7a5f3d;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Your ${input.content.planHorizonDays}-day roadmap</p>
        ${milestoneHtml}
        <p style="margin:24px 0 8px;color:#2f3a32;line-height:1.7;"><strong>Minimum viable commitment:</strong> ${escapeHtml(input.content.minimumViableCommitment)}</p>
        <p style="margin:0;color:#414a43;line-height:1.7;"><strong>Checkpoint condition:</strong> ${escapeHtml(input.content.checkpointCondition)}</p>
      </div>
      <h2 style="margin:32px 0 0;color:#253029;font-size:24px;">${openingPeriod}</h2>
      ${sectionHtml}
      <div style="margin-top:28px;">${closingHtml}</div>
      ${interviewPrepHtml}
      <p style="margin:28px 0 0;color:#414a43;line-height:1.7;">Take this one step at a time. Returning to the plan after a difficult week still counts as progress.</p>
      <p style="margin:22px 0 0;font-weight:700;">Kagiso</p>
    </div>
  </div>
</body></html>`;

  return { subject, text, html };
}
