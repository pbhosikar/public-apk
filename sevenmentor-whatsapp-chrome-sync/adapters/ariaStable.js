/* global window */
(function () {
  'use strict';

  window.SMWA_ADAPTERS = window.SMWA_ADAPTERS || {};
  window.SMWA_ADAPTERS.aria_stable = {
    id: 'aria_stable',
    extract(remoteSelectors) {
      const util = window.SMWA_PHONE;
      if (!util) {
        return { ok: false, errorCode: 'ARIA_NO_UTIL', phone: '', messages: [], chatName: '' };
      }
      const selectors = (remoteSelectors && remoteSelectors.selectors) || remoteSelectors || {};
      if (!util.hasOpenChat()) {
        return { ok: false, errorCode: 'NO_ACTIVE_CHAT', phone: '', messages: [], chatName: '', idle: true };
      }

      const chatName = util.activeChatName(selectors);
      const main = document.querySelector(selectors.activeChat || '#main');
      const messages = util.extractMessages(main, selectors, 80);
      const phone = util.phoneFromHeader(selectors) || util.phoneFromMessageNodes(main);

      if (!phone && !chatName && !messages.length) {
        return { ok: false, errorCode: 'ARIA_EMPTY', phone: '', messages: [], chatName: '' };
      }
      if (!phone && !chatName) {
        return { ok: false, errorCode: 'ARIA_NO_IDENTITY', phone: '', messages, chatName: '' };
      }
      // Phone preferred; chatName allows CRM-side name match when WA hides JID.
      return {
        ok: true,
        phone: phone || '',
        messages,
        chatName: chatName || '',
        strategyUsed: phone ? 'aria_stable' : 'aria_stable_name',
      };
    },
  };
})();
