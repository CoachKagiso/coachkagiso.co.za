import 'server-only';
import { cookies } from 'next/headers';
import {
  DASHBOARD_SESSION_COOKIE_NAME,
  isDashboardRequestAuthorized,
} from '@/lib/dashboard-session';
import { getDiagnosticAdminKey } from '@/lib/env';

export async function isDashboardServerAuthorized(providedKey?: string | null) {
  const cookieStore = await cookies();
  const token = cookieStore.get(DASHBOARD_SESSION_COOKIE_NAME)?.value || '';
  return isDashboardRequestAuthorized({
    cookieHeader: token ? `${DASHBOARD_SESSION_COOKIE_NAME}=${encodeURIComponent(token)}` : '',
    providedKey,
    secret: getDiagnosticAdminKey(),
  });
}
