'use client';
import { motion } from 'motion/react';

export default function Services() {
  const services = [
    { title: 'CV Revamp', price: 'R400', desc: 'A complete ATS-optimised rewrite for the South African market. We strip the fluff, quantify your impact, and position you for interviews — not rejections.' },
    { title: 'LinkedIn + CV', price: 'R500', desc: 'Get discovered by recruiters. A powerful LinkedIn profile rewrite plus full CV alignment to tell one consistent, confidence-building story.' },
    { title: 'Career Clarity', price: 'R800', desc: 'A 60-minute 1:1 strategy session for your promotion plan, pivot, or personal brand. Leave with immediate next steps, not generic advice.', popular: true },
  ];

  return (
    <section id="work" className="py-20 lg:py-32 bg-[#FCFBFA] relative overflow-hidden">
      <motion.div
        animate={{ scale: [1, 1.05, 1], rotate: [0, -1, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 right-0 w-[500px] h-[500px] opacity-20 pointer-events-none overflow-hidden text-[#C9AD98]"
      >
         <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full transform translate-x-1/4 -translate-y-1/4">
           <path d="M0 200 C 50 200, 100 150, 100 100 C 100 50, 150 0, 200 0" stroke="currentColor" strokeWidth="0.5"/>
           <path d="M0 190 C 45 190, 90 145, 90 100 C 90 55, 135 10, 200 10" stroke="currentColor" strokeWidth="0.5"/>
           <path d="M0 180 C 40 180, 80 140, 80 100 C 80 60, 120 20, 200 20" stroke="currentColor" strokeWidth="0.5"/>
           <path d="M0 170 C 35 170, 70 135, 70 100 C 70 65, 105 30, 200 30" stroke="currentColor" strokeWidth="0.5"/>
           <path d="M0 160 C 30 160, 60 130, 60 100 C 60 70, 90 40, 200 40" stroke="currentColor" strokeWidth="0.5"/>
           <path d="M0 150 C 25 150, 50 125, 50 100 C 50 75, 75 50, 200 50" stroke="currentColor" strokeWidth="0.5"/>
         </svg>
      </motion.div>
      <div className="max-w-[1000px] mx-auto px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-20 lg:mb-24">
          <p className="text-[#C9AD98] text-[11px] font-semibold tracking-[0.25em] uppercase mb-4">Investment</p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-serif font-medium text-[40px] md:text-[52px] text-[#142334] leading-[1.1]"
          >
              Find the right level of support
          </motion.h2>
        </div>
        <div className="space-y-12 lg:space-y-16">
          {services.map((s, index) => (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                key={s.title}
                className="group flex flex-col md:flex-row gap-6 md:gap-12 pb-12 lg:pb-16 border-b border-[#CDC6C3]/60 relative"
            >
              <div className="md:w-1/3 flex-shrink-0">
                <span className="font-signature text-[56px] text-[#C9AD98] leading-none opacity-50 block mb-2 transform -translate-y-4 pr-1">0{index + 1}</span>
                <h3 className="font-serif font-medium text-[28px] lg:text-[32px] text-[#142334] leading-[1.2]">{s.title}</h3>
                <p className="font-serif italic text-[#C9AD98] text-[20px] mt-2">{s.price}</p>
              </div>
              <div className="md:w-2/3">
                <p className="text-[17px] leading-relaxed text-[#142334]/80">{s.desc}</p>
                <a href="#" className="mt-8 inline-flex px-8 py-3 bg-white border border-[#142334] text-[#142334] text-[13px] font-semibold tracking-widest uppercase rounded-full hover:bg-[#142334] hover:text-white hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                  {s.popular ? 'Book The Most Popular' : 'Select Service'}
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
