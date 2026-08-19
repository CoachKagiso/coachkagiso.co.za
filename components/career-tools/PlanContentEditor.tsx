import type { ComponentType, ReactNode } from 'react';
import {
  CalendarRange,
  Compass,
  Handshake,
  Loader2,
  MessagesSquare,
  Plus,
  RefreshCw,
  Route,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from 'lucide-react';
import type {
  CareerClarityDecisionCriterion,
  CareerClarityDecisionFramework,
  CareerClarityMarketSignalRitual,
  CareerClarityPlanContent,
  CareerClarityPlanPhase,
  CareerClarityPositioning,
  CareerClarityWeeklyFocus,
  CareerDevelopmentPlanHorizon,
  ClientStrategyPlanSection,
  ClientStrategyPlanContent,
  GlowUpPlanContent,
  GlowUpPlanPhase,
} from '@/lib/client-strategy-plan';
import {
  getClientStrategyPlanExtensionGaps,
  getClientStrategyPlanFinalWeek,
  groupClientStrategyPlanWeeks,
  hasClientStrategyPlanExtensionGaps,
} from '@/lib/client-strategy-plan';
import PlanInterviewPrepEditor from '@/components/career-tools/PlanInterviewPrepEditor';
import AutoGrowTextarea from '@/components/career-tools/AutoGrowTextarea';
import { renderRichText } from '@/components/career-tools/RichText';

type PlanContentEditorProps = {
  content: ClientStrategyPlanContent;
  activeSection: ClientStrategyPlanSection;
  disabled: boolean;
  canExtendWithAi: boolean;
  isExtendingHorizon: boolean;
  onChange: (content: ClientStrategyPlanContent) => void;
  onExtendHorizon: (targetHorizon: 60 | 90) => void;
};

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">{children}</span>;
}

