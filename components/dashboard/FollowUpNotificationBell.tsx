'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Bell, Loader2, MailCheck, X } from 'lucide-react';
import LeadEmailModal, { type LeadEmailModalLead } from '@/components/leads/LeadEmailModal';
import type { FollowUpNotification } from '@/lib/follow-up-utils';

type NotificationResponse = {
  notifications?: FollowUpNotification[];
  error?: string;
};

type NotificationTone = FollowUpNotification['urgency'] | 'neutral' | 'warm';

export type NotificationPanelItem = {
  id: string;
  title: string;
  description?: string;
  meta?: string;
  badge?: string;
  actionLabel?: string;
  href?: string;
  tone?: NotificationTone;
  onSelect?: () => void;
};

export type NotificationPanelSection = {
  id: string;
  title: string;
  description?: string;
  count?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  items: NotificationPanelItem[];
};

const urgencyDotClass: Record<NotificationTone, string> = {
  overdue: 'bg-[#DC2626]',
  today: 'bg-[#F59E0B]',
  tomorrow: 'bg-[#6B7280]',
  neutral: 'bg-[#C9AD98]',
  warm: 'bg-[#BFA490]',
};

const urgencyTextClass: Record<NotificationTone, string> = {
  overdue: 'text-[#DC2626]',
  today: 'text-[#A16207]',
  tomorrow: 'text-[#6B7280]',
  neutral: 'text-[#6B6B6B]',
  warm: 'text-[#7B695F]',
};

function buildLeadsHref(adminKey: string) {
  const params = new URLSearchParams();
  if (adminKey) params.set('key', adminKey);
  params.set('tab', 'leads');
  params.set('followUp', 'due');
  return `/resources/career-diagnostic/submissions?${params.toString()}`;
}

function toEmailModalLead(notification: FollowUpNotification): LeadEmailModalLead {
  return {
    id: notification.id,
    firstName: notification.firstName || notification.name,
    email: notification.email,
    archetype: notification.archetype,
    serviceInterest: notification.serviceInterest,
    leadStatus: notification.leadStatus,
    followUpCount: notification.followUpCount,
    lastContactedAt: notification.lastContactedAt,
  };
}

