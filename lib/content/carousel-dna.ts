import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { carouselLayoutRecipeOptions } from '@/lib/content/carousel-template-registry';

// Reference decks analysed in Transform. Structure only - the extraction prompt
// forbids reproducing source wording, and nothing here stores the deck itself.

export type CarouselDnaInput = {
  label: string;
  sourceName?: string | null;
  slideCount: number;
  layoutRecipe?: string | null;
  slideArc: string[];
  framework: Record<string, unknown>;
};

type CarouselDnaRow = {
  id: string;
  label: string;
  source_name: string | null;
  slide_count: number;
  layout_recipe: string | null;
  slide_arc: string[] | null;
  framework: Record<string, unknown>;
  locked?: boolean | null;
  created_at: string;
  updated_at: string;
};

export type CarouselDnaItem = {
  id: string;
  label: string;
  sourceName: string | null;
  slideCount: number;
  layoutRecipe: string | null;
  slideArc: string[];
  framework: Record<string, unknown>;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
};

const SELECT_COLUMNS =
  'id, label, source_name, slide_count, layout_recipe, slide_arc, framework, locked, created_at, updated_at';

// The lock column arrived after the table. Until the migration is applied the
// query would fail outright, so a missing column degrades to "nothing is locked"
// rather than taking the whole Vault down.
const SELECT_COLUMNS_WITHOUT_LOCK =
  'id, label, source_name, slide_count, layout_recipe, slide_arc, framework, created_at, updated_at';

function isMissingLockColumn(message?: string) {
  return Boolean(message && message.includes('locked'));
}

// Derived from the registry for the same reason the extractor's whitelist is:
// a hand-written copy of this list is what let an invalid value through before.
const allowedRecipes: Set<string> = new Set(carouselLayoutRecipeOptions.map((option) => option.value));

function isMissingCarouselDnaTable(message?: string) {
  return Boolean(
    message &&
      (message.includes('carousel_dna') ||
        message.includes('Could not find the table') ||
        message.includes('does not exist')),
  );
}

function normalizeRow(row: CarouselDnaRow): CarouselDnaItem {
  return {
    id: row.id,
    label: row.label,
    sourceName: row.source_name,
    slideCount: row.slide_count,
    layoutRecipe: row.layout_recipe,
    slideArc: row.slide_arc || [],
    framework: row.framework,
    locked: row.locked === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPayload(input: CarouselDnaInput) {
  const recipe = input.layoutRecipe && allowedRecipes.has(input.layoutRecipe) ? input.layoutRecipe : null;
  return {
    label: input.label.trim() || 'Reference deck',
    source_name: input.sourceName?.trim() || null,
    slide_count: Math.max(0, Math.round(input.slideCount)),
    layout_recipe: recipe,
    slide_arc: input.slideArc.filter((role) => typeof role === 'string' && role.trim()),
    framework: input.framework,
  };
}

export async function listCarouselDna(): Promise<CarouselDnaItem[]> {
  const supabase = createSupabaseServiceClient();
  let { data, error } = (await supabase
    .from('carousel_dna')
    .select(SELECT_COLUMNS)
    .order('updated_at', { ascending: false })) as { data: unknown; error: { message: string } | null };

  if (error && isMissingLockColumn(error.message)) {
    ({ data, error } = (await supabase
      .from('carousel_dna')
      .select(SELECT_COLUMNS_WITHOUT_LOCK)
      .order('updated_at', { ascending: false })) as { data: unknown; error: { message: string } | null });
  }

  if (error) {
    if (isMissingCarouselDnaTable(error.message)) return [];
    console.error('Failed to fetch carousel DNA:', error.message);
    return [];
  }

  return ((data || []) as CarouselDnaRow[]).map(normalizeRow);
}

export async function createCarouselDna(input: CarouselDnaInput): Promise<CarouselDnaItem> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('carousel_dna')
    .insert(toPayload(input))
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return normalizeRow(data as CarouselDnaRow);
}

/** Thrown when an operation is refused because the reference is locked. */
export class CarouselDnaLockedError extends Error {
  constructor(message = 'This template is locked.') {
    super(message);
    this.name = 'CarouselDnaLockedError';
  }
}

async function getCarouselDna(id: string): Promise<CarouselDnaItem | null> {
  const supabase = createSupabaseServiceClient();
  let { data, error } = await supabase.from('carousel_dna').select(SELECT_COLUMNS).eq('id', id).single();
  if (error && isMissingLockColumn(error.message)) {
    ({ data, error } = await supabase
      .from('carousel_dna')
      .select(SELECT_COLUMNS_WITHOUT_LOCK)
      .eq('id', id)
      .single());
  }
  if (error) return null;
  return normalizeRow(data as CarouselDnaRow);
}

/**
 * Overwrites a saved reference in place. Refuses when the reference is locked -
 * that is the whole point of the lock, and enforcing it here means no caller can
 * forget to check.
 */
export async function updateCarouselDna(id: string, input: CarouselDnaInput): Promise<CarouselDnaItem> {
  const existing = await getCarouselDna(id);
  if (!existing) throw new Error('That template no longer exists.');
  if (existing.locked) throw new CarouselDnaLockedError('This template is locked. Save it as a new template instead.');

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('carousel_dna')
    .update({ ...toPayload(input), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return normalizeRow(data as CarouselDnaRow);
}

export async function setCarouselDnaLock(id: string, locked: boolean): Promise<CarouselDnaItem> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('carousel_dna')
    .update({ locked })
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    if (isMissingLockColumn(error.message)) {
      throw new Error('Locking needs a database update that has not been applied yet.');
    }
    throw new Error(error.message);
  }
  return normalizeRow(data as CarouselDnaRow);
}

export async function deleteCarouselDna(id: string): Promise<void> {
  const existing = await getCarouselDna(id);
  if (existing?.locked) {
    throw new CarouselDnaLockedError('This template is locked. Unlock it before deleting.');
  }
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from('carousel_dna').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
