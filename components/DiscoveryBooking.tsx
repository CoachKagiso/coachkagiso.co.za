'use client';

import { useMemo, useState } from 'react';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

const DEFAULT_CAL_URL = 'https://cal.com/coachkagiso/discovery-call';

function getEmbedUrl(url: string) {
  try {
    const embedUrl = new URL(url);
    embedUrl.searchParams.set('embed', 'true');
    return embedUrl.toString();
  } catch {
    return `${DEFAULT_CAL_URL}?embed=true`;
  }
}

export default function DiscoveryBooking() {
  const [isOpen, setIsOpen] = useState(false);
  const calUrl = process.env.NEXT_PUBLIC_CAL_DISCOVERY_URL ?? DEFAULT_CAL_URL;
  const embedUrl = useMemo(() => getEmbedUrl(calUrl), [calUrl]);

  return (
    <div id="discovery" className="mt-9 bg-[#142334] text-white p-7 md:p-8">
      <CalendarDays className="h-7 w-7 text-[#C9AD98]" />
      <h3 className="mt-5 font-serif text-[31px] leading-tight">Discovery calls are free.</h3>
      <p className="mt-4 text-[15px] leading-relaxed text-white/72">
        Twenty minutes to understand where you are, what you want, and whether I can help. Choose a time that works for you.
      </p>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C9AD98] px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#142334] transition hover:bg-white"
        >
          {isOpen ? 'Hide times' : 'Choose a time'} <ArrowUpRight className="h-4 w-4" />
        </button>
        <a
          href={calUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/72 transition hover:border-white hover:text-white"
        >
          Open Cal.com
        </a>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: 16 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: 12 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-7 border border-white/12 bg-white p-2 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
              <iframe
                title="Book a discovery call with Coach Kagiso"
                src={embedUrl}
                loading="lazy"
                className="h-[680px] w-full bg-white"
              />
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-white/48">
              If the scheduler does not load, use the Cal.com button above.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
