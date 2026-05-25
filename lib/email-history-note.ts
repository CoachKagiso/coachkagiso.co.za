type EmailHistoryNoteInput = {
  subject: string;
  templateLabel?: string;
  recipientEmail?: string;
};

export function buildEmailHistoryNote({ subject, templateLabel, recipientEmail }: EmailHistoryNoteInput) {
  const lines = [`Email sent: ${subject.trim() || 'Untitled email'}`];

  if (templateLabel?.trim()) lines.push(`Template: ${templateLabel.trim()}`);
  if (recipientEmail?.trim()) lines.push(`To: ${recipientEmail.trim()}`);

  return lines.join('\n');
}
