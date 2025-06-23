/**
 * API Routes Index
 * File tổng hợp tất cả các routes của API
 */

const express = require('express');
const router = express.Router();

// Import các routes
const authRoutes = require('./authRoutes');

// Sử dụng các routes
router.use('/auth', authRoutes);

// Route mặc định
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Vnipet API đang hoạt động',
    version: '1.0.0',
    docs: '/docs'
  });
});

// Export router
module.exports = router; 