const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, settings } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { name, settings } },
      { new: true }
    ).select('-password');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update settings
router.put('/settings', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { settings: req.body } },
      { new: true }
    ).select('-password');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cancel subscription — also revokes any active desktop overlay session,
// since premium access (and the Electron launch token) is gated on
// having an active paid plan. See server/routes/desktop.js.
router.post('/cancel-subscription', auth, async (req, res) => {
  try {
    const DesktopSession = require('../models/DesktopSession');

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.subscription.status = 'cancelled';
    await user.save();

    await DesktopSession.updateMany(
      { user: user._id, status: 'active' },
      { status: 'revoked', revokedAt: new Date(), revokedReason: 'subscription_cancelled' }
    );

    res.json({ message: 'Subscription cancelled. Desktop overlay access revoked immediately.', subscription: user.subscription });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
