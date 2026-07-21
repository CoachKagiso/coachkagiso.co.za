'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, ShieldCheck, UserPlus, X } from 'lucide-react';
import { asyncServices, formatCurrency, type AsyncServiceSlug, type IntakeField } from '@/lib/buying-flow';
import { buildClientStrategyWorkspaceHref, isClientStrategyServiceSlug } from '@/lib/client-strategy';
import { getDashboardLegacyKey } from '@/lib/dashboard-auth-url';
import {
  getManualClientIntakeFields,
  manualClientRequiresCv,
  MANUAL_PAYMENT_METHODS,
} from '@/lib/manual-client-engagement';
import FilterDropdown from '@/components/FilterDropdown';
import DashboardDatePicker from '@/components/DashboardDatePicker';
import DashboardTimePicker from '@/components/DashboardTimePicker';


type CreateResponse = {
  success?: boolean;
  paymentId?: string;
  serviceSlug?: AsyncServiceSlug;
  isTest?: boolean;
  code?: string;
  existingPaymentId?: string;
  existingConfirmedAt?: string;
  error?: string;
};

const paymentMethodLabels: Record<(typeof MANUAL_PAYMENT_METHODS)[number], string> = {
  eft: 'EFT / bank transfer',
  cash: 'Cash',
  card_machine: 'Card machine',
  other: 'Other verified method',
};

function localDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function FieldInput({ field }: { field: IntakeField }) {
  const name = `intake_${field.name}`;
  const className = 'w-full rounded-[8px] border border-[#A09086] bg-white px-3 py-2.5 text-[14px] text-[#142334] outline-none transition focus:border-[#142334]';

  if (field.type === 'textarea') {
    return (
      <textarea
        id={name}
        name={name}
        required={field.required}
        maxLength={field.maxLength}
        placeholder={field.placeholder}
        className={`${className} min-h-24 resize-y`}
      />
    );
  }

  if (field.type === 'radio') {
    return (
      <FilterDropdown
        name={name}
        value=""
        ariaLabel={field.label}
        options={[
          { value: '', label: 'Choose an option' },
          ...(field.options?.map((option) => ({ value: option, label: option })) ?? []),
        ]}
      />
    );
  }

  return (
    <input
      id={name}
      name={name}
      type={field.type}
      required={field.required}
      maxLength={field.maxLength}
      placeholder={field.placeholder}
      className={className}
    />
  );
}

