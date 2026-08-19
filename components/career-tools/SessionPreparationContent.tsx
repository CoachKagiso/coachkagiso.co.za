'use client';

import { useEffect, useState, type KeyboardEvent } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ClipboardCopy,
  Clock3,
  FileDown,
  Eye,
  FilePenLine,
  FileText,
  Link2,
  ListChecks,
  Loader2,
  MessageSquareText,
  NotebookTabs,
  RotateCcw,
  Save,
  X,
} from 'lucide-react';
import type {
  ClientSessionPreparationRecord,
  SessionPreparationFlowStep,
  SessionPreparationGroundedSource,
  SessionPreparationStagePriority,
} from '@/lib/client-session-preparation';
import SessionPreparationEditor from '@/components/career-tools/SessionPreparationEditor';
import SessionPreparationExportDialog from '@/components/career-tools/SessionPreparationExportDialog';
import SessionPreparationPrintView from '@/components/career-tools/SessionPreparationPrintView';
import {
  DEFAULT_SESSION_PREPARATION_EXPORT_OPTIONS,
  type SessionPreparationExportOptions,
} from '@/lib/client-session-preparation-export';

type PreparationView = 'guide' | 'lens';

const PRIORITY_LABELS: Record<SessionPreparationStagePriority, string> = {
  protect: 'Protect',
  standard: 'Standard',
  trim_first: 'Trim first',
};

const PRIORITY_STYLES: Record<SessionPreparationStagePriority, string> = {
  protect: 'border-[#9FB8A4] bg-[#EEF5EF] text-[#36553C]',
  standard: 'border-[#D8C8BB] bg-[#F8F6F4] text-[#6B5A50]',
  trim_first: 'border-[#E8C77C] bg-[#FFF4D8] text-[#765114]',
};

const SOURCE_LABELS: Record<SessionPreparationGroundedSource, string> = {
  intake: 'Intake',
  cv_analysis: 'CV analysis',
  earlier_diagnostic: 'Earlier diagnostic',
};

const DELIVERABLE_LABELS = {
  cv: 'CV',
  linkedin: 'LinkedIn',
  plan: 'Plan',
} as const;

function stageTiming(step: SessionPreparationFlowStep, index: number) {
  if (step.startMinute === null || step.endMinute === null) return `Stage ${index + 1}`;
  return `${step.startMinute}-${step.endMinute} min`;
}

function formatPreparationForCopy(preparation: ClientSessionPreparationRecord) {
  const { content } = preparation;
  const flow = content.conversationFlow.map((step, index) => [
    `${stageTiming(step, index)}: ${step.stage}${step.priority ? ` (${PRIORITY_LABELS[step.priority]})` : ''}`,
    step.purpose,
    step.deliverables.length
      ? `Feeds: ${step.deliverables.map((item) => DELIVERABLE_LABELS[item]).join(', ')}`
      : '',
    step.listenFor.length ? `Watch for: ${step.listenFor.join(' | ')}` : '',
  ].filter(Boolean).join('\n')).join('\n\n');
  const questions = content.priorityQuestions.map((item) => (
    `- ${item.priority === 'must_ask' ? '[Must ask] ' : item.priority === 'if_time' ? '[If time] ' : ''}${item.question}\n  ${item.whyItMatters}`
  )).join('\n');
  const grounded = content.groundedCoachNotes.map((item) => (
    `- [${SOURCE_LABELS[item.source]}] ${item.note}`
  )).join('\n');

  return [
    'SESSION FOCUS',
    content.sessionFocus,
    '',
    'OPENING FRAME',
    content.openingFrame,
    content.urgencyNote ? `\nURGENCY\n${content.urgencyNote}` : '',
    '',
    'CONVERSATION FLOW',
    flow,
    content.legacyListenFor.length
      ? `\nGENERAL NOTES FOR THIS SESSION\n${content.legacyListenFor.map((item) => `- ${item}`).join('\n')}`
      : '',
    '',
    'PRIORITY QUESTIONS',
    questions,
    '',
    'CLOSE WITH',
    content.closeWith.map((item) => `- ${item}`).join('\n'),
    grounded ? `\nGROUNDED NOTES\n${grounded}` : '',
    content.judgmentCalls.length
      ? `\nJUDGMENT CALLS - VERIFY WITH CLIENT\n${content.judgmentCalls.map((item) => `- ${item}`).join('\n')}`
      : '',
    content.legacyCoachNotes.length
      ? `\nLEGACY COACH NOTES - SOURCE NOT CLASSIFIED\n${content.legacyCoachNotes.map((item) => `- ${item}`).join('\n')}`
      : '',
  ].filter((item) => item !== '').join('\n');
}

