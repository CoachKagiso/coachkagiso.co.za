'use client';

import { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import type { DashboardNote } from '@/lib/dashboard-tasks';
import LeadEmailModal, { type LeadEmailModalLead } from './LeadEmailModal';

type SentLeadUpdate = {
  id: string;
  lead_status?: string;
  last_contacted_at?: string | null;
  next_follow_up_at?: string | null;
};

export default function LeadEmailButton({
  lead,
  initialNotes = [],
  label = 'Email',
  icon = 'mail',
  className,
  initialSubject,
  initialBody,
  onSent,
  onNoteCreated,
}: {
  lead: LeadEmailModalLead;
  initialNotes?: DashboardNote[];
  label?: string;
  icon?: 'mail' | 'send';
  className: string;
  initialSubject?: string;
  initialBody?: string;
  onSent?: (submission: SentLeadUpdate) => void;
  onNoteCreated?: (note: DashboardNote) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = icon === 'send' ? Send : Mail;

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={className}>
        {label} <Icon className="h-4 w-4" />
      </button>
      <LeadEmailModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        lead={lead}
        initialNotes={initialNotes}
        initialSubject={initialSubject}
        initialBody={initialBody}
        onSent={onSent}
        onNoteCreated={onNoteCreated}
      />
    </>
  );
}
