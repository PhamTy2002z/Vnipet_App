const express = require('express');
const router = express.Router();
const wrap = require('../utils/asyncWrap');
const themeController = require('../controllers/theme/themeController');
const { authUserMiddleware } = require('../middleware/authMiddleware');

// Public routes
router.get('/store', wrap(themeController.getStoreThemes));
router.get('/:themeId', wrap(themeController.getThemeDetails)); // Chi tiết của theme

// Protected routes
router.use(authUserMiddleware);
router.get('/purchased', wrap(themeController.getPurchasedThemes));
router.post('/:themeId/purchase', wrap(themeController.purchaseTheme));
router.post('/:themeId/apply', wrap(themeController.applyThemeToPet));
router.post('/:themeId/remove', wrap(themeController.removeThemeFromPet));

module.exports = router; 