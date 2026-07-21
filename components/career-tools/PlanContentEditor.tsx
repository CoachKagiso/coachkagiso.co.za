import type {
  CareerClarityPlanContent,
  CareerClarityPlanPhase,
  ClientStrategyPlanContent,
  GlowUpPlanContent,
  GlowUpPlanPhase,
} from '@/lib/client-strategy-plan';

type PlanContentEditorProps = {
  content: ClientStrategyPlanContent;
  disabled: boolean;
  onChange: (content: ClientStrategyPlanContent) => void;
};

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
  return (
    <label htmlFor={id} className="grid gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">{label}</span>
      <textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={1200}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="resize-y rounded-[8px] border border-[#D8C8BB] bg-[#F8F6F4] px-4 py-3 text-[13px] leading-relaxed text-[#142334] outline-none transition focus:border-[#142334] focus:bg-white focus:ring-2 focus:ring-[#C9AD98]/30 disabled:cursor-not-allowed disabled:bg-[#F1EEE9] disabled:text-[#142334]/68"
      />
    </label>
  );
}

function ListField({
  id,
  label,
  values,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  values: string[];
  disabled: boolean;
  onChange: (values: string[]) => void;
}) {
  return (
    <label htmlFor={id} className="grid gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">{label}</span>
      <textarea
        id={id}
        value={values.join('\n')}
        rows={4}
        maxLength={7000}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value.split('\n').slice(0, 8))}
        className="resize-y rounded-[8px] border border-[#D8C8BB] bg-[#F8F6F4] px-4 py-3 text-[13px] leading-relaxed text-[#142334] outline-none transition focus:border-[#142334] focus:bg-white focus:ring-2 focus:ring-[#C9AD98]/30 disabled:cursor-not-allowed disabled:bg-[#F1EEE9] disabled:text-[#142334]/68"
      />
      <span className="text-[10px] text-[#6B6B6B]">One item per line</span>
    </label>
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

export default function PlanContentEditor({ content, disabled, onChange }: PlanContentEditorProps) {
  const updateShared = (key: 'focusStatement' | 'outcome', value: string) => onChange({ ...content, [key]: value });

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <TextField id="plan-focus-statement" label="Plan focus" value={content.focusStatement} disabled={disabled} onChange={(value) => updateShared('focusStatement', value)} />
        <TextField id="plan-outcome" label="Intended outcome" value={content.outcome} disabled={disabled} onChange={(value) => updateShared('outcome', value)} />
      </div>

      {content.kind === 'career_clarity_14_day' ? (
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
    </div>
  );
}

