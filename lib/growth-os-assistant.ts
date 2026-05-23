import type { ClientOperation } from '@/lib/client-operations';
import type { ContentBacklogItem, ContentCalendarItem } from '@/lib/content-studio';
import type { DiagnosticLeadStatus, DiagnosticSubmission } from '@/lib/diagnostic-submissions';

export type AssistantDashboardContext = {
  totalLeads: number;
  leadsThisWeek: number;
  hotLeadsCount: number;
  followUpsDueToday: number;
  overdueFollowUps: number;
  topArchetype: string;
  strongestTheme: string;
  topService: string;
  activeClients: number;
  vaultDraftCount: number;
  scheduledPostsThisWeek: number;
  statusCounts: {
    new: number;
    contacted: number;
    booked: number;
    nurture: number;
  };
  followUpsDueTodayList: {
    firstName: string;
    lastName: string;
    archetype: string;
    serviceInterest: string;
    followUpCount: number;
    email: string;
    leadId: string;
  }[];
  recentLeads: {
    firstName: string;
    archetype: string;
    priorityScore: number;
  }[];
};

const assistantTimeZone = 'Africa/Johannesburg';
const inactiveLeadStatuses: DiagnosticLeadStatus[] = ['paid', 'archived', 'not_a_fit', 'nurture', 'closed'];
const archetypeLabels = {
  A: 'Plateaued Performer',
  B: 'Quiet Pivoter',
  C: 'Burnt-Out Builder',
  D: 'Lost Pivoter',
  E: 'Engaged Strategist',
} as const;
const contentSignalByArchetype = {
  A: 'career plateau frustration',
  B: 'quiet career pivoting',
  C: 'burnout and capacity pressure',
  D: 'career transition anxiety',
  E: 'career growth clarity',
} as const;

function getDateKey(value: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: assistantTimeZone,
    year: 'numeric',
  }).format(value);
}

function getStoredDateKey(value?: string | null) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return getDateKey(date);
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function getPriorityScore(submission: DiagnosticSubmission) {
  const submittedAt = new Date(submission.submitted_at).getTime();
  const ageDays = Math.floor((Date.now() - submittedAt) / (24 * 60 * 60 * 1000));
  const service = submission.archetype_payload?.service || '';
  let score = 30;

  if (submission.lead_status === 'new') score += 35;
  if (submission.lead_status === 'follow_up_later') score += 15;
  if (submission.lead_status === 'nurture') score -= 30;
  if (submission.next_follow_up_at && new Date(submission.next_follow_up_at).getTime() <= Date.now()) score += 30;
  if (!submission.last_contacted_at) score += 10;
  if (ageDays <= 2) score += 20;
  if (service.includes('Glow Up') || service.includes('Career Clarity')) score += 15;
  if (submission.archetype_key === 'D' || submission.archetype_key === 'C') score += 10;
  if (submission.lead_status === 'discovery_booked' || submission.lead_status === 'paid') score -= 20;
  if (submission.lead_status === 'not_a_fit' || submission.lead_status === 'archived' || submission.lead_status === 'closed') score -= 45;

  return Math.max(0, Math.min(score, 100));
}

function splitStoredName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || value || 'Lead',
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
  };
}

function getTopEntry(counts: Record<string, number>) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
}

function getTopArchetype(submissions: DiagnosticSubmission[]) {
  const counts = submissions.reduce<Record<string, number>>((acc, submission) => {
    acc[submission.archetype_key] = (acc[submission.archetype_key] || 0) + 1;
    return acc;
  }, {});
  const winner = getTopEntry(counts);
  if (!winner) return 'No submissions yet';
  return archetypeLabels[winner[0] as keyof typeof archetypeLabels] || winner[0];
}

function getStrongestTheme(submissions: DiagnosticSubmission[]) {
  const counts = submissions.reduce<Record<string, number>>((acc, submission) => {
    acc[submission.archetype_key] = (acc[submission.archetype_key] || 0) + 1;
    return acc;
  }, {});
  const winner = getTopEntry(counts);
  if (!winner) return 'No data yet';
  return contentSignalByArchetype[winner[0] as keyof typeof contentSignalByArchetype] || 'No data yet';
}

