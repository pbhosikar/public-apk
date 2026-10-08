# SevenMentor WhatsApp Sync (Chrome MV3)

Free TeleCRM-style chat sync: counsellor logs into **WhatsApp Web** in Chrome; this extension uploads open chats to SevenMentor CRM with a CRM-issued **pass key**. No WATI / Meta Cloud API purchase.

## Public download (everyone)

Hosted on the same public repo as CRM Sync APKs:

| | Link |
| --- | --- |
| **ZIP** | https://github.com/pbhosikar/public-apk/raw/main/sevenmentor-whatsapp-chrome-sync.zip |
| **Folder** | https://github.com/pbhosikar/public-apk/tree/main/sevenmentor-whatsapp-chrome-sync |
| **Repo** | https://github.com/pbhosikar/public-apk |

## Install (sideload)

Chrome **cannot** load a `.zip` file. Unzip first, then load the folder.

1. Download the ZIP above and **unzip** it (double-click on Mac). You get a folder `sevenmentor-whatsapp-chrome-sync` with `manifest.json` inside.
2. Chrome → `chrome://extensions` → Developer mode → **Load unpacked**.
3. Select that **folder** — not the `.zip`.
4. In CRM → **WhatsApp Chrome Sync**, create a pass key (shown once).
5. Extension **Options**: paste CRM API base URL + pass key.
6. Open [web.whatsapp.com](https://web.whatsapp.com), scan QR once, open a lead chat.

## Resilience

- Multi-strategy extractors (`store_hook` → `aria_stable` → `dom_fallback`)
- Remote adapter config: `GET /api/v1/public/whatsapp-ext/adapter-config`
- Heartbeat + health telemetry (`extractOk`, `strategyUsed`, `errorCode`)
- On extract failure, popup prompts **phone APK sync** as fallback

## Package ZIP (maintainers)

```bash
cd crm-whatsapp-extension && zip -r ../crm-whatsapp-extension.zip . -x '*.DS_Store' -x '.git/*'
# then copy into pbhosikar/public-apk as sevenmentor-whatsapp-chrome-sync.zip
```
