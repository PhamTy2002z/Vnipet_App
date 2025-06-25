const express = require('express');
const router = express.Router();
const wrap = require('../utils/asyncWrap');

// Controllers
const {
  completeInitialSetup,
  getCurrentUser,
  checkPetStatus,
  forgotPassword,
  verifyOTP,
  resetPassword,
  verifyEmail,
  resendVerification,
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/auth/petOwnerAuthController');

const {
  updatePetOwnerEmail,
  updateAllergicInfo,
  updatePetDescription,
} = require('../controllers/user/userController');

// Import updatePet from pet controller instead of user controller
const { updatePet } = require('../controllers/pet/petController');

const { uploadAvatar } = require('../controllers/media/petImageController');

const {
  getStoreThemes,
  purchaseTheme,
  purchaseThemeForPet,
  getPurchasedThemes,
  getUserPurchaseHistory,
  applyThemeToPet,
  getActiveThemes,
  getUserThemeCollection
} = require('../controllers/theme/themeController');

// Import card preview controllers
const {
  getPreviewableThemes,
  getSingleThemePreview
} = require('../controllers/card-preview');

const {
  getPetPreferences,
  getPetDetail: getPetDetailOptimized,
  getPetMedicalHistory,
  getPetVaccinations,
  updatePetPreferences,
  updatePreferenceField,
  resetPetPreferences,
  addFavoriteFood,
  removeFavoriteFood
} = require('../controllers/pet/petPreferencesController');

// Middleware
const {
  authPetOwnerMiddleware,
  authPetOwnership,
  optionalAuthPetOwner,
  authPetViewing
} = require('../middleware/authPetOwner');

// Legacy pet controller methods
const {
  getPets,
  createPet,
  deletePet,
  getPetDetail
} = require('../controllers/user/userController');

/* ===== Authentication Routes ===== */

/**
 * DEPRECATED: Register and login routes have been moved to mobile auth endpoints
 * Please use the following endpoints instead:
 * - Register: POST /api/v1/auth/mobile-register
 * - Login: POST /api/v1/auth/mobile-login
 * - Refresh Token: POST /api/v1/auth/refresh-token
 * - Logout: POST /api/v1/auth/logout
 */

/**
 * Verify email
 * POST /api/v1/pet-owner/verify-email
 */
router.post('/verify-email', wrap(verifyEmail));

/**
 * Resend verification email
 * POST /api/v1/pet-owner/resend-verification
 */
router.post('/resend-verification', wrap(resendVerification));

/**
 * Forgot password - Send OTP to email
 * POST /api/v1/pet-owner/forgot-password
 */
router.post('/forgot-password', wrap(forgotPassword));

/**
 * Verify OTP code for password reset
 * POST /api/v1/pet-owner/verify-otp
 */
router.post('/verify-otp', wrap(verifyOTP));

/**
 * Reset password with new password
 * POST /api/v1/pet-owner/reset-password
 */
router.post('/reset-password', wrap(resetPassword));

/**
 * Get current user info and their pets
 * GET /api/v1/pet-owner/me
 */
router.get('/me', authPetOwnerMiddleware, wrap(getCurrentUser));

/* ===== Pet Profile Routes ===== */

/**
 * Check pet status for QR code scanning
 * Determines if registration is required or if public viewing is allowed
 * GET /api/v1/pet-owner/check-pet/:petId
 */
router.get('/check-pet/:petId', optionalAuthPetOwner, wrap(checkPetStatus));

/**
 * Get pet profile with appropriate access control
 * Public viewing allowed for unregistered pets or if pet.visibility.isPubliclyViewable = true
 * Full access for owners
 * GET /api/v1/pet-owner/pets/:id
 */
router.get('/pets/:id', optionalAuthPetOwner, authPetViewing, (req, res) => {
  const petData = req.pet.toObject();
  
  // Include security and ownership information
  petData.viewerInfo = {
    isOwner: req.isOwner,
    canEdit: req.canEdit,
    canViewContact: req.canViewContact,
    isPublicViewing: !req.isOwner
  };
  
  // Only include full owner info if viewer can see contact details
  if (!req.canViewContact && petData.owner) {
    // Remove sensitive contact info for public viewers
    delete petData.owner.email;
    delete petData.owner.phone;
  }
  
  // Include preferences with default values if not set
  petData.preferences = petData.preferences || {
    favoriteFoods: [],
    favoriteShampoo: '',
    dailyRoutine: ''
  };
  
  // Include avatar URL
  const { getAvatarUrl } = require('../controllers/media/petImageController');
  petData.avatarUrl = getAvatarUrl(req.pet);
  
  res.json(petData);
});

/**
 * Complete initial setup after registration
 * POST /api/v1/pet-owner/complete-setup/:petId
 */
router.post('/complete-setup/:petId', authPetOwnerMiddleware, wrap(completeInitialSetup));

/* ===== Protected Pet Editing Routes (Require Authentication & Ownership) ===== */

/**
 * Update pet profile (requires ownership)
 * PUT /api/v1/pet-owner/pets/:id
 */
router.put('/pets/:id', authPetOwnerMiddleware, authPetOwnership, wrap(async (req, res) => {
  // Use existing updatePet controller but ensure ownership
  req.params.id = req.pet._id.toString();
  return updatePet(req, res);
}));

/**
 * Update pet owner email (requires ownership)
 * POST /api/v1/pet-owner/pets/:id/owner-email
 */
router.post('/pets/:id/owner-email', authPetOwnerMiddleware, authPetOwnership, wrap(async (req, res) => {
  req.params.id = req.pet._id.toString();
  return updatePetOwnerEmail(req, res);
}));

/**
 * Update allergic info (requires ownership)
 * PUT /api/v1/pet-owner/pets/:id/allergic-info
 */
router.put('/pets/:id/allergic-info', authPetOwnerMiddleware, authPetOwnership, wrap(async (req, res) => {
  req.params.id = req.pet._id.toString();
  return updateAllergicInfo(req, res);
}));

/**
 * Update pet description (requires ownership)
 * PUT /api/v1/pet-owner/pets/:id/description
 */
router.put('/pets/:id/description', authPetOwnerMiddleware, authPetOwnership, wrap(async (req, res) => {
  req.params.id = req.pet._id.toString();
  return updatePetDescription(req, res);
}));

/**
 * Upload pet avatar (requires ownership)
 * POST /api/v1/pet-owner/pets/:id/avatar
 */
router.post('/pets/:id/avatar', authPetOwnerMiddleware, authPetOwnership, (req, res, next) => {
  req.params.id = req.pet._id.toString();
  // uploadAvatar là một mảng middleware, nên cần apply từng middleware
  const uploadAvatarMiddleware = uploadAvatar;
  return uploadAvatarMiddleware[0](req, res, (err) => {
    if (err) return next(err);
    uploadAvatarMiddleware[1](req, res, next);
  });
});

/**
 * Delete pet avatar (requires ownership)
 * DELETE /api/v1/pet-owner/pets/:id/avatar
 */
router.delete('/pets/:id/avatar', authPetOwnerMiddleware, authPetOwnership, wrap(async (req, res) => {
  req.params.id = req.pet._id.toString();
  const { deleteAvatar } = require('../controllers/media/petImageController');
  return deleteAvatar(req, res);
}));

/* ===== Pet Preferences Routes ===== */

/**
 * Get pet preferences (requires ownership)
 * GET /api/v1/pet-owner/pets/:id/preferences
 */
router.get('/pets/:id/preferences', authPetOwnerMiddleware, authPetOwnership, wrap(async (req, res) => {
  req.params.id = req.pet._id.toString();
  return getPetPreferences(req, res);
}));

/**
 * Update pet preferences (requires ownership)
 * PUT /api/v1/pet-owner/pets/:id/preferences
 */
router.put('/pets/:id/preferences', authPetOwnerMiddleware, authPetOwnership, wrap(async (req, res) => {
  req.params.id = req.pet._id.toString();
  return updatePetPreferences(req, res);
}));

/**
 * Update specific preference field (requires ownership)
 * PATCH /api/v1/pet-owner/pets/:id/preferences/:field
 */
router.patch('/pets/:id/preferences/:field', authPetOwnerMiddleware, authPetOwnership, wrap(async (req, res) => {
  req.params.id = req.pet._id.toString();
  return updatePreferenceField(req, res);
}));

/**
 * Reset pet preferences (requires ownership)
 * DELETE /api/v1/pet-owner/pets/:id/preferences
 */
router.delete('/pets/:id/preferences', authPetOwnerMiddleware, authPetOwnership, wrap(async (req, res) => {
  req.params.id = req.pet._id.toString();
  return resetPetPreferences(req, res);
}));

/**
 * Add a favorite food (requires ownership)
 * POST /api/v1/pet-owner/pets/:id/preferences/favorite-foods
 */
router.post('/pets/:id/preferences/favorite-foods', authPetOwnerMiddleware, authPetOwnership, wrap(async (req, res) => {
  req.params.id = req.pet._id.toString();
  return addFavoriteFood(req, res);
}));

/**
 * Remove a favorite food (requires ownership)
 * DELETE /api/v1/pet-owner/pets/:id/preferences/favorite-foods/:food
 */
router.delete('/pets/:id/preferences/favorite-foods/:food', authPetOwnerMiddleware, authPetOwnership, wrap(async (req, res) => {
  req.params.id = req.pet._id.toString();
  return removeFavoriteFood(req, res);
}));

/* ===== Pet Visibility Settings ===== */

/**
 * Update pet visibility settings
 * PUT /api/v1/pet-owner/pets/:id/visibility
 */
router.put('/pets/:id/visibility', authPetOwnerMiddleware, authPetOwnership, wrap(async (req, res) => {
  const { isPubliclyViewable, allowContactView } = req.body;
  
  if (typeof isPubliclyViewable !== 'boolean' || typeof allowContactView !== 'boolean') {
    return res.status(400).json({ 
      error: 'isPubliclyViewable and allowContactView must be boolean values' 
    });
  }
  
  const Pet = require('../models/Pet');
  const updatedPet = await Pet.findByIdAndUpdate(
    req.pet._id,
    {
      'visibility.isPubliclyViewable': isPubliclyViewable,
      'visibility.allowContactView': allowContactView
    },
    { new: true }
  ).populate('ownerAccount', 'name email phone');
  
  res.json({
    success: true,
    pet: updatedPet,
    message: 'Visibility settings updated successfully'
  });
}));

/* ===== User Profile Management ===== */

/**
 * Get user profile information
 * GET /api/v1/pet-owner/profile
 */
router.get('/profile', authPetOwnerMiddleware, wrap(getProfile));

/**
 * Update user profile information
 * PUT /api/v1/pet-owner/profile
 */
router.put('/profile', authPetOwnerMiddleware, wrap(updateProfile));

/**
 * Change password
 * POST /api/v1/pet-owner/change-password
 */
router.put('/change-password', authPetOwnerMiddleware, wrap(changePassword));

/* ===== Theme Store Routes ===== */

/**
 * Get all available themes for store browsing
 * GET /api/v1/pet-owner/store/themes
 */
router.get('/store/themes', wrap(getStoreThemes));

/**
 * Get single theme details - Public access for mobile app
 * GET /api/v1/pet-owner/store/themes/:theme_id
 */
router.get('/store/themes/:theme_id', wrap(async (req, res) => {
  try {
    const { theme_id } = req.params;
    
    // Find theme in database
    const Theme = require('../models/Theme');
    const theme = await Theme.findById(theme_id);
    
    if (!theme) {
      return res.status(404).json({
        success: false,
        message: 'Theme not found'
      });
    }
    
    if (!theme.isActive || !theme.inStore) {
      return res.status(403).json({
        success: false,
        message: 'Theme is not available'
      });
    }
    
    // Check if user owns this theme (if authenticated)
    let isOwned = false;
    if (req.user?.id) {
      const UserTheme = require('../models/UserTheme');
      const userTheme = await UserTheme.findOne({
        userId: req.user.id,
        themeId: theme_id
      });
      isOwned = !!userTheme;
    }
    
    // Format theme data for response
    const themeData = theme.toObject();
    
    // Generate preview URLs from R2 if available
    themeData.previewUrl = null;
    if (theme.image && theme.image.publicUrl) {
      themeData.previewUrl = theme.image.publicUrl;
    } else if (theme.imageUrl) {
      themeData.previewUrl = theme.imageUrl;
    }
    
    // Set ownership status
    themeData.isOwned = isOwned;
    
    // Return theme details with any available preview data
    res.json({
      success: true,
      data: themeData
    });
  } catch (error) {
    console.error('Get theme details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load theme details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

/**
 * Get user's theme collection
 * GET /api/v1/pet-owner/themes/collection
 */
router.get('/themes/collection', authPetOwnerMiddleware, wrap(getUserThemeCollection));

/**
 * Purchase theme (centralized, not tied to specific pet)
 * POST /api/v1/pet-owner/themes/purchase
 */
router.post('/themes/purchase', authPetOwnerMiddleware, wrap(async (req, res) => {
  try {
    const userId = req.user.id;
    const { themeId } = req.body;

    if (!themeId) {
      return res.status(400).json({ 
        success: false,
        error: 'Theme ID is required' 
      });
    }

    const Theme = require('../models/Theme');
    const UserTheme = require('../models/UserTheme');
    const PetOwnerUser = require('../models/PetOwnerUser');

    // Find the theme
    const theme = await Theme.findById(themeId);
    if (!theme) {
      return res.status(404).json({
        success: false,
        message: 'Theme not found'
      });
    }

    if (!theme.inStore || !theme.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Theme is not available for purchase'
      });
    }

    // Check if user already owns this theme
    const existingPurchase = await UserTheme.findOne({ userId, themeId });
    if (existingPurchase) {
      return res.status(400).json({
        success: false,
        message: 'You already own this theme'
      });
    }

    // Generate transaction ID
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Create theme purchase record
    const userTheme = new UserTheme({
      userId,
      themeId,
      purchaseDate: new Date(),
      transactionId,
      purchasePrice: theme.price || 0
    });

    await userTheme.save();

    // Add to user's purchased themes array (for quick reference)
    const user = await PetOwnerUser.findById(userId);
    if (user) {
      user.addPurchasedTheme(themeId, transactionId);
      await user.save();
    }

    // Return purchase confirmation
    res.json({
      success: true,
      message: 'Theme purchased successfully',
      data: {
        transactionId,
        theme: {
          id: theme._id,
          name: theme.name,
          price: theme.price,
          imageUrl: theme.image?.publicUrl || theme.imageUrl || null
        },
        purchaseDate: userTheme.purchaseDate
      }
    });

  } catch (error) {
    console.error('Theme purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to purchase theme',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

/**
 * Purchase theme for a pet (legacy endpoint)
 * POST /api/v1/pet-owner/store/purchase
 */
router.post('/store/purchase', authPetOwnerMiddleware, wrap(purchaseThemeForPet));

/**
 * Get purchased themes for a pet (requires ownership)
 * GET /api/v1/pet-owner/pets/:id/purchased-themes
 */
router.get('/pets/:id/purchased-themes', authPetOwnerMiddleware, authPetOwnership, wrap(async (req, res) => {
  req.params.petId = req.pet._id.toString();
  return getPurchasedThemes(req, res);
}));

/**
 * Get purchase history for the authenticated user
 * GET /api/v1/pet-owner/purchase-history
 */
router.get('/purchase-history', authPetOwnerMiddleware, wrap(getUserPurchaseHistory));

/**
 * Apply purchased theme to pet (requires ownership)
 * POST /api/v1/pet-owner/pets/:id/apply-theme
 */
router.post('/pets/:id/apply-theme', authPetOwnerMiddleware, authPetOwnership, wrap(async (req, res) => {
  const { themeId } = req.body;
  
  if (!themeId) {
    return res.status(400).json({
      success: false,
      message: 'Theme ID is required'
    });
  }
  
  // Gán themeId vào params để hàm applyThemeToPet có thể xử lý đúng
  req.params.themeId = themeId;
  req.body = {
    petId: req.pet._id.toString()
  };
  
  // Logging để debug
  console.log('Applying theme:', {
    userId: req.user.id,
    themeId: req.params.themeId,
    petId: req.body.petId
  });
  
  return applyThemeToPet(req, res);
}));

/**
 * Get available themes for a pet (free + purchased themes)
 * GET /api/v1/pet-owner/pets/:id/available-themes
 */
router.get('/pets/:id/available-themes', authPetOwnerMiddleware, authPetOwnership, wrap(async (req, res) => {
  req.query.petId = req.pet._id.toString();
  return getActiveThemes(req, res);
}));

/* ===== Card Preview Routes ===== */

/**
 * Get all previewable themes owned by user (for Card Swiper/Carousel)
 * GET /api/v1/pet-owner/card-preview/themes
 */
router.get('/card-preview/themes', authPetOwnerMiddleware, wrap(getPreviewableThemes));

/**
 * Get detailed preview for a specific theme
 * GET /api/v1/pet-owner/card-preview/themes/:themeId
 */
router.get('/card-preview/themes/:themeId', authPetOwnerMiddleware, wrap(getSingleThemePreview));

/* ===== Pet Management Routes ===== */

/**
 * Get all pets with lazy loading and optimized for mobile
 * GET /api/v1/pet-owner/optimized-pets
 */
router.get('/optimized-pets', authPetOwnerMiddleware, wrap(getPetPreferences));

/**
 * Legacy get pets route
 * GET /api/v1/pet-owner/pets
 */
router.get('/pets', authPetOwnerMiddleware, wrap(getPets));

/**
 * Create a new pet
 * POST /api/v1/pet-owner/pets
 */
router.post('/pets', authPetOwnerMiddleware, wrap(createPet));

/**
 * Get pet details optimized for mobile
 * GET /api/v1/pet-owner/optimized-pets/:petId
 */
router.get('/optimized-pets/:petId', authPetOwnerMiddleware, wrap(getPetDetailOptimized));

/**
 * Update a pet
 * PUT /api/v1/pet-owner/pets/:petId
 */
router.put('/pets/:petId', authPetOwnerMiddleware, authPetOwnership, wrap(updatePet));

/**
 * Delete a pet
 * DELETE /api/v1/pet-owner/pets/:petId
 */
router.delete('/pets/:petId', authPetOwnerMiddleware, authPetOwnership, wrap(deletePet));

/**
 * Get pet medical history with lazy loading
 * GET /api/v1/pet-owner/pets/:petId/history
 */
router.get('/pets/:petId/history', authPetOwnerMiddleware, wrap(getPetMedicalHistory));

/**
 * Get pet vaccinations with lazy loading
 * GET /api/v1/pet-owner/pets/:petId/vaccinations
 */
router.get('/pets/:petId/vaccinations', authPetOwnerMiddleware, wrap(getPetVaccinations));

module.exports = router; 