function getTopService(submissions: DiagnosticSubmission[], operations: ClientOperation[]) {
  const leadServiceCounts = submissions.reduce<Record<string, number>>((acc, submission) => {
    const serviceName = submission.archetype_payload?.service || '';
    if (serviceName) acc[serviceName] = (acc[serviceName] || 0) + 1;
    return acc;
  }, {});
  const paidServiceCounts = operations
    .filter((operation) => operation.payment.status === 'confirmed')
    .reduce<Record<string, number>>((acc, operation) => {
      acc[operation.serviceTitle] = (acc[operation.serviceTitle] || 0) + 1;
      return acc;
    }, {});

  return getTopEntry(leadServiceCounts)?.[0] || getTopEntry(paidServiceCounts)?.[0] || 'No service demand yet';
}

function isInCurrentWeek(dateValue: string, now: Date) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;

  const start = new Date(now);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);

  const end = addDays(start, 7);
  return date.getTime() >= start.getTime() && date.getTime() < end.getTime();
}

export function buildAssistantDashboardContext(input: {
  submissions: DiagnosticSubmission[];
  operations: ClientOperation[];
  backlogItems?: ContentBacklogItem[];
  calendarItems?: ContentCalendarItem[];
  now?: Date;
}): AssistantDashboardContext {
  const { submissions, operations, backlogItems = [], calendarItems = [], now = new Date() } = input;
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const todayKey = getDateKey(now);
  const activeSubmissions = submissions.filter((submission) => !inactiveLeadStatuses.includes(submission.lead_status));
  const followUpsDueToday = activeSubmissions
    .filter((submission) => getStoredDateKey(submission.next_follow_up_at) === todayKey)
    .sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
  const overdueFollowUps = activeSubmissions.filter((submission) => {
    const dateKey = getStoredDateKey(submission.next_follow_up_at);
    return Boolean(dateKey && dateKey < todayKey);
  });

  return {
    totalLeads: submissions.length,
    leadsThisWeek: submissions.filter((submission) => new Date(submission.submitted_at).getTime() >= weekAgo).length,
    hotLeadsCount: activeSubmissions.filter((submission) => getPriorityScore(submission) >= 80).length,
    followUpsDueToday: followUpsDueToday.length,
    overdueFollowUps: overdueFollowUps.length,
    topArchetype: getTopArchetype(submissions),
    strongestTheme: getStrongestTheme(submissions),
    topService: getTopService(submissions, operations),
    activeClients: operations.filter(
      (operation) =>
        operation.payment.status === 'confirmed' &&
        operation.deliveryState !== 'delivered' &&
        operation.deliveryState !== 'cancelled',
    ).length,
    vaultDraftCount: backlogItems.filter((item) => item.source !== 'insights' && (item.status === 'draft' || item.status === 'idea')).length,
    scheduledPostsThisWeek: calendarItems.filter(
      (item) => item.status === 'scheduled' && isInCurrentWeek(item.publishDate, now),
    ).length,
    statusCounts: {
      new: submissions.filter((submission) => submission.lead_status === 'new').length,
      contacted: submissions.filter((submission) => submission.lead_status === 'contacted').length,
      booked: submissions.filter((submission) => submission.lead_status === 'discovery_booked').length,
      nurture: submissions.filter((submission) => submission.lead_status === 'nurture').length,
    },
    followUpsDueTodayList: followUpsDueToday.slice(0, 8).map((submission) => {
      const name = splitStoredName(submission.first_name);
      return {
        ...name,
        archetype: submission.archetype_name,
        serviceInterest: submission.archetype_payload?.service || '',
        followUpCount: submission.follow_up_count ?? 0,
        email: submission.email,
        leadId: submission.id,
      };
    }),
    recentLeads: submissions
      .filter((submission) => new Date(submission.submitted_at).getTime() >= weekAgo)
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
      .slice(0, 6)
      .map((submission) => ({
        firstName: splitStoredName(submission.first_name).firstName,
        archetype: submission.archetype_name,
        priorityScore: getPriorityScore(submission),
      })),
  };
}

