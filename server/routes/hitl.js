const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const HITLRequest = require('../models/HITLRequest');
const User = require('../models/User');

// Request HITL support
router.post('/request', auth, async (req, res) => {
  try {
    const { sessionId, role, company, context, tier } = req.body;
    const user = await User.findById(req.user._id);

    // Check subscription allows HITL
    if (user.subscription.type === 'none') {
      return res.status(403).json({ message: 'HITL requires Elite tier subscription or per-session purchase' });
    }

    const hitl = await HITLRequest.create({
      user: req.user._id,
      session: sessionId,
      role, company, context,
      tier: tier || 'standard',
      status: 'queued',
      priceUSD: tier === 'principal' ? 1000 : 500,
      requestedAt: new Date(),
    });

    // Simulate expert connection within 15 seconds (production: real socket routing)
    setTimeout(async () => {
      try {
        const connectedAt = new Date();
        const connectionTimeMs = connectedAt - hitl.requestedAt;
        await HITLRequest.findByIdAndUpdate(hitl._id, {
          status: 'active',
          connectedAt,
          connectionTimeMs,
          expertName: 'Alex Chen (L6 Engineer, ex-Google)',
        });
      } catch (_) {}
    }, 8000);

    res.status(201).json({ hitl, message: 'Expert being connected. SLA: 15 seconds.' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Get HITL status
router.get('/:id', auth, async (req, res) => {
  try {
    const hitl = await HITLRequest.findOne({ _id: req.params.id, user: req.user._id });
    if (!hitl) return res.status(404).json({ message: 'Not found' });
    res.json({ hitl });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Send message to expert
router.post('/:id/message', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const hitl = await HITLRequest.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $push: { expertMessages: { from: 'candidate', message, timestamp: new Date() } } },
      { new: true }
    );
    res.json({ hitl });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// End HITL session
router.put('/:id/end', auth, async (req, res) => {
  try {
    const hitl = await HITLRequest.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { status: 'completed', completedAt: new Date(), rating: req.body.rating, feedback: req.body.feedback },
      { new: true }
    );
    res.json({ hitl });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Get all HITL requests for user
router.get('/', auth, async (req, res) => {
  try {
    const requests = await HITLRequest.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ requests });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
