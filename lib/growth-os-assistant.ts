import type { ClientOperation } from '@/lib/client-operations';
import type { ContentBacklogItem, ContentCalendarItem } from '@/lib/content-studio';
import { isDiagnosticLeadStatus, type DiagnosticLeadStatus, type DiagnosticSubmission } from '@/lib/diagnostic-submissions';
import type { InboundEmailReply } from '@/lib/inbound-email-replies';
import type { SentEmail } from '@/lib/sent-emails';
import {
  DEFAULT_ASSISTANT_PREFERENCES,
  assistantPersonalityProfiles,
  normalizeAssistantPreferences,
  type AssistantPreferences,
} from '@/lib/assistant-preferences';
import {
  normalizeBusinessGoalsSettings,
  type BusinessGoal,
  type BusinessGoalsSettings,
  type GoalCategory,
  type GoalHorizon,
  type GoalLinkedArea,
  type GoalStatus,
} from '@/lib/settings';

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
  masterclass: {
    waitlistCount: number;
    recentReservations: {
      firstName: string;
      email: string;
      submittedAt: string;
      status: DiagnosticLeadStatus;
      focus: string;
    }[];
    recentInboundReplies: {
      fromName: string;
      fromEmail: string;
      receivedAt: string;
      subject: string;
      bodyExcerpt: string;
      status: string;
      draftStatus: string;
    }[];
    recentOutboundEmails: {
      toName: string;
      toEmail: string;
      sentAt: string;
      subject: string;
      bodyExcerpt: string;
      deliveryStatus: string;
    }[];
  };
  emailContext: {
    inboundRepliesTotal: number;
    newInboundReplies: number;
    draftedInboundReplies: number;
    sentEmailsTotal: number;
    sentEmailsThisWeek: number;
    engagedSentEmails: number;
    recentInboundReplies: {
      fromName: string;
      fromEmail: string;
      receivedAt: string;
      source: string;
      archetype: string;
      serviceInterest: string;
      subject: string;
      bodyExcerpt: string;
      replyDraftExcerpt: string;
      status: string;
      draftStatus: string;
    }[];
    recentOutboundEmails: {
      toName: string;
      toEmail: string;
      sentAt: string;
      source: string;
      archetype: string;
      serviceInterest: string;
      subject: string;
      bodyExcerpt: string;
      deliveryStatus: string;
      openedAt: string | null;
      clickedAt: string | null;
    }[];
  };
  goals: {
    activeCount: number;
    atRiskCount: number;
    achievedCount: number;
    primaryFocus: string;
    activeGoals: {
      id: string;
      title: string;
      horizon: GoalHorizon;
      category: GoalCategory;
      metricLabel: string;
      currentValue: number;
      targetValue: number;
      progressPercent: number;
      deadline: string;
      priority: number;
      status: GoalStatus;
      linkedArea: GoalLinkedArea;
      notes: string;
    }[];
  };
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
const goalHorizonLabels: Record<GoalHorizon, string> = {
  short_term: 'Short term',
  ninety_day: '90-day',
  one_year: '12-month',
  long_term: 'Long term',
};
const goalCategoryLabels: Record<GoalCategory, string> = {
  clients: 'Clients',
  revenue: 'Revenue',
  brand_visibility: 'Brand visibility',
  social_growth: 'Social growth',
  content: 'Content',
  operations: 'Operations',
};
const goalStatusLabels: Record<GoalStatus, string> = {
  not_started: 'Not started',
  active: 'Active',
  at_risk: 'At risk',
  achieved: 'Achieved',
  paused: 'Paused',
};

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

function compactText(value?: string | null, maxLength = 700) {
  const compacted = String(value || '').replace(/\s+/g, ' ').trim();
  if (compacted.length <= maxLength) return compacted;
  return `${compacted.slice(0, maxLength).trim()}...`;
}

function getSubmissionFocus(submission: DiagnosticSubmission) {
  const payload = submission.archetype_payload || {};
  return compactText(
    typeof payload.focus === 'string'
      ? payload.focus
      : typeof payload.action === 'string'
        ? payload.action
        : '',
    700,
  );
}

function getGoalProgress(goal: BusinessGoal) {
  if (!goal.targetValue || goal.targetValue <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)));
}

