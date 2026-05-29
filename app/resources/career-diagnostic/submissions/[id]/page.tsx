import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Mail,
  Pencil,
  Printer,
  Save,
  Trash2,
} from 'lucide-react';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import DashboardSidebar from '@/components/DashboardSidebar';
import DashboardTopBar from '@/components/dashboard/DashboardTopBar';
import LeadEmailButton from '@/components/leads/LeadEmailButton';
import LeadProfileEmailButton from '@/components/leads/LeadProfileEmailButton';
import LeadSourceBadge from '@/components/leads/LeadSourceBadge';
import SequenceRepairCard from '@/components/leads/SequenceRepairCard';
import PrintButton from '@/components/PrintButton';
import Reveal from '@/components/Reveal';
import {
  diagnosticLeadStatuses,
  getDiagnosticSubmissionById,
  isDiagnosticAdminAuthorized,
  type DiagnosticLeadStatus,
  type DiagnosticSubmission,
} from '@/lib/diagnostic-submissions';
import { questions } from '@/lib/career-diagnostic';
import { listNotes } from '@/lib/dashboard-task-records';
import { getDashboardEventNotificationCount } from '@/lib/dashboard-notifications';
import { getFollowUpNotificationCount, listFollowUpNotifications } from '@/lib/follow-up-notifications';
import { getFollowUpUrgency, getSastDateKey } from '@/lib/follow-up-utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Diagnostic Submission Summary | Coach Kagiso',
  robots: {
    index: false,
    follow: false,
  },
};

type DiagnosticSubmissionSummaryPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ key?: string; updated?: string; error?: string }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date(value));
}

function formatDashboardTime(value: Date) {
  return new Intl.DateTimeFormat('en-ZA', {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    timeZone: 'Africa/Johannesburg',
  }).format(value);
}

