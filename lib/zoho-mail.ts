import { getContactEmail } from '@/lib/env';

export type ZohoMailboxMessage = {
  providerMessageId: string;
  providerThreadId: string | null;
  folderId: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  subject: string;
  summary: string;
  body: string;
  receivedAt: string;
};

type ZohoConfig = {
  accountsBaseUrl: string;
  mailBaseUrl: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accountId: string;
  inboxFolderId: string;
  sentFolderId?: string;
  mailbox: string;
};

type ZohoAccount = Record<string, unknown>;
type ZohoFolder = Record<string, unknown>;
type ZohoMessage = Record<string, unknown>;

const requiredZohoEnv = ['ZOHO_MAIL_CLIENT_ID', 'ZOHO_MAIL_CLIENT_SECRET', 'ZOHO_MAIL_REFRESH_TOKEN'] as const;

export function getMissingZohoMailEnv() {
  return requiredZohoEnv.filter((name) => !process.env[name]?.trim());
}

function getZohoConfig(): Omit<ZohoConfig, 'accountId' | 'inboxFolderId'> & {
  accountId?: string;
  inboxFolderId?: string;
} {
  const missing = getMissingZohoMailEnv();
  if (missing.length > 0) {
    throw new Error(`Zoho Mail is not configured. Missing: ${missing.join(', ')}`);
  }

  return {
    accountsBaseUrl: (process.env.ZOHO_ACCOUNTS_BASE_URL || 'https://accounts.zoho.com').replace(/\/$/, ''),
    mailBaseUrl: (process.env.ZOHO_MAIL_BASE_URL || 'https://mail.zoho.com/api').replace(/\/$/, ''),
    clientId: process.env.ZOHO_MAIL_CLIENT_ID || '',
    clientSecret: process.env.ZOHO_MAIL_CLIENT_SECRET || '',
    refreshToken: process.env.ZOHO_MAIL_REFRESH_TOKEN || '',
    accountId: process.env.ZOHO_MAIL_ACCOUNT_ID?.trim(),
    inboxFolderId: process.env.ZOHO_MAIL_INBOX_FOLDER_ID?.trim(),
    sentFolderId: process.env.ZOHO_MAIL_SENT_FOLDER_ID?.trim(),
    mailbox: (process.env.ZOHO_MAILBOX_EMAIL || getContactEmail()).trim().toLowerCase(),
  };
}

function getArrayData(value: unknown) {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['messages', 'accounts', 'folders']) {
      if (Array.isArray(record[key])) return record[key] as Record<string, unknown>[];
    }

    const data = record.data;
    if (Array.isArray(data)) return data as Record<string, unknown>[];
    if (data && typeof data === 'object') {
      const dataRecord = data as Record<string, unknown>;
      for (const key of ['messages', 'accounts', 'folders']) {
        if (Array.isArray(dataRecord[key])) return dataRecord[key] as Record<string, unknown>[];
      }
    }
  }
  return [];
}

function getObjectData(value: unknown) {
  if (value && typeof value === 'object') {
    const data = (value as { data?: unknown }).data;
    if (data && typeof data === 'object' && !Array.isArray(data)) return data as Record<string, unknown>;
    return value as Record<string, unknown>;
  }
  return {};
}

function getString(...values: unknown[]) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

function stripAddressName(value: string) {
  const decoded = decodeHtmlEntities(value);
  const match = decoded.match(/<([^>]+)>/);
  return (match?.[1] || decoded).trim().toLowerCase();
}

