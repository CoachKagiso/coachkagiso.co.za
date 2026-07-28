import { CheckCircle2, History, Loader2, Save, ShieldCheck } from 'lucide-react';
import FilterDropdown from '@/components/FilterDropdown';
import PlanContentEditor from '@/components/career-tools/PlanContentEditor';
import type { ClientStrategyPlanContent, ClientStrategyPlanRecord } from '@/lib/client-strategy-plan';

const STATUS_LABELS = {
  draft: 'Draft',
  approved: 'Approved',
  sent: 'Sent',
  superseded: 'Superseded',
} as const;

export default function ClientStrategyPlanReview({
  plans,
  selectedPlan,
  editedContent,
  isDirty,
  isSaving,
  isApproving,
  error,
  message,
  onChoosePlan,
  onChange,
  onSave,
  onApprove,
}: {
  plans: ClientStrategyPlanRecord[];
  selectedPlan: ClientStrategyPlanRecord;
  editedContent: ClientStrategyPlanContent;
  isDirty: boolean;
  isSaving: boolean;
  isApproving: boolean;
  error: string;
  message: string;
  onChoosePlan: (planId: string) => void;
  onChange: (content: ClientStrategyPlanContent) => void;
  onSave: () => void;
  onApprove: () => void;
}) {
  const canEdit = selectedPlan.status === 'draft';

  return (
    <div className="mt-5 grid gap-5">
      <div className="flex flex-col gap-3 rounded-[8px] bg-[#F5F3EE] p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <History className="h-4 w-4 text-[#8C7466]" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">Plan history</p>
            <p className="mt-1 text-[12px] text-[#6B6B6B]">Generated drafts remain available after regeneration.</p>
          </div>
        </div>
        <div className="w-full sm:w-64">
          <FilterDropdown
            name="strategyPlanVersion"
            value={selectedPlan.id}
            onChange={onChoosePlan}
            ariaLabel="Choose a strategy plan version"
            options={plans.map((plan) => ({
              value: plan.id,
              label: `Version ${plan.version} / ${STATUS_LABELS[plan.status]}`,
            }))}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="rounded-full bg-[#142334] px-3 py-1.5 font-bold uppercase tracking-[0.1em] text-white">{STATUS_LABELS[selectedPlan.status]}</span>
        <span className="text-[#6B6B6B]">Debrief revision {selectedPlan.sourceSnapshot.workspaceVersion}</span>
        <span aria-hidden="true" className="text-[#C9AD98]">/</span>
        <span className="text-[#6B6B6B]">{selectedPlan.sourceSnapshot.cv.included ? 'CV included' : 'CV not included'}</span>
        <span aria-hidden="true" className="text-[#C9AD98]">/</span>
        <span className="text-[#6B6B6B]">{selectedPlan.generatorModel}</span>
      </div>

      {!selectedPlan.sourceSnapshot.cv.included && selectedPlan.sourceSnapshot.cv.issue && (
        <p className="rounded-[8px] border border-[#E8CF9E] bg-[#FFF9ED] px-4 py-3 text-[12px] leading-relaxed text-[#76541D]">
          {selectedPlan.sourceSnapshot.cv.issue}
        </p>
      )}

      <PlanContentEditor content={editedContent} disabled={!canEdit} onChange={onChange} />

      {error && <p role="alert" className="rounded-[8px] border border-[#C98672] bg-[#FFF5F2] px-4 py-3 text-[13px] font-semibold text-[#7A2F22]">{error}</p>}
      {message && <p role="status" className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#466B4D]"><CheckCircle2 className="h-4 w-4" />{message}</p>}

      <div className="flex flex-col gap-3 border-t border-[#E4D8CB] pt-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-xl items-start gap-2 text-[12px] leading-relaxed text-[#6B6B6B]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#8C7466]" />
          {canEdit
            ? 'Approval locks this version. Review the final wording before making it available for delivery.'
            : selectedPlan.status === 'approved'
              ? 'This version is locked. Confirm the recipient below before sending it through Brevo.'
              : selectedPlan.status === 'sent'
                ? 'This version is locked and has been delivered. Follow-up outcomes are stored separately.'
                : 'This version is locked and remains available in the plan history.'}
        </div>
        {canEdit && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={!isDirty || isSaving || isApproving}
              onClick={onSave}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-[#142334] px-5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#142334] transition hover:bg-[#F5F3EE] disabled:cursor-not-allowed disabled:border-[#D8C8BB] disabled:text-[#142334]/35"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
            <button
              type="button"
              disabled={isDirty || isSaving || isApproving}
              onClick={onApprove}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#142334] px-5 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#466B4D] disabled:cursor-not-allowed disabled:bg-[#D8C8BB] disabled:text-[#142334]/45"
            >
              {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {isApproving ? 'Approving...' : 'Approve and lock'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
