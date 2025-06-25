const express = require('express');
const router = express.Router();
const mobileAuthController = require('../controllers/auth/mobileAuthController');

/**
 * @route POST /api/v1/auth/mobile-register
 * @desc Register a new user with mobile device
 * @access Public
 */
router.post('/mobile-register', mobileAuthController.registerUser);

/**
 * @route POST /api/v1/auth/device-register
 * @desc Register a new device
 * @access Public
 */
router.post('/device-register', mobileAuthController.registerDevice);

/**
 * @route POST /api/v1/auth/mobile-login
 * @desc Login with mobile device
 * @access Public
 */
router.post('/mobile-login', mobileAuthController.mobileLogin);

/**
 * @route POST /api/v1/auth/refresh-token
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh-token', mobileAuthController.refreshToken);

/**
 * @route POST /api/v1/auth/logout
 * @desc Logout and revoke refresh token
 * @access Public
 */
router.post('/logout', mobileAuthController.logout);

module.exports = router; 