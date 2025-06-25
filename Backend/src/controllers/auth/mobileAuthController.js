/**
 * Mobile Authentication Controller
 * Quản lý xác thực cho ứng dụng di động
 */

const DeviceRegistry = require('../../models/DeviceRegistry');
const RefreshToken = require('../../models/RefreshToken');
const User = require('../../models/PetOwnerUser');
const tokenManager = require('../../utils/tokenManager');

/**
 * Register a new user with mobile device
 * POST /api/v1/auth/mobile-register
 */
exports.registerUser = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      phone, 
      password, 
      confirmPassword,
      deviceId,
      deviceInfo = {} 
    } = req.body;
    
    // Validate required fields
    if (!name || !email || !phone || !password || !confirmPassword || !deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Tất cả các trường là bắt buộc'
      });
    }
    
    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu xác nhận không khớp'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email này đã được đăng ký'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      password,
      hasCompletedInitialSetup: true
    });

    // Kiểm tra và xử lý thiết bị
    let device;
    try {
      // Tìm thiết bị hiện có
      device = await DeviceRegistry.findOne({ deviceId });
      
      if (device) {
        // Thiết bị đã tồn tại, thêm userId vào mảng userIds
        device.addUserId(user._id);
        device.deviceInfo = { ...device.deviceInfo, ...deviceInfo };
        await device.save();
      } else {
        // Tạo thiết bị mới
        device = await DeviceRegistry.create({
          deviceId,
          userId: user._id,
          userType: 'petOwner',
          userIds: [{
            userId: user._id,
            lastLoginAt: new Date(),
            isActive: true
          }],
          deviceInfo: deviceInfo || {},
          appSignature: deviceInfo.appSignature || (deviceInfo.platform === 'ios' ? 'com.vnipet.app' : 'com.vnipet.app')
        });
      }
    } catch (error) {
      console.error('Device registration error:', error);
      // Tiếp tục quá trình đăng ký ngay cả khi có lỗi thiết bị
    }

    // Generate token pair
    const tokens = await tokenManager.generateTokenPair(
      user,
      'petOwner',
      deviceId,
      deviceInfo
    );

    // Return user data and tokens
    return res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        accountTier: user.accountTier,
        totalPetsLimit: user.totalPetsLimit,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        refreshExpiresAt: tokens.refreshExpiresAt
      },
      device: device ? {
        deviceId: device.deviceId,
        trustScore: device.trustScore || 0
      } : null,
      message: 'Đăng ký thành công'
    });
    
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Đăng ký thất bại',
      error: error.message
    });
  }
};

/**
 * Register a new device
 * POST /api/v1/auth/device-register
 */
exports.registerDevice = async (req, res) => {
  try {
    const {
      platform,
      osVersion,
      appVersion,
      deviceModel,
      deviceName,
      manufacturer,
      isTablet,
      appSignature,
      deviceFingerprint,
      isJailbroken,
      hasBiometric,
      biometricType,
      pushToken,
      pushTokenType
    } = req.body;

    // Validate required fields
    if (!platform || !appSignature) {
      return res.status(400).json({
        success: false,
        message: 'Platform and app signature are required'
      });
    }

    // Validate app signature
    if (!DeviceRegistry.validateAppSignature(platform, appSignature)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid app signature'
      });
    }

    // Generate device ID
    const deviceId = DeviceRegistry.generateDeviceId();

    // Check if user is authenticated (optional for device registration)
    let userId = null;
    let userType = null;
    
    if (req.user) {
      userId = req.user.id;
      userType = req.user.role;
    }

    // Create device registry
    const deviceData = {
      deviceId,
      userId: userId || null,
      userType: userType || 'petOwner',
      deviceInfo: {
        platform,
        osVersion,
        appVersion,
        deviceModel,
        deviceName,
        manufacturer,
        isTablet: isTablet || false
      },
      appSignature,
      deviceFingerprint,
      isJailbroken: isJailbroken || false,
      biometricSupport: {
        hasBiometric: hasBiometric || false,
        biometricType: biometricType || 'none',
        isBiometricEnabled: false
      }
    };

    // Thêm userIds nếu có userId
    if (userId) {
      deviceData.userIds = [{
        userId,
        lastLoginAt: new Date(),
        isActive: true
      }];
    }

    // Only create device if userId is provided
    let device = null;
    if (userId) {
      device = await DeviceRegistry.create(deviceData);
      
      // Add push token if provided
      if (pushToken) {
        await device.addPushToken(pushToken, pushTokenType || 'fcm');
      }
    }

    return res.status(201).json({
      success: true,
      deviceId,
      platform,
      isRegistered: !!device,
      trustScore: device ? device.trustScore : null,
      biometricSupport: deviceData.biometricSupport,
      message: 'Device registered successfully',
      requiresLogin: !userId
    });

  } catch (error) {
    console.error('Device registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register device',
      error: error.message
    });
  }
};

/**
 * Enhanced login with device tracking and refresh token
 * POST /api/v1/auth/mobile-login
 */
