/**
 * RefreshToken Model
 * Model quản lý refresh token cho việc làm mới access token
 */

const mongoose = require('mongoose');

const RefreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'PetOwnerUser',
    index: true
  },
  userRole: {
    type: String,
    enum: ['petOwner', 'admin'],
    default: 'petOwner'
  },
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  isRevoked: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  issuedAt: {
    type: Date,
    default: Date.now
  },
  replacedByToken: {
    type: String,
    default: null
  }
}, { timestamps: true });

// Tạo indexes
RefreshTokenSchema.index({ userId: 1, deviceId: 1, isRevoked: 1 });

// Kiểm tra token có hết hạn hay không
RefreshTokenSchema.methods.isExpired = function() {
  return Date.now() >= this.expiresAt.getTime();
};

// Từ chối token này (revoke)
RefreshTokenSchema.methods.revoke = function(replacedByToken = null) {
  this.isRevoked = true;
  if (replacedByToken) {
    this.replacedByToken = replacedByToken;
  }
  return this.save();
};

// Tìm token hợp lệ
RefreshTokenSchema.statics.findValid = function(token) {
  return this.findOne({
    token,
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  });
};

// Từ chối tất cả token của một thiết bị (khi logout)
RefreshTokenSchema.statics.revokeAllForDevice = function(userId, deviceId) {
  return this.updateMany(
    { 
      userId, 
      deviceId, 
      isRevoked: false 
    },
    {
      $set: {
        isRevoked: true
      }
    }
  );
};

// Từ chối tất cả token của một user (khi đổi mật khẩu)
RefreshTokenSchema.statics.revokeAllForUser = function(userId) {
  return this.updateMany(
    { 
      userId, 
      isRevoked: false 
    },
    {
      $set: {
        isRevoked: true
      }
    }
  );
};

// Xóa các token hết hạn để dọn dẹp database
RefreshTokenSchema.statics.removeExpired = function() {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() - 7); // Giữ token hết hạn 7 ngày
  
  return this.deleteMany({
    expiresAt: { $lt: expiryDate }
  });
};

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema); 