'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { RefreshCcw } from 'lucide-react';

type ImportResult = {
  scanned?: number;
  matched?: number;
  imported?: number;
  skipped?: number;
  ignored?: number;
  windows?: number;
  errors?: string[];
};

type BrevoNotificationImportButtonProps = {
  adminKey: string;
  days?: number;
  compact?: boolean;
};

export default function BrevoNotificationImportButton({
  adminKey,
  days = 30,
  compact = false,
}: BrevoNotificationImportButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  async function importEmailHistory() {
    if (!adminKey || isImporting) return;

    setIsImporting(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/notifications/import-brevo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: adminKey, days }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Could not import email history.');
      }

      setResult(payload);
      if (Array.isArray(payload.errors) && payload.errors.length > 0) {
        setError(String(payload.errors[0]));
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not import email history.');
    } finally {
      setIsImporting(false);
    }
  }

  const busy = isImporting || isPending;
  const imported = result?.imported || 0;

  return (
    <div className={`flex flex-col ${compact ? 'items-start' : 'items-start sm:items-end'} gap-2`}>
      <button
        type="button"
        onClick={importEmailHistory}
        disabled={busy || !adminKey}
        className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCcw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
        {busy ? 'Importing' : 'Import emails'}
      </button>
      {result && (
        <p className="max-w-sm text-[12px] leading-relaxed text-[#142334]/58">
          {imported > 0
            ? `${imported} imported, ${result.skipped || 0} skipped.`
            : `No new emails found. ${result.matched || 0} matching emails checked.`}
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