function getGoalDeadlineRank(goal: BusinessGoal) {
  if (!goal.deadline) return Number.POSITIVE_INFINITY;
  const time = new Date(goal.deadline).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function getActiveGoalSnapshots(businessGoals?: BusinessGoalsSettings | null) {
  const normalized = normalizeBusinessGoalsSettings(businessGoals);
  return normalized.goals
    .filter((goal) => goal.status !== 'achieved' && goal.status !== 'paused')
    .sort((a, b) => b.priority - a.priority || getGoalDeadlineRank(a) - getGoalDeadlineRank(b))
    .slice(0, 12)
    .map((goal) => ({
      id: goal.id,
      title: goal.title,
      horizon: goal.horizon,
      category: goal.category,
      metricLabel: goal.metricLabel,
      currentValue: goal.currentValue,
      targetValue: goal.targetValue,
      progressPercent: getGoalProgress(goal),
      deadline: goal.deadline,
      priority: goal.priority,
      status: goal.status,
      linkedArea: goal.linkedArea,
      notes: compactText(goal.notes, 500),
    }));
}

function isMasterclassSubmission(submission: DiagnosticSubmission) {
  const service = String(submission.archetype_payload?.service || '').toLowerCase();
  return submission.source === 'masterclass_waitlist' || service.includes('masterclass');
}

function isMasterclassInboundReply(reply: InboundEmailReply) {
  const source = reply.lead?.source;
  const service = String(reply.lead?.serviceInterest || '').toLowerCase();
  return source === 'masterclass_waitlist' || service.includes('masterclass');
}

function isMasterclassSentEmail(email: SentEmail) {
  const searchable = [
    email.leadSource,
    email.templateId,
    email.templateName,
    email.archetype,
    email.serviceInterest,
    email.subject,
  ].join(' ').toLowerCase();
  return searchable.includes('masterclass');
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
  inboundEmailReplies?: InboundEmailReply[];
  sentEmails?: SentEmail[];
  businessGoals?: BusinessGoalsSettings | null;
  now?: Date;
}): AssistantDashboardContext {
  const {
    submissions,
    operations,
    backlogItems = [],
    calendarItems = [],
    inboundEmailReplies = [],
    sentEmails = [],
    businessGoals = null,
    now = new Date(),
  } = input;
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
  const masterclassReservations = submissions
    .filter(isMasterclassSubmission)
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
  const masterclassInboundReplies = inboundEmailReplies.filter(isMasterclassInboundReply);
  const masterclassSentEmails = sentEmails.filter(isMasterclassSentEmail);
  const normalizedGoals = normalizeBusinessGoalsSettings(businessGoals);
  const activeGoalSnapshots = getActiveGoalSnapshots(normalizedGoals);

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
    masterclass: {
      waitlistCount: masterclassReservations.length,
      recentReservations: masterclassReservations.slice(0, 16).map((submission) => {
        const name = splitStoredName(submission.first_name);
        return {
          firstName: name.firstName,
          email: submission.email,
          submittedAt: submission.submitted_at,
          status: submission.lead_status,
          focus: getSubmissionFocus(submission),
        };
      }),
      recentInboundReplies: masterclassInboundReplies.slice(0, 10).map((reply) => ({
        fromName: reply.fromName,
        fromEmail: reply.fromEmail,
        receivedAt: reply.receivedAt,
        subject: compactText(reply.subject, 180),
        bodyExcerpt: compactText(reply.body, 900),
        status: reply.status,
        draftStatus: reply.draftStatus,
      })),
      recentOutboundEmails: masterclassSentEmails.slice(0, 8).map((email) => ({
        toName: email.toName,
        toEmail: email.toEmail,
        sentAt: email.sentAt,
        subject: compactText(email.subject, 180),
        bodyExcerpt: compactText(email.body, 700),
        deliveryStatus: email.deliveryStatus || 'sent',
      })),
    },
    emailContext: {
      inboundRepliesTotal: inboundEmailReplies.length,
      newInboundReplies: inboundEmailReplies.filter((reply) => reply.status === 'new').length,
      draftedInboundReplies: inboundEmailReplies.filter((reply) => reply.draftStatus === 'drafted').length,
      sentEmailsTotal: sentEmails.length,
      sentEmailsThisWeek: sentEmails.filter((email) => new Date(email.sentAt).getTime() >= weekAgo).length,
      engagedSentEmails: sentEmails.filter((email) => email.openedAt || email.clickedAt).length,
      recentInboundReplies: inboundEmailReplies.slice(0, 12).map((reply) => ({
        fromName: reply.fromName,
        fromEmail: reply.fromEmail,
        receivedAt: reply.receivedAt,
        source: reply.lead?.source || 'matched_email',
        archetype: reply.lead?.archetype || '',
        serviceInterest: reply.lead?.serviceInterest || '',
        subject: compactText(reply.subject, 180),
        bodyExcerpt: compactText(reply.body, 800),
        replyDraftExcerpt: compactText(reply.replyDraft, 500),
        status: reply.status,
        draftStatus: reply.draftStatus,
      })),
      recentOutboundEmails: sentEmails.slice(0, 12).map((email) => ({
        toName: email.toName,
        toEmail: email.toEmail,
        sentAt: email.sentAt,
        source: email.leadSource,
        archetype: email.archetype || '',
        serviceInterest: email.serviceInterest || '',
        subject: compactText(email.subject, 180),
        bodyExcerpt: compactText(email.body, 650),
        deliveryStatus: email.deliveryStatus || 'sent',
        openedAt: email.openedAt,
        clickedAt: email.clickedAt,
      })),
    },
    goals: {
      activeCount: activeGoalSnapshots.length,
      atRiskCount: normalizedGoals.goals.filter((goal) => goal.status === 'at_risk').length,
      achievedCount: normalizedGoals.goals.filter((goal) => goal.status === 'achieved').length,
      primaryFocus: activeGoalSnapshots[0]?.title || 'No active goals set',
      activeGoals: activeGoalSnapshots,
    },
  };
}

