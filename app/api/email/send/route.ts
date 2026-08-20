import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { dispatchLeadEmail } from '@/lib/lead-email-dispatch';

export const dynamic = 'force-dynamic';

function getScheduledAt(value: string) {
  if (!value) return null;
  const scheduledAt = new Date(value);
  if (Number.isNaN(scheduledAt.getTime())) return null;
  return scheduledAt;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scheduledAtInput = String(body?.scheduledAt || '').trim();
  const scheduledAt = getScheduledAt(scheduledAtInput);

  if (scheduledAtInput && !scheduledAt) {
    return NextResponse.json({ error: 'Scheduled send time is invalid.' }, { status: 400 });
  }

  const result = await dispatchLeadEmail({
    to: String(body?.to || ''),
    toName: String(body?.toName || '').trim(),
    subject: String(body?.subject || ''),
    htmlContent: String(body?.htmlContent || ''),
    plainTextBody: String(body?.plainTextBody || '').trim(),
    leadId: String(body?.leadId || '').trim(),
    templateId: String(body?.templateId || '').trim(),
    archetype: String(body?.archetype || '').trim(),
    serviceInterest: String(body?.serviceInterest || '').trim(),
    scheduledAt,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, scheduledAt: result.scheduledAt });
}
