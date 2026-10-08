# SevenMentor CRM Sync — APK downloads

**Current release: 4.7.0 (build 84)** — full web-style admin create/edit forms + Indigo theme.

| Device | Download |
|--------|----------|
| **Redmi 9A / 9i / budget Xiaomi (32-bit Android)** | [sevenmentor-crm-sync-armv7.apk](sevenmentor-crm-sync-armv7.apk) |
| Most other phones (64-bit Android) | [sevenmentor-crm-sync.apk](sevenmentor-crm-sync.apk) |

**Direct install links:**

- **Redmi 9A:** https://github.com/pbhosikar/public-apk/raw/main/sevenmentor-crm-sync-armv7.apk
- 64-bit: https://github.com/pbhosikar/public-apk/raw/main/sevenmentor-crm-sync.apk

## 4.7.0

- Admin modules: Add / Edit / Delete forms (courses, batches, branches, departments, counsellors, enrollments, picklists, custom fields)
- Config editors: CRM Config, Policies, Appearance, Security, Lead Settings, Integrations, Mail, Allocation, Dashboard Config
- Roles & Permissions matrix toggles
- Assignment Audit read-only list

## Install tips

1. Uninstall older CRM Sync first.
2. Open link in Chrome → Allow install unknown apps.
3. Redmi: pick `MIUI/sound_recorder/call_rec` under Settings after login.

## WhatsApp Chrome Sync (browser extension)

Free TeleCRM-style chat sync — counsellors use WhatsApp Web in Chrome; this extension uploads chats to SevenMentor CRM with a pass key (no paid WhatsApp API).

| File | Link |
| --- | --- |
| **ZIP (sideload)** | [`sevenmentor-whatsapp-chrome-sync.zip`](https://github.com/pbhosikar/public-apk/raw/main/sevenmentor-whatsapp-chrome-sync.zip) |
| **Unpacked folder** | [`sevenmentor-whatsapp-chrome-sync/`](https://github.com/pbhosikar/public-apk/tree/main/sevenmentor-whatsapp-chrome-sync) |
| **Version JSON** | [`sevenmentor-whatsapp-chrome-sync-version.json`](https://github.com/pbhosikar/public-apk/raw/main/sevenmentor-whatsapp-chrome-sync-version.json) |

### Install

1. Download the ZIP and unzip it (or clone this repo and open the folder).
2. Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → select `sevenmentor-whatsapp-chrome-sync/`.
3. In CRM → **WhatsApp Chrome Sync**, create a pass key.
4. Extension Options → paste CRM API URL + pass key → open [web.whatsapp.com](https://web.whatsapp.com).

