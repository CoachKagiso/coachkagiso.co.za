import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import LinkedInHeadlineBuilderPdf from '@/components/LinkedInHeadlineBuilderPdf';
import {
  LINKEDIN_HEADLINE_BUILDER_FILENAME,
} from '@/lib/linkedin-headline-builder';
import { getSiteUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  const buffer = await renderToBuffer(<LinkedInHeadlineBuilderPdf siteUrl={getSiteUrl()} />);

  return new NextResponse(buffer as BodyInit, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${LINKEDIN_HEADLINE_BUILDER_FILENAME}"`,
      'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