export function getSuggestedQuestions(context: AssistantDashboardContext): string[] {
  const suggestions: string[] = [];
  if (context.goals.activeCount > 0) suggestions.push('What should I do next to move my goals?');
  if (context.masterclass.waitlistCount > 0) suggestions.push('What should the masterclass cover?');
  if (context.emailContext.inboundRepliesTotal > 0) suggestions.push('Summarise recent inbound replies');
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
    masterclass: {
      waitlistCount: Number(context.masterclass?.waitlistCount || 0),
      recentReservations: Array.isArray(context.masterclass?.recentReservations)
        ? context.masterclass.recentReservations.slice(0, 16).map((lead) => ({
            firstName: String(lead.firstName || 'Lead'),
            email: String(lead.email || ''),
            submittedAt: String(lead.submittedAt || ''),
            status: isDiagnosticLeadStatus(lead.status) ? lead.status : 'contacted',
            focus: compactText(lead.focus, 700),
          }))
        : [],
      recentInboundReplies: Array.isArray(context.masterclass?.recentInboundReplies)
        ? context.masterclass.recentInboundReplies.slice(0, 10).map((reply) => ({
            fromName: String(reply.fromName || 'Lead'),
            fromEmail: String(reply.fromEmail || ''),
            receivedAt: String(reply.receivedAt || ''),
            subject: compactText(reply.subject, 180),
            bodyExcerpt: compactText(reply.bodyExcerpt, 900),
            status: String(reply.status || 'new'),
            draftStatus: String(reply.draftStatus || 'drafted'),
          }))
        : [],
      recentOutboundEmails: Array.isArray(context.masterclass?.recentOutboundEmails)
        ? context.masterclass.recentOutboundEmails.slice(0, 8).map((email) => ({
            toName: String(email.toName || 'Lead'),
            toEmail: String(email.toEmail || ''),
            sentAt: String(email.sentAt || ''),
            subject: compactText(email.subject, 180),
            bodyExcerpt: compactText(email.bodyExcerpt, 700),
            deliveryStatus: String(email.deliveryStatus || 'sent'),
          }))
        : [],
    },
    emailContext: {
      inboundRepliesTotal: Number(context.emailContext?.inboundRepliesTotal || 0),
      newInboundReplies: Number(context.emailContext?.newInboundReplies || 0),
      draftedInboundReplies: Number(context.emailContext?.draftedInboundReplies || 0),
      sentEmailsTotal: Number(context.emailContext?.sentEmailsTotal || 0),
      sentEmailsThisWeek: Number(context.emailContext?.sentEmailsThisWeek || 0),
      engagedSentEmails: Number(context.emailContext?.engagedSentEmails || 0),
      recentInboundReplies: Array.isArray(context.emailContext?.recentInboundReplies)
        ? context.emailContext.recentInboundReplies.slice(0, 12).map((reply) => ({
            fromName: String(reply.fromName || 'Lead'),
            fromEmail: String(reply.fromEmail || ''),
            receivedAt: String(reply.receivedAt || ''),
            source: String(reply.source || 'matched_email'),
            archetype: String(reply.archetype || ''),
            serviceInterest: String(reply.serviceInterest || ''),
            subject: compactText(reply.subject, 180),
            bodyExcerpt: compactText(reply.bodyExcerpt, 800),
            replyDraftExcerpt: compactText(reply.replyDraftExcerpt, 500),
            status: String(reply.status || 'new'),
            draftStatus: String(reply.draftStatus || 'drafted'),
          }))
        : [],
      recentOutboundEmails: Array.isArray(context.emailContext?.recentOutboundEmails)
        ? context.emailContext.recentOutboundEmails.slice(0, 12).map((email) => ({
            toName: String(email.toName || 'Lead'),
            toEmail: String(email.toEmail || ''),
            sentAt: String(email.sentAt || ''),
            source: String(email.source || 'diagnostic'),
            archetype: String(email.archetype || ''),
            serviceInterest: String(email.serviceInterest || ''),
            subject: compactText(email.subject, 180),
            bodyExcerpt: compactText(email.bodyExcerpt, 650),
            deliveryStatus: String(email.deliveryStatus || 'sent'),
            openedAt: email.openedAt ? String(email.openedAt) : null,
            clickedAt: email.clickedAt ? String(email.clickedAt) : null,
          }))
        : [],
    },
    goals: {
      activeCount: Number(context.goals?.activeCount || 0),
      atRiskCount: Number(context.goals?.atRiskCount || 0),
      achievedCount: Number(context.goals?.achievedCount || 0),
      primaryFocus: String(context.goals?.primaryFocus || 'No active goals set'),
      activeGoals: Array.isArray(context.goals?.activeGoals)
        ? context.goals.activeGoals.slice(0, 12).map((goal) => ({
            id: String(goal.id || ''),
            title: String(goal.title || 'Untitled goal'),
            horizon: ['short_term', 'ninety_day', 'one_year', 'long_term'].includes(String(goal.horizon))
              ? (goal.horizon as GoalHorizon)
              : 'ninety_day',
            category: ['clients', 'revenue', 'brand_visibility', 'social_growth', 'content', 'operations'].includes(String(goal.category))
              ? (goal.category as GoalCategory)
              : 'clients',
            metricLabel: String(goal.metricLabel || 'Progress'),
            currentValue: Number(goal.currentValue || 0),
            targetValue: Number(goal.targetValue || 0),
            progressPercent: Math.max(0, Math.min(100, Number(goal.progressPercent || 0))),
            deadline: String(goal.deadline || ''),
            priority: Math.max(1, Math.min(5, Number(goal.priority || 3))),
            status: ['not_started', 'active', 'at_risk', 'achieved', 'paused'].includes(String(goal.status))
              ? (goal.status as GoalStatus)
              : 'active',
            linkedArea: ['leads', 'pipeline', 'clients', 'finance', 'content', 'calendar', 'messages', 'tasks'].includes(String(goal.linkedArea))
              ? (goal.linkedArea as GoalLinkedArea)
              : 'leads',
            notes: compactText(goal.notes, 500),
          }))
        : [],
    },
  };
}

