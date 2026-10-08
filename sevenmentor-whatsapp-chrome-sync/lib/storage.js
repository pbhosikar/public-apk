/** chrome.storage.local helpers (MV3 service worker + pages). */

/** Production CRM API — used when the user has not saved a custom base URL. */
export const DEFAULT_API_BASE = 'https://crm-api.sevenmentor.io';

export async function getSettings() {
  const data = await chrome.storage.local.get([
    'apiBase',
    'passKey',
    'autoSync',
    'lastSyncAt',
    'lastError',
    'lastHealth',
    'adapterConfig',
    'adapterFetchedAt',
    'updateRequired',
  ]);
  const stored = String(data.apiBase || '').trim().replace(/\/+$/, '');
  return {
    apiBase: stored || DEFAULT_API_BASE,
    passKey: String(data.passKey || ''),
    autoSync: data.autoSync !== false,
    lastSyncAt: data.lastSyncAt || null,
    lastError: data.lastError || '',
    lastHealth: data.lastHealth || null,
    adapterConfig: data.adapterConfig || null,
    adapterFetchedAt: data.adapterFetchedAt || null,
    updateRequired: Boolean(data.updateRequired),
  };
}

export async function setSettings(partial) {
  await chrome.storage.local.set(partial || {});
}

export function apiV1Base(apiBase) {
  const root = String(apiBase || DEFAULT_API_BASE).replace(/\/+$/, '');
  if (!root) return `${DEFAULT_API_BASE}/api/v1`;
  if (/\/api\/v1$/i.test(root)) return root;
  return `${root}/api/v1`;
}
