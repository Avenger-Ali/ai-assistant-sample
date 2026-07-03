const mongoose = require('mongoose');

const desktopSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  tokenId: { type: String, required: true, unique: true },

  status: {
    type: String,
    enum: ['active', 'expired', 'revoked'],
    default: 'active',
  },

  // ── planType: added 'admin' and 'none' to enum so admin users
  //    (who have subscription.type === 'none') never fail validation.
  planType: {
    type: String,
    enum: ['none', 'monthly', 'yearly', 'lifetime', 'admin'],
    default: 'none',
    required: true,
  },

  // Admins skip token checks entirely — this flag short-circuits validation
  isAdmin: { type: Boolean, default: false },

  issuedAt:  { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },

  revokedAt:     { type: Date },
  revokedReason: { type: String },

  deviceId:   { type: String },
  platform:   { type: String },
  appVersion: { type: String },
  lastSeenAt: { type: Date },
}, { timestamps: true });

desktopSessionSchema.index({ user: 1, status: 1 });
desktopSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

desktopSessionSchema.methods.isValid = function () {
  return this.status === 'active' && this.expiresAt > new Date();
};

module.exports = mongoose.model('DesktopSession', desktopSessionSchema);
