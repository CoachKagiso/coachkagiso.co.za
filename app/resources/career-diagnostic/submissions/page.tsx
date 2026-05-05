import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  LockKeyhole,
  Mail,
  RefreshCcw,
  Search,
  UserRoundCheck,
} from 'lucide-react';
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
import { getDiagnosticAdminKey } from '@/lib/env';

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
    archetype?: string;
    status?: string;
    service?: string;
    followUp?: string;
    q?: string;
    updated?: string;
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

function getTopArchetype(submissions: DiagnosticSubmission[]) {
  const counts = submissions.reduce<Record<string, number>>((acc, submission) => {
    acc[submission.archetype_key] = (acc[submission.archetype_key] || 0) + 1;
    return acc;
  }, {});

  const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!winner) return 'No submissions yet';
  return archetypeLabels[winner[0] as keyof typeof archetypeLabels] || winner[0];
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
      submission.next_follow_up_at && new Date(submission.next_follow_up_at).getTime() <= todayEnd.getTime()
  ).length;
}

function getStatusLabel(status: DiagnosticLeadStatus) {
  return diagnosticLeadStatuses.find((option) => option.value === status)?.shortLabel || status;
}

function getStatusClass(status: DiagnosticLeadStatus) {
  if (status === 'paid') return 'border-[#79A580] bg-[#EEF7EF] text-[#355C3A]';
  if (status === 'discovery_booked') return 'border-[#8AA6C8] bg-[#EEF4FA] text-[#284B70]';
  if (status === 'new') return 'border-[#C9AD98] bg-[#F7F1EC] text-[#7B5D49]';
  if (status === 'not_a_fit' || status === 'archived') return 'border-[#D8C8BB] bg-[#FCFBFA] text-[#142334]/55';
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
  if (submission.lead_status === 'not_a_fit' || submission.lead_status === 'archived') score -= 45;

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
  if (submission.lead_status === 'not_a_fit') return 'Keep archived unless they re-engage';
  return 'Check whether they need another nudge';
}

