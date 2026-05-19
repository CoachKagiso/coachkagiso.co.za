'use client';

import type { ReactNode } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  FileText,
  Flame,
  Gauge,
  Layers3,
  PenLine,
  Sparkles,
  TrendingUp,
  Vault,
} from 'lucide-react';
import { extractCleanTitle, extractPostBody, extractPreview } from '@/lib/content/utils';
import type {
  ContentBacklogItem,
  ContentBacklogStatus,
  ContentCalendarItem,
  ContentCalendarStatus,
  ContentPlatform,
  DashboardContext,
} from '@/lib/content-studio';

type ContentSection = 'home' | 'briefs' | 'studio' | 'vault' | 'editorial';

type HomeTabProps = {
  context: DashboardContext;
  calendarItems: ContentCalendarItem[];
  backlogItems: ContentBacklogItem[];
  onNavigate: (section: ContentSection, options?: { topic?: string }) => void;
};

const statusLabels: Record<ContentBacklogStatus | ContentCalendarStatus, string> = {
  idea: 'Idea',
  draft: 'Draft',
  in_progress: 'In progress',
  used: 'Used',
  scheduled: 'Scheduled',
  published: 'Published',
};

const platformLabels: Record<ContentPlatform, string> = {
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  email: 'Email',
};

function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${value}T00:00:00`));
}

function formatMoney(value: number) {
  return `R${Math.round(value).toLocaleString('en-ZA')}`;
}

function getDateOffsetKey(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

function countByStatus<T extends { status: string }>(items: T[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
}

function MetricCard({
  label,
  value,
  detail,
  source,
  progress,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  source: string;
  progress: number;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-[8px] border border-[#E4D8CB] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C7466]">{label}</p>
          <p className="mt-3 font-serif text-[34px] leading-none text-[#142334]">{value}</p>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-[#F5F3EE] text-[#BFA490]">{icon}</span>
      </div>
      <p className="mt-3 min-h-[38px] text-[12px] leading-relaxed text-[#142334]/64">{detail}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#F1E7DF]">
        <div className="h-full rounded-full bg-[#BFA490]" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A09086]">{source}</p>
    </article>
  );
}

function BarRow({ label, value, max, detail }: { label: string; value: number; max: number; detail?: string }) {
  const width = percent(value, max);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-[12px]">
        <span className="font-semibold text-[#142334]">{label}</span>
        <span className="font-serif text-[20px] leading-none text-[#142334]">{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EEE6DE]">
        <div className="h-full rounded-full bg-[#BFA490]" style={{ width: `${width}%` }} />
      </div>
      {detail && <p className="mt-1 text-[11px] leading-relaxed text-[#142334]/54">{detail}</p>}
    </div>
  );
}

function EmptyPanel({ children }: { children: ReactNode }) {
  return <p className="rounded-[8px] bg-[#F8F6F4] p-4 text-[13px] leading-relaxed text-[#142334]/62">{children}</p>;
}

export function HomeTab({ context, calendarItems, backlogItems, onNavigate }: HomeTabProps) {
  const todayKey = getDateOffsetKey(0);
  const weekEndKey = getDateOffsetKey(6);
  const upcomingCalendar = [...calendarItems]
    .filter((item) => item.publishDate >= todayKey)
    .sort((a, b) => a.publishDate.localeCompare(b.publishDate));
  const upcomingThisWeek = upcomingCalendar.filter((item) => item.publishDate <= weekEndKey);
  const recentVault = [...backlogItems]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);
  const backlogStatusCounts = countByStatus(backlogItems);
  const calendarStatusCounts = countByStatus(calendarItems);
  const draftQueueCount = (backlogStatusCounts.draft || 0) + (backlogStatusCounts.in_progress || 0);
  const rawIdeaCount = backlogStatusCounts.idea || 0;
  const scheduledCount = calendarStatusCounts.scheduled || 0;
  const publishedCount = calendarStatusCounts.published || 0;
  const hotLeadRate = percent(context.hotLeadsCount, context.leadsThisWeek);
  const serviceShare = percent(context.topServiceCount, Math.max(context.leadsThisWeek, context.topServiceCount));
  const editorialCoverage = percent(upcomingThisWeek.length, 7);
  const priorityScore = Math.min(100, context.hotLeadsCount * 18 + context.topServiceCount * 8 + (upcomingThisWeek.length === 0 ? 18 : 0));
  const platformCounts = calendarItems.reduce<Record<ContentPlatform, number>>(
    (acc, item) => {
      acc[item.platform] = (acc[item.platform] || 0) + 1;
      return acc;
    },
    { linkedin: 0, tiktok: 0, instagram: 0, facebook: 0, email: 0 },
  );
  const maxPlatformCount = Math.max(1, ...Object.values(platformCounts));
  const topSignalTopic = `${context.strongestTheme} for ${context.topArchetype}`;
  const signalWhy =
    context.hotLeadsCount > 0
      ? `${context.hotLeadsCount} hot leads are already showing intent. Content should warm this audience before follow-up gets colder.`
      : `The current diagnostic pattern is still useful, but lead urgency is low. Use this to keep the nurture lane warm.`;

  return (
    <section className="w-full space-y-3">
      <div className="grid w-full gap-3 2xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.55fr)]">
        <section className="rounded-[8px] bg-[#142334] p-5 text-white">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#C9AD98]">Content command centre</p>
              <h1 className="mt-3 font-serif text-[38px] leading-[0.98] md:text-[50px]">
                Create around {context.strongestTheme}.
              </h1>
              <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-white/68">{signalWhy}</p>
            </div>
            <div className="grid min-w-[190px] gap-2 rounded-[8px] bg-white/8 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9AD98]">Priority score</p>
              <div
                className="grid h-24 w-24 place-items-center rounded-full"
                style={{ background: `conic-gradient(#C9AD98 ${priorityScore}%, rgba(255,255,255,0.13) 0)` }}
              >
                <span className="grid h-16 w-16 place-items-center rounded-full bg-[#142334] font-serif text-[26px]">
                  {priorityScore}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.36fr)]">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[8px] bg-white/8 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9AD98]">Audience cluster</p>
                <p className="mt-2 font-serif text-[24px] leading-tight">{context.topArchetype}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-white/58">From diagnostic submissions.</p>
              </div>
              <div className="rounded-[8px] bg-white/8 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9AD98]">Offer pull</p>
                <p className="mt-2 font-serif text-[24px] leading-tight">{context.topService}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-white/58">
                  {context.topServiceCount} leads are pointing at this service.
                </p>
              </div>
              <div className="rounded-[8px] bg-white/8 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9AD98]">Value signal</p>
                <p className="mt-2 font-serif text-[24px] leading-tight">{formatMoney(context.topServiceProjectedRevenue || 0)}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-white/58">Projected from service interest, not closed revenue.</p>
              </div>
            </div>

            <div className="rounded-[8px] bg-white p-4 text-[#142334]">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8C7466]">Next best action</p>
              <p className="mt-2 font-serif text-[24px] leading-tight">Draft one post from this signal</p>
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('studio', { topic: topSignalTopic })}
                  className="studio-primary-button w-full"
                >
                  <Sparkles className="h-4 w-4" /> Create from signal
                </button>
                <button type="button" onClick={() => onNavigate('briefs')} className="studio-secondary-button w-full">
                  <FileText className="h-4 w-4" /> Generate brief
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-[8px] border border-[#E4D8CB] bg-white p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8C7466]">What needs attention</p>
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => onNavigate('studio', { topic: topSignalTopic })}
              className="rounded-[8px] bg-[#F8F6F4] p-4 text-left transition hover:bg-[#F2ECE7]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-semibold text-[#142334]">Hot leads need warming</span>
                <span className="font-serif text-[28px] leading-none text-[#142334]">{context.hotLeadsCount}</span>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-[#142334]/58">Use content to make the follow-up email feel expected, not random.</p>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('vault')}
              className="rounded-[8px] bg-[#F8F6F4] p-4 text-left transition hover:bg-[#F2ECE7]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-semibold text-[#142334]">Drafts awaiting decision</span>
                <span className="font-serif text-[28px] leading-none text-[#142334]">{draftQueueCount}</span>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-[#142334]/58">These can become posts faster than starting from scratch.</p>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('editorial')}
              className="rounded-[8px] bg-[#F8F6F4] p-4 text-left transition hover:bg-[#F2ECE7]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-semibold text-[#142334]">Scheduled this week</span>
                <span className="font-serif text-[28px] leading-none text-[#142334]">{upcomingThisWeek.length}</span>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-[#142334]/58">A low number here means the editorial rhythm needs attention.</p>
            </button>
          </div>
        </section>
      </div>

      <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Hot lead rate"
          value={`${hotLeadRate}%`}
          detail={`${context.hotLeadsCount} of ${context.leadsThisWeek} leads are showing enough intent to shape content around.`}
          source="source: diagnostic leads"
          progress={hotLeadRate}
          icon={<Flame className="h-4 w-4" />}
        />
        <MetricCard
          label="Service demand"
          value={`${context.topServiceCount}`}
          detail={`${context.topService} is the service showing the clearest current pull.`}
          source="source: service selection"
          progress={serviceShare}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          label="Vault work"
          value={`${draftQueueCount}`}
          detail={`${rawIdeaCount} raw ideas and ${draftQueueCount} drafts are available for repurposing.`}
          source="source: content_backlog"
          progress={percent(draftQueueCount, Math.max(1, backlogItems.length))}
          icon={<Vault className="h-4 w-4" />}
        />
        <MetricCard
          label="Editorial coverage"
          value={`${upcomingThisWeek.length}/7`}
          detail={`${scheduledCount} scheduled and ${publishedCount} published posts are in the calendar data.`}
          source="source: content_calendar"
          progress={editorialCoverage}
          icon={<CalendarDays className="h-4 w-4" />}
        />
      </div>

      <div className="grid w-full gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="rounded-[8px] border border-[#E4D8CB] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8C7466]">Signal map</p>
              <h2 className="mt-2 font-serif text-[28px] leading-tight text-[#142334]">Why this content angle matters</h2>
            </div>
            <Gauge className="h-5 w-5 text-[#BFA490]" />
          </div>
          <div className="mt-5 grid gap-4">
            <BarRow label="Lead volume this week" value={context.leadsThisWeek} max={Math.max(context.leadsThisWeek, 1)} detail="Total diagnostic activity feeding content decisions." />
            <BarRow label="Hot leads" value={context.hotLeadsCount} max={Math.max(context.leadsThisWeek, 1)} detail="High-intent people who need content and follow-up alignment." />
            <BarRow label={context.topService} value={context.topServiceCount} max={Math.max(context.leadsThisWeek, context.topServiceCount, 1)} detail="Service pull that should shape offer-aware content." />
          </div>
          <div className="mt-5 rounded-[8px] bg-[#F8F6F4] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8C7466]">Audience language to borrow</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from(new Set([context.strongestTheme, ...context.commonAnxieties].filter(Boolean))).slice(0, 5).map((item) => (
                <span key={item} className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#142334]/72">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[8px] border border-[#E4D8CB] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8C7466]">Editorial readiness</p>
              <h2 className="mt-2 font-serif text-[28px] leading-tight text-[#142334]">What is planned, drafted, and missing</h2>
            </div>
            <button type="button" onClick={() => onNavigate('editorial')} className="studio-ghost-button">
              Open calendar <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="grid gap-3">
              {upcomingCalendar.slice(0, 4).length === 0 ? (
                <EmptyPanel>No scheduled posts are coming up. Plan at least one post from the current signal.</EmptyPanel>
              ) : (
                upcomingCalendar.slice(0, 4).map((item) => (
                  <article key={item.id} className="rounded-[8px] bg-[#F8F6F4] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-[20px] leading-tight text-[#142334]">{item.title}</p>
                        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8C7466]">
                          {formatDisplayDate(item.publishDate)} - {platformLabels[item.platform]}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6B6B]">
                        {statusLabels[item.status]}
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>
            <div className="rounded-[8px] bg-[#F8F6F4] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8C7466]">Platform mix</p>
              <div className="mt-4 grid gap-3">
                {(Object.keys(platformCounts) as ContentPlatform[]).map((platform) => (
                  <BarRow key={platform} label={platformLabels[platform]} value={platformCounts[platform]} max={maxPlatformCount} />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid w-full gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.38fr)]">
        <section className="rounded-[8px] border border-[#E4D8CB] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8C7466]">Vault health</p>
              <h2 className="mt-2 font-serif text-[28px] leading-tight text-[#142334]">Reusable thinking already in the system</h2>
            </div>
            <button type="button" onClick={() => onNavigate('vault')} className="studio-ghost-button">
              Open Vault <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[0.36fr_0.64fr]">
            <div className="rounded-[8px] bg-[#142334] p-4 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9AD98]">Backlog status</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {(['idea', 'draft', 'in_progress', 'used'] as ContentBacklogStatus[]).map((status) => (
                  <div key={status} className="rounded-[8px] bg-white/8 p-3">
                    <p className="font-serif text-[28px] leading-none">{backlogStatusCounts[status] || 0}</p>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/58">{statusLabels[status]}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              {recentVault.length === 0 ? (
                <EmptyPanel>Nothing in Vault yet. Start by saving one useful draft or rough idea.</EmptyPanel>
              ) : (
                recentVault.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate('studio', { topic: extractPostBody(item.content || item.title) })}
                    className="rounded-[8px] border border-[#E4D8CB] p-4 text-left transition hover:border-[#142334] hover:bg-[#F8F6F4]"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-serif text-[21px] leading-tight text-[#142334]">
                          {extractCleanTitle(item.title, item.content ?? '')}
                        </p>
                        {item.content && <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-[#142334]/56">{extractPreview(item.content, 150)}</p>}
                      </div>
                      <span className="w-fit shrink-0 rounded-full bg-[#F5F3EE] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6B6B]">
                        {statusLabels[item.status]}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[8px] border border-[#E4D8CB] bg-white p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8C7466]">Recommended opportunity</p>
          <div className="mt-5 grid gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-[8px] bg-[#F5F3EE] text-[#BFA490]">
              <Layers3 className="h-5 w-5" />
            </span>
            <h2 className="font-serif text-[31px] leading-[0.98] text-[#142334]">{context.strongestTheme}</h2>
            <p className="text-[13px] leading-relaxed text-[#142334]/64">
              This is recommended because the same audience signal, service demand, and lead pressure are pointing in one direction.
            </p>
            <button type="button" onClick={() => onNavigate('studio', { topic: topSignalTopic })} className="studio-primary-button w-full">
              <PenLine className="h-4 w-4" /> Draft now
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
