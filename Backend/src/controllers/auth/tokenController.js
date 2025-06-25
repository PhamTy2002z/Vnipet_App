/**
 * Token Controller
 * Quản lý token xác thực (refresh token, access token)
 */

const RefreshToken = require('../../models/RefreshToken');
const DeviceRegistry = require('../../models/DeviceRegistry');
const User = require('../../models/PetOwnerUser');
const tokenManager = require('../../utils/tokenManager');

/**
 * Refresh access token using refresh token
 * POST /api/v1/auth/refresh-token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken, deviceId } = req.body;
    
    if (!refreshToken || !deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token và deviceId là bắt buộc'
      });
    }
    
    // Validate refresh token
    const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
    
    if (!tokenDoc || tokenDoc.isExpired() || tokenDoc.deviceId !== deviceId) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token không hợp lệ hoặc đã hết hạn',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
    
    // Get user
    const user = await User.findById(tokenDoc.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Check if device is still active
    const device = await DeviceRegistry.findOne({ 
      deviceId, 
      userId: user._id,
      isActive: true
    });
    
    if (!device) {
      return res.status(403).json({
        success: false,
        message: 'Thiết bị không được phép truy cập',
        code: 'DEVICE_NOT_AUTHORIZED'
      });
    }
    
    // Generate new token pair
    const deviceInfo = device.deviceInfo || {};
    const tokens = await tokenManager.generateTokenPair(
      user,
      'petOwner',
      deviceId,
      deviceInfo
    );
    
    // Revoke old refresh token
    await tokenDoc.revoke('Replaced with new token');
    
    return res.json({
      success: true,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        refreshExpiresAt: tokens.refreshExpiresAt
      }
    });
    
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi làm mới token',
      error: error.message
    });
  }
};

/**
 * Revoke refresh token (logout)
 * POST /api/v1/auth/revoke-token
 */
exports.revokeToken = async (req, res) => {
  try {
    const { refreshToken, deviceId } = req.body;
    
    if (!refreshToken || !deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token và deviceId là bắt buộc'
      });
    }
    
    // Find and revoke token
    const tokenDoc = await RefreshToken.findOne({ 
      token: refreshToken,
      deviceId
    });
    
    if (tokenDoc) {
      await tokenDoc.revoke('User logout');
    }
    
    // Update device last activity
    if (req.user) {
      await DeviceRegistry.updateOne(
        { deviceId, userId: req.user.id },
        { $set: { lastActivityAt: new Date() } }
      );
    }
    
    return res.json({
      success: true,
      message: 'Đăng xuất thành công'
    });
    
  } catch (error) {
    console.error('Revoke token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi đăng xuất',
      error: error.message
    });
  }
};

/**
 * Validate access token
 * POST /api/v1/auth/validate-token
 */
exports.validateToken = async (req, res) => {
  // Nếu request đến được đây, token đã được xác thực bởi middleware
  return res.json({
    success: true,
    user: {
      id: req.user.id,
      role: req.user.role
    },
    message: 'Token hợp lệ'
  });
}; 