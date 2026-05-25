import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Download,
  FileText,
  Lightbulb,
  ListChecks,
  LockKeyhole,
  Mail,
  MessageSquare,
  Mic,
  PackageCheck,
  RefreshCcw,
  Save,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  StickyNote,
  TableProperties,
  Trash2,
  UserRoundCheck,
  WalletCards,
} from 'lucide-react';
import BatchDeleteControls from '@/components/BatchDeleteControls';
import { GrowthOSAssistant } from '@/components/assistant/GrowthOSAssistant';
import SettingsPageComponent from '@/components/settings/SettingsPageComponent';
import CustomCalendarDashboard from '@/components/calendar/CustomCalendarDashboard';
import CvAnalyzerDashboard from '@/components/career-tools/CvAnalyzerDashboard';
import ClientsDashboard from '@/components/clients/ClientsDashboard';
import ContentStudio from '@/components/content/ContentStudio';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import DashboardSidebar from '@/components/DashboardSidebar';
import DashboardDatePicker from '@/components/DashboardDatePicker';
import DashboardTopBar from '@/components/dashboard/DashboardTopBar';
import FinanceTab from '@/components/finance/FinanceTab';
import FilterDropdown from '@/components/FilterDropdown';
import BrevoNotificationImportButton from '@/components/leads/BrevoNotificationImportButton';
import FunnelActivityDeleteButton from '@/components/leads/FunnelActivityDeleteButton';
import LeadEmailButton from '@/components/leads/LeadEmailButton';
import LeadListRow from '@/components/leads/LeadListRow';
import LeadSourceBadge from '@/components/leads/LeadSourceBadge';
import MasterclassBookingsOpenButton from '@/components/leads/MasterclassBookingsOpenButton';
import MoveToNurtureButton from '@/components/leads/MoveToNurtureButton';
import MessagesLog from '@/components/messages/MessagesLog';
import TasksNotesWorkspace from '@/components/TasksNotesWorkspace';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import {
  diagnosticLeadStatuses,
  isDiagnosticAdminAuthorized,
  isDiagnosticArchetypeKey,
  isDiagnosticLeadStatus,
  listDiagnosticSubmissions,
  type DiagnosticLeadStatus,
  type DiagnosticSubmission,
} from '@/lib/diagnostic-submissions';
import {
  isDiagnosticLeadSource,
  leadSourceOptions,
  normalizeLeadSource,
  type DiagnosticLeadSource,
} from '@/lib/lead-sources';
import { listClientOperations, type ClientOperation } from '@/lib/client-operations';
import { listClientRecords } from '@/lib/clients';
import { buildDashboardContext, listContentBacklogItems, listContentCalendarItems, listResearchEntries } from '@/lib/content-studio';
import { BATCH_DELETE_CONFIRM_PHRASE } from '@/lib/dashboard-cleanup';
import {
  generateTasks,
  mergeTasks,
} from '@/lib/dashboard-tasks';
import { listManualTasks, listNotes } from '@/lib/dashboard-task-records';
import {
  getDashboardEventNotificationCount,
  listDashboardEventNotifications,
  type DashboardEventNotification,
  type DashboardNotificationEventType,
} from '@/lib/dashboard-notifications';
import { getDiagnosticAdminKey } from '@/lib/env';
import { getFollowUpNotificationCount, listFollowUpNotifications } from '@/lib/follow-up-notifications';
import { buildAssistantDashboardContext } from '@/lib/growth-os-assistant';
import { listSentEmails } from '@/lib/sent-emails';
import { EMAIL_TEMPLATES } from '@/lib/email-templates';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import {
  DEFAULT_SETTINGS,
  type BusinessProfileSettings,
  listStoredEmailTemplates,
  loadSettings,
  seedSettings,
  stripSecretsFromSettings,
  type SettingsMap,
  type StoredEmailTemplate,
} from '@/lib/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Career Diagnostic Submissions | Coach Kagiso',
  description: 'Private view for diagnostic submissions and export.',
  robots: {
    index: false,
    follow: false,
  },
};

type DiagnosticSubmissionsPageProps = {
  searchParams: Promise<{
    key?: string;
    tab?: string;
    archetype?: string;
    status?: string;
    service?: string;
    source?: string;
    segment?: string;
    state?: string;
    sort?: string;
    followUp?: string;
    q?: string;
    from?: string;
    to?: string;
    studio?: string;
    updated?: string;
    deletedCount?: string;
    error?: string;
  }>;
};

const archetypeLabels = {
  all: 'All',
  A: 'Plateaued Performer',
  B: 'Quiet Pivoter',
  C: 'Burnt-Out Builder',
  D: 'Lost Pivoter',
  E: 'Engaged Strategist',
} as const;

const revenueStatuses: DiagnosticLeadStatus[] = ['discovery_booked', 'paid'];
const inactiveLeadStatuses: DiagnosticLeadStatus[] = ['paid', 'archived', 'not_a_fit', 'nurture', 'closed'];
const dashboardTimeZone = 'Africa/Johannesburg';
const funnelActivityLabels: Record<DashboardNotificationEventType, string> = {
  lead_magnet_download: 'Lead magnet',
  masterclass_reservation: 'Masterclass',
  payment_confirmed: 'Payment',
  intake_submitted: 'Intake',
  cal_booking: 'Cal.com',
};
const contentSignalByArchetype = {
  A: 'career plateau frustration',
  B: 'quiet career pivoting',
  C: 'burnout and capacity pressure',
  D: 'career transition anxiety',
  E: 'career growth clarity',
} as const;
const dashboardArchetypeKeys = ['A', 'B', 'C', 'D', 'E'] as const;
const archetypeColors = {
  A: '#142334',
  B: '#C9AD98',
  C: '#8AA6C8',
  D: '#79A580',
  E: '#C98672',
} as const;
const dashboardTabValues = ['dashboard', 'leads', 'pipeline', 'clients', 'finance', 'career-tools', 'content', 'calendar', 'messages', 'tasks', 'settings'] as const;
type DashboardTab = (typeof dashboardTabValues)[number];
const studioWorkspaceValues = ['content', 'carousel', 'tools'] as const;
type StudioWorkspace = (typeof studioWorkspaceValues)[number];
const dashboardTabItems: { tab: DashboardTab; label: string }[] = [
  { tab: 'dashboard', label: 'Dashboard' },
  { tab: 'leads', label: 'Leads' },
  { tab: 'pipeline', label: 'Pipeline' },
  { tab: 'clients', label: 'Clients' },
  { tab: 'finance', label: 'Finance' },
  { tab: 'career-tools', label: 'Career Tools' },
  { tab: 'content', label: 'Studio' },
  { tab: 'calendar', label: 'Calendar' },
  { tab: 'messages', label: 'Messages' },
  { tab: 'tasks', label: 'Tasks & Notes' },
  { tab: 'settings', label: 'Settings' },
];

function isDashboardTab(value?: string | null): value is DashboardTab {
  return Boolean(value && dashboardTabValues.includes(value as DashboardTab));
}

function isStudioWorkspace(value?: string | null): value is StudioWorkspace {
  return Boolean(value && studioWorkspaceValues.includes(value as StudioWorkspace));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatShortDate(value?: string | null) {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function getOrdinalDay(day: number) {
  const remainder = day % 100;
  if (remainder >= 11 && remainder <= 13) return `${day}th`;
  if (day % 10 === 1) return `${day}st`;
  if (day % 10 === 2) return `${day}nd`;
  if (day % 10 === 3) return `${day}rd`;
  return `${day}th`;
}

function getDashboardGreeting(value: Date) {
  const hourText = new Intl.DateTimeFormat('en-ZA', {
    hour: '2-digit',
    hourCycle: 'h23',
    timeZone: dashboardTimeZone,
  }).format(value);
  const hour = Number(hourText.replace(/\D/g, ''));

  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatDashboardDate(value: Date) {
  const weekday = new Intl.DateTimeFormat('en-ZA', {
    weekday: 'long',
    timeZone: dashboardTimeZone,
  }).format(value);
  const month = new Intl.DateTimeFormat('en-ZA', {
    month: 'long',
    timeZone: dashboardTimeZone,
  }).format(value);
  const day = Number(
    new Intl.DateTimeFormat('en-ZA', {
      day: 'numeric',
      timeZone: dashboardTimeZone,
    }).format(value)
  );
  const year = new Intl.DateTimeFormat('en-ZA', {
    year: 'numeric',
    timeZone: dashboardTimeZone,
  }).format(value);

  return `It's ${weekday}, ${getOrdinalDay(day)} ${month} ${year}`;
}

function formatDashboardTime(value: Date) {
  return new Intl.DateTimeFormat('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: dashboardTimeZone,
  }).format(value);
}

function formatTaskDueLabel(value?: string | null, fallback = 'Today') {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  const taskDay = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: dashboardTimeZone,
    year: 'numeric',
  }).format(date);
  const today = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: dashboardTimeZone,
    year: 'numeric',
  }).format(new Date());

  return taskDay === today ? formatDashboardTime(date) : formatShortDate(value);
}

function formatDateInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: dashboardTimeZone,
    year: 'numeric',
  }).format(date);
}

function getDashboardDateKey(value: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: dashboardTimeZone,
    year: 'numeric',
  }).format(value);
}

function addDashboardDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function getStoredDateKey(value?: string | null) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return getDashboardDateKey(date);
}

function daysSince(value?: string | null, now = new Date()) {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000)));
}

function getFollowUpSequenceLabel(submission: DiagnosticSubmission) {
  const followUpCount = submission.follow_up_count ?? 0;
  const source = normalizeLeadSource(submission.source);
  if (source === 'first_90_days') {
    if (followUpCount <= 0) return 'First 90 Days follow-up (Day 4)';
    return 'First 90 Days newsletter bridge (Day 10)';
  }
  if (source === 'linkedin_headline') {
    if (followUpCount <= 0) return 'LinkedIn headline follow-up (Day 4)';
    return 'LinkedIn newsletter bridge (Day 10)';
  }
  if (source === 'masterclass_waitlist') return 'Bookings-open email (manual)';
  if (followUpCount <= 0) return 'Follow-up 1 (Day 4)';
  if (followUpCount === 1) return 'Follow-up 2 (Day 10)';
  return 'Newsletter bridge (Day 17)';
}

function formatMoney(value: number) {
  return `R${value.toLocaleString('en-ZA')}`;
}

function getPercent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function getDonutBackground(segments: { count: number; color: string }[], total: number) {
  if (!total) return 'conic-gradient(#E6DDD6 0deg 360deg)';

  let cursor = 0;
  const parts = segments
    .filter((segment) => segment.count > 0)
    .map((segment) => {
      const start = cursor;
      const end = cursor + (segment.count / total) * 360;
      cursor = end;
      return `${segment.color} ${start}deg ${end}deg`;
    });

  return parts.length ? `conic-gradient(${parts.join(', ')})` : 'conic-gradient(#E6DDD6 0deg 360deg)';
}

