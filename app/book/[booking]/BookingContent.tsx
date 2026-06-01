'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import Reveal from '@/components/Reveal';
import MasterclassReserveForm from '@/components/MasterclassReserveForm';
import CalBookingEmbed from './CalBookingEmbed';

interface BookingPage {
  title: string;
  description: string;
  mode?: 'calendar' | 'reservation';
  ctaLabel?: string;
  availabilityNote?: string;
}

interface BookingContentProps {
  booking: string;
  page: BookingPage;
  calUrl: string;
}

export default function BookingContent({ booking, page, calUrl }: BookingContentProps) {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const parallaxX = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const isReservationMode = page.mode === 'reservation';

  return (
    <>
      <section
        ref={sectionRef}
        className="relative overflow-hidden bg-[#E4D8CB] pt-[124px] pb-20 lg:pb-24"
      >
        <div className="absolute inset-x-0 top-24 pointer-events-none select-none text-center overflow-hidden">
          <motion.div style={{ x: parallaxX }}>
            <span className="font-serif text-[15vw] leading-none text-white/35 tracking-normal uppercase">
              {booking}
            </span>
          </motion.div>
        </div>
        <div className="relative z-10 mx-auto max-w-[1120px] px-6 lg:px-8">
          <Reveal className="max-w-4xl">
            <p className="inline-flex rounded-full border border-[#142334]/25 px-4 py-1 text-[12px] font-semibold uppercase tracking-[0.24em] text-[#142334]/70">
              {isReservationMode ? 'July 2026 · Registration open' : 'Cal.com booking'}
            </p>
            <h1 className="mt-7 font-serif text-[52px] leading-[0.94] md:text-[82px]">
              {page.title}
            </h1>
            <p className="mt-7 max-w-2xl text-[18px] leading-relaxed text-[#142334]/76">
              {page.description}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-14 lg:py-20">
        <div className="mx-auto max-w-[1120px] px-6 lg:px-8">
          <Reveal>
            {isReservationMode ? (
              <div className="grid gap-8 border border-[#D8C8BB] bg-white p-8 shadow-[0_24px_80px_rgba(20,35,52,0.08)] lg:grid-cols-[1.08fr_0.92fr] lg:p-10">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C9AD98]">
                    July 2026 · From Stuck to Strategic
                  </p>
                  <h2 className="mt-4 font-serif text-[38px] leading-tight text-[#142334] md:text-[52px]">
                    Two hours to get unstuck. One plan you leave with.
                  </h2>
                  <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[#142334]/74">
                    {page.availabilityNote || 'Join the reserve list and we will email you when the booking link is ready.'}
                  </p>
                  <div className="mt-8 grid gap-3 border-y border-[#D8C8BB] py-6">
                    {[
                      'Session date: Saturday 4 July 2026',
                      'Time: 10:00 to 12:00 SAST',
                      'Platform: Microsoft Teams',
                      'Price: R450 early bird, closes Sunday 7 June at 21:00',
                      'Standard price from Monday 8 June: R500',
                    ].map((item) => (
                      <div key={item} className="text-[15px] leading-relaxed text-[#142334]/72">
                        {item}
                      </div>
                    ))}
                  </div>
                  <p className="mt-6 text-[14px] leading-relaxed text-[#142334]/58">
                    What you get: a 2-hour live session, a take-home pack of four practical PDFs, a 14-day email follow-up, and R100 off any CV Revamp or LinkedIn Package valid for 48 hours after the session.
                  </p>
                </div>

                <div className="border border-[#D8C8BB] bg-[#FCFBFA] p-6 md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C9AD98]">
                    Register now
                  </p>
                  <h3 className="mt-4 font-serif text-[32px] leading-tight text-[#142334]">
                    {page.ctaLabel || 'Reserve my seat'}
                  </h3>
                  <p className="mt-4 text-[15px] leading-relaxed text-[#142334]/68">
                    Fill in your details below. Payment instructions will be sent to you immediately after you submit.
                  </p>
                  <MasterclassReserveForm source={`booking-page:${booking}`} />
                </div>
              </div>
            ) : (
              <>
                <CalBookingEmbed calUrl={calUrl} />
                <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <p className="text-[14px] leading-relaxed text-[#142334]/58">
                    If the calendar does not load, open the booking page directly.
                  </p>
                  <Link
                    href={calUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[#142334]/25 px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#142334] transition hover:bg-[#142334] hover:text-white"
                  >
                    Open Cal.com <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </>
            )}
          </Reveal>
        </div>
      </section>
    </>
  );
}
