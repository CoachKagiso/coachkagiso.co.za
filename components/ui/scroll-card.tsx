'use client';
import { ReactLenis } from 'lenis/react';
import React, { forwardRef } from 'react';

interface ArticleCardData {
  title: string;
  description: string;
  color: string;
  rotation: string;
}

const articleCardsData: ArticleCardData[] = [
  {
    title: 'I reply within 24 hours.',
    description: "Weekdays, usually sooner. If you message over the weekend, I'll get back to you by Monday.",
    color: '#FCFBFA',
    rotation: '-rotate-2',
  },
  {
    title: 'Discovery calls are free and last 20 minutes.',
    description: "We'll talk about where you are, what you want, and whether working together makes sense.",
    color: '#F5EBE1',
    rotation: 'rotate-2',
  },
  {
    title: 'No pressure, no pitch.',
    description: "If I'm not the right person for what you need, I'll tell you honestly — and point you toward someone or something that might help.",
    color: '#E4D8CB',
    rotation: '-rotate-2',
  },
];

const ScrollCard = forwardRef<HTMLElement>((props, ref) => {
  return (
    <ReactLenis root>
      <section className='text-[#142334] w-full bg-white max-w-[1200px] mx-auto' ref={ref}>
        <div className='flex flex-col lg:flex-row justify-between px-6 lg:px-8'>
          <div className='lg:sticky lg:top-0 lg:h-screen grid place-content-center pt-16 lg:pt-0 mb-8 lg:mb-0'>
            <h2 className='text-[32px] md:text-[45px] font-serif font-medium text-left lg:text-left tracking-tight leading-tight'>
              What happens after <br className="hidden lg:block"/> you reach out
            </h2>
          </div>
          <div className='grid gap-4 w-full lg:w-1/2'>
            {articleCardsData.map((card, i) => (
              <figure key={i} className='lg:sticky lg:top-0 lg:h-screen grid place-content-center'>
                <article
                  className={`h-72 w-full max-w-[30rem] rounded-2xl ${card.rotation} p-8 grid place-content-center gap-6 shadow-sm border border-[#CDC6C3]/20 mx-auto transition-transform`}
                  style={{ backgroundColor: card.color }}
                >
                  <h3 className='text-[20px] font-serif font-medium text-[#142334] leading-tight'>{card.title}</h3>
                  <p className='font-sans text-[17px] text-[#142334] leading-relaxed'>{card.description}</p>
                </article>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </ReactLenis>
  );
});

ScrollCard.displayName = 'ScrollCard';

export default ScrollCard;
