/**
 * Pet Controller
 * Quản lý thú cưng
 */

const Pet = require('../../models/Pet');
const User = require('../../models/PetOwnerUser');
const UserTheme = require('../../models/UserTheme');
const QRScan = require('../../models/QRScan');

/**
 * Get pet details
 * GET /api/v1/pet/:petId
 */
exports.getPetDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { petId } = req.params;

    const pet = await Pet.findById(petId)
      .populate('themeId', 'name description previewImage')
      .lean();

    if (!pet || !pet.ownerAccount || pet.ownerAccount.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found or not owned by you'
      });
    }

    res.json({
      success: true,
      data: pet
    });

  } catch (error) {
    console.error('Get pet details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load pet details',
      error: error.message
    });
  }
};

/**
 * Scan and link QR code
 * POST /api/v1/user/pets/scan-qr
 * @param {Object} req
 * @param {Object} res
 * @param {String} req.body.qrToken - Token from QR code
 * @returns {Object} Pet information and link status
 */
exports.scanAndLinkQR = async (req, res) => {
  try {
    const { qrToken } = req.body;
    const userId = req.user.id;

    if (!qrToken) {
      return res.status(400).json({
        success: false,
        message: 'QR Token is required',
      });
    }

    // Find pet with this QR token
    const pet = await Pet.findOne({ qrToken });
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'No pet found with this QR code',
      });
    }

    // Find user to get their information
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if pet is already linked to another account
    if (pet.ownerAccount && pet.ownerAccount.toString() !== userId) {
      return res.status(400).json({
        success: false,
        message: 'This pet is already linked to another account',
      });
    }

    // Record scan event
    const scan = new QRScan({
      qrToken,
      petId: pet._id,
      scannedBy: userId,
      action: 'link_pet',
      success: true,
    });
    await scan.save();

    // Link pet to user
    pet.linkToAccount(userId, 'qr_scan');
    
    // Đồng bộ thông tin chủ pet từ tài khoản người dùng
    pet.owner = {
      name: user.name || pet.owner.name,
      phone: user.phone || pet.owner.phone,
      email: user.email || pet.owner.email,
    };
    
    await pet.save();

    // Add pet to user's pets array if not already there
    const userUpdated = await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: { pets: pet._id },
      },
      { new: true }
    );

    return res.json({
      success: true,
      message: 'Pet linked successfully',
      pet,
      user: {
        name: userUpdated.name,
        email: userUpdated.email,
        pets: userUpdated.pets,
      },
    });
  } catch (error) {
    console.error('QR scan error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while linking pet',
      error: error.message,
    });
  }
};

/**
 * Unlink pet from user
 * DELETE /api/v1/pet/:petId/unlink
 */
exports.unlinkPet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { petId } = req.params;

    // Find the pet and verify ownership
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }

    if (!pet.isOwnedBy(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not own this pet'
      });
    }

    // Unlink the pet
    pet.unlinkFromAccount();
    await pet.save();

    // Remove pet from user's pets array
    const user = await User.findById(userId);
    user.removePet(petId);
    await user.save();

    // Remove pet from any applied themes
    await UserTheme.updateMany(
      { userId },
      { $pull: { appliedToPets: { petId } } }
    );

    res.json({
      success: true,
      message: 'Pet successfully unlinked from your account'
    });

  } catch (error) {
    console.error('Pet unlinking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlink pet',
      error: error.message
    });
  }
};

/**
 * Update pet information
 * PUT /api/v1/pet/:petId
 */
exports.updatePet = async (req, res) => {
  try {
    const userId = req.user.id;
    const petId = req.params.id || req.params.petId;
    const updateData = req.body;
    
    // Find the pet and verify ownership
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }

    if (!pet.isOwnedBy(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not own this pet'
      });
    }
    
    // Validate update data
    const allowedFields = [
      'info',
      'owner',
      'allergicInfo',
      'preferences',
      'vaccinations',
      'reExaminations',
      'visibility'
    ];
    
    // Filter out non-allowed fields
    const filteredData = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    });
    
    // Update pet
    const updatedPet = await Pet.findByIdAndUpdate(
      petId,
      { $set: filteredData },
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Pet information updated successfully',
      data: updatedPet
    });
    
  } catch (error) {
    console.error('Update pet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update pet information',
      error: error.message
    });
  }
};

/**
 * Get all pets for a user
 * GET /api/v1/pet
 */
exports.getUserPets = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get pets owned by this user
    const pets = await Pet.find({ ownerAccount: userId })
      .populate('themeId', 'name description previewImage')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: pets
    });
    
  } catch (error) {
    console.error('Get user pets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load user pets',
      error: error.message
    });
  }
}; 