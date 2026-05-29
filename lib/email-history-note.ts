type EmailHistoryNoteInput = {
  subject: string;
  templateLabel?: string;
  recipientEmail?: string;
  scheduledAt?: string | Date | null;
};

function formatScheduledAt(value: string | Date) {
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Johannesburg',
  }).format(value instanceof Date ? value : new Date(value));
}

export function buildEmailHistoryNote({ subject, templateLabel, recipientEmail, scheduledAt }: EmailHistoryNoteInput) {
  const lines = [`Email ${scheduledAt ? 'scheduled' : 'sent'}: ${subject.trim() || 'Untitled email'}`];

  if (templateLabel?.trim()) lines.push(`Template: ${templateLabel.trim()}`);
  if (recipientEmail?.trim()) lines.push(`To: ${recipientEmail.trim()}`);
  if (scheduledAt) lines.push(`Scheduled for: ${formatScheduledAt(scheduledAt)}`);

  return lines.join('\n');
}
