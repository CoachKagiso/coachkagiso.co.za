'use client';

import { useEffect, useState } from 'react';
import { Check, CheckCircle2, ClipboardList, FileSearch, Loader2, Sparkles, TriangleAlert, UserRound } from 'lucide-react';
import { buildDashboardAuthUrl } from '@/lib/dashboard-auth-url';
import type { ClientSessionPreparationRecord } from '@/lib/client-session-preparation';
import EarlierDiagnosticContextPanel from '@/components/career-tools/EarlierDiagnosticContextPanel';
import SessionPreparationContent from '@/components/career-tools/SessionPreparationContent';

type Readiness = { hasIntake: boolean; hasMeaningfulContext: boolean; contextVerified: boolean; hasCvAnalysis: boolean; canGenerate: boolean };
type SessionPreparationResponse = {
  readiness?: Readiness;
  latestPreparation?: ClientSessionPreparationRecord | null;
  preparation?: ClientSessionPreparationRecord;
  error?: string;
};
type IntakeVerificationResponse = {
  intake?: { contextVerified: boolean };
  error?: string;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Johannesburg',
  }).format(date);
}

function ReadinessRow({
  ready,
  title,
  detail,
  action,
}: {
  ready: boolean;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`rounded-[8px] border p-3 ${ready ? 'border-[#A8C8AD] bg-[#F1F8F2]' : 'border-[#E4D8CB] bg-[#FFF9F5]'}`}>
      <div className="flex items-start gap-2">
        {ready ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#4D7C55]" /> : <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#A7604F]" />}
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-[#142334]">{title}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#142334]/62">{detail}</p>
          {action && <div className="mt-2">{action}</div>}
        </div>
      </div>
    </div>
  );
}

export default function SessionPreparationPanel({
  adminKey,
  paymentId,
  clientName,
  onOpenClientContext,
  onOpenCvAnalyzer,
}: {
  adminKey: string;
  paymentId: string;
  clientName: string;
  onOpenClientContext: () => void;
  onOpenCvAnalyzer: () => void;
}) {
  const [readiness, setReadiness] = useState<Readiness>({ hasIntake: false, hasMeaningfulContext: false, contextVerified: false, hasCvAnalysis: false, canGenerate: false });
  const [preparation, setPreparation] = useState<ClientSessionPreparationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifyingContext, setIsVerifyingContext] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function loadPreparation() {
      try {
        const response = await fetch(
          buildDashboardAuthUrl(`/api/clients/${encodeURIComponent(paymentId)}/session-preparation`, adminKey),
          { signal: controller.signal },
        );
        const data = await response.json().catch(() => null) as SessionPreparationResponse | null;
        if (!response.ok) throw new Error(data?.error || 'Could not load session preparation.');
        setReadiness(data?.readiness || { hasIntake: false, hasMeaningfulContext: false, contextVerified: false, hasCvAnalysis: false, canGenerate: false });
        setPreparation(data?.latestPreparation || null);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setError(caught instanceof Error ? caught.message : 'Could not load session preparation.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void loadPreparation();
    return () => controller.abort();
  }, [adminKey, paymentId]);

  async function generatePreparation() {
    if (!readiness.canGenerate || isGenerating) return;
    setIsGenerating(true);
    setError('');
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(paymentId)}/session-preparation`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: adminKey }),
      });
      const data = await response.json().catch(() => null) as SessionPreparationResponse | null;
      if (!response.ok || !data?.preparation) throw new Error(data?.error || 'Could not generate the session preparation.');
      setPreparation(data.preparation);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not generate the session preparation.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function verifyContext() {
    if (!readiness.hasMeaningfulContext || readiness.contextVerified || isVerifyingContext) return;
    setIsVerifyingContext(true);
    setError('');
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(paymentId)}/intake`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: adminKey, values: { contextVerified: true } }),
      });
      const data = await response.json().catch(() => null) as IntakeVerificationResponse | null;
      if (!response.ok || !data?.intake?.contextVerified) {
        throw new Error(data?.error || 'Could not verify the saved client context.');
      }
      setReadiness((current) => ({
        ...current,
        contextVerified: true,
        hasIntake: current.hasMeaningfulContext,
        canGenerate: current.hasMeaningfulContext && current.hasCvAnalysis,
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not verify the saved client context.');
    } finally {
      setIsVerifyingContext(false);
    }
  }

  return (
    <section className="grid gap-4">
      <div className="rounded-[8px] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8C7466]">Coaching workflow</p>
            <h2 className="mt-2 font-serif text-[32px] leading-tight text-[#142334]">Session Preparation</h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[#142334]/64">Use the saved CV analysis and live intake to prepare a grounded conversation, not a script.</p>
          </div>
          {preparation && <span className="rounded-[8px] bg-[#F7F1EC] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">Version {preparation.version} · {formatDateTime(preparation.createdAt)}</span>}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <ReadinessRow
            ready={readiness.hasIntake}
            title="Client context"
            detail={readiness.hasIntake
              ? 'Meaningful client context is saved and verified. This can be booking answers or Additional Context copied from a client conversation.'
              : readiness.hasMeaningfulContext
                ? 'Meaningful context is saved. Confirm that you reviewed it before preparing the session.'
                : 'Only placeholder answers were submitted. Add the emailed or LinkedIn conversation under Additional Context.'}
            action={readiness.hasMeaningfulContext && !readiness.contextVerified
              ? (
                  <button type="button" onClick={() => void verifyContext()} disabled={isVerifyingContext} className="inline-flex min-h-9 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#142334] underline underline-offset-4 disabled:opacity-45">
                    {isVerifyingContext ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    {isVerifyingContext ? 'Verifying...' : 'Mark context verified'}
                  </button>
                )
              : !readiness.hasMeaningfulContext
                ? <button type="button" onClick={onOpenClientContext} className="inline-flex min-h-9 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#142334] underline underline-offset-4"><UserRound className="h-3.5 w-3.5" />Open Client Context</button>
                : undefined}
          />
          <ReadinessRow
            ready={readiness.hasCvAnalysis}
            title="CV analysis"
            detail={readiness.hasCvAnalysis ? 'A saved CV positioning report is ready.' : 'Analyze and save the client’s CV before generating preparation.'}
            action={!readiness.hasCvAnalysis ? <button type="button" onClick={onOpenCvAnalyzer} className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#142334] underline underline-offset-4"><FileSearch className="h-3.5 w-3.5" />Open CV Analyzer</button> : undefined}
          />
        </div>
        <EarlierDiagnosticContextPanel adminKey={adminKey} paymentId={paymentId} />

        {error && <p className="mt-4 rounded-[8px] border border-[#F4B6AA] bg-[#FFF5F2] px-3 py-2 text-[13px] leading-relaxed text-[#7A2F22]" role="alert">{error}</p>}
        <button type="button" onClick={() => void generatePreparation()} disabled={!readiness.canGenerate || isGenerating || isLoading} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] bg-[#142334] px-5 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334] disabled:cursor-not-allowed disabled:bg-[#D8C8BB] disabled:text-[#142334]/45">
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isGenerating ? 'Preparing session...' : preparation ? 'Generate new preparation' : 'Prepare session'}
        </button>
        {!readiness.canGenerate && !isLoading && <p className="mt-2 text-[12px] leading-relaxed text-[#8C7466]">Session Preparation becomes available once both readiness items are complete. Nothing is generated automatically.</p>}
      </div>

      {isLoading ? (
        <div className="grid min-h-[300px] place-items-center rounded-[8px] border border-[#E4D8CB] bg-white p-6 text-center" aria-busy="true">
          <Loader2 className="h-6 w-6 animate-spin text-[#C9AD98]" />
        </div>
      ) : !preparation ? (
        <div className="grid min-h-[300px] place-items-center rounded-[8px] border border-dashed border-[#D8C8BB] bg-white p-6 text-center">
          <div className="max-w-md"><ClipboardList className="mx-auto h-9 w-9 text-[#C9AD98]" /><p className="mt-4 font-serif text-[26px] text-[#142334]">Prepare the conversation before the call.</p><p className="mt-2 text-[13px] leading-relaxed text-[#6B6B6B]">The draft will give Kagiso a structure, questions, listening cues, and close-out prompts based only on saved client context.</p></div>
        </div>
      ) : (
        <SessionPreparationContent
          key={preparation.id}
          preparation={preparation}
          adminKey={adminKey}
          clientName={clientName}
          onPreparationUpdated={setPreparation}
        />
      )}
    </section>
  );
}
