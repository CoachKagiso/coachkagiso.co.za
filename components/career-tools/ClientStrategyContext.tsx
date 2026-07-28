import { CalendarClock, ExternalLink, FileText, StickyNote } from 'lucide-react';
import type { ClientRecord } from '@/lib/clients';
import { getClientStrategyPlanLabel, type ClientStrategyServiceSlug } from '@/lib/client-strategy';

function formatDateTime(value: unknown) {
  if (typeof value !== 'string' || !value) return null;
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date(value));
}

function formatIntakeValue(value: unknown) {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value || '');
}

function formatFieldLabel(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ');
}

export default function ClientStrategyContext({ client }: { client: ClientRecord }) {
  const intakeEntries = Object.entries(client.intake?.form_data || {}).filter(([, value]) => (
    value !== null && value !== undefined && value !== ''
  ));
  const bookingTime = formatDateTime(
    client.intake?.source_metadata?.startTime || client.intake?.source_metadata?.sessionDate,
  );
  const planLabel = getClientStrategyPlanLabel(client.serviceSlug as ClientStrategyServiceSlug);

  return (
    <aside className="rounded-[8px] bg-[#142334] p-5 text-white">
      {client.isTest && (
        <div className="mb-4 rounded-[8px] border border-[#C4B5FD]/50 bg-[#6D28D9]/30 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#EDE9FE]">
          Test record. External plan delivery is blocked.
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Client context</p>
          <h3 className="mt-2 font-serif text-[30px] leading-tight">{client.buyerName}</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-white/64">{client.buyerEmail}</p>
        </div>
        <span className="rounded-full bg-[#C9AD98] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#142334]">
          {planLabel}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div className="rounded-[8px] border border-white/10 bg-white/[0.06] p-3">
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/48">Service</dt>
          <dd className="mt-1 text-[13px] font-semibold text-white">{client.serviceName}</dd>
        </div>
        <div className="rounded-[8px] border border-white/10 bg-white/[0.06] p-3">
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/48">Intake</dt>
          <dd className="mt-1 text-[13px] font-semibold text-white">
            {client.intake
              ? client.intake.source === 'cal'
                ? 'Cal.com booking'
                : client.intake.source === 'manual_dashboard'
                  ? 'Manual dashboard entry'
                  : 'Client form'
              : 'Not available'}
          </dd>
        </div>
      </dl>

      {(bookingTime || client.intake?.cv_file_url) && (
        <div className="mt-4 grid gap-2">
          {bookingTime && (
            <div className="flex items-center gap-2 text-[12px] text-white/72">
              <CalendarClock className="h-4 w-4 text-[#C9AD98]" />
              Session: {bookingTime} SAST
            </div>
          )}
          {client.intake?.cv_file_url && (
            <a
              href={client.intake.cv_file_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#E4D8CB] underline-offset-4 hover:text-white hover:underline"
            >
              <FileText className="h-4 w-4 text-[#C9AD98]" />
              Open CV source
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}

      <div className="mt-5 border-t border-white/10 pt-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/48">Intake answers</p>
        {intakeEntries.length === 0 ? (
          <p className="mt-3 text-[13px] leading-relaxed text-white/58">No normalized intake answers are available yet.</p>
        ) : (
          <div className="mt-3 max-h-[360px] space-y-3 overflow-y-auto pr-1">
            {intakeEntries.map(([key, value]) => (
              <div key={key} className="rounded-[8px] bg-white p-3 text-[#142334]">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">{formatFieldLabel(key)}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[#142334]/78">{formatIntakeValue(value)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-white/10 pt-5">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-[#C9AD98]" />
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/48">Existing notes</p>
        </div>
        {client.notes.length === 0 ? (
          <p className="mt-3 text-[13px] leading-relaxed text-white/58">No delivery notes have been saved for this engagement.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {client.notes.slice(0, 3).map((note) => (
              <p key={note.id} className="rounded-[8px] border border-white/10 bg-white/[0.06] p-3 text-[12px] leading-relaxed text-white/72">
                {note.body}
              </p>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
