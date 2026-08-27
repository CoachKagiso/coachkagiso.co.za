'use client';

import { useEffect, useRef } from 'react';
import Cal, { getCalApi } from '@calcom/embed-react';
import {
  buildBookingConfirmUrl,
  shouldHandOffToCheckout,
  type CalBookingSuccessData,
} from '@/lib/cal-embed-booking';

type CalBookingEmbedProps = {
  calUrl: string;
  // Set only for the paid bookings, which hand off to PayFast straight after the slot is picked.
  confirmPath?: string;
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

export default function CalBookingEmbed({ calUrl, confirmPath }: CalBookingEmbedProps) {
  const { origin, link } = parseCalUrl(calUrl);
  const hasRedirected = useRef(false);

  // Cal.com's own "redirect on booking" is a paid feature, so the handoff to checkout is driven
  // from the embed instead. Anyone who books outside this embed still gets the payment link by
  // email from the Cal webhook.
  useEffect(() => {
    if (!confirmPath) return;

    let cancelled = false;

    const handleBooking = (event: { detail: { data: CalBookingSuccessData } }) => {
      const data = event.detail.data;
      if (hasRedirected.current || !shouldHandOffToCheckout(data)) return;

      hasRedirected.current = true;
      window.location.assign(buildBookingConfirmUrl(confirmPath, data.uid as string));
    };

    getCalApi()
      .then((api) => {
        if (cancelled) return;
        api('on', { action: 'bookingSuccessfulV2', callback: handleBooking });
      })
      .catch(() => {
        // The email fallback still carries the payment link, so a failed listener is not fatal.
        console.error('Cal embed booking listener could not be attached');
      });

    return () => {
      cancelled = true;
    };
  }, [confirmPath]);

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
