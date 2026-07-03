const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: String,
  assignedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'revoked', 'pending'], default: 'pending' },
  sessionsUsed: { type: Number, default: 0 },
  lastActive: Date,
});

const enterpriseSchema = new mongoose.Schema({
  adminUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyName: { type: String, required: true },
  companyEmail: String,
  plan: { type: String, enum: ['seats_10', 'seats_50', 'seats_100'], default: 'seats_10' },
  totalSeats: { type: Number, default: 10 },
  usedSeats: { type: Number, default: 0 },
  seats: [seatSchema],
  status: { type: String, enum: ['active', 'inactive', 'trial'], default: 'trial' },
  pricePerSeat: { type: Number, default: 29 }, // USD per seat per month
  billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  startDate: { type: Date, default: Date.now },
  endDate: Date,
  // HITL access
  hitlEnabled: { type: Boolean, default: false },
  hitlRequestsUsed: { type: Number, default: 0 },
  // Analytics
  totalSessionsAcross: { type: Number, default: 0 },
  avgPlacementRate: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Enterprise', enterpriseSchema);