function buildLeadEmailHref(submission: DiagnosticSubmission) {
  const subject = encodeURIComponent(`Your career diagnostic result: ${submission.archetype_name}`);
  const payload = submission.archetype_payload || {};
  const body = encodeURIComponent(`Hi ${submission.first_name},

Thank you for taking the 5-Minute Career Diagnostic.

Your result came through as: ${submission.archetype_name}.
${payload.tagline ? `\n${payload.tagline}\n` : ''}
What this suggests:
${payload.diagnosis || 'You are in a career season that needs a clearer next step.'}

One useful action for this week:
${payload.action || 'Choose one focused action and complete it before collecting more advice.'}

If you want support with the next step we discussed, you can start here:
${payload.service || 'Support option'}
${payload.href ? `\nhttps://coachkagiso.co.za${payload.href}` : ''}

Warmly,
Coach Kagiso`);

  return `mailto:${encodeURIComponent(submission.email)}?subject=${subject}&body=${body}`;
}

function buildFilterHref(
  key: string | undefined,
  current: {
    archetype?: string;
    status?: string;
    service?: string;
    followUp?: string;
    q?: string;
  },
  next: Partial<typeof current>
) {
  const params = new URLSearchParams();
  if (key) params.set('key', key);

  const merged = { ...current, ...next };
  Object.entries(merged).forEach(([paramKey, value]) => {
    if (value && value !== 'all') params.set(paramKey, value);
  });

  return `/resources/career-diagnostic/submissions?${params.toString()}`;
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
  const { key, archetype, status, service, followUp, q, updated, error } = await searchParams;

  if (!isDiagnosticAdminAuthorized(key)) {
    return <AccessGate />;
  }

  const selectedFilter = isDiagnosticArchetypeKey(archetype) ? archetype : 'all';
  const selectedStatus = isDiagnosticLeadStatus(status) ? status : 'all';
  const selectedFollowUp = ['due', 'scheduled', 'none'].includes(followUp || '') ? followUp : 'all';
  const submissions = await listDiagnosticSubmissions({
    archetype,
    status,
    service,
    followUp,
    query: q,
  });
  const uniqueEmails = new Set(submissions.map((submission) => submission.email)).size;
  const exportHref = `/api/diagnostic/export?key=${encodeURIComponent(key || '')}${
    selectedFilter === 'all' ? '' : `&archetype=${selectedFilter}`
  }`;
  const currentFilters = {
    archetype: selectedFilter,
    status: selectedStatus,
    service,
    followUp: selectedFollowUp,
    q,
  };
  const sortedSubmissions = [...submissions].sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
  const actionQueue = sortedSubmissions.filter((submission) => !['paid', 'archived', 'not_a_fit'].includes(submission.lead_status)).slice(0, 8);
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

  return (
    <>
      <Navbar />
      <main className="min-h-screen overflow-hidden bg-[#FCFBFA] text-[#142334]">
        <section className="relative overflow-hidden bg-[#E4D8CB] pt-[124px] pb-12 lg:pb-16">
          <div className="absolute inset-x-0 top-24 pointer-events-none select-none text-center">
            <span className="font-serif text-[13vw] leading-none text-white/35 tracking-normal">
              PIPELINE
            </span>
          </div>
          <div className="relative z-10 mx-auto max-w-[1240px] px-6 lg:px-8">
            <Reveal className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="inline-flex rounded-full border border-[#142334]/20 px-4 py-1 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#142334]/72">
                  Career diagnostic
                </p>
                <h1 className="mt-6 font-serif text-[48px] md:text-[72px] leading-[0.96]">
                  Lead command center.
                </h1>
                <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-[#142334]/76">
                  Prioritise the people most ready for follow-up, track the coaching pipeline, and see where diagnostic demand is clustering.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={exportHref}
                  className="inline-flex items-center gap-2 rounded-full bg-[#142334] px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.17em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
                >
                  Export CSV <Download className="h-4 w-4" />
                </Link>
                <Link
                  href={buildFilterHref(key, currentFilters, {})}
                  className="inline-flex items-center gap-2 rounded-full border border-[#142334]/20 px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#142334]"
                >
                  Refresh <RefreshCcw className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="border-b border-[#142334]/10 bg-white">
          <div className="mx-auto max-w-[1240px] px-6 py-5 lg:px-8">
            <Reveal>
              <form action="/resources/career-diagnostic/submissions" method="get" className="grid gap-3 lg:grid-cols-[1.4fr_0.85fr_0.85fr_0.85fr_auto]">
                <input type="hidden" name="key" value={key || ''} />
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A09086]" />
                  <input
                    name="q"
                    defaultValue={q || ''}
                    placeholder="Search name, email, service..."
                    className="h-12 w-full border border-[#D8C8BB] bg-[#FCFBFA] pl-11 pr-4 text-[14px] outline-none focus:border-[#142334]"
                  />
                </label>
                <select
                  name="status"
                  defaultValue={selectedStatus}
                  className="h-12 border border-[#D8C8BB] bg-[#FCFBFA] px-4 text-[13px] outline-none focus:border-[#142334]"
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
                  className="h-12 border border-[#D8C8BB] bg-[#FCFBFA] px-4 text-[13px] outline-none focus:border-[#142334]"
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
                  className="h-12 border border-[#D8C8BB] bg-[#FCFBFA] px-4 text-[13px] outline-none focus:border-[#142334]"
                >
                  <option value="all">All follow-ups</option>
                  <option value="due">Due now</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="none">No follow-up set</option>
                </select>
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#142334] px-6 text-[12px] font-semibold uppercase tracking-[0.17em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
                >
                  Apply
                </button>
              </form>
            </Reveal>
          </div>
        </section>

        {(updated || error) && (
          <section className="bg-[#FCFBFA]">
            <div className="mx-auto max-w-[1240px] px-6 pt-6 lg:px-8">
              <div className={`border p-4 text-[14px] leading-relaxed ${
                error ? 'border-[#C98672] bg-[#FFF5F2] text-[#7A2F22]' : 'border-[#79A580] bg-[#EEF7EF] text-[#355C3A]'
              }`}>
                {error === 'crm-schema'
                  ? 'CRM fields are not live in Supabase yet. Apply the SQL additions in docs/Diagnostic-Lead-Magnet-Supabase.sql, then retry.'
                  : error === 'unauthorized'
                    ? 'The admin key was rejected. Re-open the dashboard with the correct key.'
                    : 'Lead details updated.'}
              </div>
            </div>
          </section>
        )}

        <section className="py-10">
          <div className="mx-auto max-w-[1240px] px-6 lg:px-8">
            <Reveal>
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
                    <div key={String(label)} className="border border-[#D8C8BB] bg-white p-5">
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
            </Reveal>
          </div>
        </section>

        <section className="pb-10">
          <div className="mx-auto grid max-w-[1240px] gap-5 px-6 lg:grid-cols-[1.4fr_0.9fr] lg:px-8">
            <Reveal>
              <div className="border border-[#D8C8BB] bg-white">
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
                      const redirectTo = `/resources/career-diagnostic/submissions?key=${encodeURIComponent(key || '')}`;

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
                            <a
                              href={buildLeadEmailHref(submission)}
                              className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98]"
                            >
                              Email <Mail className="h-4 w-4" />
                            </a>
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
            </Reveal>

            <Reveal>
              <div className="grid gap-5">
                <div className="border border-[#D8C8BB] bg-white p-6">
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

                <div className="border border-[#D8C8BB] bg-white p-6">
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
            </Reveal>
          </div>
        </section>

        <section className="pb-24">
          <div className="mx-auto max-w-[1240px] px-6 lg:px-8">
            <Reveal>
              {submissions.length === 0 ? (
                <div className="border border-[#D8C8BB] bg-white p-8 text-[16px] leading-relaxed text-[#142334]/72">
                  No submissions found for this filter yet.
                </div>
              ) : (
                <div className="overflow-hidden border border-[#D8C8BB] bg-white">
                  <div className="hidden border-b border-[#D8C8BB] bg-[#F7F1EC] px-6 py-4 lg:grid lg:grid-cols-[1.05fr_0.95fr_0.75fr_0.65fr_0.8fr_0.75fr] lg:gap-5">
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
                        <div key={submission.id} className="px-6 py-6 lg:grid lg:grid-cols-[1.05fr_0.95fr_0.75fr_0.65fr_0.8fr_0.75fr] lg:gap-5">
                          <div>
                            <Link
                              href={`/resources/career-diagnostic/submissions/${submission.id}?key=${encodeURIComponent(key || '')}`}
                              className="font-serif text-[29px] leading-none text-[#142334] transition hover:text-[#C9AD98]"
                            >
                              {submission.first_name}
                            </Link>
                            <a
                              href={`mailto:${submission.email}`}
                              className="mt-2 inline-flex items-center gap-2 text-[14px] leading-relaxed text-[#142334]/72 transition hover:text-[#C9AD98]"
                            >
                              <Mail className="h-4 w-4" />
                              {submission.email}
                            </a>
                          </div>
                          <div className="mt-5 lg:mt-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9AD98]">
                              {submission.archetype_key}
                            </p>
                            <p className="mt-2 text-[15px] leading-relaxed text-[#142334]">
                              {submission.archetype_payload?.service || 'Not set'}
                            </p>
                          </div>
                          <div className="mt-5 lg:mt-0">
                            <span className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.17em] ${getStatusClass(submission.lead_status)}`}>
                              {getStatusLabel(submission.lead_status)}
                            </span>
                            <p className="mt-3 text-[12px] text-[#142334]/58">
                              Submitted {formatDate(submission.submitted_at)}
                            </p>
                          </div>
                          <div className="mt-5 lg:mt-0">
                            <p className="font-serif text-[30px] leading-none text-[#142334]">{priority}</p>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F1E7DF]">
                              <div className="h-full bg-[#C9AD98]" style={{ width: `${priority}%` }} />
                            </div>
                          </div>
                          <div className="mt-5 lg:mt-0">
                            <p className="text-[14px] leading-relaxed text-[#142334]/72">
                              {formatShortDate(submission.next_follow_up_at)}
                            </p>
                            <p className="mt-1 text-[12px] text-[#142334]/58">
                              Last contact: {formatShortDate(submission.last_contacted_at)}
                            </p>
                          </div>
                          <div className="mt-5 flex flex-wrap gap-3 lg:mt-0">
                            <a
                              href={buildLeadEmailHref(submission)}
                              className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98]"
                            >
                              Email <Mail className="h-4 w-4" />
                            </a>
                            <Link
                              href={`/resources/career-diagnostic/submissions/${submission.id}?key=${encodeURIComponent(
                                key || ''
                              )}`}
                              className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98]"
                            >
                              Profile <FileText className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
