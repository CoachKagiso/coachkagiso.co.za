import { NextRequest, NextResponse } from 'next/server';
import { exchangeGoogleAuthCode, GoogleCalendarAuthError, GoogleCalendarConfigError } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/resources/career-diagnostic/submissions?tab=calendar&calendarAuth=${error}`, request.url));
  }

  if (!code) {
    return NextResponse.json({ error: 'No Google auth code provided.' }, { status: 400 });
  }

  try {
    await exchangeGoogleAuthCode(code);
    return NextResponse.redirect(new URL('/resources/career-diagnostic/submissions?tab=calendar&calendarAuth=success', request.url));
  } catch (caught) {
    if (caught instanceof GoogleCalendarAuthError || caught instanceof GoogleCalendarConfigError) {
      return NextResponse.json({ error: caught.message }, { status: 400 });
    }

    throw caught;
  }
}
