const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/user/dashboardController');
const petController = require('../controllers/pet/petController');
const themeController = require('../controllers/theme/themeController');
const { authPetOwnerMiddleware } = require('../middleware/authPetOwner');
const { getProfile, updateProfile, changePassword } = require('../controllers/auth/petOwnerAuthController');
const wrap = require('../utils/asyncWrap');

// All account routes require authentication
router.use(authPetOwnerMiddleware);

// Dashboard and account info
router.get('/dashboard', wrap(dashboardController.getDashboard));

// Profile management
router.get('/profile', wrap(getProfile));
router.put('/profile', wrap(updateProfile));
router.put('/password', wrap(changePassword));

// Test route to verify mounting
router.get('/test', (req, res) => {
  console.log('✅ Account routes are mounted correctly');
  res.json({ message: 'Account routes working', user: req.user?.id });
});

// QR code linking
router.post('/scan-qr', wrap(petController.scanAndLinkQR));

// Pet management
router.get('/pets/:petId', wrap(petController.getPetDetails));
router.delete('/pets/:petId/unlink', wrap(petController.unlinkPet));

// Theme management
router.get('/themes', wrap(themeController.getPurchasedThemes));
router.post('/themes/:themeId/apply', wrap(themeController.applyThemeToPet));
router.post('/themes/:themeId/remove', wrap(themeController.removeThemeFromPet));

// Theme purchasing
router.post('/themes/:themeId/purchase', wrap(themeController.purchaseTheme));

// Get available themes for store (with ownership info)
router.get('/store/themes', wrap(themeController.getStoreThemes));

module.exports = router; 