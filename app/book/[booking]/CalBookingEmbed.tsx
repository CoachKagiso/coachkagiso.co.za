'use client';

import Cal from '@calcom/embed-react';

type CalBookingEmbedProps = {
  calUrl: string;
};

function parseCalUrl(calUrl: string) {
  try {
    const url = new URL(calUrl);
    return {
      origin: url.origin,
      link: url.pathname.replace(/^\//, ''),
    };
  } catch {
    return {
      origin: 'https://cal.com',
      link: 'kagiso/discovery-call',
    };
  }
}

export default function CalBookingEmbed({ calUrl }: CalBookingEmbedProps) {
  const { origin, link } = parseCalUrl(calUrl);

  return (
    <div className="overflow-hidden border border-[#D8C8BB] bg-white shadow-[0_24px_80px_rgba(20,35,52,0.08)]">
      <Cal
        calOrigin={origin}
        calLink={link}
        style={{ width: '100%', height: '760px', overflow: 'scroll' }}
        config={{
          layout: 'month_view',
        }}
      />
    </div>
  );
}
