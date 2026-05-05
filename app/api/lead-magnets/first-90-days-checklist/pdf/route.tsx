import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import First90DaysChecklistPdf from '@/components/First90DaysChecklistPdf';
import { FIRST_90_DAYS_CHECKLIST_FILENAME } from '@/lib/first-90-days-checklist';
import { getSiteUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  const buffer = await renderToBuffer(<First90DaysChecklistPdf siteUrl={getSiteUrl()} />);

  return new NextResponse(buffer as BodyInit, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${FIRST_90_DAYS_CHECKLIST_FILENAME}"`,
      'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
