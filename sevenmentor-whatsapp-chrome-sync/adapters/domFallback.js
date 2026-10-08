/* global window */
(function () {
  'use strict';

  function textFromEl(el) {
    if (!el) return '';
    return String(el.innerText || el.textContent || '').trim();
  }

  window.SMWA_ADAPTERS = window.SMWA_ADAPTERS || {};
  window.SMWA_ADAPTERS.dom_fallback = {
    id: 'dom_fallback',
    extract(remoteSelectors) {
      const sel = (remoteSelectors && remoteSelectors.selectors) || remoteSelectors || {};
      const main = document.querySelector(sel.activeChat || '#main');
      if (!main) {
        return { ok: false, errorCode: 'DOM_NO_MAIN', phone: '', messages: [] };
      }

      let phone = '';
      const headerBits = main.querySelectorAll(sel.headerPhone || 'header span, header div');
      for (const el of headerBits) {
        const t = el.getAttribute('title') || textFromEl(el);
        const d = String(t || '').replace(/\D/g, '');
        if (d.length >= 10) {
          phone = d;
          break;
        }
      }

      const nodes = main.querySelectorAll(sel.messageIn || 'div[data-id], [data-testid="msg-container"]');
      const messages = [];
      for (const node of Array.from(nodes).slice(-80)) {
        const textEl = node.querySelector(sel.messageText || 'span.selectable-text, span.copyable-text span');
        const text = textFromEl(textEl);
        if (!text) continue;
        const dataId = node.getAttribute('data-id') || '';
        const out = /true|_out_/i.test(dataId) || node.querySelector('[data-icon="msg-check"], [data-icon="msg-dblcheck"]');
        messages.push({
          direction: out ? 'sent' : 'received',
          text,
          externalId: dataId ? `chrome-ext-${dataId}` : undefined,
          at: Date.now(),
        });
      }

      if (!phone) {
        return { ok: false, errorCode: 'DOM_NO_PHONE', phone: '', messages };
      }
      if (!messages.length) {
        return { ok: false, errorCode: 'DOM_NO_MESSAGES', phone, messages: [] };
      }
      return { ok: true, phone, messages, strategyUsed: 'dom_fallback' };
    },
  };
})();
