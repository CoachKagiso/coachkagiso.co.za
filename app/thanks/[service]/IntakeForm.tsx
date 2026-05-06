'use client';

import { useState } from 'react';
import { ArrowUpRight, CheckCircle2, FileCheck2, ShieldCheck } from 'lucide-react';
import type { AsyncService } from '@/lib/buying-flow';

type IntakeService = Omit<AsyncService, 'confirmationBody'>;

type IntakeFormProps = {
  service: IntakeService;
  paymentId: string;
};

const namePattern = "^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$";
const phonePattern = '^[0-9+() -]{7,30}$';

export default function IntakeForm({ service, paymentId }: IntakeFormProps) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'duplicate' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage('');

    const data = new FormData(event.currentTarget);
    data.set('payment_id', paymentId);
    data.set('service_slug', service.slug);

    const response = await fetch('/api/intake/submit', {
      method: 'POST',
      body: data,
    });
    const result = await response.json();

    if (result.duplicate) {
      setStatus('duplicate');
      setMessage(result.message);
      return;
    }

    if (!response.ok) {
      setStatus('error');
      setMessage(result.error || 'Something went wrong. Please try again.');
      return;
    }

    setStatus('success');
    setMessage(result.message || `Got it. Kagiso will be in touch within ${service.turnaround}.`);
  }

  if (status === 'success' || status === 'duplicate') {
    return (
      <div className="border border-[#D8C8BB] bg-white p-7 shadow-[0_24px_70px_rgba(20,35,52,0.08)] md:p-9">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#C9AD98]/20 text-[#142334]">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="mt-6 font-serif text-[36px] leading-tight text-[#142334]">
          {status === 'duplicate' ? 'Your brief is already in.' : 'Your brief is safely in.'}
        </h2>
        <p className="mt-4 text-[17px] leading-relaxed text-[#142334]/72">{message}</p>
        <p className="mt-5 border-t border-[#142334]/10 pt-5 text-[13px] leading-relaxed text-[#142334]/55">
          Keep an eye on your inbox. If Kagiso needs one quick clarification, she&apos;ll email you directly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-[#D8C8BB] bg-white p-6 shadow-[0_24px_70px_rgba(20,35,52,0.08)] md:p-8">
      <div className="border-b border-[#142334]/10 pb-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#C9AD98]">
          Client brief
        </p>
        <h2 className="mt-3 font-serif text-[34px] leading-tight text-[#142334]">
          Give Kagiso the useful context.
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[#142334]/65">
          The better the brief, the sharper the delivery. Clear answers are more useful than perfect answers.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="flex gap-3 border border-[#E5D8CE] bg-[#FCFBFA] p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#C9AD98]" />
            <p className="text-[13px] leading-relaxed text-[#142334]/65">
              Your details stay private and are only used to complete this order.
            </p>
          </div>
          <div className="flex gap-3 border border-[#E5D8CE] bg-[#FCFBFA] p-4">
            <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-[#C9AD98]" />
            <p className="text-[13px] leading-relaxed text-[#142334]/65">
              PDF or Word uploads are accepted where your service needs a CV.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-7 space-y-6">
      {service.fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <label htmlFor={field.name} className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#142334]">
            {field.label} {field.required && <span className="text-[#C9AD98]">*</span>}
          </label>

          {field.type === 'textarea' ? (
            <textarea
              id={field.name}
              name={field.name}
              required={field.required}
              maxLength={field.maxLength}
              rows={5}
              placeholder={field.placeholder}
              className="w-full resize-none border border-[#CDC6C3] bg-[#FCFBFA] px-4 py-3.5 outline-none transition focus:border-[#142334]"
            />
          ) : field.type === 'radio' ? (
            <div className="grid gap-3 pt-2">
              {field.options?.map((option) => (
                <label key={option} className="flex items-center gap-3 text-[15px] text-[#142334]/72">
                  <input
                    type="radio"
                    name={field.name}
                    value={option}
                    required={field.required}
                    className="h-4 w-4 accent-[#142334]"
                  />
                  {option}
                </label>
              ))}
            </div>
          ) : (
            <input
              id={field.name}
              name={field.name}
              type={field.type}
              required={field.required}
              maxLength={field.maxLength}
              placeholder={field.placeholder}
              autoComplete={field.type === 'email' ? 'email' : field.name === 'fullName' ? 'name' : field.type === 'tel' ? 'tel' : undefined}
              pattern={field.name === 'fullName' ? namePattern : field.type === 'tel' ? phonePattern : undefined}
              title={
                field.name === 'fullName'
                  ? 'Please use letters only. Spaces, apostrophes, and hyphens are allowed.'
                  : field.type === 'tel'
                    ? 'Please enter a valid phone number using numbers, spaces, +, brackets, or hyphens.'
                    : undefined
              }
              className="w-full border border-[#CDC6C3] bg-[#FCFBFA] px-4 py-3.5 outline-none transition focus:border-[#142334]"
            />
          )}
          {field.maxLength && field.type === 'textarea' && (
            <p className="text-[12px] text-[#142334]/45">Recommended limit: {field.maxLength} characters.</p>
          )}
        </div>
      ))}

      {service.requiresCvUpload && (
        <div className="space-y-2">
          <label htmlFor="cv_file" className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#142334]">
            Upload your current CV <span className="text-[#C9AD98]">*</span>
          </label>
          <input
            id="cv_file"
            name="cv_file"
            type="file"
            required
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="w-full border border-[#CDC6C3] bg-[#FCFBFA] px-4 py-3.5 text-[14px] outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-[#142334] file:px-4 file:py-2 file:text-[12px] file:font-semibold file:uppercase file:tracking-[0.14em] file:text-white focus:border-[#142334]"
          />
          <p className="text-[12px] leading-relaxed text-[#142334]/55">
            PDF or Word only. Maximum 10MB.
          </p>
          {service.cvInstruction && (
            <p className="text-[13px] leading-relaxed text-[#142334]/68">{service.cvInstruction}</p>
          )}
        </div>
      )}

      {status === 'error' && (
        <p className="border border-red-200 bg-red-50 px-4 py-3 text-[14px] leading-relaxed text-red-700">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#142334] px-8 py-4 text-[12px] font-semibold uppercase tracking-[0.17em] text-white shadow-[0_14px_30px_rgba(20,35,52,0.18)] transition hover:bg-[#C9AD98] hover:text-[#142334] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'submitting' ? 'Securing your brief...' : 'Submit my brief'} <ArrowUpRight className="h-4 w-4" />
      </button>
      </div>
    </form>
  );
}
