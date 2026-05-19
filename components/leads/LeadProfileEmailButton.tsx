'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import type { DashboardNote } from '@/lib/dashboard-tasks';
import LeadEmailModal, { type LeadEmailModalLead } from './LeadEmailModal';

function formatProfileFollowUpDate(value: string) {
  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00+02:00`));
}

export default function LeadProfileEmailButton({
  lead,
  initialNotes,
}: {
  lead: LeadEmailModalLead;
  initialNotes: DashboardNote[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState(initialNotes);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#C9AD98] px-5 text-[14px] font-semibold text-[#142334] transition hover:bg-[#142334] hover:text-white"
      >
        Send Email <Send className="h-4 w-4" />
      </button>
      <LeadEmailModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        lead={lead}
        initialNotes={notes}
        onSent={(submission) => {
          const statusSelect = document.querySelector<HTMLSelectElement>('select[name="lead_status"]');
          if (statusSelect && submission.lead_status) statusSelect.value = submission.lead_status;
          const followUpInput = document.querySelector<HTMLInputElement>('[data-next-follow-up-input]');
          const followUpLabel = document.querySelector<HTMLElement>('[data-next-follow-up-label]');
          const followUpUrgency = document.querySelector<HTMLElement>('[data-next-follow-up-urgency]');
          if (followUpInput && typeof submission.next_follow_up_at !== 'undefined') {
            followUpInput.value = submission.next_follow_up_at || '';
          }
          if (followUpLabel && submission.next_follow_up_at) {
            followUpLabel.textContent = formatProfileFollowUpDate(submission.next_follow_up_at);
          }
          if (followUpUrgency && submission.next_follow_up_at) {
            followUpUrgency.textContent = 'Auto-set after email';
          }
        }}
        onNoteCreated={(note) => setNotes((current) => [note, ...current])}
      />
    </>
  );
}
