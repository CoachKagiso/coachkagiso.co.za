'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const RETRY_INTERVAL_MS = 2500;
const MAX_RETRIES = 8;

export default function BookingConfirmRetry() {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (attempt >= MAX_RETRIES) return;

    const timer = setTimeout(() => {
      setAttempt((current) => current + 1);
      router.refresh();
    }, RETRY_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [attempt, router]);

  if (attempt < MAX_RETRIES) return null;

  return (
    <p className="mt-5 text-[15px] leading-relaxed text-[#142334]/68">
      This is taking longer than usual. Your time is still held. Check your inbox for the payment link, or
      WhatsApp Kagiso on 069 512 4398 and she will send it to you directly.
    </p>
  );
}
