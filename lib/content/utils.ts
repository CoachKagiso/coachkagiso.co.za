export type ExtractedPostMetadata = {
  platform?: string;
  pillar?: string;
  register?: string;
  body: string;
};

const metadataPrefixes = ['VOICE MODE:', 'PLATFORM:', 'PILLAR:', 'WRITING REGISTER:', 'REGISTER:', '---'];

function isMetadataLine(value: string) {
  const normalized = value.trim().toUpperCase();
  return metadataPrefixes.some((prefix) => normalized.startsWith(prefix)) || normalized.startsWith('VOICE MODE');
}

function parseMetadataPart(part: string) {
  const [rawKey, ...rawValueParts] = part.split(':');
  const key = rawKey.trim().toUpperCase();
  const value = rawValueParts.join(':').trim();
  if (!value) return null;

  if (key === 'PLATFORM') return { platform: value };
  if (key === 'PILLAR') return { pillar: value };
  if (key === 'WRITING REGISTER' || key === 'REGISTER' || key === 'VOICE MODE') return { register: value };
  return null;
}

function parseMetadataLine(value: string) {
  const parts = value
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  const parsed = parts.reduce<Omit<ExtractedPostMetadata, 'body'>>((accumulator, part) => {
    const next = parseMetadataPart(part);
    return next ? { ...accumulator, ...next } : accumulator;
  }, {});

  return parsed.platform || parsed.pillar || parsed.register ? parsed : null;
}

/**
 * Separates model metadata from the actual post body so the dashboard can
 * display context without putting those labels into copied social content.
 */
export function extractOutputMetadata(raw: string): ExtractedPostMetadata {
  if (!raw) return { body: '' };

  const lines = raw.split('\n');
  let contentStartIndex = 0;
  let foundContent = false;
  const metadata: Omit<ExtractedPostMetadata, 'body'> = {};

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    if (line === '---') continue;

    const parsed = parseMetadataLine(line);
    if (parsed) {
      Object.assign(metadata, parsed);
      continue;
    }

    contentStartIndex = index;
    foundContent = true;
    break;
  }

  return {
    ...metadata,
    body: foundContent ? lines.slice(contentStartIndex).join('\n').trim() : '',
  };
}

/**
 * Strips AI output metadata headers from existing content backlog records.
 */
export function extractPostBody(raw: string) {
  return extractOutputMetadata(raw).body;
}

/**
 * Returns a display-safe title for backlog records saved before metadata cleanup.
 */
export function extractCleanTitle(title: string, content: string) {
  const trimmedTitle = title.trim();
  if (trimmedTitle && !isMetadataLine(trimmedTitle)) return trimmedTitle;

  const body = extractPostBody(content);
  if (!body) return trimmedTitle ? 'Untitled draft' : 'Untitled';

  const firstSentence = body.split(/[.!?]/)[0].trim();
  if (firstSentence && firstSentence.length <= 60) return firstSentence;

  return `${body.slice(0, 60).trim()}...`;
}

/**
 * Creates a short display preview from post content after metadata cleanup.
 */
export function extractPreview(content: string, maxChars = 120) {
  if (!content) return '';
  const body = extractPostBody(content);
  if (body.length <= maxChars) return body;
  return `${body.slice(0, maxChars).trim()}...`;
}