function getAssistantLocalTimeContext(now = new Date()) {
  const hourText = new Intl.DateTimeFormat('en-ZA', {
    hour: '2-digit',
    hourCycle: 'h23',
    timeZone: assistantTimeZone,
  }).format(now);
  const hour = Number(hourText || 0);
  const formatted = new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: assistantTimeZone,
  }).format(now);
  const daypart =
    hour < 5 ? 'late night'
    : hour < 12 ? 'morning'
    : hour < 17 ? 'afternoon'
    : hour < 21 ? 'evening'
    : 'night';

  return `${formatted} (${daypart}, ${assistantTimeZone}). Use this to make greetings feel aware of the moment, for example noticing a late-night work session when appropriate.`;
}

function buildAssistantPreferencePrompt(value?: AssistantPreferences) {
  const preferences = normalizeAssistantPreferences(value || DEFAULT_ASSISTANT_PREFERENCES);
  const profile = assistantPersonalityProfiles[preferences.tone];
  const timeContext = getAssistantLocalTimeContext();
  const greetingRule = preferences.greetNaturally
    ? `If ${preferences.userName} only greets you or makes small talk, greet her back naturally and ask what she wants to work on. Do not give a dashboard task list unless she asks for one.`
    : `You may answer simple greetings with a short dashboard-oriented prompt.`;
  const briefingRule = preferences.proactiveBriefings
    ? 'You may proactively surface dashboard priorities when it is useful.'
    : 'Do not proactively surface dashboard priorities, overdue work, or task lists unless the user asks for a briefing, focus list, priorities, or next actions.';

  return `
ASSISTANT PERSONALITY SETTINGS:
- User name: ${preferences.userName}
- Assistant name: ${preferences.assistantName}
- Role: ${preferences.roleDescription}
- Personality mode: ${profile.label}
- Mode description: ${profile.description}
- Current local time context: ${timeContext}
- Bubbly Friend nickname pool: ${preferences.bubblyNicknames.join(', ')}
- Encouragement style: ${preferences.encouragementStyle}
- Emoji permission: ${preferences.allowEmojis ? 'Allowed when contextually appropriate and used sparingly.' : 'Do not use emojis.'}
- Conversation style: ${preferences.conversationStyle}
- Behavior notes: ${preferences.behaviorInstructions}
- Avoid: ${preferences.avoidInstructions}
- Greeting rule: ${greetingRule}
- Briefing rule: ${briefingRule}
- Mode rules:
${profile.promptRules.map((rule) => `  - ${rule}`).join('\n')}
`;
}

