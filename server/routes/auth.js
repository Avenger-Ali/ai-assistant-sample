const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const auth    = require('../middleware/auth');
const { checkIsAdmin, ADMIN_EMAILS } = require('../middleware/adminHelper');

const JWT_SECRET = process.env.JWT_SECRET || 'shadow-ai-secret-2024';
const genToken   = id => jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });

function userPayload(u) {
  return {
    id:           u._id,
    email:        u.email,
    name:         u.name,
    avatar:       u.avatar,
    credits:      u.credits,
    subscription: u.subscription,
    settings:     u.settings,
    referralCode: u.referralCode,
    resume:       u.resume,
    role:         u.role,
    isAdmin:      u.isAdmin || u.role === 'admin',
    freeTrialUsed:u.freeTrialUsed,
    totalInterviews: u.totalInterviews,
  };
}

// Auto-elevate whitelisted emails to admin on every login/register
async function maybeElevateAdmin(user) {
  const shouldBeAdmin = checkIsAdmin(user);
  if (shouldBeAdmin && (!user.isAdmin || user.role !== 'admin')) {
    user.isAdmin = true;
    user.role    = 'admin';
    await user.save();
  }
  return user;
}

/* ── POST /api/auth/register ─────────────────────────────────────────
   Handles both:
   a) Normal email/password registration
   b) Google OAuth find-or-create (provider:'google')
   Proper duplicate-key handling: returns the existing user if same email
   is used with Google provider, 409 otherwise.
─────────────────────────────────────────────────────────────────── */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, referralCode, provider } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const emailLower = email.toLowerCase().trim();

    let user = await User.findOne({ email: emailLower });

    // ── Existing user ─────────────────────────────────────────────────
    if (user) {
      // Google OAuth: existing user logging in via Google → just sign them in
      if (provider === 'google') {
        if (user.provider !== 'google') {
          user.provider = 'google'; // upgrade to google provider if needed
          await user.save().catch(() => {}); // best-effort
        }
        user = await maybeElevateAdmin(await User.findById(user._id));
        const token = genToken(user._id);
        return res.json({ token, user: userPayload(user) });
      }
      // Email already registered — send a clear 409 (not a 500)
      return res.status(409).json({ message: 'Email already registered. Please sign in instead.' });
    }

    // ── New user ──────────────────────────────────────────────────────
    let credits = 10; // free tier
    if (referralCode) {
      const referrer = await User.findOne({ referralCode: referralCode.toUpperCase().trim() });
      if (referrer) {
        credits = 12; // +2 for using a valid referral code
        referrer.referralEarnings += 2;
        referrer.referralCount    = (referrer.referralCount || 0) + 1;
        await referrer.save().catch(console.error);
      }
    }

    const shouldBeAdmin = ADMIN_EMAILS.includes(emailLower);

    user = new User({
      email:    emailLower,
      password: provider === 'google' ? undefined : password,
      name:     name || '',
      provider: provider || 'local',
      credits,
      isAdmin:  shouldBeAdmin,
      role:     shouldBeAdmin ? 'admin' : 'user',
    });

    try {
      await user.save();
    } catch (saveErr) {
      // Handle the rare race-condition duplicate key at DB level
      if (saveErr.code === 11000) {
        // Another process created the same email/referralCode simultaneously
        const field = Object.keys(saveErr.keyValue || {})[0];
        if (field === 'email') {
          return res.status(409).json({ message: 'Email already registered. Please sign in instead.' });
        }
        // referralCode collision (extremely rare) — retry with new code
        user.referralCode = undefined;
        await user.save(); // pre-save hook will generate a new one
      } else {
        throw saveErr;
      }
    }

    const token = genToken(user._id);
    res.status(201).json({ token, user: userPayload(user) });
  } catch (e) {
    console.error('Register error:', e.message);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

/* ── POST /api/auth/login ────────────────────────────────────────────
   Email/password login. Google users are handled in /register.
─────────────────────────────────────────────────────────────────── */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ message: 'No account found with this email. Please sign up.' });

    // Google-only users don't have a password
    if (user.provider === 'google' && !user.password) {
      return res.status(401).json({ message: 'This account uses Google Sign-In. Please click "Sign in with Google".' });
    }

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Incorrect password.' });

    const elevated = await maybeElevateAdmin(user);
    elevated.lastLogin = new Date();
    await elevated.save().catch(console.error);

    const token = genToken(elevated._id);
    res.json({ token, user: userPayload(elevated) });
  } catch (e) {
    console.error('Login error:', e.message);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

/* ── GET /api/auth/me ────────────────────────────────────────────────
   Returns the current user's full profile including isAdmin.
   Used by both web app and Electron's session recheck.
─────────────────────────────────────────────────────────────────── */
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Ensure isAdmin is always consistent with email list
    const elevated = await maybeElevateAdmin(user);
    res.json({ user: userPayload(elevated) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── POST /api/auth/magic-link ───────────────────────────────────────
   Passwordless login for convenience (for demo / dev).
─────────────────────────────────────────────────────────────────── */
router.post('/magic-link', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = new User({ email: email.toLowerCase(), credits: 10 });
      await user.save();
    }
    const elevated = await maybeElevateAdmin(user);
    const token = genToken(elevated._id);
    res.json({ message: 'Login link generated', token });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
