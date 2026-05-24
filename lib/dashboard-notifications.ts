import { DEFAULT_SETTINGS, type NotificationSettings } from '@/lib/settings';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export const dashboardNotificationEventTypes = [
  'lead_magnet_download',
  'masterclass_reservation',
  'payment_confirmed',
  'intake_submitted',
  'cal_booking',
] as const;

export type DashboardNotificationEventType = (typeof dashboardNotificationEventTypes)[number];
export type DashboardNotificationStatus = 'unread' | 'read' | 'archived';

export type DashboardEventNotification = {
  id: string;
  eventType: DashboardNotificationEventType;
  source: string;
  title: string;
  description: string;
  contactName: string;
  contactEmail: string;
  href: string;
  metadata: Record<string, unknown>;
  status: DashboardNotificationStatus;
  createdAt: string;
};

type DashboardNotificationRow = {
  id: string;
  event_type: DashboardNotificationEventType;
  source: string | null;
  title: string | null;
  description: string | null;
  contact_name: string | null;
  contact_email: string | null;
  href: string | null;
  metadata: Record<string, unknown> | null;
  status: DashboardNotificationStatus | null;
  created_at: string | null;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
};

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

const eventSettingsKeyMap: Record<DashboardNotificationEventType, keyof NotificationSettings> = {
  lead_magnet_download: 'lead_magnet_download',
  masterclass_reservation: 'masterclass_reservation',
  payment_confirmed: 'payment_confirmed',
  intake_submitted: 'intake_submitted',
  cal_booking: 'cal_booking',
};

const dashboardNotificationSelect =
  'id, event_type, source, title, description, contact_name, contact_email, href, metadata, status, created_at';

function isMissingDashboardNotificationsTable(error?: SupabaseLikeError | null) {
  const code = error?.code || '';
  const message = error?.message || '';
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    message.includes("Could not find the table 'public.dashboard_notifications'") ||
    message.includes('relation "public.dashboard_notifications" does not exist') ||
    (message.includes('Could not find') && message.includes('dashboard_notifications'))
  );
}

function isMissingSettingsTable(error?: SupabaseLikeError | null) {
  const code = error?.code || '';
  const message = error?.message || '';
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    message.includes("Could not find the table 'public.settings'") ||
    message.includes('relation "public.settings" does not exist')
  );
}

function normalizeDashboardNotification(row: DashboardNotificationRow): DashboardEventNotification {
  return {
    id: row.id,
    eventType: row.event_type,
    source: row.source || 'system',
    title: row.title || 'Dashboard notification',
    description: row.description || '',
    contactName: row.contact_name || '',
    contactEmail: row.contact_email || '',
    href: row.href || '',
    metadata: row.metadata || {},
    status: row.status || 'unread',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function cleanOptionalText(value?: string | null, maxLength = 240) {
  const text = String(value || '').trim();
  return text ? text.slice(0, maxLength) : null;
}

function cleanOptionalDate(value?: string | Date | null) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

async function isDashboardNotificationEnabled(
  supabase: SupabaseServiceClient,
  eventType: DashboardNotificationEventType,
) {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'notifications')
    .maybeSingle();

  if (error) {
    if (isMissingSettingsTable(error)) return true;
    console.warn('Could not read notification settings; recording dashboard notification by default.', error.message);
    return true;
  }

  const settings = {
    ...DEFAULT_SETTINGS.notifications,
    ...((data?.value || {}) as Partial<NotificationSettings>),
  };

  return settings[eventSettingsKeyMap[eventType]] !== false;
}

export async function recordDashboardNotification(input: {
  eventType: DashboardNotificationEventType;
  title: string;
  description?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  href?: string | null;
  source?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string | Date | null;
}) {
  try {
    const supabase = createSupabaseServiceClient();
    const enabled = await isDashboardNotificationEnabled(supabase, input.eventType);
    if (!enabled) return null;
    const createdAt = cleanOptionalDate(input.createdAt);

    const { data, error } = await supabase
      .from('dashboard_notifications')
      .insert({
        event_type: input.eventType,
        source: cleanOptionalText(input.source, 80) || 'system',
        title: input.title.trim().slice(0, 160),
        description: cleanOptionalText(input.description, 500),
        contact_name: cleanOptionalText(input.contactName, 120),
        contact_email: cleanOptionalText(input.contactEmail, 160)?.toLowerCase() || null,
        href: cleanOptionalText(input.href, 500),
        metadata: input.metadata || {},
        ...(createdAt ? { created_at: createdAt } : {}),
      })
      .select(dashboardNotificationSelect)
      .single();

    if (error) {
      if (isMissingDashboardNotificationsTable(error)) return null;
      throw new Error(error.message);
    }

    return normalizeDashboardNotification(data as DashboardNotificationRow);
  } catch (error) {
    if (error instanceof Error && isMissingDashboardNotificationsTable(error)) return null;
    console.error('Failed to record dashboard notification', error);
    return null;
  }
}

export async function listDashboardEventNotifications({
  limit = 10,
  status = 'unread',
}: {
  limit?: number;
  status?: DashboardNotificationStatus | 'all';
} = {}) {
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from('dashboard_notifications')
    .select(dashboardNotificationSelect)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingDashboardNotificationsTable(error)) return [];
    throw new Error(error.message);
  }

  return ((data || []) as DashboardNotificationRow[]).map(normalizeDashboardNotification);
}

