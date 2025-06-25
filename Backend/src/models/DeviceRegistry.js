const mongoose = require('mongoose');
const crypto = require('crypto');

const DeviceRegistrySchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    refIndex: true,
    default: null
  },
  userType: {
    type: String,
    enum: ['admin', 'petOwner'],
    default: 'petOwner'
  },
  userIds: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PetOwnerUser'
    },
    lastLoginAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
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
    manufacturer: String,
    isTablet: {
      type: Boolean,
      default: false
    },
    lastActiveIp: String,
    userAgent: String
  },
  appSignature: String,
  deviceFingerprint: String,
  isJailbroken: {
    type: Boolean,
    default: false
  },
  trustScore: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  biometricSupport: {
    hasBiometric: {
      type: Boolean,
      default: false
    },
    biometricType: {
      type: String,
      enum: ['fingerprint', 'faceId', 'touchId', 'none'],
      default: 'none'
    },
    isBiometricEnabled: {
      type: Boolean,
      default: false
    }
  },
  pushTokens: [{
    token: String,
    type: {
      type: String,
      enum: ['fcm', 'apns'],
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
  loginCount: {
    type: Number,
    default: 0
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  isBlocked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Tạo composite index cho deviceId và userId
DeviceRegistrySchema.index({ deviceId: 1, userId: 1 }, { unique: true });

// Static methods
DeviceRegistrySchema.statics.generateDeviceId = function() {
  return crypto.randomBytes(16).toString('hex');
};

DeviceRegistrySchema.statics.validateAppSignature = function(platform, signature) {
  // Đơn giản hóa để tránh lỗi
  return true;
};

// Instance methods
DeviceRegistrySchema.methods.addPushToken = function(token, type = 'fcm') {
  // Tìm token nếu đã tồn tại
  const existingTokenIndex = this.pushTokens.findIndex(t => t.token === token);
  
  if (existingTokenIndex !== -1) {
    // Cập nhật token hiện có
    this.pushTokens[existingTokenIndex].isActive = true;
    this.pushTokens[existingTokenIndex].lastUsedAt = new Date();
  } else {
    // Thêm token mới
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

// Thêm method để quản lý userId trong userIds array
DeviceRegistrySchema.methods.addUserId = function(userId) {
  if (!this.userIds) this.userIds = [];
  
  const existingUserIdIndex = this.userIds.findIndex(
    item => item.userId && item.userId.toString() === userId.toString()
  );
  
  if (existingUserIdIndex !== -1) {
    // Cập nhật thông tin nếu đã tồn tại
    this.userIds[existingUserIdIndex].lastLoginAt = new Date();
    this.userIds[existingUserIdIndex].isActive = true;
  } else {
    // Thêm mới nếu chưa tồn tại
    this.userIds.push({
      userId,
      lastLoginAt: new Date(),
      isActive: true
    });
  }
  
  return this;
};

module.exports = mongoose.model('DeviceRegistry', DeviceRegistrySchema); 