import { MAX_CV_FILE_BYTES, extractTextFromCvFile } from '@/lib/content/cv-extract';
import {
  extractSupabaseStorageLocation,
  isAllowedClientStrategyCvUrl,
  redactClientStrategySourceText,
} from '@/lib/client-strategy-cv';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

const MAX_CV_TEXT_CHARS = 60000;
const CV_FETCH_TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 2;

export type ClientStrategyCvResult = {
  text: string;
  included: boolean;
  issue: string | null;
};

function emptyCvResult(issue: string): ClientStrategyCvResult {
  return { text: '', included: false, issue };
}

function inferFileName(url: URL, contentType: string) {
  const pathName = decodeURIComponent(url.pathname.split('/').pop() || 'client-cv');
  if (/\.(pdf|docx|txt)$/i.test(pathName)) return pathName;
  if (contentType.includes('pdf')) return `${pathName}.pdf`;
  if (contentType.includes('wordprocessingml')) return `${pathName}.docx`;
  if (contentType.startsWith('text/')) return `${pathName}.txt`;
  return pathName;
}

async function readBoundedResponse(response: Response) {
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > MAX_CV_FILE_BYTES) throw new Error('CV_TOO_LARGE');
  if (!response.body) throw new Error('CV_EMPTY');

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_CV_FILE_BYTES) {
      await reader.cancel();
      throw new Error('CV_TOO_LARGE');
    }
    chunks.push(value);
  }

  if (!total) throw new Error('CV_EMPTY');
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function fetchAllowedCv(urlValue: string, supabaseUrl: string) {
  let currentUrl = new URL(urlValue);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    if (!isAllowedClientStrategyCvUrl(currentUrl.toString(), supabaseUrl)) {
      throw new Error('CV_HOST_NOT_ALLOWED');
    }

    const response = await fetch(currentUrl, {
      redirect: 'manual',
      signal: AbortSignal.timeout(CV_FETCH_TIMEOUT_MS),
      headers: { Accept: 'application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain' },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || redirectCount === MAX_REDIRECTS) throw new Error('CV_REDIRECT_BLOCKED');
      currentUrl = new URL(location, currentUrl);
      continue;
    }

    if (!response.ok) throw new Error('CV_FETCH_FAILED');
    return { response, finalUrl: currentUrl };
  }

  throw new Error('CV_FETCH_FAILED');
}

async function fileFromStoredUrl(cvFileUrl: string, supabaseUrl: string) {
  const storageLocation = extractSupabaseStorageLocation(cvFileUrl, supabaseUrl);
  if (storageLocation) {
    if (storageLocation.bucket !== 'client-uploads') throw new Error('CV_HOST_NOT_ALLOWED');
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.storage
      .from(storageLocation.bucket)
      .download(storageLocation.path);
    if (error || !data) throw new Error('CV_FETCH_FAILED');
    const fileName = storageLocation.path.split('/').pop() || 'client-cv';
    return new File([data], fileName, { type: data.type });
  }

  const { response, finalUrl } = await fetchAllowedCv(cvFileUrl, supabaseUrl);
  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  const bytes = await readBoundedResponse(response);
  return new File([bytes], inferFileName(finalUrl, contentType), { type: contentType });
}

export async function loadClientStrategyCvText(cvFileUrl: string | null): Promise<ClientStrategyCvResult> {
  if (!cvFileUrl) return emptyCvResult('No CV is attached to this intake.');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  if (!supabaseUrl || !isAllowedClientStrategyCvUrl(cvFileUrl, supabaseUrl)) {
    return emptyCvResult('The saved CV link is not from an approved file host.');
  }

  try {
    const file = await fileFromStoredUrl(cvFileUrl, supabaseUrl);
    const text = redactClientStrategySourceText(await extractTextFromCvFile(file)).slice(0, MAX_CV_TEXT_CHARS);
    if (text.length < 200) {
      return emptyCvResult('The CV did not contain enough readable text, so it was not used.');
    }
    return { text, included: true, issue: null };
  } catch (error) {
    if (error instanceof Error && error.message === 'CV_TOO_LARGE') {
      return emptyCvResult('The CV is larger than 8MB, so it was not used.');
    }
    if (error instanceof Error && error.message === 'CV_HOST_NOT_ALLOWED') {
      return emptyCvResult('The saved CV link is not from an approved file host.');
    }
    return emptyCvResult('The CV could not be read. The draft used the intake and session debrief only.');
  }
}

