import { createSupabaseServiceClient } from '@/lib/supabase-server';
import type { DashboardCalendarEventPayload } from '@/lib/calendar-types';

export const GOOGLE_AUTH_ROW_ID = '00000000-0000-0000-0000-000000000001';
const googleTokenUrl = 'https://oauth2.googleapis.com/token';
const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
const calendarTimeZone = 'Africa/Johannesburg';

type GoogleAuthRow = {
  id: string;
  refresh_token: string;
  access_token: string | null;
  token_expiry: string | null;
};

export type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  hangoutLink?: string;
  status?: string;
  source?: {
    title?: string;
    url?: string;
  };
  creator?: {
    email?: string;
    displayName?: string;
  };
  organizer?: {
    email?: string;
    displayName?: string;
  };
  start?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

export class GoogleCalendarAuthError extends Error {
  constructor(message = 'Google Calendar is not authorised') {
    super(message);
    this.name = 'GoogleCalendarAuthError';
  }
}

export class GoogleCalendarConfigError extends Error {
  constructor(message = 'Google Calendar is not configured') {
    super(message);
    this.name = 'GoogleCalendarConfigError';
  }
}

function getCalendarId() {
  const calendarId = process.env.GOOGLE_CALENDAR_ID?.trim();
  if (!calendarId) throw new GoogleCalendarConfigError('GOOGLE_CALENDAR_ID is missing');
  return calendarId;
}

function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new GoogleCalendarConfigError('Google OAuth environment variables are missing');
  }

  return { clientId, clientSecret, redirectUri };
}

export function getGoogleAuthorizationUrl() {
  const { clientId, redirectUri } = getGoogleOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    access_type: 'offline',
    prompt: 'consent',
  });

  return `${googleAuthUrl}?${params.toString()}`;
}

async function saveTokens(tokens: TokenResponse, existingRefreshToken?: string) {
  if (!tokens.access_token) {
    throw new GoogleCalendarAuthError(tokens.error_description || tokens.error || 'Google did not return an access token');
  }

  const refreshToken = tokens.refresh_token || existingRefreshToken;
  if (!refreshToken) {
    throw new GoogleCalendarAuthError('Google did not return a refresh token. Re-authorise with prompt=consent.');
  }

  const supabase = createSupabaseServiceClient();
  const expiresIn = Number(tokens.expires_in || 3600);
  const { error } = await supabase.from('google_auth').upsert({
    id: GOOGLE_AUTH_ROW_ID,
    refresh_token: refreshToken,
    access_token: tokens.access_token,
    token_expiry: new Date(Date.now() + expiresIn * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);

  return tokens.access_token;
}

export async function exchangeGoogleAuthCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
  const response = await fetch(googleTokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const tokens = (await response.json().catch(() => ({}))) as TokenResponse;

  if (!response.ok) {
    throw new GoogleCalendarAuthError(tokens.error_description || tokens.error || 'Google OAuth token exchange failed');
  }

  await saveTokens(tokens);
}

async function getStoredGoogleAuth() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('google_auth')
    .select('id, refresh_token, access_token, token_expiry')
    .eq('id', GOOGLE_AUTH_ROW_ID)
    .maybeSingle();

  if (error) {
    if (error.message.includes('google_auth') || error.message.includes('schema cache')) {
      throw new GoogleCalendarAuthError();
    }
    throw new Error(error.message);
  }

  if (!data?.refresh_token) throw new GoogleCalendarAuthError();
  return data as GoogleAuthRow;
}

async function getAccessToken() {
  const auth = await getStoredGoogleAuth();
  const expiry = auth.token_expiry ? new Date(auth.token_expiry).getTime() : 0;

  if (auth.access_token && expiry > Date.now() + 60_000) {
    return auth.access_token;
  }

  const { clientId, clientSecret } = getGoogleOAuthConfig();
  const response = await fetch(googleTokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: auth.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });
  const tokens = (await response.json().catch(() => ({}))) as TokenResponse;

  if (!response.ok) {
    throw new GoogleCalendarAuthError(tokens.error_description || tokens.error || 'Google OAuth refresh failed');
  }

  return saveTokens(tokens, auth.refresh_token);
}

async function calendarFetch<T>(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(getCalendarId())}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (response.status === 204) return null as T;

  const data = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(data.error?.message || 'Google Calendar request failed');
  }

  return data as T;
}

export async function listGoogleCalendarEvents(timeMin: string, timeMax: string) {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });
  const data = await calendarFetch<{ items?: GoogleCalendarEvent[] }>(`/events?${params.toString()}`);

  return data.items || [];
}

export async function getGoogleCalendarEvent(eventId: string) {
  return calendarFetch<GoogleCalendarEvent>(`/events/${encodeURIComponent(eventId)}`);
}

function toGoogleDateTime(date: string, time: string) {
  return `${date}T${time}:00+02:00`;
}

function toGoogleEvent(payload: DashboardCalendarEventPayload) {
  return {
    summary: payload.title,
    description: payload.description || '',
    start: {
      dateTime: toGoogleDateTime(payload.date, payload.startTime),
      timeZone: calendarTimeZone,
    },
    end: {
      dateTime: toGoogleDateTime(payload.date, payload.endTime),
      timeZone: calendarTimeZone,
    },
    extendedProperties: {
      private: {
        coachKagisoType: payload.eventType,
        linkedLeadId: payload.linkedLeadId || '',
        createdBy: 'coach-kagiso-dashboard',
      },
    },
  };
}

export async function createGoogleCalendarEvent(payload: DashboardCalendarEventPayload) {
  return calendarFetch<GoogleCalendarEvent>('/events', {
    method: 'POST',
    body: JSON.stringify(toGoogleEvent(payload)),
  });
}

export async function updateGoogleCalendarEvent(eventId: string, payload: DashboardCalendarEventPayload, lockTime = false) {
  const googleEvent = toGoogleEvent(payload);
  const body = lockTime
    ? {
        summary: googleEvent.summary,
        description: googleEvent.description,
        extendedProperties: googleEvent.extendedProperties,
      }
    : googleEvent;

  return calendarFetch<GoogleCalendarEvent>(`/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteGoogleCalendarEvent(eventId: string) {
  await calendarFetch<null>(`/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
  });
}
