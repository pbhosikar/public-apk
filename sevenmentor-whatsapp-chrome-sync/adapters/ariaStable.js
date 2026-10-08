/* global window */
(function () {
  'use strict';

  function textFromEl(el) {
    if (!el) return '';
    return String(el.innerText || el.textContent || '').trim();
  }

  function detectDirection(node) {
    const cls = String(node.className || '');
    const testid = node.getAttribute('data-testid') || '';
    if (/message-out|msg-out/i.test(cls + testid)) return 'sent';
    if (/message-in|msg-in/i.test(cls + testid)) return 'received';
    // WA often puts outbound on the right via style/class
    const style = window.getComputedStyle(node);
    if (style && (style.marginLeft === 'auto' || Number.parseFloat(style.marginLeft) > 40)) {
      return 'sent';
    }
    return 'received';
  }

  function extractPhone(selectors) {
    const header = document.querySelector(selectors.headerPhone || 'header span[title], header [title]');
    const title = header?.getAttribute?.('title') || textFromEl(header);
    const digits = String(title || '').replace(/\D/g, '');
    if (digits.length >= 10) return digits;
    // Fallback: conversation header aria-label
    const aria = document.querySelector('#main header');
    const label = aria?.getAttribute?.('aria-label') || textFromEl(aria);
    const d2 = String(label || '').replace(/\D/g, '');
    return d2.length >= 10 ? d2 : '';
  }

  function extractMessages(selectors, limit) {
    const root = document.querySelector(selectors.activeChat || '#main');
    if (!root) return [];
    const nodes = root.querySelectorAll(
      selectors.messageIn || '[data-testid="msg-container"], div[data-id]',
    );
    const out = [];
    const slice = Array.from(nodes).slice(-Math.max(1, limit || 80));
    for (const node of slice) {
      const textEl = node.querySelector(
        selectors.messageText || 'span.selectable-text, span.copyable-text span, span[dir="ltr"], span[dir="rtl"]',
      );
      const text = textFromEl(textEl);
      if (!text) continue;
      const dataId = node.getAttribute('data-id') || '';
      const atAttr = node.querySelector('div[data-pre-plain-text]')?.getAttribute('data-pre-plain-text') || '';
      let at = Date.now();
      const m = String(atAttr).match(/\[([^\]]+)\]/);
      if (m) {
        const parsed = Date.parse(m[1]);
        if (!Number.isNaN(parsed)) at = parsed;
      }
      out.push({
        direction: detectDirection(node),
        text,
        externalId: dataId ? `chrome-ext-${dataId}` : undefined,
        at,
      });
    }
    return out;
  }

  window.SMWA_ADAPTERS = window.SMWA_ADAPTERS || {};
  window.SMWA_ADAPTERS.aria_stable = {
    id: 'aria_stable',
    extract(remoteSelectors) {
      const selectors = (remoteSelectors && remoteSelectors.selectors) || remoteSelectors || {};
      const phone = extractPhone(selectors);
      const messages = extractMessages(selectors, 80);
      if (!phone && !messages.length) {
        return { ok: false, errorCode: 'ARIA_EMPTY', phone: '', messages: [] };
      }
      if (!phone) {
        return { ok: false, errorCode: 'ARIA_NO_PHONE', phone: '', messages };
      }
      return { ok: true, phone, messages, strategyUsed: 'aria_stable' };
    },
  };
})();
