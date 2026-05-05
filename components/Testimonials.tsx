'use client';

import { TestimonialsColumn } from '@/components/ui/testimonials-columns-1';
import { motion } from 'motion/react';

export default function Testimonials() {
  const testimonials = [
    {
      text: 'She is the best and she will guide you in the right direction. I am living testimony. Opportunities just start opening up.',
      name: 'Gcina',
      role: 'Mid-career Professional',
    },
    {
      text: 'The best decision I have made for myself. Thank you Kagiso for your guidance.',
      name: 'Kgothatso',
      role: 'Professional',
    },
    {
      text: 'When you learn from the best, you become the best no doubt.',
      name: 'Cynthia',
      role: 'Professional',
    },
    {
      text: 'Working with Kagiso has been one of the most transformative experiences of my professional journey. Her guidance gave me the confidence to lean into discomfort.',
      name: 'Tshepang',
      role: 'Mid-career Professional',
    },
    {
      text: 'You helped me prepare for a senior leadership role and refine my interview approach. I secured the position.',
      name: 'Mbalizethu',
      role: 'Senior Leader',
    },
    {
      text: 'We had sessions which were just more than sessions. You helped me believe in myself again and know my worth, even when unemployed. I landed a job.',
      name: 'KG',
      role: 'Job Seeker',
    },
    {
      text: 'She quickly understood my career goals, highlighted my strengths with clarity, and transformed my profile into a compelling, professional brand.',
      name: 'Kelebogile',
      role: 'Mid-career Professional',
    },
    {
      text: 'Professional, patient, and results-driven. She transformed my profile into a clear, compelling representation of my skills and experience.',
      name: 'Katlego',
      role: 'Mid-career Professional',
    },
    {
      text: "You came at a time when I didn't know where to turn, and gave me clarity, direction, and hope. You refined my CV, and within two months I secured two interviews.",
      name: 'Bulelani',
      role: 'Career Changer',
    },
  ];

  const firstColumn = testimonials.slice(0, 3);
  const secondColumn = testimonials.slice(3, 6);
  const thirdColumn = testimonials.slice(6, 9);

  return (
    <section className="bg-background my-20 relative z-10"
    >
      <div className="container z-10 mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center max-w-[540px] mx-auto"
        >
          <div className="flex justify-center">
            <div className="border py-1 px-4 rounded-full border-[#C9AD98]/60 font-semibold text-[12px] tracking-[0.25em] uppercase text-[#C9AD98]">WHAT PEOPLE SAY</div>
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-medium tracking-tighter mt-5 font-display whitespace-nowrap">
            From people I&apos;ve worked with
          </h2>
          <p className="text-center mt-5 opacity-75">
            I want to keep it honest, I want to keep it real, I want to keep it raw.
          </p>
        </motion.div>

        <div className="flex justify-center gap-6 mt-24 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
          <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
        </div>
      </div>
    </section>
  );
}
