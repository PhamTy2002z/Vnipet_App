const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cart/cartController');
const wrap = require('../utils/asyncWrap');
const { authPetOwnerMiddleware } = require('../middleware/authPetOwner');

// Tất cả API giỏ hàng yêu cầu đăng nhập pet owner
router.use(authPetOwnerMiddleware);

// Lấy giỏ hàng
router.get('/', wrap(cartController.getCart));

// API làm mới giỏ hàng cho mobile app
router.get('/refresh', wrap(cartController.refreshCart));

// Thêm theme vào giỏ
router.post('/theme/:themeId', wrap(cartController.addThemeToCart));

// Xoá theme khỏi giỏ
router.delete('/theme/:themeId', wrap(cartController.removeThemeFromCart));

// Thanh toán giỏ hàng
router.post('/checkout', wrap(cartController.checkoutCart));

module.exports = router; 