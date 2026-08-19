'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileText, Loader2, Printer, X } from 'lucide-react';
import type { ClientStrategyPlanRecord } from '@/lib/client-strategy-plan';
import {
  DEFAULT_CLIENT_STRATEGY_PLAN_EXPORT_OPTIONS,
  clientStrategyPlanExportFileName,
  getClientStrategyPlanExportAvailability,
  resolveClientStrategyPlanExportOptions,
  type ClientStrategyPlanExportFormat,
} from '@/lib/client-strategy-plan-export';

export default function ClientStrategyPlanExportDialog({
  adminKey,
  clientName,
  plan,
  onClose,
}: {
  adminKey: string;
  clientName: string;
  plan: ClientStrategyPlanRecord;
  onClose: () => void;
}) {
  const [options, setOptions] = useState(DEFAULT_CLIENT_STRATEGY_PLAN_EXPORT_OPTIONS);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);
  const availability = getClientStrategyPlanExportAvailability(plan.editedContent);
  // A section the plan does not have is shown unchecked, so it must be sent unchecked too.
  // Without this the request still asks for it and the server rejects the whole export.
  const effectiveOptions = resolveClientStrategyPlanExportOptions(plan.editedContent, options);

  useEffect(() => {
    closeRef.current?.focus();
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isExporting) onClose();
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [isExporting, onClose]);

  async function exportPlan(printAfter = false) {
    if (
      !effectiveOptions.includeSessionSummary
      && !effectiveOptions.includeDevelopmentPlan
      && !effectiveOptions.includeInterviewPrep
    ) {
      setError('Choose at least one section to export.');
      return;
    }
    setIsExporting(true);
    setError('');
    try {
      const format: ClientStrategyPlanExportFormat = printAfter ? 'pdf' : effectiveOptions.format;
      const response = await fetch(
        `/api/clients/${encodeURIComponent(plan.paymentId)}/strategy-plan/${encodeURIComponent(plan.id)}/export`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...effectiveOptions, format, key: adminKey, clientName }),
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error || 'Could not export this client pack.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (printAfter) {
        const frame = document.createElement('iframe');
        frame.style.position = 'fixed';
        frame.style.width = '1px';
        frame.style.height = '1px';
        frame.style.opacity = '0';
        frame.src = url;
        frame.onload = () => {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
          window.setTimeout(() => {
            frame.remove();
            URL.revokeObjectURL(url);
          }, 60_000);
        };
        document.body.appendChild(frame);
      } else {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = clientStrategyPlanExportFileName({
          clientName,
          serviceSlug: plan.serviceSlug,
          version: plan.version,
          extension: format,
        });
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not export this client pack.');
    } finally {
      setIsExporting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[130] grid place-items-center bg-[#142334]/60 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="plan-export-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[10px] border border-[#D8C8BB] bg-[#FCFBFA]">
        <header className="flex items-start justify-between gap-4 border-b border-[#E4D8CB] p-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">Client pack export</p>
            <h2 id="plan-export-title" className="mt-2 font-serif text-[30px] text-[#142334]">Choose the document sections.</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[#66717C]">
              {plan.status === 'draft'
                ? 'This version will carry a prominent draft warning.'
                : 'This approved version is ready for client delivery.'}
            </p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-[8px] border border-[#D8C8BB] bg-white"><X className="h-4 w-4" /></button>
        </header>
        <div className="grid gap-5 p-5">
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">Include</legend>
            {([
              ['includeSessionSummary', 'Session Summary & Agreements'],
              ['includeDevelopmentPlan', 'Career Development Plan'],
              ['includeInterviewPrep', 'Interview Preparation'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex min-h-11 items-center gap-3 rounded-[8px] border border-[#D8C8BB] bg-white px-4 text-[14px] font-semibold text-[#142334]">
                <input
                  type="checkbox"
                  disabled={!availability[key]}
                  checked={effectiveOptions[key]}
                  onChange={(event) => setOptions((current) => ({ ...current, [key]: event.target.checked }))}
                />
                {label}{!availability[key] ? ' · not generated' : ''}
              </label>
            ))}
          </fieldset>
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="col-span-2 mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">Download format</legend>
            {([
              ['pdf', 'PDF', FileText],
              ['docx', 'Editable Word', Download],
            ] as const).map(([format, label, Icon]) => (
              <label key={format} className={`flex min-h-12 items-center gap-2 rounded-[8px] border px-3 ${options.format === format ? 'border-[#142334] bg-[#F1F4F6]' : 'border-[#D8C8BB] bg-white'}`}>
                <input type="radio" name="plan-export-format" checked={options.format === format} onChange={() => setOptions((current) => ({ ...current, format }))} />
                <Icon className="h-4 w-4" /> <span className="text-[13px] font-bold">{label}</span>
              </label>
            ))}
          </fieldset>
          {error && <p role="alert" className="rounded-[8px] border border-[#E3B5AA] bg-[#FFF5F2] px-4 py-3 text-[13px] text-[#7A2F22]">{error}</p>}
        </div>
        <footer className="flex flex-col-reverse gap-2 border-t border-[#E4D8CB] p-5 sm:flex-row sm:justify-end">
          <button type="button" disabled={isExporting} onClick={() => void exportPlan(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-[#142334] px-4 text-[11px] font-bold uppercase tracking-[0.1em]"><Printer className="h-4 w-4" /> Print</button>
          <button type="button" disabled={isExporting} onClick={() => void exportPlan()} className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#142334] px-5 text-[11px] font-bold uppercase tracking-[0.1em] text-white">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isExporting ? 'Preparing…' : `Download ${options.format.toUpperCase()}`}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
