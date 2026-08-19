import type { ReactNode } from 'react';
import type { GlowUpInterviewPrep } from '@/lib/client-strategy-plan';
import AutoGrowTextarea from '@/components/career-tools/AutoGrowTextarea';
import { renderRichText } from '@/components/career-tools/RichText';

const fieldClassName = 'rounded-[8px] border border-[#D8C8BB] bg-[#F8F6F4] px-4 py-3 text-[13px] leading-relaxed text-[#142334] outline-none transition focus:border-[#142334] focus:bg-white focus:ring-2 focus:ring-[#C9AD98]/30 disabled:cursor-not-allowed disabled:bg-[#F1EEE9] disabled:text-[#142334]/68';

function PrepLabel({ children }: { children: ReactNode }) {
  return <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">{children}</span>;
}

function TextAreaField({
  id,
  label,
  value,
  disabled,
  rows = 3,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  rows?: number;
  onChange: (value: string) => void;
}) {
  if (disabled) {
    return (
      <div className="grid gap-2">
        <PrepLabel>{label}</PrepLabel>
        {value.trim() ? (
          <p className="rounded-[8px] border border-[#E4D8CB] bg-white px-4 py-3 text-[14px] leading-[1.7] text-[#142334]">
            {renderRichText(value)}
          </p>
        ) : (
          <p className="rounded-[8px] border border-dashed border-[#D8C8BB] px-4 py-3 text-[13px] text-[#142334]/45">Not set</p>
        )}
      </div>
    );
  }

  return (
    <label htmlFor={id} className="grid gap-2">
      <PrepLabel>{label}</PrepLabel>
      <AutoGrowTextarea
        id={id}
        value={value}
        rows={rows}
        maxLength={1200}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClassName}
      />
    </label>
  );
}

function LineListField({
  id,
  label,
  values,
  disabled,
  maximum,
  onChange,
}: {
  id: string;
  label: string;
  values: string[];
  disabled: boolean;
  maximum: number;
  onChange: (values: string[]) => void;
}) {
  if (disabled) {
    const items = values.filter((item) => item.trim());
    return (
      <div className="grid gap-2">
        <PrepLabel>{label}</PrepLabel>
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
                <span className="text-[14px] leading-[1.65] text-[#142334]">{renderRichText(item)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-[8px] border border-dashed border-[#D8C8BB] px-4 py-3 text-[13px] text-[#142334]/45">Not set</p>
        )}
      </div>
    );
  }

  return (
    <label htmlFor={id} className="grid gap-2">
      <PrepLabel>{label}</PrepLabel>
      <AutoGrowTextarea
        id={id}
        value={values.join('\n')}
        rows={Math.min(8, Math.max(5, values.length))}
        maxLength={9600}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value.split('\n').slice(0, maximum))}
        className={fieldClassName}
      />
      <span className="text-[10px] text-[#6B6B6B]">One item per line · {values.length} of {maximum}</span>
    </label>
  );
}

