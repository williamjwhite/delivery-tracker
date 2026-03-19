# 🚗 RouteLog — Delivery Driver Tracker

A mobile-first PWA for tracking delivery shifts: online time, mileage, and tips. Designed for iOS Safari and Android Chrome. Host for free on GitHub Pages.

---

## ✨ Features

- **Clock In/Out** — One tap to start/end a shift with live elapsed timer
- **Mileage Tracking** — Log start & end odometer per shift
- **Tip Logging** — Add tips during a shift with optional notes; running total shown live
- **Base Pay** — Record your platform's base pay when ending a shift
- **History** — Browse all past shifts with earnings, time, and mileage summaries
- **Cloud Sync** — Sync to Google Drive or any REST endpoint (iCloud-compatible)
- **Dark Mode** — Follows your preference, persisted across sessions
- **PWA** — Add to Home Screen on iOS/Android for a native app feel
- **Export** — Download all your data as JSON at any time

---

## 🚀 Deploying to GitHub Pages

1. **Fork or clone** this repo.
2. Go to **Settings → Pages** in your GitHub repo.
3. Set source to **Deploy from branch**, branch `main`, folder `/ (root)`.
4. Your app will be live at `https://yourusername.github.io/your-repo-name/`

> ⚠️ **HTTPS is required** for Google OAuth and for adding to Home Screen (PWA). GitHub Pages provides this automatically.

---

## ☁️ Cloud Sync Setup

### Google Drive

Google Drive stores your data in a hidden `appDataFolder` — invisible to the user in Drive, only accessible by this app.

**Steps:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (e.g. "RouteLog")
3. Enable the **Google Drive API**
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add your GitHub Pages URL as an **Authorized redirect URI**:
   `https://yourusername.github.io/your-repo-name/index.html`
7. Copy the **Client ID** and paste it in RouteLog → Settings → Google Drive
8. Tap **Connect Google Drive** — you'll be redirected to Google to authorize, then back to the app with your token stored.

> Tokens expire after ~1 hour. Tap "Re-authenticate" to refresh.

---

### Apple / Custom Endpoint (iCloud)

This mode sends a `PUT` request to save and a `GET` request to load your data from any HTTPS endpoint you control.

**CloudKit JS Web Services example:**
- Create a CloudKit container in [CloudKit Dashboard](https://icloud.developer.apple.com)
- Use the CloudKit JS REST API as your endpoint
- Set your CloudKit API token as the Bearer token in Settings

**Simple self-hosted example (Node.js):**
```js
// server.js — minimal JSON store endpoint
const express = require('express');
const app = express();
app.use(express.json());
let store = {};
app.get('/routelog',  (req, res) => res.json(store));
app.put('/routelog',  (req, res) => { store = req.body; res.json({ ok: true }); });
app.listen(3000);
```
Then set your endpoint to `https://your-server.com/routelog` in Settings.

---

## 📱 Add to Home Screen

### iOS Safari
1. Open the app URL in Safari
2. Tap the **Share** button (box with arrow)
3. Tap **Add to Home Screen**
4. Name it "RouteLog" and tap **Add**

### Android Chrome
1. Open the app URL in Chrome
2. Tap the **⋮ menu** → **Add to Home Screen** (or look for the install banner)

---

## 🗂 Project Structure

```
delivery-tracker/
├── index.html          # App shell & modals
├── manifest.json       # PWA manifest
├── css/
│   ├── app.css         # All styles + design tokens
│   └── index.css       # Original token file (reference)
├── js/
│   ├── storage.js      # localStorage data layer
│   ├── cloud.js        # Google Drive & custom endpoint sync
│   ├── shift.js        # Active shift state & timer
│   ├── app.js          # Router, modals, toasts, init
│   └── views/
│       ├── dashboard.js  # Main shift view
│       ├── history.js    # Past shifts list
│       └── settings.js   # Preferences & cloud config
└── icons/              # PWA icons (add your own 192×192 and 512×512 PNGs)
```

---

## 🔒 Privacy

All your shift data lives in your browser's `localStorage`. It never leaves your device unless you explicitly configure and use cloud sync. No analytics, no ads, no tracking.

---

## 📄 License

MIT — use it, modify it, make it yours.