function getTopArchetype(submissions: DiagnosticSubmission[]) {
  const counts = submissions.reduce<Record<string, number>>((acc, submission) => {
    acc[submission.archetype_key] = (acc[submission.archetype_key] || 0) + 1;
    return acc;
  }, {});

  const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!winner) return 'No submissions yet';
  return archetypeLabels[winner[0] as keyof typeof archetypeLabels] || winner[0];
}

function getTopContentSignal(submissions: DiagnosticSubmission[]) {
  const counts = submissions.reduce<Record<string, number>>((acc, submission) => {
    acc[submission.archetype_key] = (acc[submission.archetype_key] || 0) + 1;
    return acc;
  }, {});

  const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!winner || !isDiagnosticArchetypeKey(winner[0])) return 'not enough diagnostic signal yet';
  return contentSignalByArchetype[winner[0]];
}

function getRecentCount(submissions: DiagnosticSubmission[]) {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  return submissions.filter((submission) => new Date(submission.submitted_at).getTime() >= weekAgo).length;
}

function getDueFollowUps(submissions: DiagnosticSubmission[]) {
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  return submissions.filter(
    (submission) =>
      submission.next_follow_up_at &&
      !['paid', 'archived', 'not_a_fit', 'nurture', 'closed'].includes(submission.lead_status) &&
      new Date(submission.next_follow_up_at).getTime() <= todayEnd.getTime()
  ).length;
}

function getStatusLabel(status: DiagnosticLeadStatus) {
  return diagnosticLeadStatuses.find((option) => option.value === status)?.shortLabel || status;
}

function getStatusClass(status: DiagnosticLeadStatus) {
  if (status === 'paid') return 'border-[#79A580] bg-[#EEF7EF] text-[#355C3A]';
  if (status === 'discovery_booked') return 'border-[#8AA6C8] bg-[#EEF4FA] text-[#284B70]';
  if (status === 'new') return 'border-[#C9AD98] bg-[#F7F1EC] text-[#7B5D49]';
  if (status === 'nurture') return 'border-[#DDD6FE] bg-[#F3E8FF] text-[#7C3AED]';
  if (status === 'closed') return 'border-[#79A580] bg-[#EEF7EF] text-[#355C3A]';
  if (status === 'not_a_fit' || status === 'archived') return 'border-[#D8C8BB] bg-[#FCFBFA] text-[#142334]/55';
  return 'border-[#D8C8BB] bg-white text-[#142334]';
}

function getDeliveryStateClass(state: ClientOperation['deliveryState']) {
  if (state === 'delivered') return 'border-[#79A580] bg-[#EEF7EF] text-[#355C3A]';
  if (state === 'overdue' || state === 'failed') return 'border-[#C98672] bg-[#FFF5F2] text-[#7A2F22]';
  if (state === 'due_soon') return 'border-[#C9AD98] bg-[#F7F1EC] text-[#7B5D49]';
  if (state === 'in_progress') return 'border-[#8AA6C8] bg-[#EEF4FA] text-[#284B70]';
  if (state === 'cancelled') return 'border-[#D8C8BB] bg-[#FCFBFA] text-[#142334]/55';
  return 'border-[#D8C8BB] bg-white text-[#142334]';
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
  if (revenueStatuses.includes(submission.lead_status)) score -= 20;
  if (submission.lead_status === 'not_a_fit' || submission.lead_status === 'archived' || submission.lead_status === 'closed') score -= 45;

  return Math.max(0, Math.min(score, 100));
}

function getNextAction(submission: DiagnosticSubmission) {
  const source = normalizeLeadSource(submission.source);
  if (submission.lead_status === 'paid') return 'Confirm delivery and intake';
  if (submission.lead_status === 'discovery_booked') return 'Prep for the discovery call';
  if (submission.next_follow_up_at && new Date(submission.next_follow_up_at).getTime() <= Date.now()) {
    if (source === 'first_90_days') return (submission.follow_up_count ?? 0) >= 1 ? 'Send newsletter bridge' : 'Follow up on checklist';
    if (source === 'linkedin_headline') return (submission.follow_up_count ?? 0) >= 1 ? 'Send newsletter bridge' : 'Follow up on headline';
    if (source === 'masterclass_waitlist') return 'Send bookings-open email when ready';
    return (submission.follow_up_count ?? 0) >= 2 ? 'Send newsletter bridge' : 'Follow up today';
  }
  if (source === 'masterclass_waitlist' && submission.lead_status === 'contacted' && (submission.follow_up_count ?? 0) === 0) {
    return 'Waiting for bookings to open';
  }
  if (submission.lead_status === 'new') {
    if (source === 'first_90_days') return 'Send checklist email';
    if (source === 'linkedin_headline') return 'Send headline builder email';
    if (source === 'masterclass_waitlist') return 'Send waitlist confirmation';
    return 'Send first result follow-up';
  }
  if (submission.lead_status === 'contacted') return 'Waiting for their reply';
  if (submission.lead_status === 'follow_up_later') return 'Wait for scheduled follow-up';
  if (submission.lead_status === 'nurture') return 'Keep in nurture';
  if (submission.lead_status === 'closed') return 'Closed';
  if (submission.lead_status === 'not_a_fit') return 'Keep archived unless they re-engage';
  return 'Check whether they need another nudge';
}

function getFunnelActivityBadgeClass(eventType: DashboardNotificationEventType) {
  if (eventType === 'payment_confirmed' || eventType === 'intake_submitted') {
    return 'border-[#79A580] bg-[#EEF7EF] text-[#355C3A]';
  }
  if (eventType === 'cal_booking') return 'border-[#8AA6C8] bg-[#EEF4FA] text-[#284B70]';
  if (eventType === 'masterclass_reservation') return 'border-[#DDD6FE] bg-[#F3E8FF] text-[#7C3AED]';
  return 'border-[#C9AD98] bg-[#F7F1EC] text-[#7B5D49]';
}

function getFunnelActivityAction(activity: DashboardEventNotification) {
  if (activity.eventType === 'lead_magnet_download') return 'Start nurture';
  if (activity.eventType === 'masterclass_reservation') return 'Send booking link';
  if (activity.eventType === 'payment_confirmed') return 'Watch intake';
  if (activity.eventType === 'intake_submitted') return 'Start delivery';
  if (activity.eventType === 'cal_booking') return 'Prep booking';
  return 'Review activity';
}

function getFunnelActivityPriority(activity: DashboardEventNotification) {
  const baseScore: Record<DashboardNotificationEventType, number> = {
    lead_magnet_download: 62,
    masterclass_reservation: 82,
    payment_confirmed: 92,
    intake_submitted: 94,
    cal_booking: 88,
  };
  const unreadBoost = activity.status === 'unread' ? 8 : 0;
  const agePenalty = Math.min(20, daysSince(activity.createdAt) * 3);
  return Math.max(30, Math.min(100, baseScore[activity.eventType] + unreadBoost - agePenalty));
}

function getFunnelActivityContact(activity: DashboardEventNotification) {
  return activity.contactName || activity.contactEmail || activity.title;
}

function getFunnelActivityDetail(activity: DashboardEventNotification) {
  const label = funnelActivityLabels[activity.eventType] || 'Funnel activity';
  const description = activity.description || activity.title;
  return `${label} - ${description}`;
}

function getFunnelActivityHref(activity: DashboardEventNotification) {
  if (activity.href) return activity.href;
  if (activity.contactEmail) return `mailto:${activity.contactEmail}?subject=${encodeURIComponent(activity.title)}`;
  return '';
}

function buildFunnelActivityRecordHref(id: string, key: string, returnTo: string) {
  const params = new URLSearchParams();
  if (key) params.set('key', key);
  if (returnTo) params.set('returnTo', returnTo);
  return `/resources/career-diagnostic/submissions/funnel/${id}?${params.toString()}`;
}

