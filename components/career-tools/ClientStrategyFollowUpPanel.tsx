'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MailCheck, Send, ShieldCheck } from 'lucide-react';
import ClientStrategyCheckpointCard from '@/components/career-tools/ClientStrategyCheckpointCard';
import { buildDashboardAuthUrl } from '@/lib/dashboard-auth-url';
import type {
  ClientStrategyCheckpoint,
  ClientStrategyPlanDelivery,
} from '@/lib/client-strategy-follow-up-store';
import type { ClientStrategyPlanRecord } from '@/lib/client-strategy-plan';

type ThemeReportItem = { key: string; label: string; clientCount: number };
type FollowUpResponse = {
  recipient?: { email: string; name: string } | null;
  delivery?: ClientStrategyPlanDelivery | null;
  checkpoints?: ClientStrategyCheckpoint[];
  subject?: string;
  themeReport?: ThemeReportItem[];
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
      `Send the approved plan to ${data.recipient.name} at ${data.recipient.email}? This will create the follow-up checkpoints.`,
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
      setMessage('Brevo accepted the approved plan and the follow-up schedule is active.');
      onDelivered();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send the approved plan.');
    } finally {
      setIsSending(false);
    }
  }

  function checkpointSaved(checkpoint: ClientStrategyCheckpoint, themeReport: ThemeReportItem[]) {
    setData((current) => current ? {
      ...current,
      checkpoints: (current.checkpoints || []).map((item) => item.id === checkpoint.id ? checkpoint : item),
      themeReport,
    } : current);
  }

  if (isLoading) {
    return <div className="mt-5 h-36 animate-pulse rounded-[8px] bg-[#F5F3EE]" aria-label="Loading plan delivery" />;
  }

  const delivery = data?.delivery;
  const canSend = !isTest && plan.status === 'approved' && delivery?.status !== 'sent' && delivery?.status !== 'sending';

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
            <button
              type="button"
              disabled={isSending || !data?.recipient?.email}
              onClick={() => void sendPlan()}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[#466B4D] px-5 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#142334] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isSending ? 'Sending...' : delivery?.status === 'failed' ? 'Retry approved plan' : 'Send approved plan'}
            </button>
          )}
        </div>

        {delivery?.status === 'sent' && delivery.deliveredAt && (
          <p className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold text-[#466B4D]">
            <MailCheck className="h-4 w-4" /> Sent through Brevo on {formatDateTime(delivery.deliveredAt)}
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

      {(data?.checkpoints?.length || 0) > 0 && (
        <div className="mt-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">Progress checkpoints</p>
              <h4 className="mt-2 font-serif text-[26px] text-[#142334]">Record what happened</h4>
            </div>
            <p className="hidden max-w-sm text-right text-[11px] leading-relaxed text-[#6B6B6B] md:block">Outcomes sit beside the approved plan. They never rewrite the client-facing recommendations.</p>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {data?.checkpoints?.map((checkpoint) => (
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

      <div className="mt-6 rounded-[8px] border border-[#E4D8CB] bg-[#FBFAF8] p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">Privacy-safe client themes</p>
        <h4 className="mt-2 font-serif text-[24px] text-[#142334]">Patterns worth learning from</h4>
        <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-[#6B6B6B]">A theme appears only when at least three distinct clients share it. This view contains counts only, with no client names or outcome notes.</p>
        {(data?.themeReport?.length || 0) > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {data?.themeReport?.map((theme) => (
              <span key={theme.key} className="rounded-full bg-[#EAF2EB] px-3 py-2 text-[11px] font-semibold text-[#466B4D]">
                {theme.label}: {theme.clientCount} clients
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[12px] font-semibold text-[#8C7466]">No theme has reached the three-client privacy threshold yet.</p>
        )}
      </div>
    </section>
  );
}
