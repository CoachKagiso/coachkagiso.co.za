import { useState } from 'react';
import { BookOpen, CheckCircle2, Download, History, Loader2, Pencil, RotateCcw, Save, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import FilterDropdown from '@/components/FilterDropdown';
import PlanContentEditor from '@/components/career-tools/PlanContentEditor';
import {
  getIncompleteClientStrategyPlanSections,
  type ClientStrategyPlanContent,
  type ClientStrategyPlanRecord,
  type ClientStrategyPlanSection,
} from '@/lib/client-strategy-plan';

const VIEW_MODE_OPTIONS: Array<{ mode: 'read' | 'edit'; label: string; icon: typeof BookOpen }> = [
  { mode: 'read', label: 'Reading', icon: BookOpen },
  { mode: 'edit', label: 'Editing', icon: Pencil },
];

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
  generatingSection,
  activeSection,
  error,
  message,
  onChoosePlan,
  onChooseSection,
  onGenerateSection,
  onExtendHorizon,
  onChange,
  onSave,
  onApprove,
  onExport,
  onDelete,
  onReset,
}: {
  plans: ClientStrategyPlanRecord[];
  selectedPlan: ClientStrategyPlanRecord;
  editedContent: ClientStrategyPlanContent;
  isDirty: boolean;
  isSaving: boolean;
  isApproving: boolean;
  generatingSection: ClientStrategyPlanSection | 'horizon_extension' | 'all' | '';
  activeSection: ClientStrategyPlanSection;
  error: string;
  message: string;
  onChoosePlan: (planId: string) => void;
  onChooseSection: (section: ClientStrategyPlanSection) => void;
  onGenerateSection: (section: ClientStrategyPlanSection) => void;
  onExtendHorizon: (targetHorizon: 60 | 90) => void;
  onChange: (content: ClientStrategyPlanContent) => void;
  onSave: () => void;
  onApprove: () => void;
  onExport: () => void;
  onDelete: () => void;
  onReset: () => void;
}) {
  // Drafts open in reading view. The formatted layout is the point of reviewing a generated
  // plan, and an approved plan has no editing view at all.
  const [viewMode, setViewMode] = useState<'read' | 'edit'>('read');
  const canEdit = selectedPlan.status === 'draft';
  const isEditing = canEdit && viewMode === 'edit';
  const incompleteSections = getIncompleteClientStrategyPlanSections(editedContent);
  const sections: Array<{ key: ClientStrategyPlanSection; label: string; state: 'not_generated' | 'generated' }> = [
    { key: 'session_summary', label: 'Session Summary', state: editedContent.sectionStatus.sessionSummary },
    { key: 'development_plan', label: 'Career Development Plan', state: editedContent.sectionStatus.developmentPlan },
    ...(editedContent.kind === 'glow_up_development_plan'
      ? [{
          key: 'interview_prep' as const,
          label: 'Interview Preparation',
          state: editedContent.sectionStatus.interviewPrep || 'not_generated' as const,
        }]
      : []),
  ];
  const activeDefinition = sections.find((section) => section.key === activeSection) || sections[0];

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
        {selectedPlan.sourceSnapshot.cvAnalysis?.included && (
          <>
            <span className="text-[#6B6B6B]">Saved CV analysis included</span>
            <span aria-hidden="true" className="text-[#C9AD98]">/</span>
          </>
        )}
        <span className="text-[#6B6B6B]">{selectedPlan.generatorModel}</span>
        <span className="ml-auto flex flex-wrap gap-2">
          <button type="button" disabled={isDirty} onClick={onExport} className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#142334] bg-white px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#142334] disabled:opacity-40">
            <Download className="h-4 w-4" /> Export
          </button>
          {(selectedPlan.status === 'draft' || (selectedPlan.status === 'superseded' && !selectedPlan.approvedAt)) && (
            <button type="button" onClick={onDelete} className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#C98672] bg-white px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#7A2F22]">
              <Trash2 className="h-4 w-4" /> Delete draft
            </button>
          )}
          <button type="button" onClick={onReset} className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#D8C8BB] bg-white px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#142334]">
            <RotateCcw className="h-4 w-4" /> Reset drafts
          </button>
        </span>
      </div>

      {!selectedPlan.sourceSnapshot.cv.included && selectedPlan.sourceSnapshot.cv.issue && (
        <p className="rounded-[8px] border border-[#E8CF9E] bg-[#FFF9ED] px-4 py-3 text-[12px] leading-relaxed text-[#76541D]">
          {selectedPlan.sourceSnapshot.cv.issue}
        </p>
      )}

      <div className="sticky top-0 z-10 border-y border-[#D8C8BB] bg-white/95 py-3 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            role="tablist"
            aria-label="Plan sections"
            className="flex max-w-full gap-1 overflow-x-auto rounded-[8px] bg-[#F5F3EE] p-1"
          >
            {sections.map((section) => (
              <button
                key={section.key}
                id={`plan-tab-${section.key}`}
                type="button"
                role="tab"
                aria-selected={activeDefinition.key === section.key}
                aria-controls={`plan-panel-${section.key}`}
                onClick={() => onChooseSection(section.key)}
                className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-[6px] px-4 text-[11px] font-bold uppercase tracking-[0.1em] transition ${
                  activeDefinition.key === section.key
                    ? 'bg-[#142334] text-white'
                    : 'text-[#142334] hover:bg-white'
                }`}
              >
                {section.label}
                <span
                  className={`h-2 w-2 rounded-full ${
                    section.state === 'generated' ? 'bg-[#6E8B69]' : 'bg-[#D8A23D]'
                  }`}
                  aria-label={section.state === 'generated' ? 'Generated' : 'Not generated'}
                />
              </button>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-2">
          {canEdit && (
            <div role="group" aria-label="Plan view mode" className="flex shrink-0 gap-1 rounded-[8px] bg-[#F5F3EE] p-1">
              {VIEW_MODE_OPTIONS.map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  aria-pressed={viewMode === option.mode}
                  onClick={() => setViewMode(option.mode)}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-[6px] px-3 text-[10px] font-bold uppercase tracking-[0.1em] transition ${
                    viewMode === option.mode ? 'bg-[#142334] text-white' : 'text-[#142334] hover:bg-white'
                  }`}
                >
                  <option.icon className="h-3.5 w-3.5" />
                  {option.label}
                </button>
              ))}
            </div>
          )}
          {canEdit && (
            <button
              type="button"
              disabled={Boolean(generatingSection) || isDirty || isSaving || isApproving}
              onClick={() => onGenerateSection(activeDefinition.key)}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[#C9AD98] px-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#142334] transition hover:bg-[#142334] hover:text-white disabled:cursor-not-allowed disabled:bg-[#D8C8BB] disabled:text-[#142334]/45"
            >
              {generatingSection === activeDefinition.key || generatingSection === 'all'
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Sparkles className="h-4 w-4" />}
              {activeDefinition.state === 'generated' ? 'Regenerate section' : 'Generate section'}
            </button>
          )}
          {canEdit && (
            <>
              <span aria-hidden="true" className="hidden h-6 w-px shrink-0 bg-[#D8C8BB] sm:block" />
              <button
                type="button"
                disabled={!isDirty || isSaving || isApproving}
                onClick={onSave}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[8px] border border-[#142334] px-3.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#142334] transition hover:bg-[#F5F3EE] disabled:cursor-not-allowed disabled:border-[#D8C8BB] disabled:text-[#142334]/35"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>
              <button
                type="button"
                disabled={isDirty || isSaving || isApproving || incompleteSections.length > 0}
                onClick={onApprove}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[#142334] px-3.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[#466B4D] disabled:cursor-not-allowed disabled:bg-[#D8C8BB] disabled:text-[#142334]/45"
              >
                {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {isApproving ? 'Approving...' : 'Approve and lock'}
              </button>
            </>
          )}
          </div>
        </div>
        {isDirty && canEdit && (
          <p className="mt-2 text-[11px] text-[#76541D]">Save your edits before generating or regenerating a section.</p>
        )}
      </div>

      <div
        id={`plan-panel-${activeDefinition.key}`}
        role="tabpanel"
        aria-labelledby={`plan-tab-${activeDefinition.key}`}
        tabIndex={0}
      >
        <PlanContentEditor
          content={editedContent}
          activeSection={activeDefinition.key}
          disabled={!isEditing}
          canExtendWithAi={
            canEdit
            && !isDirty
            && !generatingSection
            && editedContent.sectionStatus.developmentPlan === 'generated'
          }
          isExtendingHorizon={generatingSection === 'horizon_extension'}
          onChange={onChange}
          onExtendHorizon={onExtendHorizon}
        />
      </div>

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
      </div>
      {canEdit && incompleteSections.length > 0 && (
        <p role="status" className="text-[12px] leading-relaxed text-[#76541D]">
          Approval becomes available after every required section has been generated.
        </p>
      )}
    </div>
  );
}