export function buildAssistantSystemPrompt(context: AssistantDashboardContext, preferences?: AssistantPreferences): string {
  return `
You are the Growth OS Assistant for Kagiso Shabangu's career coaching business dashboard. You are her private business intelligence layer.

You speak to Kagiso as a trusted business partner. Follow the selected personality mode closely while staying useful, business-aware, and grounded in the dashboard. Never say "Great question," "Certainly," "Of course," or "Absolutely."

${buildAssistantPreferencePrompt(preferences)}

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

GOALS CONTEXT:
- Active goals: ${context.goals.activeCount}
- At-risk goals: ${context.goals.atRiskCount}
- Achieved goals: ${context.goals.achievedCount}
- Primary focus: ${context.goals.primaryFocus}

Active goal details:
${context.goals.activeGoals.length > 0
  ? context.goals.activeGoals.map((goal) =>
      `- ${goal.title} (${goalHorizonLabels[goal.horizon]}, ${goalCategoryLabels[goal.category]}, ${goalStatusLabels[goal.status]}, priority ${goal.priority}/5) - ${goal.metricLabel}: ${goal.currentValue}/${goal.targetValue || 'target not set'} (${goal.progressPercent}%). Deadline: ${goal.deadline || 'not set'}. Linked area: ${goal.linkedArea}. Notes: ${goal.notes || 'No notes'}`
    ).join('\n')
  : 'No active goals are set. If Kagiso asks for direction, ask her to add one clear 90-day, 12-month, or long-term goal in Settings > Goals.'}

Goal-aware operating rules:
- When Kagiso asks what to do next, prioritize actions that move the active goals before generic dashboard housekeeping.
- Tie content ideas, email priorities, and follow-up recommendations to the most relevant active goal when possible.
- If the dashboard activity does not support the stated goals, say that clearly and suggest a better-aligned next action.

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

MASTERCLASS WAITLIST CONTEXT:
- Waitlist leads: ${context.masterclass.waitlistCount}
- Masterclass inbound replies in context: ${context.masterclass.recentInboundReplies.length}
- Masterclass outbound emails in context: ${context.masterclass.recentOutboundEmails.length}

Recent masterclass reservation focus answers:
${context.masterclass.recentReservations.length > 0
  ? context.masterclass.recentReservations.map((lead) =>
      `- ${lead.firstName} <${lead.email}> (${lead.status}) - Wants help with: ${lead.focus || 'No focus captured'}`
    ).join('\n')
  : 'No masterclass reservation focus answers are in the current context.'}

Recent masterclass inbound replies:
${context.masterclass.recentInboundReplies.length > 0
  ? context.masterclass.recentInboundReplies.map((reply) =>
      `- ${reply.fromName} <${reply.fromEmail}> (${reply.receivedAt}, ${reply.status}/${reply.draftStatus}) - ${reply.subject}: ${reply.bodyExcerpt || 'No readable body'}`
    ).join('\n')
  : 'No synced masterclass inbound replies are in the current context.'}

Recent masterclass outbound emails:
${context.masterclass.recentOutboundEmails.length > 0
  ? context.masterclass.recentOutboundEmails.map((email) =>
      `- To ${email.toName} <${email.toEmail}> (${email.sentAt}, ${email.deliveryStatus}) - ${email.subject}: ${email.bodyExcerpt || 'No body recorded'}`
    ).join('\n')
  : 'No masterclass outbound emails are in the current context.'}

EMAIL MESSAGE CONTEXT:
- Imported inbound replies: ${context.emailContext.inboundRepliesTotal}
- New inbound replies: ${context.emailContext.newInboundReplies}
- Inbound drafts awaiting review: ${context.emailContext.draftedInboundReplies}
- Logged outbound emails: ${context.emailContext.sentEmailsTotal}
- Outbound emails this week: ${context.emailContext.sentEmailsThisWeek}
- Outbound emails opened or clicked: ${context.emailContext.engagedSentEmails}

Recent synced inbound replies:
${context.emailContext.recentInboundReplies.length > 0
  ? context.emailContext.recentInboundReplies.map((reply) =>
      `- ${reply.fromName} <${reply.fromEmail}> (${reply.source}, ${reply.serviceInterest || reply.archetype || 'No service'}, ${reply.receivedAt}) - ${reply.subject}: ${reply.bodyExcerpt || 'No readable body'}`
    ).join('\n')
  : 'No synced inbound replies are in the current context.'}

Recent logged outbound emails:
${context.emailContext.recentOutboundEmails.length > 0
  ? context.emailContext.recentOutboundEmails.map((email) =>
      `- To ${email.toName} <${email.toEmail}> (${email.source}, ${email.serviceInterest || email.archetype || 'No service'}, ${email.sentAt}, ${email.deliveryStatus}) - ${email.subject}: ${email.bodyExcerpt || 'No body recorded'}`
    ).join('\n')
  : 'No logged outbound emails are in the current context.'}

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
Analyze synced inbound replies and logged outbound emails when they are present in the context.
Turn masterclass waitlist focus answers and inbound replies into pain-point maps, session structures, and curriculum outlines.
Use read-only tool context when it is provided for lead search, lead profiles, email threads, live mailbox previews, Vault drafts, payment summaries, booking/calendar summaries, and public URLs Kagiso explicitly mentions.
Draft follow-up emails for specific leads (archetype-matched).
Draft LinkedIn posts, TikTok scripts, or captions.
Summarise what needs attention today.

WHAT YOU CANNOT DO:
Send emails or post content directly - always draft for approval.
Edit records, change statuses, refund payments, delete records, book sessions, send messages, or publish content.
Access WhatsApp conversations unless Kagiso pastes or imports them.
Access private/local URLs.
Reference leads, replies, sent emails, payments, bookings, Vault drafts, or URLs not in the snapshot or read-only tool context. If data is missing, tell Kagiso what should be synced, searched, or opened next.

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

Example 2 - Lost Pivoter, Second contact:
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

For answers: { "type": "answer", "message": "Direct answer. For analysis, pain-point maps, or curriculum requests, use concise headings and bullets inside this string." }

For recommendations: { "type": "recommendation", "message": "One sentence framing", "items": [{ "label": "Name (Archetype)", "detail": "Why", "action": "follow_up" }] }

For email drafts: { "type": "email_draft", "message": "One sentence framing", "draft": { "to": "email", "toName": "FirstName", "subject": "Subject", "body": "Full body", "templateId": "template_id", "leadId": "uuid" } }

For content drafts: { "type": "content_draft", "message": "One sentence framing", "draft": { "platform": "linkedin", "contentType": "text_post", "content": "Full content" } }
`;
}