export default function ManualClientEngagementForm({
  adminKey,
  onCreated,
}: {
  adminKey: string;
  onCreated: (isTest: boolean) => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [serviceSlug, setServiceSlug] = useState<AsyncServiceSlug>('career-clarity');
  const [amount, setAmount] = useState(String(asyncServices['career-clarity'].amount));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [duplicate, setDuplicate] = useState<CreateResponse | null>(null);
  const [created, setCreated] = useState<CreateResponse | null>(null);
  const service = asyncServices[serviceSlug];
  const intakeFields = useMemo(() => getManualClientIntakeFields(service), [service]);
  const requiresCv = manualClientRequiresCv(service);

  // Datetime state for Payment received
  const now = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [now]);
  const [paidAtDate, setPaidAtDate] = useState<string>(todayStr);
  const [paidAtTime, setPaidAtTime] = useState<string>(
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  );

  // Datetime state for Session or kick-off date
  const [sessionDate, setSessionDate] = useState<string>('');
  const [sessionTime, setSessionTime] = useState<string>('');

  function combineDatetime(dateStr: string, time: string): string {
    if (!dateStr) return '';
    const [hours = '00', minutes = '00'] = time ? time.split(':') : [];
    const [year, month, day] = dateStr.split('-').map(Number);
    const combined = new Date(year, month - 1, day, Number(hours), Number(minutes), 0, 0);
    return combined.toISOString();
  }

  function selectService(nextSlug: string) {
    const next = asyncServices[nextSlug as AsyncServiceSlug];
    if (!next) return;
    setServiceSlug(next.slug);
    setAmount(String(next.amount));
    setError('');
    setDuplicate(null);
  }

  function close() {
    if (isSubmitting) return;
    setOpen(false);
    setError('');
    setDuplicate(null);
    setCreated(null);
  }

  async function submit(form: HTMLFormElement, confirmDuplicate: boolean) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    if (!confirmDuplicate) setDuplicate(null);

    try {
      const formData = new FormData(form);
      const paidAt = String(formData.get('paid_at') || '');
      const sessionDate = String(formData.get('session_date') || '');
      if (paidAt) formData.set('paid_at', new Date(paidAt).toISOString());
      if (sessionDate) formData.set('session_date', new Date(sessionDate).toISOString());
      if (confirmDuplicate) formData.set('confirm_duplicate', 'true');

      const legacyKey = getDashboardLegacyKey(adminKey);
      const response = await fetch('/api/clients/manual', {
        method: 'POST',
        headers: legacyKey ? { 'x-diagnostic-admin-key': legacyKey } : undefined,
        body: formData,
      });
      const data = await response.json().catch(() => null) as CreateResponse | null;
      if (response.status === 409 && data?.code === 'possible_duplicate') {
        setDuplicate(data);
        return;
      }
      if (!response.ok || !data?.paymentId) throw new Error(data?.error || 'Could not create this client engagement.');

      setCreated(data);
      setDuplicate(null);
      onCreated(Boolean(data.isTest));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create this client engagement.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#142334] px-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
      >
        <UserPlus className="h-4 w-4" /> Add client manually
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-[#142334]/55 p-3 backdrop-blur-sm md:p-6" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-client-title"
            className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-[16px] bg-[#F5F3EE] shadow-[0_30px_90px_rgba(20,35,52,0.35)]"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#D8C8BB] bg-[#F5F3EE] px-5 py-4 md:px-7">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8C7466]">Clients / Manual engagement</p>
                <h2 id="manual-client-title" className="mt-1 font-serif text-[31px] leading-tight text-[#142334]">Add a paid client</h2>
                <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[#6B6B6B]">
                  Save the verified payment, questionnaire, and CV once. Eligible services will appear in Career Tools automatically.
                </p>
              </div>
              <button type="button" onClick={close} aria-label="Close manual client form" className="rounded-full p-2 text-[#6B6B6B] transition hover:bg-white hover:text-[#142334]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {created?.paymentId ? (
              <div className="p-6 md:p-8">
                <div className="rounded-[12px] border border-[#A7D8BE] bg-[#ECFDF3] p-6">
                  <CheckCircle2 className="h-8 w-8 text-[#067647]" />
                  <h3 className="mt-4 font-serif text-[28px] text-[#142334]">Client engagement created</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#35614A]">
                    {created.isTest ? 'This is clearly marked as a test record.' : 'The verified manual payment and intake are now connected.'}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {created.serviceSlug && isClientStrategyServiceSlug(created.serviceSlug) && (
                      <Link
                        href={buildClientStrategyWorkspaceHref(adminKey, created.paymentId)}
                        className="inline-flex items-center gap-2 rounded-full bg-[#142334] px-5 py-2.5 text-[12px] font-semibold text-white"
                      >
                        Open Strategy Workspace <ExternalLink className="h-4 w-4" />
                      </Link>
                    )}
                    <button type="button" onClick={close} className="rounded-full border border-[#142334] px-5 py-2.5 text-[12px] font-semibold text-[#142334]">
                      Return to Clients
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form
                ref={formRef}
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit(event.currentTarget, false);
                }}
                className="grid gap-5 p-5 md:p-7"
              >
                <div className="rounded-[12px] bg-white p-5">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#8C7466]" />
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#142334]">Record safety</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-[#6B6B6B]">No email is sent when this record is created. Test records are excluded from live figures and cannot send a strategy plan.</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 rounded-[12px] bg-white p-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <h3 className="font-serif text-[24px] text-[#142334]">Client and service</h3>
                  </div>
                  <label className="grid gap-2 text-[12px] font-semibold text-[#142334]">
                    Full name
                    <input name="full_name" required maxLength={80} autoComplete="name" className="rounded-[8px] border border-[#A09086] px-3 py-2.5 text-[14px] outline-none focus:border-[#142334]" />
                  </label>
                  <label className="grid gap-2 text-[12px] font-semibold text-[#142334]">
                    Email address
                    <input name="email" type="email" required maxLength={120} autoComplete="email" className="rounded-[8px] border border-[#A09086] px-3 py-2.5 text-[14px] outline-none focus:border-[#142334]" />
                  </label>
                  <label className="grid gap-2 text-[12px] font-semibold text-[#142334]">
                    WhatsApp number <span className="font-normal text-[#6B6B6B]">Optional</span>
                    <input name="whatsapp" type="tel" maxLength={30} autoComplete="tel" className="rounded-[8px] border border-[#A09086] px-3 py-2.5 text-[14px] outline-none focus:border-[#142334]" />
                  </label>
                  <div className="grid gap-2">
                    <span className="text-[12px] font-semibold text-[#142334]">Service purchased</span>
                    <FilterDropdown
                      name="service_slug"
                      value={serviceSlug}
                      onChange={selectService}
                      ariaLabel="Service purchased"
                      options={Object.values(asyncServices).map((option) => ({
                        value: option.slug,
                        label: `${option.title} · ${formatCurrency(option.amount)}`,
                      }))}
                    />
                  </div>
                  <label className="md:col-span-2 flex items-start gap-3 rounded-[8px] border border-[#C4B5FD] bg-[#F5F3FF] p-4 text-[13px] leading-relaxed text-[#4C1D95]">
                    <input name="is_test" type="checkbox" value="true" className="mt-0.5 h-4 w-4 shrink-0 accent-[#6D28D9]" />
                    <span><strong>This is a test record.</strong> Keep the workflow realistic, but exclude it from revenue and block external delivery.</span>
                  </label>
                </div>

                <div className="grid gap-5 rounded-[12px] bg-white p-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <h3 className="font-serif text-[24px] text-[#142334]">Verified payment</h3>
                    <p className="mt-1 text-[13px] text-[#6B6B6B]">Only add a real client after the money is visible in the bank or has been received.</p>
                  </div>
                  <div className="grid gap-2">
                    <span className="text-[12px] font-semibold text-[#142334]">Payment method</span>
                    <FilterDropdown
                      name="payment_method"
                      value="eft"
                      ariaLabel="Payment method"
                      options={MANUAL_PAYMENT_METHODS.map((method) => ({
                        value: method,
                        label: paymentMethodLabels[method],
                      }))}
                    />
                  </div>
                  <label className="grid gap-2 text-[12px] font-semibold text-[#142334]">
                    Amount received
                    <div className="amount-input-container flex rounded-[8px] border border-[#A09086] focus-within:border-[#142334]">
                      <span className="amount-input-prefix grid place-items-center border-r border-[#A09086] px-3 text-[13px] text-[#6B6B6B]">R</span>
                      <input name="amount" type="number" min="0.01" max="1000000" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} className="min-w-0 flex-1 rounded-r-[8px] px-3 py-2.5 text-[14px] outline-none" />
                    </div>
                  </label>
                  <div className="grid gap-2">
                    <span className="text-[12px] font-semibold text-[#142334]">Payment received</span>
                    <input type="hidden" name="paid_at" value={combineDatetime(paidAtDate, paidAtTime)} />
                    <div className="grid grid-cols-2 gap-2">
                      <DashboardDatePicker
                        name="_paid_at_date"
                        value={paidAtDate}
                        onChange={setPaidAtDate}
                        ariaLabel="Payment date"
                        placeholder="Date"
                      />
                      <DashboardTimePicker
                        name="_paid_at_time"
                        value={paidAtTime}
                        onChange={setPaidAtTime}
                        ariaLabel="Payment time"
                        placeholder="Time"
                      />
                    </div>
                  </div>
                  <label className="grid gap-2 text-[12px] font-semibold text-[#142334]">
                    Bank or receipt reference <span className="font-normal text-[#6B6B6B]">Optional</span>
                    <input name="payment_reference" maxLength={120} className="rounded-[8px] border border-[#A09086] px-3 py-2.5 text-[14px] outline-none focus:border-[#142334]" />
                  </label>
                  <label className="md:col-span-2 grid gap-2 text-[12px] font-semibold text-[#142334]">
                    Private payment note <span className="font-normal text-[#6B6B6B]">Optional</span>
                    <textarea name="payment_notes" maxLength={1000} className="min-h-20 resize-y rounded-[8px] border border-[#A09086] px-3 py-2.5 text-[14px] outline-none focus:border-[#142334]" />
                  </label>
                  <label className="md:col-span-2 flex items-start gap-3 rounded-[8px] border border-[#F2C94C] bg-[#FFFBEB] p-4 text-[13px] leading-relaxed text-[#7A4D00]">
                    <input name="payment_verified" type="checkbox" value="true" required className="mt-0.5 h-4 w-4 shrink-0 accent-[#142334]" />
                    <span>I confirm that I verified this payment before creating the paid engagement.</span>
                  </label>
                </div>

                <div className="grid gap-5 rounded-[12px] bg-white p-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <h3 className="font-serif text-[24px] text-[#142334]">Questionnaire and CV</h3>
                    <p className="mt-1 text-[13px] text-[#6B6B6B]">These answers become the client intake used by the delivery workspace.</p>
                  </div>
                  {intakeFields.map((field) => (
                    <label key={field.name} className={`grid gap-2 text-[12px] font-semibold text-[#142334] ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}>
                      <span>{field.label} {field.required && <span className="text-[#A15C38]">(required)</span>}</span>
                      <FieldInput field={field} />
                    </label>
                  ))}
                  {(service.kind === 'booking') && (
                    <div className="grid gap-2 md:col-span-2">
                      <span className="text-[12px] font-semibold text-[#142334]">
                        Session or kick-off date <span className="font-normal text-[#6B6B6B]">Optional</span>
                      </span>
                      <input type="hidden" name="session_date" value={combineDatetime(sessionDate, sessionTime)} />
                      <div className="grid grid-cols-2 gap-2">
                        <DashboardDatePicker
                          name="_session_date"
                          value={sessionDate}
                          onChange={setSessionDate}
                          ariaLabel="Session date"
                          placeholder="Date"
                        />
                        <DashboardTimePicker
                          name="_session_time"
                          value={sessionTime}
                          onChange={setSessionTime}
                          ariaLabel="Session time"
                          placeholder="Time"
                        />
                      </div>
                    </div>
                  )}
                  <label className="grid gap-2 text-[12px] font-semibold text-[#142334] md:col-span-2">
                    Client CV {requiresCv ? <span className="text-[#A15C38]">Required</span> : <span className="font-normal text-[#6B6B6B]">Optional</span>}
                    <input
                      name="cv_file"
                      type="file"
                      required={requiresCv}
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="rounded-[8px] border border-[#A09086] bg-[#FCFBFA] px-3 py-2.5 text-[13px] file:mr-4 file:rounded-full file:border-0 file:bg-[#142334] file:px-4 file:py-2 file:text-[11px] file:font-semibold file:text-white"
                    />
                    <span className="font-normal text-[#6B6B6B]">PDF or Word, maximum 10MB. Stored in the private client bucket.</span>
                  </label>
                </div>


                {duplicate && (
                  <div className="rounded-[12px] border border-[#F2C94C] bg-[#FFFBEB] p-5 text-[#7A4D00]">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-semibold">Possible duplicate engagement</p>
                        <p className="mt-1 text-[13px] leading-relaxed">A recent payment uses this client, service, or reference. Review the Clients tab before creating another record.</p>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => formRef.current && void submit(formRef.current, true)}
                          className="mt-3 rounded-full border border-[#7A4D00] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em]"
                        >
                          Create separate engagement anyway
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-3 rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] p-4 text-[13px] leading-relaxed text-[#991B1B]">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                  </div>
                )}

                <div className="flex flex-wrap justify-end gap-3 border-t border-[#D8C8BB] pt-5">
                  <button type="button" onClick={close} disabled={isSubmitting} className="rounded-full border border-[#142334] px-5 py-2.5 text-[12px] font-semibold text-[#142334] disabled:opacity-50">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="inline-flex min-w-48 items-center justify-center gap-2 rounded-full bg-[#142334] px-6 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-55">
                    {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving client</> : <><UserPlus className="h-4 w-4" /> Create engagement</>}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
