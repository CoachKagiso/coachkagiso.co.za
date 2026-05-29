'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ClientOperation } from '@/lib/client-operations';
import type { DiagnosticLeadStatus, DiagnosticSubmission } from '@/lib/diagnostic-submissions';
import type { ManualTaskRecord, Task, TaskStatus } from '@/lib/dashboard-tasks';
import type { EmailTemplateId } from '@/lib/email-templates';
import { DetailTab } from './DetailTab';
import { EmailTab } from './EmailTab';
import { NotesTab } from './NotesTab';
import { TaskModalHeader } from './TaskModalHeader';
import { TaskModalTabs, type TaskModalTab } from './TaskModalTabs';

function formatDateTime(value?: string | null) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';

  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Johannesburg',
  }).format(date);
}

function getTaskCreatedLabel(task: Task, lead?: DiagnosticSubmission, operation?: ClientOperation) {
  const value = task.createdAt || lead?.submitted_at || operation?.payment.created_at || task.dueDate;
  return task.isManual ? `Created ${formatDateTime(value)}` : `Submitted ${formatDateTime(value)}`;
}

export function TaskModal({
  task,
  adminKey,
  lead,
  operation,
  statusOptions,
  leadStatusLabels,
  onClose,
  onUpdate,
  onLeadStatusChange,
  onAddNote,
}: {
  task: Task;
  adminKey: string;
  lead?: DiagnosticSubmission;
  operation?: ClientOperation;
  statusOptions: { value: TaskStatus; label: string }[];
  leadStatusLabels: Record<DiagnosticLeadStatus, string>;
  onClose: () => void;
  onUpdate: (task: Task, values: Partial<ManualTaskRecord>) => Promise<void>;
  onLeadStatusChange: (task: Task, nextStatus: TaskStatus, options?: { templateId?: EmailTemplateId }) => Promise<void>;
  onAddNote: (task: Task, body: string) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<TaskModalTab>('detail');
  const [statusSaving, setStatusSaving] = useState<TaskStatus | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const requestClose = useCallback(() => {
    setIsClosing(true);
    window.setTimeout(onClose, 220);
  }, [onClose]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') requestClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestClose]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function moveTask(nextStatus: TaskStatus) {
    if (nextStatus === task.status) return;

    setStatusSaving(nextStatus);
    try {
      if (task.isManual) {
        await onUpdate(task, { status: nextStatus });
      } else {
        await onLeadStatusChange(task, nextStatus);
      }
    } finally {
      setStatusSaving(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.4)] p-4 max-md:items-end max-md:p-0"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
      role="presentation"
    >
      <section
        className={`task-modal-panel flex h-[92vh] max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[16px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.15)] md:h-[82vh] md:max-h-[760px] md:w-[560px] md:rounded-[16px] ${
          isClosing ? 'task-modal-panel-closing' : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={task.title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mt-3 h-1 w-9 shrink-0 rounded-full bg-[#E4D8CB] md:hidden" />
        <TaskModalHeader task={task} createdLabel={getTaskCreatedLabel(task, lead, operation)} onClose={requestClose} />
        <TaskModalTabs activeTab={activeTab} taskType={task.type} onChange={setActiveTab} />

        <div className="min-h-0 flex-1 overflow-hidden">
          {activeTab === 'detail' && (
            <DetailTab
              task={task}
              lead={lead}
              operation={operation}
              adminKey={adminKey}
              statusOptions={statusOptions}
              leadStatusLabels={leadStatusLabels}
              statusSaving={statusSaving}
              onMove={moveTask}
            />
          )}
          {activeTab === 'email' && task.type === 'LEAD' && (
            <EmailTab
              task={task}
              adminKey={adminKey}
              lead={lead}
              onLeadStatusChange={onLeadStatusChange}
              onAddNote={onAddNote}
              onToast={setToast}
              onAfterSend={() => setActiveTab('detail')}
            />
          )}
          {activeTab === 'notes' && <NotesTab task={task} onAddNote={onAddNote} />}
        </div>
      </section>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#142334] px-5 py-3 text-[13px] font-semibold text-white shadow-[0_16px_40px_rgba(20,35,52,0.2)]">
          {toast}
        </div>
      )}
    </div>
  );
}
