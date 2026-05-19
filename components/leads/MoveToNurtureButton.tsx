'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

type MoveToNurtureButtonProps = {
  adminKey: string;
  leadId: string;
  className?: string;
};

async function requestJson<T>(url: string, method: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

export default function MoveToNurtureButton({
  adminKey,
  leadId,
  className,
}: MoveToNurtureButtonProps) {
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  async function moveToNurture() {
    if (state === 'saving' || state === 'done') return;
    setState('saving');

    try {
      await requestJson(`/api/diagnostic/submissions/${leadId}`, 'PATCH', {
        key: adminKey,
        leadStatus: 'nurture',
        clearNextFollowUp: true,
      });
      setState('done');
    } catch {
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <span className={className || 'rounded-full bg-[#F3E8FF] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7C3AED]'}>
        Moved to nurture
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={moveToNurture}
      disabled={state === 'saving'}
      className={
        className ||
        'inline-flex items-center justify-center gap-2 rounded-full bg-[#F3E8FF] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7C3AED] transition hover:bg-[#142334] hover:text-white disabled:cursor-not-allowed disabled:opacity-65'
      }
    >
      {state === 'saving' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {state === 'error' ? 'Try again' : state === 'saving' ? 'Moving...' : 'Move to nurture'}
    </button>
  );
}
