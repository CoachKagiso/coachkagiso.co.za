import type { TaskType } from '@/lib/dashboard-tasks';

export type TaskModalTab = 'detail' | 'email' | 'notes';

const tabLabels: Record<TaskModalTab, string> = {
  detail: 'Detail',
  email: 'Email',
  notes: 'Notes',
};

export function TaskModalTabs({
  activeTab,
  taskType,
  notesCount = 0,
  onChange,
}: {
  activeTab: TaskModalTab;
  taskType: TaskType;
  notesCount?: number;
  onChange: (tab: TaskModalTab) => void;
}) {
  const tabs: TaskModalTab[] = taskType === 'LEAD' ? ['detail', 'email', 'notes'] : ['detail', 'notes'];

  return (
    <nav className="flex h-11 shrink-0 border-b border-[#E4D8CB]" aria-label="Task modal tabs">
      {tabs.map((tab) => {
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            aria-label={tab === 'notes' && notesCount > 0 ? `Notes, ${notesCount} saved note${notesCount === 1 ? '' : 's'}` : undefined}
            className={`inline-flex h-11 flex-1 items-center justify-center gap-2 border-b-2 text-[13px] font-semibold uppercase tracking-[0.06em] transition ${
              active ? 'border-[#142334] text-[#142334]' : 'border-transparent text-[#6B6B6B] hover:text-[#142334]'
            }`}
          >
            {tabLabels[tab]}
            {tab === 'notes' && notesCount > 0 && (
              <span
                className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-bold tracking-normal ${
                  active ? 'bg-[#142334] text-white' : 'bg-[#F0E9E3] text-[#7B695F]'
                }`}
                aria-label={`${notesCount} saved note${notesCount === 1 ? '' : 's'}`}
              >
                {notesCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
