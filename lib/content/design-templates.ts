import { createSupabaseServiceClient } from '@/lib/supabase-server';

// Design Studio templates. Previously browser localStorage, which meant one
// browser only and no recovery after a site-data clear - a real problem now that
// carousel drafts reference CTA templates by id.

export type DesignTemplateKindValue = 'deck' | 'cover' | 'cta';
export type DesignTemplateFormatValue = 'social_graphic' | 'carousel' | 'presentation';

const designTemplateKinds: DesignTemplateKindValue[] = ['deck', 'cover', 'cta'];
const designTemplateFormats: DesignTemplateFormatValue[] = ['social_graphic', 'carousel', 'presentation'];

export function isDesignTemplateKindValue(value: unknown): value is DesignTemplateKindValue {
  return typeof value === 'string' && designTemplateKinds.includes(value as DesignTemplateKindValue);
}

export function isDesignTemplateFormatValue(value: unknown): value is DesignTemplateFormatValue {
  return typeof value === 'string' && designTemplateFormats.includes(value as DesignTemplateFormatValue);
}

export type DesignTemplateInput = {
  name: string;
  kind: DesignTemplateKindValue;
  format: DesignTemplateFormatValue;
  width: number;
  height: number;
  sourceCarouselTemplate?: string | null;
  sourceCarouselLayoutRecipe?: string | null;
  document: Record<string, unknown>;
};

export type DesignTemplateRow = {
  id: string;
  name: string;
  kind: string;
  format: string;
  width: number;
  height: number;
  source_carousel_template: string | null;
  source_carousel_layout_recipe: string | null;
  document: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type DesignTemplateItem = {
  id: string;
  name: string;
  kind: DesignTemplateKindValue;
  format: DesignTemplateFormatValue;
  width: number;
  height: number;
  sourceCarouselTemplate: string | null;
  sourceCarouselLayoutRecipe: string | null;
  document: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const SELECT_COLUMNS =
  'id, name, kind, format, width, height, source_carousel_template, source_carousel_layout_recipe, document, created_at, updated_at';

function isMissingDesignTemplatesTable(message?: string) {
  return Boolean(
    message &&
      (message.includes('design_templates') ||
        message.includes('Could not find the table') ||
        message.includes('does not exist')),
  );
}

function normalizeRow(row: DesignTemplateRow): DesignTemplateItem {
  return {
    id: row.id,
    name: row.name,
    // Rows are constrained by the database, but normalise anyway so a future
    // constraint change cannot hand the UI a value it does not understand.
    kind: isDesignTemplateKindValue(row.kind) ? row.kind : 'deck',
    format: isDesignTemplateFormatValue(row.format) ? row.format : 'social_graphic',
    width: row.width,
    height: row.height,
    sourceCarouselTemplate: row.source_carousel_template,
    sourceCarouselLayoutRecipe: row.source_carousel_layout_recipe,
    document: row.document,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPayload(input: DesignTemplateInput) {
  return {
    name: input.name.trim(),
    kind: input.kind,
    format: input.format,
    width: Math.round(input.width),
    height: Math.round(input.height),
    source_carousel_template: input.sourceCarouselTemplate || null,
    source_carousel_layout_recipe: input.sourceCarouselLayoutRecipe || null,
    document: input.document,
  };
}

export async function listDesignTemplates(): Promise<DesignTemplateItem[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('design_templates')
    .select(SELECT_COLUMNS)
    .order('updated_at', { ascending: false });

  if (error) {
    // Before the migration is applied the table is absent. Returning an empty
    // list keeps Design Studio usable instead of erroring on load.
    if (isMissingDesignTemplatesTable(error.message)) return [];
    console.error('Failed to fetch design templates:', error.message);
    return [];
  }

  return ((data || []) as DesignTemplateRow[]).map(normalizeRow);
}

export async function createDesignTemplate(input: DesignTemplateInput): Promise<DesignTemplateItem> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('design_templates')
    .insert(toPayload(input))
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return normalizeRow(data as DesignTemplateRow);
}

export async function updateDesignTemplate(
  id: string,
  input: Partial<DesignTemplateInput>,
): Promise<DesignTemplateItem> {
  const supabase = createSupabaseServiceClient();
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.kind !== undefined) payload.kind = input.kind;
  if (input.format !== undefined) payload.format = input.format;
  if (input.width !== undefined) payload.width = Math.round(input.width);
  if (input.height !== undefined) payload.height = Math.round(input.height);
  if (input.sourceCarouselTemplate !== undefined) {
    payload.source_carousel_template = input.sourceCarouselTemplate || null;
  }
  if (input.sourceCarouselLayoutRecipe !== undefined) {
    payload.source_carousel_layout_recipe = input.sourceCarouselLayoutRecipe || null;
  }
  if (input.document !== undefined) payload.document = input.document;

  const { data, error } = await supabase
    .from('design_templates')
    .update(payload)
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return normalizeRow(data as DesignTemplateRow);
}

export async function deleteDesignTemplate(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from('design_templates').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
