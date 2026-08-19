'use client';

import { useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Loader2, Save, XCircle } from 'lucide-react';
import type { ClientStrategyCheckpointStatus } from '@/lib/client-strategy-follow-up';
import type { ClientStrategyCheckpoint } from '@/lib/client-strategy-follow-up-store';
import AutoGrowTextarea from '@/components/career-tools/AutoGrowTextarea';

function dateInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Africa/Johannesburg',
  }).format(date);
}

const STATUS_OPTIONS: Array<{
  value: ClientStrategyCheckpointStatus;
  label: string;
  icon: typeof Clock3;
}> = [
  { value: 'pending', label: 'Pending', icon: Clock3 },
  { value: 'done', label: 'Done', icon: CheckCircle2 },
  { value: 'not_done', label: 'Not done', icon: XCircle },
];

export default function ClientStrategyCheckpointCard({
  adminKey,
  paymentId,
  planId,
  checkpoint,
  onSaved,
}: {
  adminKey: string;
  paymentId: string;
  planId: string;
  checkpoint: ClientStrategyCheckpoint;
  onSaved: (checkpoint: ClientStrategyCheckpoint) => void;
}) {
  const [status, setStatus] = useState<ClientStrategyCheckpointStatus>(checkpoint.status);
  const [dueDate, setDueDate] = useState(dateInputValue(checkpoint.dueAt));
  const [notes, setNotes] = useState(checkpoint.notes);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function save() {
    if (isSaving || !dueDate) return;
    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(
        `/api/clients/${encodeURIComponent(paymentId)}/strategy-plan/${encodeURIComponent(planId)}/follow-up/checkpoints/${encodeURIComponent(checkpoint.id)}`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            key: adminKey,
            status,
            dueAt: new Date(`${dueDate}T10:00:00+02:00`).toISOString(),
            notes,
          }),
        },
      );
      const data = await response.json().catch(() => null) as {
        checkpoint?: ClientStrategyCheckpoint;
        error?: string;
      } | null;
      if (!response.ok || !data?.checkpoint) {
        throw new Error(data?.error || 'Could not save this follow-up.');
      }

      onSaved(data.checkpoint);
      setStatus(data.checkpoint.status);
      setDueDate(dateInputValue(data.checkpoint.dueAt));
      setNotes(data.checkpoint.notes);
      setMessage('Follow-up details saved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this follow-up.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="rounded-[8px] border border-[#D8C8BB] bg-white p-5">
      <header className="flex flex-col gap-3 border-b border-[#E4D8CB] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">{checkpoint.windowLabel}</p>
          <h5 className="mt-2 font-serif text-[25px] leading-tight text-[#142334]">{checkpoint.label}</h5>
          {checkpoint.isLegacy && (
            <p className="mt-2 text-[12px] leading-relaxed text-[#6B6B6B]">Legacy follow-up record retained from the earlier schedule.</p>
          )}
        </div>
        <span className={`w-fit rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] ${
          status === 'done'
            ? 'bg-[#EAF2EB] text-[#466B4D]'
            : status === 'not_done'
              ? 'bg-[#F0EDE9] text-[#6B6B6B]'
              : 'bg-[#FFF4DB] text-[#76541D]'
        }`}>
          {status === 'not_done' ? 'Not done' : status}
        </span>
      </header>

      <div className="mt-5 grid gap-5">
        <label htmlFor={`checkpoint-date-${checkpoint.id}`} className="grid gap-2">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.13em] text-[#8C7466]">
            <CalendarDays className="h-4 w-4" /> Agreed date
          </span>
          <input
            id={`checkpoint-date-${checkpoint.id}`}
            type="date"
            value={dueDate}
            onChange={(event) => { setDueDate(event.target.value); setMessage(''); }}
            className="h-12 rounded-[8px] border border-[#D8C8BB] bg-[#FBFAF8] px-4 text-[15px] text-[#142334] outline-none transition focus:border-[#142334] focus:ring-2 focus:ring-[#C9AD98]/30"
          />
          <span className="text-[12px] leading-relaxed text-[#6B6B6B]">The window is guidance. Adjust this to the date agreed with the client.</span>
        </label>

        <fieldset className="grid gap-2">
          <legend className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#8C7466]">Status</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {STATUS_OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = status === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => { setStatus(option.value); setMessage(''); }}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border px-3 text-[11px] font-bold uppercase tracking-[0.1em] transition ${
                    selected
                      ? 'border-[#142334] bg-[#142334] text-white'
                      : 'border-[#D8C8BB] bg-white text-[#142334] hover:border-[#8C7466]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label htmlFor={`checkpoint-notes-${checkpoint.id}`} className="grid gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#8C7466]">Notes</span>
          <AutoGrowTextarea
            id={`checkpoint-notes-${checkpoint.id}`}
            value={notes}
            maxLength={4000}
            onChange={(event) => { setNotes(event.target.value); setMessage(''); }}
            placeholder="What was followed up, what changed, and what—if anything—needs attention?"
            className="min-h-32 w-full rounded-[8px] border border-[#D8C8BB] bg-[#FBFAF8] px-4 py-3 text-[15px] leading-relaxed text-[#142334] outline-none transition focus:border-[#142334] focus:ring-2 focus:ring-[#C9AD98]/30"
          />
          <span className="text-right text-[11px] text-[#6B6B6B]">{notes.length}/4000</span>
        </label>

        {error && <p role="alert" className="text-[12px] font-semibold text-[#7A2F22]">{error}</p>}
        {message && <p role="status" className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#466B4D]"><CheckCircle2 className="h-4 w-4" />{message}</p>}

        <button
          type="button"
          disabled={isSaving || !dueDate}
          onClick={() => void save()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#142334] px-5 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#466B4D] disabled:cursor-not-allowed disabled:opacity-45 sm:justify-self-end"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSaving ? 'Saving...' : 'Save follow-up'}
        </button>
      </div>
    </article>
  );
}