function stripEmailName(value: string) {
  return decodeHtmlEntities(value).replace(/<[^>]+>/g, '').replace(/^["']|["']$/g, '').trim();
}

function normalizeEmail(value?: string | null) {
  const email = stripAddressName(String(value || ''));
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function htmlToText(value?: string | null) {
  return decodeHtmlEntities(String(value || ''))
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|td|th|li|h[1-6]|table|ol|ul)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeReceivedAt(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  const raw = String(value || '').trim();
  if (!raw) return new Date().toISOString();

  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 1000000000) {
    const date = new Date(numeric);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

async function refreshZohoAccessToken(config: ReturnType<typeof getZohoConfig>) {
  const params = new URLSearchParams({
    refresh_token: config.refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
  });

  const response = await fetch(`${config.accountsBaseUrl}/oauth/v2/token?${params.toString()}`, {
    method: 'POST',
    headers: { accept: 'application/json' },
  });
  const data = (await response.json().catch(() => ({}))) as { access_token?: string; error?: string };

  if (!response.ok || !data.access_token) {
    throw new Error(data.error || 'Could not refresh Zoho Mail access token.');
  }

  return data.access_token;
}

async function zohoGet<T>(config: { mailBaseUrl: string }, token: string, path: string, params?: Record<string, string | number | null | undefined>) {
  const url = new URL(`${config.mailBaseUrl}${path}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') url.searchParams.set(key, String(value));
  });

  const response = await fetch(url.toString(), {
    headers: {
      accept: 'application/json',
      Authorization: `Zoho-oauthtoken ${token}`,
    },
  });
  const data = (await response.json().catch(() => ({}))) as T;

  if (!response.ok) {
    throw new Error(`Zoho Mail request failed (${response.status}) for ${url.pathname}.`);
  }

  return data;
}

function accountMatchesMailbox(account: ZohoAccount, mailbox: string) {
  const values = [
    account.mailboxAddress,
    account.primaryEmailAddress,
    account.emailAddress,
    account.accountDisplayName,
    account.incomingUserName,
    account.outgoingUserName,
  ];

  return values.some((value) => String(value || '').toLowerCase() === mailbox);
}

function folderLooksLikeInbox(folder: ZohoFolder) {
  const searchable = [
    folder.folderName,
    folder.folderPath,
    folder.folderType,
    folder.type,
    folder.name,
  ].map((value) => String(value || '').toLowerCase());

  return searchable.some((value) => value === 'inbox' || value.endsWith('/inbox'));
}

function folderLooksLikeSent(folder: ZohoFolder) {
  const searchable = [
    folder.folderName,
    folder.folderPath,
    folder.folderType,
    folder.type,
    folder.name,
  ].map((value) => String(value || '').toLowerCase());

  return searchable.some((value) =>
    value === 'sent' ||
    value.endsWith('/sent') ||
    value.includes('sent mail') ||
    value.includes('sent items')
  );
}

async function resolveZohoMailbox(config: ReturnType<typeof getZohoConfig>, token: string): Promise<ZohoConfig> {
  let accountId = config.accountId || '';
  if (!accountId) {
    const accountsResponse = await zohoGet<unknown>(config, token, '/accounts');
    const accounts = getArrayData(accountsResponse);
    const account = accounts.find((item) => accountMatchesMailbox(item, config.mailbox)) || accounts[0];
    accountId = getString(account?.accountId, account?.id);
  }

  if (!accountId) {
    throw new Error(`Could not find a Zoho Mail account for ${config.mailbox}.`);
  }

  let folders: ZohoFolder[] | null = null;
  async function loadFolders() {
    if (!folders) {
      const foldersResponse = await zohoGet<unknown>(config, token, `/accounts/${accountId}/folders`);
      folders = getArrayData(foldersResponse);
    }
    return folders;
  }

  let inboxFolderId = config.inboxFolderId || '';
  if (!inboxFolderId) {
    const folderList = await loadFolders();
    const folder = folderList.find(folderLooksLikeInbox) || folderList[0];
    inboxFolderId = getString(folder?.folderId, folder?.id);
  }

  if (!inboxFolderId) {
    throw new Error('Could not find the Zoho Mail inbox folder.');
  }

  let sentFolderId = config.sentFolderId || '';
  if (!sentFolderId) {
    const folderList = await loadFolders();
    const folder = folderList.find(folderLooksLikeSent);
    sentFolderId = getString(folder?.folderId, folder?.id);
  }

  return {
    ...config,
    accountId,
    inboxFolderId,
    sentFolderId,
  };
}

async function getZohoMessageContent(config: ZohoConfig, token: string, message: ZohoMessage) {
  const messageId = getString(message.messageId, message.id);
  const folderId = getString(message.folderId, message.parentFolderId, config.inboxFolderId);
  if (!messageId || !folderId) return '';

  const response = await zohoGet<unknown>(
    config,
    token,
    `/accounts/${config.accountId}/folders/${folderId}/messages/${messageId}/content`,
  );
  const data = getObjectData(response);
  const content = getString(
    data.content,
    data.html,
    data.body,
    data.message,
    data.summary,
    (response as { content?: unknown }).content,
  );

  return htmlToText(content);
}

function normalizeZohoMessage(message: ZohoMessage, body: string, mailbox: string): ZohoMailboxMessage | null {
  const providerMessageId = getString(message.messageId, message.id);
  const fromRaw = getString(message.fromAddress, message.sender, message.from);
  const toRaw = getString(message.toAddress, message.recipient, message.to, mailbox);
  const fromEmail = normalizeEmail(fromRaw);
  const toEmail = normalizeEmail(toRaw) || mailbox;
  const receivedAt = normalizeReceivedAt(message.receivedTimeMillis ?? message.receivedTime ?? message.sentDateInGMT ?? message.date);

  if (!providerMessageId || !fromEmail) return null;

  return {
    providerMessageId,
    providerThreadId: getString(message.threadId, message.conversationId) || null,
    folderId: getString(message.folderId, message.parentFolderId),
    fromEmail,
    fromName: getString(message.senderName, message.fromName, stripEmailName(fromRaw), fromEmail),
    toEmail,
    subject: getString(message.subject, '(No subject)'),
    summary: htmlToText(getString(message.summary, message.snippet)),
    body: body || htmlToText(getString(message.summary, message.snippet)) || 'No readable body was returned by Zoho Mail.',
    receivedAt,
  };
}

async function listZohoFolderMessages({
  config,
  token,
  folderId,
  limit,
  start,
}: {
  config: ZohoConfig;
  token: string;
  folderId: string;
  limit: number;
  start: number;
}) {
  const response = await zohoGet<unknown>(config, token, `/accounts/${config.accountId}/messages/view`, {
    folderId,
    start,
    limit,
    status: 'all',
  });

  const messages = getArrayData(response);
  const normalized: ZohoMailboxMessage[] = [];

  for (const message of messages) {
    const body = await getZohoMessageContent(config, token, message);
    const item = normalizeZohoMessage(message, body, config.mailbox);
    if (item) normalized.push(item);
  }

  return normalized;
}

export async function listZohoInboxMessages({
  limit = 50,
  start = 1,
}: {
  limit?: number;
  start?: number;
} = {}) {
  const baseConfig = getZohoConfig();
  const token = await refreshZohoAccessToken(baseConfig);
  const config = await resolveZohoMailbox(baseConfig, token);
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 200));
  const safeStart = Math.max(1, Math.floor(start));

  return {
    mailbox: config.mailbox,
    accountId: config.accountId,
    inboxFolderId: config.inboxFolderId,
    messages: await listZohoFolderMessages({
      config,
      token,
      folderId: config.inboxFolderId,
      limit: safeLimit,
      start: safeStart,
    }),
  };
}

export async function listZohoSentMessages({
  limit = 50,
  start = 1,
}: {
  limit?: number;
  start?: number;
} = {}) {
  const baseConfig = getZohoConfig();
  const token = await refreshZohoAccessToken(baseConfig);
  const config = await resolveZohoMailbox(baseConfig, token);
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 200));
  const safeStart = Math.max(1, Math.floor(start));

  if (!config.sentFolderId) {
    throw new Error('Could not find the Zoho Mail sent folder.');
  }

  return {
    mailbox: config.mailbox,
    accountId: config.accountId,
    sentFolderId: config.sentFolderId,
    messages: await listZohoFolderMessages({
      config,
      token,
      folderId: config.sentFolderId,
      limit: safeLimit,
      start: safeStart,
    }),
  };
}
