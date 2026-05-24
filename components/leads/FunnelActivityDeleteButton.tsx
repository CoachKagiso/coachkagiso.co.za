'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';

type FunnelActivityDeleteButtonProps = {
  adminKey: string;
  notificationId: string;
  contactLabel: string;
  returnHref: string;
  className?: string;
  compact?: boolean;
};

export default function FunnelActivityDeleteButton({
  adminKey,
  notificationId,
  contactLabel,
  returnHref,
  className,
  compact = false,
}: FunnelActivityDeleteButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'deleting' | 'error'>('idle');

  async function deleteRecord() {
    if (state === 'deleting') return;

    const confirmed = window.confirm(`Delete this funnel record for ${contactLabel || 'this contact'}? This cannot be undone.`);
    if (!confirmed) return;

    setState('deleting');

    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: adminKey }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Could not delete this record.');
      }

      const destination = new URL(returnHref, window.location.origin);
      destination.searchParams.set('updated', 'deleted');
      destination.searchParams.set('deletedCount', '1');
      router.push(`${destination.pathname}${destination.search}`);
      router.refresh();
    } catch {
      setState('error');
    }
  }

  return (
    <button
      type="button"
      onClick={deleteRecord}
      disabled={state === 'deleting' || !adminKey}
      className={
        className ||
        'inline-flex items-center gap-2 rounded-full border border-[#C98672]/45 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#7A2F22] transition hover:border-[#7A2F22] hover:bg-[#FFF5F2] disabled:cursor-not-allowed disabled:opacity-55'
      }
    >
      {state === 'deleting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      {state === 'error' ? 'Try again' : state === 'deleting' ? 'Deleting' : compact ? 'Delete' : 'Delete record'}
    </button>
  );
}
