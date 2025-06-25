/**
 * Media Routes
 * Xử lý các yêu cầu liên quan đến media (hình ảnh, video)
 */

const express = require('express');
const router = express.Router();
const wrap = require('../utils/asyncWrap');
const mediaController = require('../controllers/media/mediaController');
const { authUserMiddleware } = require('../middleware/authMiddleware');

// Áp dụng middleware xác thực cho tất cả routes
router.use(authUserMiddleware);

/* ===== Middleware ghi log ===== */
router.use((req, _res, next) => {
  console.log(`[MEDIA] ${req.method} ${req.originalUrl}`);
  next();
});

/* ===== Pet avatar ===== */
router.post('/pet/:petId/avatar', wrap(mediaController.uploadPetAvatar));
router.delete('/pet/:petId/avatar', wrap(mediaController.deletePetAvatar));

/* ===== Pet gallery ===== */
router.post('/pet/:petId/images', wrap(mediaController.uploadPetImages));
router.delete('/pet/:petId/images/:imageIndex', wrap(mediaController.deletePetImage));

module.exports = router; 