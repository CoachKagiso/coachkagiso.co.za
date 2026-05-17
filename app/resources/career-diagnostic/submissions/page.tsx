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
import CustomCalendarDashboard from '@/components/calendar/CustomCalendarDashboard';
import ClientsDashboard from '@/components/clients/ClientsDashboard';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import DashboardSidebar from '@/components/DashboardSidebar';
import FinanceTab from '@/components/finance/FinanceTab';
import LeadEmailButton from '@/components/leads/LeadEmailButton';
import LeadListRow from '@/components/leads/LeadListRow';
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
import { listClientOperations, type ClientOperation } from '@/lib/client-operations';
import { listClientRecords } from '@/lib/clients';
import { BATCH_DELETE_CONFIRM_PHRASE } from '@/lib/dashboard-cleanup';
import {
  generateTasks,
  mergeTasks,
} from '@/lib/dashboard-tasks';
import { listManualTasks, listNotes } from '@/lib/dashboard-task-records';
import { getDiagnosticAdminKey } from '@/lib/env';
import { listSentEmails } from '@/lib/sent-emails';

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
    followUp?: string;
    q?: string;
    from?: string;
    to?: string;
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
const dashboardTimeZone = 'Africa/Johannesburg';
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
const dashboardTabValues = ['dashboard', 'leads', 'pipeline', 'clients', 'finance', 'content', 'calendar', 'messages', 'tasks', 'settings'] as const;
type DashboardTab = (typeof dashboardTabValues)[number];
const dashboardTabItems: { tab: DashboardTab; label: string }[] = [
  { tab: 'dashboard', label: 'Dashboard' },
  { tab: 'leads', label: 'Leads' },
  { tab: 'pipeline', label: 'Pipeline' },
  { tab: 'clients', label: 'Clients' },
  { tab: 'finance', label: 'Finance' },
  { tab: 'content', label: 'Content' },
  { tab: 'calendar', label: 'Calendar' },
  { tab: 'messages', label: 'Messages' },
  { tab: 'tasks', label: 'Tasks & Notes' },
  { tab: 'settings', label: 'Settings' },
];

function isDashboardTab(value?: string | null): value is DashboardTab {
  return Boolean(value && dashboardTabValues.includes(value as DashboardTab));
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
      !['paid', 'archived', 'not_a_fit', 'closed'].includes(submission.lead_status) &&
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
  if (submission.lead_status === 'paid') return 'Confirm delivery and intake';
  if (submission.lead_status === 'discovery_booked') return 'Prep for the discovery call';
  if (submission.next_follow_up_at && new Date(submission.next_follow_up_at).getTime() <= Date.now()) {
    return 'Follow up today';
  }
  if (submission.lead_status === 'new') return 'Send first result follow-up';
  if (submission.lead_status === 'follow_up_later') return 'Wait for scheduled follow-up';
  if (submission.lead_status === 'closed') return 'Closed';
  if (submission.lead_status === 'not_a_fit') return 'Keep archived unless they re-engage';
  return 'Check whether they need another nudge';
}

