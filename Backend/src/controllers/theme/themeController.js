/**
 * Theme Controller
 * Quản lý theme cho thú cưng
 */

const Theme = require('../../models/Theme');
const UserTheme = require('../../models/UserTheme');
const User = require('../../models/PetOwnerUser');
const Pet = require('../../models/Pet');
const ThemeOrder = require('../../models/ThemeOrder');

/**
 * Get all themes for store
 * GET /api/v1/theme/store
 */
exports.getStoreThemes = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    // Get all active themes
    const themes = await Theme.find({ isActive: true, inStore: true })
      .select('name description price category image isPremium isActive')
      .sort({ order: 1, createdAt: -1 });
    
    // If user is authenticated, check which themes they own
    let userThemes = [];
    if (userId) {
      userThemes = await UserTheme.find({ userId })
        .select('themeId appliedToPets')
        .lean();
    }
    
    // Map themes with ownership info
    const themesWithOwnership = themes.map(theme => {
      const themeObj = theme.toObject();
      
      // Add preview URL for mobile app
      themeObj.previewUrl = theme.image?.publicUrl || null;
      
      // Check if user owns this theme
      if (userId) {
        const userTheme = userThemes.find(ut => 
          ut.themeId.toString() === theme._id.toString()
        );
        
        themeObj.isOwned = !!userTheme;
        themeObj.appliedToPets = userTheme ? userTheme.appliedToPets : [];
      } else {
        themeObj.isOwned = false;
        themeObj.appliedToPets = [];
      }
      
      return themeObj;
    });
    
    res.json({
      success: true,
      data: themesWithOwnership
    });
    
  } catch (error) {
    console.error('Get store themes error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to load store themes',
      error: error.message
    });
  }
};

/**
 * Get theme details
 * GET /api/v1/theme/:themeId
 */
exports.getThemeDetails = async (req, res) => {
  try {
    const { themeId } = req.params;
    const userId = req.user?.id;
    
    // Get theme details
    const theme = await Theme.findById(themeId);
    if (!theme || !theme.isActive) {
      return res.status(404).json({ 
        success: false,
        message: 'Theme not found' 
      });
    }
    
    const themeData = theme.toObject();
    
    // Add preview URL for mobile app
    themeData.previewUrl = theme.image?.publicUrl || null;
    
    // Check if user owns this theme
    if (userId) {
      const userTheme = await UserTheme.findOne({ 
        userId, 
        themeId 
      });
      
      themeData.isOwned = !!userTheme;
      themeData.appliedToPets = userTheme ? userTheme.appliedToPets : [];
      
      // Get pet details for applied pets
      if (userTheme && userTheme.appliedToPets.length > 0) {
        const petIds = userTheme.appliedToPets.map(ap => ap.petId);
        const pets = await Pet.find({ 
          _id: { $in: petIds },
          ownerAccount: userId
        })
        .select('info.name qrToken');
        
        themeData.appliedPets = pets.map(pet => ({
          id: pet._id,
          name: pet.info?.name || 'Unnamed Pet',
          qrToken: pet.qrToken
        }));
      }
    } else {
      themeData.isOwned = false;
      themeData.appliedToPets = [];
    }
    
    res.json({
      success: true,
      data: themeData
    });
    
  } catch (error) {
    console.error('Get theme details error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to load theme details',
      error: error.message
    });
  }
};

/**
 * Purchase a theme
 * POST /api/v1/theme/:themeId/purchase
 */
