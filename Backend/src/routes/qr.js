const express = require('express');
const router = express.Router();
const wrap = require('../utils/asyncWrap');
const qrController = require('../controllers/qr/qrController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { authPetOwnerMiddleware } = require('../middleware/authPetOwner');
const { authAdmin } = require('../middleware/authAdmin');
const { apiCache } = require('../utils/cacheControl');

// Middleware để áp dụng cache control cho tất cả các routes
router.use(apiCache({ maxAge: 0, private: true }));

// ================ PUBLIC ROUTES ================

/**
 * Ghi lại thông tin quét QR (không yêu cầu đăng nhập)
 * @route POST /api/v1/qr/scan
 */
router.post('/scan', qrController.recordQRScan);

/**
 * Cập nhật thông tin phiên sau khi quét QR
 * @route PUT /api/v1/qr/scan/:scanId
 */
router.put('/scan/:scanId', qrController.updateScanSession);

/**
 * Xử lý chuyển hướng khi quét mã QR động
 * @route GET /q/:uniqueId
 */
router.get('/q/:uniqueId', qrController.handleDynamicQRRedirect);

// ================ AUTHENTICATED PET OWNER ROUTES ================

// Yêu cầu xác thực cho các routes bên dưới
router.use('/pet', authPetOwnerMiddleware);

/**
 * Tạo mã QR động mới cho pet
 * @route POST /api/v1/qr/pet/:petId/dynamic
 */
router.post('/pet/:petId/dynamic', qrController.createDynamicQRForPet);

/**
 * Lấy danh sách mã QR động của pet
 * @route GET /api/v1/qr/pet/:petId/dynamic
 */
router.get('/pet/:petId/dynamic', qrController.getPetDynamicQRs);

/**
 * Cập nhật URL đích của mã QR động
 * @route PUT /api/v1/qr/pet/:petId/dynamic/:uniqueId
 */
router.put('/pet/:petId/dynamic/:uniqueId', qrController.updateDynamicQRTargetUrl);

/**
 * Lấy thông tin pet bằng mã QR
 * @route GET /api/v1/qr/:qrToken
 */
router.get('/:qrToken', wrap(qrController.getPetByQR));

// ================ ANALYTICS ROUTES (PROTECTED) ================

// Yêu cầu xác thực cho các routes analytics
router.use('/analytics', authPetOwnerMiddleware);

/**
 * Lấy thống kê quét QR theo thời gian
 * @route GET /api/v1/qr/analytics/time
 */
router.get('/analytics/time', qrController.getQRAnalyticsByTime);

/**
 * Lấy thống kê quét QR theo vị trí
 * @route GET /api/v1/qr/analytics/location
 */
router.get('/analytics/location', qrController.getQRAnalyticsByLocation);

/**
 * Lấy thống kê quét QR theo thiết bị
 * @route GET /api/v1/qr/analytics/device
 */
router.get('/analytics/device', qrController.getQRAnalyticsByDevice);

/**
 * Lấy thống kê quét QR theo pet
 * @route GET /api/v1/qr/analytics/pet
 */
router.get('/analytics/pet', qrController.getQRAnalyticsByPet);

/**
 * Dashboard tổng hợp thống kê QR
 * @route GET /api/v1/qr/analytics/dashboard
 */
router.get('/analytics/dashboard', qrController.getQRAnalyticsDashboard);

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

// Protected routes - Yêu cầu xác thực
router.post('/generate', authMiddleware, wrap(qrController.generateQR));
router.get('/pet/:petId/scans', authMiddleware, wrap(qrController.getPetScanHistory));
router.get('/pet/:petId/stats', authMiddleware, wrap(qrController.getPetScanStats));

module.exports = router; 