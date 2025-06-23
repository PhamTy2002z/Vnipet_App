/**
 * DeviceRegistry Model
 * Model quản lý thông tin thiết bị đăng nhập
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const DeviceRegistrySchema = new mongoose.Schema({
  // Thông tin thiết bị
  deviceId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PetOwnerUser',
    index: true,
    sparse: true
  },
  userType: {
    type: String,
    enum: ['petOwner', 'admin', 'guest'],
    default: 'petOwner'
  },
  deviceInfo: {
    platform: String, // ios, android
    osVersion: String,
    appVersion: String,
    deviceModel: String,
    deviceName: String,
    manufacturer: String,
    isTablet: Boolean
  },
  appSignature: String,
  deviceFingerprint: String,
  
  // Trạng thái thiết bị
  isActive: {
    type: Boolean,
    default: true
  },
  isTrusted: {
    type: Boolean, 
    default: false
  },
  trustScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  },
  lastLogoutAt: {
    type: Date
  },
  
  // Thông tin bảo mật
  isJailbroken: {
    type: Boolean,
    default: false
  },
  biometricSupport: {
    hasBiometric: {
      type: Boolean,
      default: false
    },
    biometricType: {
      type: String,
      enum: ['none', 'fingerprint', 'faceId', 'touchId', 'other'],
      default: 'none'
    },
    isBiometricEnabled: {
      type: Boolean,
      default: false
    }
  },
  
  // Push notifications
  pushTokens: [{
    token: String,
    type: {
      type: String,
      enum: ['fcm', 'apns', 'expo'],
      default: 'fcm'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastUsedAt: Date
  }],
  
  // Flags và metrics
  activityMetrics: {
    sessionsCount: {
      type: Number,
      default: 0
    },
    averageSessionDuration: {
      type: Number,
      default: 0
    },
    lastSessionDuration: Number,
    totalUsageTime: {
      type: Number,
      default: 0
    }
  }
}, { timestamps: true });

// Indexes
DeviceRegistrySchema.index({ userId: 1, deviceId: 1 });
DeviceRegistrySchema.index({ deviceFingerprint: 1 });

// Validate app signature 
DeviceRegistrySchema.statics.validateAppSignature = function(platform, signature) {
  const validSignatures = {
    ios: ['com.vnipet.app'],
    android: ['com.vnipet.app']
  };
  
  return validSignatures[platform] && validSignatures[platform].includes(signature);
};

// Generate a device ID
DeviceRegistrySchema.statics.generateDeviceId = function() {
  return crypto.randomBytes(16).toString('hex');
};

// Add push token
DeviceRegistrySchema.methods.addPushToken = function(token, type = 'fcm') {
  if (!token) return;
  
  // Check if token already exists
  const existingTokenIndex = this.pushTokens.findIndex(pt => pt.token === token);
  
  if (existingTokenIndex !== -1) {
    // Update existing token
    this.pushTokens[existingTokenIndex].isActive = true;
    this.pushTokens[existingTokenIndex].lastUsedAt = new Date();
  } else {
    // Add new token
    this.pushTokens.push({
      token,
      type,
      isActive: true,
      createdAt: new Date(),
      lastUsedAt: new Date()
    });
  }
  
  return this.save();
};

// Deactivate push token
DeviceRegistrySchema.methods.deactivatePushToken = function(token) {
  const existingTokenIndex = this.pushTokens.findIndex(pt => pt.token === token);
  
  if (existingTokenIndex !== -1) {
    this.pushTokens[existingTokenIndex].isActive = false;
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Get active push tokens
DeviceRegistrySchema.methods.getActivePushTokens = function() {
  return this.pushTokens.filter(pt => pt.isActive).map(pt => ({
    token: pt.token,
    type: pt.type
  }));
};

// Update device activity
DeviceRegistrySchema.methods.updateActivity = function(sessionDuration) {
  if (typeof sessionDuration !== 'number' || sessionDuration <= 0) return Promise.resolve(this);
  
  const currentSessions = this.activityMetrics.sessionsCount || 0;
  const currentTotal = this.activityMetrics.totalUsageTime || 0;
  
  // Calculate new average session duration
  const newTotal = currentTotal + sessionDuration;
  const newCount = currentSessions + 1;
  const newAverage = newTotal / newCount;
  
  // Update metrics
  this.activityMetrics = {
    ...this.activityMetrics,
    sessionsCount: newCount,
    totalUsageTime: newTotal,
    averageSessionDuration: newAverage,
    lastSessionDuration: sessionDuration
  };
  
  // Update trust score based on activity
  this.recalculateTrustScore();
  
  return this.save();
};

// Calculate trust score based on device attributes and behavior
DeviceRegistrySchema.methods.recalculateTrustScore = function() {
  let score = 50; // Base score
  
  // Factors that increase trust
  if (this.activityMetrics.sessionsCount > 10) score += 10;
  if (this.biometricSupport.isBiometricEnabled) score += 15;
  if (!this.isJailbroken) score += 10;
  if (this.isTrusted) score += 15;
  
  // Cap score
  if (score > 100) score = 100;
  if (score < 0) score = 0;
  
  this.trustScore = score;
};

module.exports = mongoose.model('DeviceRegistry', DeviceRegistrySchema); 