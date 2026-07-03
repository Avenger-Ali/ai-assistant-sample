const mongoose = require('mongoose');

const hitlSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  status: {
    type: String,
    enum: ['queued', 'connecting', 'active', 'completed', 'cancelled', 'timeout'],
    default: 'queued'
  },
  expertId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expertName: String,
  tier: { type: String, enum: ['standard', 'senior', 'principal'], default: 'standard' },
  role: String,        // what role they're interviewing for
  company: String,
  context: String,     // extra context for the expert
  transcript: String,  // mirror of session transcript
  // Timing SLA: must connect within 15 seconds
  requestedAt: { type: Date, default: Date.now },
  connectedAt: Date,
  completedAt: Date,
  connectionTimeMs: Number,
  // Pricing
  priceUSD: { type: Number, default: 500 },
  paid: { type: Boolean, default: false },
  // Messages between candidate and human expert (hidden channel)
  expertMessages: [{
    from: { type: String, enum: ['expert', 'candidate'] },
    message: String,
    timestamp: { type: Date, default: Date.now },
  }],
  rating: Number,        // 1-5 after session
  feedback: String,
}, { timestamps: true });

module.exports = mongoose.model('HITLRequest', hitlSchema);
