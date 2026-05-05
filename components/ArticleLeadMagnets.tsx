import Link from 'next/link';

type AuditBreakLeadMagnetProps = {
  eyebrow?: string;
  title?: string;
  body?: string;
  cta?: string;
  href?: string;
};

export function AuditBreakLeadMagnet({
  eyebrow = 'Free career audit',
  title = 'Feeling called out already?',
  body = 'Take the 5-minute Personal Brand Audit and find out where your career visibility is breaking down.',
  cta = 'Take the audit',
  href = '/#leadmagnet',
}: AuditBreakLeadMagnetProps) {
  return (
    <aside className="my-14 relative overflow-hidden bg-[#142334] text-white px-7 py-9 md:px-10 md:py-12">
      <div className="absolute -right-16 -top-16 h-64 w-64 opacity-20 text-[#C9AD98]">
        <svg viewBox="0 0 200 200" fill="none" className="h-full w-full">
          <path d="M14 116 C 36 24, 145 18, 186 92 C 170 170, 54 188, 14 116Z" stroke="currentColor" strokeWidth="0.7" />
          <path d="M36 112 C 55 48, 132 43, 161 94 C 146 148, 67 162, 36 112Z" stroke="currentColor" strokeWidth="0.7" />
          <path d="M58 109 C 72 69, 121 65, 139 96 C 126 128, 82 137, 58 109Z" stroke="currentColor" strokeWidth="0.7" />
        </svg>
      </div>
      <div className="relative z-10 grid md:grid-cols-[1fr_auto] gap-8 md:items-end">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-[#C9AD98]">{eyebrow}</p>
          <h3 className="mt-4 font-serif text-[34px] md:text-[44px] leading-tight">
            {title}
          </h3>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-white/76">
            {body}
          </p>
        </div>
        <Link
          href={href}
          className="inline-flex justify-center rounded-full bg-[#C9AD98] text-[#142334] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.18em] hover:bg-white hover:-translate-y-1 transition-all duration-300"
        >
          {cta}
        </Link>
      </div>
    </aside>
  );
}
