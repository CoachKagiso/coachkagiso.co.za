import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const adminKey = String(body?.adminKey || body?.key || '');

  if (!isDiagnosticAdminAuthorized(adminKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = String(body?.apiKey || '').trim();
  const model = String(body?.model || '').trim();

  if (!apiKey || !model) {
    return NextResponse.json({ error: 'API key and model are required.' }, { status: 400 });
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
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Reply with the word CONNECTED only.' }],
      max_tokens: 20,
      temperature: 0,
    }),
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
