const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const auth    = require('../middleware/auth');
const User    = require('../models/User');
const DesktopSession = require('../models/DesktopSession');
const { checkIsAdmin } = require('../middleware/adminHelper');

const DESKTOP_TOKEN_SECRET    = process.env.DESKTOP_TOKEN_SECRET || process.env.JWT_SECRET || 'shadow-ai-desktop-secret';
const DESKTOP_SESSION_MINUTES = 75;

/* ─── Helper: resolve planType safely for any user ──────────────────
   Admin users have subscription.type === 'none' — we must never pass
   'none' into the DesktopSession.planType when it means admin access.
   This function always returns a valid enum value.
─────────────────────────────────────────────────────────────────── */
function resolvePlanType(user, isAdmin) {
  if (isAdmin) return 'admin';
  const t = user?.subscription?.type;
  return ['monthly', 'yearly', 'lifetime'].includes(t) ? t : 'none';
}

/* ─── Helper: is this a regular (non-admin) premium user? ─────────── */
function isPremiumActive(user) {
  if (checkIsAdmin(user)) return true;
  const sub = user?.subscription;
  if (!sub || sub.status !== 'active') return false;
  if (sub.type === 'lifetime') return true;
  return sub.endDate && new Date(sub.endDate) > new Date();
}

/* ─── Helper: revoke all active sessions for a user ─────────────────── */
async function revokeAllActive(userId, reason) {
  await DesktopSession.updateMany(
    { user: userId, status: 'active' },
    { status: 'revoked', revokedAt: new Date(), revokedReason: reason }
  );
}

/* ─── Helper: mint token + create session record ──────────────────────
   Called by both /launch-token (premium users, with token+deeplink)
   and /admin-launch (admins, no deeplink needed, optional token).
─────────────────────────────────────────────────────────────────── */
async function createDesktopSession(user, isAdmin) {
  await revokeAllActive(user._id, 'new_session_started');

  const tokenId   = crypto.randomUUID();
  const issuedAt  = new Date();
  const expiresAt = new Date(issuedAt.getTime() + DESKTOP_SESSION_MINUTES * 60 * 1000);
  const planType  = resolvePlanType(user, isAdmin);

  const desktopToken = jwt.sign(
    {
      sub:     user._id.toString(),
      email:   user.email,
      plan:    planType,
      isAdmin: isAdmin,
      scope:   'desktop-overlay',
      jti:     tokenId,
    },
    DESKTOP_TOKEN_SECRET,
    { expiresIn: `${DESKTOP_SESSION_MINUTES}m` }
  );

  await DesktopSession.create({
    user:      user._id,
    tokenId,
    planType,
    isAdmin,
    issuedAt,
    expiresAt,
  });

  return { desktopToken, tokenId, issuedAt, expiresAt, planType };
}

