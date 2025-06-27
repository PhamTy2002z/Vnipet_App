/**
 * Token Controller
 * Quản lý token xác thực (refresh token, access token)
 */

const RefreshToken = require('../../models/RefreshToken');
const DeviceRegistry = require('../../models/DeviceRegistry');
const User = require('../../models/PetOwnerUser');
const tokenManager = require('../../utils/tokenManager');
const ThemeCart = require('../../models/ThemeCart');

/**
 * Helper: Format dữ liệu giỏ hàng cho response
 */
async function getFormattedCart(userId) {
  try {
    // Lấy giỏ hàng hiện tại của người dùng
    const cart = await ThemeCart.findOne({ userId })
      .populate({ path: 'items.themeId', select: 'name description price imageUrl image isPremium inStore isActive' });
    
    if (!cart || !cart.items || cart.items.length === 0) {
      return { items: [], totalPrice: 0 };
    }
    
    // Chuyển cart thành object
    const cartData = cart.toObject();
    
    // Format từng item
    cartData.items = cartData.items.map(item => {
      if (!item.themeId) {
        return { ...item, imageUrl: null, theme: null };
      }
      
      const imageUrl = item.themeId.image?.publicUrl || item.themeId.imageUrl || null;
      
      return {
        ...item,
        imageUrl,
        theme: {
          _id: item.themeId._id,
          name: item.themeId.name,
          price: item.themeId.price || 0,
          description: item.themeId.description,
          isPremium: item.themeId.isPremium,
          inStore: item.themeId.inStore,
          isActive: item.themeId.isActive,
          imageUrl,
        },
      };
    });

    // Tính tổng giá
    const totalPrice = cartData.items.reduce((acc, item) => {
      if (item.theme && item.theme.isPremium) {
        return acc + (item.theme.price || 0);
      }
      return acc;
    }, 0);

    return {
      items: cartData.items,
      totalPrice,
      _id: cartData._id,
      userId: cartData.userId,
    };
  } catch (error) {
    console.error('[GET CART] Error:', error);
    return { items: [], totalPrice: 0 };
  }
}

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
      isActive: true
    });
    
    if (!device) {
      return res.status(403).json({
        success: false,
        message: 'Thiết bị không được phép truy cập',
        code: 'DEVICE_NOT_AUTHORIZED'
      });
    }
    
    // Kiểm tra xem user có trong danh sách userIds của thiết bị không
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
    } else if (device.userId && device.userId.toString() !== user._id.toString()) {
      // Tương thích ngược với thiết bị cũ
      return res.status(403).json({
        success: false,
        message: 'Thiết bị không thuộc về người dùng này',
        code: 'DEVICE_USER_MISMATCH'
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
    
    // Lấy giỏ hàng cập nhật
    const cart = await getFormattedCart(user._id);
    
    return res.json({
      success: true,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        refreshExpiresAt: tokens.refreshExpiresAt
      },
      cart: cart,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role || 'petOwner',
        hasCompletedInitialSetup: user.hasCompletedInitialSetup
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
      const device = await DeviceRegistry.findOne({ deviceId });
      
      if (device) {
        // Cập nhật thời gian đăng xuất
        device.lastLogoutAt = new Date();
        device.lastActivityAt = new Date();
        
        // Nếu có thông tin userId, hủy kích hoạt cho user cụ thể
        if (req.user.id && device.userIds && device.userIds.length > 0) {
          const userIndex = device.userIds.findIndex(
            item => item.userId && item.userId.toString() === req.user.id
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
  try {
    // Nếu request đến được đây, token đã được xác thực bởi middleware
    const userId = req.user.id;
    const cart = await getFormattedCart(userId);
    
    return res.json({
      success: true,
      user: {
        id: req.user.id,
        role: req.user.role
      },
      cart: cart,
      message: 'Token hợp lệ'
    });
  } catch (error) {
    console.error('Validate token error:', error);
    return res.status(500).json({
      success: false, 
      message: 'Lỗi khi xác thực token',
      error: error.message
    });
  }
}; 