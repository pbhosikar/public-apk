/* global window */
(function () {
  'use strict';

  const ORDER = ['store_hook', 'aria_stable', 'dom_fallback'];

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
    // Always try store_hook first if present in adapters, even if not in remote list.
    const merged = ['store_hook', ...ids.filter((id) => id !== 'store_hook')];
    return [...new Set(merged)];
  }

  /**
   * Multi-strategy extractor. First success wins.
   * @returns {{ ok, phone, messages, strategyUsed, errorCode }}
   */
  window.SMWA_extractActiveChat = function SMWA_extractActiveChat(adapterConfig) {
    if (adapterConfig?.disabled) {
      return {
        ok: false,
        phone: '',
        messages: [],
        strategyUsed: '',
        errorCode: 'ADAPTER_DISABLED',
      };
    }

    const adapters = window.SMWA_ADAPTERS || {};
    const remote = remoteStrategyMap(adapterConfig);
    const errors = [];

    for (const id of orderedIds(adapterConfig)) {
      const adapter = adapters[id];
      if (!adapter || typeof adapter.extract !== 'function') {
        errors.push(`${id}:missing`);
        continue;
      }
      try {
        const result = adapter.extract(remote[id] || {});
        if (result?.ok && result.phone && Array.isArray(result.messages)) {
          return {
            ok: true,
            phone: result.phone,
            messages: result.messages,
            strategyUsed: result.strategyUsed || id,
            errorCode: '',
          };
        }
        errors.push(`${id}:${result?.errorCode || 'fail'}`);
      } catch (err) {
        errors.push(`${id}:${err?.message || 'throw'}`);
      }
    }

    return {
      ok: false,
      phone: '',
      messages: [],
      strategyUsed: '',
      errorCode: errors.length ? `EXTRACT_FAIL:${errors.slice(0, 4).join('|')}` : 'EXTRACT_FAIL',
    };
  };
})();
