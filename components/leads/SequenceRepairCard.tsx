'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, MailCheck, Wrench } from 'lucide-react';
import { buildDashboardAuthUrl } from '@/lib/dashboard-auth-url';
import type { DashboardNote } from '@/lib/dashboard-tasks';
import type { EmailTemplateGuardrail } from '@/lib/email-template-guardrails';
import type { SequenceRepairAction } from '@/lib/email-sequence-repair';
import LeadEmailModal, { type LeadEmailModalLead } from './LeadEmailModal';

type SequenceRepairCardProps = {
  adminKey: string;
  lead: LeadEmailModalLead;
  initialNotes: DashboardNote[];
};

type GuardrailResponse = { guardrail?: EmailTemplateGuardrail };
type RepairResponse = { guardrail?: EmailTemplateGuardrail; note?: DashboardNote };

async function requestJson<T>(url: string, method: string, payload?: Record<string, unknown>) {
  const response = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

export default function SequenceRepairCard({ adminKey, lead, initialNotes }: SequenceRepairCardProps) {
  const router = useRouter();
  const [guardrail, setGuardrail] = useState<EmailTemplateGuardrail | null>(null);
  const [notes, setNotes] = useState(initialNotes);
  const [expanded, setExpanded] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [repairState, setRepairState] = useState<SequenceRepairAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!adminKey || !lead.id) return;

    let cancelled = false;
    async function loadGuardrail() {
      try {
        const response = await fetch(buildDashboardAuthUrl('/api/email/guardrails', adminKey, { leadId: lead.id }));
        const data = (await response.json().catch(() => ({}))) as GuardrailResponse;
        if (!response.ok || cancelled) return;
        setGuardrail(data.guardrail || null);
      } catch {
        // The email modal and send endpoint repeat the same checks.
      }
    }

    void loadGuardrail();
    return () => {
      cancelled = true;
    };
  }, [adminKey, lead.id]);

  async function repairSequence(action: SequenceRepairAction) {
    if (!adminKey || !lead.id || repairState) return;

    setRepairState(action);
    setError(null);
    setStatusMessage(null);

    try {
      const data = await requestJson<RepairResponse>('/api/email/sequence-repair', 'POST', {
        key: adminKey,
        leadId: lead.id,
        action,
      });
      if (data.guardrail) setGuardrail(data.guardrail);
      if (data.note) setNotes((current) => [data.note as DashboardNote, ...current]);
      setExpanded(false);
      setStatusMessage(action === 'manual' ? 'Manual sequence handling is active.' : 'Sequence repair saved.');
      router.refresh();
    } catch (repairError) {
      setError(repairError instanceof Error ? repairError.message : 'Could not save the sequence repair.');
    } finally {
      setRepairState(null);
    }
  }

  const hasGap = Boolean(guardrail?.sequenceGap.detected);
  const isManual = guardrail?.sequenceRepairStatus === 'manual';

  if (!hasGap && !isManual && !statusMessage) return null;

  return (
    <>
      <section className="mt-6 rounded-[8px] border border-[#F59E0B] bg-[#FFFBEB] p-4 text-[#92400E]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            {statusMessage ? (
              <MailCheck className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                {isManual ? 'Manual sequence' : statusMessage ? 'Sequence repaired' : 'Sequence gap'}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed">
                {statusMessage ||
                  (isManual
                    ? 'Automated sequence suggestions are paused for this lead.'
                    : 'First contact was not logged before the sequence advanced.')}
              </p>
            </div>
          </div>
          {hasGap && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#142334] px-4 text-[12px] font-semibold text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
            >
              <Wrench className="h-4 w-4" />
              Repair sequence
            </button>
          )}
        </div>

        {expanded && hasGap && (
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <button
              type="button"
              onClick={() => setEmailOpen(true)}
              disabled={Boolean(repairState)}
              className="rounded-full bg-[#142334] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#C9AD98] hover:text-[#142334] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send recovery email
            </button>
            <button
              type="button"
              onClick={() => void repairSequence('resolved')}
              disabled={Boolean(repairState)}
              className="rounded-full border border-[#F59E0B]/55 bg-white px-4 py-2.5 text-[12px] font-semibold text-[#92400E] transition hover:border-[#92400E] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Mark resolved
            </button>
            <button
              type="button"
              onClick={() => void repairSequence('manual')}
              disabled={Boolean(repairState)}
              className="rounded-full border border-[#F59E0B]/55 bg-white px-4 py-2.5 text-[12px] font-semibold text-[#92400E] transition hover:border-[#92400E] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Manage manually
            </button>
          </div>
        )}

        {repairState && (
          <p className="mt-3 inline-flex items-center gap-2 text-[12px] font-semibold">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving repair...
          </p>
        )}
        {error && <p className="mt-3 text-[12px] leading-relaxed text-[#A24E37]">{error}</p>}
      </section>

      <LeadEmailModal
        isOpen={emailOpen}
        onClose={() => setEmailOpen(false)}
        lead={lead}
        initialNotes={notes}
        onNoteCreated={(note) => setNotes((current) => [note, ...current])}
      />
    </>
  );
}