function FlowStage({ step, index }: { step: SessionPreparationFlowStep; index: number }) {
  return (
    <li className="relative grid gap-3 border-b border-[#E4D8CB] py-6 last:border-b-0 md:grid-cols-[132px_minmax(0,1fr)] md:gap-6 md:py-7">
      <div className="md:border-r md:border-[#E8E3DF] md:pr-5">
        <span className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.1em] text-[#765F52]">
          <Clock3 className="h-4 w-4" />
          {stageTiming(step, index)}
        </span>
        {step.startMinute !== null && step.endMinute !== null && (
          <span className="mt-2 hidden text-[11px] font-bold uppercase tracking-[0.14em] text-[#9A8980] md:block">
            Stage {String(index + 1).padStart(2, '0')}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-serif text-[23px] leading-[1.15] tracking-[-0.01em] text-[#142334] md:text-[24px]">{step.stage}</h4>
          {step.priority && (
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${PRIORITY_STYLES[step.priority]}`}>
              {PRIORITY_LABELS[step.priority]}
            </span>
          )}
          {step.deliverables.map((deliverable) => (
            <span key={deliverable} className="rounded-full border border-[#C9AD98]/70 bg-[#F5F0EB] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#6B5143]">
              {DELIVERABLE_LABELS[deliverable]}
            </span>
          ))}
        </div>
        <p className="mt-3 max-w-3xl text-[15px] leading-[1.65] text-[#42505E]">{step.purpose}</p>
        {step.listenFor.length > 0 && (
          <details className="group mt-4 max-w-3xl border-y border-[#DDD3C9] bg-[#FAF8F6]">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] text-[#765F52]">
              <Eye className="h-4 w-4 shrink-0" />
              Listen for
              <span className="font-medium normal-case tracking-normal text-[#766C66]">
                {step.listenFor.length} {step.listenFor.length === 1 ? 'cue' : 'cues'}
              </span>
              <ChevronDown className="ml-auto h-4 w-4 transition group-open:rotate-180" />
            </summary>
            <ul className="grid gap-2 border-t border-[#E4D8CB] px-8 py-4 text-[14px] leading-[1.6] text-[#53473F]">
              {step.listenFor.map((cue) => <li key={cue} className="list-disc">{cue}</li>)}
            </ul>
          </details>
        )}
      </div>
    </li>
  );
}

export default function SessionPreparationContent({
  preparation,
  adminKey,
  clientName,
  onPreparationUpdated,
}: {
  preparation: ClientSessionPreparationRecord;
  adminKey: string;
  clientName: string;
  onPreparationUpdated: (preparation: ClientSessionPreparationRecord) => void;
}) {
  const [activeView, setActiveView] = useState<PreparationView>('guide');
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(preparation.content);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [printOptions, setPrintOptions] = useState<SessionPreparationExportOptions>(
    DEFAULT_SESSION_PREPARATION_EXPORT_OPTIONS,
  );
  const content = isEditing ? draftContent : preparation.content;
  const generatedContent = preparation.generatedContent || preparation.content;
  const isDirty = JSON.stringify(draftContent) !== JSON.stringify(preparation.content);
  const hasGeneratedChanges = JSON.stringify(draftContent) !== JSON.stringify(generatedContent);
  const mustAsk = content.priorityQuestions.filter((item) => item.priority !== 'if_time');
  const ifTime = content.priorityQuestions.filter((item) => item.priority === 'if_time');
  const groupedNotes = Object.entries(
    content.groundedCoachNotes.reduce<Record<string, typeof content.groundedCoachNotes>>((result, note) => {
      (result[note.source] ||= []).push(note);
      return result;
    }, {}),
  ) as Array<[SessionPreparationGroundedSource, typeof content.groundedCoachNotes]>;

  useEffect(() => {
    if (!isEditing || !isDirty) return;
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isDirty, isEditing]);

  function switchView(view: PreparationView) {
    setActiveView(view);
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    setActiveView((current) => current === 'guide' ? 'lens' : 'guide');
  }

  async function copyAll() {
    await navigator.clipboard.writeText(formatPreparationForCopy(preparation));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function beginEditing() {
    setDraftContent(preparation.content);
    setEditError('');
    setEditMessage('');
    setIsEditing(true);
  }

  function cancelEditing() {
    if (isDirty && !window.confirm('Discard the unsaved preparation changes?')) return;
    setDraftContent(preparation.content);
    setEditError('');
    setEditMessage('');
    setIsEditing(false);
  }

  async function saveChanges() {
    if (!isDirty || isSaving) return;
    setIsSaving(true);
    setEditError('');
    setEditMessage('');
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(preparation.paymentId)}/session-preparation`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          key: adminKey,
          preparationId: preparation.id,
          content: draftContent,
        }),
      });
      const data = await response.json().catch(() => null) as {
        preparation?: ClientSessionPreparationRecord;
        error?: string;
      } | null;
      if (!response.ok || !data?.preparation) {
        throw new Error(data?.error || 'Could not save the preparation changes.');
      }
      onPreparationUpdated(data.preparation);
      setDraftContent(data.preparation.content);
      setEditMessage('Working copy saved privately.');
      setIsEditing(false);
    } catch (caught) {
      setEditError(caught instanceof Error ? caught.message : 'Could not save the preparation changes.');
    } finally {
      setIsSaving(false);
    }
  }

  function printPreparation(options: SessionPreparationExportOptions) {
    setPrintOptions(options);
    setShowExportDialog(false);
    window.setTimeout(() => window.print(), 80);
  }

  return (
    <section className="overflow-hidden rounded-[8px] border border-[#E4D8CB] bg-white" aria-labelledby="session-preparation-focus">
      <header className="border-b border-[#E4D8CB] bg-[#FCFBFA] p-5 md:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="contents">
            <div className="flex flex-wrap items-center gap-2 lg:col-start-1 lg:row-start-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#765F52]">Session focus</p>
              <span className="rounded-full border border-[#D8C8BB] bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#6B5A50]">
                {preparation.serviceSlug === 'career-clarity' ? 'Career Clarity' : 'Glow Up VIP'} · 60 min · Microsoft Teams
              </span>
              {content.format === 'legacy' && (
                <span className="rounded-full border border-[#D8C8BB] bg-[#F5F0EB] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#6B5A50]">
                  Legacy prep
                </span>
              )}
            </div>
            <h3 id="session-preparation-focus" className="w-full font-serif text-[clamp(26px,2.6vw,34px)] leading-[1.08] tracking-[-0.02em] text-[#142334] lg:col-span-2">
              {content.sessionFocus}
            </h3>
            <p className="w-full text-[16px] leading-[1.65] text-[#42505E] lg:col-span-2">{content.openingFrame}</p>
          </div>
          {!isEditing && (
            <div className="flex shrink-0 flex-wrap gap-2 lg:col-start-2 lg:row-start-1">
              <button
                type="button"
                onClick={beginEditing}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-[#142334] px-4 text-[12px] font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[#29405A]"
              >
                <FilePenLine className="h-4 w-4" />
                Edit preparation
              </button>
              <button
                type="button"
                onClick={() => setShowExportDialog(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-[#A09086] bg-white px-4 text-[12px] font-bold uppercase tracking-[0.1em] text-[#142334] transition hover:bg-[#F5F3EE]"
              >
                <FileDown className="h-4 w-4" />
                Export
              </button>
              <button
                type="button"
                onClick={() => void copyAll()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-[#A09086] bg-white px-4 text-[12px] font-bold uppercase tracking-[0.1em] text-[#142334] transition hover:bg-[#F5F3EE]"
              >
                {copied ? <Check className="h-4 w-4 text-[#466B4D]" /> : <ClipboardCopy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy all'}
              </button>
            </div>
          )}
        </div>
        {content.urgencyNote && (
          <div className="mt-5 flex w-full items-start gap-3 rounded-[8px] border border-[#E8C77C] bg-[#FFF1CC] px-4 py-3.5 text-[14px] leading-[1.6] text-[#6D4911]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{content.urgencyNote}</p>
          </div>
        )}
      </header>

      {editMessage && !isEditing && (
        <p className="border-b border-[#B8CCBC] bg-[#F1F7F2] px-5 py-3 text-[14px] text-[#314A36]" role="status">{editMessage}</p>
      )}

      {isEditing ? (
        <div className="grid gap-6 p-5 md:p-6">
          <div className="flex flex-col gap-3 border-b border-[#E4D8CB] pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#765F52]">Private working copy</p>
              <p className="mt-1 text-[14px] leading-relaxed text-[#59636D]">The original AI-generated version remains unchanged.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!hasGeneratedChanges || isSaving}
                onClick={() => {
                  setDraftContent(generatedContent);
                  setEditError('');
                  setEditMessage('');
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-[8px] border border-[#A09086] bg-white px-3.5 text-[12px] font-bold uppercase tracking-[0.08em] text-[#142334] disabled:opacity-40"
              >
                <RotateCcw className="h-4 w-4" /> Restore generated
              </button>
              <button type="button" onClick={cancelEditing} disabled={isSaving} className="inline-flex min-h-11 items-center gap-2 rounded-[8px] border border-[#A09086] bg-white px-3.5 text-[12px] font-bold uppercase tracking-[0.08em] text-[#142334] disabled:opacity-40">
                <X className="h-4 w-4" /> Discard
              </button>
              <button type="button" onClick={() => void saveChanges()} disabled={!isDirty || isSaving} className="inline-flex min-h-11 items-center gap-2 rounded-[8px] bg-[#142334] px-4 text-[12px] font-bold uppercase tracking-[0.08em] text-white disabled:opacity-40">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
          {editError && <p className="rounded-[8px] border border-[#F4B6AA] bg-[#FFF5F2] px-4 py-3 text-[14px] leading-relaxed text-[#7A2F22]" role="alert">{editError}</p>}
          <SessionPreparationEditor content={draftContent} serviceSlug={preparation.serviceSlug} onChange={(next) => { setDraftContent(next); setEditError(''); setEditMessage(''); }} />
        </div>
      ) : (
        <>
      <div className="border-b border-[#E4D8CB] bg-white px-3 pt-3 md:px-6" role="tablist" aria-label="Session preparation views">
        {([
          { value: 'guide', label: 'Session Guide', icon: ListChecks },
          { value: 'lens', label: 'Coaching Lens', icon: NotebookTabs },
        ] as const).map((tab) => {
          const active = activeView === tab.value;
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              id={`session-preparation-tab-${tab.value}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`session-preparation-panel-${tab.value}`}
              tabIndex={active ? 0 : -1}
              onClick={() => switchView(tab.value)}
              onKeyDown={handleTabKeyDown}
              className={`mr-1 inline-flex min-h-12 items-center gap-2 border-b-2 px-3 text-[13px] font-bold uppercase tracking-[0.08em] transition ${
                active
                  ? 'border-[#142334] text-[#142334]'
                  : 'border-transparent text-[#6B6B6B] hover:border-[#C9AD98] hover:text-[#142334]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeView === 'guide' ? (
        <div
          id="session-preparation-panel-guide"
          role="tabpanel"
          aria-labelledby="session-preparation-tab-guide"
          className="grid gap-8 p-5 md:p-6"
        >
          {content.legacyListenFor.length > 0 && (
            <details className="group border-y border-[#142334] bg-[#142334]">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-white">
                <Eye className="h-4 w-4 shrink-0" />
                <span>
                  <span className="block text-[12px] font-bold uppercase tracking-[0.12em]">General notes for this session</span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-white/70">Legacy prep · These cues were not mapped to individual stages.</span>
                </span>
                <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-white/80 transition group-open:rotate-180" />
              </summary>
              <ul className="grid gap-x-8 gap-y-3 border-t border-white/15 px-8 py-5 text-[14px] leading-[1.6] text-white/85 md:grid-cols-2">
                {content.legacyListenFor.map((cue) => <li key={cue} className="list-disc marker:text-white/55">{cue}</li>)}
              </ul>
            </details>
          )}

          <section aria-labelledby="conversation-flow-title">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-[#8C7466]" />
              <h4 id="conversation-flow-title" className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#765F52]">
                {content.format === 'timed_v3' ? 'Timed conversation flow' : 'Conversation flow'}
              </h4>
            </div>
            <ol className="mt-4 border-y border-[#E4D8CB] bg-white">
              {content.conversationFlow.map((step, index) => (
                <FlowStage key={`${step.stage}-${index}`} step={step} index={index} />
              ))}
            </ol>
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]" aria-labelledby="priority-questions-title">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-[#8C7466]" />
                <h4 id="priority-questions-title" className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#765F52]">
                  {content.format === 'timed_v3' ? 'Must-ask questions' : 'Priority questions'}
                </h4>
              </div>
              <ol className="mt-4 border-y border-[#D8C8BB]">
                {mustAsk.map((item, index) => (
                  <li key={item.question} className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 border-b border-[#E8E3DF] py-5 last:border-b-0 md:grid-cols-[44px_minmax(0,1fr)] md:gap-4">
                    <span className="font-serif text-[24px] leading-none text-[#A99080]" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      {item.priority === 'must_ask' && (
                        <span className="rounded-full bg-[#DCEBFF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#315D91]">Must ask</span>
                      )}
                      <p className={`${item.priority === 'must_ask' ? 'mt-3' : ''} text-[16px] font-bold leading-[1.45] text-[#142334]`}>{item.question}</p>
                      <p className="mt-2 max-w-3xl text-[14px] leading-[1.6] text-[#6B6B6B]">{item.whyItMatters}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {ifTime.length > 0 && (
                <details className="group mt-4 border-y border-[#E4D8CB] bg-[#FCFBFA]">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[12px] font-bold uppercase tracking-[0.1em] text-[#6B6B6B]">
                    If time · {ifTime.length} optional {ifTime.length === 1 ? 'question' : 'questions'}
                    <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                  </summary>
                  <div className="border-t border-[#E4D8CB] px-4">
                    {ifTime.map((item) => (
                      <article key={item.question} className="border-b border-[#E8E3DF] py-4 last:border-b-0">
                        <p className="text-[15px] font-bold leading-[1.5] text-[#142334]">{item.question}</p>
                        <p className="mt-2 text-[14px] leading-[1.6] text-[#6B6B6B]">{item.whyItMatters}</p>
                      </article>
                    ))}
                  </div>
                </details>
              )}
            </div>

            <aside className="rounded-[8px] border border-[#B8CCBC] bg-[#F1F7F2] p-5 lg:sticky lg:top-5 lg:self-start" aria-labelledby="close-with-title">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-[#466B4D]" />
                <h4 id="close-with-title" className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#466B4D]">Close with</h4>
              </div>
              <ul className="mt-4 grid gap-4 text-[14px] leading-[1.6] text-[#314A36]">
                {content.closeWith.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </section>
        </div>
      ) : (
        <div
          id="session-preparation-panel-lens"
          role="tabpanel"
          aria-labelledby="session-preparation-tab-lens"
          className="grid gap-8 p-5 md:p-6"
        >
          <div className="max-w-3xl border-b border-[#E4D8CB] pb-6">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#765F52]">Private coaching briefing</p>
            <p className="mt-2 font-serif text-[26px] leading-[1.2] tracking-[-0.01em] text-[#142334] md:text-[28px]">
              Context to review before the conversation.
            </p>
            <p className="mt-3 text-[15px] leading-[1.65] text-[#59636D]">
              Use grounded notes as context. Treat hypotheses and legacy notes as prompts to verify with the client.
            </p>
          </div>

          {groupedNotes.length > 0 && (
            <section aria-labelledby="grounded-notes-title">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-[#8C7466]" />
                <h4 id="grounded-notes-title" className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#765F52]">Grounded notes</h4>
              </div>
              <div className="mt-4 border-y border-[#E4D8CB]">
                {groupedNotes.map(([source, notes]) => (
                  <article key={source} className="grid gap-3 border-b border-[#E4D8CB] py-5 last:border-b-0 md:grid-cols-[160px_minmax(0,1fr)] md:gap-8 md:py-6">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#8C7466]" />
                      <h5 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#765F52]">{SOURCE_LABELS[source]}</h5>
                    </div>
                    <ul className="grid max-w-3xl gap-3 text-[15px] leading-[1.65] text-[#374552]">
                      {notes.map((item) => <li key={item.note} className="list-disc marker:text-[#A99080]">{item.note}</li>)}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          )}

          {content.judgmentCalls.length > 0 && (
            <section className="border-l-4 border-[#D8A84E] bg-[#FFF4D8] px-5 py-5 md:px-6" aria-labelledby="judgment-calls-title">
              <div className="flex items-center gap-2 text-[#6D4911]">
                <AlertTriangle className="h-4 w-4" />
                <h4 id="judgment-calls-title" className="text-[12px] font-bold uppercase tracking-[0.14em]">Hypothesis · Verify with client</h4>
              </div>
              <ul className="mt-4 grid max-w-4xl gap-3 pl-5 text-[15px] leading-[1.65] text-[#6D4911]">
                {content.judgmentCalls.map((item) => <li key={item} className="list-disc">{item}</li>)}
              </ul>
            </section>
          )}

          {content.legacyCoachNotes.length > 0 && (
            <section className="border-y border-[#D8C8BB] bg-[#F8F6F4] px-5 py-5 md:px-6" aria-labelledby="legacy-notes-title">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#8C7466]" />
                <h4 id="legacy-notes-title" className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#765F52]">Legacy coach notes · Source not classified</h4>
              </div>
              <p className="mt-3 max-w-3xl text-[14px] leading-[1.6] text-[#6B6B6B]">These notes predate source separation. Verify them before relying on them.</p>
              <ul className="mt-4 grid max-w-4xl gap-3 pl-5 text-[15px] leading-[1.65] text-[#374552]">
                {content.legacyCoachNotes.map((item) => <li key={item} className="list-disc marker:text-[#A99080]">{item}</li>)}
              </ul>
            </section>
          )}

          {groupedNotes.length === 0 && content.judgmentCalls.length === 0 && content.legacyCoachNotes.length === 0 && (
            <div className="grid min-h-52 place-items-center rounded-[8px] border border-dashed border-[#D8C8BB] bg-[#FCFBFA] p-6 text-center">
              <div>
                <NotebookTabs className="mx-auto h-8 w-8 text-[#C9AD98]" />
                <p className="mt-3 font-serif text-[24px] text-[#142334]">No private coaching notes in this preparation.</p>
              </div>
            </div>
          )}
        </div>
      )}
        </>
      )}
      <SessionPreparationPrintView
        preparation={preparation}
        clientName={clientName}
        options={printOptions}
      />
      {showExportDialog && (
        <SessionPreparationExportDialog
          preparation={preparation}
          adminKey={adminKey}
          clientName={clientName}
          onClose={() => setShowExportDialog(false)}
          onPrint={printPreparation}
        />
      )}
    </section>
  );
}
