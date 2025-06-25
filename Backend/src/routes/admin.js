const express = require('express');
const router = express.Router();
const wrap = require('../utils/asyncWrap');

// Import controllers
const adminController = require('../controllers/admin/adminController');
const adminThemeController = require('../controllers/admin/adminThemeController');

// Import middleware
const { authAdminMiddleware } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authAdminMiddleware);

/* ===== Dashboard ===== */
router.get('/dashboard', wrap(adminController.getDashboard));

/* ===== Pet management ===== */
router.get('/pets', wrap(adminController.getPets));
router.get('/pet/:petId', wrap(adminController.getPetDetails));
router.put('/pet/:petId', wrap(adminController.updatePet));
router.delete('/pet/:petId', wrap(adminController.deletePet));

/* ===== User management ===== */
router.get('/users', wrap(adminController.getUsers));

/* ===== Theme management ===== */
router.get('/themes', wrap(adminThemeController.getThemes));
router.get('/theme/:themeId', wrap(adminThemeController.getThemeDetails));
router.post('/theme', wrap(adminThemeController.createTheme));
router.put('/theme/:themeId', wrap(adminThemeController.updateTheme));
router.delete('/theme/:themeId', wrap(adminThemeController.deleteTheme));

module.exports = router;
