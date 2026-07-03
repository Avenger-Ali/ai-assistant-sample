const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Session = require('../models/Session');
const User = require('../models/User');

// Get all sessions for user
router.get('/', auth, async (req, res) => {
  try {
    const sessions = await Session.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new session
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Check credits
    if (user.credits <= 0 && user.subscription.type === 'none') {
      return res.status(403).json({ message: 'Insufficient credits. Please purchase more or subscribe.' });
    }

    const session = await Session.create({
      user: req.user._id,
      type: req.body.type || 'non-coding',
      language: req.body.language || user.settings.language,
      aiModel: req.body.aiModel || user.settings.aiModel,
      platform: req.body.platform || 'zoom',
      extraContext: req.body.extraContext || '',
      title: req.body.title || `Session ${new Date().toLocaleDateString()}`,
    });

    // Deduct 0.5 credits for subscription-less users
    if (user.subscription.type === 'none') {
      user.credits -= 0.5;
      await user.save();
    }

    res.status(201).json({ session });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get specific session
router.get('/:id', auth, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json({ session });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add message to session
router.post('/:id/messages', auth, async (req, res) => {
  try {
    const { role, content, isQuestion, isAnswer } = req.body;
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $push: { messages: { role, content, isQuestion, isAnswer, timestamp: new Date() } } },
      { new: true }
    );
    res.json({ session });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// End session and generate notes
router.put('/:id/end', auth, async (req, res) => {
  try {
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      {
        status: 'ended',
        endedAt: new Date(),
        aiNotes: req.body.aiNotes || {},
      },
      { new: true }
    );
    res.json({ session });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete session
router.delete('/:id', auth, async (req, res) => {
  try {
    await Session.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ message: 'Session deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
