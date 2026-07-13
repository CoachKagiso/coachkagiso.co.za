'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CircleAlert,
  CreditCard,
  Download,
  PackageCheck,
  Search,
  WalletCards,
} from 'lucide-react';
import DashboardDatePicker from '@/components/DashboardDatePicker';
import FilterDropdown from '@/components/FilterDropdown';
import LeadEmailButton from '@/components/leads/LeadEmailButton';
import type { ClientOperation } from '@/lib/client-operations';
import type { DiagnosticLeadStatus, DiagnosticSubmission } from '@/lib/diagnostic-submissions';

type FinanceTabProps = {
  adminKey: string;
  operations: ClientOperation[];
  submissions: DiagnosticSubmission[];
  totalRevenue: number;
  monthlyRevenue: number;
  waitingForIntakeCount: number;
  deliveryQueueCount: number;
  operationServiceCounts: Record<string, number>;
  maxOperationRevenue: number;
};

type DateRangePreset = 'month' | '30' | 'all' | 'custom';

const financeTimeZone = 'Africa/Johannesburg';
const revenueStatuses: DiagnosticLeadStatus[] = ['discovery_booked', 'paid'];
const servicePrices: Record<string, number> = {
  'cv-review-48hr': 150,
  '48-hour-cv-review': 150,
  'cv-review': 150,
  'cv-revamp': 400,
  'cover-letter': 150,
  'linkedin-optimisation': 300,
  'linkedin-optimization': 300,
  'cv-linkedin-bundle': 500,
  'cv-and-linkedin-bundle': 500,
  bundle: 500,
  'career-clarity': 800,
  'career-clarity-session': 800,
  'glow-up-vip': 1200,
  'glow-up-vip-package': 1200,
  'saturday-masterclass': 450,
  'saturday-masterclass-series': 450,
  'first-90-days': 900,
  'leadership-launchpad': 2000,
};

const dateFormatter = new Intl.DateTimeFormat('en-ZA', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: financeTimeZone,
});

function formatMoney(value: number) {
  return `R${Math.round(value).toLocaleString('en-ZA')}`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return dateFormatter.format(date);
}

function getInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthStart() {
  const today = new Date();
  return getInputDate(new Date(today.getFullYear(), today.getMonth(), 1));
}

function getToday() {
  return getInputDate(new Date());
}

function getLast30DaysStart() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return getInputDate(date);
}

function getRangeBoundary(value: string, boundary: 'start' | 'end') {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  if (boundary === 'end') date.setHours(23, 59, 59, 999);
  return date.getTime();
}

function isInsideRange(value: string | null | undefined, from: string, to: string) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return false;

  const fromTime = getRangeBoundary(from, 'start');
  const toTime = getRangeBoundary(to, 'end');
  const time = date.getTime();

  if (fromTime && time < fromTime) return false;
  if (toTime && time > toTime) return false;
  return true;
}

function getTransactionDate(operation: ClientOperation) {
  return operation.payment.confirmed_at || operation.payment.created_at;
}

function getClientName(operation: ClientOperation) {
  return operation.payment.buyer_name?.trim() || operation.payment.buyer_email?.split('@')[0] || 'Unknown client';
}

function getClientEmail(operation: ClientOperation) {
  return operation.payment.buyer_email?.trim() || 'No email recorded';
}

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'there';
}

function getDaysSince(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value).getTime();
  if (Number.isNaN(date)) return 0;
  return Math.max(0, Math.floor((Date.now() - date) / (24 * 60 * 60 * 1000)));
}

function getClientHref(adminKey: string, paymentId: string) {
  const params = new URLSearchParams();
  if (adminKey) params.set('key', adminKey);
  params.set('payment', paymentId);
  return `/dashboard/clients?${params.toString()}`;
}

function getLeadHref(adminKey: string, leadId: string) {
  const params = new URLSearchParams();
  if (adminKey) params.set('key', adminKey);
  return `/resources/career-diagnostic/submissions/${leadId}?${params.toString()}`;
}