exports.purchaseTheme = async (req, res) => {
  try {
    const { themeId } = req.params;
    const userId = req.user.id;
    const { transactionId } = req.body;
    
    // Check if theme exists
    const theme = await Theme.findById(themeId);
    if (!theme || !theme.isActive) {
      return res.status(404).json({ 
        success: false,
        message: 'Theme not found' 
      });
    }
    
    // Check if theme is available in store
    if (!theme.inStore) {
      return res.status(403).json({
        success: false,
        message: 'Theme is not available for purchase'
      });
    }
    
    // Check if user already owns this theme
    const existingUserTheme = await UserTheme.findOne({ 
      userId, 
      themeId 
    });
    
    if (existingUserTheme) {
      return res.status(400).json({ 
        success: false,
        message: 'You already own this theme' 
      });
    }
    
    // Generate transaction ID if not provided
    const txId = transactionId || `purchase_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    // Create user theme
    const userTheme = await UserTheme.create({
      userId,
      themeId,
      purchaseDate: new Date(),
      transactionId: txId,
      purchasePrice: theme.price || 0,
      isActive: true,
      appliedToPets: []
    });
    
    // Add theme to user's purchased themes
    await User.findByIdAndUpdate(
      userId,
      { 
        $push: { 
          purchasedThemes: {
            themeId,
            purchaseDate: new Date(),
            transactionId: txId
          } 
        } 
      }
    );
    
    // Generate preview URL for response
    let previewUrl = null;
    if (theme.image && theme.image.publicUrl) {
      previewUrl = theme.image.publicUrl;
    } else if (theme.imageUrl) {
      previewUrl = theme.imageUrl;
    }
    
    // Tạo hoá đơn mới (1 sản phẩm)
    const order = await ThemeOrder.create({
      userId,
      items: [{
        themeId: theme._id,
        userThemeId: userTheme._id,
        price: theme.price,
        name: theme.name,
      }],
      totalPrice: theme.price || 0,
      transactionId: txId,
      purchaseDate: new Date(),
    });
    
    res.status(201).json({
      success: true,
      message: 'Theme purchased successfully',
      data: {
        order,
        userThemeId: userTheme._id,
        themeId: theme._id,
        name: theme.name,
        previewUrl: previewUrl,
        price: theme.price,
        purchaseDate: userTheme.purchaseDate,
        transactionId: txId
      }
    });
    
  } catch (error) {
    console.error('Purchase theme error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to purchase theme',
      error: error.message
    });
  }
};

/**
 * Apply theme to pet
 * POST /api/v1/theme/:themeId/apply
 */
exports.applyThemeToPet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { themeId } = req.params;
    const { petId } = req.body;

    // Validate input
    if (!petId) {
      return res.status(400).json({
        success: false,
        message: 'Pet ID is required'
      });
    }

    if (!themeId) {
      return res.status(400).json({
        success: false,
        message: 'Theme ID is required'
      });
    }

    // Verify user owns the pet
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
    
    // Convert themeId to string to ensure consistent comparison
    const themeIdStr = themeId.toString();
    
    // Check if user owns the theme - findOne for better performance
    const userTheme = await UserTheme.findOne({ 
      userId,
      themeId: themeIdStr,
      isActive: true
    });
    
    if (!userTheme) {
      return res.status(404).json({
        success: false,
        message: 'Theme not found in your purchased themes'
      });
    }

    // IMPORTANT: Remove pet from all previous theme applications
    // Only one theme can be applied to a pet at a time
    if (pet.themeId) {
      // Remove this pet from any previously applied theme
      await UserTheme.updateMany(
        { userId },
        { $pull: { appliedToPets: { petId } } }
      );
    }

    // Apply the new theme to pet
    pet.themeId = themeId;
    await pet.save();

    // Update theme application tracking for the new theme
    userTheme.applyToPet(petId);
    await userTheme.save();

    res.json({
      success: true,
      message: 'Theme successfully applied to pet',
      data: {
        petId,
        themeId,
        appliedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Apply theme error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply theme',
      error: error.message
    });
  }
};

/**
 * Remove theme from pet
 * POST /api/v1/theme/:themeId/remove
 */
exports.removeThemeFromPet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { themeId } = req.params;
    const { petId } = req.body;

    if (!petId) {
      return res.status(400).json({
        success: false,
        message: 'Pet ID is required'
      });
    }

    // Verify user owns the pet
    const pet = await Pet.findById(petId);
    if (!pet || !pet.isOwnedBy(userId)) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found or not owned by you'
      });
    }

    // Remove theme from pet
    pet.themeId = null;
    await pet.save();

    // Update theme application tracking
    const userTheme = await UserTheme.findOne({ userId, themeId });
    if (userTheme) {
      userTheme.removeFromPet(petId);
      await userTheme.save();
    }

    res.json({
      success: true,
      message: 'Theme successfully removed from pet'
    });

  } catch (error) {
    console.error('Remove theme error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove theme',
      error: error.message
    });
  }
};

/**
 * Get user's purchased themes
 * GET /api/v1/theme/purchased
 */
exports.getPurchasedThemes = async (req, res) => {
  try {
    const userId = req.user.id;

    const userThemes = await UserTheme.find({ userId, isActive: true })
      .populate('themeId', 'name description imageUrl image price category')
      .populate('appliedToPets.petId', 'info.name qrToken')
      .lean();

    res.json({
      success: true,
      data: userThemes
    });

  } catch (error) {
    console.error('Get themes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load purchased themes',
      error: error.message
    });
  }
};

/**
 * Get user's theme collection
 * GET /api/v1/pet-owner/themes/collection
 */
exports.getUserThemeCollection = async (req, res) => {
  try {
    const userId = req.user.id;

    const userThemes = await UserTheme.find({ userId, isActive: true })
      .populate({
        path: 'themeId',
        select: 'name description price category isPremium image imageUrl presetKey isActive'
      })
      .lean();

    // Format the response
    const formattedThemes = userThemes.map(item => {
      // Skip themes where the actual theme has been deleted
      if (!item.themeId) return null;
      
      const theme = item.themeId;
      
      // Handle theme image safely
      let previewUrl = null;
      if (theme.image && theme.image.publicUrl) {
        previewUrl = theme.image.publicUrl;
      } else if (theme.imageUrl) {
        previewUrl = theme.imageUrl;
      }
      
      return {
        _id: theme._id,
        name: theme.name,
        description: theme.description,
        price: theme.price,
        isPremium: theme.isPremium,
        presetKey: theme.presetKey,
        purchaseDate: item.purchaseDate,
        transactionId: item.transactionId,
        isActive: theme.isActive,
        previewUrl: previewUrl,
        appliedToPets: item.appliedToPets || []
      };
    }).filter(Boolean); // Filter out null entries
    
    res.json({
      success: true,
      data: formattedThemes
    });
  } catch (error) {
    console.error('Get user theme collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load your theme collection',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 