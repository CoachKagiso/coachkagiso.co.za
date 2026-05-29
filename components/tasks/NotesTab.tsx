'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, Save } from 'lucide-react';
import type { Task } from '@/lib/dashboard-tasks';

function getRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  const seconds = Math.max(1, Math.round((Date.now() - date.getTime()) / 1000));
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ];
  const rtf = new Intl.RelativeTimeFormat('en-ZA', { numeric: 'auto' });
  const match = units.find(([, unitSeconds]) => seconds >= unitSeconds);
  if (!match) return 'Just now';
  return rtf.format(-Math.floor(seconds / match[1]), match[0]);
}

export function NotesTab({ task, onAddNote }: { task: Task; onAddNote: (task: Task, body: string) => Promise<void> }) {
  const [noteBody, setNoteBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteBody.trim() || saving) return;

    setSaving(true);
    setError(null);
    try {
      await onAddNote(task, noteBody);
      setNoteBody('');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not save this note.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid h-full min-h-0 gap-4 overflow-y-auto overscroll-contain px-5 py-4 md:px-6">
      {task.notes.length === 0 ? (
        <div className="grid h-[96px] place-items-center rounded-[8px] bg-[#F5F3EE] text-[13px] text-[#6B6B6B]">
          No notes saved yet.
        </div>
      ) : (
        <div className="grid max-h-[240px] gap-2 overflow-y-auto pr-1">
          {task.notes.map((note) => (
            <article key={note.id} className="rounded-[8px] bg-[#F5F3EE] p-3">
              <p className="text-[14px] leading-relaxed text-[#142334]">{note.body}</p>
              <p className="mt-2 text-[11px] text-[#6B6B6B]">{getRelativeTime(note.createdAt)}</p>
            </article>
          ))}
        </div>
      )}

      <form className="grid gap-3" onSubmit={saveNote}>
        <textarea
          value={noteBody}
          onChange={(event) => setNoteBody(event.target.value)}
          placeholder="Add a note..."
          className="h-20 resize-none rounded-[8px] border border-[#E4D8CB] bg-white px-3 py-2.5 text-[13px] leading-relaxed text-[#142334] outline-none transition placeholder:text-[#6B6B6B]/65 focus:border-[#142334]"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !noteBody.trim()}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#C9AD98] px-5 text-[13px] font-semibold text-[#142334] transition hover:bg-[#142334] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Note'}
          </button>
        </div>
        {error && <p className="text-[12px] leading-relaxed text-[#A24E37]">{error}</p>}
      </form>
    </div>
  );
}
