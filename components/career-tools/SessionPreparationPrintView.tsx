'use client';

import type { ClientSessionPreparationRecord } from '@/lib/client-session-preparation';
import type { SessionPreparationExportOptions } from '@/lib/client-session-preparation-export';

const SOURCE_LABELS = {
  intake: 'Intake',
  cv_analysis: 'CV analysis',
  earlier_diagnostic: 'Earlier diagnostic',
} as const;

function PrintFooter({ privateNotes }: { privateNotes: boolean }) {
  return (
    <footer className="mt-auto border-t border-[#D8C8BB] pt-2 text-center text-[8pt] text-[#6B6B6B]">
      {privateNotes ? 'Private coaching preparation · Not for client distribution' : 'Coach Kagiso · Session preparation'}
    </footer>
  );
}

function SectionHeading({ children }: { children: string }) {
  return <h2 className="mb-3 mt-5 border-b border-[#D8C8BB] pb-1.5 text-[9pt] font-bold uppercase tracking-[0.14em] text-[#765F52]">{children}</h2>;
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="grid list-disc gap-1.5 pl-5 text-[10pt] leading-[1.45] text-[#26384A]">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

function CoachingLens({ preparation }: { preparation: ClientSessionPreparationRecord }) {
  const grouped = Object.entries(
    preparation.content.groundedCoachNotes.reduce<Record<string, string[]>>((result, note) => {
      (result[note.source] ||= []).push(note.note);
      return result;
    }, {}),
  ) as Array<[keyof typeof SOURCE_LABELS, string[]]>;

  return (
    <section>
      <div className="mb-4 bg-[#142334] px-4 py-2 text-center text-[8pt] font-bold uppercase tracking-[0.14em] text-white">
        Private coaching preparation · Not for client distribution
      </div>
      <p className="text-[8pt] font-bold uppercase tracking-[0.14em] text-[#765F52]">Coaching lens</p>
      <h1 className="mt-2 font-serif text-[22pt] leading-[1.1] text-[#142334]">Context to review before the conversation.</h1>
      {grouped.length > 0 && (
        <>
          <SectionHeading>Grounded notes</SectionHeading>
          <div className="grid gap-3">
            {grouped.map(([source, notes]) => (
              <section key={source} className="border-b border-[#E8E3DF] pb-3">
                <h3 className="mb-2 text-[8pt] font-bold uppercase tracking-[0.12em] text-[#765F52]">{SOURCE_LABELS[source]}</h3>
                <Bullets items={notes} />
              </section>
            ))}
          </div>
        </>
      )}
      {preparation.content.judgmentCalls.length > 0 && (
        <section className="mt-5 border-l-4 border-[#D8A84E] bg-[#FFF1CC] p-4">
          <h3 className="mb-2 text-[8pt] font-bold uppercase tracking-[0.12em] text-[#6D4911]">Hypothesis · Verify with client</h3>
          <Bullets items={preparation.content.judgmentCalls} />
        </section>
      )}
      {preparation.content.legacyCoachNotes.length > 0 && (
        <>
          <SectionHeading>Legacy coach notes · Source not classified</SectionHeading>
          <p className="mb-3 text-[9pt] leading-relaxed text-[#6B6B6B]">These notes predate source separation. Verify them before relying on them.</p>
          <Bullets items={preparation.content.legacyCoachNotes} />
        </>
      )}
    </section>
  );
}

export default function SessionPreparationPrintView({
  preparation,
  clientName,
  options,
}: {
  preparation: ClientSessionPreparationRecord;
  clientName: string;
  options: SessionPreparationExportOptions;
}) {
  const compact = options.layout === 'compact';
  const service = preparation.serviceSlug === 'career-clarity' ? 'Career Clarity' : 'Glow Up VIP';
  const pageClass = `prep-print-page flex min-h-[270mm] flex-col bg-white ${compact ? 'text-[9pt]' : 'text-[10pt]'}`;

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            background: #ffffff !important;
          }
          body * {
            visibility: hidden !important;
          }
          #session-preparation-print-root,
          #session-preparation-print-root * {
            visibility: visible !important;
          }
          #session-preparation-print-root {
            display: block !important;
            inset: 0;
            position: absolute;
            width: 100%;
          }
          .prep-print-page {
            break-after: page;
            page-break-after: always;
          }
          .prep-print-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }
      `}</style>
      <div id="session-preparation-print-root" className="hidden text-[#142334] print:block">
        {options.includeGuide && (
          <section className={pageClass}>
            <p className="text-[8pt] font-bold uppercase tracking-[0.14em] text-[#765F52]">Session preparation</p>
            <h1 className="mt-2 font-serif text-[23pt] leading-[1.08] text-[#142334]">{preparation.content.sessionFocus}</h1>
            <p className="mt-3 text-[9pt] text-[#6B6B6B]">{clientName || 'Client'} · {service} · 60 min · Microsoft Teams</p>
            <p className="mt-4 text-[10pt] leading-[1.5] text-[#42505E]">{preparation.content.openingFrame}</p>
            {preparation.content.urgencyNote && <p className="mt-4 border border-[#E8C77C] bg-[#FFF1CC] p-3 text-[9pt] leading-relaxed text-[#6D4911]">{preparation.content.urgencyNote}</p>}
            <SectionHeading>{preparation.content.format === 'timed_v3' ? 'Timed conversation flow' : 'Conversation flow'}</SectionHeading>
            <div className="border-y border-[#D8C8BB]">
              {preparation.content.conversationFlow.map((step, index) => {
                const timing = step.startMinute === null || step.endMinute === null ? `Stage ${index + 1}` : `${step.startMinute}-${step.endMinute} min`;
                return (
                  <article key={`${step.stage}-${index}`} className="grid grid-cols-[28mm_minmax(0,1fr)] gap-4 border-b border-[#E8E3DF] py-3 last:border-b-0">
                    <p className="text-[8pt] font-bold uppercase tracking-[0.1em] text-[#765F52]">{timing}</p>
                    <div>
                      <h3 className="font-serif text-[14pt] leading-tight text-[#142334]">{step.stage}</h3>
                      <p className="mt-1.5 leading-[1.45] text-[#42505E]">{step.purpose}</p>
                      {compact && options.includeCues && step.listenFor.map((cue) => <p key={cue} className="mt-1 text-[8pt] text-[#6B5A50]">Listen for: {cue}</p>)}
                    </div>
                  </article>
                );
              })}
            </div>
            <PrintFooter privateNotes={options.includeLens} />
          </section>
        )}

        {options.includeGuide && (
          <section className={pageClass}>
            <p className="text-[8pt] font-bold uppercase tracking-[0.14em] text-[#765F52]">Session guide · Continued</p>
            <SectionHeading>Priority questions</SectionHeading>
            <div className="border-y border-[#D8C8BB]">
              {preparation.content.priorityQuestions.map((question, index) => (
                <article key={question.question} className="grid grid-cols-[10mm_minmax(0,1fr)] gap-3 border-b border-[#E8E3DF] py-3 last:border-b-0">
                  <span className="font-serif text-[14pt] text-[#A99080]">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="font-bold leading-[1.4]">
                      {question.priority === 'must_ask' ? 'MUST ASK · ' : question.priority === 'if_time' ? 'IF TIME · ' : ''}
                      {question.question}
                    </p>
                    <p className="mt-1.5 text-[9pt] leading-[1.45] text-[#6B6B6B]">{question.whyItMatters}</p>
                  </div>
                </article>
              ))}
            </div>
            {!compact && options.includeCues && (
              <>
                <SectionHeading>Listen for</SectionHeading>
                <Bullets items={
                  preparation.content.format === 'timed_v3'
                    ? preparation.content.conversationFlow.flatMap((step) => step.listenFor.map((cue) => `${step.stage}: ${cue}`))
                    : preparation.content.legacyListenFor
                } />
              </>
            )}
            {compact && options.includeCues && preparation.content.legacyListenFor.length > 0 && (
              <>
                <SectionHeading>General notes for this session</SectionHeading>
                <Bullets items={preparation.content.legacyListenFor} />
              </>
            )}
            <section className="mt-5 border border-[#B8CCBC] bg-[#F1F7F2] p-4">
              <h2 className="mb-3 text-[8pt] font-bold uppercase tracking-[0.14em] text-[#466B4D]">Close with</h2>
              <Bullets items={preparation.content.closeWith} />
            </section>
            {compact && options.includeLens && <div className="mt-6"><CoachingLens preparation={preparation} /></div>}
            <PrintFooter privateNotes={options.includeLens} />
          </section>
        )}

        {options.includeLens && (!compact || !options.includeGuide) && (
          <section className={pageClass}>
            <CoachingLens preparation={preparation} />
            <PrintFooter privateNotes />
          </section>
        )}
      </div>
    </>
  );
}
