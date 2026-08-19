'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Loader2 } from 'lucide-react';
import { buildDashboardAuthUrl } from '@/lib/dashboard-auth-url';
import type { ClientStrategyServiceSlug } from '@/lib/client-strategy';
import type { ClientStrategyFulfillmentItem } from '@/lib/client-strategy-fulfillment';

export default function ClientFulfillmentChecklist({
  adminKey,
  paymentId,
  serviceSlug,
}: {
  adminKey: string;
  paymentId: string;
  serviceSlug: ClientStrategyServiceSlug;
}) {
  const [items, setItems] = useState<ClientStrategyFulfillmentItem[]>([]);
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch(buildDashboardAuthUrl(`/api/clients/${encodeURIComponent(paymentId)}/strategy-fulfillment?service=${serviceSlug}`, adminKey), { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => null) as { items?: ClientStrategyFulfillmentItem[]; error?: string } | null;
        if (!response.ok) throw new Error(data?.error || 'Could not load checklist.');
        setItems(data?.items || []);
      })
      .catch((caught) => {
        if (!(caught instanceof DOMException && caught.name === 'AbortError')) setError(caught instanceof Error ? caught.message : 'Could not load checklist.');
      });
    return () => controller.abort();
  }, [adminKey, paymentId, serviceSlug]);

  async function toggle(item: ClientStrategyFulfillmentItem) {
    setSavingKey(item.key);
    setError('');
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(paymentId)}/strategy-fulfillment`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: adminKey, serviceSlug, itemKey: item.key, completed: !item.completed }),
      });
      const data = await response.json().catch(() => null) as { item?: ClientStrategyFulfillmentItem; error?: string } | null;
      if (!response.ok || !data?.item) throw new Error(data?.error || 'Could not update checklist.');
      setItems((current) => current.map((entry) => entry.key === data.item?.key ? data.item : entry));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update checklist.');
    } finally {
      setSavingKey('');
    }
  }

  const complete = items.filter((item) => item.completed).length;
  return (
    <section className="rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA] p-5" aria-labelledby="client-fulfillment-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C7466]"><ClipboardCheck className="h-4 w-4" /> Client delivery checklist</p>
          <h3 id="client-fulfillment-title" className="mt-2 font-serif text-[28px] text-[#142334]">What still needs to ship</h3>
        </div>
        <span className="rounded-full bg-[#142334] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white">{complete} of {items.length}</span>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <button key={item.key} type="button" disabled={savingKey === item.key} onClick={() => void toggle(item)} className={`flex min-h-12 items-center gap-3 rounded-[8px] border px-4 text-left text-[13px] font-semibold transition ${item.completed ? 'border-[#142334] bg-[#142334] text-white' : 'border-[#D8C8BB] bg-white text-[#142334]'}`}>
            {savingKey === item.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className={`h-4 w-4 ${item.completed ? 'fill-white text-white' : 'text-[#C9AD98]'}`} />}
            {item.label}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="mt-3 text-[12px] text-[#7A2F22]">{error}</p>}
    </section>
  );
}
