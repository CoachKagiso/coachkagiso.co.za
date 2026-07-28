export const MAX_PRIVATE_CV_BYTES = 10 * 1024 * 1024;

const FILE_TYPES: Record<string, {
  extensions: readonly string[];
  signature: readonly number[];
  requiredMarkers?: readonly string[];
}> = {
  'application/pdf': { extensions: ['pdf'], signature: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  'application/msword': { extensions: ['doc'], signature: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    extensions: ['docx'],
    signature: [0x50, 0x4b],
    requiredMarkers: ['[Content_Types].xml', 'word/'],
  },
} as const;

export function cleanPrivateCvFilename(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
  return cleaned.slice(-160) || 'client-cv';
}

function startsWith(bytes: Uint8Array, signature: readonly number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function includesAscii(bytes: Uint8Array, value: string) {
  const target = new TextEncoder().encode(value);
  outer: for (let index = 0; index <= bytes.length - target.length; index += 1) {
    for (let targetIndex = 0; targetIndex < target.length; targetIndex += 1) {
      if (bytes[index + targetIndex] !== target[targetIndex]) continue outer;
    }
    return true;
  }
  return false;
}

export function validatePrivateCvUpload(input: {
  name: string;
  type: string;
  size: number;
  bytes: Uint8Array;
}) {
  if (input.size <= 0) throw new Error('The CV file is empty.');
  if (input.size > MAX_PRIVATE_CV_BYTES) throw new Error('The CV must be 10MB or smaller.');

  const definition = FILE_TYPES[input.type as keyof typeof FILE_TYPES];
  if (!definition) throw new Error('The CV must be a PDF or Word document.');

  const extension = input.name.split('.').pop()?.toLowerCase() || '';
  if (!(definition.extensions as readonly string[]).includes(extension)) {
    throw new Error('The CV filename does not match its document type.');
  }
  if (!startsWith(input.bytes, definition.signature)) {
    throw new Error('The CV file contents do not match its document type.');
  }
  if (definition.requiredMarkers?.some((marker) => !includesAscii(input.bytes, marker))) {
    throw new Error('The Word document structure could not be verified.');
  }

  return {
    filename: cleanPrivateCvFilename(input.name),
    contentType: input.type,
  };
}
