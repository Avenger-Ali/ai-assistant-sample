const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  isQuestion: { type: Boolean, default: false },
  isAnswer: { type: Boolean, default: false },
});

const sessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'Interview Session' },
  type: { type: String, enum: ['coding', 'non-coding', 'phone'], default: 'non-coding' },
  language: { type: String, default: 'en' },
  aiModel: { type: String, default: 'gpt-4' },
  platform: { type: String, default: 'zoom' },

  status: { type: String, enum: ['active', 'paused', 'ended'], default: 'active' },

  messages: [messageSchema],
  transcript: { type: String, default: '' },

  // Notes generated after session
  aiNotes: {
    keyPoints: [String],
    actionItems: [String],
    summary: String,
    generatedAt: Date,
  },

  // Extra context provided by user
  extraContext: { type: String, default: '' },

  // Coding related
  codeQuestion: { type: String },
  codeSolution: { type: String },

  // Timing
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  durationMinutes: { type: Number, default: 0 },
  creditsUsed: { type: Number, default: 0 },

}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
