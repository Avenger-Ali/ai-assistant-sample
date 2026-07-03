const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Enterprise = require('../models/Enterprise');
const User = require('../models/User');

// Get enterprise account for current admin
router.get('/my', auth, async (req, res) => {
  try {
    const enterprise = await Enterprise.findOne({ adminUser: req.user._id }).populate('seats.userId', 'email name lastLogin');
    if (!enterprise) return res.status(404).json({ message: 'No enterprise account found' });
    res.json({ enterprise });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Create enterprise account
router.post('/', auth, async (req, res) => {
  try {
    const { companyName, companyEmail, plan } = req.body;
    const seatMap = { seats_10: 10, seats_50: 50, seats_100: 100 };
    const existing = await Enterprise.findOne({ adminUser: req.user._id });
    if (existing) return res.status(400).json({ message: 'Enterprise account already exists' });
    const enterprise = await Enterprise.create({
      adminUser: req.user._id,
      companyName, companyEmail,
      plan: plan || 'seats_10',
      totalSeats: seatMap[plan] || 10,
      status: 'trial',
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 day trial
    });
    res.status(201).json({ enterprise });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Assign seat to user by email
router.post('/seats/assign', auth, async (req, res) => {
  try {
    const { email } = req.body;
    const enterprise = await Enterprise.findOne({ adminUser: req.user._id });
    if (!enterprise) return res.status(404).json({ message: 'No enterprise account' });
    if (enterprise.usedSeats >= enterprise.totalSeats) {
      return res.status(400).json({ message: 'All seats are in use. Upgrade your plan.' });
    }
    const alreadyAssigned = enterprise.seats.find(s => s.email === email);
    if (alreadyAssigned) return res.status(400).json({ message: 'Seat already assigned to this email' });

    const user = await User.findOne({ email });
    enterprise.seats.push({
      userId: user?._id || null,
      email,
      status: user ? 'active' : 'pending',
      assignedAt: new Date(),
    });
    enterprise.usedSeats += 1;
    await enterprise.save();
    res.json({ enterprise, message: `Seat assigned to ${email}` });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Revoke seat
router.put('/seats/:seatId/revoke', auth, async (req, res) => {
  try {
    const enterprise = await Enterprise.findOne({ adminUser: req.user._id });
    if (!enterprise) return res.status(404).json({ message: 'No enterprise account' });
    const seat = enterprise.seats.id(req.params.seatId);
    if (!seat) return res.status(404).json({ message: 'Seat not found' });
    seat.status = 'revoked';
    enterprise.usedSeats = Math.max(0, enterprise.usedSeats - 1);
    await enterprise.save();
    res.json({ enterprise, message: 'Seat revoked' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Get enterprise analytics
router.get('/analytics', auth, async (req, res) => {
  try {
    const enterprise = await Enterprise.findOne({ adminUser: req.user._id });
    if (!enterprise) return res.status(404).json({ message: 'No enterprise account' });
    res.json({
      totalSeats: enterprise.totalSeats,
      usedSeats: enterprise.usedSeats,
      availableSeats: enterprise.totalSeats - enterprise.usedSeats,
      totalSessionsAcross: enterprise.totalSessionsAcross,
      avgPlacementRate: enterprise.avgPlacementRate,
      activeMembers: enterprise.seats.filter(s => s.status === 'active').length,
      hitlEnabled: enterprise.hitlEnabled,
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Upgrade plan
router.put('/upgrade', auth, async (req, res) => {
  try {
    const { plan } = req.body;
    const seatMap = { seats_10: 10, seats_50: 50, seats_100: 100 };
    const enterprise = await Enterprise.findOneAndUpdate(
      { adminUser: req.user._id },
      { plan, totalSeats: seatMap[plan] || 10, status: 'active' },
      { new: true }
    );
    res.json({ enterprise });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
