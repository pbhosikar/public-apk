# SevenMentor WhatsApp Sync (Chrome MV3)

Free TeleCRM-style chat sync: counsellor logs into **WhatsApp Web** in Chrome; this extension uploads open chats to SevenMentor CRM with a CRM-issued **pass key**. No WATI / Meta Cloud API purchase.

## Install (sideload)

1. In CRM → **WhatsApp Chrome Sync**, create a pass key (shown once).
2. Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → select this folder.
3. Open the extension **Options**: paste CRM API base URL + pass key.
4. Open [web.whatsapp.com](https://web.whatsapp.com), scan QR once, open a lead chat.

## Resilience

- Multi-strategy extractors (`store_hook` → `aria_stable` → `dom_fallback`)
- Remote adapter config: `GET /api/v1/public/whatsapp-ext/adapter-config`
- Heartbeat + health telemetry (`extractOk`, `strategyUsed`, `errorCode`)
- On extract failure, popup prompts **phone APK sync** as fallback

## Package ZIP

```bash
cd crm-whatsapp-extension && zip -r ../crm-whatsapp-extension.zip . -x '*.DS_Store' -x '.git/*'
```
