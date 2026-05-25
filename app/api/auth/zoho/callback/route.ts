import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

function getRedirectUri() {
  return process.env.ZOHO_AUTH_REDIRECT_URI || `${getSiteUrl()}/api/auth/zoho/callback`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPage({
  title,
  body,
  token,
  code,
}: {
  title: string;
  body: string;
  token?: string;
  code?: string;
}) {
  const secretValue = token || code || '';
  const secretLabel = token ? 'Refresh token' : 'Authorization code';

  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; background: #F5F3EE; color: #142334; margin: 0; padding: 40px 20px; }
      main { max-width: 720px; margin: 0 auto; background: #fff; border: 1px solid #D8C8BB; border-radius: 8px; padding: 28px; }
      h1 { margin: 0 0 12px; font-size: 28px; }
      p { line-height: 1.6; color: rgba(20,35,52,0.72); }
      label { display: block; margin-top: 22px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #8C7466; }
      textarea { box-sizing: border-box; width: 100%; min-height: 96px; margin-top: 8px; padding: 12px; border: 1px solid #D8C8BB; border-radius: 8px; font: 13px/1.5 ui-monospace, SFMono-Regular, Consolas, monospace; color: #142334; }
      .note { margin-top: 18px; border-radius: 8px; background: #F7F1EC; padding: 14px; color: #7B5D49; font-size: 14px; }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(body)}</p>
      ${secretValue ? `<label>${secretLabel}</label><textarea readonly>${escapeHtml(secretValue)}</textarea>` : ''}
      <div class="note">Keep this private. After it is saved in Vercel, you can close this tab.</div>
    </main>
  </body>
</html>`,
    {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  const code = url.searchParams.get('code');

  if (error) {
    return renderPage({
      title: 'Zoho authorization was cancelled',
      body: `Zoho returned: ${error}`,
    });
  }

  if (!code) {
    return renderPage({
      title: 'Zoho authorization code missing',
      body: 'Zoho did not return a code. Please restart the Zoho connection from the dashboard setup link.',
    });
  }

  const clientId = process.env.ZOHO_MAIL_CLIENT_ID?.trim();
  const clientSecret = process.env.ZOHO_MAIL_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return renderPage({
      title: 'Zoho authorization code received',
      body: 'The app received the authorization code, but the Zoho client credentials are not configured on this server yet.',
      code,
    });
  }

  const accountsBaseUrl =
    url.searchParams.get('accounts-server') ||
    process.env.ZOHO_ACCOUNTS_BASE_URL ||
    'https://accounts.zoho.com';
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getRedirectUri(),
    code,
  });

  const response = await fetch(`${accountsBaseUrl.replace(/\/$/, '')}/oauth/v2/token`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.refresh_token) {
    return renderPage({
      title: 'Zoho refresh token was not created',
      body: payload.error_description || payload.error || 'Zoho did not return a refresh token. Restart the authorization and make sure you approve consent.',
      code,
    });
  }

  return renderPage({
    title: 'Zoho refresh token created',
    body: 'Copy this refresh token and send it to Codex so it can be saved as ZOHO_MAIL_REFRESH_TOKEN in Vercel.',
    token: payload.refresh_token,
  });
}
