import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  ClipboardList,
  Download,
  Inbox,
  Mail,
  Tag,
  UserRound,
} from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';
import DashboardTopBar from '@/components/dashboard/DashboardTopBar';
import FunnelActivityDeleteButton from '@/components/leads/FunnelActivityDeleteButton';
import {
  getDashboardEventNotificationById,
  getDashboardEventNotificationCount,
  type DashboardEventNotification,
  type DashboardNotificationEventType,
} from '@/lib/dashboard-notifications';
import { DASHBOARD_SESSION_CLIENT_MARKER } from '@/lib/dashboard-auth-url';
import { isDashboardServerAuthorized } from '@/lib/dashboard-session-server';
import { getFollowUpNotificationCount, listFollowUpNotifications } from '@/lib/follow-up-notifications';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Funnel Activity Record | Coach Kagiso',
  robots: {
    index: false,
    follow: false,
  },
};

type FunnelActivityRecordPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ key?: string; returnTo?: string }>;
};

const funnelActivityLabels: Record<DashboardNotificationEventType, string> = {
  lead_magnet_download: 'Lead magnet',
  masterclass_reservation: 'Masterclass',
  payment_confirmed: 'Payment',
  intake_submitted: 'Intake',
  cal_booking: 'Cal.com',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date(value));
}

function formatDashboardTime(value: Date) {
  return new Intl.DateTimeFormat('en-ZA', {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    timeZone: 'Africa/Johannesburg',
  }).format(value);
}

function getBadgeClass(eventType: DashboardNotificationEventType) {
  if (eventType === 'payment_confirmed' || eventType === 'intake_submitted') {
    return 'border-[#79A580] bg-[#EEF7EF] text-[#355C3A]';
  }
  if (eventType === 'cal_booking') return 'border-[#8AA6C8] bg-[#EEF4FA] text-[#284B70]';
  if (eventType === 'masterclass_reservation') return 'border-[#DDD6FE] bg-[#F3E8FF] text-[#7C3AED]';
  return 'border-[#C9AD98] bg-[#F7F1EC] text-[#7B5D49]';
}

function getRecordAction(activity: DashboardEventNotification) {
  if (activity.eventType === 'lead_magnet_download') return 'Review the download source, then add this person to a light nurture follow-up.';
  if (activity.eventType === 'masterclass_reservation') return 'Check whether this is real demand or test data, then send the next booking link if it is valid.';
  if (activity.eventType === 'payment_confirmed') return 'Watch for the intake form and keep the delivery queue clean.';
  if (activity.eventType === 'intake_submitted') return 'Review the brief and confirm whether the client is ready for delivery.';
  if (activity.eventType === 'cal_booking') return 'Prep the booking context and check whether it should connect to an existing diagnostic lead.';
  return 'Review this activity.';
}

function getContactLabel(activity: DashboardEventNotification) {
  return activity.contactName || activity.contactEmail || activity.title;
}

function getMailHref(activity: DashboardEventNotification) {
  if (activity.href) return activity.href;
  if (activity.contactEmail) return `mailto:${activity.contactEmail}?subject=${encodeURIComponent(activity.title)}`;
  return '';
}

