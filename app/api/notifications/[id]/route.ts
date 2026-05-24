import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { deleteDashboardNotification, markDashboardNotificationRead } from '@/lib/dashboard-notifications';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const url = new URL(request.url);
  const key = String(body?.key || url.searchParams.get('key') || request.headers.get('x-diagnostic-admin-key') || '');

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!id) {
    return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 });
  }

  await markDashboardNotificationRead(id);

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const url = new URL(request.url);
  const key = String(body?.key || url.searchParams.get('key') || request.headers.get('x-diagnostic-admin-key') || '');

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!id) {
    return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 });
  }

  await deleteDashboardNotification(id);
  revalidatePath('/resources/career-diagnostic/submissions');

  return NextResponse.json({ success: true, deleted: true });
}