function buildFilterHref(
  key: string | undefined,
  current: {
    tab?: string;
    archetype?: string;
    status?: string;
    service?: string;
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
  };
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
    followUp,
    q,
    from,
    to,
    updated,
    deletedCount,
    error,
  } = await searchParams;

  if (!isDiagnosticAdminAuthorized(key)) {
    return <AccessGate />;
  }

  const selectedFilter = isDiagnosticArchetypeKey(archetype) ? archetype : 'all';
  const selectedStatus = isDiagnosticLeadStatus(status) ? status : 'all';
  const selectedFollowUp = ['due', 'scheduled', 'none'].includes(followUp || '') ? followUp : 'all';
  const activeTab = isDashboardTab(tab) ? tab : 'dashboard';
  const sentEmailFilters = {
    query: activeTab === 'messages' ? q : null,
    archetype: activeTab === 'messages' ? archetype : null,
    from: activeTab === 'messages' ? from : null,
    to: activeTab === 'messages' ? to : null,
  };
  const [submissions, operations, manualTasks, taskNotes, sentEmailLog, clientRecords] = await Promise.all([
    listDiagnosticSubmissions({
      archetype,
      status,
      service,
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
          hasFilters: false,
        }),
    activeTab === 'clients' ? listClientRecords() : Promise.resolve([]),
  ]);
  const uniqueEmails = new Set(submissions.map((submission) => submission.email)).size;
  const exportHref = `/api/diagnostic/export?key=${encodeURIComponent(key || '')}${
    selectedFilter === 'all' ? '' : `&archetype=${selectedFilter}`
  }`;
  const currentFilters = {
    tab: activeTab,
    archetype: selectedFilter,
    status: selectedStatus,
    service,
    followUp: selectedFollowUp,
    q,
    from,
    to,
  };
  const sortedSubmissions = [...submissions].sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
  const actionQueue = sortedSubmissions.filter((submission) => !['paid', 'archived', 'not_a_fit', 'closed'].includes(submission.lead_status)).slice(0, 8);
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
  const dashboardNow = new Date();
  const dashboardGreeting = getDashboardGreeting(dashboardNow);
  const dashboardDateLabel = formatDashboardDate(dashboardNow);
  const dashboardTimeLabel = formatDashboardTime(dashboardNow);
  const recentLeadCount = getRecentCount(submissions);
  const dueFollowUpCount = getDueFollowUps(submissions);
  const topArchetype = getTopArchetype(submissions);
  const strongestContentSignal = getTopContentSignal(submissions);
  const conversionRate = Math.round((conversionReady / Math.max(1, submissions.length)) * 100);
  const newLeadCount = submissions.filter((submission) => submission.lead_status === 'new').length;
  const hotLeadCount = sortedSubmissions.filter(
    (submission) =>
      !['paid', 'archived', 'not_a_fit', 'closed'].includes(submission.lead_status) &&
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
  const standaloneNotes = taskNotes.filter((note) => !note.linkedTaskId);
  const dashboardTodayEnd = new Date(dashboardNow);
  dashboardTodayEnd.setHours(23, 59, 59, 999);
  const todayDueTaskCount = dashboardTasks.filter(
    (task) => task.status !== 'done' && task.dueDate && new Date(task.dueDate).getTime() <= dashboardTodayEnd.getTime()
  ).length;
  const briefingNumberClass =
    'inline-flex min-w-5 items-center justify-center rounded-[5px] bg-white px-1.5 py-0.5 text-[13px] font-semibold leading-none text-[#8C7466]';
  const dashboardMetricCards = [
    ['New leads', String(newLeadCount), `Updated ${dashboardTimeLabel}`, UserRoundCheck],
    ['Hot leads', String(hotLeadCount), 'Priority score or booked call', Sparkles],
    ['Follow-ups due', String(dueFollowUpCount), `Due by ${dashboardTimeLabel}`, CheckCircle2],
    ['Paid clients', String(paidClientCount), 'Confirmed payments', WalletCards],
    ['Revenue this month', formatMoney(monthlyRevenue), `As of ${dashboardTimeLabel}`, CreditCard],
    ['Overdue delivery', String(overdueDeliveryCount), 'Needs attention', CircleAlert],
  ] as const;

  return (
    <main className="coach-dashboard-clean min-h-screen overflow-x-hidden bg-[#EDEBE8] text-[#142334]">
      <div className="flex min-h-screen w-full gap-3 p-2 md:gap-4 md:p-3 xl:p-4">
        <DashboardSidebar activeTab={activeTab} adminKey={key} todayTaskCount={todayDueTaskCount} />

        <section className="min-w-0 flex-1 overflow-hidden rounded-[8px] bg-transparent">
          <div id="dashboard-command" className="space-y-5 p-4 md:p-6 lg:p-7">
            {activeTab === 'dashboard' && (
            <section className="overflow-hidden rounded-[8px] border border-[#D8C8BB] bg-[linear-gradient(115deg,#FCFBFA_0%,#F7F1EC_63%,#F3D97B_100%)] p-5 md:p-6 xl:p-7">
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

              <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                  {dashboardMetricCards.map(([label, value, caption, Icon]) => {
                    const MetricIcon = Icon as typeof UserRoundCheck;
                    return (
                      <div key={label} className="min-h-[82px] px-1 py-1">
                        <div className="flex items-end gap-2">
                          <span className="mb-1 grid h-5 w-5 shrink-0 place-items-center rounded-[6px] bg-[#FCFBFA]/55 text-[#8C7466]">
                            <MetricIcon className="h-3.5 w-3.5" />
                          </span>
                          <p className="font-serif text-[39px] leading-[0.86] text-[#142334]">{value}</p>
                        </div>
                        <p className="mt-2 text-[13px] font-medium leading-tight text-[#142334]/82">{label}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-[#142334]/52">{caption}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-[8px] bg-[#142334] p-5 text-white">
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
                        background: `conic-gradient(#F3D97B ${conversionRate * 3.6}deg, rgba(255,255,255,0.18) 0deg)`,
                      }}
                    >
                      <div className="grid h-20 w-20 place-items-center rounded-full bg-[#142334] text-[13px] font-semibold">
                        {conversionReady}/{Math.max(1, submissions.length)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-7 rounded-[8px] border border-white/20 bg-white/10 p-4">
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
            <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.9fr)_minmax(320px,0.85fr)]">
              <div className="min-w-0 overflow-hidden rounded-[8px] bg-[#FCFBFA] p-4 md:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A09086]">Lead pipeline</p>
                    <h2 className="mt-2 max-w-[calc(100vw-80px)] break-words font-serif text-[28px] leading-[0.95] text-[#142334] sm:max-w-xl md:text-[31px]">
                      High-intent prospects by stage
                    </h2>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#142334]/62 sm:shrink-0">{activeLeadCount} active leads</p>
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
              </div>

              <div className="min-w-0 overflow-hidden rounded-[8px] bg-[#FCFBFA] p-4 md:p-5">
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

              <div className="min-w-0 overflow-hidden rounded-[8px] bg-[#FCFBFA] p-4 md:p-5">
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
            <section className="rounded-[8px] bg-[#FCFBFA] p-5 md:p-6">
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
                  {Math.max(todayTaskList.length, todayPriorityActions.length)} queued
                </p>
              </div>

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
            <section className="rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA] p-4">
              <form action="/resources/career-diagnostic/submissions" method="get" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.78fr_0.7fr_0.7fr_auto]">
                <input type="hidden" name="key" value={key || ''} />
                <input type="hidden" name="tab" value={activeTab} />
                <label className="relative block md:col-span-2 xl:col-span-2 2xl:col-span-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A09086]" />
                  <input
                    name="q"
                    defaultValue={q || ''}
                    placeholder="Search name, email, service..."
                    className="h-11 w-full rounded-[8px] border border-[#D8C8BB] bg-white pl-11 pr-4 text-[14px] outline-none transition focus:border-[#142334]"
                  />
                </label>
                <select
                  name="status"
                  defaultValue={selectedStatus}
                  className="h-11 rounded-[8px] border border-[#D8C8BB] bg-white px-3 text-[13px] outline-none transition focus:border-[#142334]"
                >
                  <option value="all">All statuses</option>
                  {diagnosticLeadStatuses.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  name="archetype"
                  defaultValue={selectedFilter}
                  className="h-11 rounded-[8px] border border-[#D8C8BB] bg-white px-3 text-[13px] outline-none transition focus:border-[#142334]"
                >
                  {Object.entries(archetypeLabels).map(([filterKey, label]) => (
                    <option key={filterKey} value={filterKey}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  name="followUp"
                  defaultValue={selectedFollowUp}
                  className="h-11 rounded-[8px] border border-[#D8C8BB] bg-white px-3 text-[13px] outline-none transition focus:border-[#142334]"
                >
                  <option value="all">All follow-ups</option>
                  <option value="due">Due now</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="none">No follow-up set</option>
                </select>
                <input
                  type="date"
                  name="from"
                  defaultValue={from || ''}
                  aria-label="Date from"
                  className="h-11 rounded-[8px] border border-[#D8C8BB] bg-white px-3 text-[13px] outline-none transition focus:border-[#142334]"
                />
                <input
                  type="date"
                  name="to"
                  defaultValue={to || ''}
                  aria-label="Date to"
                  className="h-11 rounded-[8px] border border-[#D8C8BB] bg-white px-3 text-[13px] outline-none transition focus:border-[#142334]"
                />
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-[8px] bg-[#142334] px-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
                >
                  Apply
                </button>
              </form>
            </section>
            )}

            {(updated || error) && (
          <section className="bg-[#FCFBFA]">
            <div className="w-full">
              <div className={`border p-4 text-[14px] leading-relaxed ${
                error ? 'border-[#C98672] bg-[#FFF5F2] text-[#7A2F22]' : 'border-[#79A580] bg-[#EEF7EF] text-[#355C3A]'
              }`}>
                {error === 'crm-schema'
                  ? 'CRM fields are not live in Supabase yet. Apply the SQL additions in docs/Diagnostic-Lead-Magnet-Supabase.sql, then retry.'
                  : error === 'unauthorized'
                    ? 'The admin key was rejected. Re-open the dashboard with the correct key.'
                    : error === 'invalid'
                      ? 'That delete request was missing its confirmation token. Nothing was removed.'
                      : updated === 'deleted'
                        ? `${deletedCount || 'Selected'} dashboard record${deletedCount === '1' ? '' : 's'} deleted.`
                        : 'Lead details updated.'}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'leads' && (
        <section className="pt-2">
          <div className="w-full">
            <div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {[
                  ['Total leads', String(submissions.length), UserRoundCheck],
                  ['Unique emails', String(uniqueEmails), Mail],
                  ['Last 7 days', String(getRecentCount(submissions)), CalendarClock],
                  ['Due follow-ups', String(getDueFollowUps(submissions)), CheckCircle2],
                  ['Top archetype', getTopArchetype(submissions), FileText],
                ].map(([label, value, Icon]) => {
                  const StatIcon = Icon as typeof UserRoundCheck;
                  return (
                    <div key={String(label)} className="rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA] p-5">
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

        {activeTab === 'pipeline' && (
        <section id="pipeline-status" className="pb-10">
          <div className="grid w-full gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
            <div>
              <div className="overflow-hidden rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA]">
                <div className="border-b border-[#D8C8BB] px-6 py-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">
                    Priority queue
                  </p>
                  <h2 className="mt-2 font-serif text-[36px] leading-tight">Who needs attention next</h2>
                </div>
                {actionQueue.length === 0 ? (
                  <div className="p-6 text-[15px] leading-relaxed text-[#142334]/70">
                    No open follow-up actions for this filter.
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
                            <form action={`/api/diagnostic/submissions/${submission.id}`} method="post">
                              <input type="hidden" name="key" value={key || ''} />
                              <input type="hidden" name="redirectTo" value={redirectTo} />
                              <input type="hidden" name="intent" value="mark_contacted" />
                              <button
                                type="submit"
                                className="inline-flex items-center gap-2 rounded-full bg-[#142334] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
                              >
                                Mark contacted
                              </button>
                            </form>
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
        <section id="content-planning" className="pb-10">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
            <div className="rounded-[8px] bg-[#FCFBFA] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">Content</p>
                  <h2 className="mt-2 font-serif text-[36px] leading-tight">Content angles from live diagnostic demand</h2>
                </div>
                <Lightbulb className="h-5 w-5 shrink-0 text-[#C9AD98]" />
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {[
                  ['Strongest signal', strongestContentSignal],
                  ['Top archetype', topArchetype],
                  ['Recent leads', `${recentLeadCount} in 7 days`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[8px] bg-[#F8F6F4] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A09086]">{label}</p>
                    <p className="mt-3 font-serif text-[25px] leading-tight text-[#142334]">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-[8px] bg-[#F8F6F4] p-5">
                <p className="text-[13px] font-semibold text-[#142334]">Next useful content brief</p>
                <p className="mt-2 text-[14px] leading-relaxed text-[#142334]/68">
                  Build the next post around {strongestContentSignal}, then route readers to the service that appears most often in demand data.
                </p>
              </div>
            </div>

            <div className="rounded-[8px] bg-[#FCFBFA] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">Service demand</p>
              <div className="mt-5 grid gap-4">
                {Object.entries(serviceCounts).length === 0 ? (
                  <p className="text-[14px] leading-relaxed text-[#142334]/68">Service demand will appear once diagnostic records are available.</p>
                ) : (
                  Object.entries(serviceCounts).map(([serviceName, count]) => (
                    <Link
                      key={serviceName}
                      href={buildFilterHref(key, currentFilters, { tab: 'pipeline', service: serviceName })}
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
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
        )}

        {activeTab === 'calendar' && <CustomCalendarDashboard adminKey={key || ''} leads={submissions} />}

        {activeTab === 'messages' && (
          <MessagesLog
            adminKey={key || ''}
            emails={sentEmailLog.emails}
            totalCount={sentEmailLog.totalCount}
            thisWeekCount={sentEmailLog.thisWeekCount}
            uniqueLeadCount={sentEmailLog.uniqueLeadCount}
            hasFilters={sentEmailLog.hasFilters}
            filters={{
              q: q || '',
              archetype: archetype || '',
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
            standaloneNotes={standaloneNotes}
            strongestContentSignal={strongestContentSignal}
            newLeadCount={newLeadCount}
            dueFollowUpCount={dueFollowUpCount}
            paidDeliveryPressureCount={paidDeliveryPressureCount}
          />
        )}
        {activeTab === 'settings' && (
        <section className="pb-10">
          <div className="w-full">
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
    </main>
  );
}
