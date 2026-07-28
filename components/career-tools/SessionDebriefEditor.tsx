import { CheckCircle2, Loader2, Save, ShieldCheck } from 'lucide-react';
import {
  SESSION_DEBRIEF_FIELDS,
  countCompletedDebriefFields,
  type SessionDebrief,
  type SessionDebriefFieldKey,
} from '@/lib/client-strategy';

type SessionDebriefEditorProps = {
  debrief: SessionDebrief;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string;
  savedMessage: string;
  version: number | null;
  updatedAt: string | null;
  onChange: (key: SessionDebriefFieldKey, value: string) => void;
  onSave: () => void;
};

function formatSavedTime(value: string | null) {
  if (!value) return 'Not saved yet';
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date(value));
}

export default function SessionDebriefEditor({
  debrief,
  isDirty,
  isLoading,
  isSaving,
  error,
  savedMessage,
  version,
  updatedAt,
  onChange,
  onSave,
}: SessionDebriefEditorProps) {
  const completedFields = countCompletedDebriefFields(debrief);
  const canSave = completedFields > 0 && isDirty && !isLoading && !isSaving;

  if (isLoading) {
    return (
      <div className="rounded-[8px] bg-white p-5" aria-busy="true" aria-label="Loading session debrief">
        <div className="h-6 w-52 animate-pulse rounded bg-[#E4D8CB]" />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-[8px] bg-[#F5F3EE]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <form
      className="rounded-[8px] bg-white p-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8C7466]">Session debrief</p>
          <h3 className="mt-2 font-serif text-[30px] leading-tight text-[#142334]">Turn the conversation into usable context</h3>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[#142334]/62">
            Capture what actually changed in the session. The saved revision becomes the source for the personalized plan below.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold text-[#142334]">{completedFields} of {SESSION_DEBRIEF_FIELDS.length} fields</p>
          <p className="mt-1 text-[10px] text-[#6B6B6B]">{version ? `Revision ${version}` : 'New draft'} · {formatSavedTime(updatedAt)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {SESSION_DEBRIEF_FIELDS.map((field, index) => {
          const fieldId = `session-debrief-${field.key}`;
          const fullWidth = index === SESSION_DEBRIEF_FIELDS.length - 1;
          return (
            <label key={field.key} htmlFor={fieldId} className={`grid gap-2 ${fullWidth ? 'md:col-span-2' : ''}`}>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">{field.label}</span>
              <span className="text-[12px] leading-relaxed text-[#142334]/52">{field.prompt}</span>
              <textarea
                id={fieldId}
                value={debrief[field.key]}
                onChange={(event) => onChange(field.key, event.target.value)}
                rows={fullWidth ? 3 : 5}
                maxLength={4000}
                className="min-h-32 resize-y rounded-[8px] border border-[#D8C8BB] bg-[#F8F6F4] px-4 py-3 text-[14px] leading-relaxed text-[#142334] outline-none transition placeholder:text-[#A09086] focus:border-[#142334] focus:bg-white focus:ring-2 focus:ring-[#C9AD98]/30"
                placeholder="Add the specific details that came from the session..."
              />
              <span className="text-right text-[10px] text-[#6B6B6B]">{debrief[field.key].length}/4000</span>
            </label>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mt-5 rounded-[8px] border border-[#C98672] bg-[#FFF5F2] px-4 py-3 text-[13px] font-semibold text-[#7A2F22]">
          {error}
        </p>
      )}

      {savedMessage && (
        <p role="status" className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-[#466B4D]">
          <CheckCircle2 className="h-4 w-4" />
          {savedMessage}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-3 border-t border-[#E4D8CB] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-[12px] leading-relaxed text-[#6B6B6B]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#8C7466]" />
          Draft only. Saving creates a private revision. Nothing is sent to the client.
        </div>
        <button
          type="submit"
          disabled={!canSave}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#142334] px-5 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334] disabled:cursor-not-allowed disabled:bg-[#D8C8BB] disabled:text-[#142334]/45"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSaving ? 'Saving debrief...' : 'Save debrief'}
        </button>
      </div>
    </form>
  );
}
