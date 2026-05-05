'use client';

import { useEffect, useState } from 'react';

type TrackNavItem = {
  id: string;
  title: string;
};

type WorkTrackNavProps = {
  items: TrackNavItem[];
};

export default function WorkTrackNav({ items }: WorkTrackNavProps) {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    let frameId = 0;

    const updateActiveTrack = () => {
      const sections = items
        .map((item) => document.getElementById(item.id))
        .filter((section): section is HTMLElement => Boolean(section));

      const readingLine = window.scrollY + window.innerHeight * 0.35;
      const activeSection = sections.find((section) => {
        const top = section.offsetTop;
        const bottom = top + section.offsetHeight;

        return readingLine >= top && readingLine < bottom;
      });

      setActiveId(activeSection?.id ?? '');
    };

    const requestUpdate = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateActiveTrack);
    };

    updateActiveTrack();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
    };
  }, [items]);

  return (
    <section className="sticky top-[72px] z-30 hidden border-y border-[#142334]/10 bg-white/90 backdrop-blur-md lg:block">
      <div className="max-w-[1180px] mx-auto px-6 lg:px-8">
        <nav className="flex items-center justify-between gap-3 py-3" aria-label="Work with me tracks">
          {items.map((item) => {
            const isActive = activeId === item.id;

            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                aria-current={isActive ? 'true' : undefined}
                className={`px-1 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-300 ${
                  isActive
                    ? 'text-[#C9AD98]'
                    : 'text-[#142334]/62 hover:text-[#142334]'
                }`}
              >
                {item.title}
              </a>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
