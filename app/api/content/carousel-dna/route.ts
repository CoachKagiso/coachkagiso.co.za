import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import {
  CarouselDnaLockedError,
  createCarouselDna,
  deleteCarouselDna,
  listCarouselDna,
  setCarouselDnaLock,
  updateCarouselDna,
} from '@/lib/content/carousel-dna';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key') || '';

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const references = await listCarouselDna();
  return NextResponse.json({ references });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const framework = body?.framework;
  if (!framework || typeof framework !== 'object' || Array.isArray(framework)) {
    return NextResponse.json({ error: 'A framework is required.' }, { status: 400 });
  }

  const label = String(body?.label || '').trim();
  if (!label) return NextResponse.json({ error: 'Give this reference a name.' }, { status: 400 });

  const rawArc = Array.isArray(body?.slideArc) ? body.slideArc : [];

  try {
    const reference = await createCarouselDna({
      label,
      sourceName: body?.sourceName ? String(body.sourceName) : null,
      slideCount: Number(body?.slideCount) || 0,
      layoutRecipe: body?.layoutRecipe ? String(body.layoutRecipe) : null,
      slideArc: rawArc.map((role: unknown) => String(role)),
      framework: framework as Record<string, unknown>,
    });
    return NextResponse.json({ reference });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not save this reference.' },
      { status: 500 },
    );
  }
}

/**
 * Two jobs: overwrite a saved template in place, or toggle its lock. Both are
 * updates to one row, and splitting them into separate routes would duplicate
 * the auth and lookup for no gain.
 *
 * A locked row refuses the overwrite with 409, which the panel turns into "save
 * as new" rather than an error.
 */
export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = String(body?.id || '').trim();
  if (!id) return NextResponse.json({ error: 'Reference id is required.' }, { status: 400 });

  try {
    if (typeof body?.locked === 'boolean') {
      const reference = await setCarouselDnaLock(id, body.locked);
      return NextResponse.json({ reference });
    }

    const framework = body?.framework;
    if (!framework || typeof framework !== 'object' || Array.isArray(framework)) {
      return NextResponse.json({ error: 'A framework is required.' }, { status: 400 });
    }
    const label = String(body?.label || '').trim();
    if (!label) return NextResponse.json({ error: 'Give this template a name.' }, { status: 400 });

    const rawArc = Array.isArray(body?.slideArc) ? body.slideArc : [];
    const reference = await updateCarouselDna(id, {
      label,
      sourceName: body?.sourceName ? String(body.sourceName) : null,
      slideCount: Number(body?.slideCount) || 0,
      layoutRecipe: body?.layoutRecipe ? String(body.layoutRecipe) : null,
      slideArc: rawArc.map((role: unknown) => String(role)),
      framework: framework as Record<string, unknown>,
    });
    return NextResponse.json({ reference });
  } catch (error) {
    if (error instanceof CarouselDnaLockedError) {
      return NextResponse.json({ error: error.message, locked: true }, { status: 409 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not update this template.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = String(body?.id || '').trim();
  if (!id) return NextResponse.json({ error: 'Reference id is required.' }, { status: 400 });

  try {
    await deleteCarouselDna(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CarouselDnaLockedError) {
      return NextResponse.json({ error: error.message, locked: true }, { status: 409 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not delete this reference.' },
      { status: 500 },
    );
  }
}