function getSafeReturnHref(returnTo: string | undefined) {
  const fallback = '/resources/career-diagnostic/submissions?tab=leads';
  if (!returnTo) return fallback;

  try {
    const parsed = new URL(returnTo, 'https://dashboard.local');
    if (parsed.origin !== 'https://dashboard.local' || !parsed.pathname.startsWith('/resources/career-diagnostic/submissions')) {
      return fallback;
    }
    parsed.searchParams.delete('key');
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

function formatMetadataValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'Not supplied';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return JSON.stringify(value, null, 2);
}

function formatMetadataLabel(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getMetadataEntries(metadata: Record<string, unknown>) {
  return Object.entries(metadata || {}).filter(([, value]) => value !== null && value !== undefined && value !== '');
}

export default async function FunnelActivityRecordPage({
  params,
  searchParams,
}: FunnelActivityRecordPageProps) {
  const { id } = await params;
  const { returnTo } = await searchParams;

  if (!await isDashboardServerAuthorized()) {
    notFound();
  }
  const key = DASHBOARD_SESSION_CLIENT_MARKER;

  const activity = await getDashboardEventNotificationById(id);
  if (!activity || activity.status === 'archived') {
    notFound();
  }

  const [
    followUpNotificationCount,
    dashboardEventNotificationCount,
    sidebarFollowUps,
  ] = await Promise.all([
    getFollowUpNotificationCount(),
    getDashboardEventNotificationCount(),
    listFollowUpNotifications({ includeTomorrow: false, limit: 4 }),
  ]);
  const notificationCount = followUpNotificationCount + dashboardEventNotificationCount;
  const dashboardTimeLabel = formatDashboardTime(new Date());
  const returnHref = getSafeReturnHref(returnTo);
  const mailHref = getMailHref(activity);
  const metadataEntries = getMetadataEntries(activity.metadata);
  const contactLabel = getContactLabel(activity);

  return (
    <main className="coach-dashboard-clean min-h-screen overflow-x-clip bg-[#EDEBE8] text-[#142334]">
      <div className="flex min-h-screen w-full gap-3 p-2 md:gap-4 md:p-3 xl:p-4">
        <DashboardSidebar
          activeTab="leads"
          adminKey={key}
          todayFollowUpCount={followUpNotificationCount}
          todayFollowUps={sidebarFollowUps}
        />

        <section className="min-w-0 flex-1 overflow-x-clip rounded-[8px] bg-transparent">
          <div className="space-y-3 p-0">
            <DashboardTopBar
              activeTab="leads"
              adminKey={key || ''}
              query=""
              updatedTimeLabel={dashboardTimeLabel}
              notificationCount={notificationCount}
              showSearch={false}
            />

            <div className="rounded-[8px] bg-[#FCFBFA] py-5 md:py-6">
              <div className="mx-auto max-w-[1120px] px-4 lg:px-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <Link
                    href={returnHref}
                    className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#142334]/72 transition hover:text-[#142334]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Link>
                  <div className="flex flex-wrap gap-3">
                    {mailHref && (
                      <a
                        href={mailHref}
                        className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98]"
                      >
                        Email <Mail className="h-4 w-4" />
                      </a>
                    )}
                    <FunnelActivityDeleteButton
                      adminKey={key || ''}
                      notificationId={activity.id}
                      contactLabel={contactLabel}
                      returnHref={returnHref}
                    />
                  </div>
                </div>

                <div className="mt-8 overflow-hidden rounded-[8px] border border-[#D8C8BB] bg-white">
                  <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="p-7 md:p-9">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.17em] ${getBadgeClass(activity.eventType)}`}>
                          {funnelActivityLabels[activity.eventType]}
                        </span>
                        <span className="rounded-full border border-[#D8C8BB] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#142334]/58">
                          {activity.status === 'unread' ? 'New' : 'Reviewed'}
                        </span>
                      </div>
                      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">
                        Funnel record
                      </p>
                      <h1 className="mt-3 font-serif text-[52px] leading-[0.96] text-[#142334]">
                        {contactLabel}
                      </h1>
                      <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[#142334]/72">
                        {activity.description || activity.title}
                      </p>
                    </div>

                    <div className="bg-[#142334] p-7 text-white md:p-9">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9AD98]">
                        Next action
                      </p>
                      <p className="mt-4 font-serif text-[30px] leading-tight">
                        {getRecordAction(activity)}
                      </p>
                      <div className="mt-7 grid gap-3 sm:grid-cols-2">
                        <div className="border border-white/12 bg-white/5 p-4">
                          <CalendarClock className="h-5 w-5 text-[#C9AD98]" />
                          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                            Captured
                          </p>
                          <p className="mt-2 text-[14px] leading-relaxed text-white/82">
                            {formatDate(activity.createdAt)}
                          </p>
                        </div>
                        <div className="border border-white/12 bg-white/5 p-4">
                          <Tag className="h-5 w-5 text-[#C9AD98]" />
                          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                            Source
                          </p>
                          <p className="mt-2 text-[14px] leading-relaxed text-white/82">
                            {activity.source.replace(/-/g, ' ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 border-t border-[#D8C8BB] bg-[#FCFBFA] p-5 md:grid-cols-3">
                    <div className="rounded-[8px] border border-[#D8C8BB] bg-white p-5">
                      <UserRound className="h-5 w-5 text-[#C9AD98]" />
                      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A09086]">
                        Name
                      </p>
                      <p className="mt-2 break-words text-[16px] font-semibold text-[#142334]">
                        {activity.contactName || 'Not supplied'}
                      </p>
                    </div>
                    <div className="rounded-[8px] border border-[#D8C8BB] bg-white p-5">
                      <Mail className="h-5 w-5 text-[#C9AD98]" />
                      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A09086]">
                        Email
                      </p>
                      <p className="mt-2 break-words text-[16px] font-semibold text-[#142334]">
                        {activity.contactEmail || 'Not supplied'}
                      </p>
                    </div>
                    <div className="rounded-[8px] border border-[#D8C8BB] bg-white p-5">
                      {activity.eventType === 'lead_magnet_download' ? (
                        <Download className="h-5 w-5 text-[#C9AD98]" />
                      ) : activity.eventType === 'intake_submitted' ? (
                        <ClipboardList className="h-5 w-5 text-[#C9AD98]" />
                      ) : (
                        <Inbox className="h-5 w-5 text-[#C9AD98]" />
                      )}
                      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A09086]">
                        Record type
                      </p>
                      <p className="mt-2 break-words text-[16px] font-semibold text-[#142334]">
                        {funnelActivityLabels[activity.eventType]}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-[#D8C8BB] p-5 md:p-7">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">
                          Record details
                        </p>
                        <h2 className="mt-2 font-serif text-[32px] leading-tight text-[#142334]">
                          Captured context
                        </h2>
                      </div>
                      {mailHref && (
                        <a
                          href={mailHref}
                          className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98]"
                        >
                          Open email <ArrowUpRight className="h-4 w-4" />
                        </a>
                      )}
                    </div>

                    <div className="mt-5 overflow-hidden rounded-[8px] border border-[#D8C8BB]">
                      <div className="grid border-b border-[#D8C8BB] bg-[#F7F1EC] px-5 py-3 md:grid-cols-[0.35fr_1fr]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A09086]">Field</p>
                        <p className="hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A09086] md:block">Value</p>
                      </div>
                      <div className="divide-y divide-[#D8C8BB]">
                        {[
                          ['Title', activity.title],
                          ['Description', activity.description || 'Not supplied'],
                          ['Source', activity.source],
                          ['Status', activity.status],
                          ...metadataEntries.map(([label, value]) => [formatMetadataLabel(label), formatMetadataValue(value)]),
                        ].map(([label, value], idx) => (
                          <div key={`${label}-${idx}`} className="grid gap-2 px-5 py-4 md:grid-cols-[0.35fr_1fr]">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#A09086]">
                              {label}
                            </p>
                            <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-[#142334]/72">
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
