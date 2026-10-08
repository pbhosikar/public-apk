/** chrome.storage.local helpers (MV3 service worker + pages). */

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
  return {
    apiBase: String(data.apiBase || '').replace(/\/+$/, ''),
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
  const root = String(apiBase || '').replace(/\/+$/, '');
  if (!root) return '';
  if (/\/api\/v1$/i.test(root)) return root;
  return `${root}/api/v1`;
}
