'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import Reveal from '@/components/Reveal';
import CalBookingEmbed from './CalBookingEmbed';

interface BookingPage {
  title: string;
  description: string;
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
              Cal.com booking
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
          </Reveal>
        </div>
      </section>
    </>
  );
}