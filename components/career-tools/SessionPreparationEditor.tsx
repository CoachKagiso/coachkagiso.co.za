'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type {
  ClientSessionPreparationContent,
  SessionPreparationDeliverable,
  SessionPreparationFlowStep,
  SessionPreparationGroundedNote,
  SessionPreparationQuestion,
} from '@/lib/client-session-preparation';
import AutoGrowTextarea from '@/components/career-tools/AutoGrowTextarea';

const FIELD_CLASS =
  'w-full rounded-[8px] border border-[#D8C8BB] bg-[#F8F6F4] px-3.5 py-3 text-[14px] leading-[1.55] text-[#142334] outline-none transition focus:border-[#142334] focus:bg-white focus:ring-2 focus:ring-[#C9AD98]/30';
const LABEL_CLASS = 'text-[11px] font-bold uppercase tracking-[0.12em] text-[#765F52]';

function TextField({
  id,
  label,
  value,
  rows = 3,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="grid gap-2">
      <span className={LABEL_CLASS}>{label}</span>
      <AutoGrowTextarea id={id} value={value} rows={rows} maxLength={900} onChange={(event) => onChange(event.target.value)} className={FIELD_CLASS} />
    </label>
  );
}

function ListField({
  id,
  label,
  values,
  minimum,
  maximum = 6,
  onChange,
}: {
  id: string;
  label: string;
  values: string[];
  minimum: number;
  maximum?: number;
  onChange: (values: string[]) => void;
}) {
  return (
    <label htmlFor={id} className="grid gap-2">
      <span className={LABEL_CLASS}>{label}</span>
      <AutoGrowTextarea
        id={id}
        value={values.join('\n')}
        rows={Math.max(3, Math.min(6, values.length + 1))}
        maxLength={6000}
        onChange={(event) => onChange(event.target.value.split(/\r?\n/).slice(0, maximum))}
        className={FIELD_CLASS}
      />
      <span className="text-[12px] leading-relaxed text-[#6B6B6B]">One item per line · {minimum}-{maximum} items</span>
    </label>
  );
}