function getDateBoundaryTimestamp(value: string | null | undefined, boundary: 'start' | 'end') {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00+02:00`);
  if (Number.isNaN(date.getTime())) return null;
  if (boundary === 'end') date.setHours(23, 59, 59, 999);
  return date.getTime();
}

function getRecentFunnelActivityCount(activities: DashboardEventNotification[]) {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  return activities.filter((activity) => new Date(activity.createdAt).getTime() >= weekAgo).length;
}

function filterFunnelActivities(
  activities: DashboardEventNotification[],
  filters: { query?: string | null; from?: string | null; to?: string | null }
) {
  const queryText = filters.query?.trim().toLowerCase() || '';
  const fromTimestamp = getDateBoundaryTimestamp(filters.from, 'start');
  const toTimestamp = getDateBoundaryTimestamp(filters.to, 'end');

  return activities
    .filter((activity) => activity.status !== 'archived')
    .filter((activity) => {
      const createdAt = new Date(activity.createdAt).getTime();
      if (fromTimestamp && createdAt < fromTimestamp) return false;
      if (toTimestamp && createdAt > toTimestamp) return false;
      if (!queryText) return true;

      const searchable = [
        activity.title,
        activity.description,
        activity.contactName,
        activity.contactEmail,
        activity.source,
        funnelActivityLabels[activity.eventType],
        JSON.stringify(activity.metadata || {}),
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(queryText);
    })
    .sort(
      (a, b) =>
        Number(b.status === 'unread') - Number(a.status === 'unread') ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

function getFunnelActivityLeadSource(activity: DashboardEventNotification): DiagnosticLeadSource | null {
  if (activity.eventType === 'masterclass_reservation') return 'masterclass_waitlist';
  if (activity.eventType !== 'lead_magnet_download') return null;

  const searchable = [activity.source, activity.title, activity.description, JSON.stringify(activity.metadata || {})]
    .join(' ')
    .toLowerCase();
  if (searchable.includes('linkedin')) return 'linkedin_headline';
  if (searchable.includes('90') || searchable.includes('manager')) return 'first_90_days';
  return null;
}

function getLeadActivityKey(email: string | null | undefined, source: DiagnosticLeadSource | null) {
  if (!email || !source) return '';
  return `${email.toLowerCase()}::${source}`;
}

function getFunnelActivityServiceInterest(source: DiagnosticLeadSource) {
  if (source === 'masterclass_waitlist') return 'Saturday Masterclass';
  if (source === 'linkedin_headline') return 'CV + LinkedIn Bundle';
  if (source === 'first_90_days') return 'Career Clarity Session';
  return '';
}

function buildFunnelActivityEmailLead(activity: DashboardEventNotification) {
  const source = getFunnelActivityLeadSource(activity);
  if (!source || !activity.contactEmail) return null;

  return {
    id: '',
    firstName: activity.contactName || activity.contactEmail.split('@')[0] || getFunnelActivityContact(activity),
    email: activity.contactEmail,
    archetype: '',
    serviceInterest: getFunnelActivityServiceInterest(source),
    leadStatus: 'new',
    followUpCount: 0,
    lastContactedAt: null,
    source,
    downloadLink: typeof activity.metadata?.pdfUrl === 'string' ? activity.metadata.pdfUrl : null,
    notificationId: activity.id,
  };
}

function isFollowUpDue(submission: DiagnosticSubmission, referenceDate: Date) {
  return Boolean(
    submission.next_follow_up_at &&
      new Date(submission.next_follow_up_at).getTime() <= referenceDate.getTime()
  );
}

function needsPipelineAction(submission: DiagnosticSubmission, referenceDate: Date) {
  if (inactiveLeadStatuses.includes(submission.lead_status)) return false;
  if (submission.lead_status === 'new') return true;
  if (submission.lead_status === 'discovery_booked') return true;
  return isFollowUpDue(submission, referenceDate);
}

function isWaitingForResponse(submission: DiagnosticSubmission, referenceDate: Date) {
  if (submission.lead_status !== 'contacted') return false;
  return !isFollowUpDue(submission, referenceDate);
}

function getLeadStatusSortRank(status: DiagnosticLeadStatus) {
  if (status === 'new') return 1;
  if (status === 'contacted') return 2;
  if (status === 'discovery_booked') return 3;
  if (status === 'paid') return 4;
  if (status === 'follow_up_later') return 5;
  if (status === 'nurture') return 8;
  if (status === 'not_a_fit') return 9;
  if (status === 'closed') return 10;
  return 11;
}

function buildFilterHref(
  key: string | undefined,
  current: {
    tab?: string;
    archetype?: string;
    status?: string;
    service?: string;
    source?: string;
    followUp?: string;
    q?: string;
    taskView?: string;
    taskType?: string;
    taskSort?: string;
    noteQuery?: string;
    from?: string;
    to?: string;
  },
  next: Partial<typeof current>
) {
  const params = new URLSearchParams();
  if (key) params.set('key', key);

  const merged = { ...current, ...next };
  Object.entries(merged).forEach(([paramKey, value]) => {
    if (value && value !== 'all' && !(paramKey === 'tab' && value === 'dashboard')) params.set(paramKey, value);
  });

  return `/resources/career-diagnostic/submissions?${params.toString()}`;
}

function buildDashboardTabHref(key: string | undefined, tab: DashboardTab) {
  const params = new URLSearchParams();
  if (key) params.set('key', key);
  if (tab !== 'dashboard') params.set('tab', tab);
  const query = params.toString();
  return query ? `/resources/career-diagnostic/submissions?${query}` : '/resources/career-diagnostic/submissions';
}

function buildLeadEmailModalLead(submission: DiagnosticSubmission) {
  return {
    id: submission.id,
    firstName: submission.first_name,
    email: submission.email,
    archetype: submission.archetype_name,
    serviceInterest: submission.archetype_payload?.service || '',
    leadStatus: submission.lead_status,
    followUpCount: submission.follow_up_count,
    lastContactedAt: submission.last_contacted_at,
    source: submission.source,
    downloadLink: submission.download_link,
  };
}

function FunnelActivityRows({
  activities,
  adminKey,
  returnHref,
}: {
  activities: DashboardEventNotification[];
  adminKey: string;
  returnHref: string;
}) {
  if (activities.length === 0) {
    return (
      <div className="rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA] p-6 text-[14px] leading-relaxed text-[#142334]/62">
        No masterclass reservations, lead magnet downloads, payments, or bookings match this view yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA]">
      <div className="hidden border-b border-[#D8C8BB] bg-[#F7F1EC] px-6 py-4 lg:grid lg:grid-cols-[1.25fr_0.78fr_0.72fr_0.5fr_0.72fr_auto] lg:gap-5">
        {['Lead', 'Source', 'Status', 'Signal', 'Received', 'Actions'].map((label) => (
          <p key={label} className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">
            {label}
          </p>
        ))}
      </div>
      <div className="divide-y divide-[#D8C8BB]">
        {activities.map((activity) => {
          const href = getFunnelActivityHref(activity);
          const priority = getFunnelActivityPriority(activity);
          const recordHref = buildFunnelActivityRecordHref(activity.id, adminKey, returnHref);
          const contactLabel = getFunnelActivityContact(activity);
          const emailLead = buildFunnelActivityEmailLead(activity);

          return (
            <div key={activity.id} className="grid gap-4 px-4 py-4 lg:grid-cols-[1.25fr_0.78fr_0.72fr_0.5fr_0.72fr_auto] lg:items-center">
              <div className="min-w-0">
                <p className="truncate font-serif text-[29px] leading-none text-[#142334]">
                  {getFunnelActivityContact(activity)}
                </p>
                {activity.contactEmail && (
                  <a
                    href={`mailto:${activity.contactEmail}`}
                    className="mt-2 flex min-w-0 items-center gap-2 text-[14px] leading-relaxed text-[#142334]/72 transition hover:text-[#C9AD98]"
                  >
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{activity.contactEmail}</span>
                  </a>
                )}
              </div>
              <div>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${getFunnelActivityBadgeClass(activity.eventType)}`}>
                  {funnelActivityLabels[activity.eventType]}
                </span>
                <p className="mt-2 text-[15px] leading-relaxed text-[#142334]">
                  {activity.source.replace(/-/g, ' ')}
                </p>
              </div>
              <div>
                <span className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.17em] ${
                  activity.status === 'unread'
                    ? 'border-[#C9AD98] bg-[#F7F1EC] text-[#7B5D49]'
                    : 'border-[#D8C8BB] bg-white text-[#142334]/62'
                }`}>
                  {activity.status === 'unread' ? 'New' : 'Reviewed'}
                </span>
                <p className="mt-3 text-[12px] text-[#142334]/58">Captured {formatDate(activity.createdAt)}</p>
              </div>
              <div>
                <p className="font-serif text-[30px] leading-none text-[#142334]">{priority}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F1E7DF]">
                  <div className="h-full bg-[#C9AD98]" style={{ width: `${priority}%` }} />
                </div>
              </div>
              <div>
                <p className="text-[14px] leading-relaxed text-[#142334]/72">{formatShortDate(activity.createdAt)}</p>
                <p className="mt-1 line-clamp-2 text-[12px] text-[#142334]/58">{activity.description || activity.title}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={recordHref}
                  className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98]"
                >
                  View <ArrowUpRight className="h-4 w-4" />
                </Link>
                {emailLead ? (
                  <LeadEmailButton
                    lead={emailLead}
                    initialNotes={[]}
                    label="Email"
                    className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98]"
                  />
                ) : href ? (
                  <a
                    href={href}
                    className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98]"
                  >
                    Email <Mail className="h-4 w-4" />
                  </a>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-[#D8C8BB] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334]/50">
                    No email
                  </span>
                )}
                <FunnelActivityDeleteButton
                  adminKey={adminKey}
                  notificationId={activity.id}
                  contactLabel={contactLabel}
                  returnHref={returnHref}
                  compact
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FunnelPipelinePanel({
  activities,
  adminKey,
  returnHref,
}: {
  activities: DashboardEventNotification[];
  adminKey: string;
  returnHref: string;
}) {
  return (
    <div className="mb-5 overflow-hidden rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#D8C8BB] px-6 py-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">
            Funnel activity
          </p>
          <h2 className="mt-2 font-serif text-[36px] leading-tight">New non-diagnostic leads</h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[#142334]/62">
            Masterclass reservations, lead magnet downloads, payments, intake briefs, and bookings sit here so they do not disappear from the pipeline.
          </p>
        </div>
        <BrevoNotificationImportButton adminKey={adminKey} compact />
      </div>
      {activities.length === 0 ? (
        <div className="p-6 text-[15px] leading-relaxed text-[#142334]/70">
          No funnel activity matches this view yet.
        </div>
      ) : (
        <div className="divide-y divide-[#D8C8BB]">
          {activities.map((activity) => {
            const href = getFunnelActivityHref(activity);
            const priority = getFunnelActivityPriority(activity);
            const recordHref = buildFunnelActivityRecordHref(activity.id, adminKey, returnHref);
            const contactLabel = getFunnelActivityContact(activity);
            const emailLead = buildFunnelActivityEmailLead(activity);

            return (
              <div key={activity.id} className="grid gap-5 px-6 py-5 lg:grid-cols-[1fr_0.46fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-serif text-[29px] leading-none text-[#142334]">
                      {getFunnelActivityContact(activity)}
                    </p>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.17em] ${getFunnelActivityBadgeClass(activity.eventType)}`}>
                      {funnelActivityLabels[activity.eventType]}
                    </span>
                    {activity.status === 'unread' && (
                      <span className="rounded-full bg-[#142334] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.17em] text-white">
                        New
                      </span>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-[#142334]/68">
                    {getFunnelActivityDetail(activity)}
                  </p>
                  <p className="mt-2 text-[13px] font-semibold uppercase tracking-[0.17em] text-[#C9AD98]">
                    {getFunnelActivityAction(activity)}
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A09086]">
                      Signal
                    </p>
                    <p className="font-serif text-[26px] leading-none text-[#142334]">{priority}</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F1E7DF]">
                    <div className="h-full bg-[#C9AD98]" style={{ width: `${priority}%` }} />
                  </div>
                  <p className="mt-3 text-[12px] text-[#142334]/58">
                    Captured: {formatShortDate(activity.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Link
                    href={recordHref}
                    className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98]"
                  >
                    View
                  </Link>
                  {emailLead ? (
                    <LeadEmailButton
                      lead={emailLead}
                      initialNotes={[]}
                      label="Email"
                      className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98]"
                    />
                  ) : href ? (
                    <a
                      href={href}
                      className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98]"
                    >
                      Email
                    </a>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-[#D8C8BB] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334]/50">
                      No email
                    </span>
                  )}
                  <FunnelActivityDeleteButton
                    adminKey={adminKey}
                    notificationId={activity.id}
                    contactLabel={contactLabel}
                    returnHref={returnHref}
                    compact
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

async function loadSettingsBundle(): Promise<{ settings: SettingsMap; emailTemplates: StoredEmailTemplate[] }> {
  try {
    const supabase = createSupabaseServiceClient();
    await seedSettings(supabase);
    const [settings, emailTemplates] = await Promise.all([
      loadSettings(supabase),
      listStoredEmailTemplates(supabase),
    ]);

    return {
      settings: stripSecretsFromSettings(settings),
      emailTemplates,
    };
  } catch {
    return {
      settings: DEFAULT_SETTINGS,
      emailTemplates: EMAIL_TEMPLATES.map((template) => ({ ...template, active: true })),
    };
  }
}

async function loadDashboardProfilePhoto() {
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.from('settings').select('value').eq('key', 'business_profile').single();
    if (error || !data?.value) return DEFAULT_SETTINGS.business_profile.profilePhotoUrl;

    const profile = {
      ...DEFAULT_SETTINGS.business_profile,
      ...(data.value as Partial<BusinessProfileSettings>),
    };
    return profile.profilePhotoUrl || DEFAULT_SETTINGS.business_profile.profilePhotoUrl;
  } catch {
    return DEFAULT_SETTINGS.business_profile.profilePhotoUrl;
  }
}

