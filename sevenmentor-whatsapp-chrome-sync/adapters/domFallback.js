/* global window */
(function () {
  'use strict';

  window.SMWA_ADAPTERS = window.SMWA_ADAPTERS || {};
  window.SMWA_ADAPTERS.dom_fallback = {
    id: 'dom_fallback',
    extract(remoteSelectors) {
      const util = window.SMWA_PHONE;
      if (!util) {
        return { ok: false, errorCode: 'DOM_NO_UTIL', phone: '', messages: [], chatName: '' };
      }
      const sel = (remoteSelectors && remoteSelectors.selectors) || remoteSelectors || {};
      const main = document.querySelector(sel.activeChat || '#main');
      if (!main) {
        return { ok: false, errorCode: 'DOM_NO_MAIN', phone: '', messages: [], chatName: '', idle: true };
      }
      if (!util.hasOpenChat()) {
        return { ok: false, errorCode: 'NO_ACTIVE_CHAT', phone: '', messages: [], chatName: '', idle: true };
      }

      const chatName = util.activeChatName(sel);
      const phone = util.phoneFromHeader(sel) || util.phoneFromMessageNodes(main);
      const messages = util.extractMessages(main, sel, 80);

      if (!phone && !chatName) {
        return { ok: false, errorCode: 'DOM_NO_PHONE', phone: '', messages, chatName: '' };
      }
      if (!messages.length && !phone && !chatName) {
        return { ok: false, errorCode: 'DOM_NO_MESSAGES', phone: '', messages: [], chatName: '' };
      }
      return {
        ok: true,
        phone: phone || '',
        messages,
        chatName: chatName || '',
        strategyUsed: phone ? 'dom_fallback' : 'dom_fallback_name',
      };
    },
  };
})();
