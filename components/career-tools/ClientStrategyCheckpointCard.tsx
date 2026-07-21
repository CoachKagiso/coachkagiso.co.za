'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Save } from 'lucide-react';
import FilterDropdown from '@/components/FilterDropdown';
import {
  CLIENT_STRATEGY_THEME_OPTIONS,
  type ClientStrategyProgressStatus,
  type ClientStrategyThemeKey,
} from '@/lib/client-strategy-follow-up';
import type { ClientStrategyCheckpoint } from '@/lib/client-strategy-follow-up-store';

const PROGRESS_OPTIONS = [
  { value: 'on_track', label: 'On track' },
  { value: 'partly_on_track', label: 'Partly on track' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'complete', label: 'Complete' },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date(value));
}

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
  onSaved: (checkpoint: ClientStrategyCheckpoint, themeReport: Array<{ key: string; label: string; clientCount: number }>) => void;
}) {
  const [progressStatus, setProgressStatus] = useState<ClientStrategyProgressStatus>(
    checkpoint.progressStatus || 'on_track',
  );
  const [notes, setNotes] = useState(checkpoint.notes);
  const [themes, setThemes] = useState<ClientStrategyThemeKey[]>(checkpoint.themes);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function toggleTheme(theme: ClientStrategyThemeKey) {
    setThemes((current) => current.includes(theme)
      ? current.filter((item) => item !== theme)
      : current.length < 5 ? [...current, theme] : current);
    setMessage('');
  }

  async function save(status: 'completed' | 'skipped') {
    if (isSaving) return;
    if (status === 'skipped' && !window.confirm('Skip this checkpoint and clear its progress themes?')) return;

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
            progressStatus: status === 'completed' ? progressStatus : null,
            notes,
            themes: status === 'completed' ? themes : [],
          }),
        },
      );
      const data = await response.json().catch(() => null) as {
        checkpoint?: ClientStrategyCheckpoint;
        themeReport?: Array<{ key: string; label: string; clientCount: number }>;
        error?: string;
      } | null;
      if (!response.ok || !data?.checkpoint) throw new Error(data?.error || 'Could not save this outcome.');
      onSaved(data.checkpoint, data.themeReport || []);
      setThemes(data.checkpoint.themes);
      setNotes(data.checkpoint.notes);
      setMessage(status === 'skipped' ? 'Checkpoint marked as skipped.' : 'Outcome saved separately from the approved plan.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this outcome.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="rounded-[8px] border border-[#E4D8CB] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-serif text-[22px] text-[#142334]">{checkpoint.label}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.1em] text-[#8C7466]">Due {formatDate(checkpoint.dueAt)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${
          checkpoint.status === 'completed'
            ? 'bg-[#EAF2EB] text-[#466B4D]'
            : checkpoint.status === 'skipped'
              ? 'bg-[#F0EDE9] text-[#6B6B6B]'
              : 'bg-[#FFF4DB] text-[#76541D]'
        }`}>
          {checkpoint.status}
        </span>
      </div>

      <div className="mt-4 grid gap-4">
        <div className="max-w-xs">
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">Progress</label>
          <FilterDropdown
            name={`checkpoint-progress-${checkpoint.id}`}
            value={progressStatus}
            onChange={(value) => { setProgressStatus(value as ClientStrategyProgressStatus); setMessage(''); }}
            ariaLabel={`Progress for ${checkpoint.label}`}
            options={PROGRESS_OPTIONS}
          />
        </div>

        <div>
          <label htmlFor={`checkpoint-notes-${checkpoint.id}`} className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">Outcome notes</label>
          <textarea
            id={`checkpoint-notes-${checkpoint.id}`}
            value={notes}
            maxLength={4000}
            onChange={(event) => { setNotes(event.target.value); setMessage(''); }}
            placeholder="What moved, what stalled, and what support is needed next?"
            className="mt-2 min-h-28 w-full resize-y rounded-[8px] border border-[#D8C8BB] bg-[#FBFAF8] px-3 py-3 text-[13px] leading-relaxed text-[#142334] outline-none transition focus:border-[#8C7466] focus:ring-2 focus:ring-[#C9AD98]/30"
          />
          <p className="mt-1 text-right text-[10px] text-[#6B6B6B]">{notes.length}/4000</p>
        </div>

        <fieldset>
          <legend className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">Learning themes, up to 5</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {CLIENT_STRATEGY_THEME_OPTIONS.map((theme) => {
              const checked = themes.includes(theme.key);
              return (
                <label key={theme.key} className="flex cursor-pointer items-center gap-2 rounded-[8px] bg-[#F8F6F4] px-3 py-2 text-[12px] text-[#142334]">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && themes.length >= 5}
                    onChange={() => toggleTheme(theme.key)}
                    className="h-4 w-4 accent-[#466B4D]"
                  />
                  {theme.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        {error && <p role="alert" className="text-[12px] font-semibold text-[#7A2F22]">{error}</p>}
        {message && <p role="status" className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#466B4D]"><CheckCircle2 className="h-4 w-4" />{message}</p>}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void save('skipped')}
            className="h-10 rounded-[8px] border border-[#D8C8BB] px-4 text-[10px] font-bold uppercase tracking-[0.11em] text-[#6B6B6B] disabled:opacity-50"
          >
            Mark skipped
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void save('completed')}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#142334] px-4 text-[10px] font-bold uppercase tracking-[0.11em] text-white transition hover:bg-[#466B4D] disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {checkpoint.status === 'completed' ? 'Update outcome' : 'Save outcome'}
          </button>
        </div>
      </div>
    </article>
  );
}
