import { getSettings, setSettings } from './lib/storage.js';

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
  const status = $('status');
  status.className = '';
  status.textContent = 'Testing…';
  try {
    const resp = await chrome.runtime.sendMessage({ type: 'TEST_CONNECTION' });
    if (!resp?.ok) throw new Error(resp?.error || 'Connection failed');
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
