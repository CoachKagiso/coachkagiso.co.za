'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Link2, Loader2, Search, ShieldCheck, ShieldOff } from 'lucide-react';
import { buildDashboardAuthUrl } from '@/lib/dashboard-auth-url';
import { formatDiagnosticContextForPreparation, type DiagnosticContextStatus } from '@/lib/client-diagnostic-context';
import { questions } from '@/lib/career-diagnostic';

type Candidate = {
  id: string;
  firstName: string;
  email: string;
  source: string;
  submittedAt: string;
  archetypeName: string | null;
  answers: Record<string, string>;
  coachingContextConsent: boolean;
  coachingContextConsentAt: string | null;
};

type DiagnosticLink = {
  id: string;
  status: DiagnosticContextStatus;
  matchMethod: 'email' | 'manual';
  consentSource: 'future_form' | 'direct_client' | null;
  consentRecordedAt: string | null;
  diagnostic: Candidate;
};

type Workspace = {
  link: DiagnosticLink | null;
  autoCandidate: Candidate | null;
  candidates: Candidate[];
};

type ResponseBody = {
  workspace?: Workspace;
  error?: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeZone: 'Africa/Johannesburg',
  }).format(date);
}

const statusLabels: Record<DiagnosticContextStatus, string> = {
  pending: 'Pending review',
  included: 'Included in Session Prep',
  excluded: 'Excluded',
  revoked: 'Permission revoked',
};

