'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, FileCheck2, Loader2, MailCheck, Send, ShieldCheck } from 'lucide-react';
import ClientStrategyCheckpointCard from '@/components/career-tools/ClientStrategyCheckpointCard';
import { buildDashboardAuthUrl } from '@/lib/dashboard-auth-url';
import type {
  ClientStrategyCheckpoint,
  ClientStrategyPlanDelivery,
} from '@/lib/client-strategy-follow-up-store';
import type { ClientStrategyPlanRecord } from '@/lib/client-strategy-plan';

type FollowUpResponse = {
  recipient?: { email: string; name: string } | null;
  delivery?: ClientStrategyPlanDelivery | null;
  checkpoints?: ClientStrategyCheckpoint[];
  subject?: string;
  error?: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date(value));
}

export default function ClientStrategyFollowUpPanel({
  adminKey,
  paymentId,
  plan,
  isTest,
  onDelivered,
}: {
  adminKey: string;
  paymentId: string;
  plan: ClientStrategyPlanRecord;
  isTest: boolean;
  onDelivered: () => void;
}) {
  const [data, setData] = useState<FollowUpResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [manualSentDate, setManualSentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const endpoint = `/api/clients/${encodeURIComponent(paymentId)}/strategy-plan/${encodeURIComponent(plan.id)}/follow-up`;
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          buildDashboardAuthUrl(
            `/api/clients/${encodeURIComponent(paymentId)}/strategy-plan/${encodeURIComponent(plan.id)}/follow-up`,
            adminKey,
          ),
        );
        const result = await response.json().catch(() => null) as FollowUpResponse | null;
        if (!response.ok) throw new Error(result?.error || 'Could not load follow-up details.');
        if (!cancelled) setData(result);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Could not load follow-up details.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [adminKey, paymentId, plan.id]);

  async function sendPlan() {
    if (isTest || !data?.recipient?.email || isSending) return;
    const confirmed = window.confirm(
      `Send the approved plan to ${data.recipient.name} at ${data.recipient.email}? This will create the agreed follow-up contacts.`,
    );
    if (!confirmed) return;

    setIsSending(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: adminKey, confirm: true }),
      });
      const result = await response.json().catch(() => null) as FollowUpResponse | null;
      if (!response.ok) throw new Error(result?.error || 'Could not send the approved plan.');
      setData(result);
      setMessage('Brevo accepted the approved plan. Review and adjust the follow-up dates below.');
      onDelivered();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send the approved plan.');
    } finally {
      setIsSending(false);
    }
  }

  async function recordManualDelivery() {
    if (!data?.recipient?.email || isRecording) return;
    if (!window.confirm(`Confirm that you emailed the approved client pack to ${data.recipient.email}? This starts the follow-up schedule.`)) return;
    setIsRecording(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          key: adminKey,
          confirm: true,
          mode: 'manual_email',
          deliveredAt: new Date(`${manualSentDate}T12:00:00+02:00`).toISOString(),
        }),
      });
      const result = await response.json().catch(() => null) as FollowUpResponse | null;
      if (!response.ok) throw new Error(result?.error || 'Could not record the manual email.');
      setData(result);
      setMessage('Manual email recorded. Review and agree the follow-up dates below.');
      onDelivered();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not record the manual email.');
    } finally {
      setIsRecording(false);
    }
  }

  function checkpointSaved(checkpoint: ClientStrategyCheckpoint) {
    setData((current) => current ? {
      ...current,
      checkpoints: (current.checkpoints || []).map((item) => item.id === checkpoint.id ? checkpoint : item),
    } : current);
  }

  if (isLoading) {
    return <div className="mt-5 h-36 animate-pulse rounded-[8px] bg-[#F5F3EE]" aria-label="Loading plan delivery" />;
  }

  const delivery = data?.delivery;
  const canSend = !isTest && plan.status === 'approved' && delivery?.status !== 'sent' && delivery?.status !== 'sending';
  const currentCheckpoints = (data?.checkpoints || []).filter((checkpoint) => !checkpoint.isLegacy);
  const visibleCheckpoints = currentCheckpoints.length ? currentCheckpoints : (data?.checkpoints || []);

  return (
    <section className="mt-5 border-t border-[#E4D8CB] pt-6" aria-labelledby={`delivery-title-${plan.id}`}>
      <div className="rounded-[8px] bg-[#F5F3EE] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">Approved-plan delivery</p>
            <h4 id={`delivery-title-${plan.id}`} className="mt-2 font-serif text-[26px] text-[#142334]">
              {delivery?.status === 'sent'
                ? 'Plan sent and follow-up active'
                : isTest
                  ? 'Review safely without sending'
                  : 'Review the recipient, then send'}
            </h4>
            {data?.recipient && (
              <p className="mt-2 text-[12px] leading-relaxed text-[#6B6B6B]">
                <span className="font-semibold text-[#142334]">{data.recipient.name}</span> / {data.recipient.email}
                <br />{data.subject}
              </p>
            )}
          </div>

          {canSend && (
            <div className="grid gap-2 sm:grid-cols-[150px_auto]">
              <label className="grid gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#8C7466]">
                Date emailed
                <input type="date" value={manualSentDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setManualSentDate(event.target.value)} className="h-10 rounded-[8px] border border-[#D8C8BB] bg-white px-3 text-[12px] text-[#142334]" />
              </label>
              <button
                type="button"
                disabled={isRecording || !data?.recipient?.email}
                onClick={() => void recordManualDelivery()}
                className="inline-flex h-11 self-end items-center justify-center gap-2 rounded-[8px] bg-[#466B4D] px-4 text-[10px] font-bold uppercase tracking-[0.12em] text-white disabled:opacity-45"
              >
                {isRecording ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
                Record manual email
              </button>
              <button
                type="button"
                disabled={isSending || !data?.recipient?.email}
                onClick={() => void sendPlan()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#466B4D] bg-white px-4 text-[9px] font-bold uppercase tracking-[0.1em] text-[#466B4D] sm:col-span-2"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isSending ? 'Sending...' : delivery?.status === 'failed' ? 'Retry through Brevo' : 'Send through Brevo instead'}
              </button>
            </div>
          )}
        </div>

        {delivery?.status === 'sent' && delivery.deliveredAt && (
          <p className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold text-[#466B4D]">
            <MailCheck className="h-4 w-4" /> {delivery.provider === 'manual_email' ? 'Manual email recorded' : 'Sent through Brevo'} on {formatDateTime(delivery.deliveredAt)}
          </p>
        )}
        {delivery?.status === 'sending' && (
          <p className="mt-4 flex items-start gap-2 text-[12px] leading-relaxed text-[#76541D]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Delivery is reserved. Verify Brevo before any retry so the client does not receive a duplicate.
          </p>
        )}
        {delivery?.status === 'failed' && (
          <p className="mt-4 text-[12px] text-[#76541D]">The previous provider attempt failed before acceptance. The approved plan is still locked and ready to retry.</p>
        )}
        {isTest && (
          <p className="mt-4 flex items-start gap-2 rounded-[8px] border border-[#C4B5FD] bg-[#F5F3FF] px-4 py-3 text-[12px] font-semibold text-[#5B21B6]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Test record. The approved plan can be reviewed here, but external delivery is blocked.
          </p>
        )}
        {error && <p role="alert" className="mt-4 rounded-[8px] border border-[#C98672] bg-[#FFF5F2] px-4 py-3 text-[12px] font-semibold text-[#7A2F22]">{error}</p>}
        {message && <p role="status" className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold text-[#466B4D]"><CheckCircle2 className="h-4 w-4" />{message}</p>}
      </div>

      {visibleCheckpoints.length > 0 && (
        <div className="mt-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">Follow-up contacts</p>
              <h4 className="mt-2 font-serif text-[30px] text-[#142334]">Agree the dates, then record the outcome</h4>
            </div>
            <p className="hidden max-w-sm text-right text-[12px] leading-relaxed text-[#6B6B6B] md:block">
              The suggested window is guidance. Save the actual agreed date, then mark the contact done or not done with a short note.
            </p>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {visibleCheckpoints.map((checkpoint) => (
              <ClientStrategyCheckpointCard
                key={`${checkpoint.id}-${checkpoint.updatedAt}`}
                adminKey={adminKey}
                paymentId={paymentId}
                planId={plan.id}
                checkpoint={checkpoint}
                onSaved={checkpointSaved}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
