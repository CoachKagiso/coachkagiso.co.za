'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { RefreshCcw } from 'lucide-react';

type ImportResult = {
  candidates?: number;
  scanned?: number;
  matched?: number;
  imported?: number;
  skipped?: number;
  ignored?: number;
  windows?: number;
  errors?: string[];
};

type MessagesBrevoImportButtonProps = {
  adminKey: string;
  days?: number;
};

export default function MessagesBrevoImportButton({
  adminKey,
  days = 7,
}: MessagesBrevoImportButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  async function syncBrevoMessages() {
    if (!adminKey || isImporting) return;

    setIsImporting(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/messages/import-brevo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: adminKey, days }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Could not sync Brevo messages.');
      }

      setResult(payload);
      if (Array.isArray(payload.errors) && payload.errors.length > 0) {
        setError(String(payload.errors[0]));
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sync Brevo messages.');
    } finally {
      setIsImporting(false);
    }
  }

  const busy = isImporting || isPending;
  const imported = result?.imported || 0;

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={syncBrevoMessages}
        disabled={busy || !adminKey}
        className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCcw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
        {busy ? 'Syncing' : 'Sync Brevo'}
      </button>
      {result && (
        <p className="max-w-sm text-[12px] leading-relaxed text-[#142334]/58">
          {imported > 0
            ? `${imported} synced, ${result.skipped || 0} already logged.`
            : `No new messages found. ${result.matched || 0} lead emails checked.`}
        </p>
      )}
      {error && (
        <p className="max-w-sm text-[12px] leading-relaxed text-[#8A3B2D]">
          {error}
        </p>
      )}
    </div>
  );
}
