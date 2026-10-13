/* global window */
(function () {
  'use strict';

  function textFromEl(el) {
    if (!el) return '';
    return String(el.innerText || el.textContent || '').trim();
  }

  /** Digits-only phone (≥10) from free text / JID / title. */
  function digitsFromText(raw) {
    const s = String(raw || '');
    const jid = s.match(/(\d{10,15})@(?:c\.us|s\.whatsapp\.net)/i);
    if (jid) return jid[1];
    const digits = s.replace(/\D/g, '');
    return digits.length >= 10 ? digits : '';
  }

  /**
   * Active conversation display name from WA Web header.
   * Modern WA no longer puts the JID on the DOM — name is the primary identity signal.
   */
  function activeChatName(selectors) {
    const sel = selectors || {};
    const candidates = [
      sel.headerTitle,
      'header[data-testid="conversation-header"] span[title]',
      'header[data-testid="conversation-header"] [data-testid="conversation-info-header-chat-title"]',
      '#main header span[title]',
      '#main header [data-testid="conversation-info-header-chat-title"]',
      '#main header span[dir="auto"]',
    ].filter(Boolean);

    for (const q of candidates) {
      try {
        const el = document.querySelector(q);
        const title = el?.getAttribute?.('title') || textFromEl(el);
        const cleaned = String(title || '').replace(/\s+/g, ' ').trim();
        if (cleaned && cleaned.length >= 2 && !/^online|^typing|^last seen/i.test(cleaned)) {
          return cleaned.slice(0, 120);
        }
      } catch {
        /* next */
      }
    }
    return '';
  }

  /** Phone from header title / aria when contact is unsaved (number shown as title). */
  function phoneFromHeader(selectors) {
    const name = activeChatName(selectors);
    const fromName = digitsFromText(name);
    if (fromName) return fromName;

    const header = document.querySelector('#main header') || document.querySelector('header[data-testid="conversation-header"]');
    if (!header) return '';
    const bits = header.querySelectorAll('[title], span, div');
    for (const el of bits) {
      const t = el.getAttribute('title') || textFromEl(el);
      const d = digitsFromText(t);
      if (d) return d;
    }
    return '';
  }

  /** Legacy compound data-id: true_<jid>_<msgId> — current WA often uses bare hex msgId. */
  function phoneFromMessageNodes(root) {
    if (!root) return '';
    const nodes = root.querySelectorAll('[data-id]');
    for (const node of nodes) {
      const d = digitsFromText(node.getAttribute('data-id') || '');
      if (d) return d;
    }
    return '';
  }

  function detectDirection(node) {
    const cls = String(node.className || '');
    const testid = node.getAttribute('data-testid') || '';
    const blob = `${cls} ${testid}`;
    if (/message-out|msg-out|msg-outgoing/i.test(blob)) return 'sent';
    if (/message-in|msg-in|msg-incoming/i.test(blob)) return 'received';
    const dataId = node.getAttribute('data-id') || '';
    if (/^true_|^true-/i.test(dataId) || /_out_/i.test(dataId)) return 'sent';
    if (node.querySelector('[data-icon="msg-check"], [data-icon="msg-dblcheck"], [data-icon="msg-dblcheck-ack"]')) {
      return 'sent';
    }
    try {
      const style = window.getComputedStyle(node);
      if (style && (style.marginLeft === 'auto' || Number.parseFloat(style.marginLeft) > 40)) {
        return 'sent';
      }
    } catch {
      /* ignore */
    }
    return 'received';
  }

  function extractMessages(root, selectors, limit) {
    if (!root) return [];
    const sel = selectors || {};
    const query = sel.messageIn
      || '[data-testid="msg-container"], div.message-in, div.message-out, div[data-id], [data-pre-plain-text]';
    let nodes = Array.from(root.querySelectorAll(query));
    // Prefer row containers over nested data-pre-plain-text spans.
    nodes = nodes.filter((n) => {
      const tag = (n.tagName || '').toLowerCase();
      if (tag === 'span' && n.hasAttribute('data-pre-plain-text')) return false;
      return true;
    });
    if (!nodes.length) {
      nodes = Array.from(root.querySelectorAll('[data-pre-plain-text]'))
        .map((el) => el.closest('[data-testid="msg-container"], div[data-id], div.message-in, div.message-out') || el.parentElement)
        .filter(Boolean);
    }
    const seen = new Set();
    const out = [];
    const slice = nodes.slice(-Math.max(1, limit || 80));
    for (const node of slice) {
      if (!node || seen.has(node)) continue;
      seen.add(node);
      const textEl = node.querySelector(
        sel.messageText
          || 'span.selectable-text, span.copyable-text span, span[dir="ltr"], span[dir="rtl"], .copyable-text',
      );
      let text = textFromEl(textEl);
      if (!text) {
        const pre = node.querySelector('[data-pre-plain-text]');
        text = textFromEl(pre);
      }
      if (!text) continue;
      const dataId = node.getAttribute('data-id') || '';
      const atAttr = node.querySelector('[data-pre-plain-text]')?.getAttribute('data-pre-plain-text') || '';
      let at = Date.now();
      const m = String(atAttr).match(/\[([^\]]+)\]/);
      if (m) {
        const parsed = Date.parse(m[1]);
        if (!Number.isNaN(parsed)) at = parsed;
      }
      out.push({
        direction: detectDirection(node),
        text: text.slice(0, 4000),
        externalId: dataId ? `chrome-ext-${dataId}` : undefined,
        at,
      });
    }
    return out;
  }

  function hasOpenChat() {
    return Boolean(
      document.querySelector('#main header')
      || document.querySelector('header[data-testid="conversation-header"]')
      || document.querySelector('#main [data-testid="conversation-panel-messages"]'),
    );
  }

  window.SMWA_PHONE = {
    textFromEl,
    digitsFromText,
    activeChatName,
    phoneFromHeader,
    phoneFromMessageNodes,
    detectDirection,
    extractMessages,
    hasOpenChat,
  };
})();
