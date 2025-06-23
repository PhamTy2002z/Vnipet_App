/**
 * Token Manager
 * Quản lý các token xác thực và refresh token
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/RefreshToken');

// Lấy thông tin cấu hình từ biến môi trường
const JWT_SECRET = process.env.JWT_SECRET || 'vnipet_jwt_secret_key';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '1h'; // 1 giờ
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '30d'; // 30 ngày

/**
 * Tạo cặp token (access + refresh) mới
 * @param {Object} user - Thông tin người dùng
 * @param {String} role - Vai trò người dùng
 * @param {String} deviceId - ID của thiết bị
 * @param {Object} deviceInfo - Thông tin về thiết bị
 * @returns {Promise<Object>} - Access token và refresh token
 */
exports.generateTokenPair = async (user, role, deviceId, deviceInfo = {}) => {
  try {
    // Tạo payload cho token
    const tokenPayload = {
      id: user._id,
      email: user.email,
      role: role || 'petOwner',
      deviceId
    };

    // Tính thời gian hết hạn
    const accessExpiresIn = ACCESS_TOKEN_EXPIRY;
    const refreshExpiresInMs = getExpiryMs(REFRESH_TOKEN_EXPIRY); // Convert thành miliseconds
    
    // Tạo access token
    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: accessExpiresIn });
    
    // Tạo refresh token
    const refreshToken = generateRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + refreshExpiresInMs);
    
    // Lưu refresh token vào database
    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      userRole: role || 'petOwner',
      deviceId,
      expiresAt: refreshExpiresAt,
      issuedAt: new Date()
    });

    // Trả về cả hai token
    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
      refreshExpiresAt: refreshExpiresAt
    };
  } catch (error) {
    console.error('Token generation error:', error);
    throw new Error('Không thể tạo token');
  }
};

/**
 * Xác minh refresh token
 * @param {String} token - Refresh token cần xác minh
 * @returns {Promise<Object|null>} - Thông tin từ token hoặc null nếu không hợp lệ
 */
exports.verifyRefreshToken = async (token) => {
  try {
    // Tìm token trong database
    const refreshTokenDoc = await RefreshToken.findValid(token);
    
    if (!refreshTokenDoc) {
      return null;
    }
    
    // Token hợp lệ, trả về thông tin
    return {
      userId: refreshTokenDoc.userId,
      deviceId: refreshTokenDoc.deviceId,
      userRole: refreshTokenDoc.userRole
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

/**
 * Thu hồi refresh token
 * @param {String} token - Token cần thu hồi
 * @returns {Promise<Boolean>} - Kết quả thu hồi
 */
exports.revokeRefreshToken = async (token) => {
  try {
    const refreshTokenDoc = await RefreshToken.findOne({ token });
    
    if (!refreshTokenDoc) {
      return false;
    }
    
    await refreshTokenDoc.revoke();
    return true;
  } catch (error) {
    console.error('Token revocation error:', error);
    return false;
  }
};

/**
 * Thu hồi tất cả refresh token của một thiết bị
 * @param {String} userId - ID của người dùng
 * @param {String} deviceId - ID của thiết bị
 * @returns {Promise<Boolean>} - Kết quả thu hồi
 */
exports.revokeAllTokensForDevice = async (userId, deviceId) => {
  try {
    await RefreshToken.revokeAllForDevice(userId, deviceId);
    return true;
  } catch (error) {
    console.error('Device tokens revocation error:', error);
    return false;
  }
};

/**
 * Thu hồi tất cả refresh token của một người dùng
 * @param {String} userId - ID của người dùng
 * @returns {Promise<Boolean>} - Kết quả thu hồi
 */
exports.revokeAllTokensForUser = async (userId) => {
  try {
    await RefreshToken.revokeAllForUser(userId);
    return true;
  } catch (error) {
    console.error('User tokens revocation error:', error);
    return false;
  }
};

/**
 * Xác minh access token
 * @param {String} token - Access token cần xác minh
 * @returns {Object|null} - Payload giải mã từ token hoặc null nếu không hợp lệ
 */
exports.verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('Access token verification error:', error);
    return null;
  }
};

/**
 * Tạo refresh token ngẫu nhiên
 * @returns {String} - Refresh token ngẫu nhiên
 */
function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

/**
 * Chuyển đổi string mô tả thời gian thành milliseconds
 * @param {String} expiry - Mô tả thời gian (vd: '1d', '7d', '30d')
 * @returns {Number} - Milliseconds
 */
function getExpiryMs(expiry) {
  const match = expiry.match(/^(\d+)([smhdwy])$/);
  
  if (!match) {
    // Mặc định là 30 ngày nếu không hợp lệ
    return 30 * 24 * 60 * 60 * 1000;
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000; // giây
    case 'm': return value * 60 * 1000; // phút
    case 'h': return value * 60 * 60 * 1000; // giờ
    case 'd': return value * 24 * 60 * 60 * 1000; // ngày
    case 'w': return value * 7 * 24 * 60 * 60 * 1000; // tuần
    case 'y': return value * 365 * 24 * 60 * 60 * 1000; // năm
    default: return 30 * 24 * 60 * 60 * 1000; // mặc định 30 ngày
  }
} 