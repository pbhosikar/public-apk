/* global window */
(function () {
  'use strict';

  /**
   * Best-effort Webpack / Store hook — same family as whatsapp-web.js.
   * WhatsApp Web may expose modules; if not, fail closed and let DOM strategies run.
   */
  function tryGetActiveChat() {
    try {
      const w = window;
      // Common patterns observed across WA Web builds (may disappear after Meta updates).
      const candidates = [
        () => w.Store?.Chat?.getActive?.(),
        () => w.require?.('WAWebChatCollection')?.ChatCollection?.getActive?.(),
        () => w.webpackChunkwhatsapp_web_client && null,
      ];
      for (const fn of candidates) {
        try {
          const chat = fn();
          if (chat) return chat;
        } catch {
          /* next */
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  function phoneFromChat(chat) {
    const id = chat?.id?._serialized || chat?.id || chat?.contact?.id?._serialized || '';
    const digits = String(id).replace(/@.*$/, '').replace(/\D/g, '');
    return digits.length >= 10 ? digits : '';
  }

  window.SMWA_ADAPTERS = window.SMWA_ADAPTERS || {};
  window.SMWA_ADAPTERS.store_hook = {
    id: 'store_hook',
    extract() {
      const chat = tryGetActiveChat();
      if (!chat) {
        return { ok: false, errorCode: 'STORE_UNAVAILABLE', phone: '', messages: [] };
      }
      const phone = phoneFromChat(chat);
      const msgs = [];
      try {
        const list = chat.msgs?.getModelsArray?.() || chat.msgs?._models || [];
        for (const m of Array.from(list).slice(-80)) {
          const text = String(m.body || m.text || m.caption || '').trim();
          if (!text) continue;
          msgs.push({
            direction: m.id?.fromMe || m.fromMe ? 'sent' : 'received',
            text,
            externalId: m.id?._serialized ? `chrome-ext-${m.id._serialized}` : undefined,
            at: (m.t || m.timestamp) ? new Date((m.t || m.timestamp) * (String(m.t || m.timestamp).length < 13 ? 1000 : 1)).toISOString() : new Date().toISOString(),
          });
        }
      } catch {
        return { ok: false, errorCode: 'STORE_MSGS_FAIL', phone, messages: [] };
      }
      if (!phone) {
        return { ok: false, errorCode: 'STORE_NO_PHONE', phone: '', messages: msgs };
      }
      return { ok: true, phone, messages: msgs, strategyUsed: 'store_hook' };
    },
  };
})();