function formatDateInput(value?: string | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function formatFollowUpDate(value: string) {
  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00+02:00`));
}

function getFollowUpUrgencyClass(value: string) {
  const urgency = getFollowUpUrgency(value);
  if (urgency.urgency === 'overdue') return 'text-[#DC2626]';
  if (urgency.urgency === 'today') return 'text-[#F59E0B]';
  return 'text-[#6B6B6B]';
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

function getNextAction(submission: DiagnosticSubmission) {
  if (submission.lead_status === 'paid') return 'Confirm delivery, intake, and client next steps.';
  if (submission.lead_status === 'discovery_booked') return 'Review this profile before the discovery call.';
  if (submission.next_follow_up_at && new Date(submission.next_follow_up_at).getTime() <= Date.now()) {
    return 'Follow up today with a direct recommendation.';
  }
  if (submission.lead_status === 'new') return 'Send the first result follow-up while the diagnostic is still fresh.';
  if (submission.lead_status === 'follow_up_later') return 'Wait for the scheduled follow-up date.';
  if (submission.lead_status === 'nurture') return 'Keep in a slower nurture rhythm unless they re-engage.';
  if (submission.lead_status === 'closed') return 'Closed.';
  if (submission.lead_status === 'not_a_fit') return 'Keep context saved, but do not prioritise active outreach.';
  return 'Check whether a second nudge or service route is useful.';
}

function getAnswerRows(submission: DiagnosticSubmission) {
  return Object.entries(submission.answers || {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([index, value]) => {
      const questionIndex = Number(index);
      const optionKey = String(value) as 'A' | 'B' | 'C' | 'D' | 'E';
      const question = questions[questionIndex];

      return {
        index: questionIndex,
        optionKey,
        prompt: question?.prompt || `Question ${questionIndex + 1}`,
        answer: question?.options?.[optionKey] || `Answer option ${value}`,
      };
    });
}

export default async function DiagnosticSubmissionSummaryPage({
  params,
  searchParams,
}: DiagnosticSubmissionSummaryPageProps) {
  const { id } = await params;
  const { key, updated, error } = await searchParams;

  if (!isDiagnosticAdminAuthorized(key)) {
    notFound();
  }

  const submission = await getDiagnosticSubmissionById(id);

  if (!submission) {
    notFound();
  }

  const payload = submission.archetype_payload || {};
  const answerRows = getAnswerRows(submission);
  const priority = getPriorityScore(submission);
  const encodedKey = encodeURIComponent(key || '');
  const leadsHref = `/resources/career-diagnostic/submissions?key=${encodedKey}&tab=leads`;
  const profileHref = `/resources/career-diagnostic/submissions/${submission.id}?key=${encodedKey}`;
  const [allNotes, followUpNotificationCount, dashboardEventNotificationCount, sidebarFollowUps] = await Promise.all([
    listNotes(),
    getFollowUpNotificationCount(),
    getDashboardEventNotificationCount(),
    listFollowUpNotifications({ includeTomorrow: false, limit: 4 }),
  ]);
  const dashboardNotificationCount = followUpNotificationCount + dashboardEventNotificationCount;
  const leadNotes = allNotes.filter((note) => note.linkedLeadId === submission.id);
  const followUpUrgency = submission.next_follow_up_at ? getFollowUpUrgency(submission.next_follow_up_at) : null;
  const dashboardTimeLabel = formatDashboardTime(new Date());
  const leadEmailModalLead = {
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

  return (
    <main className="coach-dashboard-clean min-h-screen overflow-x-clip bg-[#EDEBE8] text-[#142334]">
      <div className="flex min-h-screen w-full gap-3 p-2 md:gap-4 md:p-3 xl:p-4">
        <DashboardSidebar
          activeTab="leads"
          adminKey={key}
          todayFollowUpCount={followUpNotificationCount}
          todayFollowUps={sidebarFollowUps}
        />

        <section className="min-w-0 flex-1 overflow-x-clip rounded-[8px] bg-transparent">
          <div className="space-y-3 p-0">
            <DashboardTopBar
              activeTab="leads"
              adminKey={key || ''}
              query=""
              updatedTimeLabel={dashboardTimeLabel}
              notificationCount={dashboardNotificationCount}
              showSearch={false}
            />

            <div className="rounded-[8px] bg-[#FCFBFA] py-5 md:py-6">
              <div className="mx-auto max-w-[1120px] px-4 lg:px-6">
                <Reveal>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link
                href={leadsHref}
                className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#142334]/72 transition hover:text-[#142334]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Leads
              </Link>
              <div className="flex flex-wrap gap-3">
                <LeadEmailButton
                  lead={leadEmailModalLead}
                  initialNotes={leadNotes}
                  label="Email lead"
                  className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98]"
                />
                <PrintButton
                  className="inline-flex items-center gap-2 rounded-full bg-[#142334] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
                >
                  Print prep sheet <Printer className="h-4 w-4" />
                </PrintButton>
                <form action={`/api/diagnostic/submissions/${submission.id}`} method="post">
                  <input type="hidden" name="key" value={key || ''} />
                  <input type="hidden" name="redirectTo" value={leadsHref} />
                  <input type="hidden" name="intent" value="delete" />
                  <input type="hidden" name="confirm_delete" value={submission.id} />
                  <ConfirmSubmitButton
                    type="submit"
                    confirmMessage={`Delete ${submission.first_name}'s diagnostic record? This cannot be undone.`}
                    className="inline-flex items-center gap-2 rounded-full border border-[#C98672]/45 px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#7A2F22] transition hover:border-[#7A2F22] hover:bg-[#FFF5F2]"
                  >
                    Delete <Trash2 className="h-4 w-4" />
                  </ConfirmSubmitButton>
                </form>
              </div>
            </div>

            {(updated || error) && (
              <div className={`mt-6 border p-4 text-[14px] leading-relaxed ${
                error ? 'border-[#C98672] bg-[#FFF5F2] text-[#7A2F22]' : 'border-[#79A580] bg-[#EEF7EF] text-[#355C3A]'
              }`}>
                {error === 'crm-schema'
                  ? 'CRM fields are not live in Supabase yet. Apply the SQL additions in docs/Diagnostic-Lead-Magnet-Supabase.sql, then retry.'
                  : error === 'unauthorized'
                    ? 'The admin key was rejected. Re-open the dashboard with the correct key.'
                    : error === 'invalid'
                      ? 'That update could not be saved. Check the delete confirmation or choose a follow-up date from today onward.'
                      : 'Lead profile updated.'}
              </div>
            )}

            <div className="mt-8 border border-[#D8C8BB] bg-white p-8 md:p-10">
              <div className="grid gap-8 lg:grid-cols-[1fr_0.82fr]">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#C9AD98]">
                    Lead profile
                  </p>
                  <h1 className="mt-4 font-serif text-[54px] leading-[0.94]">
                    {submission.first_name}
                  </h1>
                  <p className="mt-4 inline-flex items-center gap-2 text-[16px] leading-relaxed text-[#142334]/72">
                    <Mail className="h-4 w-4" />
                    {submission.email}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <span className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] ${getStatusClass(submission.lead_status)}`}>
                      {getStatusLabel(submission.lead_status)}
                    </span>
                    <LeadSourceBadge source={submission.source} className="px-4 py-2 text-[11px] tracking-[0.17em]" />
                    <span className="rounded-full border border-[#D8C8BB] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334]/68">
                      Submitted {formatDate(submission.submitted_at)}
                    </span>
                  </div>
                </div>

                <div className="border border-[#C9AD98]/50 bg-[#142334] p-6 text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9AD98]">
                    Next best action
                  </p>
                  <p className="mt-4 font-serif text-[30px] leading-tight">
                    {getNextAction(submission)}
                  </p>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="border border-white/12 bg-white/5 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                        Priority
                      </p>
                      <p className="mt-2 font-serif text-[34px] leading-none text-[#C9AD98]">{priority}</p>
                    </div>
                    <div className="border border-white/12 bg-white/5 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                        Follow-up
                      </p>
                      <p className="mt-2 text-[15px] leading-relaxed text-white/78">
                        {submission.next_follow_up_at ? formatDate(submission.next_follow_up_at) : 'Not scheduled'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <SequenceRepairCard adminKey={key || ''} lead={leadEmailModalLead} initialNotes={leadNotes} />

              <div className="mt-10 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="border border-[#D8C8BB] bg-[#FCFBFA] p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9AD98]">
                    Result
                  </p>
                  <h2 className="mt-4 font-serif text-[36px] leading-tight text-[#142334]">
                    {submission.archetype_name}
                  </h2>
                  {payload.tagline && (
                    <p className="mt-4 text-[16px] leading-relaxed text-[#142334]/72">
                      {payload.tagline}
                    </p>
                  )}
                  {payload.diagnosis && (
                    <div className="mt-6 border-t border-[#D8C8BB] pt-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">
                        Diagnosis
                      </p>
                      <p className="mt-3 text-[15px] leading-relaxed text-[#142334]/72">
                        {payload.diagnosis}
                      </p>
                    </div>
                  )}
                  {payload.action && (
                    <div className="mt-6 border-t border-[#D8C8BB] pt-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">
                        7-day action
                      </p>
                      <p className="mt-3 font-serif text-[28px] leading-tight text-[#142334]">
                        {payload.action}
                      </p>
                    </div>
                  )}
                </div>

                <form
                  action={`/api/diagnostic/submissions/${submission.id}`}
                  method="post"
                  className="border border-[#D8C8BB] bg-white p-6"
                >
                  <input type="hidden" name="key" value={key || ''} />
                  <input type="hidden" name="redirectTo" value={profileHref} />
                  <input type="hidden" name="intent" value="save" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">
                    CRM controls
                  </p>
                  <div className="mt-5 grid gap-4">
                    <label className="grid gap-2">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334]/62">
                        Status
                      </span>
                      <select
                        name="lead_status"
                        defaultValue={submission.lead_status}
                        className="h-12 border border-[#D8C8BB] bg-[#FCFBFA] px-4 text-[14px] outline-none focus:border-[#142334]"
                      >
                        {diagnosticLeadStatuses.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid gap-2">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334]/62">
                        Next follow-up date
                      </span>
                      {submission.next_follow_up_at ? (
                        <div className="rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA] p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p data-next-follow-up-label className="font-serif text-[26px] leading-tight text-[#142334]">
                                {formatFollowUpDate(submission.next_follow_up_at)}
                              </p>
                              {followUpUrgency && (
                                <p
                                  data-next-follow-up-urgency
                                  className={`mt-1 text-[12px] font-semibold uppercase tracking-[0.12em] ${getFollowUpUrgencyClass(submission.next_follow_up_at)}`}
                                >
                                  {followUpUrgency.urgencyLabel}
                                </p>
                              )}
                            </div>
                            <details className="group">
                              <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#142334] ring-1 ring-[#D8C8BB] transition hover:bg-[#142334] hover:text-white">
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </summary>
                              <input
                                type="date"
                                name="next_follow_up_at"
                                min={getSastDateKey()}
                                data-next-follow-up-input
                                defaultValue={formatDateInput(submission.next_follow_up_at)}
                                className="mt-3 h-11 w-full rounded-[8px] border border-[#D8C8BB] bg-white px-3 text-[14px] outline-none focus:border-[#142334]"
                              />
                            </details>
                          </div>
                          <p className="mt-3 text-[12px] leading-relaxed text-[#142334]/58">
                            Auto-set based on last contact.
                          </p>
                        </div>
                      ) : (
                        <>
                          <input
                            type="date"
                            name="next_follow_up_at"
                            min={getSastDateKey()}
                            data-next-follow-up-input
                            defaultValue=""
                            className="h-12 rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA] px-4 text-[14px] outline-none focus:border-[#142334]"
                          />
                          <p className="text-[12px] leading-relaxed text-[#142334]/58">
                            Will be set automatically when you send an email.
                          </p>
                        </>
                      )}
                    </div>
                    <label className="grid gap-2">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334]/62">
                        Private notes
                      </span>
                      <textarea
                        name="lead_notes"
                        defaultValue={submission.lead_notes || ''}
                        rows={7}
                        placeholder="What to remember before the next message or call..."
                        className="resize-y border border-[#D8C8BB] bg-[#FCFBFA] px-4 py-3 text-[14px] leading-relaxed outline-none focus:border-[#142334]"
                      />
                    </label>
                    <LeadProfileEmailButton lead={leadEmailModalLead} initialNotes={leadNotes} />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#142334] px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.17em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
                    >
                      Save profile <Save className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              </div>

              <div className="mt-10 grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
                <div className="border border-[#D8C8BB] bg-white p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">
                    Recommended route
                  </p>
                  <h2 className="mt-4 font-serif text-[34px] leading-tight">
                    {payload.service || 'No recommendation saved'}
                  </h2>
                  {payload.href && (
                    <Link
                      href={payload.href}
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#C9AD98] px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:bg-[#142334] hover:text-white"
                    >
                      Open route <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  )}

                  <div className="mt-8 grid grid-cols-5 gap-3">
                    {(['A', 'B', 'C', 'D', 'E'] as const).map((scoreKey) => (
                      <div key={scoreKey} className="border border-[#D8C8BB] bg-[#FCFBFA] p-3 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A09086]">
                          {scoreKey}
                        </p>
                        <p className="mt-2 font-serif text-[28px] leading-none text-[#C9AD98]">
                          {submission.score?.[scoreKey] ?? 0}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-[#D8C8BB] bg-[#F7F1EC] p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">
                    Coaching prep
                  </p>
                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="border border-[#D8C8BB] bg-white p-4">
                      <CalendarClock className="h-4 w-4 text-[#C9AD98]" />
                      <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334]/58">
                        Last contact
                      </p>
                      <p className="mt-2 text-[14px] leading-relaxed text-[#142334]/78">
                        {submission.last_contacted_at ? formatDate(submission.last_contacted_at) : 'Not recorded'}
                      </p>
                    </div>
                    <div className="border border-[#D8C8BB] bg-white p-4">
                      <CheckCircle2 className="h-4 w-4 text-[#C9AD98]" />
                      <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334]/58">
                        Ask next
                      </p>
                      <p className="mt-2 text-[14px] leading-relaxed text-[#142334]/78">
                        What would make this support useful in the next 14 days?
                      </p>
                    </div>
                    <div className="border border-[#D8C8BB] bg-white p-4">
                      <Mail className="h-4 w-4 text-[#C9AD98]" />
                      <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334]/58">
                        Message angle
                      </p>
                      <p className="mt-2 text-[14px] leading-relaxed text-[#142334]/78">
                        Lead with {payload.service || 'the recommended route'} and their 7-day action.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 border border-[#D8C8BB] bg-[#F7F1EC] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">
                  Diagnostic answers
                </p>
                <div className="mt-5 grid gap-3">
                  {answerRows.map((row) => (
                    <div
                      key={row.index}
                      className="grid gap-4 border border-[#D8C8BB] bg-white p-4 md:grid-cols-[auto_1fr_auto]"
                    >
                      <span className="font-serif text-[24px] leading-none text-[#C9AD98]">
                        {String(row.index + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <p className="text-[14px] font-semibold leading-relaxed text-[#142334]">
                          {row.prompt}
                        </p>
                        <p className="mt-2 text-[14px] leading-relaxed text-[#142334]/72">
                          {row.answer}
                        </p>
                      </div>
                      <span className="h-fit rounded-full border border-[#D8C8BB] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#142334]/60">
                        {row.optionKey}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