export default function PlanInterviewPrepEditor({
  interviewPrep,
  disabled,
  onChange,
}: {
  interviewPrep: GlowUpInterviewPrep | null;
  disabled: boolean;
  onChange: (interviewPrep: GlowUpInterviewPrep) => void;
}) {
  if (!interviewPrep) {
    return (
      <section className="rounded-[8px] border border-dashed border-[#D8C8BB] bg-[#FCFBFA] p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">Interview preparation</p>
        <p className="mt-2 text-[13px] leading-relaxed text-[#6B6B6B]">
          This legacy plan predates the embedded interview-preparation section. Save the VIP interview-story evidence and generate a new plan version to add it.
        </p>
      </section>
    );
  }

  const updateStar = (
    key: keyof GlowUpInterviewPrep['starExample'],
    value: string,
  ) => onChange({
    ...interviewPrep,
    starExample: { ...interviewPrep.starExample, [key]: value },
  });

  return (
    <section className="grid gap-5 rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA] p-4 md:p-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">Glow Up VIP</p>
        <h4 className="mt-1 font-serif text-[26px] text-[#142334]">Interview preparation</h4>
        <p className="mt-1 text-[12px] leading-relaxed text-[#6B6B6B]">
          Review every example before approval. Anything marked Confirm still needs verified client detail.
        </p>
      </div>

      <LineListField
        id="glow-up-interview-questions"
        label="Likely interview questions"
        values={interviewPrep.likelyQuestions}
        maximum={8}
        disabled={disabled}
        onChange={(likelyQuestions) => onChange({ ...interviewPrep, likelyQuestions })}
      />

      <fieldset className="grid gap-4 rounded-[8px] border border-[#E4D8CB] bg-white p-4">
        <legend className="px-2 font-serif text-[21px] text-[#142334]">Worked STAR example</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <TextAreaField
            id="glow-up-star-title"
            label="Story title"
            value={interviewPrep.starExample.title}
            rows={2}
            disabled={disabled}
            onChange={(value) => updateStar('title', value)}
          />
          <label htmlFor="glow-up-star-status" className="grid content-start gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">Evidence status</span>
            <select
              id="glow-up-star-status"
              value={interviewPrep.starExample.completionStatus}
              disabled={disabled}
              onChange={(event) => updateStar('completionStatus', event.target.value)}
              className="h-11 rounded-[8px] border border-[#D8C8BB] bg-[#F8F6F4] px-3 text-[13px] text-[#142334] outline-none focus:border-[#142334] focus:ring-2 focus:ring-[#C9AD98]/30 disabled:cursor-not-allowed"
            >
              <option value="complete">Complete and source-backed</option>
              <option value="confirm_details">Confirm details</option>
            </select>
          </label>
        </div>
        {([
          ['situation', 'Situation'],
          ['task', 'Task'],
          ['action', 'Action'],
          ['result', 'Result'],
        ] as const).map(([key, label]) => (
          <TextAreaField
            key={key}
            id={`glow-up-star-${key}`}
            label={label}
            value={interviewPrep.starExample[key]}
            disabled={disabled}
            onChange={(value) => updateStar(key, value)}
          />
        ))}
      </fieldset>

      <fieldset className="grid gap-4 rounded-[8px] border border-[#E4D8CB] bg-white p-4">
        <legend className="px-2 font-serif text-[21px] text-[#142334]">Stories to prepare</legend>
        {interviewPrep.storyPrompts.map((story, index) => (
          <div key={`${index}-${story.experience}`} className="grid gap-3 border-b border-[#E8E3DF] pb-4 last:border-b-0 last:pb-0 md:grid-cols-[0.7fr_1.3fr]">
            <TextAreaField
              id={`glow-up-story-experience-${index}`}
              label={`Experience ${index + 1}`}
              value={story.experience}
              rows={2}
              disabled={disabled}
              onChange={(experience) => onChange({
                ...interviewPrep,
                storyPrompts: interviewPrep.storyPrompts.map((item, itemIndex) => (
                  itemIndex === index ? { ...item, experience } : item
                )),
              })}
            />
            <TextAreaField
              id={`glow-up-story-prompt-${index}`}
              label="Story-shaping prompt"
              value={story.prompt}
              rows={2}
              disabled={disabled}
              onChange={(prompt) => onChange({
                ...interviewPrep,
                storyPrompts: interviewPrep.storyPrompts.map((item, itemIndex) => (
                  itemIndex === index ? { ...item, prompt } : item
                )),
              })}
            />
          </div>
        ))}
      </fieldset>

      <LineListField
        id="glow-up-interview-research"
        label="Company and panel research checklist"
        values={interviewPrep.researchChecklist}
        maximum={5}
        disabled={disabled}
        onChange={(researchChecklist) => onChange({ ...interviewPrep, researchChecklist })}
      />

      <fieldset className="grid gap-4 rounded-[8px] border border-[#E8C77C] bg-[#FFF4D8] p-4">
        <legend className="px-2 font-serif text-[21px] text-[#6D4911]">Watch out for</legend>
        <TextAreaField
          id="glow-up-interview-risk"
          label="Likely probe"
          value={interviewPrep.watchOutFor.risk}
          disabled={disabled}
          onChange={(risk) => onChange({
            ...interviewPrep,
            watchOutFor: { ...interviewPrep.watchOutFor, risk },
          })}
        />
        <TextAreaField
          id="glow-up-interview-handling"
          label="How to handle it"
          value={interviewPrep.watchOutFor.handling}
          disabled={disabled}
          onChange={(handling) => onChange({
            ...interviewPrep,
            watchOutFor: { ...interviewPrep.watchOutFor, handling },
          })}
        />
      </fieldset>
    </section>
  );
}