export default function EarlierDiagnosticContextPanel({
  adminKey,
  paymentId,
}: {
  adminKey: string;
  paymentId: string;
}) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [directConsentConfirmed, setDirectConsentConfirmed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(
          buildDashboardAuthUrl(`/api/clients/${encodeURIComponent(paymentId)}/diagnostic-context`, adminKey),
          { signal: controller.signal },
        );
        const data = await response.json().catch(() => null) as ResponseBody | null;
        if (!response.ok || !data?.workspace) throw new Error(data?.error || 'Could not load earlier diagnostic context.');
        setWorkspace(data.workspace);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setError(caught instanceof Error ? caught.message : 'Could not load earlier diagnostic context.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [adminKey, paymentId]);

  const activeCandidate = workspace?.link?.diagnostic || workspace?.autoCandidate || null;
  const status = workspace?.link?.status || (activeCandidate ? 'pending' : null);
  const formattedAnswers = useMemo(
    () => activeCandidate ? formatDiagnosticContextForPreparation(activeCandidate, questions).answers : [],
    [activeCandidate],
  );
  const hasRecordedConsent = Boolean(
    workspace?.link?.consentRecordedAt
    || (activeCandidate?.coachingContextConsent && activeCandidate.coachingContextConsentAt),
  );
  const permissionWasRevoked = status === 'revoked';
  const hasUsableConsent = !permissionWasRevoked && hasRecordedConsent;

  async function updateLink(
    candidate: Candidate,
    nextStatus: DiagnosticContextStatus,
    matchMethod: 'email' | 'manual',
  ) {
    if (isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(paymentId)}/diagnostic-context`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          key: adminKey,
          diagnosticSubmissionId: candidate.id,
          status: nextStatus,
          matchMethod,
          clientConsentConfirmed: directConsentConfirmed,
        }),
      });
      const data = await response.json().catch(() => null) as ResponseBody | null;
      if (!response.ok || !data?.workspace) throw new Error(data?.error || 'Could not update diagnostic context.');
      setWorkspace(data.workspace);
      setDirectConsentConfirmed(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update diagnostic context.');
    } finally {
      setIsSaving(false);
    }
  }

  async function search() {
    const query = searchQuery.trim();
    if (!query || isSearching) return;
    setIsSearching(true);
    setError('');
    try {
      const url = buildDashboardAuthUrl(
        `/api/clients/${encodeURIComponent(paymentId)}/diagnostic-context?query=${encodeURIComponent(query)}`,
        adminKey,
      );
      const response = await fetch(url);
      const data = await response.json().catch(() => null) as ResponseBody | null;
      if (!response.ok || !data?.workspace) throw new Error(data?.error || 'Could not search diagnostic submissions.');
      setWorkspace((current) => data.workspace ? {
        ...data.workspace,
        link: current?.link || data.workspace.link,
        autoCandidate: current?.autoCandidate || data.workspace.autoCandidate,
      } : current);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not search diagnostic submissions.');
    } finally {
      setIsSearching(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mt-4 flex min-h-20 items-center gap-2 rounded-[8px] border border-[#E4D8CB] bg-[#FCFBF8] p-4 text-[12px] text-[#142334]/60" aria-busy="true">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking for earlier diagnostic context...
      </div>
    );
  }

  return (
    <section className="mt-4 rounded-[8px] border border-[#D8C8BB] bg-[#FCFBF8] p-4" aria-labelledby="earlier-diagnostic-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">Optional source</p>
          <h3 id="earlier-diagnostic-title" className="mt-1 text-[14px] font-bold text-[#142334]">Earlier diagnostic context</h3>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-[#142334]/62">
            Kept separate from formal intake. Only an explicitly included, consented record can enter Session Preparation.
          </p>
          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-[#8C7466]">
            Saving as pending is only a bookmark for later review. It does not affect Client Context readiness or include these answers.
          </p>
        </div>
        {status && (
          <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] ${
            status === 'included' ? 'bg-[#E5F2E7] text-[#35613D]' : 'bg-[#F3E9DF] text-[#7B5E4C]'
          }`}>
            {statusLabels[status]}
          </span>
        )}
      </div>

      {error && <p className="mt-3 rounded-[7px] border border-[#F4B6AA] bg-[#FFF5F2] px-3 py-2 text-[12px] text-[#7A2F22]" role="alert">{error}</p>}

      {activeCandidate ? (
        <div className="mt-4 rounded-[8px] border border-[#E4D8CB] bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-bold text-[#142334]">{activeCandidate.archetypeName || 'Career Diagnostic'}</p>
              <p className="mt-1 text-[11px] text-[#142334]/55">
                Career Diagnostic · submitted {formatDate(activeCandidate.submittedAt)} · matched by {workspace?.link?.matchMethod || 'email'}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#142334]/70">
              {hasUsableConsent ? <ShieldCheck className="h-4 w-4 text-[#4D7C55]" /> : <ShieldOff className="h-4 w-4 text-[#A7604F]" />}
              {permissionWasRevoked ? 'Permission was revoked' : hasUsableConsent ? 'Client permission recorded' : 'Client permission required'}
            </span>
          </div>

          <details className="mt-3 text-[12px] text-[#142334]/72">
            <summary className="cursor-pointer font-semibold text-[#142334]">Review {formattedAnswers.length} original answers</summary>
            <div className="mt-3 grid gap-2">
              {formattedAnswers.map((item) => (
                <div key={item.question} className="rounded-[7px] bg-[#F7F1EC] p-3">
                  <p className="font-semibold">{item.question}</p>
                  <p className="mt-1 leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </details>

          {!hasUsableConsent && (
            <label className="mt-4 flex items-start gap-2 rounded-[7px] border border-[#E4D8CB] bg-[#FFF9F5] p-3 text-[12px] leading-relaxed text-[#142334]/75">
              <input
                type="checkbox"
                checked={directConsentConfirmed}
                onChange={(event) => setDirectConsentConfirmed(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#142334]"
              />
              {permissionWasRevoked
                ? 'The client renewed permission to use these answers for session preparation.'
                : 'I asked this client directly and received permission to use these answers for session preparation.'}
            </label>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {status !== 'included' && (
              <button
                type="button"
                onClick={() => void updateLink(
                  activeCandidate,
                  'included',
                  workspace?.link?.matchMethod || 'email',
                )}
                disabled={isSaving || (!hasUsableConsent && !directConsentConfirmed)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-[7px] bg-[#142334] px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {permissionWasRevoked ? 'Record renewed permission and include' : 'Include in Session Prep'}
              </button>
            )}
            {status === 'included' && (
              <>
                <button type="button" onClick={() => void updateLink(activeCandidate, 'excluded', workspace?.link?.matchMethod || 'email')} disabled={isSaving} className="min-h-10 rounded-[7px] border border-[#D8C8BB] px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#142334]">Exclude for now</button>
                <button type="button" onClick={() => void updateLink(activeCandidate, 'revoked', workspace?.link?.matchMethod || 'email')} disabled={isSaving} className="min-h-10 rounded-[7px] border border-[#D99B8E] px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A3D2F]">Client revoked permission</button>
              </>
            )}
            {!workspace?.link && (
              <button type="button" onClick={() => void updateLink(activeCandidate, 'pending', 'email')} disabled={isSaving} className="min-h-10 rounded-[7px] border border-[#D8C8BB] px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#142334]">Save as pending</button>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-[12px] leading-relaxed text-[#142334]/62">No diagnostic matched the booking email. Search below if the client used another address.</p>
      )}

      <details className="mt-4 border-t border-[#E4D8CB] pt-4">
        <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.1em] text-[#142334]">Link a different diagnostic</summary>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="diagnostic-search">Search by client name or exact email</label>
          <input id="diagnostic-search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by name or exact email" className="min-h-10 flex-1 rounded-[7px] border border-[#D8C8BB] bg-white px-3 text-[13px] outline-none focus:border-[#142334]" />
          <button type="button" onClick={() => void search()} disabled={isSearching || !searchQuery.trim()} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[7px] bg-[#142334] px-4 text-[10px] font-bold uppercase tracking-[0.1em] text-white disabled:opacity-40">
            {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />} Search
          </button>
        </div>
        {workspace?.candidates.length ? (
          <div className="mt-3 grid gap-2">
            {workspace.candidates.map((candidate) => (
              <div key={candidate.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[7px] border border-[#E4D8CB] bg-white p-3">
                <div>
                  <p className="text-[12px] font-bold text-[#142334]">{candidate.firstName} · {candidate.archetypeName || 'Career Diagnostic'}</p>
                  <p className="mt-1 text-[11px] text-[#142334]/55">{candidate.email} · {formatDate(candidate.submittedAt)}</p>
                </div>
                <button type="button" onClick={() => void updateLink(candidate, 'pending', 'manual')} disabled={isSaving} className="inline-flex min-h-9 items-center gap-1.5 rounded-[7px] border border-[#D8C8BB] px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#142334]">
                  <Link2 className="h-3.5 w-3.5" /> Link for review
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </details>
    </section>
  );
}
