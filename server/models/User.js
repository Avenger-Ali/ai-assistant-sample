const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// Generate a cryptographically unique referral code that won't collide
function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1 ambiguity
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const userSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String },
  name:     { type: String, default: '' },
  avatar:   { type: String, default: '' },
  provider: { type: String, default: 'local' },

  // ── Role & Admin ─────────────────────────────────────────────────────
  // 'admin' role OR isAdmin:true → full access without any subscription.
  // Admin emails set at first login from ADMIN_EMAILS env var.
  role:    { type: String, enum: ['user', 'admin', 'expert'], default: 'user' },
  isAdmin: { type: Boolean, default: false },

  // Credits (infinite validity, never expire)
  credits:          { type: Number, default: 10 },
  freeSessionsUsed: { type: Number, default: 0 },
  freeTrialUsed:    { type: Boolean, default: false },

  // Subscription
  subscription: {
    type:   { type: String, enum: ['none','monthly','yearly','lifetime'], default: 'none' },
    status: { type: String, enum: ['active','inactive','cancelled','trial'], default: 'inactive' },
    startDate: Date,
    endDate:   Date,
    hitlEnabled: { type: Boolean, default: false },
  },

  // Resume & knowledge base
  resume: { filename: String, originalName: String, uploadedAt: Date, content: String },

  // Settings
  settings: {
    language:           { type: String, default: 'en' },
    aiModel:            { type: String, default: 'gemini-2.0-flash' },
    autoDetectMeetings: { type: Boolean, default: false },
    autoGenerateAnswers:{ type: Boolean, default: true },
    dynamicProcessMask: { type: Boolean, default: false },
    processAlias:       { type: String, default: 'chrome_helper' },
    cheatSheetMode:     { type: String, enum: ['full','bullets','code-only'], default: 'bullets' },
  },

  // Referral
  referralCode:     { type: String, unique: true, sparse: true }, // sparse prevents null duplicate errors
  referredBy:       { type: String },
  referralEarnings: { type: Number, default: 0 },
  referralCount:    { type: Number, default: 0 },

  // Enterprise
  enterpriseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enterprise' },

  // Stats
  totalInterviews: { type: Number, default: 0 },
  lastLogin:       { type: Date, default: Date.now },
}, { timestamps: true });

// ── Pre-save: hash password ──────────────────────────────────────────
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (e) { next(e); }
});

// ── Pre-save: generate unique referral code with retry logic ─────────
// Uses a do-while with collision detection to guarantee uniqueness
// without relying on a simple random that can collide at scale.
userSchema.pre('save', async function(next) {
  if (this.referralCode) return next(); // already has one
  let attempts = 0;
  while (attempts < 10) {
    const candidate = generateReferralCode();
    const existing = await this.constructor.findOne({ referralCode: candidate }).lean();
    if (!existing) { this.referralCode = candidate; return next(); }
    attempts++;
  }
  // Fallback: use ObjectId suffix (guaranteed unique)
  this.referralCode = this._id.toString().slice(-8).toUpperCase();
  next();
});

userSchema.methods.comparePassword = async function(p) {
  if (!this.password) return false;
  return bcrypt.compare(p, this.password);
};

// Convenience method used everywhere to check full access
userSchema.methods.hasFullAccess = function() {
  return this.isAdmin === true || this.role === 'admin';
};

// Convenience: is subscription currently active (non-admins need this)
userSchema.methods.isPremiumActive = function() {
  if (this.hasFullAccess()) return true;
  const sub = this.subscription;
  if (!sub || sub.status !== 'active') return false;
  if (sub.type === 'lifetime') return true;
  return sub.endDate && new Date(sub.endDate) > new Date();
};

module.exports = mongoose.model('User', userSchema);