exports.mobileLogin = async (req, res) => {
  try {
    const { email, password, deviceId, deviceInfo = {} } = req.body;

    if (!email || !password || !deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Email, mật khẩu, và deviceId là bắt buộc'
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Reset failed attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Tìm thiết bị theo deviceId
    let device = await DeviceRegistry.findOne({ deviceId });
    
    if (!device) {
      // Tạo thiết bị mới nếu chưa tồn tại
      device = await DeviceRegistry.create({
        deviceId,
        userId: user._id, // Giữ tương thích ngược với code cũ
        userType: 'petOwner',
        userIds: [{ // Thêm vào mảng userIds
          userId: user._id,
          lastLoginAt: new Date(),
          isActive: true
        }],
        deviceInfo: deviceInfo || {},
        appSignature: deviceInfo.appSignature || (deviceInfo.platform === 'ios' ? 'com.vnipet.app' : 'com.vnipet.app')
      });
    } else {
      // Thiết bị đã tồn tại, cập nhật thông tin và thêm/cập nhật userId vào mảng userIds
      device.deviceInfo = { ...device.deviceInfo, ...deviceInfo };
      device.lastLoginAt = new Date();
      device.addUserId(user._id); // Sử dụng phương thức mới thêm vào schema
      
      // Nếu thiết bị chưa gắn với userId chính (trường hợp thiết bị cũ), gán userId
      if (!device.userId) {
        device.userId = user._id;
      }
      
      await device.save();
    }

    // Check if device is active
    if (!device.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Thiết bị này đã bị vô hiệu hóa',
        code: 'DEVICE_INACTIVE'
      });
    }

    // Generate token pair
    const tokens = await tokenManager.generateTokenPair(
      user,
      'petOwner',
      deviceId,
      deviceInfo
    );

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        accountTier: user.accountTier,
        hasCompletedInitialSetup: user.hasCompletedInitialSetup
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        refreshExpiresAt: tokens.refreshExpiresAt
      },
      device: {
        deviceId: device.deviceId,
        trustScore: device.trustScore || 0
      },
      message: 'Đăng nhập thành công'
    });
    
  } catch (error) {
    console.error('Mobile login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Đăng nhập thất bại',
      error: error.message
    });
  }
};

/**
 * Refresh access token
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

    // Verify refresh token
    const tokenData = await tokenManager.verifyRefreshToken(refreshToken);
    if (!tokenData) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token không hợp lệ hoặc đã hết hạn'
      });
    }

    // Check if token matches device
    if (tokenData.deviceId !== deviceId) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token không khớp với thiết bị'
      });
    }

    // Get user
    const user = await User.findById(tokenData.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Tìm thiết bị và kiểm tra quyền truy cập
    const device = await DeviceRegistry.findOne({ deviceId });
    if (!device || !device.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Thiết bị không hợp lệ hoặc đã bị vô hiệu hóa'
      });
    }

    // Kiểm tra xem user này có trong danh sách userIds không
    if (device.userIds && device.userIds.length > 0) {
      const userInDevice = device.userIds.find(
        item => item.userId && item.userId.toString() === user._id.toString() && item.isActive
      );
      
      if (!userInDevice) {
        return res.status(403).json({
          success: false,
          message: 'Người dùng không được liên kết với thiết bị này',
          code: 'USER_DEVICE_NOT_LINKED'
        });
      }
      
      // Cập nhật thời gian truy cập
      device.addUserId(user._id);
      await device.save();
    } else if (device.userId && device.userId.toString() !== user._id.toString()) {
      // Tương thích ngược với thiết bị cũ chưa có userIds
      return res.status(403).json({
        success: false,
        message: 'Thiết bị không thuộc về người dùng này',
        code: 'DEVICE_USER_MISMATCH'
      });
    }

    // Generate new token pair
    const tokens = await tokenManager.generateTokenPair(
      user,
      'petOwner',
      deviceId,
      device.deviceInfo
    );

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
      message: 'Không thể làm mới token',
      error: error.message
    });
  }
};

/**
 * Logout and revoke refresh token
 * POST /api/v1/auth/logout
 */
exports.logout = async (req, res) => {
  try {
    const { refreshToken, deviceId } = req.body;

    if (!refreshToken || !deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token và deviceId là bắt buộc'
      });
    }

    // Verify token để lấy thông tin người dùng
    const tokenData = await tokenManager.verifyRefreshToken(refreshToken, true);
    let userId = null;
    
    if (tokenData && tokenData.userId) {
      userId = tokenData.userId;
    }

    // Revoke refresh token
    await tokenManager.revokeRefreshToken(refreshToken);

    // Update device and user info
    if (deviceId) {
      const device = await DeviceRegistry.findOne({ deviceId });
      
      if (device) {
        // Cập nhật thời gian đăng xuất
        device.lastLogoutAt = new Date();
        
        // Nếu có thông tin userId, hủy kích hoạt cho user cụ thể
        if (userId && device.userIds && device.userIds.length > 0) {
          const userIndex = device.userIds.findIndex(
            item => item.userId && item.userId.toString() === userId
          );
          
          if (userIndex !== -1) {
            // Set isActive cho user này thành false
            device.userIds[userIndex].isActive = false;
          }
        }
        
        await device.save();
      }
    }

    return res.json({
      success: true,
      message: 'Đăng xuất thành công'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Đăng xuất thất bại',
      error: error.message
    });
  }
}; 