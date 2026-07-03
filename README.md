# Shadow AI — Real-Time AI Interview Assistant

## Quick Start (Local Development)

```bash
# 1. Install all dependencies
npm run install:all

# 2. Configure environment
cp server/.env.example server/.env     # fill in your values
cp client/.env.example client/.env     # fill in your values

# 3. Start everything (3 terminals)
npm run dev:server    # Backend on :5000
npm run dev:client    # React app on :3000
npm run dev:desktop   # Electron overlay (optional)
```

---

## Deployment

### Option A — Render.com (recommended, free tier available)

**Server (Web Service):**
1. Connect your GitHub repo
2. Root directory: `server`
3. Build command: `npm install`
4. Start command: `node index.js`
5. Set env vars in the Render dashboard (copy from `server/.env.example`)

**Client (Static Site):**
1. Root directory: `client`
2. Build command: `npm install && npm run build`
3. Publish directory: `build`
4. Set `REACT_APP_API_URL` to your Render server URL + `/api`

### Option B — Vercel (full-stack via vercel.json)

```bash
npm i -g vercel
vercel --prod
```
Set env vars in the Vercel dashboard.

### Option C — Netlify (client) + Render (server)

1. Deploy server to Render (see Option A)
2. Connect client folder to Netlify
3. Update `client/netlify.toml` redirect URL to your Render server

---

## Admin Access

Users with these properties get **full app access without any subscription**:
- `user.role === 'admin'`
- `user.isAdmin === true`
- Email in the `ADMIN_EMAILS` env var

Default admin emails: `khajamoulalis@gmail.com`, `skhajamoulali8@gmail.com`

Admins automatically get elevated on first login — no manual DB changes needed.

---

## Desktop App

After a user signs in and has premium (or is admin):

```bash
cd desktop && npm install && npm start
```

The web dashboard shows a **"Launch Desktop App"** button that:
1. Mints a 75-minute scoped JWT
2. Opens `shadow-ai-desktop://launch?token=...`
3. Electron receives the token and validates it
4. Overlay appears — always on top, invisible during screen share

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | Auth token signing secret |
| `GEMINI_API_KEY` | ✅ | Google Gemini (free tier available) |
| `ADMIN_EMAILS` | ✅ | Comma-separated admin email list |
| `GOOGLE_CLIENT_ID` | ○ | For Sign in with Google |
| `RAZORPAY_KEY_ID` | ○ | For payments |
| `ANTHROPIC_API_KEY` | ○ | Enables Claude in desktop app |
| `OPENAI_API_KEY` | ○ | Enables ChatGPT in desktop app |
| `DESKTOP_TOKEN_SECRET` | ○ | Desktop token signing secret |
