import { NextResponse } from 'next/server';
import { importBrevoDashboardNotifications } from '@/lib/brevo-notification-import';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

function normalizeDays(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 30;
  return Math.max(1, Math.min(Math.floor(numeric), 365));
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const key = typeof body.key === 'string' ? body.key : url.searchParams.get('key');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await importBrevoDashboardNotifications({
    days: normalizeDays(body.days),
  });
  const tableUnavailable = result.errors.includes('Dashboard notifications table is not available.');

  return NextResponse.json(
    {
      success: !tableUnavailable,
      ...(tableUnavailable
        ? { error: 'Dashboard notifications table is not available. Run the Supabase migration before importing email history.' }
        : {}),
      ...result,
    },
    { status: tableUnavailable ? 503 : 200 }
  );
}
