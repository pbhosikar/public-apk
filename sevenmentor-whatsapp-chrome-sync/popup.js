async function refresh() {
  const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
  document.getElementById('version').textContent = `v${status.extVersion || ''}`;
  const banner = document.getElementById('banner');
  const statusEl = document.getElementById('status');
  const lastSync = document.getElementById('lastSync');
  const strategy = document.getElementById('strategy');
  const hint = document.getElementById('hint');

  if (status.updateRequired) {
    banner.className = 'banner err';
    banner.textContent = 'Update required — install the latest extension from CRM.';
  } else if (status.lastHealth?.extractOk === false) {
    banner.className = 'banner err';
    banner.textContent = 'Chrome Sync offline — use phone (APK) WhatsApp sync until WA Web is fixed.';
  } else if (!status.configured) {
    banner.className = 'banner';
    banner.textContent = 'Set API URL + pass key in Options.';
  } else {
    banner.className = 'banner ok';
    banner.textContent = 'Connected';
  }

  if (!status.configured) statusEl.textContent = 'Not configured';
  else if (status.lastError) statusEl.textContent = 'Error';
  else if (status.lastSyncAt) statusEl.textContent = 'Syncing';
  else statusEl.textContent = 'Ready';

  lastSync.textContent = status.lastSyncAt
    ? new Date(status.lastSyncAt).toLocaleString()
    : '—';
  strategy.textContent = status.lastHealth?.strategyUsed
    || (status.lastHealth?.errorCode || '—');
  hint.textContent = status.lastError
    || (status.lastHealth?.extractOk === false
      ? 'Open CRM Sync on your phone as backup.'
      : 'Keep WhatsApp Web open on this PC.');
}

document.getElementById('openOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('syncNow').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !String(tab.url || '').includes('web.whatsapp.com')) {
    document.getElementById('hint').textContent = 'Open web.whatsapp.com first.';
    return;
  }
  document.getElementById('hint').textContent = 'Syncing…';
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'FORCE_SYNC' });
  } catch {
    document.getElementById('hint').textContent = 'Reload the WhatsApp Web tab, then try again.';
    return;
  }
  setTimeout(refresh, 800);
});

refresh();
