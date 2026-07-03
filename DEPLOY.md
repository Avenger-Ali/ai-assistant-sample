# Shadow AI — Complete Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUD (deployable)                           │
│                                                                 │
│  ┌──────────────────┐      ┌──────────────────────────────────┐│
│  │  SERVER (API)    │      │  CLIENT (React SPA)              ││
│  │  Node/Express    │◄─────│  Vercel / Netlify / Render       ││
│  │  Vercel / Render │      │  Calls /api/* on server          ││
│  │  + MongoDB Atlas │      └──────────────────────────────────┘│
│  └──────────────────┘                                          │
└─────────────────────────────────────────────────────────────────┘
                              │ issues 75-min desktop token
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  USER'S MACHINE (not deployable)                │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  DESKTOP APP (Electron binary)                             │ │
│  │  • Downloaded & installed by user                          │ │
│  │  • Distributed via GitHub Releases / your CDN             │ │
│  │  • NEVER deployed to a cloud server                        │ │
│  │  • Runs as a native overlay on user's OS                   │ │
│  │  • Always-on-top, screen-share invisible                   │ │
│  │  • Calls /api/* on the deployed server                     │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

> **Key point:** The Electron desktop app is a native binary distributed to
> users as a .dmg (mac) / .exe (win) / .AppImage (linux) installer.
> It cannot and should not be deployed to Vercel/Netlify/Render —
> those are server environments, not user desktops.

---

## Option 1 — Vercel (Recommended for Full-Stack)

### Deploy Server to Vercel

```bash
cd server
npm i -g vercel
vercel login
vercel --prod
```

Set these environment variables in Vercel dashboard → Settings → Environment Variables:
```
MONGODB_URI          = mongodb+srv://...
JWT_SECRET           = your-secret
GEMINI_API_KEY       = AIza...
RAZORPAY_KEY_ID      = rzp_test_...
RAZORPAY_KEY_SECRET  = ...
DESKTOP_TOKEN_SECRET = your-desktop-secret
ADMIN_EMAILS         = khajamoulalis@gmail.com,skhajamoulali8@gmail.com
GOOGLE_CLIENT_ID     = ...
GOOGLE_CLIENT_SECRET = ...
NODE_ENV             = production
```

Your server URL will be: `https://shadow-ai-server.vercel.app`

### Deploy Client to Vercel

1. Edit `client/vercel.json` — replace the API rewrite URL with your actual server URL:
   ```json
   "dest": "https://YOUR-SERVER-URL.vercel.app/api/$1"
   ```

2. Edit `client/.env` (or set in Vercel dashboard):
   ```
   REACT_APP_API_URL=https://YOUR-SERVER-URL.vercel.app/api
   REACT_APP_GOOGLE_CLIENT_ID=303034635408-48nb7n71uag1v6b84mkgqissnikbv6gb.apps.googleusercontent.com
   REACT_APP_RAZORPAY_KEY_ID=rzp_test_T55HW6sIjDWkk7
   ```

3. Deploy:
   ```bash
   cd client
   vercel --prod
   ```

Your client URL will be: `https://shadow-ai-client.vercel.app`

---

## Option 2 — Render.com

### Server: Create Web Service
- Root directory: `server`
- Build command: `npm install`
- Start command: `node index.js`
- Add all env vars from the list above

### Client: Create Static Site
- Root directory: `client`
- Build command: `REACT_APP_API_URL=https://YOUR-SERVER.onrender.com/api npm run build`
- Publish directory: `build`
- Add Redirect Rule: `/* → /index.html (200)`

---

## Option 3 — Netlify (Client) + Render (Server)

**Server:** Deploy to Render as above.

**Client:**
1. Update `client/netlify.toml` — set the redirect to your Render server URL
2. Connect GitHub repo to Netlify
3. Base directory: `client`
4. Build command: `npm run build`
5. Publish directory: `build`

---

## Desktop App Distribution (for end-users)

The Electron app is built locally and distributed as a downloadable installer.

### Build installers locally:
```bash
cd desktop
npm install

# macOS (requires macOS machine)
npm run build:mac    # outputs dist/Shadow AI-1.0.0.dmg

# Windows (requires Windows machine or wine)
npm run build:win    # outputs dist/Shadow AI Setup 1.0.0.exe

# Linux
npm run build:linux  # outputs dist/Shadow AI-1.0.0.AppImage
```

### Distribute via GitHub Releases:
1. Push code to GitHub
2. Create a Release: `git tag v1.0.0 && git push --tags`
3. Set `GH_TOKEN` env var to your GitHub personal access token
4. Run `npm run release` — this builds AND uploads to GitHub Releases automatically

### How users get the desktop app:
1. Go to your GitHub repo → Releases
2. Download the installer for their OS
3. Install it (runs as a normal desktop app)
4. Sign in on your web app (`shadow-ai-client.vercel.app`)
5. Click **"Launch Desktop App"** on the dashboard
6. The web app mints a 75-minute token and opens the deep link
7. Electron app receives the token and unlocks

### Admin users (no deep-link needed):
Admins (`khajamoulalis@gmail.com`, `skhajamoulali8@gmail.com`) click
**"Launch (Admin)"** and get a session immediately — no protocol handler,
no deep-link, no subscription check. The Electron app also auto-detects
admin users on startup via the `/api/desktop/admin-launch` endpoint.

---

## Update the Desktop App's Server URL

When deployed, the Electron app needs to know your server URL.
Edit `desktop/src/main/main.js`:
```js
const SERVER_URL = process.env.SHADOW_AI_API_URL
  || store.get('serverUrl')
  || 'https://YOUR-SERVER-URL.vercel.app';   // ← change this default
```

Or users can set it via the app's settings. For a zero-config experience,
bake your production URL as the default before building the installer.

---

## Quick Checklist

- [ ] MongoDB Atlas cluster created, IP 0.0.0.0/0 allowed
- [ ] Server deployed to Vercel/Render with all env vars set
- [ ] Client deployed with `REACT_APP_API_URL` pointing to server
- [ ] Google OAuth: added production domain to Authorized Origins
- [ ] Razorpay: updated webhook URL to production server
- [ ] Desktop app: `SERVER_URL` default updated to production
- [ ] Desktop installer built and uploaded to GitHub Releases
