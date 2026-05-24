'use client';

import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MasterclassBookingsOpenButton({
  adminKey,
  eligibleCount,
}: {
  adminKey: string;
  eligibleCount: number;
}) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function sendBookingsOpen() {
    if (eligibleCount <= 0 || state === 'sending') return;

    const confirmed = window.confirm(
      `Send the bookings-open email to ${eligibleCount} masterclass waitlist lead${eligibleCount === 1 ? '' : 's'}?`,
    );
    if (!confirmed) return;

    setState('sending');
    setMessage(null);

    try {
      const response = await fetch('/api/leads/masterclass-bookings-open', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: adminKey }),
      });
      const data = (await response.json().catch(() => ({}))) as { sentCount?: number; error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not send bookings-open emails.');

      setState('sent');
      setMessage(`Sent ${data.sentCount || 0} bookings-open email${data.sentCount === 1 ? '' : 's'}.`);
      router.refresh();
      window.setTimeout(() => setState('idle'), 2500);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Could not send bookings-open emails.');
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={eligibleCount <= 0 || state === 'sending'}
        onClick={sendBookingsOpen}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#142334] px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334] disabled:cursor-not-allowed disabled:opacity-55"
      >
        {state === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Send bookings open
      </button>
      <span className={`text-[12px] leading-relaxed ${state === 'error' ? 'text-[#A24E37]' : 'text-[#6B6B6B]'}`}>
        {message || `${eligibleCount} eligible waitlist lead${eligibleCount === 1 ? '' : 's'}`}
      </span>
    </div>
  );
}
