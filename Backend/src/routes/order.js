const express = require('express');
const router = express.Router();

const orderController = require('../controllers/order/orderController');
const wrap = require('../utils/asyncWrap');
const { authPetOwnerMiddleware } = require('../middleware/authPetOwner');

router.use(authPetOwnerMiddleware);

// Danh sách hoá đơn
router.get('/', wrap(orderController.getOrders));

// Chi tiết hoá đơn
router.get('/:orderId', wrap(orderController.getOrderById));

module.exports = router; 