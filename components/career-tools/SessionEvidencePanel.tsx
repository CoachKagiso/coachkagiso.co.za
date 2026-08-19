'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
  LockKeyhole,
  Paperclip,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { buildDashboardAuthUrl } from '@/lib/dashboard-auth-url';
import {
  MAX_SESSION_EVIDENCE_CONTEXT_CHARACTERS,
  type SessionDebriefSuggestionValues,
  type SessionDebriefSuggestions,
  type SessionEvidenceQuestionPriority,
} from '@/lib/client-session-evidence';
import type { ClientStrategyServiceSlug, SessionDebrief } from '@/lib/client-strategy';
import AutoGrowTextarea from '@/components/career-tools/AutoGrowTextarea';
import { renderRichText } from '@/components/career-tools/RichText';

type EvidenceView = {
  id: string;
  version: number;
  fileName: string | null;
  contentType: string | null;
  extension: string | null;
  sizeBytes: number | null;
  extractedText: string;
  extractionTruncated: boolean;
  additionalContext: string;
  createdAt: string;
};

type PreparationQuestion = {
  question: string;
  whyItMatters: string;
  priority: SessionEvidenceQuestionPriority;
};

type EvidenceResponse = {
  storageReady?: boolean;
  evidence?: EvidenceView | null;
  preparation?: {
    id: string;
    version: number;
    questions: PreparationQuestion[];
  } | null;
  error?: string;
};

type SuggestionResponse = {
  suggestionId?: string;
  suggestions?: SessionDebriefSuggestions;
  error?: string;
};

function formatFileSize(size: number | null) {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSavedTime(value: string) {
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date(value));
}

const SUGGESTION_FIELDS: Array<{
  key: keyof SessionDebriefSuggestionValues;
  label: string;
  serviceSlug?: ClientStrategyServiceSlug;
}> = [
  { key: 'clarityShift', label: 'What shifted' },
  { key: 'commitments', label: 'Commitments' },
  { key: 'sensitivityNotes', label: 'Sensitivity notes' },
  { key: 'interviewStoryEvidence', label: 'Interview story evidence', serviceSlug: 'glow-up-vip' },
];

