'use client';

import { ArrowRight, Layers3 } from 'lucide-react';

const phaseTwoSteps = ['Platform', 'Content type', 'Angle'];

export function ContentTypeSelector() {
  return (
    <div className="rounded-[8px] border border-[#F59E0B] bg-[#FEF3C7] px-4 py-3 text-[#92400E]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/70 text-[#92400E]">
            <Layers3 className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[13px] font-bold">Enhanced creation flow coming soon</p>
            <p className="mt-1 text-[12px] leading-relaxed">
              Platform, content type, and angle selection will sit here in Phase 2. The current creation tools stay live below.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {phaseTwoSteps.map((step, index) => (
            <span key={step} className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em]">
              {step}
              {index < phaseTwoSteps.length - 1 && <ArrowRight className="h-3 w-3" />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
