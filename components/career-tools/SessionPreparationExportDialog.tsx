'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileText, Loader2, LockKeyhole, Printer, X } from 'lucide-react';
import type { ClientSessionPreparationRecord } from '@/lib/client-session-preparation';
import {
  DEFAULT_SESSION_PREPARATION_EXPORT_OPTIONS,
  hasCoachingLensContent,
  sessionPreparationExportFileName,
  type SessionPreparationExportFormat,
  type SessionPreparationExportLayout,
  type SessionPreparationExportOptions,
} from '@/lib/client-session-preparation-export';

function ChoiceCard({
  checked,
  name,
  value,
  title,
  detail,
  onChange,
}: {
  checked: boolean;
  name: string;
  value: string;
  title: string;
  detail: string;
  onChange: () => void;
}) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-[8px] border p-3 transition ${checked ? 'border-[#142334] bg-[#F1F4F6]' : 'border-[#D8C8BB] bg-white'}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="mt-1" />
      <span>
        <span className="block text-[14px] font-bold text-[#142334]">{title}</span>
        <span className="mt-1 block text-[12px] leading-relaxed text-[#6B6B6B]">{detail}</span>
      </span>
    </label>
  );
}

function downloadNameFromResponse(response: Response, fallback: string) {
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/i);
  return match?.[1] || fallback;
}

