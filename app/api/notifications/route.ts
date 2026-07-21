import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { listDashboardEventNotifications } from '@/lib/dashboard-notifications';
import { listFollowUpNotifications } from '@/lib/follow-up-notifications';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [notifications, eventNotifications] = await Promise.all([
    listFollowUpNotifications({ includeTomorrow: true, limit: 10 }),
    listDashboardEventNotifications({ limit: 10 }),
  ]);

  return NextResponse.json({ notifications, eventNotifications });
}
