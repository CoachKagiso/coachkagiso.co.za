import { LogOut, Search } from 'lucide-react';
import FollowUpNotificationBell from '@/components/dashboard/FollowUpNotificationBell';
import DashboardProfileAvatar from '@/components/dashboard/DashboardProfileAvatar';
import { getDashboardLegacyKey } from '@/lib/dashboard-auth-url';

function buildHiddenTabValue(activeTab: string) {
  return activeTab === 'dashboard' ? '' : activeTab;
}

export default function DashboardTopBar({
  activeTab,
  adminKey,
  query,
  updatedTimeLabel,
  notificationCount,
  showSearch = true,
  profilePhotoUrl,
}: {
  activeTab: string;
  adminKey: string;
  query?: string | null;
  updatedTimeLabel: string;
  notificationCount: number;
  showSearch?: boolean;
  profilePhotoUrl?: string | null;
}) {
  const legacyKey = getDashboardLegacyKey(adminKey);

  return (
    <div className="rounded-[8px] bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[180px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A09086]">Welcome,</p>
          <h2 className="mt-0.5 font-serif text-[22px] leading-none text-[#142334]">Kagiso</h2>
        </div>

        {showSearch ? (
          <form action="/resources/career-diagnostic/submissions" method="get" className="relative min-w-[260px] flex-1 lg:max-w-[560px]">
            {legacyKey && <input type="hidden" name="key" value={legacyKey} />}
            {buildHiddenTabValue(activeTab) && <input type="hidden" name="tab" value={buildHiddenTabValue(activeTab)} />}
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A09086]" />
            <input
              type="search"
              name="q"
              defaultValue={query || ''}
              placeholder="Find lead, email, service..."
              className="h-11 w-full rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] pl-10 pr-3 text-[13px] font-medium text-[#142334] outline-none transition placeholder:text-[#A09086] focus:border-[#BFA490] focus:bg-white focus:ring-2 focus:ring-[#BFA490]/25"
            />
          </form>
        ) : (
          <div className="hidden flex-1 lg:block" />
        )}

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right lg:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A09086]">Synced {updatedTimeLabel}</p>
            <p className="mt-0.5 text-[12px] font-medium text-[#6B6B6B]">
              {notificationCount} dashboard notification{notificationCount === 1 ? '' : 's'}
            </p>
          </div>

          <FollowUpNotificationBell adminKey={adminKey} notificationCount={notificationCount} />

          <form action="/api/dashboard/session/logout" method="post">
            <button
              type="submit"
              aria-label="Log out"
              title="Log out"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#E4D8CB] bg-white px-3 text-[12px] font-semibold text-[#142334] transition hover:border-[#142334] hover:bg-[#F8F6F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BFA490] focus-visible:ring-offset-2"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden xl:inline">Log out</span>
            </button>
          </form>

          <div className="flex items-center gap-2 rounded-full bg-[#F8F6F4] p-1 pr-3">
            <DashboardProfileAvatar src={profilePhotoUrl} />
            <span className="hidden text-[12px] font-semibold text-[#142334] sm:inline">Coach Kagiso</span>
          </div>
        </div>
      </div>
    </div>
  );
}
