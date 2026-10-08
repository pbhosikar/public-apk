/* global chrome, window */
(function () {
  'use strict';

  const EXT_VERSION = chrome.runtime.getManifest().version;
  let lastFingerprint = '';
  let syncTimer = null;

  function waWebBuild() {
    try {
      const meta = document.querySelector('meta[name="app-version"], meta[property="og:title"]');
      return String(meta?.content || document.documentElement?.dataset?.appVersion || '').slice(0, 80);
    } catch {
      return '';
    }
  }

  function fingerprint(result) {
    if (!result?.ok) return `fail:${result?.errorCode || ''}`;
    const last = result.messages?.[result.messages.length - 1];
    return `${result.phone}|${result.messages?.length || 0}|${last?.text?.slice(0, 40) || ''}|${last?.at || ''}`;
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
    const cfg = await getAdapterConfig();
    const result = window.SMWA_extractActiveChat(cfg);
    const fp = fingerprint(result);
    if (!force && fp === lastFingerprint && result.ok) {
      return { skipped: true };
    }
    lastFingerprint = fp;

    const health = {
      extVersion: EXT_VERSION,
      waWebBuild: waWebBuild(),
      strategyUsed: result.strategyUsed || '',
      extractOk: Boolean(result.ok),
      errorCode: result.errorCode || '',
    };

    try {
      const resp = await chrome.runtime.sendMessage({
        type: 'SYNC_CHAT',
        payload: {
          phone: result.phone || '',
          messages: result.ok ? result.messages : [],
          health,
        },
      });
      return resp;
    } catch (err) {
      return { ok: false, error: err?.message || 'bg_failed' };
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
      getAdapterConfig().then((cfg) => {
        const result = window.SMWA_extractActiveChat(cfg);
        sendResponse({
          ok: result.ok,
          phone: result.phone,
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

  // Observe chat switches
  const observer = new MutationObserver(() => {
    runExtractAndSync(false).catch(() => {});
  });
  const startObs = () => {
    const main = document.querySelector('#main') || document.body;
    if (main) {
      observer.observe(main, { childList: true, subtree: true, characterData: true });
    }
  };

  setTimeout(() => {
    startObs();
    schedule();
    runExtractAndSync(true).catch(() => {});
  }, 2500);
})();
