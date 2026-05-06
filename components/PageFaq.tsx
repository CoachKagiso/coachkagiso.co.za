import Link from 'next/link';
import { ChevronDown, MessageCircle } from 'lucide-react';
import Reveal from '@/components/Reveal';

export type PageFaqItem = {
  question: string;
  answer: string;
};

type PageFaqProps = {
  eyebrow?: string;
  title: string;
  description: string;
  items: PageFaqItem[];
  ctaHref?: string;
  ctaLabel?: string;
  backgroundClassName?: string;
};

export default function PageFaq({
  eyebrow = 'FAQ',
  title,
  description,
  items,
  ctaHref = '/contact',
  ctaLabel = 'Ask a question',
  backgroundClassName = 'bg-white',
}: PageFaqProps) {
  return (
    <section className={`py-20 lg:py-28 ${backgroundClassName}`}>
      <div className="mx-auto max-w-[1120px] px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.78fr_1fr] lg:gap-16">
          <Reveal direction="right">
            <p className="inline-flex rounded-full border border-[#C9AD98]/60 px-4 py-1 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#C9AD98]">
              {eyebrow}
            </p>
            <h2 className="mt-6 font-serif text-[42px] leading-tight text-[#142334] md:text-[58px]">
              {title}
            </h2>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-[#142334]/74">
              {description}
            </p>
            <Link
              href={ctaHref}
              className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#142334] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
            >
              <MessageCircle className="h-4 w-4" />
              {ctaLabel}
            </Link>
          </Reveal>

          <div className="border-t border-[#142334]/15">
            {items.map((item, index) => (
              <Reveal key={item.question} delay={index * 0.05}>
                <details className="group border-b border-[#142334]/15 [&_summary::-webkit-details-marker]:hidden" open={index === 0}>
                  <summary className="grid cursor-pointer grid-cols-[auto_1fr_auto] gap-5 py-6">
                    <span className="font-serif text-[28px] leading-none text-[#C9AD98]">0{index + 1}</span>
                    <span className="font-serif text-[24px] leading-tight text-[#142334] md:text-[30px]">
                      {item.question}
                    </span>
                    <ChevronDown className="h-5 w-5 text-[#C9AD98] transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <div className="pb-8 pl-[52px] pr-6 text-[16px] leading-relaxed text-[#142334]/74 md:pl-[64px]">
                    {item.answer}
                  </div>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
