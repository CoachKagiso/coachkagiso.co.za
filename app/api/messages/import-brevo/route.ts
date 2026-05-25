import { NextResponse } from 'next/server';
import { importBrevoSentEmails } from '@/lib/brevo-sent-email-import';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

function normalizeDays(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 7;
  return Math.max(1, Math.min(Math.floor(numeric), 365));
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const key = typeof body.key === 'string' ? body.key : url.searchParams.get('key');

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await importBrevoSentEmails({
    days: normalizeDays(body.days),
  });

  return NextResponse.json({
    success: result.errors.length === 0,
    ...result,
  });
}
