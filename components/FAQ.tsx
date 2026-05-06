'use client';

import Link from 'next/link';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { GeoArchPattern } from '@/components/DecorativeMotifs';

const faqs = [
  {
    q: 'How long does a CV revamp take?',
    a: 'Typically 5-7 business days from the moment you submit your intake form. The process is careful because the goal is not a prettier document. The goal is clearer positioning.',
  },
  {
    q: 'Do you only work with banking and insurance professionals?',
    a: 'No. That background gives me useful context, but the principles of visibility, CV strategy, interview positioning, and career movement apply across corporate and professional environments.',
  },
  {
    q: 'What happens in the Career Clarity call?',
    a: 'We unpack where you are stuck, identify the blind spots in your current strategy, and map the next practical moves. You leave with direction, not just motivation.',
  },
  {
    q: 'Will my CV pass South African ATS systems?',
    a: 'Yes. Every CV is structured for readability, role alignment, and applicant tracking systems commonly used by South African employers.',
  },
  {
    q: 'How do I pay?',
    a: 'Payment is handled by secure EFT or PayFast. You receive the details once we have agreed on the scope of work.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Because this is customised, time-intensive work, I do not offer refunds. I do work closely with you so the final result is clear, useful, and aligned to your goal.',
  },
];

export default function FAQ() {
  return (
    <section
      className="sticky top-0 py-24 lg:py-32 bg-white overflow-hidden z-0"
    >
      <div className="absolute inset-y-0 left-0 w-[34%] bg-[#FCFBFA] hidden lg:block"></div>
      <GeoArchPattern className="absolute right-[-120px] top-20 h-[420px] w-[460px] opacity-10 text-[#142334] pointer-events-none" />

      <div className="relative z-10 max-w-[1240px] mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-[0.75fr_1fr] gap-12 lg:gap-20 items-start">
          <div className="lg:sticky lg:top-28">
            <p className="inline-block border border-[#C9AD98]/60 px-4 py-1 rounded-full text-[12px] font-semibold tracking-[0.25em] uppercase text-[#C9AD98]">
              Good questions
            </p>
            <h2 className="mt-6 font-serif font-medium text-[42px] md:text-[62px] leading-tight text-[#142334]">
              Still deciding if this is the right step?
            </h2>
            <p className="mt-6 max-w-md text-[17px] leading-relaxed text-[#142334]/74">
              These are the questions people usually ask before we work together. If your question is more personal, send it through.
            </p>
            <Link
              href="/contact"
              className="mt-9 inline-flex items-center gap-3 rounded-full bg-[#142334] text-white px-7 py-3.5 text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#C9AD98] hover:text-[#142334] hover:-translate-y-1 transition-all duration-300"
            >
              <MessageCircle className="h-4 w-4" />
              Ask a question
            </Link>
          </div>

          <div className="border-t border-[#142334]/15">
            {faqs.map((faq, index) => (
              <details key={faq.q} className="group border-b border-[#142334]/15 [&_summary::-webkit-details-marker]:hidden" open={index === 0}>
                <motion.summary
                  whileHover={{ x: 12 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  className="grid grid-cols-[auto_1fr_auto] gap-5 items-center py-7 cursor-pointer will-change-transform"
                >
                  <span className="font-display text-[38px] leading-none text-[#C9AD98]">0{index + 1}</span>
                  <span className="font-serif text-[24px] md:text-[30px] leading-tight text-[#142334]">{faq.q}</span>
                  <ChevronDown className="h-5 w-5 text-[#C9AD98] transition-transform duration-300 group-open:rotate-180" />
                </motion.summary>
                <div className="pb-8 pl-[64px] pr-10 text-[16px] md:text-[17px] leading-relaxed text-[#142334]/75">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