export default function SessionPreparationExportDialog({
  preparation,
  adminKey,
  clientName,
  onClose,
  onPrint,
}: {
  preparation: ClientSessionPreparationRecord;
  adminKey: string;
  clientName: string;
  onClose: () => void;
  onPrint: (options: SessionPreparationExportOptions) => void;
}) {
  const [options, setOptions] = useState(DEFAULT_SESSION_PREPARATION_EXPORT_OPTIONS);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hasLens = hasCoachingLensContent(preparation.content);

  useEffect(() => {
    closeButtonRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isExporting) onClose();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isExporting, onClose]);

  function updateOption<K extends keyof SessionPreparationExportOptions>(key: K, value: SessionPreparationExportOptions[K]) {
    setOptions((current) => ({ ...current, [key]: value }));
    setError('');
  }

  async function exportPreparation() {
    if (!options.includeGuide && !options.includeLens) {
      setError('Choose Session Guide, Coaching Lens, or both.');
      return;
    }
    if (options.format === 'print') {
      onPrint(options);
      return;
    }

    setIsExporting(true);
    setError('');
    try {
      const response = await fetch(
        `/api/clients/${encodeURIComponent(preparation.paymentId)}/session-preparation/${encodeURIComponent(preparation.id)}/export`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...options, key: adminKey, clientName }),
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error || 'Could not export this session preparation.');
      }
      const blob = await response.blob();
      const fallback = sessionPreparationExportFileName({
        clientName,
        serviceSlug: preparation.serviceSlug,
        extension: options.format,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = downloadNameFromResponse(response, fallback);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not export this session preparation.');
    } finally {
      setIsExporting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] grid place-items-center bg-[#142334]/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isExporting) onClose(); }}>
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[10px] border border-[#D8C8BB] bg-[#FCFBFA]" role="dialog" aria-modal="true" aria-labelledby="session-preparation-export-title">
        <header className="flex items-start justify-between gap-4 border-b border-[#E4D8CB] p-5 md:p-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#765F52]">Export preparation</p>
            <h2 id="session-preparation-export-title" className="mt-2 font-serif text-[29px] leading-tight text-[#142334]">Choose what leaves the dashboard.</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[#59636D]">Exports use the latest saved working copy.</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} disabled={isExporting} aria-label="Close export dialog" className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-[#D8C8BB] bg-white text-[#142334] disabled:opacity-40">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid gap-6 p-5 md:p-6">
          <fieldset className="grid gap-3">
            <legend className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#765F52]">Include</legend>
            <label className="flex min-h-11 items-center gap-3 rounded-[8px] border border-[#D8C8BB] bg-white px-3.5 text-[14px] font-semibold text-[#142334]">
              <input type="checkbox" checked={options.includeGuide} onChange={(event) => updateOption('includeGuide', event.target.checked)} />
              Session Guide
            </label>
            <label className={`flex min-h-11 items-center gap-3 rounded-[8px] border px-3.5 text-[14px] font-semibold ${options.includeLens ? 'border-[#E8C77C] bg-[#FFF1CC] text-[#6D4911]' : 'border-[#D8C8BB] bg-white text-[#142334]'}`}>
              <input type="checkbox" checked={options.includeLens} disabled={!hasLens} onChange={(event) => updateOption('includeLens', event.target.checked)} />
              Coaching Lens · Private coach notes
            </label>
            <label className="flex min-h-11 items-center gap-3 rounded-[8px] border border-[#D8C8BB] bg-white px-3.5 text-[14px] font-semibold text-[#142334]">
              <input type="checkbox" checked={options.includeCues} disabled={!options.includeGuide} onChange={(event) => updateOption('includeCues', event.target.checked)} />
              Expanded Listen For cues
            </label>
            {options.includeLens && (
              <p className="flex items-start gap-2 rounded-[8px] border border-[#E8C77C] bg-[#FFF1CC] px-3.5 py-3 text-[13px] leading-relaxed text-[#6D4911]">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                This export will be labelled private and not for client distribution.
              </p>
            )}
          </fieldset>

          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#765F52] sm:col-span-2">Layout</legend>
            {([
              ['compact', 'Compact', 'Targets two pages. Uses denser spacing and keeps private notes on page two where possible.'],
              ['full', 'Full', 'Targets three pages when the Coaching Lens is included, with more reading space.'],
            ] as const).map(([value, title, detail]) => (
              <ChoiceCard key={value} checked={options.layout === value} name="preparation-layout" value={value} title={title} detail={detail} onChange={() => updateOption('layout', value as SessionPreparationExportLayout)} />
            ))}
          </fieldset>

          <fieldset className="grid gap-3 sm:grid-cols-3">
            <legend className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#765F52] sm:col-span-3">Format</legend>
            {([
              ['pdf', 'PDF', 'Best for fixed page layout.', FileText],
              ['docx', 'Word', 'Editable after download.', Download],
              ['print', 'Print', 'Opens the browser print preview.', Printer],
            ] as const).map(([value, title, detail, Icon]) => (
              <label key={value} className={`cursor-pointer rounded-[8px] border p-3 ${options.format === value ? 'border-[#142334] bg-[#F1F4F6]' : 'border-[#D8C8BB] bg-white'}`}>
                <span className="flex items-center gap-2">
                  <input type="radio" name="preparation-format" value={value} checked={options.format === value} onChange={() => updateOption('format', value as SessionPreparationExportFormat)} />
                  <Icon className="h-4 w-4 text-[#765F52]" />
                  <span className="text-[14px] font-bold text-[#142334]">{title}</span>
                </span>
                <span className="mt-2 block text-[12px] leading-relaxed text-[#6B6B6B]">{detail}</span>
              </label>
            ))}
          </fieldset>

          <div className="rounded-[8px] border border-[#D8C8BB] bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#765F52]">Page plan</p>
            <p className="mt-2 text-[14px] leading-relaxed text-[#42505E]">
              {options.layout === 'compact'
                ? 'Page 1: frame and flow. Page 2: questions, close, and selected private notes.'
                : `Page 1: frame and flow. Page 2: questions, cues, and close.${options.includeLens ? ' Page 3: Coaching Lens.' : ''}`}
            </p>
          </div>

          {error && <p className="rounded-[8px] border border-[#F4B6AA] bg-[#FFF5F2] px-4 py-3 text-[14px] leading-relaxed text-[#7A2F22]" role="alert">{error}</p>}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-[#E4D8CB] p-5 sm:flex-row sm:justify-end md:px-6">
          <button type="button" onClick={onClose} disabled={isExporting} className="min-h-11 rounded-[8px] border border-[#A09086] bg-white px-4 text-[12px] font-bold uppercase tracking-[0.08em] text-[#142334] disabled:opacity-40">Cancel</button>
          <button type="button" onClick={() => void exportPreparation()} disabled={isExporting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-[#142334] px-5 text-[12px] font-bold uppercase tracking-[0.08em] text-white disabled:opacity-40">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : options.format === 'print' ? <Printer className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            {isExporting ? 'Preparing...' : options.format === 'print' ? 'Open print preview' : `Export ${options.format.toUpperCase()}`}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
