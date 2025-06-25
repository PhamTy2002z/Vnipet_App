const mongoose = require('mongoose');
const crypto = require('crypto');

const RefreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refIndex: true
  },
  userType: {
    type: String,
    enum: ['admin', 'petOwner'],
    required: true
  },
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  deviceInfo: {
    platform: {
      type: String,
      enum: ['ios', 'android', 'web', 'other'],
      default: 'other'
    },
    osVersion: String,
    appVersion: String,
    deviceModel: String,
    deviceName: String,
    lastActiveIp: String,
    userAgent: String
  },
  // Security features
  isRevoked: {
    type: Boolean,
    default: false
  },
  revokedAt: Date,
  revokedReason: String,
  
  // Token family for rotation
  tokenFamily: {
    type: String,
    required: true,
    default: () => crypto.randomBytes(16).toString('hex')
  },
  
  // Usage tracking
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsedAt: {
    type: Date,
    default: null
  },
  
  // Expiry
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for performance
RefreshTokenSchema.index({ userId: 1, deviceId: 1 });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RefreshTokenSchema.index({ tokenFamily: 1 });

// Instance methods
RefreshTokenSchema.methods.revoke = function(reason = 'Manual revocation') {
  this.isRevoked = true;
  this.revokedAt = new Date();
  this.revokedReason = reason;
  return this.save();
};

RefreshTokenSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

RefreshTokenSchema.methods.isValid = function() {
  return !this.isRevoked && !this.isExpired();
};

RefreshTokenSchema.methods.recordUsage = function(ipAddress) {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  if (ipAddress) {
    this.deviceInfo.lastActiveIp = ipAddress;
  }
  return this.save();
};

// Static methods
RefreshTokenSchema.statics.generateToken = function() {
  return crypto.randomBytes(64).toString('hex');
};

RefreshTokenSchema.statics.revokeAllForUser = async function(userId, reason = 'Security measure') {
  return await this.updateMany(
    { userId, isRevoked: false },
    {
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: reason
    }
  );
};

RefreshTokenSchema.statics.revokeAllForDevice = async function(deviceId, reason = 'Device logout') {
  return await this.updateMany(
    { deviceId, isRevoked: false },
    {
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: reason
    }
  );
};

RefreshTokenSchema.statics.revokeTokenFamily = async function(tokenFamily, reason = 'Token rotation') {
  return await this.updateMany(
    { tokenFamily, isRevoked: false },
    {
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: reason
    }
  );
};

RefreshTokenSchema.statics.cleanupExpired = async function() {
  const expiredDate = new Date();
  return await this.deleteMany({
    $or: [
      { expiresAt: { $lt: expiredDate } },
      { isRevoked: true, revokedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } // 30 days old revoked tokens
    ]
  });
};

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema); 