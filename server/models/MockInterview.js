const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  category: String, // 'technical', 'behavioral', 'communication'
  score: Number,    // 0-100
  comment: String,
  suggestions: [String],
});

const mockMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['interviewer', 'candidate', 'system'] },
  content: String,
  audioUrl: String,
  timestamp: { type: Date, default: Date.now },
  fillerWords: [String],      // detected: "um", "like", "you know"
  wordCount: Number,
  speakingPaceWPM: Number,    // words per minute
  confidenceScore: Number,    // 0-100 estimated
});

const mockInterviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: String,
  type: { type: String, enum: ['technical', 'behavioral', 'system-design', 'coding', 'mixed'], default: 'technical' },
  difficulty: { type: String, enum: ['junior', 'mid', 'senior', 'staff', 'principal'], default: 'mid' },
  role: String,              // "Senior Backend Engineer"
  company: String,           // "Google", "Meta" etc.
  language: { type: String, default: 'en' },
  aiModel: { type: String, default: 'claude-sonnet-4-6' },
  status: { type: String, enum: ['active', 'completed', 'abandoned'], default: 'active' },
  messages: [mockMessageSchema],
  // Coaching analytics
  analytics: {
    totalDurationSeconds: Number,
    avgPaceWPM: Number,           // target 130-160 WPM
    fillerWordCount: Number,
    fillerWordRate: Number,       // per minute
    topFillerWords: [String],
    confidenceAvg: Number,
    technicalAccuracy: Number,    // 0-100
    communicationScore: Number,   // 0-100
    structureScore: Number,       // STAR method usage
    overallScore: Number,
  },
  // Post-interview feedback
  postInterviewNotes: {
    summary: String,
    strengths: [String],
    weaknesses: [String],
    correctiveFeedback: [String],
    pacingAssessment: String,
    technicalFeedback: [feedbackSchema],
    recommendedResources: [String],
    generatedAt: Date,
  },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('MockInterview', mockInterviewSchema);
