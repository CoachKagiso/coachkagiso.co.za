import {
  leadSourcePillClasses,
  leadSourceShortLabels,
  normalizeLeadSource,
  type DiagnosticLeadSource,
} from '@/lib/lead-sources';

export default function LeadSourceBadge({
  source,
  className = '',
}: {
  source?: DiagnosticLeadSource | string | null;
  className?: string;
}) {
  const normalized = normalizeLeadSource(source);

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${leadSourcePillClasses[normalized]} ${className}`}
    >
      {leadSourceShortLabels[normalized]}
    </span>
  );
}
