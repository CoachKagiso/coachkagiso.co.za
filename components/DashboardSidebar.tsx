import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Coins,
  LayoutDashboard,
  Lightbulb,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  StickyNote,
  UsersRound,
} from 'lucide-react';

const dashboardNavItems = [
  { label: 'Dashboard', tab: 'dashboard', icon: LayoutDashboard },
  { label: 'Leads', tab: 'leads', icon: UsersRound },
  { label: 'Pipeline', tab: 'pipeline', icon: BarChart3 },
  { label: 'Clients', tab: 'clients', icon: ClipboardList },
  { label: 'Finance', tab: 'finance', icon: Coins },
  { label: 'Content', tab: 'content', icon: Lightbulb },
  { label: 'Calendar', tab: 'calendar', icon: CalendarDays },
  { label: 'Messages', tab: 'messages', icon: MessageSquare },
  { label: 'Tasks & Notes', tab: 'tasks', icon: StickyNote },
  { label: 'Settings', tab: 'settings', icon: Settings },
] as const;

type DashboardSidebarProps = {
  activeTab: string;
  adminKey?: string;
  todayTaskCount: number;
};

function buildTabHref(adminKey: string | undefined, tab: string) {
  const params = new URLSearchParams();
  if (adminKey) params.set('key', adminKey);
  if (tab !== 'dashboard') params.set('tab', tab);
  const query = params.toString();
  return query ? `/resources/career-diagnostic/submissions?${query}` : '/resources/career-diagnostic/submissions';
}

export default function DashboardSidebar({ activeTab, adminKey, todayTaskCount }: DashboardSidebarProps) {
  return (
    <div className="hidden shrink-0 lg:block">
      <input
        id="coach-kagiso-dashboard-sidebar-toggle"
        type="checkbox"
        aria-label="Toggle dashboard sidebar"
        className="dashboard-sidebar-checkbox sr-only"
      />
      <aside className="dashboard-sidebar-panel flex shrink-0 flex-col rounded-[8px] border border-white/70 bg-[#FCFBFA]/90 backdrop-blur">
      <div className="dashboard-sidebar-header flex items-center justify-between gap-3 border-b border-[#D8C8BB] pb-5">
        <a
          href={buildTabHref(adminKey, 'dashboard')}
          className="dashboard-sidebar-brand flex items-center gap-3"
          title="Coach Kagiso Growth OS"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[#142334] text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="dashboard-sidebar-copy block">
            <span className="block text-[13px] font-semibold leading-tight">Coach Kagiso</span>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-[#A09086]">Growth OS</span>
          </span>
        </a>
        <label
          htmlFor="coach-kagiso-dashboard-sidebar-toggle"
          title="Toggle sidebar"
          className="dashboard-sidebar-toggle grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-[8px] border border-[#D8C8BB] bg-white text-[#142334] transition hover:border-[#142334]"
        >
          <PanelLeftClose className="dashboard-sidebar-collapse-icon h-4 w-4" />
          <PanelLeftOpen className="dashboard-sidebar-expand-icon h-4 w-4" />
          <span className="sr-only">Toggle dashboard sidebar</span>
        </label>
      </div>

      <nav className="mt-5 flex flex-1 flex-col gap-1.5">
        {dashboardNavItems.map(({ label, tab, icon: Icon }) => {
          const active = activeTab === tab;
          return (
          <a
            key={label}
            href={buildTabHref(adminKey, tab)}
            title={label}
            className={`dashboard-sidebar-link flex items-center gap-3 rounded-[8px] px-3 py-3 text-[13px] font-semibold transition ${
              active
                ? 'bg-[#142334] text-white'
                : 'text-[#142334]/70 hover:bg-[#F7F1EC] hover:text-[#142334]'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="dashboard-sidebar-copy">{label}</span>
          </a>
          );
        })}
      </nav>

      <a
        href={buildTabHref(adminKey, 'tasks')}
        title={`${todayTaskCount} tasks due today`}
        className="dashboard-sidebar-today-collapsed h-14 place-items-center rounded-[8px] border border-[#D8C8BB] bg-[#F7F1EC] text-center transition hover:border-[#142334]"
      >
        <span className="font-serif text-[25px] leading-none">{todayTaskCount}</span>
        <span className="sr-only">tasks due today</span>
      </a>
      <div className="dashboard-sidebar-today-expanded rounded-[8px] border border-[#D8C8BB] bg-[#F7F1EC] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A09086]">Today</p>
        <p className="mt-2 font-serif text-[28px] leading-none">{todayTaskCount}</p>
        <p className="mt-2 text-[12px] leading-relaxed text-[#142334]/64">
          Tasks due before the day closes.
        </p>
      </div>
    </aside>
    </div>
  );
}
