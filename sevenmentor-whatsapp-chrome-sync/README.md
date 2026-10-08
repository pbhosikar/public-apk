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

1. Download the ZIP above and unzip it.
2. Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → select the unzipped folder.
3. In CRM → **WhatsApp Chrome Sync**, create a pass key (shown once).
4. Extension **Options**: paste CRM API base URL + pass key.
5. Open [web.whatsapp.com](https://web.whatsapp.com), scan QR once, open a lead chat.

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
