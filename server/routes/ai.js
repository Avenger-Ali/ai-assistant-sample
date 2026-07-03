const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const DesktopSession = require('../models/DesktopSession');

const DESKTOP_TOKEN_SECRET = process.env.DESKTOP_TOKEN_SECRET || process.env.JWT_SECRET || 'shadow-ai-desktop-secret';

const { checkIsAdmin } = require('../middleware/adminHelper');

/**
 * Middleware: validates the desktop-overlay-scoped JWT exactly like
 * /api/desktop/status does, but as reusable middleware so every AI
 * proxy route is gated the same way. Attaches req.desktopUser.
 */
async function requireValidDesktopToken(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'NO_TOKEN' });

    let decoded;
    try {
      decoded = jwt.verify(token, DESKTOP_TOKEN_SECRET);
    } catch (err) {
      return res.status(401).json({ error: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID' });
    }
    if (decoded.scope !== 'desktop-overlay') return res.status(401).json({ error: 'WRONG_SCOPE' });

    const session = await DesktopSession.findOne({ tokenId: decoded.jti });
    if (!session || session.status !== 'active' || session.expiresAt <= new Date()) {
      return res.status(401).json({ error: 'SESSION_INVALID' });
    }

    const user = await User.findById(decoded.sub);
    if (!user) return res.status(401).json({ error: 'USER_NOT_FOUND' });

    req.desktopUser = user;
    req.desktopIsAdmin = !!decoded.isAdmin || checkIsAdmin(user);
    next();
  } catch (e) {
    res.status(500).json({ error: 'SERVER_ERROR', message: e.message });
  }
}

/**
 * Simple in-memory per-user-per-minute rate limiter for the free tier.
 * Resets every 60s. Good enough for a single-instance deployment;
 * swap for Redis if you scale horizontally.
 */
const rateBuckets = new Map(); // userId -> { count, windowStart }
const FREE_TIER_RPM = 15; // matches Gemini's generous free tier as the baseline

function checkRateLimit(userId, isAdmin) {
  if (isAdmin) return { allowed: true }; // admins are unmetered
  const now = Date.now();
  const bucket = rateBuckets.get(userId) || { count: 0, windowStart: now };
  if (now - bucket.windowStart > 60_000) {
    bucket.count = 0;
    bucket.windowStart = now;
  }
  bucket.count += 1;
  rateBuckets.set(userId, bucket);
  return { allowed: bucket.count <= FREE_TIER_RPM, remaining: Math.max(0, FREE_TIER_RPM - bucket.count) };
}

/* ───────────────────────────────────────────────────────────────────────
   POST /api/ai/generate
   Body: { provider: 'claude'|'openai'|'gemini', prompt, systemPrompt?, imageBase64? }
   The desktop app NEVER holds a raw API key — it only ever holds its
   75-minute desktop token. This route holds the real provider keys
   (server .env) and proxies the call, enforcing the free-tier rate limit.
─────────────────────────────────────────────────────────────────────── */
router.post('/generate', requireValidDesktopToken, async (req, res) => {
  const { provider = 'gemini', prompt, systemPrompt, imageBase64 } = req.body;

  if (!prompt && !imageBase64) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'prompt or imageBase64 required' });
  }

  const limit = checkRateLimit(req.desktopUser._id.toString(), req.desktopIsAdmin);
  if (!limit.allowed) {
    return res.status(429).json({ error: 'RATE_LIMITED', message: 'Free-tier rate limit reached. Try again shortly.' });
  }

  try {
    let text = '';

    if (provider === 'gemini') {
      const key = process.env.GEMINI_API_KEY;
      if (!key) return res.status(503).json({ error: 'PROVIDER_UNAVAILABLE', message: 'Gemini not configured on server' });

      const parts = [];
      if (systemPrompt) parts.push({ text: `[System instructions]\n${systemPrompt}\n\n` });
      if (prompt) parts.push({ text: prompt });
      if (imageBase64) parts.push({ inline_data: { mime_type: 'image/png', data: imageBase64.replace(/^data:image\/\w+;base64,/, '') } });

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }] }),
        }
      );
      const data = await resp.json();
      if (data.error) return res.status(502).json({ error: 'PROVIDER_ERROR', message: data.error.message });
      text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';

    } else if (provider === 'claude') {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return res.status(503).json({ error: 'PROVIDER_UNAVAILABLE', message: 'Claude not configured on server' });

      const content = [];
      if (imageBase64) {
        content.push({
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: imageBase64.replace(/^data:image\/\w+;base64,/, '') },
        });
      }
      content.push({ type: 'text', text: prompt || 'Describe what technical question, if any, appears in this image, and answer it.' });

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1200,
          system: systemPrompt || undefined,
          messages: [{ role: 'user', content }],
        }),
      });
      const data = await resp.json();
      if (data.error) return res.status(502).json({ error: 'PROVIDER_ERROR', message: data.error.message });
      text = data.content?.map(c => c.text).join('') || '';

    } else if (provider === 'openai') {
      const key = process.env.OPENAI_API_KEY;
      if (!key) return res.status(503).json({ error: 'PROVIDER_UNAVAILABLE', message: 'ChatGPT not configured on server' });

      const userContent = [];
      if (prompt) userContent.push({ type: 'text', text: prompt });
      if (imageBase64) userContent.push({ type: 'image_url', image_url: { url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}` } });

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 1200,
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: userContent },
          ],
        }),
      });
      const data = await resp.json();
      if (data.error) return res.status(502).json({ error: 'PROVIDER_ERROR', message: data.error.message });
      text = data.choices?.[0]?.message?.content || '';

    } else {
      return res.status(400).json({ error: 'UNKNOWN_PROVIDER', message: `Unknown provider: ${provider}` });
    }

    res.json({ text, provider, rateLimitRemaining: limit.remaining });
  } catch (e) {
    res.status(500).json({ error: 'SERVER_ERROR', message: e.message });
  }
});

/* ───────────────────────────────────────────────────────────────────────
   GET /api/ai/providers
   Lets the desktop app know which providers are actually configured
   on the server, so it can grey out unavailable options in its UI.
─────────────────────────────────────────────────────────────────────── */
router.get('/providers', requireValidDesktopToken, (_req, res) => {
  res.json({
    providers: {
      gemini: !!process.env.GEMINI_API_KEY,
      claude: !!process.env.ANTHROPIC_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
    },
  });
});

module.exports = router;
