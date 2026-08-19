'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import ClientStrategyPlanReview from '@/components/career-tools/ClientStrategyPlanReview';
import ClientStrategyFollowUpPanel from '@/components/career-tools/ClientStrategyFollowUpPanel';
import ClientStrategyPlanExportDialog from '@/components/career-tools/ClientStrategyPlanExportDialog';
import { buildDashboardAuthUrl } from '@/lib/dashboard-auth-url';
import type { ClientStrategyServiceSlug, ClientStrategyWorkspaceRecord } from '@/lib/client-strategy';
import {
  getClientStrategyPlanDefinition,
  type ClientStrategyPlanContent,
  type ClientStrategyPlanRecord,
  type ClientStrategyPlanSection,
} from '@/lib/client-strategy-plan';

type PlanResponse = {
  plan?: ClientStrategyPlanRecord;
  plans?: ClientStrategyPlanRecord[];
  section?: ClientStrategyPlanSection;
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
  clientName,
}: {
  adminKey: string;
  paymentId: string;
  serviceSlug: ClientStrategyServiceSlug;
  workspace: ClientStrategyWorkspaceRecord | null;
  debriefDirty: boolean;
  isTest: boolean;
  clientName: string;
}) {
  const [plans, setPlans] = useState<ClientStrategyPlanRecord[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [editedContent, setEditedContent] = useState<ClientStrategyPlanContent | null>(null);
  const [activeSection, setActiveSection] = useState<ClientStrategyPlanSection>('session_summary');
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [generatingSection, setGeneratingSection] = useState<ClientStrategyPlanSection | 'horizon_extension' | 'all' | ''>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showExport, setShowExport] = useState(false);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || plans[0] || null,
    [plans, selectedPlanId],
  );
  const definition = getClientStrategyPlanDefinition(serviceSlug);
  const isDirty = Boolean(editedContent) && JSON.stringify(editedContent) !== savedSnapshot;
  const canGenerate = Boolean(workspace) && !debriefDirty && !generatingSection && !isDirty;
  const requiredSections: ClientStrategyPlanSection[] = serviceSlug === 'glow-up-vip'
    ? ['session_summary', 'development_plan', 'interview_prep']
    : ['session_summary', 'development_plan'];

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

  async function requestGeneratedSection(
    section: ClientStrategyPlanSection,
    planId: string,
  ) {
    const response = await fetch(`/api/clients/${encodeURIComponent(paymentId)}/strategy-plan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: adminKey, section, planId: planId || undefined }),
    });
    const data = await response.json().catch(() => null) as PlanResponse | null;
    if (!response.ok || !data?.plan) {
      throw new Error(data?.error || 'Could not generate this plan section.');
    }
    return data.plan;
  }

  async function generateSection(section: ClientStrategyPlanSection) {
    if (!canGenerate) return;
    const existingState = section === 'session_summary'
      ? selectedPlan?.editedContent.sectionStatus.sessionSummary
      : section === 'development_plan'
        ? selectedPlan?.editedContent.sectionStatus.developmentPlan
        : selectedPlan?.editedContent.sectionStatus.interviewPrep;
    if (
      existingState === 'generated'
      && !window.confirm(`Regenerate this section? Every other section will stay unchanged. Manual edits inside this section will be replaced.`)
    ) return;

    setGeneratingSection(section);
    setActiveSection(section);
    setError('');
    setMessage('');
    try {
      const plan = await requestGeneratedSection(section, selectedPlan?.id || '');
      await loadPlans(plan.id);
      setMessage(`${section === 'session_summary' ? 'Session Summary & Agreements' : section === 'development_plan' ? 'Career Development Plan' : 'Interview Preparation'} generated. Other sections were preserved.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not generate this plan section.');
    } finally {
      setGeneratingSection('');
    }
  }

  async function generateAllSections() {
    if (!canGenerate) return;
    if (
      selectedPlan
      && !window.confirm('Generate every section in sequence? Each successful section will be preserved even if a later section fails.')
    ) return;

    setGeneratingSection('all');
    setError('');
    setMessage('');
    let workingPlanId = selectedPlan?.id || '';
    const completed: string[] = [];
    try {
      for (const section of requiredSections) {
        setActiveSection(section);
        const plan = await requestGeneratedSection(section, workingPlanId);
        workingPlanId = plan.id;
        completed.push(section);
      }
      await loadPlans(workingPlanId);
      setMessage(`All ${requiredSections.length} required sections generated for review.`);
    } catch (caught) {
      if (workingPlanId) await loadPlans(workingPlanId);
      const prefix = completed.length
        ? `${completed.length} section${completed.length === 1 ? '' : 's'} completed and preserved. `
        : '';
      setError(`${prefix}${caught instanceof Error ? caught.message : 'A plan section could not be generated.'}`);
    } finally {
      setGeneratingSection('');
    }
  }

  async function extendPlanHorizon(targetHorizon: 60 | 90) {
    if (
      !canGenerate
      || !selectedPlan
      || selectedPlan.status !== 'draft'
      || selectedPlan.editedContent.sectionStatus.developmentPlan !== 'generated'
    ) return;

    setGeneratingSection('horizon_extension');
    setActiveSection('development_plan');
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(paymentId)}/strategy-plan`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          key: adminKey,
          section: 'development_plan',
          mode: 'extend_horizon',
          targetHorizon,
          planId: selectedPlan.id,
        }),
      });
      const data = await response.json().catch(() => null) as PlanResponse | null;
      if (!response.ok || !data?.plan) {
        throw new Error(data?.error || `Could not extend the plan to ${targetHorizon} days.`);
      }
      await loadPlans(data.plan.id);
      setMessage(
        `The plan now reaches Day ${targetHorizon}. Earlier milestones and plan sections were preserved for review.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : `Could not extend the plan to ${targetHorizon} days.`,
      );
    } finally {
      setGeneratingSection('');
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

  async function deletePlan() {
    if (!selectedPlan) return;
    if (!window.confirm(`Permanently delete Version ${selectedPlan.version}? This removes the draft from the database and cannot be undone.`)) return;
    setError('');
    try {
      const response = await fetch(
        `/api/clients/${encodeURIComponent(paymentId)}/strategy-plan/${encodeURIComponent(selectedPlan.id)}`,
        {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key: adminKey }),
        },
      );
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || 'Could not delete this draft.');
      await loadPlans();
      setMessage(`Version ${selectedPlan.version} deleted.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete this draft.');
    }
  }

  async function resetDrafts() {
    if (!window.confirm('Reset all disposable plan drafts? Approved, sent, and previously approved history will be kept.')) return;
    const phrase = `RESET ${clientName.toUpperCase()} PLAN`;
    if (window.prompt(`Type ${phrase} to confirm.`) !== phrase) {
      setError('Reset cancelled because the confirmation phrase did not match.');
      return;
    }
    setError('');
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(paymentId)}/strategy-plan`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: adminKey, confirmation: phrase, expectedConfirmation: phrase }),
      });
      const data = await response.json().catch(() => null) as { deletedCount?: number; error?: string } | null;
      if (!response.ok) throw new Error(data?.error || 'Could not reset the plan drafts.');
      await loadPlans();
      setMessage(`${data?.deletedCount || 0} disposable draft version${data?.deletedCount === 1 ? '' : 's'} removed. Approved history was preserved.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not reset the plan drafts.');
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-[8px] bg-white p-5" aria-busy="true" aria-label="Loading career development plan">
        <div className="h-6 w-48 animate-pulse rounded bg-[#E4D8CB]" />
        <div className="mt-5 h-48 animate-pulse rounded-[8px] bg-[#F5F3EE]" />
      </div>
    );
  }

  return (
    <section className="rounded-[8px] bg-white p-5 md:p-7" aria-labelledby="career-development-plan-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8C7466]">Career development plan · {definition.openingPeriodLabel}</p>
          <h3 id="career-development-plan-title" className="mt-2 font-serif text-[34px] leading-tight text-[#142334]">Shape the session into a useful path forward</h3>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-[#142334]/66">
            Generate a private draft from the reviewed debrief, intake, and CV evidence. Edit every section before approval and delivery.
          </p>
        </div>
        <button
          type="button"
          disabled={!canGenerate}
          onClick={() => void generateAllSections()}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[#C9AD98] px-5 text-[11px] font-bold uppercase tracking-[0.13em] text-[#142334] transition hover:bg-[#142334] hover:text-white disabled:cursor-not-allowed disabled:bg-[#D8C8BB] disabled:text-[#142334]/45"
        >
          {generatingSection === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generatingSection === 'all' ? 'Generating sections...' : 'Generate all sections'}
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
            generatingSection={generatingSection}
            activeSection={activeSection}
            error={error}
            message={message}
            onChoosePlan={choosePlan}
            onChooseSection={setActiveSection}
            onGenerateSection={(section) => void generateSection(section)}
            onExtendHorizon={(targetHorizon) => void extendPlanHorizon(targetHorizon)}
            onChange={(content) => { setEditedContent(content); setMessage(''); }}
            onSave={() => void savePlan()}
            onApprove={() => void approvePlan()}
            onExport={() => setShowExport(true)}
            onDelete={() => void deletePlan()}
            onReset={() => void resetDrafts()}
          />
          {showExport && (
            <ClientStrategyPlanExportDialog
              adminKey={adminKey}
              clientName={clientName}
              plan={selectedPlan}
              onClose={() => setShowExport(false)}
            />
          )}
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
            Generate one section at a time, or run them in sequence. Each successful section is preserved and stays private until Kagiso approves the complete document.
          </p>
          <div className="mx-auto mt-5 grid max-w-3xl gap-3 md:grid-cols-2">
            {requiredSections.map((section) => (
              <button
                key={section}
                type="button"
                disabled={!canGenerate}
                onClick={() => void generateSection(section)}
                className="flex min-h-14 items-center justify-between gap-3 rounded-[8px] border border-[#D8C8BB] bg-white px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-[#142334] transition hover:border-[#142334] hover:bg-[#F3EDE7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {section === 'session_summary'
                  ? 'Session Summary & Agreements'
                  : section === 'development_plan'
                    ? 'Career Development Plan'
                    : 'Interview Preparation'}
                {generatingSection === section
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Sparkles className="h-4 w-4 text-[#8C7466]" />}
              </button>
            ))}
          </div>
          {error && <p role="alert" className="mt-4 text-[13px] font-semibold text-[#7A2F22]">{error}</p>}
        </div>
      )}
    </section>
  );
}
