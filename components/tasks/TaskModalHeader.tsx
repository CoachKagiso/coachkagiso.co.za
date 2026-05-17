import { X } from 'lucide-react';
import type { Task, TaskType } from '@/lib/dashboard-tasks';

function getTaskTypeClass(type: TaskType) {
  if (type === 'DELIVERY') return 'bg-[#BFDBFE] text-[#1E40AF]';
  if (type === 'CONTENT') return 'bg-[#E9D5FF] text-[#6B21A8]';
  if (type === 'PERSONAL') return 'bg-[#CCFBF1] text-[#0F766E]';
  return 'bg-[#F5C07A] text-[#7A4A00]';
}

export function TaskModalHeader({
  task,
  createdLabel,
  onClose,
}: {
  task: Task;
  createdLabel: string;
  onClose: () => void;
}) {
  return (
    <header className="relative h-[108px] shrink-0 px-5 pb-3 pt-5 md:px-6">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-[#6B6B6B] transition hover:bg-[#F5F3EE] hover:text-[#142334]"
        aria-label="Close task modal"
      >
        <X className="h-4 w-4" />
      </button>

      <h2
        className="max-w-[calc(100%-44px)] overflow-hidden font-serif text-[20px] font-bold leading-[1.12] text-[#142334]"
        style={{
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 2,
        }}
      >
        {task.title}
      </h2>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${getTaskTypeClass(task.type)}`}>
          {task.type}
        </span>
        <span className="text-[12px] text-[#6B6B6B]">Priority {task.priority}</span>
      </div>
      <p className="mt-1 text-[12px] leading-none text-[#6B6B6B]">{createdLabel}</p>
    </header>
  );
}
