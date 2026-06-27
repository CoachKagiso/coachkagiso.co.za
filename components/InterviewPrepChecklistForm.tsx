'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowUpRight, CheckCircle2, Loader2 } from 'lucide-react';
import { INTERVIEW_PREP_CHECKLIST_PATH } from '@/lib/interview-prep-checklist';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

type InterviewPrepChecklistFormProps = {
  source: string;
  compact?: boolean;
};

export default function InterviewPrepChecklistForm({
  source,
  compact = false,
}: InterviewPrepChecklistFormProps) {
  const [state, setState] = useState<FormState>('idle');
  const [message, setMessage] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setState('submitting');
    setMessage('');
    setPdfUrl('');

    try {
      const response = await fetch('/api/lead-magnets/interview-prep-checklist', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          firstName: data.get('firstName'),
          email: data.get('email'),
          source,
        }),
      });

      const body = (await response.json()) as { error?: string; pdfUrl?: string };

      if (!response.ok) {
        throw new Error(body.error || 'Could not send the PDF.');
      }

      setPdfUrl(body.pdfUrl || INTERVIEW_PREP_CHECKLIST_PATH);
      setState('success');
      setMessage('Done. Check your inbox, or download the PDF now.');
      form.reset();
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Could not send the PDF.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? 'mt-6 grid gap-3' : 'mt-8 grid gap-3'}>
      <input
        type="text"
        required
        name="firstName"
        placeholder="First name"
        maxLength={50}
        pattern="^[A-Za-z' -]+$"
        title="Please use letters only. Spaces, apostrophes, and hyphens are allowed."
        autoComplete="given-name"
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
      <button
        type="submit"
        disabled={state === 'submitting'}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#142334] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {state === 'submitting' ? (
          <>
            Sending <Loader2 className="h-4 w-4 animate-spin" />
          </>
        ) : (
          <>
            Get the PDF <ArrowUpRight className="h-4 w-4" />
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
          {state === 'success' && (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#C9AD98]" />
          )}
          <span>
            {message}{' '}
            {pdfUrl && (
              <a
                href={pdfUrl}
                className="font-semibold text-[#142334] underline decoration-[#C9AD98] underline-offset-4"
              >
                Download now
              </a>
            )}
          </span>
        </div>
      )}
      <p className="mt-2 text-[12px] leading-relaxed text-[#142334]/50">
        By submitting, you agree to receive the PDF and occasional leadership and career notes
        from Coach Kagiso. POPIA-conscious, and you can unsubscribe at any time.
      </p>
    </form>
  );
}
