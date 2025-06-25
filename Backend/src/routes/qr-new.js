/**
 * QR Routes
 * Xử lý các yêu cầu liên quan đến QR code
 */

const express = require('express');
const router = express.Router();
const wrap = require('../utils/asyncWrap');
const qrController = require('../controllers/qr/qrController');
const { authMiddleware, authUserMiddleware } = require('../middleware/authMiddleware');
const { authAdmin } = require('../middleware/authAdmin');

// Public routes (không yêu cầu xác thực)
router.get('/scan/:shortCode', wrap(qrController.scanQR));

// ================ ADMIN ROUTES ================

// Yêu cầu quyền admin cho các routes bên dưới
router.use('/admin', authAdmin);

/**
 * Tạo QR codes cho nhiều pet cùng lúc (chỉ admin)
 * @route POST /api/v1/qr/admin/bulk
 */
router.post('/admin/bulk', wrap(qrController.createBulkQRCodes));

/**
 * Tạo một QR code mới (chỉ admin)
 * @route POST /api/v1/qr/admin/generate
 */
router.post('/admin/generate', wrap(qrController.createSingleQRCode));

/**
 * Xóa dữ liệu quét QR theo ngày (chỉ admin)
 * @route DELETE /api/v1/qr/admin/scans
 */
router.delete('/admin/scans', wrap(async (req, res) => {
  // Implement later
  res.status(501).json({ 
    success: false,
    message: 'Not implemented yet' 
  });
}));

// Routes yêu cầu xác thực
router.use(authMiddleware);

// Routes chỉ dành cho user
router.post('/generate', authUserMiddleware, wrap(qrController.generateQR));
router.post('/short-code', authUserMiddleware, wrap(qrController.generateShortCode));
router.get('/stats/:petId', authUserMiddleware, wrap(qrController.getQRStats));
router.get('/recent-scans/:petId', authUserMiddleware, wrap(qrController.getRecentScans));

module.exports = router; 