import { NextResponse } from 'next/server';
import { getGoogleAuthorizationUrl, GoogleCalendarConfigError } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.redirect(getGoogleAuthorizationUrl());
  } catch (error) {
    if (error instanceof GoogleCalendarConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    throw error;
  }
}
