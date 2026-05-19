'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowUpRight, CheckCircle2, Loader2 } from 'lucide-react';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

type MasterclassReserveFormProps = {
  source: string;
};

export default function MasterclassReserveForm({ source }: MasterclassReserveFormProps) {
  const [state, setState] = useState<FormState>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setState('submitting');
    setMessage('');

    try {
      const response = await fetch('/api/masterclass/reserve', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          fullName: data.get('fullName'),
          email: data.get('email'),
          whatsapp: data.get('whatsapp'),
          focus: data.get('focus'),
          source,
        }),
      });

      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error || 'Could not save your seat request.');
      }

      setState('success');
      setMessage('You are on the reserve list. We will email the booking link when the next date is confirmed.');
      form.reset();
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Could not save your seat request.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 grid gap-3">
      <input
        type="text"
        required
        name="fullName"
        placeholder="Full name"
        maxLength={80}
        pattern="^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$"
        title="Please use letters only. Spaces, apostrophes, and hyphens are allowed."
        autoComplete="name"
        className="w-full border border-[#D8C8BB] bg-white px-4 py-3.5 text-[15px] text-[#142334] outline-none transition focus:border-[#142334]"
      />
      <input
        type="email"
        required
        name="email"
        placeholder="Email address"
        maxLength={120}
        autoComplete="email"
        className="w-full border border-[#D8C8BB] bg-white px-4 py-3.5 text-[15px] text-[#142334] outline-none transition focus:border-[#142334]"
      />
      <input
        type="text"
        name="whatsapp"
        placeholder="WhatsApp number (optional)"
        maxLength={30}
        autoComplete="tel"
        className="w-full border border-[#D8C8BB] bg-white px-4 py-3.5 text-[15px] text-[#142334] outline-none transition focus:border-[#142334]"
      />
      <textarea
        required
        name="focus"
        placeholder="What do you want this July masterclass to help you with?"
        maxLength={600}
        rows={5}
        className="w-full resize-y border border-[#D8C8BB] bg-white px-4 py-3.5 text-[15px] text-[#142334] outline-none transition focus:border-[#142334]"
      />
      <button
        type="submit"
        disabled={state === 'submitting'}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#142334] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {state === 'submitting' ? (
          <>
            Reserving <Loader2 className="h-4 w-4 animate-spin" />
          </>
        ) : (
          <>
            Reserve my seat <ArrowUpRight className="h-4 w-4" />
          </>
        )}
      </button>
      {message && (
        <div
          className={`mt-2 flex gap-2 text-[13px] leading-relaxed ${
            state === 'error' ? 'text-red-700' : 'text-[#142334]/70'
          }`}
          role={state === 'error' ? 'alert' : 'status'}
        >
          {state === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#C9AD98]" />}
          <span>{message}</span>
        </div>
      )}
      <p className="mt-2 text-[12px] leading-relaxed text-[#142334]/50">
        This reserves your interest only. You will get the booking and payment link when July dates are live.
      </p>
    </form>
  );
}