function FlowEditor({
  step,
  index,
  timed,
  vip,
  onChange,
}: {
  step: SessionPreparationFlowStep;
  index: number;
  timed: boolean;
  vip: boolean;
  onChange: (step: SessionPreparationFlowStep) => void;
}) {
  const deliverables: SessionPreparationDeliverable[] = ['cv', 'linkedin', 'plan'];

  return (
    <fieldset className="grid gap-4 border-t border-[#E4D8CB] py-5 first:border-t-0 first:pt-0">
      <legend className="font-serif text-[22px] text-[#142334]">Stage {index + 1}</legend>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField id={`prep-stage-${index}-title`} label="Stage title" value={step.stage} rows={2} onChange={(stage) => onChange({ ...step, stage })} />
        <TextField id={`prep-stage-${index}-purpose`} label="Purpose" value={step.purpose} rows={3} onChange={(purpose) => onChange({ ...step, purpose })} />
      </div>
      {timed && (
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-2">
            <span className={LABEL_CLASS}>Start minute</span>
            <input type="number" min={0} max={59} value={step.startMinute ?? ''} onChange={(event) => onChange({ ...step, startMinute: Number(event.target.value) })} className={FIELD_CLASS} />
          </label>
          <label className="grid gap-2">
            <span className={LABEL_CLASS}>End minute</span>
            <input type="number" min={1} max={60} value={step.endMinute ?? ''} onChange={(event) => onChange({ ...step, endMinute: Number(event.target.value) })} className={FIELD_CLASS} />
          </label>
          <label className="grid gap-2">
            <span className={LABEL_CLASS}>Priority</span>
            <select value={step.priority || 'standard'} onChange={(event) => onChange({ ...step, priority: event.target.value as SessionPreparationFlowStep['priority'] })} className={FIELD_CLASS}>
              <option value="protect">Protect</option>
              <option value="standard">Standard</option>
              <option value="trim_first">Trim first</option>
            </select>
          </label>
        </div>
      )}
      {vip && (
        <fieldset className="grid gap-2">
          <legend className={LABEL_CLASS}>Feeds these VIP deliverables</legend>
          <div className="flex flex-wrap gap-2">
            {deliverables.map((deliverable) => {
              const checked = step.deliverables.includes(deliverable);
              return (
                <label key={deliverable} className="inline-flex min-h-10 items-center gap-2 rounded-[8px] border border-[#D8C8BB] bg-white px-3 text-[13px] font-semibold text-[#142334]">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onChange({
                      ...step,
                      deliverables: checked
                        ? step.deliverables.filter((item) => item !== deliverable)
                        : [...step.deliverables, deliverable],
                    })}
                  />
                  {deliverable === 'cv' ? 'CV' : deliverable === 'linkedin' ? 'LinkedIn' : 'Plan'}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
      {timed && (
        <ListField id={`prep-stage-${index}-listen-for`} label="Listen for" values={step.listenFor} minimum={0} maximum={3} onChange={(listenFor) => onChange({ ...step, listenFor })} />
      )}
    </fieldset>
  );
}

function QuestionEditor({
  question,
  index,
  timed,
  canRemove,
  canMoveUp,
  canMoveDown,
  onChange,
  onRemove,
  onMove,
}: {
  question: SessionPreparationQuestion;
  index: number;
  timed: boolean;
  canRemove: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (question: SessionPreparationQuestion) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <article className="grid gap-4 border-t border-[#E4D8CB] py-5 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <p className="font-serif text-[21px] text-[#142334]">Question {index + 1}</p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={!canMoveUp} aria-label={`Move question ${index + 1} up`} className="grid h-9 w-9 place-items-center rounded-[6px] border border-[#D8C8BB] text-[#142334] disabled:opacity-35"><ArrowUp className="h-4 w-4" /></button>
          <button type="button" onClick={() => onMove(1)} disabled={!canMoveDown} aria-label={`Move question ${index + 1} down`} className="grid h-9 w-9 place-items-center rounded-[6px] border border-[#D8C8BB] text-[#142334] disabled:opacity-35"><ArrowDown className="h-4 w-4" /></button>
          <button type="button" onClick={onRemove} disabled={!canRemove} aria-label={`Remove question ${index + 1}`} className="grid h-9 w-9 place-items-center rounded-[6px] border border-[#E3B5AA] text-[#8A3D2E] disabled:opacity-35"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      <TextField id={`prep-question-${index}`} label="Question" value={question.question} rows={2} onChange={(value) => onChange({ ...question, question: value })} />
      <div className={`grid gap-4 ${timed ? 'md:grid-cols-[minmax(0,1fr)_180px]' : ''}`}>
        <TextField id={`prep-question-${index}-why`} label="Why it matters" value={question.whyItMatters} rows={2} onChange={(whyItMatters) => onChange({ ...question, whyItMatters })} />
        {timed && (
          <label className="grid content-start gap-2">
            <span className={LABEL_CLASS}>Priority</span>
            <select value={question.priority || 'if_time'} onChange={(event) => onChange({ ...question, priority: event.target.value as SessionPreparationQuestion['priority'] })} className={FIELD_CLASS}>
              <option value="must_ask">Must ask</option>
              <option value="if_time">If time</option>
            </select>
          </label>
        )}
      </div>
    </article>
  );
}

function GroundedNoteEditor({
  note,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  note: SessionPreparationGroundedNote;
  index: number;
  canRemove: boolean;
  onChange: (note: SessionPreparationGroundedNote) => void;
  onRemove: () => void;
}) {
  return (
    <article className="grid gap-3 border-t border-[#E4D8CB] py-4 first:border-t-0 first:pt-0 md:grid-cols-[180px_minmax(0,1fr)_40px]">
      <label className="grid content-start gap-2">
        <span className={LABEL_CLASS}>Source</span>
        <select value={note.source} onChange={(event) => onChange({ ...note, source: event.target.value as SessionPreparationGroundedNote['source'] })} className={FIELD_CLASS}>
          <option value="intake">Intake</option>
          <option value="cv_analysis">CV analysis</option>
          <option value="earlier_diagnostic">Earlier diagnostic</option>
        </select>
      </label>
      <TextField id={`prep-grounded-note-${index}`} label="Grounded note" value={note.note} rows={3} onChange={(value) => onChange({ ...note, note: value })} />
      <button type="button" onClick={onRemove} disabled={!canRemove} aria-label={`Remove grounded note ${index + 1}`} className="mt-[27px] grid h-10 w-10 place-items-center rounded-[6px] border border-[#E3B5AA] text-[#8A3D2E] disabled:opacity-35"><Trash2 className="h-4 w-4" /></button>
    </article>
  );
}

export default function SessionPreparationEditor({
  content,
  serviceSlug,
  onChange,
}: {
  content: ClientSessionPreparationContent;
  serviceSlug: 'career-clarity' | 'glow-up-vip';
  onChange: (content: ClientSessionPreparationContent) => void;
}) {
  const timed = content.format === 'timed_v3';
  const minimumQuestions = timed ? 3 : 4;
  const maximumQuestions = timed ? 5 : 7;

  function updateFlow(index: number, step: SessionPreparationFlowStep) {
    onChange({ ...content, conversationFlow: content.conversationFlow.map((item, itemIndex) => itemIndex === index ? step : item) });
  }

  function updateQuestion(index: number, question: SessionPreparationQuestion) {
    onChange({ ...content, priorityQuestions: content.priorityQuestions.map((item, itemIndex) => itemIndex === index ? question : item) });
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= content.priorityQuestions.length) return;
    const questions = [...content.priorityQuestions];
    [questions[index], questions[nextIndex]] = [questions[nextIndex], questions[index]];
    onChange({ ...content, priorityQuestions: questions });
  }

  return (
    <div className="grid gap-8">
      <section className="grid gap-4" aria-labelledby="prep-editor-frame-title">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#765F52]">Edit working copy</p>
          <h4 id="prep-editor-frame-title" className="mt-2 font-serif text-[28px] text-[#142334]">Session frame</h4>
        </div>
        <TextField id="prep-session-focus" label="Session focus" value={content.sessionFocus} rows={3} onChange={(sessionFocus) => onChange({ ...content, sessionFocus })} />
        <TextField id="prep-opening-frame" label="Opening frame" value={content.openingFrame} rows={4} onChange={(openingFrame) => onChange({ ...content, openingFrame })} />
        {timed && <TextField id="prep-urgency-note" label="Urgency note (optional)" value={content.urgencyNote} rows={2} onChange={(urgencyNote) => onChange({ ...content, urgencyNote })} />}
      </section>

      <section aria-labelledby="prep-editor-flow-title">
        <h4 id="prep-editor-flow-title" className="font-serif text-[28px] text-[#142334]">Conversation flow</h4>
        <p className="mt-2 text-[13px] leading-relaxed text-[#6B6B6B]">
          {timed ? 'Keep stages contiguous from minute 0 to minute 60.' : 'Legacy stages can be rewritten, but timing is not added automatically.'}
        </p>
        <div className="mt-5">
          {content.conversationFlow.map((step, index) => (
            <FlowEditor key={index} step={step} index={index} timed={timed} vip={timed && serviceSlug === 'glow-up-vip'} onChange={(next) => updateFlow(index, next)} />
          ))}
        </div>
      </section>

      <section aria-labelledby="prep-editor-questions-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 id="prep-editor-questions-title" className="font-serif text-[28px] text-[#142334]">Questions</h4>
            <p className="mt-2 text-[13px] text-[#6B6B6B]">{minimumQuestions}-{maximumQuestions} questions · timed preparations require 2-3 must-ask questions.</p>
          </div>
          <button
            type="button"
            disabled={content.priorityQuestions.length >= maximumQuestions}
            onClick={() => onChange({
              ...content,
              priorityQuestions: [...content.priorityQuestions, { question: '', whyItMatters: '', priority: timed ? 'if_time' : null }],
            })}
            className="inline-flex min-h-10 items-center gap-2 rounded-[8px] border border-[#A09086] bg-white px-3.5 text-[12px] font-bold uppercase tracking-[0.08em] text-[#142334] disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> Add question
          </button>
        </div>
        <div className="mt-5">
          {content.priorityQuestions.map((question, index) => (
            <QuestionEditor
              key={index}
              question={question}
              index={index}
              timed={timed}
              canRemove={content.priorityQuestions.length > minimumQuestions}
              canMoveUp={index > 0}
              canMoveDown={index < content.priorityQuestions.length - 1}
              onChange={(next) => updateQuestion(index, next)}
              onRemove={() => onChange({ ...content, priorityQuestions: content.priorityQuestions.filter((_, itemIndex) => itemIndex !== index) })}
              onMove={(direction) => moveQuestion(index, direction)}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-5" aria-labelledby="prep-editor-close-title">
        <h4 id="prep-editor-close-title" className="font-serif text-[28px] text-[#142334]">Close and private notes</h4>
        <ListField id="prep-close-with" label="Close with" values={content.closeWith} minimum={2} onChange={(closeWith) => onChange({ ...content, closeWith })} />
        {timed ? (
          <>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className={LABEL_CLASS}>Grounded coach notes</p>
                <button
                  type="button"
                  disabled={content.groundedCoachNotes.length >= 6}
                  onClick={() => onChange({ ...content, groundedCoachNotes: [...content.groundedCoachNotes, { source: 'intake', note: '' }] })}
                  className="inline-flex min-h-10 items-center gap-2 rounded-[8px] border border-[#A09086] bg-white px-3.5 text-[12px] font-bold uppercase tracking-[0.08em] text-[#142334] disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" /> Add note
                </button>
              </div>
              <div className="mt-4">
                {content.groundedCoachNotes.map((note, index) => (
                  <GroundedNoteEditor
                    key={index}
                    note={note}
                    index={index}
                    canRemove={content.groundedCoachNotes.length > 1}
                    onChange={(next) => onChange({ ...content, groundedCoachNotes: content.groundedCoachNotes.map((item, itemIndex) => itemIndex === index ? next : item) })}
                    onRemove={() => onChange({ ...content, groundedCoachNotes: content.groundedCoachNotes.filter((_, itemIndex) => itemIndex !== index) })}
                  />
                ))}
              </div>
            </div>
            <ListField id="prep-judgment-calls" label="Judgment calls (optional)" values={content.judgmentCalls} minimum={0} onChange={(judgmentCalls) => onChange({ ...content, judgmentCalls })} />
          </>
        ) : (
          <>
            <ListField id="prep-legacy-listen-for" label="General notes for this session" values={content.legacyListenFor} minimum={3} onChange={(legacyListenFor) => onChange({ ...content, legacyListenFor })} />
            <ListField id="prep-legacy-coach-notes" label="Legacy coach notes" values={content.legacyCoachNotes} minimum={2} onChange={(legacyCoachNotes) => onChange({ ...content, legacyCoachNotes })} />
          </>
        )}
      </section>
    </div>
  );
}
