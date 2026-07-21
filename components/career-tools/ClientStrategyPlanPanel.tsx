'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import ClientStrategyPlanReview from '@/components/career-tools/ClientStrategyPlanReview';
import ClientStrategyFollowUpPanel from '@/components/career-tools/ClientStrategyFollowUpPanel';
import { buildDashboardAuthUrl } from '@/lib/dashboard-auth-url';
import type { ClientStrategyServiceSlug, ClientStrategyWorkspaceRecord } from '@/lib/client-strategy';
import {
  getClientStrategyPlanDefinition,
  type ClientStrategyPlanContent,
  type ClientStrategyPlanRecord,
} from '@/lib/client-strategy-plan';

type PlanResponse = {
  plan?: ClientStrategyPlanRecord;
  plans?: ClientStrategyPlanRecord[];
  error?: string;
};

async function requestPlanVersions(adminKey: string, paymentId: string) {
  const response = await fetch(
    buildDashboardAuthUrl(`/api/clients/${encodeURIComponent(paymentId)}/strategy-plan`, adminKey),
  );
  const data = await response.json().catch(() => null) as PlanResponse | null;
  if (!response.ok) throw new Error(data?.error || 'Could not load the plan versions.');
  return data?.plans || [];
}

export default function ClientStrategyPlanPanel({
  adminKey,
  paymentId,
  serviceSlug,
  workspace,
  debriefDirty,
  isTest,
}: {
  adminKey: string;
  paymentId: string;
  serviceSlug: ClientStrategyServiceSlug;
  workspace: ClientStrategyWorkspaceRecord | null;
  debriefDirty: boolean;
  isTest: boolean;
}) {
  const [plans, setPlans] = useState<ClientStrategyPlanRecord[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [editedContent, setEditedContent] = useState<ClientStrategyPlanContent | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || plans[0] || null,
    [plans, selectedPlanId],
  );
  const definition = getClientStrategyPlanDefinition(serviceSlug);
  const isDirty = Boolean(editedContent) && JSON.stringify(editedContent) !== savedSnapshot;
  const canGenerate = Boolean(workspace) && !debriefDirty && !isGenerating;

  const selectLoadedPlan = useCallback((plan: ClientStrategyPlanRecord | null) => {
    setSelectedPlanId(plan?.id || '');
    setEditedContent(plan?.editedContent || null);
    setSavedSnapshot(plan ? JSON.stringify(plan.editedContent) : '');
  }, []);

  const loadPlans = useCallback(async (preferredPlanId = '') => {
    setError('');
    try {
      const loadedPlans = await requestPlanVersions(adminKey, paymentId);
      setPlans(loadedPlans);
      selectLoadedPlan(loadedPlans.find((plan) => plan.id === preferredPlanId) || loadedPlans[0] || null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load the plan versions.');
    }
  }, [adminKey, paymentId, selectLoadedPlan]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialPlans() {
      try {
        const loadedPlans = await requestPlanVersions(adminKey, paymentId);
        if (cancelled) return;
        setPlans(loadedPlans);
        selectLoadedPlan(loadedPlans[0] || null);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Could not load the plan versions.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadInitialPlans();
    return () => { cancelled = true; };
  }, [adminKey, paymentId, selectLoadedPlan]);

  function choosePlan(planId: string) {
    const plan = plans.find((item) => item.id === planId) || null;
    selectLoadedPlan(plan);
    setError('');
    setMessage('');
  }

  async function generatePlan() {
    if (!canGenerate) return;
    if (plans.some((plan) => plan.status === 'draft') && !window.confirm('Generate a new version and supersede the current draft?')) return;

    setIsGenerating(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(paymentId)}/strategy-plan`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: adminKey }),
      });
      const data = await response.json().catch(() => null) as PlanResponse | null;
      if (!response.ok || !data?.plan) throw new Error(data?.error || 'Could not generate the plan draft.');
      await loadPlans(data.plan.id);
      setMessage(`Version ${data.plan.version} generated for review.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not generate the plan draft.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function savePlan() {
    if (!selectedPlan || !editedContent || selectedPlan.status !== 'draft' || !isDirty || isSaving) return;
    setIsSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(
        `/api/clients/${encodeURIComponent(paymentId)}/strategy-plan/${encodeURIComponent(selectedPlan.id)}`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key: adminKey, content: editedContent }),
        },
      );
      const data = await response.json().catch(() => null) as PlanResponse | null;
      if (!response.ok || !data?.plan) throw new Error(data?.error || 'Could not save the plan changes.');
      setPlans((current) => current.map((plan) => (plan.id === data.plan?.id ? data.plan : plan)));
      selectLoadedPlan(data.plan);
      setMessage(`Version ${data.plan.version} changes saved privately.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the plan changes.');
    } finally {
      setIsSaving(false);
    }
  }

  async function approvePlan() {
    if (!selectedPlan || selectedPlan.status !== 'draft' || isDirty || isApproving) return;
    if (!window.confirm('Approve and lock this plan version? It cannot be edited after approval.')) return;

    setIsApproving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(
        `/api/clients/${encodeURIComponent(paymentId)}/strategy-plan/${encodeURIComponent(selectedPlan.id)}/approve`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key: adminKey, confirm: true }),
        },
      );
      const data = await response.json().catch(() => null) as PlanResponse | null;
      if (!response.ok || !data?.plan) throw new Error(data?.error || 'Could not approve the plan.');
      await loadPlans(data.plan.id);
      setMessage(`Version ${data.plan.version} approved and locked.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not approve the plan.');
    } finally {
      setIsApproving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-[8px] bg-white p-5" aria-busy="true" aria-label="Loading personalized plan">
        <div className="h-6 w-48 animate-pulse rounded bg-[#E4D8CB]" />
        <div className="mt-5 h-48 animate-pulse rounded-[8px] bg-[#F5F3EE]" />
      </div>
    );
  }

  return (
    <section className="rounded-[8px] bg-white p-5" aria-labelledby="personalized-plan-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8C7466]">Personalized support plan</p>
          <h3 id="personalized-plan-title" className="mt-2 font-serif text-[30px] leading-tight text-[#142334]">Draft, review, then approve</h3>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[#142334]/62">
            AI creates a private {definition.label} from the saved sources. Kagiso remains responsible for every client-facing recommendation.
          </p>
        </div>
        <button
          type="button"
          disabled={!canGenerate}
          onClick={() => void generatePlan()}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[#C9AD98] px-5 text-[11px] font-bold uppercase tracking-[0.13em] text-[#142334] transition hover:bg-[#142334] hover:text-white disabled:cursor-not-allowed disabled:bg-[#D8C8BB] disabled:text-[#142334]/45"
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isGenerating ? 'Generating...' : plans.length ? 'Regenerate draft' : `Generate ${definition.durationDays}-day draft`}
        </button>
      </div>

      {!workspace && (
        <p role="status" className="mt-5 rounded-[8px] border border-[#D8C8BB] bg-[#F8F6F4] px-4 py-3 text-[13px] text-[#6B6B6B]">
          Save the session debrief before generating the first plan.
        </p>
      )}
      {workspace && debriefDirty && (
        <p role="status" className="mt-5 rounded-[8px] border border-[#D8C8BB] bg-[#F8F6F4] px-4 py-3 text-[13px] text-[#6B6B6B]">
          Save the latest debrief changes before generating another version.
        </p>
      )}

      {selectedPlan && editedContent ? (
        <>
          <ClientStrategyPlanReview
            plans={plans}
            selectedPlan={selectedPlan}
            editedContent={editedContent}
            isDirty={isDirty}
            isSaving={isSaving}
            isApproving={isApproving}
            error={error}
            message={message}
            onChoosePlan={choosePlan}
            onChange={(content) => { setEditedContent(content); setMessage(''); }}
            onSave={() => void savePlan()}
            onApprove={() => void approvePlan()}
          />
          {['approved', 'sent'].includes(selectedPlan.status) && (
            <ClientStrategyFollowUpPanel
              adminKey={adminKey}
              paymentId={paymentId}
              plan={selectedPlan}
              isTest={isTest}
              onDelivered={() => { void loadPlans(selectedPlan.id); }}
            />
          )}
        </>
      ) : (
        <div className="mt-5 rounded-[8px] border border-dashed border-[#D8C8BB] bg-[#F8F6F4] p-6 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-[#C9AD98]" />
          <p className="mt-3 font-serif text-[24px] text-[#142334]">No personalized plan yet.</p>
          <p className="mx-auto mt-2 max-w-xl text-[12px] leading-relaxed text-[#6B6B6B]">
            Generating sends the redacted intake, saved debrief, and readable CV text to the configured AI provider. The result stays private until Kagiso approves it.
          </p>
          {error && <p role="alert" className="mt-4 text-[13px] font-semibold text-[#7A2F22]">{error}</p>}
        </div>
      )}
    </section>
  );
}
