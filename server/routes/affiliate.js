const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Affiliate = require('../models/Affiliate');

const genCode = () => 'SHD-' + Math.random().toString(36).substring(2, 8).toUpperCase();

// Get affiliate profile
router.get('/me', auth, async (req, res) => {
  try {
    const affiliate = await Affiliate.findOne({ user: req.user._id });
    if (!affiliate) return res.status(404).json({ message: 'Not an affiliate' });
    res.json({ affiliate });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Apply to become affiliate
router.post('/apply', auth, async (req, res) => {
  try {
    const existing = await Affiliate.findOne({ user: req.user._id });
    if (existing) return res.status(400).json({ message: 'Already applied', affiliate: existing });
    const affiliate = await Affiliate.create({
      user: req.user._id,
      trackingCode: genCode(),
      tier: req.body.tier || 'standard',
      isCreator: req.body.isCreator || false,
      status: 'pending',
    });
    res.status(201).json({ affiliate });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Track click (public)
router.post('/click/:code', async (req, res) => {
  try {
    await Affiliate.findOneAndUpdate(
      { trackingCode: req.params.code },
      { $inc: { totalClicks: 1 } }
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Get affiliate stats
router.get('/stats', auth, async (req, res) => {
  try {
    const affiliate = await Affiliate.findOne({ user: req.user._id });
    if (!affiliate) return res.status(404).json({ message: 'Not found' });
    res.json({
      trackingCode: affiliate.trackingCode,
      totalClicks: affiliate.totalClicks,
      totalConversions: affiliate.totalConversions,
      totalEarnings: affiliate.totalEarnings,
      pendingPayout: affiliate.pendingPayout,
      paidOut: affiliate.paidOut,
      commissionRate: affiliate.commissionRate,
      status: affiliate.status,
      tier: affiliate.tier,
      isCreator: affiliate.isCreator,
      monthlyRetainer: affiliate.monthlyRetainer,
      conversions: affiliate.conversions.slice(-10),
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Add content link (for creator program)
router.post('/content', auth, async (req, res) => {
  try {
    const { platform, url, views } = req.body;
    const affiliate = await Affiliate.findOneAndUpdate(
      { user: req.user._id },
      { $push: { contentLinks: { platform, url, views } } },
      { new: true }
    );
    res.json({ affiliate });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
