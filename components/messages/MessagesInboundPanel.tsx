'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, CheckCircle2, ChevronDown, ChevronRight, Inbox, Mail, RefreshCcw, XCircle } from 'lucide-react';
import LeadEmailButton from '@/components/leads/LeadEmailButton';
import type { InboundEmailReply } from '@/lib/inbound-email-replies';

type ImportResult = {
  scanned?: number;
  matched?: number;
  imported?: number;
  skipped?: number;
  ignored?: number;
  drafted?: number;
  tasksCreated?: number;
  notesCreated?: number;
  missingConfig?: string[];
  errors?: string[];
};

function formatLogDate(value: string) {
  const date = new Date(value).getTime();
  const diff = Date.now() - date;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff >= 0 && diff < hour) {
    const minutes = Math.max(1, Math.round(diff / minute));
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  if (diff >= 0 && diff < day) {
    const hours = Math.max(1, Math.round(diff / hour));
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date(value));
}

function formatBody(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getInitial(reply: InboundEmailReply) {
  return (reply.fromName || reply.fromEmail || '?').trim().charAt(0).toUpperCase() || '?';
}

function getProfileHref(adminKey: string, leadId: string | null) {
  if (!leadId) return '';
  const params = new URLSearchParams();
  if (adminKey) params.set('key', adminKey);
  params.set('tab', 'messages');
  return `/resources/career-diagnostic/submissions/${leadId}?${params.toString()}`;
}

function getReplyLead(reply: InboundEmailReply) {
  if (!reply.lead) return null;
  return {
    id: reply.lead.id,
    firstName: reply.lead.firstName,
    email: reply.lead.email || reply.fromEmail,
    archetype: reply.lead.archetype,
    serviceInterest: reply.lead.serviceInterest,
    leadStatus: reply.lead.leadStatus,
    followUpCount: reply.lead.followUpCount,
    lastContactedAt: reply.lead.lastContactedAt,
    source: reply.lead.source,
    downloadLink: reply.lead.downloadLink,
  };
}

export default function MessagesInboundPanel({
  adminKey,
  replies,
}: {
  adminKey: string;
  replies: InboundEmailReply[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [expandedReplyId, setExpandedReplyId] = useState<string | null>(null);
  const [localReplies, setLocalReplies] = useState(replies);
  const activeReplies = localReplies.filter((reply) => reply.status !== 'archived');
  const newCount = activeReplies.filter((reply) => reply.status === 'new').length;
  const draftedCount = activeReplies.filter((reply) => reply.draftStatus === 'drafted').length;
  const busy = isSyncing || isPending;

  async function syncInboundReplies() {
    if (!adminKey || busy) return;

    setIsSyncing(true);
    setResult(null);
    setError('');

    try {
      const response = await fetch('/api/messages/import-inbound', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: adminKey, days: 14, limit: 50 }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const missing = Array.isArray(payload.missingConfig) && payload.missingConfig.length
          ? `Missing Zoho config: ${payload.missingConfig.join(', ')}.`
          : '';
        throw new Error(payload.error || missing || 'Could not sync inbound replies.');
      }

      setResult(payload);
      if (Array.isArray(payload.errors) && payload.errors.length > 0) {
        setError(String(payload.errors[0]));
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sync inbound replies.');
    } finally {
      setIsSyncing(false);
    }
  }

  async function updateReply(replyId: string, values: { status?: string; draftStatus?: string }) {
    const response = await fetch(`/api/messages/inbound/${replyId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: adminKey, ...values }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Could not update this reply.');

    setLocalReplies((current) =>
      current.map((reply) =>
        reply.id === replyId
          ? {
              ...reply,
              status: values.status === 'reviewed' || values.status === 'archived' ? values.status : reply.status,
              draftStatus:
                values.draftStatus === 'sent' || values.draftStatus === 'dismissed' || values.draftStatus === 'approved'
                  ? values.draftStatus
                  : reply.draftStatus,
            }
          : reply,
      ),
    );
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <section id="messages-inbox" className="mb-5 rounded-[8px] bg-[#F5F3EE] p-4 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Messages / Replies</p>
          <h2 className="mt-2 font-serif text-[36px] leading-tight text-[#142334]">Inbound replies</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#6B6B6B]">
            Zoho replies become tasks, notes, and approval-ready drafts.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button
            type="button"
            onClick={syncInboundReplies}
            disabled={busy || !adminKey}
            className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
            {busy ? 'Checking' : 'Sync Zoho'}
          </button>
          {result && (
            <p className="max-w-sm text-[12px] leading-relaxed text-[#142334]/58">
              {result.imported
                ? `${result.imported} replies imported, ${result.drafted || 0} drafts prepared.`
                : `No new replies found. ${result.scanned || 0} messages checked.`}
            </p>
          )}
          {error && <p className="max-w-sm text-[12px] leading-relaxed text-[#8A3B2D]">{error}</p>}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          ['New replies', String(newCount), 'Need review'],
          ['Drafts ready', String(draftedCount), 'Approval queue'],
          ['Total imported', String(activeReplies.length), 'Zoho replies'],
        ].map(([title, value, label]) => (
          <div key={title} className="rounded-[8px] bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">{title}</p>
            <p className="mt-3 font-serif text-[34px] leading-none text-[#142334]">{value}</p>
            <p className="mt-2 text-[12px] text-[#6B6B6B]">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-[8px] bg-white">
        {activeReplies.length === 0 ? (
          <div className="grid min-h-[180px] place-items-center px-6 py-8 text-center">
            <div>
              <Inbox className="mx-auto h-9 w-9 text-[#C9AD98]" />
              <p className="mt-5 font-serif text-[28px] leading-tight text-[#142334]">No inbound replies synced yet.</p>
              <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[#6B6B6B]">
                Once Zoho credentials are live, the sync will pull lead replies into this approval queue.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#E4D8CB]">
            {activeReplies.map((reply) => {
              const expanded = expandedReplyId === reply.id;
              const lead = getReplyLead(reply);
              const profileHref = getProfileHref(adminKey, reply.leadId);

              return (
                <article key={reply.id} className="transition hover:bg-[#F5F3EE]">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedReplyId(expanded ? null : reply.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setExpandedReplyId(expanded ? null : reply.id);
                      }
                    }}
                    className="grid cursor-pointer gap-4 px-4 py-3.5 md:grid-cols-[40px_minmax(170px,0.85fr)_minmax(220px,1fr)_auto_auto_24px] md:items-center"
                    aria-expanded={expanded}
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-[#E4D8CB] font-serif text-[18px] leading-none text-[#142334]">
                      {getInitial(reply)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-[#142334]">{reply.fromName}</p>
                      <p className="mt-1 truncate text-[12px] text-[#6B6B6B]">{reply.fromEmail}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                          reply.status === 'new'
                            ? 'border-[#C9AD98] bg-[#F7F1EC] text-[#7B5D49]'
                            : 'border-[#D8C8BB] bg-white text-[#142334]/62'
                        }`}>
                          {reply.status === 'new' ? 'New reply' : 'Reviewed'}
                        </span>
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                          reply.draftStatus === 'sent'
                            ? 'border-[#79A580] bg-[#EEF7EF] text-[#355C3A]'
                            : 'border-[#8AA6C8] bg-[#EEF4FA] text-[#284B70]'
                        }`}>
                          {reply.draftStatus === 'sent' ? 'Sent' : 'Draft ready'}
                        </span>
                      </div>
                    </div>
                    <p className="min-w-0 truncate text-[14px] text-[#142334]">{reply.subject}</p>
                    <span className="w-fit rounded-full bg-[#F5F3EE] px-3 py-1.5 text-[11px] font-semibold text-[#6B6B6B]">
                      {reply.lead?.source ? reply.lead.source.replace(/_/g, ' ') : 'Matched email'}
                    </span>
                    <p className="text-[12px] text-[#6B6B6B]">{formatLogDate(reply.receivedAt)}</p>
                    {expanded ? <ChevronDown className="h-5 w-5 text-[#C9AD98]" /> : <ChevronRight className="h-5 w-5 text-[#C9AD98]" />}
                  </div>

                  {expanded && (
                    <div className="px-4 pb-4 md:pl-[68px]">
                      <div className="rounded-[8px] bg-[#F5F3EE] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Reply received</p>
                        <div className="mt-3 space-y-3 text-[14px] leading-[1.7] text-[#142334]">
                          {formatBody(reply.body).map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                          ))}
                        </div>
                        {reply.replyDraft && (
                          <>
                            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Draft for approval</p>
                            <div className="mt-3 space-y-3 rounded-[8px] bg-white p-4 text-[14px] leading-[1.7] text-[#142334]">
                              {formatBody(reply.replyDraft).map((paragraph) => (
                                <p key={paragraph}>{paragraph}</p>
                              ))}
                            </div>
                          </>
                        )}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {lead ? (
                            <LeadEmailButton
                              lead={lead}
                              initialNotes={[]}
                              label={reply.draftStatus === 'sent' ? 'Sent' : 'Approve'}
                              icon="send"
                              initialSubject={reply.replySubject}
                              initialBody={reply.replyDraft}
                              className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98]"
                              onSent={() => {
                                void updateReply(reply.id, { status: 'reviewed', draftStatus: 'sent' });
                              }}
                            />
                          ) : (
                            <a
                              href={`mailto:${reply.fromEmail}?subject=${encodeURIComponent(reply.replySubject)}&body=${encodeURIComponent(reply.replyDraft)}`}
                              className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98]"
                            >
                              Email <Mail className="h-4 w-4" />
                            </a>
                          )}
                          {profileHref && (
                            <Link
                              href={profileHref}
                              className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98]"
                            >
                              Profile <ArrowUpRight className="h-4 w-4" />
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              void updateReply(reply.id, { status: 'reviewed' });
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98]"
                          >
                            Reviewed <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void updateReply(reply.id, { status: 'archived', draftStatus: 'dismissed' });
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-[#C98672]/45 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#8A3B2D] transition hover:border-[#8A3B2D]"
                          >
                            Dismiss <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
