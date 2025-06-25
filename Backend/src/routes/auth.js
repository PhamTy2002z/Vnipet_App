const express = require('express');
const router = express.Router();
const wrap = require('../utils/asyncWrap');
const tokenController = require('../controllers/auth/tokenController');
const securityController = require('../controllers/auth/securityController');
const mobileAuthController = require('../controllers/auth/mobileAuthController');
const adminController = require('../controllers/admin/adminController');
const petOwnerAuthController = require('../controllers/auth/petOwnerAuthController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Basic authentication routes
router.post('/register', wrap(petOwnerAuthController.register));
router.post('/login', wrap(petOwnerAuthController.login));
router.post('/logout', wrap(mobileAuthController.logout));

// Admin authentication
router.post('/admin/login', wrap(adminController.loginAdmin));

// Mobile authentication
router.post('/mobile-register', wrap(mobileAuthController.registerUser));
router.post('/mobile-login', wrap(mobileAuthController.mobileLogin));
router.post('/device-register', wrap(mobileAuthController.registerDevice));

// Token management
router.post('/refresh-token', wrap(tokenController.refreshToken));
router.post('/revoke-token', wrap(tokenController.revokeToken));
router.post('/validate-token', authMiddleware, wrap(tokenController.validateToken));

// Security
router.post('/forgot-password', wrap(securityController.forgotPassword));
router.post('/verify-otp', wrap(securityController.verifyOTP));
router.post('/reset-password', wrap(securityController.resetPassword));
router.put('/change-password', authMiddleware, wrap(securityController.changePassword));

module.exports = router;