function renderExtraNotificationItem(item: NotificationPanelItem, closePanel: () => void) {
  const tone = item.tone || 'neutral';
  const content = (
    <>
      <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${urgencyDotClass[tone]}`} />
      <span className="min-w-0">
        <span className="flex items-start justify-between gap-3">
          <span className="line-clamp-2 text-[14px] font-bold leading-snug text-[#142334]">{item.title}</span>
          {item.badge && (
            <span className={`shrink-0 text-right text-[11px] font-semibold uppercase tracking-[0.1em] ${urgencyTextClass[tone]}`}>
              {item.badge}
            </span>
          )}
        </span>
        {item.description && <span className="mt-1 block text-[12px] leading-relaxed text-[#6B6B6B]">{item.description}</span>}
        {(item.meta || item.actionLabel) && (
          <span className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#142334]">
            {item.meta && <span>{item.meta}</span>}
            {item.actionLabel && (
              <span className="inline-flex items-center gap-1">
                {item.actionLabel}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            )}
          </span>
        )}
      </span>
    </>
  );

  if (item.href) {
    return (
      <a
        key={item.id}
        href={item.href}
        onClick={() => {
          item.onSelect?.();
          closePanel();
        }}
        className="grid w-full grid-cols-[auto_1fr] gap-3 rounded-[8px] px-3 py-3 text-left transition hover:bg-[#F8F6F4]"
      >
        {content}
      </a>
    );
  }

  return (
    <button
      key={item.id}
      type="button"
      onClick={() => {
        item.onSelect?.();
        closePanel();
      }}
      className="grid w-full grid-cols-[auto_1fr] gap-3 rounded-[8px] px-3 py-3 text-left transition hover:bg-[#F8F6F4]"
    >
      {content}
    </button>
  );
}

export default function FollowUpNotificationBell({
  adminKey,
  notificationCount,
  extraSections = [],
  panelTitle = 'Notifications',
  panelSubtitle,
}: {
  adminKey: string;
  notificationCount: number;
  extraSections?: NotificationPanelSection[];
  panelTitle?: string;
  panelSubtitle?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<FollowUpNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locallyResolvedCount, setLocallyResolvedCount] = useState(0);
  const [selectedLead, setSelectedLead] = useState<LeadEmailModalLead | null>(null);
  const badgeCount = Math.max(0, notificationCount - locallyResolvedCount);
  const badgeLabel = badgeCount > 99 ? '99+' : String(badgeCount);
  const totalExtraCount = extraSections.reduce((total, section) => total + (section.count ?? section.items.length), 0);
  const followUpSummaryCount = notifications.length || Math.max(0, badgeCount - totalExtraCount);
  const summaryText =
    panelSubtitle ||
    `${badgeCount} item${badgeCount === 1 ? '' : 's'} need attention across follow-ups, calendar, and content.`;

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  async function loadNotifications() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/notifications?key=${encodeURIComponent(adminKey)}`, {
        headers: { accept: 'application/json' },
      });
      const data = (await response.json().catch(() => ({}))) as NotificationResponse;
      if (!response.ok) throw new Error(data.error || 'Could not load notifications.');
      setNotifications(data.notifications || []);
      setHasLoaded(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load notifications.');
    } finally {
      setIsLoading(false);
    }
  }

  function closePanel() {
    setIsOpen(false);
  }

  function toggleOpen() {
    setIsOpen((current) => {
      const next = !current;
      if (next && !hasLoaded && !isLoading) void loadNotifications();
      return next;
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative grid h-11 w-11 place-items-center rounded-full bg-[#142334] text-white transition hover:bg-[#22364C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BFA490]"
        aria-label={`${badgeCount} dashboard notification${badgeCount === 1 ? '' : 's'}.`}
      >
        <Bell className={badgeCount > 0 ? 'h-4 w-4 calendar-bell-wobble' : 'h-4 w-4'} />
        {badgeCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#BFA490] px-1 text-[10px] font-bold text-[#142334] ring-2 ring-white">
            {badgeLabel}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close notifications"
            className="absolute inset-0 h-full w-full cursor-default bg-[#142334]/5"
            onClick={closePanel}
          />
          <section
            role="dialog"
            aria-label={panelTitle}
            className="notification-panel-slide absolute bottom-3 right-3 top-3 flex w-[min(430px,calc(100vw-24px))] flex-col overflow-hidden rounded-[8px] border border-[#D8C8BB] bg-white text-[#142334]"
          >
            <header className="border-b border-[#E4D8CB] bg-[#FCFBFA] px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A09086]">{panelTitle}</p>
                  <h2 className="mt-1 font-serif text-[28px] leading-tight text-[#142334]">What needs attention</h2>
                </div>
                <button
                  type="button"
                  onClick={closePanel}
                  className="grid h-9 w-9 place-items-center rounded-full bg-[#F8F6F4] text-[#6B6B6B] transition hover:bg-[#E4D8CB] hover:text-[#142334]"
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-[#6B6B6B]">{summaryText}</p>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
              <section className="rounded-[8px] bg-[#142334] p-3 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C9AD98]">Lead follow-ups</p>
                    <p className="mt-1 text-[13px] text-white/75">
                      {followUpSummaryCount} email{followUpSummaryCount === 1 ? '' : 's'} waiting for Kagiso.
                    </p>
                  </div>
                  <span className="grid h-8 min-w-8 place-items-center rounded-full bg-white px-2 text-[12px] font-bold text-[#142334]">
                    {followUpSummaryCount}
                  </span>
                </div>

                <div className="mt-3 overflow-hidden rounded-[8px] bg-white text-[#142334]">
                  {isLoading ? (
                    <div className="grid min-h-[132px] place-items-center p-6 text-center">
                      <Loader2 className="h-5 w-5 animate-spin text-[#C9AD98]" />
                      <p className="mt-3 text-[13px] text-[#6B6B6B]">Loading follow-ups...</p>
                    </div>
                  ) : error ? (
                    <div className="p-4 text-[13px] leading-relaxed text-[#DC2626]">{error}</div>
                  ) : notifications.length === 0 ? (
                    <div className="grid min-h-[132px] place-items-center p-5 text-center">
                      <MailCheck className="h-6 w-6 text-[#C9AD98]" />
                      <div>
                        <p className="mt-3 text-[14px] font-semibold text-[#142334]">No loaded follow-ups.</p>
                        <p className="mt-1 text-[12px] text-[#6B6B6B]">Open Leads for the full due list.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#F5F3EE]">
                      {notifications.slice(0, 6).map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => {
                            setSelectedLead(toEmailModalLead(notification));
                            closePanel();
                          }}
                          className="grid w-full grid-cols-[auto_1fr] gap-3 px-3 py-3 text-left transition hover:bg-[#F8F6F4]"
                        >
                          <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${urgencyDotClass[notification.urgency]}`} />
                          <span className="min-w-0">
                            <span className="flex items-start justify-between gap-3">
                              <span className="truncate text-[14px] font-bold text-[#142334]">{notification.name}</span>
                              <span className={`shrink-0 text-right text-[11px] font-semibold ${urgencyTextClass[notification.urgency]}`}>
                                {notification.urgencyLabel}
                              </span>
                            </span>
                            <span className="mt-1 block truncate text-[12px] text-[#6B6B6B]">
                              {notification.archetype} / {notification.serviceInterest}
                            </span>
                            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#142334]">
                              {notification.actionLabel}
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <a
                  href={buildLeadsHref(adminKey)}
                  onClick={closePanel}
                  className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-[8px] bg-white text-[12px] font-bold uppercase tracking-[0.12em] text-[#142334] transition hover:bg-[#F8F6F4]"
                >
                  View all in leads
                </a>
              </section>

              {extraSections.map((section) => (
                <section key={section.id} className="mt-3 rounded-[8px] border border-[#E4D8CB] bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A09086]">{section.title}</p>
                      {section.description && <p className="mt-1 text-[12px] leading-relaxed text-[#6B6B6B]">{section.description}</p>}
                    </div>
                    {typeof section.count === 'number' && (
                      <span className="grid h-8 min-w-8 place-items-center rounded-full bg-[#F8F6F4] px-2 text-[12px] font-bold text-[#142334]">
                        {section.count}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid gap-1">
                    {section.items.length > 0 ? (
                      section.items.map((item) => renderExtraNotificationItem(item, closePanel))
                    ) : (
                      <div className="rounded-[8px] bg-[#F8F6F4] px-3 py-4 text-center">
                        <p className="text-[13px] font-semibold text-[#142334]">{section.emptyTitle || 'Nothing urgent here.'}</p>
                        {section.emptyDescription && <p className="mt-1 text-[12px] text-[#6B6B6B]">{section.emptyDescription}</p>}
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </section>
        </div>
      )}

      {selectedLead && (
        <LeadEmailModal
          isOpen={Boolean(selectedLead)}
          onClose={() => setSelectedLead(null)}
          lead={selectedLead}
          onSent={() => {
            setNotifications((current) => current.filter((item) => item.id !== selectedLead.id));
            setLocallyResolvedCount((current) => current + 1);
          }}
        />
      )}
    </div>
  );
}
