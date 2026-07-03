const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const MockInterview = require('../models/MockInterview');

// Get all mock interviews for user
router.get('/', auth, async (req, res) => {
  try {
    const mocks = await MockInterview.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20);
    res.json({ mocks });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Create mock interview
router.post('/', auth, async (req, res) => {
  try {
    const mock = await MockInterview.create({
      user: req.user._id,
      type: req.body.type || 'technical',
      difficulty: req.body.difficulty || 'mid',
      role: req.body.role || 'Software Engineer',
      company: req.body.company || '',
      language: req.body.language || 'en',
      aiModel: req.body.aiModel || 'claude-sonnet-4-6',
      title: req.body.title || `Mock — ${req.body.role || 'SWE'} — ${new Date().toLocaleDateString()}`,
    });
    res.status(201).json({ mock });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Get one mock
router.get('/:id', auth, async (req, res) => {
  try {
    const mock = await MockInterview.findOne({ _id: req.params.id, user: req.user._id });
    if (!mock) return res.status(404).json({ message: 'Not found' });
    res.json({ mock });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Add message to mock
router.post('/:id/message', auth, async (req, res) => {
  try {
    const { role, content, fillerWords, speakingPaceWPM, confidenceScore, wordCount } = req.body;
    const mock = await MockInterview.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $push: { messages: { role, content, fillerWords, speakingPaceWPM, confidenceScore, wordCount, timestamp: new Date() } } },
      { new: true }
    );
    res.json({ mock });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Complete mock and save analytics + feedback
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const { analytics, postInterviewNotes } = req.body;
    const mock = await MockInterview.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { status: 'completed', completedAt: new Date(), analytics, postInterviewNotes },
      { new: true }
    );
    res.json({ mock });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Delete mock
router.delete('/:id', auth, async (req, res) => {
  try {
    await MockInterview.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