export default function SessionEvidencePanel({
  adminKey,
  paymentId,
  serviceSlug,
  debrief,
  onApplySuggestions,
}: {
  adminKey: string;
  paymentId: string;
  serviceSlug: ClientStrategyServiceSlug;
  debrief: SessionDebrief;
  onApplySuggestions: (suggestions: SessionDebriefSuggestionValues) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [evidence, setEvidence] = useState<EvidenceView | null>(null);
  const [preparation, setPreparation] = useState<EvidenceResponse['preparation']>(null);
  const [storageReady, setStorageReady] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [additionalContext, setAdditionalContext] = useState('');
  const [suggestions, setSuggestions] = useState<SessionDebriefSuggestions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const mustAskQuestions = useMemo(
    () => (preparation?.questions || []).filter((question) => question.priority === 'must_ask'),
    [preparation],
  );
  const otherQuestions = useMemo(
    () => (preparation?.questions || []).filter((question) => question.priority !== 'must_ask'),
    [preparation],
  );
  const contextDirty = additionalContext !== (evidence?.additionalContext || '');
  const canSave = storageReady && !isSaving && (Boolean(selectedFile) || contextDirty);
  const canSuggest = storageReady && Boolean(evidence?.id) &&
    Boolean(evidence?.extractedText || evidence?.additionalContext) &&
    Boolean(preparation?.id) && !isSuggesting;

  useEffect(() => {
    const controller = new AbortController();

    async function loadEvidence() {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(
          buildDashboardAuthUrl(`/api/clients/${encodeURIComponent(paymentId)}/session-evidence`, adminKey),
          { signal: controller.signal },
        );
        const data = await response.json().catch(() => null) as EvidenceResponse | null;
        if (!response.ok) throw new Error(data?.error || 'Could not load session evidence.');
        setStorageReady(data?.storageReady !== false);
        setEvidence(data?.evidence || null);
        setPreparation(data?.preparation || null);
        setAdditionalContext(data?.evidence?.additionalContext || '');
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setError(caught instanceof Error ? caught.message : 'Could not load session evidence.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadEvidence();
    return () => controller.abort();
  }, [adminKey, paymentId]);

  async function saveEvidence(options: { removeFile?: boolean } = {}) {
    if (!storageReady || isSaving) return;
    setIsSaving(true);
    setError('');
    setStatus('');
    setSuggestions(null);

    try {
      const formData = new FormData();
      formData.set('key', adminKey);
      formData.set('additionalContext', additionalContext);
      if (selectedFile) formData.set('file', selectedFile);
      if (options.removeFile) formData.set('removeFile', 'true');

      const response = await fetch(
        `/api/clients/${encodeURIComponent(paymentId)}/session-evidence`,
        { method: 'POST', body: formData },
      );
      const data = await response.json().catch(() => null) as EvidenceResponse | null;
      if (!response.ok || !data?.evidence) {
        throw new Error(data?.error || 'Could not save session evidence.');
      }

      setEvidence(data.evidence);
      setAdditionalContext(data.evidence.additionalContext || '');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setStatus(`Private evidence revision ${data.evidence.version} saved.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save session evidence.');
    } finally {
      setIsSaving(false);
    }
  }

  async function removeCurrentFile() {
    if (!evidence?.fileName) return;
    const confirmed = window.confirm(
      'Remove this file from the current evidence draft? The earlier private revision remains in the audit history.',
    );
    if (!confirmed) return;
    await saveEvidence({ removeFile: true });
  }

  async function suggestDebrief() {
    if (!evidence || !canSuggest) return;
    setIsSuggesting(true);
    setError('');
    setStatus('');
    try {
      const response = await fetch(
        `/api/clients/${encodeURIComponent(paymentId)}/session-evidence/suggest`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key: adminKey, evidenceId: evidence.id }),
        },
      );
      const data = await response.json().catch(() => null) as SuggestionResponse | null;
      if (!response.ok || !data?.suggestions) {
        throw new Error(data?.error || 'Could not suggest the session debrief.');
      }
      setSuggestions(data.suggestions);
      setStatus('Suggestions are ready for review. Nothing has been added to the debrief yet.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not suggest the session debrief.');
    } finally {
      setIsSuggesting(false);
    }
  }

  function applySuggestions() {
    if (!suggestions) return;
    const hasExistingDebrief = Object.values(debrief).some((value) => value.trim());
    if (
      hasExistingDebrief &&
      !window.confirm('Apply these reviewed suggestions? Non-empty suggested fields will replace the current text in the matching debrief fields.')
    ) {
      return;
    }
    onApplySuggestions(suggestions.debrief);
    setStatus('Suggestions applied to the debrief below. Review and save the debrief when ready.');
  }

  return (
    <section className="overflow-hidden rounded-[8px] border border-[#E4D8CB] bg-white">
      <header className="grid gap-5 border-b border-[#E4D8CB] px-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[#8C7466]">
            <LockKeyhole className="h-4 w-4" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">Private session evidence</p>
          </div>
          <h3 className="mt-2 font-serif text-[30px] leading-tight text-[#142334]">
            Bring the conversation back into view
          </h3>
          <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-[#142334]/65">
            Upload a text transcript or notes, then add any context that is not in the file. Saving does not run AI or change the debrief.
          </p>
        </div>
        {evidence && (
          <div className="rounded-full bg-[#F5F3EE] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">
            Evidence revision {evidence.version}
          </div>
        )}
      </header>

      {!storageReady ? (
        <div className="m-5 rounded-[8px] border border-[#D8A23D] bg-[#FFF6DF] px-4 py-4 text-[13px] leading-relaxed text-[#6E4B0D]">
          Session evidence storage is awaiting the pending database migration. The existing debrief and plan remain available.
        </div>
      ) : (
        <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="grid content-start gap-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">1. Add source material</p>
              <label
                htmlFor="session-evidence-file"
                className="mt-3 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-[8px] border border-dashed border-[#A09086] bg-[#F8F6F4] px-4 py-5 text-center transition hover:border-[#142334] hover:bg-white"
              >
                <Upload className="h-5 w-5 text-[#8C7466]" />
                <span className="mt-2 text-[13px] font-bold text-[#142334]">
                  {selectedFile ? selectedFile.name : evidence?.fileName ? 'Replace transcript or notes' : 'Upload transcript or notes'}
                </span>
                <span className="mt-1 text-[11px] text-[#6B6B6B]">PDF with readable text, DOCX, TXT, or MD · 8MB maximum</span>
              </label>
              <input
                ref={fileInputRef}
                id="session-evidence-file"
                type="file"
                accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                className="sr-only"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] || null);
                  setStatus('');
                  setError('');
                }}
              />
              {selectedFile && (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-[8px] bg-[#142334] px-3 py-2 text-white">
                  <span className="min-w-0 truncate text-[12px] font-semibold">{selectedFile.name}</span>
                  <button
                    type="button"
                    aria-label="Clear selected session evidence file"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <label className="grid gap-2" htmlFor="session-evidence-context">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">Additional context</span>
              <span className="text-[12px] leading-relaxed text-[#142334]/58">
                Add details from your notepad, observations after the call, or context the transcript does not capture.
              </span>
              <AutoGrowTextarea
                id="session-evidence-context"
                value={additionalContext}
                onChange={(event) => {
                  setAdditionalContext(event.target.value);
                  setStatus('');
                }}
                rows={7}
                maxLength={MAX_SESSION_EVIDENCE_CONTEXT_CHARACTERS}
                placeholder="Paste additional session notes or context here..."
                className="min-h-40 rounded-[8px] border border-[#D8C8BB] bg-[#F8F6F4] px-4 py-3 text-[14px] leading-relaxed text-[#142334] outline-none transition placeholder:text-[#A09086] focus:border-[#142334] focus:bg-white focus:ring-2 focus:ring-[#C9AD98]/30"
              />
              <span className="text-right text-[10px] text-[#6B6B6B]">
                {additionalContext.length}/{MAX_SESSION_EVIDENCE_CONTEXT_CHARACTERS.toLocaleString('en-ZA')}
              </span>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!canSave}
                onClick={() => void saveEvidence()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#142334] px-5 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334] disabled:cursor-not-allowed disabled:bg-[#D8C8BB] disabled:text-[#142334]/45"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                {isSaving ? 'Saving evidence...' : evidence ? 'Save new revision' : 'Save evidence'}
              </button>
              {evidence?.fileName && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void removeCurrentFile()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-[#D8C8BB] px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7A2F22] transition hover:border-[#C98672] hover:bg-[#FFF5F2]"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove current file
                </button>
              )}
            </div>
          </div>

          <div className="grid content-start gap-4">
            <div className="rounded-[8px] bg-[#F5F3EE] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">Saved source preview</p>
                  {evidence?.fileName ? (
                    <p className="mt-2 flex items-center gap-2 text-[13px] font-bold text-[#142334]">
                      <FileText className="h-4 w-4 text-[#8C7466]" />
                      {evidence.fileName}
                      <span className="font-normal text-[#6B6B6B]">{formatFileSize(evidence.sizeBytes)}</span>
                    </p>
                  ) : (
                    <p className="mt-2 text-[13px] text-[#6B6B6B]">No file is attached to the current evidence revision.</p>
                  )}
                </div>
                {evidence && (
                  <span className="text-[10px] text-[#6B6B6B]">{formatSavedTime(evidence.createdAt)}</span>
                )}
              </div>

              {evidence?.extractedText && (
                <details className="group mt-4 rounded-[8px] border border-[#D8C8BB] bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[12px] font-bold text-[#142334]">
                    Review extracted text
                    <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                  </summary>
                  <div className="border-t border-[#E4D8CB] px-4 py-4">
                    <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-[#142334]/72">
                      {evidence.extractedText.slice(0, 6000)}
                      {evidence.extractedText.length > 6000 ? '\n\n[Preview shortened in the browser]' : ''}
                    </pre>
                    {evidence.extractionTruncated && (
                      <p className="mt-3 text-[11px] font-semibold text-[#8C7466]">
                        The extracted text reached the safe processing limit. The original private file is preserved.
                      </p>
                    )}
                  </div>
                </details>
              )}
            </div>

            <div className="rounded-[8px] border border-[#D8C8BB] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">Must-ask reference</p>
                {preparation && (
                  <span className="text-[10px] font-semibold text-[#6B6B6B]">Prep v{preparation.version}</span>
                )}
              </div>
              {mustAskQuestions.length ? (
                <ol className="mt-3 grid gap-2">
                  {mustAskQuestions.map((question, index) => (
                    <li key={`${question.question}-${index}`} className="grid grid-cols-[auto_1fr] gap-3 text-[13px] leading-relaxed text-[#142334]">
                      <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-[#D9E9FF] text-[10px] font-bold text-[#245B91]">
                        {index + 1}
                      </span>
                      <span>{question.question}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-[12px] leading-relaxed text-[#6B6B6B]">
                  {preparation ? 'This legacy preparation has no must-ask labels.' : 'No saved session preparation is available yet.'}
                </p>
              )}
              {otherQuestions.length > 0 && (
                <details className="group mt-3 border-t border-[#E4D8CB] pt-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-bold uppercase tracking-[0.1em] text-[#8C7466]">
                    Other session questions ({otherQuestions.length})
                    <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                  </summary>
                  <ul className="mt-3 grid gap-2 text-[12px] leading-relaxed text-[#142334]/72">
                    {otherQuestions.map((question) => <li key={question.question}>• {question.question}</li>)}
                  </ul>
                </details>
              )}
            </div>

            <button
              type="button"
              disabled={!canSuggest}
              onClick={() => void suggestDebrief()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] bg-[#C9AD98] px-5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#142334] transition hover:bg-[#142334] hover:text-white disabled:cursor-not-allowed disabled:bg-[#E4D8CB] disabled:text-[#142334]/40"
            >
              {isSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isSuggesting ? 'Reviewing evidence...' : 'Suggest debrief from evidence'}
            </button>
            <p className="-mt-2 text-[11px] leading-relaxed text-[#6B6B6B]">
              This is the only action that sends the saved evidence to the configured AI provider. Suggestions remain private and require review.
            </p>
          </div>
        </div>
      )}

      {(error || status) && (
        <div className="border-t border-[#E4D8CB] px-5 py-4">
          {error && <p role="alert" className="text-[13px] font-semibold text-[#7A2F22]">{error}</p>}
          {status && (
            <p role="status" className="flex items-center gap-2 text-[13px] font-semibold text-[#466B4D]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {status}
            </p>
          )}
        </div>
      )}

      {suggestions && (
        <div className="border-t border-[#E4D8CB] bg-[#FBFAF8] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">Review before applying</p>
              <h4 className="mt-1 font-serif text-[24px] text-[#142334]">Suggested debrief</h4>
            </div>
            <button
              type="button"
              onClick={() => setSuggestions(null)}
              className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#6B6B6B] hover:text-[#142334]"
            >
              <X className="h-4 w-4" />
              Discard
            </button>
          </div>

          {suggestions.questionNotes.length > 0 && (
            <div className="mt-4 rounded-[8px] bg-[#142334] p-4 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">Answers found in the evidence</p>
              <div className="mt-3 grid gap-3">
                {suggestions.questionNotes.map((note) => (
                  <div key={note.questionIndex}>
                    <p className="text-[12px] font-bold leading-relaxed">{note.question}</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-white/72">{note.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {SUGGESTION_FIELDS.filter((field) => !field.serviceSlug || field.serviceSlug === serviceSlug).map((field) => (
              <div key={field.key} className="rounded-[8px] border border-[#D8C8BB] bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">{field.label}</p>
                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-[1.65] text-[#142334]/78">
                  {suggestions.debrief[field.key]
                    ? renderRichText(suggestions.debrief[field.key])
                    : 'No supported suggestion found.'}
                </p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={applySuggestions}
            className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#142334] px-5 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
          >
            <Sparkles className="h-4 w-4" />
            Apply suggestions to debrief
          </button>
        </div>
      )}
    </section>
  );
}