function normalizeServiceKey(value?: string | null) {
  return (value || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/\+/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getServiceEstimate(serviceInterest?: string | null) {
  return servicePrices[normalizeServiceKey(serviceInterest)] || 0;
}

function getPriorityScore(submission: DiagnosticSubmission) {
  const submittedAt = new Date(submission.submitted_at).getTime();
  const ageDays = Math.floor((Date.now() - submittedAt) / (24 * 60 * 60 * 1000));
  const service = submission.archetype_payload?.service || '';
  let score = 30;

  if (submission.lead_status === 'new') score += 35;
  if (submission.lead_status === 'follow_up_later') score += 15;
  if (submission.lead_status === 'nurture') score -= 30;
  if (submission.next_follow_up_at && new Date(submission.next_follow_up_at).getTime() <= Date.now()) score += 30;
  if (!submission.last_contacted_at) score += 10;
  if (ageDays <= 2) score += 20;
  if (service.includes('Glow Up') || service.includes('Career Clarity')) score += 15;
  if (submission.archetype_key === 'D' || submission.archetype_key === 'C') score += 10;
  if (revenueStatuses.includes(submission.lead_status)) score -= 20;
  if (submission.lead_status === 'not_a_fit' || submission.lead_status === 'nurture' || submission.lead_status === 'archived' || submission.lead_status === 'closed') {
    score -= 45;
  }

  return Math.max(0, Math.min(score, 100));
}

function escapeCsvValue(value: string | number | null | undefined) {
  const text = String(value ?? '');
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getStatusClass(status: ClientOperation['payment']['status']) {
  if (status === 'confirmed') return 'bg-[#D1FAE5] text-[#065F46]';
  if (status === 'failed') return 'bg-[#FEE2E2] text-[#DC2626]';
  return 'bg-[#F5F3EE] text-[#6B6B6B]';
}

function getDeliveryStatusClass(status: ClientOperation['payment']['delivery_status']) {
  if (status === 'delivered') return 'bg-[#D1FAE5] text-[#065F46]';
  if (status === 'in_progress') return 'bg-[#EEF4FA] text-[#284B70]';
  if (status === 'cancelled') return 'bg-[#FEE2E2] text-[#DC2626]';
  return 'bg-[#F5F3EE] text-[#6B6B6B]';
}

function formatStatusLabel(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getReminderSubject(operation: ClientOperation) {
  return `Intake reminder for your ${operation.serviceTitle}`;
}

function getReminderBody(operation: ClientOperation) {
  const clientName = getClientName(operation);
  const firstName = getFirstName(clientName);

  return `Hi ${firstName},

Thank you again for your ${operation.serviceTitle} payment.

I am ready to move your work forward, but I still need your intake details before I can start properly.

Please submit the intake form when you get a moment so I can review everything and keep your delivery moving.

Kagiso
Career Development & Personal Brand Coach`;
}

export default function FinanceTab({
  adminKey,
  operations,
  submissions,
  totalRevenue,
  monthlyRevenue,
  waitingForIntakeCount,
  deliveryQueueCount,
  operationServiceCounts,
  maxOperationRevenue,
}: FinanceTabProps) {
  const initialFrom = getMonthStart();
  const initialTo = getToday();
  const [rangePreset, setRangePreset] = useState<DateRangePreset>('month');
  const [draftFrom, setDraftFrom] = useState(initialFrom);
  const [draftTo, setDraftTo] = useState(initialTo);
  const [appliedFrom, setAppliedFrom] = useState(initialFrom);
  const [appliedTo, setAppliedTo] = useState(initialTo);
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [logDraftFrom, setLogDraftFrom] = useState('');
  const [logDraftTo, setLogDraftTo] = useState('');
  const [logFrom, setLogFrom] = useState('');
  const [logTo, setLogTo] = useState('');

  const confirmedOperations = useMemo(
    () => operations.filter((operation) => operation.payment.status === 'confirmed'),
    [operations],
  );

  const transactionOperations = useMemo(
    () =>
      operations
        .filter((operation) => operation.payment.status === 'confirmed' || operation.payment.status === 'failed')
        .sort((a, b) => new Date(getTransactionDate(b)).getTime() - new Date(getTransactionDate(a)).getTime()),
    [operations],
  );

  const serviceOptions = useMemo(
    () =>
      Array.from(new Set(transactionOperations.map((operation) => operation.payment.service_slug))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [transactionOperations],
  );
  const serviceFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All services' },
      ...serviceOptions.map((service) => ({
        value: service,
        label: transactionOperations.find((operation) => operation.payment.service_slug === service)?.serviceTitle || service,
      })),
    ],
    [serviceOptions, transactionOperations],
  );

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return transactionOperations.filter((operation) => {
      const transactionDate = getTransactionDate(operation);
      const clientName = getClientName(operation).toLowerCase();
      const clientEmail = getClientEmail(operation).toLowerCase();

      if (!isInsideRange(transactionDate, appliedFrom, appliedTo)) return false;
      if (!isInsideRange(transactionDate, logFrom, logTo)) return false;
      if (serviceFilter !== 'all' && operation.payment.service_slug !== serviceFilter) return false;
      if (query && !clientName.includes(query) && !clientEmail.includes(query)) return false;
      return true;
    });
  }, [appliedFrom, appliedTo, logFrom, logTo, search, serviceFilter, transactionOperations]);

  const transactionTotal = filteredTransactions
    .filter((operation) => operation.payment.status === 'confirmed')
    .reduce((sum, operation) => sum + operation.payment.amount, 0);

  const awaitingIntake = useMemo(
    () =>
      confirmedOperations.filter(
        (operation) => operation.requiresIntake && !operation.payment.intake_submitted_at && !operation.intake,
      ),
    [confirmedOperations],
  );

  const inDelivery = useMemo(
    () =>
      confirmedOperations.filter(
        (operation) =>
          Boolean(!operation.requiresIntake || operation.payment.intake_submitted_at || operation.intake) &&
          operation.payment.delivery_status !== 'delivered' &&
          operation.payment.delivery_status !== 'cancelled',
      ),
    [confirmedOperations],
  );

  const hotLeads = useMemo(() => {
    return submissions
      .map((submission) => {
        const priorityScore = getPriorityScore(submission);
        const serviceInterest = submission.archetype_payload?.service || 'Not specified';
        const estimatedValue = getServiceEstimate(serviceInterest);

        return {
          submission,
          priorityScore,
          serviceInterest,
          estimatedValue,
        };
      })
      .filter(
        (lead) =>
          (lead.submission.lead_status === 'new' || lead.submission.lead_status === 'contacted') &&
          lead.priorityScore >= 80,
      )
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }, [submissions]);

  const projectedTotal = hotLeads.reduce((sum, lead) => sum + lead.estimatedValue, 0);
  const topService =
    Object.entries(
      hotLeads.reduce<Record<string, number>>((acc, lead) => {
        acc[lead.serviceInterest] = (acc[lead.serviceInterest] || 0) + 1;
        return acc;
      }, {}),
    ).sort((a, b) => b[1] - a[1])[0]?.[0] || 'No hot leads';

  function applyRange() {
    setRangePreset('custom');
    setAppliedFrom(draftFrom);
    setAppliedTo(draftTo);
  }

  function setQuickRange(preset: Exclude<DateRangePreset, 'custom'>) {
    const from = preset === 'month' ? getMonthStart() : preset === '30' ? getLast30DaysStart() : '';
    const to = preset === 'all' ? '' : getToday();

    setRangePreset(preset);
    setDraftFrom(from);
    setDraftTo(to);
    setAppliedFrom(from);
    setAppliedTo(to);
  }

  function clearTransactionFilters() {
    setSearch('');
    setServiceFilter('all');
    setLogDraftFrom('');
    setLogDraftTo('');
    setLogFrom('');
    setLogTo('');
  }

  function exportTransactions() {
    const rows = [
      ['Date', 'Client Name', 'Client Email', 'Service', 'Amount', 'Payment ID', 'Confirmed At'],
      ...filteredTransactions.map((operation) => [
        formatDate(getTransactionDate(operation)),
        getClientName(operation),
        getClientEmail(operation),
        operation.serviceTitle,
        operation.payment.amount,
        operation.payment.payment_id,
        operation.payment.confirmed_at || '',
      ]),
    ];

    downloadCsv(`finance-transactions-${getToday()}.csv`, rows);
  }

  const statCards = [
    ['Revenue', formatMoney(totalRevenue), WalletCards],
    ['This month', formatMoney(monthlyRevenue), CreditCard],
    ['Waiting intake', String(waitingForIntakeCount), CircleAlert],
    ['Delivery queue', String(deliveryQueueCount), PackageCheck],
  ] as const;

  return (
    <section id="finance-summary" className="pb-8">
      <div className="w-full">
        <div className="rounded-[8px] bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto_auto_auto] lg:items-end">
            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">From</span>
              <DashboardDatePicker
                name="financeFrom"
                value={draftFrom}
                onChange={setDraftFrom}
                ariaLabel="Finance date from"
                placeholder="Start date"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">To</span>
              <DashboardDatePicker
                name="financeTo"
                value={draftTo}
                onChange={setDraftTo}
                ariaLabel="Finance date to"
                placeholder="End date"
              />
            </label>
            <button
              type="button"
              onClick={applyRange}
              className="h-11 rounded-[8px] bg-[#142334] px-6 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
            >
              Apply
            </button>
            {[
              ['month', 'This month'],
              ['30', 'Last 30 days'],
              ['all', 'All time'],
            ].map(([preset, label]) => (
              <button
                key={preset}
                type="button"
                onClick={() => setQuickRange(preset as Exclude<DateRangePreset, 'custom'>)}
                className={`h-11 rounded-full border px-4 text-[12px] font-semibold transition ${
                  rangePreset === preset
                    ? 'border-[#142334] bg-[#142334] text-white'
                    : 'border-[#E4D8CB] bg-white text-[#142334] hover:border-[#142334]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map(([label, value, Icon]) => {
            const StatIcon = Icon as typeof WalletCards;
            return (
              <div key={label} className="rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA] p-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">{label}</p>
                  <StatIcon className="h-4 w-4 text-[#C9AD98]" />
                </div>
                <p className="mt-4 font-serif text-[31px] leading-tight text-[#142334]">{value}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-[8px] bg-[#FCFBFA] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">Revenue by service</p>
          {Object.keys(operationServiceCounts).length === 0 ? (
            <p className="mt-4 text-[15px] leading-relaxed text-[#142334]/70">
              Revenue will appear after the first confirmed payment.
            </p>
          ) : (
            <div className="mt-5 grid gap-4">
              {Object.entries(operationServiceCounts).map(([serviceName, amount]) => (
                <div key={serviceName}>
                  <div className="flex items-center justify-between gap-4 text-[14px]">
                    <span>{serviceName}</span>
                    <span className="font-serif text-[22px] leading-none">{formatMoney(amount)}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F1E7DF]">
                    <div className="h-full bg-[#C9AD98]" style={{ width: `${(amount / maxOperationRevenue) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="my-7 border-t border-[#E4D8CB]" />

        <section aria-labelledby="transaction-log-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="transaction-log-heading" className="font-serif text-[24px] leading-tight text-[#142334]">
                Transaction log
              </h2>
              <p className="mt-1 text-[14px] text-[#6B6B6B]">Every confirmed payment, newest first.</p>
            </div>
            <button
              type="button"
              onClick={exportTransactions}
              disabled={filteredTransactions.length === 0}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#142334] px-5 text-[13px] font-semibold text-[#142334] transition hover:bg-[#142334] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              Export CSV <Download className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-3 rounded-[8px] bg-white p-4 xl:grid-cols-[minmax(220px,1.4fr)_minmax(160px,0.8fr)_minmax(150px,0.7fr)_minmax(150px,0.7fr)_auto_auto] xl:items-end">
            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Search</span>
              <span className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6B6B]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name or email..."
                  className="h-11 w-full rounded-[8px] border border-[#E4D8CB] bg-white pl-10 pr-3 text-[13px] text-[#142334] outline-none transition placeholder:text-[#6B6B6B]/65 focus:border-[#142334]"
                />
              </span>
            </label>
            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Service</span>
              <FilterDropdown
                name="transactionService"
                value={serviceFilter}
                onChange={setServiceFilter}
                ariaLabel="Filter transactions by service"
                options={serviceFilterOptions}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">From</span>
              <DashboardDatePicker
                name="transactionFrom"
                value={logDraftFrom}
                onChange={setLogDraftFrom}
                ariaLabel="Transaction date from"
                placeholder="Start date"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">To</span>
              <DashboardDatePicker
                name="transactionTo"
                value={logDraftTo}
                onChange={setLogDraftTo}
                ariaLabel="Transaction date to"
                placeholder="End date"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setLogFrom(logDraftFrom);
                setLogTo(logDraftTo);
              }}
              className="h-11 rounded-[8px] bg-[#142334] px-6 text-[12px] font-bold uppercase tracking-[0.14em] text-white"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={clearTransactionFilters}
              className="h-11 text-left text-[13px] font-semibold text-[#142334] underline-offset-4 hover:underline xl:text-center"
            >
              Clear filters
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-[8px] bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full">
                <thead className="border-b border-[#E4D8CB] bg-[#F5F3EE]">
                  <tr>
                    {['Date', 'Client', 'Service', 'Amount', 'Status', 'Actions'].map((label) => (
                      <th
                        key={label}
                        scope="col"
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4D8CB]">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[14px] text-[#6B6B6B]">
                        {transactionOperations.length === 0
                          ? 'No confirmed payments yet. Revenue will appear here after the first successful payment.'
                          : 'No transactions match the current filters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((operation) => (
                      <tr key={operation.payment.payment_id} className="transition hover:bg-[#F5F3EE]">
                        <td className="px-4 py-[14px] text-[13px] text-[#6B6B6B]">
                          {formatDate(getTransactionDate(operation))}
                        </td>
                        <td className="px-4 py-[14px]">
                          <p className="text-[14px] font-bold text-[#142334]">{getClientName(operation)}</p>
                          <p className="mt-1 text-[12px] text-[#6B6B6B]">{getClientEmail(operation)}</p>
                        </td>
                        <td className="px-4 py-[14px]">
                          <p className="text-[14px] text-[#142334]">{operation.serviceTitle}</p>
                          <p className="mt-1 inline-flex rounded-full bg-[#F5F3EE] px-2 py-1 text-[11px] text-[#6B6B6B]">
                            {operation.payment.service_slug}
                          </p>
                        </td>
                        <td className="px-4 py-[14px] text-[15px] font-bold text-[#142334]">
                          {formatMoney(operation.payment.amount)}
                        </td>
                        <td className="px-4 py-[14px]">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${getStatusClass(
                              operation.payment.status,
                            )}`}
                          >
                            {formatStatusLabel(operation.payment.status)}
                          </span>
                        </td>
                        <td className="px-4 py-[14px]">
                          {operation.payment.status === 'confirmed' ? (
                            <Link
                              href={getClientHref(adminKey, operation.payment.payment_id)}
                              className="inline-flex items-center gap-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#142334] transition hover:text-[#C9AD98]"
                            >
                              View client <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                          ) : (
                            <span className="text-[12px] text-[#6B6B6B]">Debug only</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#E4D8CB] px-4 py-3 text-[13px] text-[#6B6B6B]">
              Showing {filteredTransactions.length} transactions - Total: {formatMoney(transactionTotal)}
            </div>
          </div>
        </section>

        <div className="my-12 border-t border-[#E4D8CB]" />

        <section aria-labelledby="pending-heading">
          <h2 id="pending-heading" className="font-serif text-[24px] leading-tight text-[#142334]">
            Pending & outstanding
          </h2>
          <p className="mt-1 text-[14px] text-[#6B6B6B]">Confirmed payments waiting on intake or delivery.</p>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <div className="rounded-[8px] bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A09086]">Awaiting intake</h3>
                <span className="font-serif text-[24px] text-[#142334]">{awaitingIntake.length}</span>
              </div>
              <div className="mt-4 grid gap-3">
                {awaitingIntake.length === 0 ? (
                  <p className="rounded-[8px] bg-[#F5F3EE] p-4 text-[14px] text-[#6B6B6B]">
                    No clients waiting on intake.
                  </p>
                ) : (
                  awaitingIntake.map((operation) => (
                    <article key={operation.payment.payment_id} className="rounded-[8px] border border-[#E4D8CB] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[14px] font-bold text-[#142334]">{getClientName(operation)}</p>
                          <p className="mt-1 text-[12px] text-[#6B6B6B]">{getClientEmail(operation)}</p>
                        </div>
                        <p className="text-[15px] font-bold text-[#142334]">{formatMoney(operation.payment.amount)}</p>
                      </div>
                      <p className="mt-3 text-[14px] text-[#142334]">{operation.serviceTitle}</p>
                      <p className="mt-1 text-[12px] text-[#6B6B6B]">
                        Paid {getDaysSince(operation.payment.confirmed_at || operation.payment.created_at)} days ago
                      </p>
                      <div className="mt-4">
                        <LeadEmailButton
                          lead={{
                            id: '',
                            firstName: getClientName(operation),
                            email: operation.payment.buyer_email || '',
                            archetype: '',
                            serviceInterest: operation.serviceTitle,
                          }}
                          label="Send intake reminder"
                          icon="send"
                          initialSubject={getReminderSubject(operation)}
                          initialBody={getReminderBody(operation)}
                          className="inline-flex items-center gap-2 rounded-full bg-[#142334] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
                        />
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[8px] bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A09086]">In delivery</h3>
                <span className="font-serif text-[24px] text-[#142334]">{inDelivery.length}</span>
              </div>
              <div className="mt-4 grid gap-3">
                {inDelivery.length === 0 ? (
                  <p className="rounded-[8px] bg-[#F5F3EE] p-4 text-[14px] text-[#6B6B6B]">
                    No active deliveries right now.
                  </p>
                ) : (
                  inDelivery.map((operation) => (
                    <article key={operation.payment.payment_id} className="rounded-[8px] border border-[#E4D8CB] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[14px] font-bold text-[#142334]">{getClientName(operation)}</p>
                          <p className="mt-1 text-[12px] text-[#6B6B6B]">{getClientEmail(operation)}</p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${getDeliveryStatusClass(
                            operation.payment.delivery_status,
                          )}`}
                        >
                          {formatStatusLabel(operation.payment.delivery_status)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[14px] text-[#142334]">{operation.serviceTitle}</p>
                          <p className="mt-1 text-[15px] font-bold text-[#142334]">{formatMoney(operation.payment.amount)}</p>
                        </div>
                        <Link
                          href={getClientHref(adminKey, operation.payment.payment_id)}
                          className="inline-flex items-center gap-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#142334] transition hover:text-[#C9AD98]"
                        >
                          View in clients <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="my-12 border-t border-[#E4D8CB]" />

        <section aria-labelledby="pipeline-projection-heading">
          <h2 id="pipeline-projection-heading" className="font-serif text-[24px] leading-tight text-[#142334]">
            Pipeline projection
          </h2>
          <p className="mt-1 text-[14px] text-[#6B6B6B]">Estimated revenue if hot leads convert.</p>
          <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-[#6B6B6B]">
            Based on lead interest, not confirmed intent. Treat as directional only.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              [String(hotLeads.length), 'Hot leads', 'Leads with priority >= 80'],
              [formatMoney(projectedTotal), 'Projected revenue', 'If all convert'],
              [topService, 'Top service', 'Most requested'],
            ].map(([value, label, caption]) => (
              <div key={label} className="rounded-[8px] bg-white p-5">
                <p className="font-serif text-[28px] leading-tight text-[#142334]">{value}</p>
                <p className="mt-2 text-[13px] font-bold text-[#142334]">{label}</p>
                <p className="mt-1 text-[12px] text-[#6B6B6B]">{caption}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 overflow-hidden rounded-[8px] bg-white">
            {hotLeads.length === 0 ? (
              <p className="p-5 text-[14px] text-[#6B6B6B]">
                No hot leads in pipeline right now. Leads with a priority score of 80 or above will appear here.
              </p>
            ) : (
              <>
                <div className="hidden border-b border-[#E4D8CB] bg-[#F5F3EE] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B] md:grid md:grid-cols-[1fr_1.2fr_0.7fr_0.7fr]">
                  <span>Name</span>
                  <span>Service interest</span>
                  <span>Estimated value</span>
                  <span>Priority score</span>
                </div>
                <div className="divide-y divide-[#E4D8CB]">
                  {hotLeads.map((lead) => (
                    <Link
                      key={lead.submission.id}
                      href={getLeadHref(adminKey, lead.submission.id)}
                      className="grid gap-2 px-4 py-[14px] text-[14px] text-[#142334] transition hover:bg-[#F5F3EE] md:grid-cols-[1fr_1.2fr_0.7fr_0.7fr] md:items-center"
                    >
                      <span className="font-bold">{lead.submission.first_name}</span>
                      <span>{lead.serviceInterest}</span>
                      <span className="font-bold">{formatMoney(lead.estimatedValue)}</span>
                      <span>Priority {lead.priorityScore}</span>
                    </Link>
                  ))}
                </div>
                <div className="border-t border-[#E4D8CB] px-4 py-3 text-right text-[15px] font-bold text-[#142334]">
                  Projected pipeline: {formatMoney(projectedTotal)}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