/* ═══════════════════════════════════════════════════════════════════
   POST /api/desktop/admin-launch
   ── ADMIN ONLY ──
   Admins do NOT need a deep link or a custom protocol handler.
   This endpoint returns the session token + a direct URL they can
   open inside the already-running Electron app via IPC, or the
   Electron app can poll this on startup if the user is admin.
   No subscription check is performed — admin = always allowed.
═══════════════════════════════════════════════════════════════════ */
router.post('/admin-launch', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!checkIsAdmin(user)) {
      return res.status(403).json({
        message: 'This endpoint is for admin users only.',
        code: 'NOT_ADMIN',
      });
    }

    const { desktopToken, expiresAt } = await createDesktopSession(user, true);

    res.json({
      token:           desktopToken,
      expiresAt,
      durationMinutes: DESKTOP_SESSION_MINUTES,
      isAdmin:         true,
      // No deepLink needed for admins — the Electron app receives the
      // token directly from this API call (polled on startup when the
      // user is recognised as admin) rather than via protocol handler.
      message: 'Admin session created. Token valid for 75 minutes.',
    });
  } catch (e) {
    console.error('admin-launch error:', e.message);
    res.status(500).json({ message: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   POST /api/desktop/launch-token
   ── PREMIUM USERS (non-admin) ──
   Mints a 75-min token + returns a deep-link for the protocol handler.
   Admin users are ALSO accepted here (so the web dashboard Launch
   button works for everyone), but admin-launch is the preferred path.
═══════════════════════════════════════════════════════════════════ */
router.post('/launch-token', auth, async (req, res) => {
  try {
    const user    = await User.findById(req.user._id);
    if (!user)    return res.status(404).json({ message: 'User not found' });

    const isAdmin = checkIsAdmin(user);

    if (!isAdmin && !isPremiumActive(user)) {
      return res.status(403).json({
        message: 'Desktop overlay requires an active Monthly, Yearly, or Lifetime subscription.',
        code:    'PREMIUM_REQUIRED',
      });
    }

    const { desktopToken, expiresAt } = await createDesktopSession(user, isAdmin);

    res.json({
      token:           desktopToken,
      expiresAt,
      durationMinutes: DESKTOP_SESSION_MINUTES,
      isAdmin,
      deepLink: `shadow-ai-desktop://launch?token=${encodeURIComponent(desktopToken)}`,
    });
  } catch (e) {
    console.error('launch-token error:', e.message);
    res.status(500).json({ message: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /api/desktop/status
   Heartbeat endpoint called by the Electron app every 60 s.
   Admins: skip subscription re-check (they're always valid).
   Regular users: re-verify subscription is still active.
═══════════════════════════════════════════════════════════════════ */
router.get('/status', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ valid: false, reason: 'NO_TOKEN' });

    let decoded;
    try {
      decoded = jwt.verify(token, DESKTOP_TOKEN_SECRET);
    } catch (err) {
      return res.status(401).json({
        valid:  false,
        reason: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      });
    }

    if (decoded.scope !== 'desktop-overlay') {
      return res.status(401).json({ valid: false, reason: 'WRONG_SCOPE' });
    }

    const session = await DesktopSession.findOne({ tokenId: decoded.jti });
    if (!session) return res.status(401).json({ valid: false, reason: 'SESSION_NOT_FOUND' });

    if (session.status === 'revoked') {
      return res.status(401).json({
        valid: false,
        reason: session.revokedReason === 'subscription_cancelled'
          ? 'SUBSCRIPTION_CANCELLED' : 'REVOKED',
      });
    }

    if (session.expiresAt <= new Date()) {
      if (session.status !== 'expired') { session.status = 'expired'; await session.save(); }
      return res.status(401).json({ valid: false, reason: 'TOKEN_EXPIRED' });
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      session.status = 'revoked'; session.revokedAt = new Date();
      session.revokedReason = 'user_not_found'; await session.save();
      return res.status(401).json({ valid: false, reason: 'USER_NOT_FOUND' });
    }

    // Only re-check subscription for non-admin users
    if (!decoded.isAdmin && !isPremiumActive(user)) {
      session.status = 'revoked'; session.revokedAt = new Date();
      session.revokedReason = 'subscription_cancelled'; await session.save();
      return res.status(401).json({ valid: false, reason: 'SUBSCRIPTION_CANCELLED' });
    }

    session.lastSeenAt = new Date();
    await session.save();

    const secondsRemaining = Math.max(0, Math.floor((session.expiresAt - new Date()) / 1000));
    res.json({
      valid: true,
      email: user.email,
      plan:  decoded.isAdmin ? 'admin' : (user.subscription?.type || 'none'),
      isAdmin: !!decoded.isAdmin,
      expiresAt: session.expiresAt,
      secondsRemaining,
    });
  } catch (e) {
    res.status(500).json({ valid: false, reason: 'SERVER_ERROR', message: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /api/desktop/my-session  (browser dashboard polling)
═══════════════════════════════════════════════════════════════════ */
router.get('/my-session', auth, async (req, res) => {
  try {
    const session = await DesktopSession.findOne({
      user: req.user._id, status: 'active', expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!session) return res.json({ active: false });

    res.json({
      active:           true,
      expiresAt:        session.expiresAt,
      secondsRemaining: Math.max(0, Math.floor((session.expiresAt - new Date()) / 1000)),
      issuedAt:         session.issuedAt,
      lastSeenAt:       session.lastSeenAt,
      platform:         session.platform,
      isAdmin:          session.isAdmin,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   POST /api/desktop/revoke  (browser dashboard manual revoke)
═══════════════════════════════════════════════════════════════════ */
router.post('/revoke', auth, async (req, res) => {
  try {
    const result = await DesktopSession.updateMany(
      { user: req.user._id, status: 'active' },
      { status: 'revoked', revokedAt: new Date(), revokedReason: 'manual' }
    );
    res.json({ revokedCount: result.modifiedCount });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
