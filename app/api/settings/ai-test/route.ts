import { NextResponse } from 'next/server';
import { loadAiConfig } from '@/lib/ai-config';
import { buildAiConnectionTestBody } from '@/lib/ai-request';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { resolveOpenRouterTestKey } from '@/lib/openrouter-key-settings';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const adminKey = String(body?.adminKey || body?.key || '');

  if (!isDiagnosticAdminAuthorized(adminKey, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const model = String(body?.model || '').trim();
  if (!model) {
    return NextResponse.json({ error: 'A model is required.' }, { status: 400 });
  }

  // A blank key field means "use the saved one" - the key is never sent back to the
  // browser, so the test resolves it server-side from saved settings, then env.
  const savedConfig = await loadAiConfig();
  const apiKey = resolveOpenRouterTestKey(body?.apiKey, savedConfig.openrouter_api_key, process.env.OPENROUTER_API_KEY);
  if (!apiKey) {
    return NextResponse.json({ error: 'No OpenRouter API key saved yet. Paste it above, then test again.' }, { status: 400 });
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://coachkagiso.co.za',
    'X-Title': 'Coach Kagiso Dashboard',
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify(buildAiConnectionTestBody(model)),
  });

  const responseText = await response.text();
  if (!response.ok) {
    console.error(`AI connection test failed ${response.status}:`, responseText);
    return NextResponse.json({ error: 'Connection failed. Check the API key and model.' }, { status: response.status });
  }

  const data = JSON.parse(responseText) as { choices?: Array<{ message?: { content?: string } }> };
  const result = data.choices?.[0]?.message?.content?.trim() || '';

  if (!result.toUpperCase().includes('CONNECTED')) {
    return NextResponse.json({ error: 'AI responded, but not with the expected test word.' }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
