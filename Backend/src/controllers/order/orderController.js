const ThemeOrder = require('../../models/ThemeOrder');

/**
 * GET /api/v1/orders
 * Danh sách hoá đơn (có phân trang)
 * Query: ?page=1&limit=10
 */
exports.getOrders = async (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    ThemeOrder.find({ userId })
      .sort({ purchaseDate: -1 })
      .populate({
        path: 'items.themeId',
        select: 'name price imageUrl image.publicUrl isPremium',
      })
      .skip(skip)
      .limit(limit),
    ThemeOrder.countDocuments({ userId }),
  ]);

  // Xử lý dữ liệu để thêm URL ảnh cho từng theme
  const ordersWithImages = orders.map(order => {
    const orderObj = order.toObject();
    orderObj.items = orderObj.items.map(item => {
      // Nếu theme không còn tồn tại
      if (!item.themeId) {
        return {
          ...item,
          imageUrl: null,
        };
      }
      
      // Lấy URL ảnh từ theme (ưu tiên image.publicUrl trước, rồi đến imageUrl)
      const imageUrl = item.themeId.image?.publicUrl || item.themeId.imageUrl || null;
      
      return {
        ...item,
        imageUrl,
        theme: {
          _id: item.themeId._id,
          name: item.themeId.name,
          price: item.themeId.price,
          isPremium: item.themeId.isPremium,
          imageUrl,
        },
      };
    });
    return orderObj;
  });

  res.json({
    success: true,
    data: ordersWithImages,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
  });
};

/**
 * GET /api/v1/orders/:orderId
 * Chi tiết một hoá đơn
 */
exports.getOrderById = async (req, res) => {
  const userId = req.user.id;
  const { orderId } = req.params;

  const order = await ThemeOrder.findOne({ _id: orderId, userId })
    .populate({
      path: 'items.themeId',
      select: 'name price imageUrl image description presetKey isPremium',
    });

  if (!order) {
    return res.status(404).json({ success: false, message: 'Hoá đơn không tồn tại' });
  }

  // Xử lý dữ liệu để thêm URL ảnh
  const orderObj = order.toObject();
  orderObj.items = orderObj.items.map(item => {
    // Nếu theme không còn tồn tại
    if (!item.themeId) {
      return {
        ...item,
        imageUrl: null,
        theme: null,
      };
    }
    
    // Lấy URL ảnh từ theme
    const imageUrl = item.themeId.image?.publicUrl || item.themeId.imageUrl || null;
    
    return {
      ...item,
      imageUrl,
      theme: {
        _id: item.themeId._id,
        name: item.themeId.name,
        price: item.themeId.price,
        isPremium: item.themeId.isPremium,
        description: item.themeId.description,
        presetKey: item.themeId.presetKey,
        imageUrl,
      },
    };
  });

  res.json({ success: true, data: orderObj });
}; 