export function getSuggestedQuestions(context: AssistantDashboardContext): string[] {
  const suggestions: string[] = [];
  if (context.followUpsDueToday > 0) suggestions.push('Who needs a follow-up today?');
  if (context.hotLeadsCount > 0) suggestions.push('Who are my hottest leads right now?');
  if (context.vaultDraftCount > 0) suggestions.push('What drafts are waiting in my Vault?');
  if (context.strongestTheme && context.strongestTheme !== 'No data yet') {
    suggestions.push(`Draft a post about ${context.strongestTheme}`);
  }
  suggestions.push('What should I focus on today?');
  suggestions.push('Summarise my leads this week');
  return suggestions.slice(0, 4);
}

export function normalizeAssistantDashboardContext(value: unknown): AssistantDashboardContext {
  const context = (value && typeof value === 'object' ? value : {}) as Partial<AssistantDashboardContext>;
  return {
    totalLeads: Number(context.totalLeads || 0),
    leadsThisWeek: Number(context.leadsThisWeek || 0),
    hotLeadsCount: Number(context.hotLeadsCount || 0),
    followUpsDueToday: Number(context.followUpsDueToday || 0),
    overdueFollowUps: Number(context.overdueFollowUps || 0),
    topArchetype: String(context.topArchetype || 'No submissions yet'),
    strongestTheme: String(context.strongestTheme || 'No data yet'),
    topService: String(context.topService || 'No service demand yet'),
    activeClients: Number(context.activeClients || 0),
    vaultDraftCount: Number(context.vaultDraftCount || 0),
    scheduledPostsThisWeek: Number(context.scheduledPostsThisWeek || 0),
    statusCounts: {
      new: Number(context.statusCounts?.new || 0),
      contacted: Number(context.statusCounts?.contacted || 0),
      booked: Number(context.statusCounts?.booked || 0),
      nurture: Number(context.statusCounts?.nurture || 0),
    },
    followUpsDueTodayList: Array.isArray(context.followUpsDueTodayList)
      ? context.followUpsDueTodayList.slice(0, 8).map((lead) => ({
          firstName: String(lead.firstName || 'Lead'),
          lastName: String(lead.lastName || ''),
          archetype: String(lead.archetype || ''),
          serviceInterest: String(lead.serviceInterest || ''),
          followUpCount: Number(lead.followUpCount || 0),
          email: String(lead.email || ''),
          leadId: String(lead.leadId || ''),
        }))
      : [],
    recentLeads: Array.isArray(context.recentLeads)
      ? context.recentLeads.slice(0, 6).map((lead) => ({
          firstName: String(lead.firstName || 'Lead'),
          archetype: String(lead.archetype || ''),
          priorityScore: Number(lead.priorityScore || 0),
        }))
      : [],
  };
}