export async function getDashboardEventNotificationById(id: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('dashboard_notifications')
    .select(dashboardNotificationSelect)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    if (isMissingDashboardNotificationsTable(error)) return null;
    throw new Error(error.message);
  }

  return data ? normalizeDashboardNotification(data as DashboardNotificationRow) : null;
}

export async function getDashboardEventNotificationCount(status: DashboardNotificationStatus | 'all' = 'unread') {
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from('dashboard_notifications')
    .select('id', { count: 'exact', head: true });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { count, error } = await query;

  if (error) {
    if (isMissingDashboardNotificationsTable(error)) return 0;
    throw new Error(error.message);
  }

  return count || 0;
}

export async function hasDashboardNotificationWithMetadata(metadata: Record<string, unknown>) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('dashboard_notifications')
    .select('id')
    .contains('metadata', metadata)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingDashboardNotificationsTable(error)) return false;
    throw new Error(error.message);
  }

  return Boolean(data?.id);
}

export async function hasDashboardNotificationFingerprint(input: {
  eventType: DashboardNotificationEventType;
  contactEmail?: string | null;
  title?: string | null;
  source?: string | null;
  createdAt?: string | Date | null;
  metadata?: Record<string, unknown>;
}) {
  const createdAt = cleanOptionalDate(input.createdAt);
  if (!createdAt) return false;

  const supabase = createSupabaseServiceClient();
  const timestamp = new Date(createdAt).getTime();
  const windowStart = new Date(timestamp - 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(timestamp + 60 * 60 * 1000).toISOString();
  const contactEmail = cleanOptionalText(input.contactEmail, 160)?.toLowerCase() || '';

  let query = supabase
    .from('dashboard_notifications')
    .select('id, title, source, metadata')
    .eq('event_type', input.eventType)
    .gte('created_at', windowStart)
    .lte('created_at', windowEnd)
    .limit(10);

  if (contactEmail) {
    query = query.eq('contact_email', contactEmail);
  } else if (input.title) {
    query = query.eq('title', input.title.trim().slice(0, 160));
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingDashboardNotificationsTable(error)) return false;
    throw new Error(error.message);
  }

  const rows = (data || []) as { title?: string | null; source?: string | null; metadata?: Record<string, unknown> | null }[];
  if (rows.length === 0) return false;

  const asset = typeof input.metadata?.asset === 'string' ? input.metadata.asset : '';
  const service = typeof input.metadata?.service === 'string' ? input.metadata.service : '';
  const source = cleanOptionalText(input.source, 80);

  if (asset) {
    return rows.some((row) => row.metadata?.asset === asset || row.source === source);
  }

  if (service) {
    return rows.some((row) => row.metadata?.service === service || String(row.title || '').includes(service));
  }

  return true;
}

export async function deleteDashboardNotification(id: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from('dashboard_notifications')
    .delete()
    .eq('id', id);

  if (error) {
    if (isMissingDashboardNotificationsTable(error)) return false;
    throw new Error(error.message);
  }

  return true;
}

export async function markDashboardNotificationRead(id: string) {
  const supabase = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('dashboard_notifications')
    .update({ status: 'read', read_at: now })
    .eq('id', id)
    .eq('status', 'unread');

  if (error) {
    if (isMissingDashboardNotificationsTable(error)) return false;
    throw new Error(error.message);
  }

  return true;
}
