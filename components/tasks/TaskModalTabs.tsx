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
  onChange,
}: {
  activeTab: TaskModalTab;
  taskType: TaskType;
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
            className={`h-11 flex-1 border-b-2 text-[13px] font-semibold uppercase tracking-[0.06em] transition ${
              active ? 'border-[#142334] text-[#142334]' : 'border-transparent text-[#6B6B6B] hover:text-[#142334]'
            }`}
          >
            {tabLabels[tab]}
          </button>
        );
      })}
    </nav>
  );
}
