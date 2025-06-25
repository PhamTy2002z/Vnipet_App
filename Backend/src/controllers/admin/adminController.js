/**
 * Admin Controller
 * Quản lý chức năng admin
 */

const Pet = require('../../models/Pet');
const User = require('../../models/PetOwnerUser');
const Theme = require('../../models/Theme');
const UserTheme = require('../../models/UserTheme');
const QRScan = require('../../models/QRScan');
const Admin = require('../../models/Admin');

/**
 * Admin Login
 * POST /api/v1/auth/admin/login
 */
exports.loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ 
        success: false,
        message: 'Username và password là bắt buộc' 
      });

    const admin = await Admin.findOne({ username });
    if (!admin || !(await admin.comparePassword(password)))
      return res.status(401).json({ 
        success: false,
        message: 'Thông tin đăng nhập không hợp lệ' 
      });

    // Sử dụng tokenManager để tạo token
    const deviceId = req.headers['device-id'] || 'web-admin';
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      type: 'admin'
    };

    const tokenManager = require('../../utils/tokenManager');
    const tokens = await tokenManager.generateTokenPair(
      admin, 
      'admin', 
      deviceId, 
      deviceInfo
    );

    res.json({
      success: true,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: admin._id,
        username: admin.username,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi đăng nhập admin',
      error: error.message 
    });
  }
};

/**
 * Get dashboard statistics
 * GET /api/v1/admin/dashboard
 */
exports.getDashboard = async (req, res) => {
  try {
    // Count total pets
    const totalPets = await Pet.countDocuments();
    
    // Count pets by status
    const linkedPets = await Pet.countDocuments({ status: 'linked' });
    const unlinkedPets = await Pet.countDocuments({ status: 'unlinked' });
    
    // Count total users
    const totalUsers = await User.countDocuments();
    
    // Count total themes
    const totalThemes = await Theme.countDocuments();
    
    // Count total scans
    const totalScans = await QRScan.countDocuments();
    
    // Get recent scans
    const recentScans = await QRScan.find()
      .sort({ scannedAt: -1 })
      .limit(10)
      .populate('pet', 'info.name qrToken')
      .lean();
    
    // Get recent users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email createdAt')
      .lean();
    
    // Get recent pets
    const recentPets = await Pet.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('info.name info.species qrToken status createdAt')
      .lean();
    
    // Get scans by day for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const scansByDay = await QRScan.aggregate([
      {
        $match: {
          scannedAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$scannedAt" },
            month: { $month: "$scannedAt" },
            day: { $dayOfMonth: "$scannedAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: {
              year: "$_id.year",
              month: "$_id.month",
              day: "$_id.day"
            }
          },
          count: 1
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);
    
    // Return dashboard data
    res.json({
      success: true,
      data: {
        stats: {
          totalPets,
          linkedPets,
          unlinkedPets,
          totalUsers,
          totalThemes,
          totalScans
        },
        recentScans: recentScans.map(scan => ({
          id: scan._id,
          petName: scan.pet?.info?.name || 'Unknown Pet',
          petId: scan.pet?._id,
          scannedAt: scan.scannedAt,
          location: scan.location || null
        })),
        recentUsers: recentUsers.map(user => ({
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt
        })),
        recentPets: recentPets.map(pet => ({
          id: pet._id,
          name: pet.info?.name || 'Unnamed Pet',
          species: pet.info?.species || 'Unknown',
          status: pet.status,
          qrToken: pet.qrToken,
          createdAt: pet.createdAt
        })),
        scansByDay
      }
    });
    
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load admin dashboard',
      error: error.message
    });
  }
};

/**
 * Get all pets with pagination
 * GET /api/v1/admin/pets
 */
exports.getPets = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Filter options
    const filter = {};
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.species) {
      filter['info.species'] = req.query.species;
    }
    
    if (req.query.search) {
      const search = req.query.search;
      filter.$or = [
        { 'info.name': { $regex: search, $options: 'i' } },
        { qrToken: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Get pets
    const pets = await Pet.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('ownerAccount', 'name email')
      .lean();
    
    // Get total count
    const total = await Pet.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        pets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Admin get pets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load pets',
      error: error.message
    });
  }
};

/**
 * Get all users with pagination
 * GET /api/v1/admin/users
 */
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Filter options
    const filter = {};
    
    if (req.query.search) {
      const search = req.query.search;
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Get users
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-password -refreshTokens')
      .lean();
    
    // Get total count
    const total = await User.countDocuments(filter);
    
    // Get pet counts for each user
    const userIds = users.map(user => user._id);
    const petCounts = await Pet.aggregate([
      {
        $match: {
          ownerAccount: { $in: userIds }
        }
      },
      {
        $group: {
          _id: '$ownerAccount',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Map pet counts to users
    const usersWithPetCount = users.map(user => {
      const petCount = petCounts.find(pc => pc._id.toString() === user._id.toString());
      return {
        ...user,
        petCount: petCount ? petCount.count : 0
      };
    });
    
    res.json({
      success: true,
      data: {
        users: usersWithPetCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load users',
      error: error.message
    });
  }
};

/**
 * Get pet details
 * GET /api/v1/admin/pet/:petId
 */
exports.getPetDetails = async (req, res) => {
  try {
    const { petId } = req.params;
    
    // Get pet details
    const pet = await Pet.findById(petId)
      .populate('ownerAccount', 'name email phone')
      .populate('themeId')
      .lean();
    
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }
    
    // Get scan history
    const scans = await QRScan.find({ pet: petId })
      .sort({ scannedAt: -1 })
      .limit(10)
      .lean();
    
    res.json({
      success: true,
      data: {
        pet,
        scans
      }
    });
    
  } catch (error) {
    console.error('Admin get pet details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load pet details',
      error: error.message
    });
  }
};

/**
 * Update pet
 * PUT /api/v1/admin/pet/:petId
 */
exports.updatePet = async (req, res) => {
  try {
    const { petId } = req.params;
    const updateData = req.body;
    
    // Validate update data
    const allowedFields = [
      'info',
      'owner',
      'status',
      'visibility',
      'allergicInfo',
      'preferences',
      'vaccinations',
      'reExaminations'
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
    
    if (!updatedPet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Pet updated successfully',
      data: updatedPet
    });
    
  } catch (error) {
    console.error('Admin update pet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update pet',
      error: error.message
    });
  }
};

/**
 * Delete pet
 * DELETE /api/v1/admin/pet/:petId
 */
exports.deletePet = async (req, res) => {
  try {
    const { petId } = req.params;
    
    // Delete pet
    const pet = await Pet.findByIdAndDelete(petId);
    
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }
    
    // Remove pet from user's pets array if it was linked
    if (pet.ownerAccount) {
      await User.findByIdAndUpdate(
        pet.ownerAccount,
        { $pull: { pets: petId } }
      );
    }
    
    // Remove pet from any theme applications
    await UserTheme.updateMany(
      {},
      { $pull: { appliedToPets: { petId } } }
    );
    
    res.json({
      success: true,
      message: 'Pet deleted successfully'
    });
    
  } catch (error) {
    console.error('Admin delete pet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete pet',
      error: error.message
    });
  }
}; 