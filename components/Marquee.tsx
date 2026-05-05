export default function Marquee() {
  const marqueeItems = [
    "Career Coaching",
    "Leadership",
    "Mentorship",
    "Personal Branding",
    "Show up. Stand out. Level up.",
    "Skills Development",
    "Training",
    "Facilitation",
    "Career Clarity",
    "Show up. Stand out. Level up."
  ];

  return (
    <section className="bg-white text-[#142334] overflow-hidden flex items-center h-[160px]">
      <style>{`
        @keyframes marquee-ltr {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0%); }
        }
        .animate-marquee-scroll {
          animation: marquee-ltr 200s linear infinite;
        }
        .marquee-group:hover .animate-marquee-scroll {
          animation-play-state: paused;
        }
      `}</style>
      <div
        className="relative flex overflow-hidden w-full marquee-group"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
        }}
      >
        <div className="flex whitespace-nowrap items-center animate-marquee-scroll w-max">
          {[...marqueeItems, ...marqueeItems, ...marqueeItems, ...marqueeItems].map((item, index) => (
            <div key={index} className="flex items-center">
              <span className="font-display text-[50px] font-normal tracking-tight mx-6 md:mx-10 whitespace-nowrap uppercase text-[#142334]">
                {item}
              </span>
              <span className="text-[#C9AD98] text-[45px] font-bold">&middot;</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
