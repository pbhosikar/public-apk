import { getSettings, setSettings, apiV1Base } from './lib/storage.js';

const $ = (id) => document.getElementById(id);

async function load() {
  const s = await getSettings();
  $('apiBase').value = s.apiBase || '';
  $('passKey').value = s.passKey || '';
  $('autoSync').checked = s.autoSync !== false;
}

async function save() {
  const apiBase = $('apiBase').value.trim().replace(/\/+$/, '');
  const passKey = $('passKey').value.trim();
  const autoSync = $('autoSync').checked;
  await setSettings({ apiBase, passKey, autoSync });
  $('status').className = 'ok';
  $('status').textContent = 'Saved.';
}

async function test() {
  await save();
  const s = await getSettings();
  const status = $('status');
  status.className = '';
  status.textContent = 'Testing…';
  try {
    const base = apiV1Base(s.apiBase);
    const res = await fetch(`${base}/public/whatsapp-ext/adapter-config`, {
      headers: {
        Accept: 'application/json',
        'x-whatsapp-ext-key': s.passKey,
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
    await chrome.runtime.sendMessage({ type: 'REFRESH_ADAPTER' });
    status.className = 'ok';
    status.textContent = 'Connected — adapter config OK.';
  } catch (err) {
    status.className = 'err';
    status.textContent = err.message || 'Connection failed';
  }
}

$('save').addEventListener('click', () => save().catch((e) => {
  $('status').className = 'err';
  $('status').textContent = e.message;
}));
$('test').addEventListener('click', () => test());
load();
