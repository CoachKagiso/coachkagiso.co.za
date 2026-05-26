import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized, listDiagnosticSubmissions } from '@/lib/diagnostic-submissions';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function getRequestKey(request: Request) {
  const url = new URL(request.url);
  return request.headers.get('x-diagnostic-admin-key') || url.searchParams.get('key') || '';
}

function normalizeLimit(value: string | null) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 20;
  return Math.max(1, Math.min(Math.floor(numeric), 100));
}

type MasterclassNotificationRow = {
  id: string;
  contact_name: string | null;
  contact_email: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

function extractFocusFromDescription(value?: string | null) {
  const text = String(value || '').trim();
  const match = text.match(/\bFocus:\s*([\s\S]+)$/i);
  return match?.[1]?.trim() || '';
}

function normalizeEmail(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

export async function GET(request: Request) {
  if (!isDiagnosticAdminAuthorized(getRequestKey(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = normalizeLimit(url.searchParams.get('limit'));

  const supabase = createSupabaseServiceClient();
  const [submissions, notificationsResult] = await Promise.all([
    listDiagnosticSubmissions({ source: 'masterclass_waitlist' }),
    supabase
      .from('dashboard_notifications')
      .select('id, contact_name, contact_email, description, metadata, created_at')
      .eq('event_type', 'masterclass_reservation')
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  if (notificationsResult.error) {
    throw new Error(notificationsResult.error.message);
  }

  const notificationByEmail = new Map(
    ((notificationsResult.data || []) as MasterclassNotificationRow[])
      .filter((notification) => normalizeEmail(notification.contact_email))
      .map((notification) => [normalizeEmail(notification.contact_email), notification]),
  );

  const leadsByEmail = new Map(submissions
    .filter((submission) => submission.email)
    .map((submission) => {
      const notification = notificationByEmail.get(normalizeEmail(submission.email));
      const notificationFocus = typeof notification?.metadata?.focus === 'string'
        ? notification.metadata.focus
        : extractFocusFromDescription(notification?.description);

      return [
        normalizeEmail(submission.email),
        {
          id: submission.id,
          firstName: submission.first_name,
          email: submission.email,
          focus: submission.archetype_payload?.focus || notificationFocus || '',
          whatsapp: submission.archetype_payload?.whatsapp || (typeof notification?.metadata?.whatsapp === 'string' ? notification.metadata.whatsapp : null),
          submittedAt: submission.submitted_at,
        },
      ] as const;
    }));

  for (const notification of (notificationsResult.data || []) as MasterclassNotificationRow[]) {
    const email = normalizeEmail(notification.contact_email);
    if (!email || leadsByEmail.has(email)) continue;
    leadsByEmail.set(email, {
      id: notification.id,
      firstName: notification.contact_name || email,
      email,
      focus: typeof notification.metadata?.focus === 'string'
        ? notification.metadata.focus
        : extractFocusFromDescription(notification.description),
      whatsapp: typeof notification.metadata?.whatsapp === 'string' ? notification.metadata.whatsapp : null,
      submittedAt: notification.created_at || new Date().toISOString(),
    });
  }

  const leads = Array.from(leadsByEmail.values()).slice(0, limit);

  return NextResponse.json({
    leads,
    totalCount: leads.length,
  });
}