export function buildAssistantSystemPrompt(context: AssistantDashboardContext): string {
  return `
You are the Growth OS Assistant for Kagiso Shabangu's career coaching business dashboard. You are her private business intelligence layer.

You speak to Kagiso as a trusted business partner. Direct, warm, never generic. Never say "Great question," "Certainly," "Of course," or "Absolutely."

DASHBOARD SNAPSHOT (data at session start - tell Kagiso to refresh if she needs updated numbers):
- Total leads: ${context.totalLeads}
- Leads this week: ${context.leadsThisWeek}
- Hot leads (priority 80+): ${context.hotLeadsCount}
- Follow-ups due today: ${context.followUpsDueToday}
- Overdue follow-ups: ${context.overdueFollowUps}
- Top archetype: ${context.topArchetype}
- Strongest signal: ${context.strongestTheme}
- Top service: ${context.topService}
- Active clients: ${context.activeClients}
- Vault drafts: ${context.vaultDraftCount}
- Scheduled posts this week: ${context.scheduledPostsThisWeek}
- Status breakdown: new ${context.statusCounts.new}, contacted ${context.statusCounts.contacted}, booked ${context.statusCounts.booked}, nurture ${context.statusCounts.nurture}

Follow-ups due today:
${context.followUpsDueTodayList.length > 0
  ? context.followUpsDueTodayList.map((lead) =>
      `- ${lead.firstName} ${lead.lastName} (${lead.archetype}, ${lead.serviceInterest}) - Follow-up ${lead.followUpCount + 1}, email ${lead.email}, leadId ${lead.leadId}`
    ).join('\n')
  : 'None - if asked, suggest checking nurture leads or drafting content instead'}

Recent leads:
${context.recentLeads.length > 0
  ? context.recentLeads.map((lead) => `- ${lead.firstName} (${lead.archetype}, priority ${lead.priorityScore})`).join('\n')
  : 'No new leads this week'}

KAGISO'S SERVICES:
- Career Clarity Session: R800, 75 min 1-on-1
- Glow Up VIP Package: R1,200, 30-day reset
- CV + LinkedIn Bundle: R500, 7 working days
- Saturday Masterclass: R450 early bird, 2-hour online
- CV Revamp: R400, 5 working days
- LinkedIn Optimisation: R300, 5 working days
- 48-Hour CV Review: R150

WHAT YOU CAN DO:
Answer questions about leads, pipeline, content, and performance.
Recommend who to follow up with and why.
Draft follow-up emails for specific leads (archetype-matched).
Draft LinkedIn posts, TikTok scripts, or captions.
Summarise what needs attention today.

WHAT YOU CANNOT DO:
Send emails or post content directly - always draft for approval.
Access external websites.
Reference leads not in the snapshot above - if data is missing, say so.

EMAIL VOICE - MATCH EXACTLY:

Example 1 - Burnt-Out Builder, First contact:
Subject: How are you doing, Sarah
Hi Sarah,

I just read your diagnostic responses and I'm not going to pitch you anything in this email.

I just want to ask: how are you doing right now?

Not the work stuff. Not the career stuff. Just you.

Because your answers tell me you've been carrying a lot for a long time. Projects, people, expectations. And the kind of tired you're describing isn't the kind that a weekend fixes.

You don't have to reply to this. But if you want to, I read everything.

Kagiso
hello@coachkagiso.co.za

Example 2 - Lost Pivoter, Follow-up 1:
Subject: Still thinking about your answer, Sarah
Hi Sarah,

I sent you an email a few days ago asking what "better" looks like for you six months from now.

You didn't reply, which is completely fine. Most people don't. Not because they're not interested, but because it's a hard question to answer when you're in the middle of it.

So let me ask a smaller one.

What's the part of your current job that you would keep if you could design the next thing from scratch?

Reply if you want. I'm just thinking out loud here.

Kagiso
hello@coachkagiso.co.za

EMAIL RULES:
- Short paragraphs, 2 sentences max
- No em dashes anywhere
- No "I hope this email finds you well" or formal openers
- End with a question or low-pressure invitation
- Sign off: "Kagiso" then "hello@coachkagiso.co.za"
- Never invent lead details not in the snapshot

BANNED WORDS - never use:
delve, tapestry, testament, elevate, nestled, multifaceted, synergy, seamlessly,
furthermore, supercharge, strategist, empowerment, manifestation, hustle, grind,
ecosystem, game-changer, leverage (as verb), vibrant, pivotal, underscore (as verb),
"it's important to note", "in today's landscape", "I hope this helps"

OUTPUT FORMAT - STRICTLY ENFORCED:
You are an API. Every response must be valid JSON. Never return markdown or plain text outside JSON.
One draft per response maximum. If multiple are requested, output the first and say "Reply 'next' for the next draft."

For answers: { "type": "answer", "message": "Direct answer, 3 sentences max" }

For recommendations: { "type": "recommendation", "message": "One sentence framing", "items": [{ "label": "Name (Archetype)", "detail": "Why", "action": "follow_up" }] }

For email drafts: { "type": "email_draft", "message": "One sentence framing", "draft": { "to": "email", "toName": "FirstName", "subject": "Subject", "body": "Full body", "templateId": "template_id", "leadId": "uuid" } }

For content drafts: { "type": "content_draft", "message": "One sentence framing", "draft": { "platform": "linkedin", "contentType": "text_post", "content": "Full content" } }
`;
}
