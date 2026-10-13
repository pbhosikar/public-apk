/* global window */
(function () {
  'use strict';

  const ORDER = ['idb_lookup', 'aria_stable', 'dom_fallback', 'store_hook'];

  function remoteStrategyMap(adapterConfig) {
    const map = {};
    const list = adapterConfig?.strategies || [];
    for (const s of list) {
      if (s && s.id) map[s.id] = s;
    }
    return map;
  }

  function orderedIds(adapterConfig) {
    const remote = (adapterConfig?.strategies || [])
      .slice()
      .sort((a, b) => (a.priority || 99) - (b.priority || 99))
      .map((s) => s.id)
      .filter(Boolean);
    const ids = remote.length ? remote : ORDER;
    // Prefer IDB (phone for named contacts) then DOM strategies.
    const preferred = ['idb_lookup', 'store_hook', ...ids.filter((id) => id !== 'idb_lookup' && id !== 'store_hook')];
    return [...new Set(preferred)];
  }

  function isSuccess(result) {
    if (!result?.ok) return false;
    const hasPhone = Boolean(result.phone);
    const hasName = Boolean(result.chatName);
    const hasMsgs = Array.isArray(result.messages);
    // Need identity (phone or chat name) + messages array (may be empty for identity-only).
    return (hasPhone || hasName) && hasMsgs;
  }

  /**
   * Multi-strategy extractor. First success wins.
   * Async — IDB lookup needs awaits.
   * @returns {Promise<{ ok, phone, messages, chatName, strategyUsed, errorCode, idle? }>}
   */
  window.SMWA_extractActiveChat = async function SMWA_extractActiveChat(adapterConfig) {
    if (adapterConfig?.disabled) {
      return {
        ok: false,
        phone: '',
        messages: [],
        chatName: '',
        strategyUsed: '',
        errorCode: 'ADAPTER_DISABLED',
      };
    }

    const util = window.SMWA_PHONE;
    if (util && !util.hasOpenChat()) {
      return {
        ok: false,
        phone: '',
        messages: [],
        chatName: '',
        strategyUsed: '',
        errorCode: 'NO_ACTIVE_CHAT',
        idle: true,
      };
    }

    const adapters = window.SMWA_ADAPTERS || {};
    const remote = remoteStrategyMap(adapterConfig);
    const errors = [];
    let sawIdle = false;

    for (const id of orderedIds(adapterConfig)) {
      const adapter = adapters[id];
      if (!adapter) {
        errors.push(`${id}:missing`);
        continue;
      }
      try {
        let result;
        if (typeof adapter.extractAsync === 'function') {
          result = await adapter.extractAsync(remote[id] || {});
        } else if (typeof adapter.extract === 'function') {
          result = adapter.extract(remote[id] || {});
        } else {
          errors.push(`${id}:missing`);
          continue;
        }
        if (result?.idle || result?.errorCode === 'NO_ACTIVE_CHAT') {
          sawIdle = true;
          continue;
        }
        if (isSuccess(result)) {
          return {
            ok: true,
            phone: result.phone || '',
            messages: result.messages || [],
            chatName: result.chatName || '',
            strategyUsed: result.strategyUsed || id,
            errorCode: '',
          };
        }
        errors.push(`${id}:${result?.errorCode || 'fail'}`);
      } catch (err) {
        errors.push(`${id}:${err?.message || 'throw'}`);
      }
    }

    if (sawIdle && !errors.length) {
      return {
        ok: false,
        phone: '',
        messages: [],
        chatName: '',
        strategyUsed: '',
        errorCode: 'NO_ACTIVE_CHAT',
        idle: true,
      };
    }

    return {
      ok: false,
      phone: '',
      messages: [],
      chatName: '',
      strategyUsed: '',
      errorCode: errors.length ? `EXTRACT_FAIL:${errors.slice(0, 4).join('|')}` : 'EXTRACT_FAIL',
    };
  };
})();
