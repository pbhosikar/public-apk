/* global window, indexedDB */
(function () {
  'use strict';

  function openModelStorage() {
    return new Promise((resolve, reject) => {
      let req;
      try {
        // Do not pin a version — WA bumps model-storage often.
        req = indexedDB.open('model-storage');
      } catch (err) {
        reject(err);
        return;
      }
      req.onerror = () => reject(req.error || new Error('idb_open_fail'));
      req.onsuccess = () => resolve(req.result);
      // Ignore upgrade — we only read.
      req.onupgradeneeded = () => {};
    });
  }

  function storeGetAll(db, storeName, limit = 5000) {
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(storeName)) {
          resolve([]);
          return;
        }
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll(undefined, limit);
        req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
        req.onerror = () => reject(req.error || new Error('idb_getAll_fail'));
      } catch (err) {
        reject(err);
      }
    });
  }

  function phoneFromId(id) {
    const util = window.SMWA_PHONE;
    if (!util) return '';
    return util.digitsFromText(id);
  }

  function normName(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function namesMatch(a, b) {
    const na = normName(a);
    const nb = normName(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    // WA sometimes shows pushname vs saved name.
    if (na.length >= 3 && nb.length >= 3 && (na.includes(nb) || nb.includes(na))) return true;
    return false;
  }

  function pickPhoneFromRecord(rec) {
    if (!rec || typeof rec !== 'object') return '';
    const idCandidates = [
      rec.id,
      rec.id?._serialized,
      rec.id?.user,
      rec.contact?.id,
      rec.contact?.id?._serialized,
      rec.__x_id,
      rec.__x_id?._serialized,
    ];
    for (const c of idCandidates) {
      const p = phoneFromId(c);
      if (p) return p;
    }
    // Some stores keep phone in dedicated fields.
    for (const key of ['phoneNumber', 'phone', 'number', 'userid']) {
      const p = phoneFromId(rec[key]);
      if (p) return p;
    }
    return '';
  }

  function recordName(rec) {
    if (!rec || typeof rec !== 'object') return '';
    return (
      rec.name
      || rec.pushname
      || rec.pushName
      || rec.shortName
      || rec.formattedTitle
      || rec.verifiedName
      || rec.notify
      || rec.__x_name
      || rec.__x_formattedTitle
      || rec.contact?.name
      || rec.contact?.pushname
      || ''
    );
  }

  /**
   * Resolve phone for the active chat via WhatsApp Web IndexedDB (model-storage).
   * DOM no longer exposes @c.us for named contacts — IDB chat/contact still often does.
   */
  async function resolvePhoneFromIdb(chatName) {
    if (!chatName) return { phone: '', errorCode: 'IDB_NO_NAME' };
    let db;
    try {
      db = await openModelStorage();
    } catch {
      return { phone: '', errorCode: 'IDB_UNAVAILABLE' };
    }

    try {
      const stores = ['chat', 'contact', 'contact-model'];
      for (const storeName of stores) {
        let rows = [];
        try {
          rows = await storeGetAll(db, storeName, 8000);
        } catch {
          continue;
        }
        for (const rec of rows) {
          if (!namesMatch(recordName(rec), chatName)) continue;
          const phone = pickPhoneFromRecord(rec);
          if (phone) {
            return { phone, errorCode: '', store: storeName };
          }
        }
      }
      return { phone: '', errorCode: 'IDB_NO_PHONE' };
    } finally {
      try {
        db.close();
      } catch {
        /* ignore */
      }
    }
  }

  window.SMWA_ADAPTERS = window.SMWA_ADAPTERS || {};
  window.SMWA_ADAPTERS.idb_lookup = {
    id: 'idb_lookup',
    async: true,
    async extractAsync(remoteSelectors) {
      const util = window.SMWA_PHONE;
      if (!util) {
        return { ok: false, errorCode: 'IDB_NO_UTIL', phone: '', messages: [], chatName: '' };
      }
      const selectors = (remoteSelectors && remoteSelectors.selectors) || remoteSelectors || {};
      if (!util.hasOpenChat()) {
        return { ok: false, errorCode: 'NO_ACTIVE_CHAT', phone: '', messages: [], chatName: '', idle: true };
      }
      const chatName = util.activeChatName(selectors);
      const main = document.querySelector(selectors.activeChat || '#main') || document.querySelector('#main');
      const messages = util.extractMessages(main, selectors, 80);
      let phone = util.phoneFromHeader(selectors) || util.phoneFromMessageNodes(main);

      if (!phone && chatName) {
        const resolved = await resolvePhoneFromIdb(chatName);
        if (resolved.phone) phone = resolved.phone;
        else if (!messages.length) {
          return {
            ok: false,
            errorCode: resolved.errorCode || 'IDB_NO_PHONE',
            phone: '',
            messages: [],
            chatName,
          };
        }
      }

      // Identity: phone preferred; chatName alone is OK for CRM name match.
      if (!phone && !chatName) {
        return { ok: false, errorCode: 'IDB_NO_IDENTITY', phone: '', messages, chatName: '' };
      }
      if (!messages.length && !phone) {
        // Open chat with name only — still useful so CRM can heartbeat identity.
        return {
          ok: Boolean(chatName),
          errorCode: chatName ? '' : 'IDB_EMPTY',
          phone: '',
          messages: [],
          chatName,
          strategyUsed: 'idb_lookup',
        };
      }
      return {
        ok: true,
        phone: phone || '',
        messages,
        chatName: chatName || '',
        strategyUsed: phone ? 'idb_lookup' : 'idb_lookup_name',
      };
    },
  };
})();
