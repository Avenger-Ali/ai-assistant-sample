const mongoose = require('mongoose');

const conversionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  plan: String,
  amount: Number,
  commission: Number,
  currency: String,
  date: { type: Date, default: Date.now },
  paid: { type: Boolean, default: false },
});

const affiliateSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  trackingCode: { type: String, unique: true },
  status: { type: String, enum: ['pending', 'active', 'suspended'], default: 'pending' },
  tier: { type: String, enum: ['standard', 'influencer', 'creator'], default: 'standard' },
  commissionRate: { type: Number, default: 30 }, // 30% lifetime recurring
  totalClicks: { type: Number, default: 0 },
  totalConversions: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  pendingPayout: { type: Number, default: 0 },
  paidOut: { type: Number, default: 0 },
  conversions: [conversionSchema],
  payoutMethod: { type: String, enum: ['bank', 'paypal', 'upi', 'crypto'] },
  payoutDetails: { type: mongoose.Schema.Types.Mixed },
  // Creator program
  isCreator: { type: Boolean, default: false },
  monthlyRetainer: { type: Number, default: 0 }, // $600 - $4000
  contentLinks: [{ platform: String, url: String, views: Number }],
}, { timestamps: true });

module.exports = mongoose.model('Affiliate', affiliateSchema);
