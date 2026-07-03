# Shadow AI Desktop — Token Integration Guide

This document specifies exactly what your Electron app (`ai-interview-assistant`)
needs to implement to work with the web app's premium-gated, 75-minute launch
token system built in `server/routes/desktop.js`.

**I do not have access to your actual Electron app's source** — I searched this
environment and have no file named `ai-interview-assistant` available. The code
below is a reference implementation showing the exact contract the web app
expects. Adapt the integration points (marked `// ← INTEGRATE HERE`) into your
app's existing overlay/window logic.

---

## 1. Protocol handler registration (main process)

Register a custom protocol so the dashboard's "Launch Desktop App" button can
hand off the token via `shadow-ai-desktop://launch?token=...`.

```js
// main.js (Electron main process)
const { app, BrowserWindow } = require('electron');
const path = require('path');

const PROTOCOL = 'shadow-ai-desktop';

// Must be called before app is ready
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// Windows/Linux: second-instance argv carries the deep link
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (event, argv) => {
    const url = argv.find(a => a.startsWith(`${PROTOCOL}://`));
    if (url) handleDeepLink(url);          // ← INTEGRATE HERE
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });
}

// macOS: deep link arrives via 'open-url'
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);                     // ← INTEGRATE HERE
});

function handleDeepLink(url) {
  const parsed = new URL(url);
  const token = parsed.searchParams.get('token');
  if (token) startOverlaySession(token);   // see section 3
}
```

---

## 2. Token validation against the server

Before enabling the overlay, the app must confirm the token is valid by
calling `/api/desktop/status`. **Never trust the token's local JWT decode
alone** — the server can revoke a session early (manual revoke, or
subscription cancellation), so the live check matters.

```js
// desktopAuth.js
const SERVER_URL = 'http://localhost:5000'; // or your production API URL

async function checkTokenStatus(token) {
  try {
    const res = await fetch(`${SERVER_URL}/api/desktop/status`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    // data: { valid: true, email, plan, expiresAt, secondsRemaining }
    //    or { valid: false, reason: 'TOKEN_EXPIRED' | 'REVOKED' |
    //                              'SUBSCRIPTION_CANCELLED' | 'WRONG_SCOPE' |
    //                              'SESSION_NOT_FOUND' | 'TOKEN_INVALID' }
    return data;
  } catch (err) {
    // Network failure — fail CLOSED (disable overlay) rather than open
    return { valid: false, reason: 'NETWORK_ERROR' };
  }
}

module.exports = { checkTokenStatus };
```

---

## 3. Starting the 75-minute session + auto-disable

```js
// overlaySession.js
const { checkTokenStatus } = require('./desktopAuth');

let activeToken = null;
let expiryTimer = null;
let heartbeatInterval = null;

async function startOverlaySession(token) {
  const status = await checkTokenStatus(token);

  if (!status.valid) {
    showUpgradeOrErrorDialog(status.reason);   // ← INTEGRATE HERE (your UI)
    return;
  }

  activeToken = token;
  enableOverlayFeatures();                     // ← INTEGRATE HERE
  showCountdownBadge(status.secondsRemaining);  // ← INTEGRATE HERE (optional UI)

  // Hard local timer as a fallback to the heartbeat check below —
  // ensures the overlay disables exactly at expiry even if the
  // heartbeat call fails for any reason.
  clearTimeout(expiryTimer);
  expiryTimer = setTimeout(() => {
    disableOverlay('TOKEN_EXPIRED');
  }, status.secondsRemaining * 1000);

  // Heartbeat every 60s — catches early revocation (manual revoke from
  // the web dashboard, or subscription cancellation) well before the
  // 75-minute natural expiry.
  clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(async () => {
    const s = await checkTokenStatus(activeToken);
    if (!s.valid) {
      disableOverlay(s.reason);
    } else {
      updateCountdownBadge(s.secondsRemaining); // ← INTEGRATE HERE (optional UI)
    }
  }, 60_000);
}

function disableOverlay(reason) {
  activeToken = null;
  clearTimeout(expiryTimer);
  clearInterval(heartbeatInterval);

  disableOverlayFeatures();   // ← INTEGRATE HERE — hide/disable all overlay windows
  showSessionEndedDialog(reason);  // ← INTEGRATE HERE
}

module.exports = { startOverlaySession, disableOverlay };
```

---

## 4. The screen-share-invisible overlay window itself

This is the part that actually makes the app invisible during screen
sharing — it relies on **OS-level window APIs**, not anything web-based.
If your existing `ai-interview-assistant` app already has overlay windows,
just gate their creation/visibility on `activeToken !== null`:

```js
// macOS — exclude window from screen capture
overlayWindow.setContentProtection(true);

// Windows — equivalent native call (via a native addon or
// electron's setContentProtection, which wraps SetWindowDisplayAffinity)
overlayWindow.setContentProtection(true);

// Always-on-top, frameless, click-through where appropriate
overlayWindow.setAlwaysOnTop(true, 'screen-saver');
overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
```

`BrowserWindow.setContentProtection(true)` is the Electron API that maps to
macOS's `NSWindowSharingNone` and Windows' `SetWindowDisplayAffinity`
mentioned in the earlier conversation — this is the actual mechanism for
true invisibility, and it only works in a native app, which is exactly why
this token system exists to gate access to it.

---

## 5. Required environment value on the Electron side

```js
// config.js
module.exports = {
  SHADOW_AI_API_URL: process.env.SHADOW_AI_API_URL || 'http://localhost:5000',
  // No secret needed here — the desktop app only ever receives a
  // short-lived, scope-restricted token. It never sees DESKTOP_TOKEN_SECRET.
};
```

---

## Summary of the contract

| Endpoint | Caller | Purpose |
|---|---|---|
| `POST /api/desktop/launch-token` | Web dashboard (logged-in browser) | Mint a 75-min token, only if premium active |
| `GET /api/desktop/status` | Electron app | Validate token + heartbeat; returns `secondsRemaining` |
| `POST /api/desktop/revoke` | Web dashboard | User manually ends the desktop session early |
| `GET /api/desktop/my-session` | Web dashboard | Show "active, 42 min left" UI on refresh |
| `POST /api/user/cancel-subscription` | Web dashboard | Cancels plan AND auto-revokes any active desktop session |

If you can upload your actual `ai-interview-assistant` Electron source (or the
relevant main-process file), I can wire this in directly instead of leaving
the integration points as a reference guide.
