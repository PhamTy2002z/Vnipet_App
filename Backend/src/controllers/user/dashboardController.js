/**
 * Dashboard Controller
 * Quản lý dashboard người dùng
 */

const User = require('../../models/PetOwnerUser');
const Pet = require('../../models/Pet');
const UserTheme = require('../../models/UserTheme');
const Theme = require('../../models/Theme');

/**
 * Get user dashboard data
 * GET /api/v1/user/dashboard
 */
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user data
    const user = await User.findById(userId)
      .populate('purchasedThemes.themeId', 'name description previewImage price');
    
    // Get pets owned by this user
    const pets = await Pet.find({ ownerAccount: userId })
      .populate('themeId', 'name description previewImage')
      .select('qrToken info avatar themeId status linking visibility')
      .sort({ createdAt: -1 });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Get purchased themes with application info
    const userThemes = await UserTheme.find({ userId })
      .populate('themeId', 'name description previewImage price')
      .lean();

    // Calculate dashboard stats
    const stats = {
      totalPets: pets.length,
      activePets: pets.filter(pet => pet.status === 'active').length,
      linkedPets: pets.filter(pet => pet.status === 'linked').length,
      totalThemes: userThemes.length,
      appliedThemes: userThemes.reduce((acc, theme) => acc + theme.appliedToPets.length, 0)
    };

    const dashboardData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        accountTier: user.accountTier,
        totalPetsLimit: user.totalPetsLimit,
        preferences: user.preferences
      },
      pets: pets,
      purchasedThemes: userThemes,
      stats,
      canAddMorePets: user.canAddMorePets()
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load dashboard',
      error: error.message
    });
  }
};

/**
 * Get user activity
 * GET /api/v1/user/activity
 */
exports.getUserActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get recent pet scans
    const QRScan = require('../../models/QRScan');
    const recentScans = await QRScan.find({ 
      'pet.ownerAccount': userId 
    })
    .sort({ scannedAt: -1 })
    .limit(10)
    .populate('pet', 'info.name qrToken')
    .lean();
    
    // Get recent theme purchases
    const recentPurchases = await UserTheme.find({ 
      userId,
      purchaseDate: { $exists: true } 
    })
    .sort({ purchaseDate: -1 })
    .limit(5)
    .populate('themeId', 'name previewImage price')
    .lean();
    
    // Get recent pet links
    const recentLinks = await Pet.find({
      ownerAccount: userId,
      'linking.linkedAt': { $exists: true }
    })
    .sort({ 'linking.linkedAt': -1 })
    .limit(5)
    .select('info.name qrToken linking.linkedAt')
    .lean();
    
    res.json({
      success: true,
      data: {
        recentScans: recentScans.map(scan => ({
          id: scan._id,
          petName: scan.pet?.info?.name || 'Unknown Pet',
          petId: scan.pet?._id,
          scannedAt: scan.scannedAt,
          location: scan.location || null,
          device: scan.deviceInfo || null
        })),
        recentPurchases: recentPurchases.map(purchase => ({
          id: purchase._id,
          themeName: purchase.themeId?.name || 'Unknown Theme',
          themeId: purchase.themeId?._id,
          purchaseDate: purchase.purchaseDate,
          price: purchase.themeId?.price || 0,
          previewImage: purchase.themeId?.previewImage || null
        })),
        recentLinks: recentLinks.map(pet => ({
          id: pet._id,
          name: pet.info?.name || 'Unnamed Pet',
          linkedAt: pet.linking?.linkedAt,
          qrToken: pet.qrToken
        }))
      }
    });
    
  } catch (error) {
    console.error('User activity error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load user activity',
      error: error.message
    });
  }
}; 