/* global chrome, window */
(function () {
  'use strict';

  const EXT_VERSION = chrome.runtime.getManifest().version;
  let lastFingerprint = '';
  let syncTimer = null;
  let running = false;

  function waWebBuild() {
    try {
      const meta = document.querySelector('meta[name="app-version"], meta[property="og:title"]');
      return String(meta?.content || document.documentElement?.dataset?.appVersion || '').slice(0, 80);
    } catch {
      return '';
    }
  }

  function fingerprint(result) {
    if (result?.idle) return 'idle:no-chat';
    if (!result?.ok) return `fail:${result?.errorCode || ''}`;
    const last = result.messages?.[result.messages.length - 1];
    return `${result.phone}|${result.chatName || ''}|${result.messages?.length || 0}|${last?.text?.slice(0, 40) || ''}|${last?.at || ''}`;
  }

  async function getAdapterConfig() {
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'GET_ADAPTER_CONFIG' });
      return resp?.config || null;
    } catch {
      return null;
    }
  }

  async function runExtractAndSync(force) {
    if (running) return { skipped: true, busy: true };
    running = true;
    try {
      const cfg = await getAdapterConfig();
      const result = await window.SMWA_extractActiveChat(cfg);
      const fp = fingerprint(result);
      if (!force && fp === lastFingerprint && (result.ok || result.idle)) {
        return { skipped: true };
      }
      lastFingerprint = fp;

      // Idle (chat list, no open conversation) — soft heartbeat, not a hard fail banner.
      const extractOk = result.idle ? null : Boolean(result.ok);
      const health = {
        extVersion: EXT_VERSION,
        waWebBuild: waWebBuild(),
        strategyUsed: result.strategyUsed || '',
        extractOk,
        errorCode: result.errorCode || (result.idle ? 'NO_ACTIVE_CHAT' : ''),
      };

      try {
        const resp = await chrome.runtime.sendMessage({
          type: 'SYNC_CHAT',
          payload: {
            phone: result.phone || '',
            chatName: result.chatName || '',
            messages: result.ok ? (result.messages || []) : [],
            health,
          },
        });
        return resp;
      } catch (err) {
        return { ok: false, error: err?.message || 'bg_failed' };
      }
    } finally {
      running = false;
    }
  }

  function schedule() {
    if (syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(() => {
      runExtractAndSync(false).catch(() => {});
    }, 12_000);
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'FORCE_SYNC') {
      runExtractAndSync(true).then(sendResponse);
      return true;
    }
    if (msg?.type === 'PROBE') {
      getAdapterConfig().then(async (cfg) => {
        const result = await window.SMWA_extractActiveChat(cfg);
        sendResponse({
          ok: result.ok,
          idle: Boolean(result.idle),
          phone: result.phone,
          chatName: result.chatName,
          count: result.messages?.length || 0,
          strategyUsed: result.strategyUsed,
          errorCode: result.errorCode,
          waWebBuild: waWebBuild(),
        });
      });
      return true;
    }
    return false;
  });

  // Debounced observer — WA mutates heavily; don't stampede extract.
  let obsTimer = null;
  const observer = new MutationObserver(() => {
    if (obsTimer) clearTimeout(obsTimer);
    obsTimer = setTimeout(() => {
      runExtractAndSync(false).catch(() => {});
    }, 800);
  });
  const startObs = () => {
    const main = document.querySelector('#main') || document.body;
    if (main) {
      observer.observe(main, { childList: true, subtree: true, characterData: false });
    }
  };

  setTimeout(() => {
    startObs();
    schedule();
    runExtractAndSync(true).catch(() => {});
  }, 2500);
})();
