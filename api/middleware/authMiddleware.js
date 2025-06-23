/**
 * Auth Middleware
 * Middleware xác thực người dùng
 */

const jwt = require('jsonwebtoken');
const User = require('../models/PetOwnerUser');
const Admin = require('../models/Admin');

/**
 * Middleware xác thực chung cho cả user và admin
 */
exports.authMiddleware = async (req, res, next) => {
  try {
    // Lấy token từ header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy token xác thực'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn',
        error: error.message
      });
    }

    // Kiểm tra role và lấy thông tin người dùng
    if (decoded.role === 'admin') {
      // Admin authentication
      const admin = await Admin.findById(decoded.id);
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Admin không tồn tại'
        });
      }

      req.user = {
        id: admin._id,
        role: 'admin'
      };
    } else {
      // User authentication
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không tồn tại'
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản đã bị vô hiệu hóa'
        });
      }

      req.user = {
        id: user._id,
        role: 'user'
      };
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xác thực',
      error: error.message
    });
  }
};

/**
 * Middleware xác thực chỉ cho user
 */
exports.authUserMiddleware = async (req, res, next) => {
  try {
    // Lấy token từ header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy token xác thực'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn',
        error: error.message
      });
    }

    // Kiểm tra role
    if (decoded.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập'
      });
    }

    // Lấy thông tin người dùng
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị vô hiệu hóa'
      });
    }

    req.user = {
      id: user._id,
      role: 'user'
    };

    next();
  } catch (error) {
    console.error('Auth user middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xác thực',
      error: error.message
    });
  }
};

/**
 * Middleware xác thực chỉ cho admin
 */
exports.authAdminMiddleware = async (req, res, next) => {
  try {
    // Lấy token từ header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy token xác thực'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn',
        error: error.message
      });
    }

    // Kiểm tra role
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Yêu cầu quyền admin'
      });
    }

    // Lấy thông tin admin
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin không tồn tại'
      });
    }

    req.user = {
      id: admin._id,
      role: 'admin'
    };

    next();
  } catch (error) {
    console.error('Auth admin middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xác thực',
      error: error.message
    });
  }
}; 