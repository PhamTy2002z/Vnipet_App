const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/RefreshToken');
const DeviceRegistry = require('../models/DeviceRegistry');

class TokenManager {
  constructor() {
    this.accessTokenExpiry = process.env.ACCESS_TOKEN_EXPIRY || '15m';
    this.refreshTokenExpiry = parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || '30') * 24 * 60 * 60 * 1000;
    this.jwtSecret = process.env.JWT_SECRET;
    this.refreshSecret = process.env.REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
  }

  /**
   * Generate access token
   * @param {Object} payload - Token payload
   * @param {String} expiresIn - Optional custom expiry
   * @returns {String} JWT token
   */
  generateAccessToken(payload, expiresIn = null) {
    const tokenPayload = {
      ...payload,
      type: 'access',
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(
      tokenPayload,
      this.jwtSecret,
      { expiresIn: expiresIn || this.accessTokenExpiry }
    );
  }

  /**
   * Generate refresh token and save to database
   * @param {String} userId - User ID
   * @param {String} userType - 'admin' or 'petOwner'
   * @param {String} deviceId - Device ID
   * @param {Object} deviceInfo - Device information
   * @param {String} tokenFamily - Optional token family for rotation
   * @returns {Object} Token data
   */
  async generateRefreshToken(userId, userType, deviceId, deviceInfo = {}, tokenFamily = null) {
    const token = RefreshToken.generateToken();
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiry);

    const refreshToken = await RefreshToken.create({
      token,
      userId,
      userType,
      deviceId,
      deviceInfo,
      tokenFamily: tokenFamily || crypto.randomBytes(16).toString('hex'),
      expiresAt
    });

    return {
      token: refreshToken.token,
      expiresAt: refreshToken.expiresAt,
      tokenFamily: refreshToken.tokenFamily
    };
  }

  /**
   * Generate both access and refresh tokens
   * @param {Object} user - User object
   * @param {String} userType - 'admin' or 'petOwner'
   * @param {String} deviceId - Device ID
   * @param {Object} deviceInfo - Device information
   * @returns {Object} Both tokens
   */
  async generateTokenPair(user, userType, deviceId, deviceInfo = {}) {
    const payload = {
      id: user._id.toString(),
      role: userType,
      email: user.email,
      deviceId
    };

    // Nếu user là petOwner (dùng ứng dụng mobile) thì cấp access token với thời hạn rất dài (20 năm)
    // nhằm tránh việc token hết hạn gây buộc đăng nhập lại. Các role khác giữ nguyên mặc định.
    const accessToken = this.generateAccessToken(payload, userType === 'petOwner' ? '20y' : null);
    const refreshTokenData = await this.generateRefreshToken(
      user._id,
      userType,
      deviceId,
      deviceInfo
    );

    return {
      accessToken,
      refreshToken: refreshTokenData.token,
      tokenFamily: refreshTokenData.tokenFamily,
      expiresIn: this.accessTokenExpiry,
      refreshExpiresAt: refreshTokenData.expiresAt
    };
  }

  /**
   * Verify access token
   * @param {String} token - JWT token
   * @returns {Object} Decoded payload
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }
      return decoded;
    } catch (error) {
      throw new Error(`Invalid access token: ${error.message}`);
    }
  }

  /**
   * Validate token without throwing error
   * @param {String} token - JWT token
   * @returns {Object} Validation result
   */
  validateToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      return {
        valid: true,
        expired: false,
        decoded
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return {
          valid: false,
          expired: true,
          error: 'Token expired'
        };
      }
      return {
        valid: false,
        expired: false,
        error: error.message
      };
    }
  }

  /**
   * Verify refresh token and return token data
   * @param {String} refreshTokenString - Refresh token string
   * @param {Boolean} ignoreExpiry - Optional flag to ignore expiry for logout operations
   * @returns {Object|null} Token data or null if invalid
   */
  async verifyRefreshToken(refreshTokenString, ignoreExpiry = false) {
    try {
      // Find the refresh token in database
      const refreshToken = await RefreshToken.findOne({ token: refreshTokenString });
      
      if (!refreshToken) {
        return null;
      }
      
      // Check if token is revoked
      if (refreshToken.isRevoked) {
        return null;
      }
      
      // Check expiry unless ignoreExpiry is true
      if (!ignoreExpiry && refreshToken.expiresAt < new Date()) {
        return null;
      }
      
      // Return token data
      return {
        userId: refreshToken.userId,
        userType: refreshToken.userType,
        deviceId: refreshToken.deviceId,
        tokenFamily: refreshToken.tokenFamily
      };
    } catch (error) {
      console.error('Refresh token verification error:', error);
      return null;
    }
  }

  /**
   * Revoke refresh token
   * @param {String} refreshTokenString - Refresh token to revoke
   * @param {String} reason - Optional reason for revocation
   * @returns {Boolean} Success status
   */
  async revokeRefreshToken(refreshTokenString, reason = 'User logout') {
    try {
      const refreshToken = await RefreshToken.findOne({ token: refreshTokenString });
      if (!refreshToken) {
        return false;
      }
      
      await refreshToken.revoke(reason);
      return true;
    } catch (error) {
      console.error('Token revocation error:', error);
      return false;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {String} refreshTokenString - Refresh token
   * @param {String} deviceId - Device ID for validation
   * @param {String} ipAddress - IP address for tracking
   * @returns {Object} New tokens
   */
  async refreshAccessToken(refreshTokenString, deviceId, ipAddress = null) {
    // Find refresh token
    const refreshToken = await RefreshToken.findOne({
      token: refreshTokenString,
      deviceId
    });

    if (!refreshToken) {
      throw new Error('Invalid refresh token');
    }

    if (!refreshToken.isValid()) {
      throw new Error('Refresh token is expired or revoked');
    }

    // Record usage
    await refreshToken.recordUsage(ipAddress);

    // Get user based on type
    let user;
    if (refreshToken.userType === 'admin') {
      const Admin = require('../models/Admin');
      user = await Admin.findById(refreshToken.userId);
    } else {
      const PetOwnerUser = require('../models/PetOwnerUser');
      user = await PetOwnerUser.findById(refreshToken.userId);
    }

    if (!user) {
      await refreshToken.revoke('User not found');
      throw new Error('User not found');
    }

    // Generate new access token
    const payload = {
      id: user._id.toString(),
      role: refreshToken.userType,
      email: user.email || user.username,
      deviceId
    };

    const newAccessToken = this.generateAccessToken(payload);

    // Implement refresh token rotation (optional but recommended)
    const shouldRotate = refreshToken.usageCount >= 5; // Rotate after 5 uses
    let newRefreshToken = null;

    if (shouldRotate) {
      // Revoke old token family
      await RefreshToken.revokeTokenFamily(refreshToken.tokenFamily, 'Token rotation');
      
      // Generate new refresh token
      const newRefreshData = await this.generateRefreshToken(
        user._id,
        refreshToken.userType,
        deviceId,
        refreshToken.deviceInfo,
        refreshToken.tokenFamily // Keep same family
      );
      newRefreshToken = newRefreshData.token;
    }

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken, // null if not rotated
      expiresIn: this.accessTokenExpiry,
      rotated: shouldRotate
    };
  }

  /**
   * Revoke all tokens for a user
   * @param {String} userId - User ID
   * @param {String} reason - Revocation reason
   */
  async revokeAllUserTokens(userId, reason = 'User logout') {
    await RefreshToken.revokeAllForUser(userId, reason);
  }

  /**
   * Revoke all tokens for a device
   * @param {String} deviceId - Device ID
   * @param {String} reason - Revocation reason
   */
  async revokeDeviceTokens(deviceId, reason = 'Device logout') {
    await RefreshToken.revokeAllForDevice(deviceId, reason);
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens() {
    const result = await RefreshToken.cleanupExpired();
    console.log(`[TokenManager] Cleaned up ${result.deletedCount} expired tokens`);
    return result;
  }

  /**
   * Get active devices for user
   * @param {String} userId - User ID
   * @returns {Array} Active devices with tokens
   */
  async getActiveDevices(userId) {
    const devices = await DeviceRegistry.findActiveDevicesForUser(userId);
    
    // Get active tokens for each device
    const devicesWithTokens = await Promise.all(
      devices.map(async (device) => {
        const activeTokens = await RefreshToken.countDocuments({
          userId,
          deviceId: device.deviceId,
          isRevoked: false,
          expiresAt: { $gt: new Date() }
        });

        return {
          ...device.toObject(),
          activeTokens
        };
      })
    );

    return devicesWithTokens;
  }

  /**
   * Validate device and check trust
   * @param {String} deviceId - Device ID
   * @param {Object} deviceInfo - Current device info
   * @returns {Object} Validation result
   */
  async validateDevice(deviceId, deviceInfo = {}) {
    const device = await DeviceRegistry.findOne({ deviceId });

    if (!device) {
      return {
        valid: false,
        reason: 'Device not registered'
      };
    }

    if (device.isBlocked) {
      return {
        valid: false,
        reason: device.blockedReason || 'Device is blocked'
      };
    }

    if (!device.isActive) {
      return {
        valid: false,
        reason: 'Device is inactive'
      };
    }

    // Check app signature
    if (deviceInfo.appSignature && device.appSignature !== deviceInfo.appSignature) {
      // Suspicious activity - app signature changed
      await device.updateTrustScore(-20);
      return {
        valid: false,
        reason: 'App signature mismatch'
      };
    }

    // Update trust score based on activity
    if (device.trustScore < 30) {
      return {
        valid: false,
        reason: 'Low trust score'
      };
    }

    return {
      valid: true,
      device: device.toObject()
    };
  }
}

// Export singleton instance
module.exports = new TokenManager(); 