function TextField({
  id,
  label,
  value,
  rows = 3,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  rows?: number;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  // A locked plan is being read, not edited, so render it as formatted copy instead of a dead textarea.
  if (disabled) {
    return (
      <div className="grid gap-2">
        <FieldLabel>{label}</FieldLabel>
        {value.trim() ? (
          <p className="rounded-[8px] border border-[#E4D8CB] bg-white px-4 py-3 text-[15px] leading-[1.7] text-[#142334]">
            {renderRichText(value)}
          </p>
        ) : (
          <p className="rounded-[8px] border border-dashed border-[#D8C8BB] px-4 py-3 text-[14px] text-[#142334]/45">Not set</p>
        )}
      </div>
    );
  }

  return (
    <label htmlFor={id} className="grid gap-2">
      <FieldLabel>{label}</FieldLabel>
      <AutoGrowTextarea
        id={id}
        value={value}
        rows={rows}
        maxLength={1200}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-[8px] border border-[#D8C8BB] bg-[#F8F6F4] px-4 py-3 text-[15px] leading-relaxed text-[#142334] outline-none transition focus:border-[#142334] focus:bg-white focus:ring-2 focus:ring-[#C9AD98]/30 disabled:cursor-not-allowed disabled:bg-[#F1EEE9] disabled:text-[#142334]/68"
      />
    </label>
  );
}

function ListField({
  id,
  label,
  values,
  maxItems = 8,
  helper = 'One row per item. Pasting several lines splits them into separate items.',
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  values: string[];
  maxItems?: number;
  helper?: string;
  disabled: boolean;
  onChange: (values: string[]) => void;
}) {
  // Locked plans show real numbered items rather than newline-joined text in a dead textarea.
  if (disabled) {
    const items = values.filter((item) => item.trim());
    return (
      <div className="grid gap-2">
        <FieldLabel>{label}</FieldLabel>
        {items.length ? (
          <ol className="grid gap-2.5 rounded-[8px] border border-[#E4D8CB] bg-white px-4 py-3.5">
            {items.map((item, index) => (
              <li key={`${id}-${index}`} className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#142334] text-[10px] font-bold text-white"
                >
                  {index + 1}
                </span>
                <span className="text-[15px] leading-[1.65] text-[#142334]">{renderRichText(item)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-[8px] border border-dashed border-[#D8C8BB] px-4 py-3 text-[14px] text-[#142334]/45">Not set</p>
        )}
      </div>
    );
  }

  // One row per item, so an item is visually separable while it is still being edited.
  // A newline-joined textarea made it impossible to see where one item ended.
  const rows = values.length ? values : [''];

  function replaceRow(index: number, next: string) {
    const parts = next.split('\n');
    const updated = [...rows];
    updated.splice(index, 1, ...parts);
    onChange(updated.slice(0, maxItems));
  }

  return (
    <div className="grid gap-2">
      <FieldLabel>{label}</FieldLabel>
      <ol className="grid gap-2">
        {rows.map((item, index) => (
          <li key={`${id}-row-${index}`} className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className="mt-3 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#E4D8CB] text-[10px] font-bold text-[#142334]"
            >
              {index + 1}
            </span>
            <AutoGrowTextarea
              id={index === 0 ? id : `${id}-${index}`}
              value={item}
              rows={1}
              maxLength={2000}
              aria-label={`${label} item ${index + 1}`}
              onChange={(event) => replaceRow(index, event.target.value)}
              className="flex-1 rounded-[8px] border border-[#D8C8BB] bg-[#F8F6F4] px-3 py-2.5 text-[15px] leading-[1.6] text-[#142334] outline-none transition focus:border-[#142334] focus:bg-white focus:ring-2 focus:ring-[#C9AD98]/30"
            />
            <button
              type="button"
              aria-label={`Remove ${label} item ${index + 1}`}
              onClick={() => onChange(rows.filter((_, position) => position !== index))}
              className="mt-2 grid h-7 w-7 shrink-0 place-items-center rounded-[6px] text-[#8C7466] transition hover:bg-[#F5F3EE] hover:text-[#7A2F22]"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-[#6B6B6B]">{helper}</span>
        {rows.length < maxItems && (
          <button
            type="button"
            onClick={() => onChange([...rows, ''])}
            className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-[#D8C8BB] px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#142334] transition hover:border-[#8C7466] hover:bg-[#F5F3EE]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add item
          </button>
        )}
      </div>
    </div>
  );
}

function PlanSection({
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  // Mirrors the CV Analyzer's card + icon-badge treatment so a generated plan reads as a
  // designed document instead of a stack of unstyled form fields on plain white.
  return (
    <section className="grid gap-5 rounded-[8px] border border-[#E4D8CB] bg-[#FBFAF8] p-5 md:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-white text-[#8C7466] ring-1 ring-[#E4D8CB]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">{eyebrow}</p>
          <h4 className="mt-2 font-serif text-[26px] leading-tight text-[#142334]">{title}</h4>
          <p className="mt-2 text-[14px] leading-relaxed text-[#142334]/66">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function PlanHorizonField({
  content,
  value,
  disabled,
  canExtendWithAi,
  isExtendingHorizon,
  onChange,
  onExtendHorizon,
}: {
  content: ClientStrategyPlanContent;
  value: CareerDevelopmentPlanHorizon;
  disabled: boolean;
  canExtendWithAi: boolean;
  isExtendingHorizon: boolean;
  onChange: (value: CareerDevelopmentPlanHorizon) => void;
  onExtendHorizon: (targetHorizon: 60 | 90) => void;
}) {
  // Offered whenever a horizon still has something unwritten, including the current one. That
  // is what lets AI replace the [Confirm: ...] placeholders the manual selector inserts.
  const extensionOptions = ([60, 90] as const).filter((days) => (
    days >= value
    && hasClientStrategyPlanExtensionGaps(getClientStrategyPlanExtensionGaps(content, days))
  ));

  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-3">
        <legend className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">Plan horizon</legend>
        <div className="grid grid-cols-3 gap-2">
          {([30, 60, 90] as const).map((days) => (
            <button
              key={days}
              type="button"
              disabled={disabled || isExtendingHorizon}
              aria-pressed={value === days}
              onClick={() => onChange(days)}
              className={`rounded-[8px] border px-3 py-3 text-[12px] font-bold uppercase tracking-[0.1em] transition ${
                value === days
                  ? 'border-[#142334] bg-[#142334] text-white'
                  : 'border-[#D8C8BB] bg-white text-[#142334] hover:border-[#8C7466]'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {days} days
            </button>
          ))}
        </div>
        <p className="text-[12px] leading-relaxed text-[#6B6B6B]">
          Select a horizon above when you want to add or edit the additional milestones manually.
        </p>
      </fieldset>

      {extensionOptions.length > 0 && (
        <div className="grid gap-3 rounded-[8px] border border-[#C9AD98] bg-[#F3EDE7] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.13em] text-[#8C7466]">
              <Sparkles className="h-4 w-4" />
              Extend with AI
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#142334]/72">
              Generate only the missing milestones. Your existing plan wording and earlier milestones stay unchanged.
            </p>
            {!canExtendWithAi && !disabled && (
              <p className="mt-2 text-[11px] font-semibold text-[#76541D]">
                Save your current edits before using AI extension.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {extensionOptions.map((days) => (
              <button
                key={days}
                type="button"
                disabled={disabled || !canExtendWithAi || isExtendingHorizon}
                onClick={() => onExtendHorizon(days)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#142334] px-4 text-[10px] font-bold uppercase tracking-[0.11em] text-white transition hover:bg-[#466B4D] disabled:cursor-not-allowed disabled:bg-[#D8C8BB] disabled:text-[#142334]/45"
              >
                {isExtendingHorizon
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Sparkles className="h-4 w-4" />}
                {days > value ? `Extend to ${days} days` : `Write the missing ${days}-day content`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CareerPhaseEditor({
  id,
  label,
  phase,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  phase: CareerClarityPlanPhase;
  disabled: boolean;
  onChange: (phase: CareerClarityPlanPhase) => void;
}) {
  return (
    <fieldset className="grid gap-3 rounded-[8px] border border-[#E4D8CB] p-4">
      <legend className="px-2 font-serif text-[22px] text-[#142334]">{label}</legend>
      <TextField id={`${id}-focus`} label="Focus" value={phase.focus} rows={2} disabled={disabled} onChange={(focus) => onChange({ ...phase, focus })} />
      <ListField id={`${id}-actions`} label="Client actions" values={phase.actions} disabled={disabled} onChange={(actions) => onChange({ ...phase, actions })} />
    </fieldset>
  );
}

function EmptySectionNotice({ label }: { label: string }) {
  return (
    <p className="rounded-[8px] border border-[#D8C8BB] bg-[#F8F6F4] px-4 py-3 text-[13px] leading-relaxed text-[#142334]/70">
      {`This plan was generated before the ${label} existed. Regenerate the Career Development Plan section to add it.`}
    </p>
  );
}

function DecisionFrameworkEditor({
  framework,
  disabled,
  onChange,
}: {
  framework: CareerClarityDecisionFramework;
  disabled: boolean;
  onChange: (framework: CareerClarityDecisionFramework) => void;
}) {
  function updateCriterion(index: number, next: CareerClarityDecisionCriterion) {
    onChange({
      ...framework,
      criteria: framework.criteria.map((item, itemIndex) => (itemIndex === index ? next : item)),
    });
  }

  return (
    <div className="grid gap-4">
      <TextField
        id="plan-decision-statement"
        label="The decision this plan supports"
        value={framework.decisionStatement}
        rows={2}
        disabled={disabled}
        onChange={(decisionStatement) => onChange({ ...framework, decisionStatement })}
      />
      {framework.criteria.map((criterion, index) => (
        <fieldset key={index} className="grid gap-3 rounded-[8px] border border-[#E4D8CB] p-4">
          <legend className="px-2 font-serif text-[20px] text-[#142334]">Criterion {index + 1}</legend>
          <TextField
            id={`plan-decision-criterion-${index}`}
            label="What must be true"
            value={criterion.criterion}
            rows={2}
            disabled={disabled}
            onChange={(value) => updateCriterion(index, { ...criterion, criterion: value })}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              id={`plan-decision-current-${index}`}
              label="Test it in the current role"
              value={criterion.currentRoleEvidence}
              rows={3}
              disabled={disabled}
              onChange={(value) => updateCriterion(index, { ...criterion, currentRoleEvidence: value })}
            />
            <TextField
              id={`plan-decision-market-${index}`}
              label="Test it in the market"
              value={criterion.marketEvidence}
              rows={3}
              disabled={disabled}
              onChange={(value) => updateCriterion(index, { ...criterion, marketEvidence: value })}
            />
          </div>
        </fieldset>
      ))}
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          id="plan-decision-stay-threshold"
          label="What would make staying the right call"
          value={framework.stayThreshold}
          rows={3}
          disabled={disabled}
          onChange={(stayThreshold) => onChange({ ...framework, stayThreshold })}
        />
        <TextField
          id="plan-decision-checkpoint"
          label="When the client makes the call"
          value={framework.decisionCheckpoint}
          rows={3}
          disabled={disabled}
          onChange={(decisionCheckpoint) => onChange({ ...framework, decisionCheckpoint })}
        />
      </div>
    </div>
  );
}

function PositioningEditor({
  positioning,
  disabled,
  onChange,
}: {
  positioning: CareerClarityPositioning;
  disabled: boolean;
  onChange: (positioning: CareerClarityPositioning) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          id="plan-positioning-current"
          label="How a recruiter reads her today"
          value={positioning.currentRecruiterRead}
          rows={4}
          disabled={disabled}
          onChange={(currentRecruiterRead) => onChange({ ...positioning, currentRecruiterRead })}
        />
        <TextField
          id="plan-positioning-target"
          label="How she wants to be read"
          value={positioning.targetRecruiterRead}
          rows={4}
          disabled={disabled}
          onChange={(targetRecruiterRead) => onChange({ ...positioning, targetRecruiterRead })}
        />
      </div>
      <TextField
        id="plan-positioning-statement"
        label="Positioning statement"
        value={positioning.positioningStatement}
        rows={3}
        disabled={disabled}
        onChange={(positioningStatement) => onChange({ ...positioning, positioningStatement })}
      />
      <ListField
        id="plan-positioning-prompts"
        label="Achievement prompts"
        values={positioning.achievementPrompts}
        maxItems={5}
        helper="Questions that pull a concrete achievement out of the client. One per line."
        disabled={disabled}
        onChange={(achievementPrompts) => onChange({ ...positioning, achievementPrompts })}
      />
    </div>
  );
}

function WeeklyRhythmEditor({
  weeks,
  horizon,
  disabled,
  onChange,
}: {
  weeks: CareerClarityWeeklyFocus[];
  horizon: CareerDevelopmentPlanHorizon;
  disabled: boolean;
  onChange: (weeks: CareerClarityWeeklyFocus[]) => void;
}) {
  const finalWeek = getClientStrategyPlanFinalWeek(horizon);
  function updateWeek(weekNumber: number, next: Partial<CareerClarityWeeklyFocus>) {
    onChange(weeks.map((week) => (week.weekNumber === weekNumber ? { ...week, ...next } : week)));
  }

  const missingWeeks: number[] = [];
  for (let week = 3; week <= finalWeek; week += 1) {
    if (!weeks.some((entry) => entry.weekNumber === week)) missingWeeks.push(week);
  }

  return (
    <div className="grid gap-4">
      {missingWeeks.length > 0 && (
        <p className="rounded-[8px] border border-[#E3B5AA] bg-[#FFF5F2] px-4 py-3 text-[13px] text-[#7A2F22]">
          {`This ${finalWeek === 4 ? 30 : finalWeek === 8 ? 60 : 90}-day plan still needs ${missingWeeks.length === 1 ? 'Week' : 'Weeks'} ${missingWeeks.join(', ')}. Add them below or regenerate the section.`}
        </p>
      )}
      {groupClientStrategyPlanWeeks(weeks, horizon).map((block) => (
      <section key={block.milestoneDay} className="grid gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[#E4D8CB] pb-2">
          <h5 className="font-serif text-[22px] leading-tight text-[#142334]">
            Weeks {block.fromWeek} to {block.toWeek}
          </h5>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">
            Working toward Day {block.milestoneDay}
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
        {block.weeks.map((week) => (
          <fieldset key={week.weekNumber} className="grid gap-3 rounded-[8px] border border-[#E4D8CB] p-4">
            <legend className="px-2 font-serif text-[20px] text-[#142334]">Week {week.weekNumber}</legend>
            <TextField
              id={`plan-week-${week.weekNumber}-theme`}
              label="Theme"
              value={week.theme}
              rows={2}
              disabled={disabled}
              onChange={(theme) => updateWeek(week.weekNumber, { theme })}
            />
            <ListField
              id={`plan-week-${week.weekNumber}-actions`}
              label="Actions"
              values={week.actions}
              maxItems={3}
              helper="One to three actions, one per line"
              disabled={disabled}
              onChange={(actions) => updateWeek(week.weekNumber, { actions })}
            />
          </fieldset>
        ))}
        </div>
      </section>
      ))}
      {missingWeeks.length > 0 && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([
            ...weeks,
            ...missingWeeks.map((weekNumber) => ({
              weekNumber,
              theme: '[Confirm: theme for this week]',
              actions: ['[Confirm: action for this week]'],
            })),
          ].sort((a, b) => a.weekNumber - b.weekNumber))}
          className="justify-self-start rounded-[8px] border border-[#142334] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#142334] transition hover:bg-[#142334] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add the missing weeks
        </button>
      )}
    </div>
  );
}

function MarketSignalRitualEditor({
  ritual,
  disabled,
  onChange,
}: {
  ritual: CareerClarityMarketSignalRitual;
  disabled: boolean;
  onChange: (ritual: CareerClarityMarketSignalRitual) => void;
}) {
  return (
    <div className="grid gap-4">
      <TextField
        id="plan-ritual-cadence"
        label="Cadence"
        value={ritual.cadence}
        rows={2}
        disabled={disabled}
        onChange={(cadence) => onChange({ ...ritual, cadence })}
      />
      <ListField
        id="plan-ritual-steps"
        label="Steps"
        values={ritual.steps}
        maxItems={4}
        helper="Two to four repeatable steps, one per line"
        disabled={disabled}
        onChange={(steps) => onChange({ ...ritual, steps })}
      />
      <TextField
        id="plan-ritual-reflection"
        label="Reflection prompt"
        value={ritual.reflectionPrompt}
        rows={2}
        disabled={disabled}
        onChange={(reflectionPrompt) => onChange({ ...ritual, reflectionPrompt })}
      />
    </div>
  );
}

function GlowUpPhaseEditor({
  id,
  label,
  phase,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  phase: GlowUpPlanPhase;
  disabled: boolean;
  onChange: (phase: GlowUpPlanPhase) => void;
}) {
  return (
    <fieldset className="grid gap-3 rounded-[8px] border border-[#E4D8CB] p-4">
      <legend className="px-2 font-serif text-[22px] text-[#142334]">{label}</legend>
      <TextField id={`${id}-focus`} label="Focus" value={phase.focus} rows={2} disabled={disabled} onChange={(focus) => onChange({ ...phase, focus })} />
      <ListField id={`${id}-actions`} label="Client actions" values={phase.actions} disabled={disabled} onChange={(actions) => onChange({ ...phase, actions })} />
      <ListField id={`${id}-support`} label="Kagiso support" values={phase.coachSupport} disabled={disabled} onChange={(coachSupport) => onChange({ ...phase, coachSupport })} />
    </fieldset>
  );
}

export default function PlanContentEditor({
  content,
  activeSection,
  disabled,
  canExtendWithAi,
  isExtendingHorizon,
  onChange,
  onExtendHorizon,
}: PlanContentEditorProps) {
  const updateShared = (
    key: 'permissionLine' | 'minimumViableCommitment' | 'checkpointCondition',
    value: string,
  ) => onChange({ ...content, [key]: value });

  function updateSummary(
    key: keyof typeof content.sessionSummary,
    value: string | string[],
  ) {
    const sessionSummary = { ...content.sessionSummary, [key]: value };
    onChange({
      ...content,
      sessionSummary,
      ...(key === 'purpose' ? { focusStatement: value as string } : {}),
      ...(key === 'whereThingsStood' ? { openingDiagnostic: value as string } : {}),
      ...(key === 'agreedOutcome' ? { outcome: value as string } : {}),
    });
  }

  function updateHorizon(planHorizonDays: CareerDevelopmentPlanHorizon) {
    const milestones = { day30: content.milestones.day30 };
    if (planHorizonDays >= 60) {
      Object.assign(milestones, {
        day60: content.milestones.day60 || ['[Confirm: first Day 60 action]', '[Confirm: second Day 60 action]'],
      });
    }
    if (planHorizonDays >= 90) {
      Object.assign(milestones, {
        day90: content.milestones.day90 || ['[Confirm: first Day 90 action]', '[Confirm: second Day 90 action]'],
      });
    }
    onChange({ ...content, planHorizonDays, milestones });
  }

  if (activeSection === 'session_summary') {
    return (
      <div className="grid gap-7">
        <section className="grid gap-5 rounded-[8px] bg-[#F3EDE7] p-5 md:p-6">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Client-facing session record</p>
            <h4 className="mt-2 font-serif text-[30px] leading-tight text-[#142334]">Session Summary &amp; Agreements</h4>
            <p className="mt-2 text-[14px] leading-relaxed text-[#142334]/68">
              Record what was understood, explored, clarified and agreed. This is a concise coaching summary, not a transcript or private coach note.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(0,0.35fr)_minmax(0,1fr)]">
            <TextField
              id="plan-session-date"
              label="Session date"
              value={content.sessionSummary.sessionDate}
              rows={2}
              disabled={disabled}
              onChange={(value) => updateSummary('sessionDate', value)}
            />
            <TextField
              id="plan-session-purpose"
              label="Purpose of the session"
              value={content.sessionSummary.purpose}
              rows={2}
              disabled={disabled}
              onChange={(value) => updateSummary('purpose', value)}
            />
          </div>
          <TextField
            id="plan-session-situation"
            label="Where things stood"
            value={content.sessionSummary.whereThingsStood}
            rows={5}
            disabled={disabled}
            onChange={(value) => updateSummary('whereThingsStood', value)}
          />
        </section>

        <PlanSection
          icon={MessagesSquare}
          eyebrow="Conversation"
          title="Capture the useful substance of the session"
          description="Keep the summary grounded in the reviewed debrief. Private sensitivity notes and hypotheses stay out of the client document."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <ListField
              id="plan-themes-explored"
              label="What we explored"
              values={content.sessionSummary.themesExplored}
              maxItems={5}
              disabled={disabled}
              onChange={(values) => updateSummary('themesExplored', values)}
            />
            <ListField
              id="plan-clarity-gained"
              label="What became clearer"
              values={content.sessionSummary.clarityGained}
              maxItems={5}
              disabled={disabled}
              onChange={(values) => updateSummary('clarityGained', values)}
            />
          </div>
          <TextField
            id="plan-agreed-outcome"
            label="Agreed outcome"
            value={content.sessionSummary.agreedOutcome}
            rows={3}
            disabled={disabled}
            onChange={(value) => updateSummary('agreedOutcome', value)}
          />
        </PlanSection>

        <PlanSection
          icon={Handshake}
          eyebrow="Agreements"
          title="Make ownership and open points explicit"
          description="Separate what the client owns from what Kagiso agreed to provide, then retain anything that still needs confirmation."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <ListField
              id="plan-client-commitments"
              label="Client commitments"
              values={content.sessionSummary.clientCommitments}
              maxItems={5}
              disabled={disabled}
              onChange={(values) => updateSummary('clientCommitments', values)}
            />
            <ListField
              id="plan-coach-commitments"
              label="Kagiso commitments"
              values={content.sessionSummary.coachCommitments}
              maxItems={5}
              disabled={disabled}
              onChange={(values) => updateSummary('coachCommitments', values)}
            />
          </div>
          <ListField
            id="plan-open-points"
            label="Open points or confirmations"
            values={content.sessionSummary.openPoints}
            maxItems={5}
            helper="Optional. Use [Confirm: ...] where a detail still needs verification."
            disabled={disabled}
            onChange={(values) => updateSummary('openPoints', values)}
          />
          <TextField
            id="plan-permission-line"
            label="Permission line"
            value={content.permissionLine}
            rows={2}
            disabled={disabled}
            onChange={(value) => updateShared('permissionLine', value)}
          />
        </PlanSection>
      </div>
    );
  }

  if (activeSection === 'interview_prep') {
    if (content.kind !== 'glow_up_development_plan') return null;
    return (
      <PlanInterviewPrepEditor
        interviewPrep={content.interviewPrep}
        disabled={disabled}
        onChange={(interviewPrep) => onChange({ ...content, interviewPrep })}
      />
    );
  }

  return (
    <div className="grid gap-8">
      <PlanSection
        icon={Route}
        eyebrow="Roadmap"
        title="Set the horizon and the milestones"
        description="Every plan starts with a 30-day path. Extend it to 60 or 90 days only when the client’s goal genuinely needs the additional runway."
      >
        <PlanHorizonField
          content={content}
          value={content.planHorizonDays}
          disabled={disabled}
          canExtendWithAi={canExtendWithAi}
          isExtendingHorizon={isExtendingHorizon}
          onChange={updateHorizon}
          onExtendHorizon={onExtendHorizon}
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <ListField
            id="plan-day-30-milestones"
            label="By Day 30"
            values={content.milestones.day30}
            maxItems={3}
            helper="Two or three concrete actions, one per line"
            disabled={disabled}
            onChange={(day30) => onChange({ ...content, milestones: { ...content.milestones, day30 } })}
          />
          {content.planHorizonDays >= 60 && (
            <ListField
              id="plan-day-60-milestones"
              label="By Day 60"
              values={content.milestones.day60 || []}
              maxItems={3}
              helper="Two or three concrete actions, one per line"
              disabled={disabled}
              onChange={(day60) => onChange({ ...content, milestones: { ...content.milestones, day60 } })}
            />
          )}
          {content.planHorizonDays >= 90 && (
            <ListField
              id="plan-day-90-milestones"
              label="By Day 90"
              values={content.milestones.day90 || []}
              maxItems={3}
              helper="Two or three concrete actions, one per line"
              disabled={disabled}
              onChange={(day90) => onChange({ ...content, milestones: { ...content.milestones, day90 } })}
            />
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            id="plan-minimum-commitment"
            label="Minimum viable commitment"
            value={content.minimumViableCommitment}
            rows={3}
            disabled={disabled}
            onChange={(value) => updateShared('minimumViableCommitment', value)}
          />
          <TextField
            id="plan-checkpoint-condition"
            label="Checkpoint condition"
            value={content.checkpointCondition}
            rows={3}
            disabled={disabled}
            onChange={(value) => updateShared('checkpointCondition', value)}
          />
        </div>
      </PlanSection>

      <PlanSection
        icon={CalendarRange}
        eyebrow={content.kind === 'career_clarity_development_plan' ? 'First 14 Days' : 'First 30 Days'}
        title={content.kind === 'career_clarity_development_plan' ? 'Turn clarity into early movement' : 'Build the visible career story'}
        description={content.kind === 'career_clarity_development_plan'
          ? 'These phases prepare the client for the first Microsoft Teams follow-up. They are the opening subsection, not the full plan.'
          : 'These phases connect the client’s actions with Kagiso’s CV, LinkedIn, plan, and interview-preparation support.'}
      >
        {content.kind === 'career_clarity_development_plan' ? (
          <>
            {([
              ['days1To3', 'Days 1 to 3'],
              ['days4To7', 'Days 4 to 7'],
              ['days8To14', 'Days 8 to 14'],
            ] as const).map(([key, label]) => (
              <CareerPhaseEditor
                key={key}
                id={`career-clarity-${key}`}
                label={label}
                phase={content[key]}
                disabled={disabled}
                onChange={(phase) => onChange({ ...content, [key]: phase } as CareerClarityPlanContent)}
              />
            ))}
            <div className="grid gap-4 md:grid-cols-2">
              <ListField id="career-check-ins" label="Check-in questions" values={content.checkInQuestions} disabled={disabled} onChange={(checkInQuestions) => onChange({ ...content, checkInQuestions })} />
              <ListField id="career-coach-follow-up" label="Kagiso follow-up" values={content.coachFollowUp} disabled={disabled} onChange={(coachFollowUp) => onChange({ ...content, coachFollowUp })} />
            </div>
          </>
        ) : (
          <>
            {([
              ['days1To7', 'Days 1 to 7'],
              ['days8To14', 'Days 8 to 14'],
              ['days15To21', 'Days 15 to 21'],
              ['days22To30', 'Days 22 to 30'],
            ] as const).map(([key, label]) => (
              <GlowUpPhaseEditor
                key={key}
                id={`glow-up-${key}`}
                label={label}
                phase={content[key]}
                disabled={disabled}
                onChange={(phase) => onChange({ ...content, [key]: phase } as GlowUpPlanContent)}
              />
            ))}
            <ListField id="glow-up-progress" label="Progress signals" values={content.progressSignals} disabled={disabled} onChange={(progressSignals) => onChange({ ...content, progressSignals })} />
          </>
        )}
      </PlanSection>

      {content.kind === 'career_clarity_development_plan' && (
        <>
          <PlanSection
            icon={Compass}
            eyebrow="The decision"
            title="Give the client a way to decide, not just a deadline"
            description="Name the decision, the conditions that settle it, and how each one gets tested inside the current role and out in the market. Kagiso stays neutral on the answer."
          >
            {content.decisionFramework ? (
              <DecisionFrameworkEditor
                framework={content.decisionFramework}
                disabled={disabled}
                onChange={(decisionFramework) => onChange({ ...content, decisionFramework })}
              />
            ) : (
              <EmptySectionNotice label="decision framework" />
            )}
          </PlanSection>

          <PlanSection
            icon={Target}
            eyebrow="Positioning"
            title="Close the gap between how she reads and how she wants to read"
            description="Grounded in the saved CV analysis. The achievement prompts pull real evidence out of the client rather than inventing it for her."
          >
            {content.positioning ? (
              <PositioningEditor
                positioning={content.positioning}
                disabled={disabled}
                onChange={(positioning) => onChange({ ...content, positioning })}
              />
            ) : (
              <EmptySectionNotice label="positioning section" />
            )}
          </PlanSection>

          <PlanSection
            icon={TrendingUp}
            eyebrow={`Week 3 to Week ${getClientStrategyPlanFinalWeek(content.planHorizonDays)}`}
            title="Carry the plan past the first two weeks"
            description="The phases above cover the first 14 days. This is what happens in every week after that, so the rest of the horizon is not left to memory."
          >
            <WeeklyRhythmEditor
              weeks={content.weeklyRhythm}
              horizon={content.planHorizonDays}
              disabled={disabled}
              onChange={(weeklyRhythm) => onChange({ ...content, weeklyRhythm })}
            />
          </PlanSection>

          <PlanSection
            icon={RefreshCw}
            eyebrow="Evidence loop"
            title="One repeatable ritual that feeds the decision"
            description="A small loop the client runs on a fixed cadence. It produces the evidence the decision framework needs, without application quotas."
          >
            {content.marketSignalRitual ? (
              <MarketSignalRitualEditor
                ritual={content.marketSignalRitual}
                disabled={disabled}
                onChange={(marketSignalRitual) => onChange({ ...content, marketSignalRitual })}
              />
            ) : (
              <EmptySectionNotice label="market signal ritual" />
            )}
            <ListField
              id="career-clarity-progress"
              label="Progress signals"
              values={content.progressSignals}
              maxItems={6}
              helper="Three to six observable, non-numerical signs the plan is working. One per line."
              disabled={disabled}
              onChange={(progressSignals) => onChange({ ...content, progressSignals })}
            />
          </PlanSection>
        </>
      )}
    </div>
  );
}
