import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Mail,
  Printer,
  Save,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
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
  }).format(new Date(value));
}

function formatDateInput(value?: string | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
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
  if (submission.lead_status === 'discovery_booked' || submission.lead_status === 'paid') score -= 20;
  if (submission.lead_status === 'not_a_fit' || submission.lead_status === 'archived') score -= 45;

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
  if (submission.lead_status === 'not_a_fit') return 'Keep context saved, but do not prioritise active outreach.';
  return 'Check whether a second nudge or service route is useful.';
}

function buildLeadEmailHref(
  firstName: string,
  email: string,
  archetypeName: string,
  payload: {
    tagline?: string;
    diagnosis?: string;
    action?: string;
    service?: string;
    href?: string;
  }
) {
  const subject = encodeURIComponent(`Your career diagnostic result: ${archetypeName}`);
  const body = encodeURIComponent(`Hi ${firstName},

Thank you for taking the 5-Minute Career Diagnostic.

Your result came through as: ${archetypeName}.
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

  return `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
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
  const profileHref = `/resources/career-diagnostic/submissions/${submission.id}?key=${encodeURIComponent(key || '')}`;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#FCFBFA] text-[#142334] pt-[124px] pb-24">
        <div className="mx-auto max-w-[1120px] px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link
                href={`/resources/career-diagnostic/submissions?key=${encodeURIComponent(key || '')}`}
                className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#142334]/72 transition hover:text-[#142334]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to command center
              </Link>
              <div className="flex flex-wrap gap-3">
                <a
                  href={buildLeadEmailHref(
                    submission.first_name,
                    submission.email,
                    submission.archetype_name,
                    payload
                  )}
                  className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98]"
                >
                  Email lead <Mail className="h-4 w-4" />
                </a>
                <PrintButton
                  className="inline-flex items-center gap-2 rounded-full bg-[#142334] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
                >
                  Print prep sheet <Printer className="h-4 w-4" />
                </PrintButton>
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
                  <a
                    href={`mailto:${submission.email}`}
                    className="mt-4 inline-flex items-center gap-2 text-[16px] leading-relaxed text-[#142334]/72 transition hover:text-[#C9AD98]"
                  >
                    <Mail className="h-4 w-4" />
                    {submission.email}
                  </a>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <span className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] ${getStatusClass(submission.lead_status)}`}>
                      {getStatusLabel(submission.lead_status)}
                    </span>
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
                    <label className="grid gap-2">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334]/62">
                        Next follow-up date
                      </span>
                      <input
                        type="date"
                        name="next_follow_up_at"
                        defaultValue={formatDateInput(submission.next_follow_up_at)}
                        className="h-12 border border-[#D8C8BB] bg-[#FCFBFA] px-4 text-[14px] outline-none focus:border-[#142334]"
                      />
                    </label>
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
      </main>
      <Footer />
    </>
  );
}