function AccessGate() {
  const hasKeyConfigured = Boolean(getDiagnosticAdminKey());

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#FCFBFA] text-[#142334] pt-[124px] pb-24">
        <div className="mx-auto max-w-[760px] px-6 lg:px-8">
          <Reveal>
            <div className="border border-[#D8C8BB] bg-white p-8 md:p-10">
              <LockKeyhole className="h-8 w-8 text-[#C9AD98]" />
              <p className="mt-8 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#C9AD98]">
                Private access
              </p>
              <h1 className="mt-4 font-serif text-[42px] leading-tight">
                Diagnostic submissions are protected.
              </h1>
              <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[#142334]/72">
                This page includes names, emails, and result data, so it is hidden behind an access key. Enter the key below to open the dashboard and export submissions.
              </p>

              {hasKeyConfigured ? (
                <form action="/resources/career-diagnostic/submissions" method="get" className="mt-8 grid gap-3 md:grid-cols-[1fr_auto]">
                  <input
                    type="password"
                    name="key"
                    required
                    placeholder="Diagnostic admin key"
                    className="w-full border border-[#D8C8BB] bg-[#FCFBFA] px-4 py-3.5 text-[15px] outline-none focus:border-[#142334]"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#142334] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
                  >
                    Open dashboard <ArrowUpRight className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <div className="mt-8 border border-[#C9AD98]/55 bg-[#F7F1EC] p-5 text-[14px] leading-relaxed text-[#142334]/72">
                  Add `DIAGNOSTIC_ADMIN_KEY` to `.env.local`, restart the dev server, and this private dashboard will unlock.
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default async function DiagnosticSubmissionsPage({ searchParams }: DiagnosticSubmissionsPageProps) {
  const {
    key,
    tab,
    archetype,
    status,
    service,
    source,
    segment,
    state,
    sort,
    followUp,
    q,
    from,
    to,
    studio,
    updated,
    deletedCount,
    error,
  } = await searchParams;

  if (!isDiagnosticAdminAuthorized(key)) {
    return <AccessGate />;
  }

  const selectedFilter = isDiagnosticArchetypeKey(archetype) ? archetype : 'all';
  const selectedStatus = isDiagnosticLeadStatus(status) ? status : 'all';
  const selectedSource = isDiagnosticLeadSource(source) ? source : 'all';
  const selectedFollowUp = ['due', 'scheduled', 'none'].includes(followUp || '') ? followUp : 'all';
  const activeTab = isDashboardTab(tab) ? tab : 'dashboard';
  const activeStudioWorkspace = isStudioWorkspace(studio) ? studio : 'content';
  const sentEmailFilters = {
    query: activeTab === 'messages' ? q : null,
    archetype: activeTab === 'messages' ? archetype : null,
    source: activeTab === 'messages' ? source : null,
    status: activeTab === 'messages' ? status : null,
    segment: activeTab === 'messages' ? segment : null,
    state: activeTab === 'messages' ? state : null,
    sort: activeTab === 'messages' ? sort : null,
    from: activeTab === 'messages' ? from : null,
    to: activeTab === 'messages' ? to : null,
  };
  const [
    submissions,
    operations,
    manualTasks,
    taskNotes,
    sentEmailLog,
    clientRecords,
    contentCalendarItems,
    contentBacklogItems,
    researchItems,
    followUpNotificationCount,
    dashboardEventNotificationCount,
    dashboardEventNotifications,
    sidebarFollowUps,
    settingsBundle,
    profilePhotoUrl,
  ] = await Promise.all([
    listDiagnosticSubmissions({
      archetype,
      status,
      service,
      source: selectedSource === 'all' ? null : selectedSource,
      followUp,
      query: q,
      from,
      to,
    }),
    listClientOperations({ from, to }),
    listManualTasks(),
    listNotes(),
    activeTab === 'messages'
      ? listSentEmails(sentEmailFilters)
      : Promise.resolve({
          emails: [],
          totalCount: 0,
          thisWeekCount: 0,
          uniqueLeadCount: 0,
          importedCount: 0,
          engagedCount: 0,
          segmentOptions: [],
          stateOptions: [],
          hasFilters: false,
        }),
    activeTab === 'clients' ? listClientRecords() : Promise.resolve([]),
    listContentCalendarItems(),
    listContentBacklogItems(),
    activeTab === 'content' ? listResearchEntries() : Promise.resolve([]),
    getFollowUpNotificationCount(),
    getDashboardEventNotificationCount(),
    listDashboardEventNotifications({ limit: 120, status: 'all' }),
    listFollowUpNotifications({ includeTomorrow: false, limit: 4 }),
    activeTab === 'settings' ? loadSettingsBundle() : Promise.resolve(null),
    loadDashboardProfilePhoto(),
  ]);
  const dashboardNotificationCount = followUpNotificationCount + dashboardEventNotificationCount;
  const exportHref = `/api/diagnostic/export?key=${encodeURIComponent(key || '')}${
    selectedFilter === 'all' ? '' : `&archetype=${selectedFilter}`
  }${selectedSource === 'all' ? '' : `&source=${selectedSource}`}`;
  const currentFilters = {
    tab: activeTab,
    archetype: selectedFilter,
    status: selectedStatus,
    service,
    source: selectedSource,
    followUp: selectedFollowUp,
    q,
    from,
    to,
  };
  const sourceLeadActivityKeys = new Set(
    submissions
      .filter((submission) => normalizeLeadSource(submission.source) !== 'diagnostic')
      .map((submission) => getLeadActivityKey(submission.email, normalizeLeadSource(submission.source)))
      .filter(Boolean)
  );
  const funnelActivities = filterFunnelActivities(dashboardEventNotifications, { query: q, from, to }).filter((activity) => {
    const activitySource = getFunnelActivityLeadSource(activity);
    if (!activitySource) return true;
    return !sourceLeadActivityKeys.has(getLeadActivityKey(activity.contactEmail, activitySource));
  });
  const funnelLeadActivities =
    selectedSource === 'all'
      ? funnelActivities
      : funnelActivities.filter((activity) => getFunnelActivityLeadSource(activity) === selectedSource);
  const funnelPipelineActivities = funnelLeadActivities
    .filter((activity) => activity.status === 'unread')
    .sort(
      (a, b) =>
        getFunnelActivityPriority(b) - getFunnelActivityPriority(a) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 8);
  const leadsReturnHref = buildFilterHref(key, currentFilters, { tab: 'leads' });
  const pipelineReturnHref = buildFilterHref(key, currentFilters, { tab: 'pipeline' });
  const totalLeadRecordCount = submissions.length + funnelLeadActivities.length;
  const uniqueFunnelEmails = funnelLeadActivities
    .map((activity) => activity.contactEmail)
    .filter((email): email is string => Boolean(email));
  const combinedUniqueEmails = new Set([...submissions.map((submission) => submission.email), ...uniqueFunnelEmails]).size;
  const sortedSubmissions = [...submissions].sort(
    (a, b) => getLeadStatusSortRank(a.lead_status) - getLeadStatusSortRank(b.lead_status) || getPriorityScore(b) - getPriorityScore(a)
  );
  const dashboardNow = new Date();
  const actionQueue = sortedSubmissions.filter((submission) => needsPipelineAction(submission, dashboardNow)).slice(0, 8);
  const waitingForResponseQueue = sortedSubmissions.filter((submission) => isWaitingForResponse(submission, dashboardNow)).slice(0, 6);
  const serviceCounts = submissions.reduce<Record<string, number>>((acc, submission) => {
    const serviceName = submission.archetype_payload?.service || 'No recommendation';
    acc[serviceName] = (acc[serviceName] || 0) + 1;
    return acc;
  }, {});
  const maxServiceCount = Math.max(1, ...Object.values(serviceCounts));
  const statusCounts = diagnosticLeadStatuses.map((statusOption) => ({
    ...statusOption,
    count: submissions.filter((submission) => submission.lead_status === statusOption.value).length,
  }));
  const masterclassWaitlistCount = submissions.filter((submission) => submission.source === 'masterclass_waitlist').length;
  const masterclassBookingsOpenEligibleCount = submissions.filter(
    (submission) =>
      submission.source === 'masterclass_waitlist' &&
      submission.lead_status === 'contacted' &&
      (submission.follow_up_count ?? 0) === 0
  ).length;
  const conversionReady = submissions.filter((submission) => revenueStatuses.includes(submission.lead_status)).length;
  const confirmedOperations = operations.filter((operation) => operation.payment.status === 'confirmed');
  const totalRevenue = confirmedOperations.reduce((total, operation) => total + operation.payment.amount, 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthlyConfirmedOperations = confirmedOperations.filter(
    (operation) => new Date(operation.payment.confirmed_at || operation.payment.created_at).getTime() >= monthStart.getTime()
  );
  const monthlyRevenue = monthlyConfirmedOperations.reduce((total, operation) => total + operation.payment.amount, 0);
  const waitingForIntake = operations.filter((operation) => operation.deliveryState === 'waiting_for_intake');
  const activeDeliveryQueue = operations
    .filter((operation) => ['ready', 'in_progress', 'due_soon', 'overdue'].includes(operation.deliveryState))
    .slice(0, 8);
  const operationServiceCounts = confirmedOperations.reduce<Record<string, number>>((acc, operation) => {
    acc[operation.serviceTitle] = (acc[operation.serviceTitle] || 0) + operation.payment.amount;
    return acc;
  }, {});
  const maxOperationRevenue = Math.max(1, ...Object.values(operationServiceCounts));
  const dashboardGreeting = getDashboardGreeting(dashboardNow);
  const dashboardDateLabel = formatDashboardDate(dashboardNow);
  const dashboardTimeLabel = formatDashboardTime(dashboardNow);
  const dashboardTodayKey = getDashboardDateKey(dashboardNow);
  const dashboardTomorrowKey = getDashboardDateKey(addDashboardDays(dashboardNow, 1));
  const followUpsDueToday = submissions
    .filter(
      (submission) =>
        submission.lead_status === 'contacted' &&
        getStoredDateKey(submission.next_follow_up_at) === dashboardTodayKey &&
        (submission.follow_up_count ?? 0) <= 2
    )
    .sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
  const followUpsDueTomorrow = submissions
    .filter(
      (submission) =>
        submission.lead_status === 'contacted' &&
        getStoredDateKey(submission.next_follow_up_at) === dashboardTomorrowKey &&
        (submission.follow_up_count ?? 0) <= 2
    )
    .sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
  const nurtureSuggestions = submissions
    .filter(
      (submission) =>
        submission.lead_status === 'contacted' &&
        (submission.follow_up_count ?? 0) >= 3 &&
        daysSince(submission.last_contacted_at, dashboardNow) >= 2
    )
    .sort((a, b) => daysSince(b.last_contacted_at, dashboardNow) - daysSince(a.last_contacted_at, dashboardNow));
  const recentLeadCount = getRecentCount(submissions);
  const dueFollowUpCount = getDueFollowUps(submissions);
  const topArchetype = getTopArchetype(submissions);
  const strongestContentSignal = getTopContentSignal(submissions);
  const conversionRate = Math.round((conversionReady / Math.max(1, submissions.length)) * 100);
  const newLeadCount = submissions.filter((submission) => submission.lead_status === 'new').length;
  const hotLeadCount = sortedSubmissions.filter(
    (submission) =>
      !['paid', 'archived', 'not_a_fit', 'nurture', 'closed'].includes(submission.lead_status) &&
      (submission.lead_status === 'discovery_booked' || getPriorityScore(submission) >= 70)
  ).length;
  const paidClientCount = confirmedOperations.length;
  const overdueDeliveryCount = operations.filter((operation) => operation.deliveryState === 'overdue').length;
  const paidDeliveryPressureCount = operations.filter(
    (operation) =>
      operation.payment.status === 'confirmed' &&
      ['waiting_for_intake', 'ready', 'in_progress', 'due_soon', 'overdue'].includes(operation.deliveryState)
  ).length;
  const activeLeadCount = submissions.filter((submission) => !['archived', 'not_a_fit', 'closed'].includes(submission.lead_status)).length;
  const contactedLeadCount = submissions.filter((submission) => submission.lead_status === 'contacted').length;
  const bookedLeadCount = submissions.filter((submission) => submission.lead_status === 'discovery_booked').length;
  const followUpLaterCount = submissions.filter((submission) => submission.lead_status === 'follow_up_later').length;
  const pipelineStageCards = [
    ['Funnel', funnelLeadActivities.length, 'Downloads and reservations'],
    ['Lead magnet', newLeadCount, 'New diagnostic signups'],
    ['Contacted', contactedLeadCount, 'First reply sent'],
    ['Call booked', bookedLeadCount, 'Discovery scheduled'],
    ['Follow-up', dueFollowUpCount + followUpLaterCount, 'Due or parked'],
    ['Paid client', paidClientCount, 'Confirmed payments'],
  ] as const;
  const maxPipelineStageCount = Math.max(1, ...pipelineStageCards.map(([, count]) => count));
  const pipelineHighlights = actionQueue.slice(0, 3);
  const archetypeBreakdown = dashboardArchetypeKeys
    .map((archetypeKey) => {
      const count = submissions.filter((submission) => submission.archetype_key === archetypeKey).length;
      return {
        key: archetypeKey,
        label: archetypeLabels[archetypeKey],
        count,
        percentage: getPercent(count, submissions.length),
        color: archetypeColors[archetypeKey],
      };
    })
    .sort((a, b) => b.count - a.count);
  const archetypeDonutBackground = getDonutBackground(archetypeBreakdown, submissions.length);
  const monthlyOperationServiceCounts = monthlyConfirmedOperations.reduce<Record<string, number>>((acc, operation) => {
    acc[operation.serviceTitle] = (acc[operation.serviceTitle] || 0) + operation.payment.amount;
    return acc;
  }, {});
  const monthlyRevenueServices = Object.entries(monthlyOperationServiceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const maxMonthlyServiceRevenue = Math.max(1, ...Object.values(monthlyOperationServiceCounts));
  const topMonthlyServiceShare = getPercent(monthlyRevenueServices[0]?.[1] || 0, monthlyRevenue);
  const averageMonthlyPaidPackage = monthlyConfirmedOperations.length
    ? Math.round(monthlyRevenue / monthlyConfirmedOperations.length)
    : 0;
  const leadToCallRate = getPercent(bookedLeadCount, submissions.length);
  const revenueInsightCards = [
    [`${topMonthlyServiceShare}%`, 'Top-service share'],
    [formatMoney(averageMonthlyPaidPackage), 'Avg paid package'],
    [String(paidDeliveryPressureCount), 'Delivery pressure'],
    [`${leadToCallRate}%`, 'Lead-to-call rate'],
  ] as const;
  const todayPriorityActions = [
    dueFollowUpCount > 0
      ? {
          title: 'Clear due follow-ups',
          detail: `${dueFollowUpCount} lead${dueFollowUpCount === 1 ? '' : 's'} need${dueFollowUpCount === 1 ? 's' : ''} attention before the day closes.`,
          meta: 'Follow-up pressure',
          href: buildFilterHref(key, currentFilters, { tab: 'pipeline', followUp: 'due' }),
          cta: 'Open pipeline',
        }
      : null,
    paidDeliveryPressureCount > 0
      ? {
          title: 'Move paid client delivery',
          detail: `${paidDeliveryPressureCount} paid client${paidDeliveryPressureCount === 1 ? ' is' : 's are'} waiting on intake, delivery, or overdue work.`,
          meta: 'Client delivery',
          href: buildFilterHref(key, currentFilters, { tab: 'clients' }),
          cta: 'Open clients',
        }
      : null,
    hotLeadCount > 0
      ? {
          title: 'Work the hot leads',
          detail: `${hotLeadCount} lead${hotLeadCount === 1 ? '' : 's'} currently have a high score or booked-call signal.`,
          meta: 'Sales movement',
          href: buildFilterHref(key, currentFilters, { tab: 'pipeline' }),
          cta: 'Open pipeline',
        }
      : null,
    newLeadCount > 0
      ? {
          title: 'Send first-result follow-ups',
          detail: `${newLeadCount} new diagnostic lead${newLeadCount === 1 ? '' : 's'} still need the first conversion touch.`,
          meta: 'New lead response',
          href: buildFilterHref(key, currentFilters, { tab: 'leads', status: 'new' }),
          cta: 'Open leads',
        }
      : null,
    {
      title: 'Create one signal-led post',
      detail: `Use ${strongestContentSignal} as today's content angle and route the CTA back to the strongest service demand.`,
      meta: 'Content action',
      href: buildFilterHref(key, currentFilters, { tab: 'content' }),
      cta: 'Open content',
    },
  ].filter(Boolean) as { title: string; detail: string; meta: string; href: string; cta: string }[];
  const todayTaskList = [
    ...actionQueue.slice(0, 3).map((submission) => ({
      title: `${submission.first_name || 'Lead'} - ${getNextAction(submission)}`,
      detail: `${submission.archetype_payload?.service || submission.archetype_name} - Priority ${getPriorityScore(submission)}`,
      href: `/resources/career-diagnostic/submissions/${submission.id}?key=${encodeURIComponent(key || '')}`,
    })),
    ...activeDeliveryQueue.slice(0, 2).map((operation) => ({
      title: `${operation.payment.buyer_name || operation.intake?.form_data.fullName || 'Client'} - ${operation.deliveryLabel}`,
      detail: `${operation.serviceTitle} - Due ${formatShortDate(operation.deliveryDueAt)}`,
      href: buildFilterHref(key, currentFilters, { tab: 'clients' }),
    })),
    {
      title: 'Record voice note for warm lead segment',
      detail: `Use the "${strongestContentSignal}" angle from this week's diagnostics.`,
      href: buildFilterHref(key, currentFilters, { tab: 'content' }),
    },
  ].slice(0, 5);
  const generatedTasks = generateTasks(submissions, operations, {
    contentSignal: strongestContentSignal,
    topArchetype,
    now: dashboardNow,
  });
  const dashboardTasks = mergeTasks(generatedTasks, manualTasks, taskNotes, submissions, operations);
  const briefingNumberClass =
    'inline-flex min-w-5 items-center justify-center rounded-[5px] bg-white px-1.5 py-0.5 text-[13px] font-semibold leading-none text-[#8C7466]';
  const dashboardMetricCards = [
    {
      label: 'New leads',
      value: String(newLeadCount),
      caption: `Updated ${dashboardTimeLabel}`,
      icon: UserRoundCheck,
      href: buildFilterHref(key, currentFilters, { tab: 'leads', status: 'new' }),
    },
    {
      label: 'Hot leads',
      value: String(hotLeadCount),
      caption: 'Priority score or booked call',
      icon: Sparkles,
      href: buildFilterHref(key, currentFilters, { tab: 'pipeline' }),
    },
    {
      label: 'Follow-ups due',
      value: String(dueFollowUpCount),
      caption: `Due by ${dashboardTimeLabel}`,
      icon: CheckCircle2,
      href: buildFilterHref(key, currentFilters, { tab: 'pipeline', followUp: 'due' }),
    },
    {
      label: 'Paid clients',
      value: String(paidClientCount),
      caption: 'Confirmed payments',
      icon: WalletCards,
      href: buildFilterHref(key, currentFilters, { tab: 'clients' }),
    },
    {
      label: 'Revenue this month',
      value: formatMoney(monthlyRevenue),
      caption: `As of ${dashboardTimeLabel}`,
      icon: CreditCard,
      href: buildFilterHref(key, currentFilters, { tab: 'finance' }),
    },
    {
      label: 'Overdue delivery',
      value: String(overdueDeliveryCount),
      caption: 'Needs attention',
      icon: CircleAlert,
      href: buildFilterHref(key, currentFilters, { tab: 'clients' }),
    },
  ] as const;
  const contentDashboardContext = buildDashboardContext(submissions, operations);
  const assistantContext = buildAssistantDashboardContext({
    submissions,
    operations,
    backlogItems: contentBacklogItems,
    calendarItems: contentCalendarItems,
    now: dashboardNow,
  });

  return (
    <main className="coach-dashboard-clean min-h-screen overflow-x-clip bg-[#EDEBE8] text-[#142334]">
      <div className="flex min-h-screen w-full gap-3 p-2 md:gap-4 md:p-3 xl:p-4">
        <DashboardSidebar
          activeTab={activeTab}
          activeStudioWorkspace={activeStudioWorkspace}
          adminKey={key}
          todayFollowUpCount={followUpNotificationCount}
          todayFollowUps={sidebarFollowUps}
        />

        <section className="min-w-0 flex-1 overflow-x-clip rounded-[8px] bg-transparent">
          <div
            id="dashboard-command"
            className={
              activeTab === 'dashboard' ||
              activeTab === 'calendar' ||
              activeTab === 'content' ||
              activeTab === 'leads' ||
              activeTab === 'pipeline' ||
              activeTab === 'clients' ||
              activeTab === 'finance' ||
              activeTab === 'career-tools' ||
              activeTab === 'messages' ||
              activeTab === 'tasks' ||
              activeTab === 'settings'
                ? 'space-y-3 p-0'
                : 'space-y-5 p-4 md:p-6 lg:p-7'
            }
          >
            {activeTab !== 'content' && activeTab !== 'calendar' && (
              <DashboardTopBar
                activeTab={activeTab}
                adminKey={key || ''}
                query={q}
                updatedTimeLabel={dashboardTimeLabel}
                notificationCount={dashboardNotificationCount}
                showSearch={activeTab !== 'leads' && activeTab !== 'pipeline' && activeTab !== 'career-tools'}
                profilePhotoUrl={profilePhotoUrl}
              />
            )}
            {activeTab === 'dashboard' && (
            <section className="overflow-hidden rounded-[8px] border border-[#D8C8BB] bg-[linear-gradient(115deg,#FCFBFA_0%,#F7F1EC_62%,#BFA490_100%)] p-4 md:p-5 xl:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7B695F]">
                    Home / Dashboard
                  </p>
                  <h1 className="mt-5 break-words font-serif text-[31px] leading-[1.02] sm:text-[44px] md:text-[56px]">
                    <span className="block sm:inline">{dashboardGreeting},</span>{' '}
                    <span className="block sm:inline">Kagiso.</span>
                  </h1>
                  <p className="mt-3 text-[14px] leading-relaxed text-[#142334]/66">
                    {dashboardDateLabel} - Updated {dashboardTimeLabel} SAST
                  </p>
                  <p className="mt-2 max-w-4xl text-[14px] italic leading-relaxed text-[#142334]/62">
                    Hey, Coach. <span className={briefingNumberClass}>{dueFollowUpCount}</span>{' '}
                    {dueFollowUpCount === 1 ? 'follow-up needs' : 'follow-ups need'} attention,{' '}
                    <span className={briefingNumberClass}>{paidDeliveryPressureCount}</span>{' '}
                    {paidDeliveryPressureCount === 1 ? 'paid client is' : 'paid clients are'} waiting on delivery, and
                    the strongest content signal today is {strongestContentSignal}.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={exportHref}
                    className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-[#142334] px-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
                  >
                    Export <Download className="h-4 w-4" />
                  </Link>
                  <Link
                    href={buildFilterHref(key, currentFilters, {})}
                    className="inline-flex h-11 items-center gap-2 rounded-[8px] border border-[#D8C8BB] bg-white/80 px-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#142334] transition hover:border-[#142334]"
                  >
                    Refresh <RefreshCcw className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                  {dashboardMetricCards.map(({ label, value, caption, icon: Icon, href }) => {
                    const MetricIcon = Icon as typeof UserRoundCheck;
                    return (
                      <Link
                        key={label}
                        href={href}
                        aria-label={`Open ${label}`}
                        className="group relative min-h-[76px] rounded-[8px] px-3 py-2 transition hover:bg-white/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#142334]"
                      >
                        <span className="pointer-events-none absolute right-2 top-2 grid h-7 w-7 translate-x-1 place-items-center rounded-full bg-white text-[#142334] opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                        <div className="flex items-end gap-2">
                          <span className="mb-1 grid h-5 w-5 shrink-0 place-items-center rounded-[6px] bg-[#FCFBFA]/55 text-[#8C7466]">
                            <MetricIcon className="h-3.5 w-3.5" />
                          </span>
                          <p className="font-serif text-[39px] leading-[0.86] text-[#142334]">{value}</p>
                        </div>
                        <p className="mt-2 text-[13px] font-medium leading-tight text-[#142334]/82">{label}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-[#142334]/52">{caption}</p>
                      </Link>
                    );
                  })}
                </div>

                <div className="rounded-[8px] bg-[#142334] p-4 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/58">
                        Conversion readiness
                      </p>
                      <p className="mt-3 font-serif text-[42px] leading-none">{conversionRate}%</p>
                    </div>
                    <div
                      className="grid h-28 w-28 shrink-0 place-items-center rounded-full"
                      style={{
                        background: `conic-gradient(#BFA490 ${conversionRate * 3.6}deg, rgba(255,255,255,0.18) 0deg)`,
                      }}
                    >
                      <div className="grid h-20 w-20 place-items-center rounded-full bg-[#142334] text-[13px] font-semibold">
                        {conversionReady}/{Math.max(1, submissions.length)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 rounded-[8px] border border-white/20 bg-white/10 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/58">Top signal</p>
                    <p className="mt-2 font-serif text-[28px] leading-none">{topArchetype}</p>
                  </div>
                </div>
              </div>
            </section>
            )}

            <nav className="flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Dashboard tabs">
              {dashboardTabItems.map((item) => (
                <Link
                  key={item.tab}
                  href={buildDashboardTabHref(key, item.tab)}
                  className={`shrink-0 rounded-[8px] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${
                    activeTab === item.tab
                      ? 'bg-[#142334] text-white'
                      : 'bg-[#FCFBFA] text-[#142334]/68 hover:text-[#142334]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {activeTab === 'dashboard' && (
            <>
            <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.9fr)_minmax(320px,0.85fr)]">
              <Link
                href={buildFilterHref(key, currentFilters, { tab: 'pipeline' })}
                aria-label="Open lead pipeline"
                className="group relative min-w-0 overflow-hidden rounded-[8px] bg-[#FCFBFA] p-4 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#142334]"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A09086]">Lead pipeline</p>
                    <h2 className="mt-2 max-w-[calc(100vw-80px)] break-words font-serif text-[28px] leading-[0.95] text-[#142334] sm:max-w-xl md:text-[31px]">
                      High-intent prospects by stage
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 sm:shrink-0">
                    <p className="text-[13px] leading-relaxed text-[#142334]/62">{activeLeadCount} active leads</p>
                    <span className="grid h-8 w-8 translate-x-1 place-items-center rounded-full bg-[#F5F3EE] text-[#142334] opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {pipelineStageCards.map(([label, count, detail]) => (
                    <div key={label} className="rounded-[8px] bg-[#F8F6F4] p-3">
                      <p className="font-serif text-[26px] leading-none text-[#142334]">{count}</p>
                      <p className="mt-2 text-[11px] font-semibold leading-tight text-[#142334]">{label}</p>
                      <p className="mt-1 min-h-8 text-[11px] leading-tight text-[#142334]/62">{detail}</p>
                      <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-[#E6DDD6]">
                        <span
                          className="block h-full rounded-full bg-[#C9AD98]"
                          style={{ width: `${count === 0 ? 0 : Math.max(14, (count / maxPipelineStageCount) * 100)}%` }}
                        />
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  {pipelineHighlights.length === 0 ? (
                    <div className="rounded-[8px] bg-[#F8F6F4] px-4 py-3 text-[13px] leading-relaxed text-[#142334]/64">
                      No active lead records need movement yet. New diagnostic submissions will appear here first.
                    </div>
                  ) : (
                    pipelineHighlights.map((submission) => {
                      const score = getPriorityScore(submission);
                      const priorityLabel = score >= 70 ? 'Hot' : score >= 45 ? 'Warm' : 'Nurture';

                      return (
                        <div
                          key={submission.id}
                          className="grid gap-3 rounded-[8px] bg-[#F8F6F4] px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
                        >
                          <div>
                            <p className="text-[14px] font-semibold leading-tight text-[#142334]">
                              {submission.first_name || 'Lead'} - {getNextAction(submission)}
                            </p>
                            <p className="mt-1 text-[12px] leading-relaxed text-[#142334]/62">
                              {submission.archetype_payload?.service || submission.archetype_name} - {getStatusLabel(submission.lead_status)}
                            </p>
                          </div>
                          <span className="w-fit rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#8C7466]">
                            {priorityLabel} - {score}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </Link>

              <div className="min-w-0 overflow-hidden rounded-[8px] bg-[#FCFBFA] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A09086]">Diagnostic archetypes</p>
                <h2 className="mt-2 break-words font-serif text-[28px] leading-[0.95] text-[#142334] md:text-[31px]">
                  Where prospects are getting stuck
                </h2>

                <div className="mt-5 grid gap-5 sm:grid-cols-[150px_1fr] sm:items-center">
                  <div
                    className="grid h-36 w-36 place-items-center rounded-full justify-self-center"
                    style={{ background: archetypeDonutBackground }}
                  >
                    <div className="grid h-20 w-20 place-items-center rounded-full bg-[#FCFBFA] font-serif text-[28px] text-[#142334]">
                      {submissions.length}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {archetypeBreakdown.map((item) => (
                      <div key={item.key} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-[12px] leading-tight">
                        <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: item.color }} />
                        <span className="text-[#142334]/68">{item.label}</span>
                        <span className="font-semibold text-[#142334]">{item.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-[8px] bg-[#F8F6F4] p-4">
                  <p className="text-[13px] font-semibold text-[#142334]">Signal to watch</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#142334]/66">
                    {topArchetype} is leading the diagnostic mix. Shape the next content angle around {strongestContentSignal}.
                  </p>
                </div>
              </div>

              <div className="min-w-0 overflow-hidden rounded-[8px] bg-[#FCFBFA] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A09086]">Revenue by service</p>
                    <h2 className="mt-2 break-words font-serif text-[28px] leading-[0.95] text-[#142334] md:text-[31px]">
                      Month-to-date mix
                    </h2>
                  </div>
                  <p className="text-[13px] font-medium text-[#142334]/68 sm:shrink-0">{formatMoney(monthlyRevenue)}</p>
                </div>

                <div className="mt-5 space-y-3">
                  {monthlyRevenueServices.length === 0 ? (
                    <div className="rounded-[8px] bg-[#F8F6F4] px-4 py-3 text-[13px] leading-relaxed text-[#142334]/64">
                      No confirmed payment revenue this month yet.
                    </div>
                  ) : (
                    monthlyRevenueServices.map(([serviceName, amount], index) => (
                      <div key={serviceName} className="grid grid-cols-[1fr_minmax(76px,0.8fr)_auto] items-center gap-3 text-[12px]">
                        <p className="truncate text-[#142334]/68">{serviceName}</p>
                        <span className="block h-2 overflow-hidden rounded-full bg-[#E6DDD6]">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${Math.max(10, (amount / maxMonthlyServiceRevenue) * 100)}%`,
                              backgroundColor: ['#142334', '#C9AD98', '#8AA6C8', '#79A580'][index] || '#C98672',
                            }}
                          />
                        </span>
                        <p className="font-semibold text-[#142334]">{formatMoney(amount)}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  {revenueInsightCards.map(([value, label]) => (
                    <div key={label} className="rounded-[8px] bg-[#F8F6F4] p-3">
                      <p className="font-serif text-[24px] leading-none text-[#142334]">{value}</p>
                      <p className="mt-2 text-[11px] leading-tight text-[#142334]/62">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            <section className="rounded-[8px] bg-[#FCFBFA] p-4 md:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">
                    Today&apos;s priority actions
                  </p>
                  <h2 className="mt-2 max-w-2xl font-serif text-[32px] leading-[0.96] text-[#142334] md:text-[36px]">
                    Move the highest-value work first
                  </h2>
                </div>
                <p className="text-[13px] leading-relaxed text-[#142334]/62">
                  {Math.max(todayTaskList.length, todayPriorityActions.length, followUpsDueToday.length + nurtureSuggestions.length)} queued
                </p>
              </div>

              {(followUpsDueToday.length > 0 || followUpsDueTomorrow.length > 0 || nurtureSuggestions.length > 0) && (
                <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
                  <div className="rounded-[8px] bg-[#142334] p-4 text-white">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                          Follow-up due today
                        </p>
                        <h3 className="mt-2 font-serif text-[28px] leading-none">
                          {followUpsDueToday.length || 0} email{followUpsDueToday.length === 1 ? '' : 's'} waiting
                        </h3>
                      </div>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#BFA490]">
                        Manual send only
                      </span>
                    </div>
                    <div className="mt-4 grid gap-2">
                      {followUpsDueToday.length === 0 ? (
                        <div className="rounded-[8px] bg-white/8 px-3 py-3 text-[13px] leading-relaxed text-white/70">
                          No sequence follow-ups are due today.
                        </div>
                      ) : (
                        followUpsDueToday.slice(0, 4).map((submission) => (
                          <div key={submission.id} className="grid gap-3 rounded-[8px] bg-white px-3 py-3 text-[#142334] sm:grid-cols-[1fr_auto] sm:items-center">
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-semibold">{submission.first_name || submission.email}</p>
                              <p className="mt-1 text-[12px] leading-relaxed text-[#142334]/60">
                                {getFollowUpSequenceLabel(submission)} - {submission.archetype_payload?.service || submission.archetype_name}
                              </p>
                            </div>
                            <LeadEmailButton
                              lead={buildLeadEmailModalLead(submission)}
                              initialNotes={taskNotes.filter((note) => note.linkedLeadId === submission.id)}
                              label="Send now"
                              icon="send"
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#142334] px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
                            />
                          </div>
                        ))
                      )}
                    </div>
                    {followUpsDueTomorrow.length > 0 && (
                      <div className="mt-4 rounded-[8px] bg-white/8 px-3 py-3 text-[12px] leading-relaxed text-white/70">
                        Tomorrow:{' '}
                        {followUpsDueTomorrow.slice(0, 3).map((submission) => `${submission.first_name || submission.email} - ${getFollowUpSequenceLabel(submission)}`).join(', ')}
                        {followUpsDueTomorrow.length > 3 ? `, +${followUpsDueTomorrow.length - 3} more` : ''}
                      </div>
                    )}
                  </div>

                  {nurtureSuggestions.length > 0 && (
                    <div className="rounded-[8px] bg-[#FFF8EB] p-4 ring-1 ring-[#F1DFC1]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9A5C00]">
                        Consider moving to Nurture
                      </p>
                      <h3 className="mt-2 font-serif text-[28px] leading-none text-[#142334]">
                        Full sequence complete
                      </h3>
                      <div className="mt-4 grid gap-2">
                        {nurtureSuggestions.slice(0, 3).map((submission) => {
                          const waitDays = daysSince(submission.last_contacted_at, dashboardNow);
                          return (
                            <div key={submission.id} className="rounded-[8px] bg-white p-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-[14px] font-semibold text-[#142334]">{submission.first_name || submission.email}</p>
                                  <p className="mt-1 text-[12px] leading-relaxed text-[#142334]/62">
                                    No response after full sequence - {waitDays} day{waitDays === 1 ? '' : 's'} since the newsletter bridge
                                  </p>
                                </div>
                                <MoveToNurtureButton adminKey={key || ''} leadId={submission.id} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 grid gap-3">
                {todayTaskList.length === 0 ? (
                  <div className="rounded-[8px] bg-[#F8F6F4] p-4 text-[14px] leading-relaxed text-[#142334]/66">
                    No high-priority tasks are waiting right now.
                  </div>
                ) : (
                  todayTaskList.slice(0, 4).map((task, index) => {
                    const TaskIcon = [Mail, FileText, PackageCheck, MessageSquare][index] || ListChecks;
                    const tags =
                      index === 0
                        ? ['Revenue', '48-hour window']
                        : index === 1
                          ? ['Discovery', 'Call prep']
                          : index === 2
                            ? ['Delivery risk', 'Client promise']
                            : ['Content', 'Lead insight'];

                    return (
                      <Link
                        key={`${task.title}-${index}`}
                        href={task.href}
                        className="grid gap-4 rounded-[8px] bg-[#F8F6F4] p-4 transition hover:bg-[#F4EFEA] sm:grid-cols-[auto_1fr_auto] sm:items-start"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[#142334] text-white">
                          <TaskIcon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[15px] font-semibold leading-tight text-[#142334]">{task.title}</span>
                          <span className="mt-1 block text-[13px] leading-relaxed text-[#142334]/64">{task.detail}</span>
                          <span className="mt-3 flex flex-wrap gap-2">
                            {tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8C7466]"
                              >
                                {tag}
                              </span>
                            ))}
                          </span>
                        </span>
                        <span className="text-[12px] font-medium text-[#142334]/56">
                          {['09:30', '11:00', '14:00', '16:15'][index] || dashboardTimeLabel}
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
            </section>
            </>
            )}

            {(activeTab === 'leads' || activeTab === 'pipeline') && (
            <section className="rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA] p-3">
              <form action="/resources/career-diagnostic/submissions" method="get" className="grid gap-2 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-[1.35fr_0.8fr_0.8fr_0.8fr_0.78fr_0.7fr_0.7fr_auto]">
                <input type="hidden" name="key" value={key || ''} />
                <input type="hidden" name="tab" value={activeTab} />
                <label className="relative block md:col-span-2 xl:col-span-2 2xl:col-span-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A09086]" />
                  <input
                    name="q"
                    defaultValue={q || ''}
                    placeholder="Search name, email, service, download..."
                    className="h-11 w-full rounded-[8px] border border-[#D8C8BB] bg-white pl-11 pr-4 text-[14px] outline-none transition focus:border-[#142334]"
                  />
                </label>
                <FilterDropdown
                  name="status"
                  value={selectedStatus}
                  ariaLabel="Filter by lead status"
                  options={[
                    { value: 'all', label: 'All statuses' },
                    ...diagnosticLeadStatuses.map((option) => ({
                      value: option.value,
                      label: option.label,
                    })),
                  ]}
                />
                <FilterDropdown
                  name="source"
                  value={selectedSource}
                  ariaLabel="Filter by lead source"
                  options={[
                    { value: 'all', label: 'All sources' },
                    ...leadSourceOptions,
                  ]}
                />
                <FilterDropdown
                  name="archetype"
                  value={selectedFilter}
                  ariaLabel="Filter by archetype"
                  options={Object.entries(archetypeLabels).map(([filterKey, label]) => ({
                    value: filterKey,
                    label,
                  }))}
                />
                <FilterDropdown
                  name="followUp"
                  value={selectedFollowUp || 'all'}
                  ariaLabel="Filter by follow-up status"
                  options={[
                    { value: 'all', label: 'All follow-ups' },
                    { value: 'due', label: 'Due now' },
                    { value: 'scheduled', label: 'Scheduled' },
                    { value: 'none', label: 'No follow-up set' },
                  ]}
                />
                <DashboardDatePicker
                  name="from"
                  ariaLabel="Date from"
                  value={from || ''}
                  placeholder="Start date"
                />
                <DashboardDatePicker
                  name="to"
                  ariaLabel="Date to"
                  value={to || ''}
                  placeholder="End date"
                />
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-[8px] bg-[#142334] px-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
                >
                  Apply
                </button>
              </form>
              {masterclassWaitlistCount > 0 && (
                <div className="mt-3 border-t border-[#E4D8CB] pt-3">
                  <MasterclassBookingsOpenButton
                    adminKey={key || ''}
                    eligibleCount={masterclassBookingsOpenEligibleCount}
                  />
                </div>
              )}
            </section>
            )}

            {(updated || error) && (
          <section className="bg-[#FCFBFA]">
            <div className="w-full">
              <div className={`border p-4 text-[14px] leading-relaxed ${
                error ? 'border-[#C98672] bg-[#FFF5F2] text-[#7A2F22]' : 'border-[#79A580] bg-[#EEF7EF] text-[#355C3A]'
              }`}>
                {error === 'crm-schema'
                  ? 'CRM fields are not live in Supabase yet. Run the CRM column additions in docs/Diagnostic-Lead-Magnet-Supabase.sql, then retry.'
                  : error === 'unauthorized'
                    ? 'The admin key was rejected. Re-open the dashboard with the correct key.'
                    : error === 'invalid'
                      ? 'That update could not be saved. Check the delete confirmation or choose a follow-up date from today onward.'
                      : updated === 'deleted'
                        ? `${deletedCount || 'Selected'} dashboard record${deletedCount === '1' ? '' : 's'} deleted.`
                        : 'Lead details updated.'}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'leads' && (
        <section>
          <div className="w-full">
            <div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {[
                  ['Total leads', String(totalLeadRecordCount), UserRoundCheck],
                  ['Unique emails', String(combinedUniqueEmails), Mail],
                  ['Last 7 days', String(getRecentCount(submissions) + getRecentFunnelActivityCount(funnelLeadActivities)), CalendarClock],
                  ['Due follow-ups', String(getDueFollowUps(submissions)), CheckCircle2],
                  ['Funnel activity', String(funnelLeadActivities.length), FileText],
                ].map(([label, value, Icon]) => {
                  const StatIcon = Icon as typeof UserRoundCheck;
                  return (
                    <div key={String(label)} className="rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">
                          {String(label)}
                        </p>
                        <StatIcon className="h-4 w-4 text-[#C9AD98]" />
                      </div>
                      <p className="mt-4 font-serif text-[31px] leading-tight text-[#142334]">
                        {String(value)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
        )}

        {activeTab === 'leads' && (
        <section id="funnel-leads">
          <div className="w-full">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">
                  Funnel leads
                </p>
                <h2 className="mt-2 font-serif text-[32px] leading-tight text-[#142334]">
                  Downloads, reservations, and bookings
                </h2>
              </div>
              <div className="flex max-w-xl flex-col items-start gap-3 sm:items-end">
                <p className="text-[13px] leading-relaxed text-[#142334]/62 sm:text-right">
                  These are non-diagnostic contacts captured from the wider funnel. They are filtered by search and date alongside the diagnostic list.
                </p>
                <BrevoNotificationImportButton adminKey={key || ''} />
              </div>
            </div>
            <FunnelActivityRows activities={funnelLeadActivities} adminKey={key || ''} returnHref={leadsReturnHref} />
          </div>
        </section>
        )}

        {activeTab === 'finance' && (
          <FinanceTab
            adminKey={key || ''}
            operations={operations}
            submissions={submissions}
            totalRevenue={totalRevenue}
            monthlyRevenue={monthlyRevenue}
            waitingForIntakeCount={waitingForIntake.length}
            deliveryQueueCount={activeDeliveryQueue.length}
            operationServiceCounts={operationServiceCounts}
            maxOperationRevenue={maxOperationRevenue}
          />
        )}

        {activeTab === 'clients' && (
          <ClientsDashboard adminKey={key || ''} clients={clientRecords} />
        )}

        {activeTab === 'career-tools' && (
          <CvAnalyzerDashboard adminKey={key || ''} />
        )}

        {activeTab === 'pipeline' && (
        <section id="pipeline-status" className="pb-10">
          <div className="grid w-full gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
            <div>
              <FunnelPipelinePanel activities={funnelPipelineActivities} adminKey={key || ''} returnHref={pipelineReturnHref} />
              <div className="overflow-hidden rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA]">
                <div className="border-b border-[#D8C8BB] px-6 py-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">
                    Priority queue
                  </p>
                  <h2 className="mt-2 font-serif text-[36px] leading-tight">Needs action now</h2>
                  <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[#142334]/62">
                    New leads, due follow-ups, and booked calls stay here. People already emailed move into waiting until their follow-up date arrives.
                  </p>
                </div>
                {actionQueue.length === 0 ? (
                  <div className="p-6 text-[15px] leading-relaxed text-[#142334]/70">
                    No first emails, due follow-ups, or discovery prep actions for this filter.
                  </div>
                ) : (
                  <div className="divide-y divide-[#D8C8BB]">
                    {actionQueue.map((submission) => {
                      const priority = getPriorityScore(submission);
                      const redirectTo = buildFilterHref(key, currentFilters, { tab: 'pipeline' });

                      return (
                        <div key={submission.id} className="grid gap-5 px-6 py-5 lg:grid-cols-[1fr_0.68fr_auto] lg:items-center">
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <Link
                                href={`/resources/career-diagnostic/submissions/${submission.id}?key=${encodeURIComponent(key || '')}`}
                                className="font-serif text-[29px] leading-none text-[#142334] transition hover:text-[#C9AD98]"
                              >
                                {submission.first_name}
                              </Link>
                              <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.17em] ${getStatusClass(submission.lead_status)}`}>
                                {getStatusLabel(submission.lead_status)}
                              </span>
                              <LeadSourceBadge source={submission.source} />
                            </div>
                            <p className="mt-2 text-[14px] leading-relaxed text-[#142334]/68">
                              {submission.archetype_name} to {submission.archetype_payload?.service || 'No service recommendation'}
                            </p>
                            <p className="mt-2 text-[13px] font-semibold uppercase tracking-[0.17em] text-[#C9AD98]">
                              {getNextAction(submission)}
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center justify-between gap-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A09086]">
                                Priority
                              </p>
                              <p className="font-serif text-[26px] leading-none text-[#142334]">{priority}</p>
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F1E7DF]">
                              <div className="h-full bg-[#C9AD98]" style={{ width: `${priority}%` }} />
                            </div>
                            <p className="mt-3 text-[12px] text-[#142334]/58">
                              Follow-up: {formatShortDate(submission.next_follow_up_at)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            <LeadEmailButton
                              lead={buildLeadEmailModalLead(submission)}
                              initialNotes={taskNotes.filter((note) => note.linkedLeadId === submission.id)}
                              label="Email"
                              className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98]"
                            />
                            {submission.lead_status !== 'discovery_booked' && (
                              <form action={`/api/diagnostic/submissions/${submission.id}`} method="post">
                                <input type="hidden" name="key" value={key || ''} />
                                <input type="hidden" name="redirectTo" value={redirectTo} />
                                <input type="hidden" name="intent" value="mark_contacted" />
                                <button
                                  type="submit"
                                  className="inline-flex items-center gap-2 rounded-full bg-[#142334] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
                                >
                                  {submission.lead_status === 'new' ? 'Mark contacted' : 'Log follow-up'}
                                </button>
                              </form>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="grid gap-5">
                <div className="rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA] p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">
                    Pipeline status
                  </p>
                  <p className="mt-3 font-serif text-[36px] leading-tight">
                    {conversionReady} conversion-ready
                  </p>
                  <div className="mt-5 grid gap-3">
                    {statusCounts.map((statusOption) => (
                      <Link
                        key={statusOption.value}
                        href={buildFilterHref(key, currentFilters, { status: statusOption.value })}
                        className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-[#142334]/10 pb-3 text-[14px] transition hover:text-[#C9AD98]"
                      >
                        <span>{statusOption.shortLabel}</span>
                        <span className="font-serif text-[22px] leading-none">{statusOption.count}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA] p-6">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">
                      Waiting for response
                    </p>
                    <span className="rounded-full bg-white px-3 py-1 font-serif text-[20px] leading-none text-[#142334]">
                      {waitingForResponseQueue.length}
                    </span>
                  </div>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#142334]/62">
                    Already emailed. These stay out of the action queue until the next follow-up date.
                  </p>
                  <div className="mt-5 grid gap-3">
                    {waitingForResponseQueue.length === 0 ? (
                      <div className="rounded-[8px] bg-white px-4 py-3 text-[13px] leading-relaxed text-[#142334]/60">
                        No contacted leads are waiting under this filter.
                      </div>
                    ) : (
                      waitingForResponseQueue.map((submission) => (
                        <Link
                          key={submission.id}
                          href={`/resources/career-diagnostic/submissions/${submission.id}?key=${encodeURIComponent(key || '')}`}
                          className="grid gap-2 rounded-[8px] bg-white px-4 py-3 transition hover:text-[#C9AD98]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-semibold text-[#142334]">{submission.first_name || submission.email}</p>
                              <p className="mt-1 truncate text-[12px] text-[#142334]/58">
                                {submission.archetype_payload?.service || submission.archetype_name}
                              </p>
                            </div>
                            <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${getStatusClass(submission.lead_status)}`}>
                              {getStatusLabel(submission.lead_status)}
                            </span>
                            <LeadSourceBadge source={submission.source} className="shrink-0" />
                          </div>
                          <p className="text-[12px] text-[#142334]/58">
                            Next follow-up: {formatShortDate(submission.next_follow_up_at)}
                          </p>
                        </Link>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA] p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">
                    Service demand
                  </p>
                  <div className="mt-5 grid gap-4">
                    {Object.entries(serviceCounts).map(([serviceName, count]) => (
                      <Link
                        key={serviceName}
                        href={buildFilterHref(key, currentFilters, { service: serviceName })}
                        className="block transition hover:text-[#C9AD98]"
                      >
                        <div className="flex items-center justify-between gap-4 text-[14px]">
                          <span>{serviceName}</span>
                          <span className="font-serif text-[22px] leading-none">{count}</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F1E7DF]">
                          <div className="h-full bg-[#C9AD98]" style={{ width: `${(count / maxServiceCount) * 100}%` }} />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        )}

        {activeTab === 'content' && (
          <ContentStudio
            key={activeStudioWorkspace}
            adminKey={key || ''}
            initialWorkspace={activeStudioWorkspace}
            context={contentDashboardContext}
            calendarItems={contentCalendarItems}
            backlogItems={contentBacklogItems}
            researchItems={researchItems}
            dashboardNotificationCount={dashboardNotificationCount}
            profilePhotoUrl={profilePhotoUrl}
          />
        )}

        {activeTab === 'calendar' && (
          <CustomCalendarDashboard adminKey={key || ''} leads={submissions} dashboardNotificationCount={dashboardNotificationCount} profilePhotoUrl={profilePhotoUrl} />
        )}

        {activeTab === 'messages' && (
          <MessagesLog
            adminKey={key || ''}
            emails={sentEmailLog.emails}
            totalCount={sentEmailLog.totalCount}
            thisWeekCount={sentEmailLog.thisWeekCount}
            uniqueLeadCount={sentEmailLog.uniqueLeadCount}
            importedCount={sentEmailLog.importedCount}
            engagedCount={sentEmailLog.engagedCount}
            segmentOptions={sentEmailLog.segmentOptions}
            stateOptions={sentEmailLog.stateOptions}
            hasFilters={sentEmailLog.hasFilters}
            filters={{
              q: q || '',
              archetype: archetype || '',
              source: source || '',
              status: status || '',
              segment: segment || '',
              state: state || '',
              sort: sort || '',
              from: from || '',
              to: to || '',
            }}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksNotesWorkspace
            adminKey={key || ''}
            initialTasks={dashboardTasks}
            leads={submissions}
            clientOps={operations}
            initialNotes={taskNotes}
            strongestContentSignal={strongestContentSignal}
            topArchetype={topArchetype}
            newLeadCount={newLeadCount}
            dueFollowUpCount={dueFollowUpCount}
            paidDeliveryPressureCount={paidDeliveryPressureCount}
          />
        )}
        {activeTab === 'settings' && (
        <section className="pb-8">
          <div className="grid w-full gap-3">
            <SettingsPageComponent
              adminKey={key || ''}
              settings={settingsBundle?.settings || DEFAULT_SETTINGS}
              emailTemplates={settingsBundle?.emailTemplates || EMAIL_TEMPLATES.map((template) => ({ ...template, active: true }))}
            />
            <div>
              <div className="overflow-hidden rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA]">
                <div className="flex items-start justify-between gap-4 border-b border-[#D8C8BB] px-6 py-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">
                      Recent payment records
                    </p>
                    <h2 className="mt-2 font-serif text-[36px] leading-tight">Clean up sandbox payment tests</h2>
                  </div>
                  <Settings className="h-5 w-5 shrink-0 text-[#C9AD98]" />
                </div>
                {operations.length === 0 ? (
                  <div className="p-6 text-[15px] leading-relaxed text-[#142334]/70">
                    No payment records found.
                  </div>
                ) : (
                  <form action="/api/operations/payments/batch" method="post">
                    <input type="hidden" name="key" value={key || ''} />
                    <input type="hidden" name="redirectTo" value={buildFilterHref(key, currentFilters, {})} />
                    <BatchDeleteControls
                      group="payment-records"
                      phrase={BATCH_DELETE_CONFIRM_PHRASE}
                      label="payment records"
                    />
                    <div className="divide-y divide-[#D8C8BB]">
                      {operations.slice(0, 12).map((operation) => (
                        <div key={operation.payment.payment_id} className="grid gap-4 px-6 py-5 md:grid-cols-[auto_1fr] md:items-center">
                          <input
                            type="checkbox"
                            name="payment_ids"
                            value={operation.payment.payment_id}
                            data-batch-group="payment-records"
                            aria-label={`Select payment record ${operation.payment.payment_id}`}
                            className="h-4 w-4 accent-[#142334]"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="font-serif text-[25px] leading-none text-[#142334]">
                                {operation.payment.buyer_name || operation.intake?.form_data.fullName || 'Payment record'}
                              </p>
                              <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.17em] ${getDeliveryStateClass(operation.deliveryState)}`}>
                                {operation.deliveryLabel}
                              </span>
                            </div>
                            <p className="mt-2 text-[14px] leading-relaxed text-[#142334]/68">
                              {operation.serviceTitle} - {operation.amountLabel} - {formatDate(operation.payment.confirmed_at || operation.payment.created_at)}
                            </p>
                            <p className="mt-1 text-[12px] text-[#142334]/58">
                              {operation.payment.payment_id}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
        )}

        {activeTab === 'leads' && (
        <section id="lead-records" className="pb-24">
          <div className="w-full">
            <div>
              {submissions.length === 0 ? (
                <div className="rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA] p-8 text-[16px] leading-relaxed text-[#142334]/72">
                  No submissions found for this filter yet.
                </div>
              ) : (
                <form action="/api/diagnostic/submissions/batch" method="post" className="overflow-hidden rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA]">
                  <input type="hidden" name="key" value={key || ''} />
                  <input type="hidden" name="redirectTo" value={buildFilterHref(key, currentFilters, {})} />
                  <BatchDeleteControls
                    group="diagnostic-records"
                    phrase={BATCH_DELETE_CONFIRM_PHRASE}
                    label="diagnostic records"
                  />
                  <div className="hidden border-b border-[#D8C8BB] bg-[#F7F1EC] px-6 py-4 lg:grid lg:grid-cols-[1.25fr_0.7fr_0.72fr_0.5fr_0.72fr_auto] lg:gap-5">
                    {['Lead', 'Fit', 'Status', 'Priority', 'Follow-up', 'Actions'].map((label) => (
                      <p key={label} className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">
                        {label}
                      </p>
                    ))}
                  </div>
                  <div className="divide-y divide-[#D8C8BB]">
                    {sortedSubmissions.map((submission) => {
                      const priority = getPriorityScore(submission);
                      return (
                        <LeadListRow
                          key={submission.id}
                          submission={submission}
                          priority={priority}
                          adminKey={key || ''}
                          initialNotes={taskNotes.filter((note) => note.linkedLeadId === submission.id)}
                        />
                      );
                    })}
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
        )}
          </div>
        </section>
      </div>
      <GrowthOSAssistant adminKey={key || ''} initialContext={assistantContext} />
    </main>
  );
}
