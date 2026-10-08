import { getSettings, setSettings, apiV1Base } from './lib/storage.js';

const EXT_VERSION = chrome.runtime.getManifest().version;
const ADAPTER_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours
const MAX_BATCH = 120;

function cmpVersion(a, b) {
  const pa = String(a || '0').split('.').map((n) => Number(n) || 0);
  const pb = String(b || '0').split('.').map((n) => Number(n) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

async function fetchJson(url, { method = 'GET', headers = {}, body, passKey } = {}) {
  const h = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...headers,
  };
  if (passKey) h['x-whatsapp-ext-key'] = passKey;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(url, {
      method,
      headers: h,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.error?.message || json?.message || `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return json?.data !== undefined ? json.data : json;
  } finally {
    clearTimeout(t);
  }
}

async function refreshAdapterConfig(force = false) {
  const s = await getSettings();
  if (!s.apiBase || !s.passKey) return null;
  if (!force && s.adapterConfig && s.adapterFetchedAt) {
    if (Date.now() - Number(s.adapterFetchedAt) < ADAPTER_TTL_MS) {
      return s.adapterConfig;
    }
  }
  const base = apiV1Base(s.apiBase);
  try {
    const cfg = await fetchJson(
      `${base}/public/whatsapp-ext/adapter-config?v=${encodeURIComponent(EXT_VERSION)}`,
      { passKey: s.passKey },
    );
    const updateRequired = cfg?.minExtVersion
      ? cmpVersion(EXT_VERSION, cfg.minExtVersion) < 0
      : false;
    await setSettings({
      adapterConfig: cfg,
      adapterFetchedAt: Date.now(),
      updateRequired,
    });
    return cfg;
  } catch (err) {
    await setSettings({ lastError: `adapter-config: ${err.message}` });
    return s.adapterConfig;
  }
}

async function postSync(payload) {
  const s = await getSettings();
  if (!s.apiBase || !s.passKey) {
    throw new Error('Set API URL and pass key in extension options');
  }
  if (s.updateRequired) {
    throw new Error('Update required — install the latest SevenMentor extension');
  }
  const base = apiV1Base(s.apiBase);
  const messages = Array.isArray(payload.messages)
    ? payload.messages.slice(0, MAX_BATCH)
    : [];
  const body = {
    phone: payload.phone || '',
    messages,
    health: payload.health || null,
  };
  let attempt = 0;
  let lastErr;
  while (attempt < 4) {
    attempt += 1;
    try {
      const data = await fetchJson(`${base}/public/whatsapp-ext/sync`, {
        method: 'POST',
        passKey: s.passKey,
        body,
      });
      await setSettings({
        lastSyncAt: new Date().toISOString(),
        lastError: '',
        lastHealth: payload.health || null,
      });
      return data;
    } catch (err) {
      lastErr = err;
      if (err.status === 429 || (err.status >= 500 && err.status < 600)) {
        await new Promise((r) => setTimeout(r, 500 * (2 ** attempt) + Math.random() * 200));
        continue;
      }
      break;
    }
  }
  await setSettings({ lastError: lastErr?.message || 'sync failed', lastHealth: payload.health || null });
  throw lastErr || new Error('sync failed');
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('smwa-adapter-refresh', { periodInMinutes: 180 });
  chrome.alarms.create('smwa-heartbeat', { periodInMinutes: 15 });
  refreshAdapterConfig(true).catch(() => {});
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'smwa-adapter-refresh') {
    refreshAdapterConfig(true).catch(() => {});
  }
  if (alarm.name === 'smwa-heartbeat') {
    getSettings().then(async (s) => {
      if (!s.apiBase || !s.passKey) return;
      try {
        await postSync({
          phone: '',
          messages: [],
          health: s.lastHealth || {
            extVersion: EXT_VERSION,
            extractOk: null,
            errorCode: 'HEARTBEAT',
          },
        });
      } catch {
        /* stored in lastError */
      }
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'GET_ADAPTER_CONFIG') {
    refreshAdapterConfig(false).then((config) => sendResponse({ config })).catch(() => sendResponse({ config: null }));
    return true;
  }
  if (msg?.type === 'SYNC_CHAT') {
    const health = msg.payload?.health || {};
    // APK fallback hint: when extract fails, CRM UI shows phone sync — we still heartbeat.
    postSync(msg.payload || {})
      .then((data) => sendResponse({ ok: true, data, extractOk: health.extractOk !== false }))
      .catch((err) => sendResponse({
        ok: false,
        error: err.message,
        extractOk: health.extractOk,
        usePhoneSync: health.extractOk === false,
      }));
    return true;
  }
  if (msg?.type === 'GET_STATUS') {
    getSettings().then((s) => sendResponse({
      ...s,
      extVersion: EXT_VERSION,
      configured: Boolean(s.apiBase && s.passKey),
    }));
    return true;
  }
  if (msg?.type === 'REFRESH_ADAPTER') {
    refreshAdapterConfig(true).then((config) => sendResponse({ ok: true, config })).catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg?.type === 'TEST_CONNECTION') {
    (async () => {
      const s = await getSettings();
      if (!s.apiBase) throw new Error('Set CRM API base URL first');
      if (!s.passKey) throw new Error('Paste your pass key first');
      const base = apiV1Base(s.apiBase);
      const url = `${base}/public/whatsapp-ext/adapter-config?v=${encodeURIComponent(EXT_VERSION)}`;
      let res;
      try {
        res = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'x-whatsapp-ext-key': s.passKey,
          },
        });
      } catch (err) {
        const hint = /failed to fetch|networkerror|load failed/i.test(String(err?.message || ''))
          ? ' — CRM API unreachable (check https://crm-api.sevenmentor.io is up, or redeploy crm-api)'
          : '';
        throw new Error(`${err?.message || 'Failed to fetch'}${hint}`);
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 502 || res.status === 503) {
          throw new Error(`CRM API is down (HTTP ${res.status}). Restart/redeploy crm-api, then retry.`);
        }
        if (res.status === 401) {
          throw new Error('Invalid or revoked pass key — create a new one in CRM → WhatsApp Chrome Sync');
        }
        if (res.status === 403) {
          throw new Error(json?.error?.message || json?.message || 'Blocked (403). Deploy latest crm-api so /public/whatsapp-ext bypasses IP whitelist.');
        }
        if (res.status === 404) {
          throw new Error('Endpoint missing (404). Deploy latest crm-api with WhatsApp Chrome Sync routes.');
        }
        throw new Error(json?.error?.message || json?.message || `HTTP ${res.status}`);
      }
      await setSettings({
        adapterConfig: json?.data !== undefined ? json.data : json,
        adapterFetchedAt: Date.now(),
        lastError: '',
      });
      return { ok: true };
    })()
      .then((r) => sendResponse(r))
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  return false;
});
