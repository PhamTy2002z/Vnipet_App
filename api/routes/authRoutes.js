/**
 * Auth Routes
 * Routes cho xác thực người dùng
 */

const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/authController');

// Middlewares
const { authMiddleware } = require('../middleware/authMiddleware');

// Routes
/**
 * @route POST /api/v1/auth/mobile-register
 * @description Đăng ký người dùng mới qua mobile
 * @access Public
 */
router.post('/mobile-register', authController.registerUser);

/**
 * @route POST /api/v1/auth/device-register
 * @description Đăng ký thiết bị
 * @access Public/Private
 */
router.post('/device-register', authController.registerDevice);

/**
 * @route POST /api/v1/auth/mobile-login
 * @description Đăng nhập người dùng qua mobile
 * @access Public
 */
router.post('/mobile-login', authController.mobileLogin);

/**
 * @route POST /api/v1/auth/refresh-token
 * @description Làm mới access token
 * @access Public
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @route POST /api/v1/auth/logout
 * @description Đăng xuất người dùng
 * @access Private
 */
router.post('/logout', authMiddleware, authController.logout);

module.exports = router; 