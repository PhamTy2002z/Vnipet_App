/**
 * User Controller
 * Quản lý thông tin người dùng
 */

const User = require('../../models/PetOwnerUser');
const Pet = require('../../models/Pet');

/**
 * Get current user info and their pets
 * GET /api/v1/user/me
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Không tìm thấy người dùng' 
      });
    }
    
    const pets = await Pet.find({ ownerAccount: user._id })
      .populate('themeId')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        hasCompletedInitialSetup: user.hasCompletedInitialSetup,
        lastLoginAt: user.lastLoginAt,
        accountTier: user.accountTier,
        totalPetsLimit: user.totalPetsLimit
      },
      pets
    });
    
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

/**
 * Get user profile information
 * GET /api/v1/user/profile
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Không tìm thấy người dùng' 
      });
    }
    
    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        accountTier: user.accountTier,
        preferences: user.preferences || {},
        hasCompletedInitialSetup: user.hasCompletedInitialSetup,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

/**
 * Update user profile information
 * PUT /api/v1/user/profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, preferences } = req.body;
    
    // Validate input
    if (!name && !phone && !preferences) {
      return res.status(400).json({ 
        success: false,
        error: 'Ít nhất một trường cần được cập nhật (name, phone, preferences)' 
      });
    }
    
    // Prepare update object
    const updateData = {};
    
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (preferences) updateData.preferences = preferences;
    
    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Không tìm thấy người dùng' 
      });
    }
    
    res.json({
      success: true,
      message: 'Thông tin hồ sơ đã được cập nhật thành công',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        accountTier: user.accountTier,
        preferences: user.preferences || {},
        updatedAt: user.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

/**
 * Get user's devices
 * GET /api/v1/user/devices
 */
exports.getUserDevices = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if DeviceRegistry model exists
    let DeviceRegistry;
    try {
      DeviceRegistry = require('../../models/DeviceRegistry');
    } catch (err) {
      return res.status(501).json({
        success: false,
        error: 'Device management not implemented'
      });
    }
    
    // Get user's devices
    const devices = await DeviceRegistry.find({ userId })
      .sort({ lastActivityAt: -1 })
      .select('-appSignature -deviceFingerprint');
    
    return res.json({
      success: true,
      devices: devices.map(device => ({
        id: device._id,
        deviceId: device.deviceId,
        deviceInfo: device.deviceInfo || {},
        isActive: device.isActive,
        lastLoginAt: device.lastLoginAt,
        lastActivityAt: device.lastActivityAt,
        createdAt: device.createdAt,
        trustScore: device.trustScore || 0
      }))
    });
    
  } catch (error) {
    console.error('Get user devices error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Revoke a device
 * POST /api/v1/user/devices/:deviceId/revoke
 */
exports.revokeDevice = async (req, res) => {
  try {
    const userId = req.user.id;
    const { deviceId } = req.params;
    
    // Check if DeviceRegistry model exists
    let DeviceRegistry;
    try {
      DeviceRegistry = require('../../models/DeviceRegistry');
    } catch (err) {
      return res.status(501).json({
        success: false,
        error: 'Device management not implemented'
      });
    }
    
    // Find device
    const device = await DeviceRegistry.findOne({ 
      deviceId, 
      userId 
    });
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thiết bị'
      });
    }
    
    // Deactivate device
    device.isActive = false;
    device.revokedAt = new Date();
    device.revokedReason = 'User revoked';
    await device.save();
    
    // Revoke all refresh tokens for this device
    const RefreshToken = require('../../models/RefreshToken');
    await RefreshToken.updateMany(
      { deviceId, userId },
      { 
        $set: { 
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'Device revoked by user'
        }
      }
    );
    
    return res.json({
      success: true,
      message: 'Thiết bị đã bị thu hồi thành công'
    });
    
  } catch (error) {
    console.error('Revoke device error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}; 

/**
 * Update pet owner email
 * POST /api/v1/pet-owner/pets/:id/owner-email
 */
exports.updatePetOwnerEmail = async (req, res) => {
  try {
    const petId = req.params.id;
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    // Find pet and update owner email
    const pet = await Pet.findByIdAndUpdate(
      petId,
      { 'owner.email': email },
      { new: true, runValidators: true }
    );
    
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Pet owner email updated successfully',
      data: pet
    });
    
  } catch (error) {
    console.error('Update pet owner email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update pet owner email',
      error: error.message
    });
  }
};

/**
 * Update allergic info
 * PUT /api/v1/pet-owner/pets/:id/allergic-info
 */
exports.updateAllergicInfo = async (req, res) => {
  try {
    const petId = req.params.id;
    const { allergicInfo } = req.body;
    
    if (!allergicInfo) {
      return res.status(400).json({
        success: false,
        message: 'Allergic info is required'
      });
    }
    
    // Find pet and update allergic info
    const pet = await Pet.findByIdAndUpdate(
      petId,
      { allergicInfo },
      { new: true, runValidators: true }
    );
    
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Pet allergic info updated successfully',
      data: pet
    });
    
  } catch (error) {
    console.error('Update pet allergic info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update pet allergic info',
      error: error.message
    });
  }
};

/**
 * Update pet description
 * PUT /api/v1/pet-owner/pets/:id/description
 */
exports.updatePetDescription = async (req, res) => {
  try {
    const petId = req.params.id;
    const { description } = req.body;
    
    if (!description) {
      return res.status(400).json({
        success: false,
        message: 'Description is required'
      });
    }
    
    // Find pet and update description
    const pet = await Pet.findByIdAndUpdate(
      petId,
      { 'info.description': description },
      { new: true, runValidators: true }
    );
    
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Pet description updated successfully',
      data: pet
    });
    
  } catch (error) {
    console.error('Update pet description error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update pet description',
      error: error.message
    });
  }
}; 