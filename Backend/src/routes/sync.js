/**
 * Sync Routes
 * Xử lý các yêu cầu đồng bộ dữ liệu offline
 */

const express = require('express');
const router = express.Router();
const wrap = require('../utils/asyncWrap');
const syncController = require('../controllers/sync/syncController');
const { authPetOwnerMiddleware } = require('../middleware/authPetOwner');

/**
 * Tất cả routes đều yêu cầu xác thực pet owner
 */
router.use(authPetOwnerMiddleware);

/* ===== Middleware ghi log ===== */
router.use((req, _res, next) => {
  console.log(`[SYNC] ${req.method} ${req.originalUrl}`);
  next();
});

/* ===== Đồng bộ dữ liệu ===== */
router.post('/user', wrap(syncController.syncUserData));
router.post('/pets', wrap(syncController.syncPetData));
router.post('/themes', wrap(syncController.syncThemeData));
router.post('/offline-changes', wrap(syncController.syncOfflineChanges));
router.get('/status', wrap(syncController.getSyncStatus));

module.exports = router; 