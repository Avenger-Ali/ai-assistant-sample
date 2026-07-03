const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get credit balance
router.get('/balance', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('credits subscription');
    res.json({
      credits: user.credits,
      subscription: user.subscription,
      hasUnlimited: user.subscription.status === 'active',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Use credits (deduct 0.5 per 30 min session)
router.post('/use', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.subscription.status === 'active') {
      return res.json({ success: true, message: 'Unlimited subscription' });
    }
    if (user.credits < 0.5) {
      return res.status(403).json({ message: 'Insufficient credits' });
    }
    user.credits -= 0.5;
    await user.save();
    res.json({ success: true, credits: user.credits });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
