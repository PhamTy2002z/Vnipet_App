const Theme = require('../../models/Theme');
const ThemeCart = require('../../models/ThemeCart');
const UserTheme = require('../../models/UserTheme');
const PetOwnerUser = require('../../models/PetOwnerUser');
const ThemeOrder = require('../../models/ThemeOrder');
const mongoose = require('mongoose');

/**
 * Helper: Chuyển đổi ID thành ObjectId an toàn
 */
function toObjectId(id) {
  if (!id) return null;
  try {
    return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
  } catch (error) {
    console.error(`[ObjectId Convert] Lỗi khi chuyển đổi ID: ${id}`, error);
    return id;
  }
}

/**
 * Helper: fetch or create user's cart
 */
async function getOrCreateCart(userId) {
  try {
    let cart = await ThemeCart.findOne({ userId });
    if (!cart) {
      console.log(`[CART] Tạo giỏ hàng mới cho user: ${userId}`);
      cart = await ThemeCart.create({ userId, items: [] });
    } else {
      console.log(`[CART] Tìm thấy giỏ hàng hiện tại của user: ${userId}, có ${cart.items.length} items`);
    }
    return cart;
  } catch (error) {
    console.error(`[CART] Lỗi khi lấy/tạo giỏ hàng:`, error);
    throw error;
  }
}

/**
 * Helper: Format cart data để trả về client
 */
function formatCartResponse(cart) {
  if (!cart) {
    return { items: [], totalPrice: 0 };
  }

  // Chuyển cart thành object nếu là document
  const cartData = cart.toObject ? cart.toObject() : { ...cart };
  
  // Format từng item
  cartData.items = (cartData.items || []).map(item => {
    if (!item.themeId) {
      return { ...item, imageUrl: null, theme: null };
    }
    
    const imageUrl = item.themeId.image?.publicUrl || item.themeId.imageUrl || null;
    
    return {
      ...item,
      imageUrl,
      theme: {
        _id: item.themeId._id,
        name: item.themeId.name,
        price: item.themeId.price || 0,
        description: item.themeId.description,
        isPremium: item.themeId.isPremium,
        inStore: item.themeId.inStore,
        isActive: item.themeId.isActive,
        imageUrl,
      },
    };
  });

  // Tính tổng giá
  const totalPrice = cartData.items.reduce((acc, item) => {
    if (item.theme && item.theme.isPremium) {
      return acc + (item.theme.price || 0);
    }
    return acc;
  }, 0);

  return {
    items: cartData.items,
    totalPrice,
    _id: cartData._id,
    userId: cartData.userId,
  };
}

/**
 * GET /api/v1/cart
 * Lấy giỏ hàng hiện tại của người dùng (bao gồm chi tiết theme)
 */
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`[GET CART] Request từ userId: ${userId}`);

    const cart = await ThemeCart.findOne({ userId })
      .populate({ path: 'items.themeId', select: 'name description price imageUrl image isPremium inStore isActive' });

    if (!cart) {
      console.log(`[GET CART] Không tìm thấy giỏ hàng cho user: ${userId}`);
      return res.json({ success: true, data: { items: [], totalPrice: 0 } });
    }

    console.log(`[GET CART] Cart ID: ${cart._id}, số lượng items: ${cart.items.length}`);
    
    if (cart.items.length > 0) {
      console.log(`[GET CART] Item IDs: ${cart.items.map(item => item.themeId?._id?.toString() || 'null').join(', ')}`);
    } else {
      console.log(`[GET CART] Giỏ hàng trống cho user: ${userId}`);
      return res.json({ success: true, data: { items: [], totalPrice: 0 } });
    }

    // Format dữ liệu giỏ hàng
    const formattedCart = formatCartResponse(cart);
    
    console.log(`[GET CART] Thành công - Đã xử lý ${formattedCart.items.length} items, tổng tiền: ${formattedCart.totalPrice}`);
    
    res.json({ 
      success: true, 
      data: formattedCart
    });
  } catch (error) {
    console.error('[GET CART] Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy giỏ hàng', error: error.message });
  }
};

/**
 * POST /api/v1/cart/theme/:themeId
 * Thêm 1 theme vào giỏ hàng
 */
exports.addThemeToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { themeId } = req.params;

    console.log(`[ADD TO CART] Request: userId=${userId}, themeId=${themeId}`);

    // Chuyển đổi thành ObjectId
    const themeObjectId = toObjectId(themeId);
    console.log(`[ADD TO CART] Converted themeId to: ${themeObjectId}`);

    // Kiểm tra theme hợp lệ
    const theme = await Theme.findById(themeObjectId);
    if (!theme || !theme.isActive || !theme.inStore) {
      console.log(`[ADD TO CART] Theme không hợp lệ: ${themeId}`);
      return res.status(404).json({ success: false, message: 'Theme không khả dụng' });
    }

    console.log(`[ADD TO CART] Theme hợp lệ: ${theme.name}, ID: ${theme._id}`);

    // Kiểm tra user đã sở hữu theme hay chưa
    const existingUserTheme = await UserTheme.findOne({ 
      userId, 
      themeId: themeObjectId 
    });
    
    if (existingUserTheme) {
      console.log(`[ADD TO CART] User đã sở hữu theme: ${themeId}`);
      return res.status(400).json({ success: false, message: 'Bạn đã sở hữu theme này' });
    }

    // Lấy hoặc tạo giỏ hàng
    let cart = await getOrCreateCart(userId);
    console.log(`[ADD TO CART] Cart ID: ${cart._id}, Items count: ${cart.items.length}`);
    
    // Kiểm tra xem theme đã có trong giỏ hàng chưa (so sánh dạng string để đảm bảo)
    const alreadyInCart = cart.items.some(item => 
      item.themeId.toString() === themeObjectId.toString()
    );
    
    if (alreadyInCart) {
      console.log(`[ADD TO CART] Theme đã có trong giỏ hàng: ${themeId}`);
      return res.status(400).json({ success: false, message: 'Theme đã có trong giỏ hàng' });
    }
    
    // Thêm theme vào giỏ hàng sử dụng $push để tránh race condition
    const updatedCart = await ThemeCart.findOneAndUpdate(
      { _id: cart._id },
      { $push: { items: { themeId: themeObjectId, addedAt: new Date() } } },
      { new: true } // Trả về giỏ hàng sau khi cập nhật
    );
    
    console.log(`[ADD TO CART] Đã cập nhật giỏ hàng, mới có ${updatedCart.items.length} items`);

    // Lấy thông tin chi tiết với populate
    const populatedCart = await ThemeCart.findById(updatedCart._id)
      .populate({
        path: 'items.themeId',
        select: 'name description price imageUrl image isPremium inStore isActive',
      });
    
    if (!populatedCart) {
      console.log(`[ADD TO CART] Không thể lấy chi tiết giỏ hàng sau khi cập nhật`);
      return res.status(500).json({ success: false, message: 'Không thể lấy chi tiết giỏ hàng' });
    }
    
    console.log(`[ADD TO CART] Populated cart items: ${populatedCart.items.length}`);
    
    if (populatedCart.items.length > 0) {
      console.log(`[ADD TO CART] Item IDs: ${populatedCart.items.map(i => i.themeId?._id || 'null').join(', ')}`);
    }

    // Format dữ liệu giỏ hàng
    const formattedCart = formatCartResponse(populatedCart);

    console.log(`[ADD TO CART] Thành công - Items: ${formattedCart.items.length}, Tổng tiền: ${formattedCart.totalPrice}`);
    return res.status(200).json({
      success: true,
      message: 'Đã thêm theme vào giỏ hàng',
      data: formattedCart
    });
  } catch (error) {
    console.error('[ADD TO CART] Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi thêm theme vào giỏ hàng', error: error.message });
  }
};

/**
 * DELETE /api/v1/cart/theme/:themeId
 * Xoá 1 theme khỏi giỏ hàng
 */
exports.removeThemeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { themeId } = req.params;

    console.log(`[REMOVE FROM CART] Request: userId=${userId}, themeId=${themeId}`);

    // Chuyển đổi thành ObjectId
    const themeObjectId = toObjectId(themeId);
    console.log(`[REMOVE FROM CART] Converted themeId to: ${themeObjectId}`);
    
    // Tìm giỏ hàng hiện tại
    let cart = await ThemeCart.findOne({ userId });
    
    if (!cart || cart.items.length === 0) {
      console.log(`[REMOVE FROM CART] Không tìm thấy giỏ hàng hoặc giỏ hàng trống cho user: ${userId}`);
      return res.json({ 
        success: true, 
        message: 'Giỏ hàng trống', 
        data: { items: [], totalPrice: 0 } 
      });
    }

    // Log trước khi xóa
    console.log(`[REMOVE FROM CART] Giỏ hàng hiện tại có ${cart.items.length} items`);
    console.log(`[REMOVE FROM CART] Cần xóa theme: ${themeObjectId}`);
    console.log(`[REMOVE FROM CART] Item IDs hiện tại: ${cart.items.map(i => i.themeId.toString()).join(', ')}`);

    // Kiểm tra xem item có trong giỏ hàng không
    const itemExists = cart.items.some(item => item.themeId.toString() === themeObjectId.toString());
    if (!itemExists) {
      console.log(`[REMOVE FROM CART] Không tìm thấy theme ${themeObjectId} trong giỏ hàng`);
      // Không báo lỗi, trả về giỏ hàng hiện tại
      const populatedCart = await ThemeCart.findById(cart._id)
        .populate({
          path: 'items.themeId',
          select: 'name description price imageUrl image isPremium inStore isActive',
        });
      return res.json({
        success: true,
        message: 'Theme không có trong giỏ hàng',
        data: formatCartResponse(populatedCart)
      });
    }

    // Sử dụng $pull để xoá item với themeId cụ thể
    const result = await ThemeCart.updateOne(
      { _id: cart._id }, 
      { $pull: { items: { themeId: themeObjectId } } }
    );
    
    console.log(`[REMOVE FROM CART] Kết quả xóa item: ${JSON.stringify(result)}`);
    
    // Kiểm tra xem đã xóa thành công chưa
    if (result.modifiedCount === 0) {
      console.log(`[REMOVE FROM CART] Không thể xóa item, không có thay đổi`);
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể xóa theme khỏi giỏ hàng' 
      });
    }
    
    // Lấy giỏ hàng mới sau khi xóa
    const updatedCart = await ThemeCart.findById(cart._id)
      .populate({
        path: 'items.themeId',
        select: 'name description price imageUrl image isPremium inStore isActive',
      });
    
    if (!updatedCart) {
      return res.status(404).json({ success: false, message: 'Giỏ hàng không tồn tại' });
    }
    
    console.log(`[REMOVE FROM CART] Giỏ hàng sau khi xóa có ${updatedCart.items.length} items`);
    
    // Format dữ liệu giỏ hàng
    const formattedCart = formatCartResponse(updatedCart);
    
    console.log(`[REMOVE FROM CART] Success - Items còn lại: ${formattedCart.items.length}, Tổng tiền: ${formattedCart.totalPrice}`);
    
    return res.json({
      success: true,
      message: 'Đã xoá theme khỏi giỏ hàng',
      data: formattedCart
    });
  } catch (error) {
    console.error('[REMOVE FROM CART] Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xoá theme khỏi giỏ hàng', error: error.message });
  }
};

/**
 * POST /api/v1/cart/checkout
 * Thanh toán toàn bộ giỏ hàng (mua nhiều theme)
 */
exports.checkoutCart = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`[CHECKOUT CART] Request từ userId: ${userId}`);
    
    const cart = await ThemeCart.findOne({ userId });

    if (!cart || cart.items.length === 0) {
      console.log(`[CHECKOUT CART] Giỏ hàng trống cho user: ${userId}`);
      return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
    }

    // Lấy danh sách themeIds duy nhất
    const themeIds = [...new Set(cart.items.map((i) => i.themeId.toString()))];
    console.log(`[CHECKOUT CART] Sẽ mua ${themeIds.length} theme: ${themeIds.join(', ')}`);

    // Kiểm tra theme validity + ownership
    const themes = await Theme.find({ _id: { $in: themeIds } });
    console.log(`[CHECKOUT CART] Tìm thấy ${themes.length} theme hợp lệ`);
    
    const invalidThemeIds = themeIds.filter(
      (id) => !themes.find((t) => t._id.toString() === id && t.isActive && t.inStore),
    );
    
    if (invalidThemeIds.length) {
      console.log(`[CHECKOUT CART] Phát hiện ${invalidThemeIds.length} theme không hợp lệ: ${invalidThemeIds.join(', ')}`);
      return res.status(400).json({ success: false, message: 'Một số theme không khả dụng', invalidThemeIds });
    }

    const ownedThemes = await UserTheme.find({ userId, themeId: { $in: themeIds } }).select('themeId');
    if (ownedThemes.length) {
      const ownedIds = ownedThemes.map(t => t.themeId.toString());
      console.log(`[CHECKOUT CART] User đã sở hữu ${ownedIds.length} theme: ${ownedIds.join(', ')}`);
      return res.status(400).json({ success: false, message: 'Bạn đã sở hữu một số theme', ownedThemeIds: ownedThemes.map((t) => t.themeId) });
    }

    const transactionIdPrefix = `bulk_${Date.now()}`;
    console.log(`[CHECKOUT CART] Tạo transaction với prefix: ${transactionIdPrefix}`);

    const purchased = [];

    for (let idx = 0; idx < themes.length; idx++) {
      const theme = themes[idx];
      const txId = `${transactionIdPrefix}_${idx}`;

      const userTheme = await UserTheme.create({
        userId,
        themeId: theme._id,
        purchaseDate: new Date(),
        transactionId: txId,
        purchasePrice: theme.price || 0,
        isActive: true,
      });

      purchased.push({
        themeId: theme._id,
        userThemeId: userTheme._id,
        name: theme.name,
        price: theme.price,
        transactionId: txId,
      });
      
      console.log(`[CHECKOUT CART] Đã tạo userTheme cho theme ${theme.name}, themeId: ${theme._id}`);
    }

    // Cập nhật trường purchasedThemes trong user
    const user = await PetOwnerUser.findById(userId);
    if (user) {
      for (const p of purchased) {
        user.addPurchasedTheme(p.themeId, p.transactionId);
      }
      await user.save();
      console.log(`[CHECKOUT CART] Đã cập nhật purchasedThemes cho user ${userId}`);
    }

    // Xoá toàn bộ giỏ hàng sau khi checkout - dùng đúng method updateOne
    await ThemeCart.updateOne(
      { _id: cart._id },
      { $set: { items: [] } }
    );
    
    console.log(`[CHECKOUT CART] Đã xoá giỏ hàng sau khi thanh toán`);

    // Tính tổng giá
    const totalPrice = purchased.reduce((sum, p) => sum + (p.price || 0), 0);

    // Tạo hoá đơn
    const order = await ThemeOrder.create({
      userId,
      items: purchased.map((p) => ({
        themeId: p.themeId,
        userThemeId: p.userThemeId,
        price: p.price,
        name: p.name,
      })),
      totalPrice,
      transactionId: transactionIdPrefix,
      purchaseDate: new Date(),
    });
    
    console.log(`[CHECKOUT CART] Đã tạo order ID: ${order._id}, tổng tiền: ${totalPrice}`);

    res.json({ success: true, message: 'Thanh toán thành công', data: { order } });
  } catch (error) {
    console.error('[CHECKOUT CART] Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi thanh toán giỏ hàng', error: error.message });
  }
};

/**
 * GET /api/v1/cart/refresh
 * Làm mới dữ liệu giỏ hàng cho mobile app
 */
exports.refreshCart = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`[REFRESH CART] Request từ userId: ${userId}`);

    const cart = await ThemeCart.findOne({ userId })
      .populate({ path: 'items.themeId', select: 'name description price imageUrl image isPremium inStore isActive' });

    if (!cart) {
      console.log(`[REFRESH CART] Không tìm thấy giỏ hàng cho user: ${userId}`);
      return res.json({ success: true, data: { items: [], totalPrice: 0 } });
    }

    console.log(`[REFRESH CART] Cart ID: ${cart._id}, số lượng items: ${cart.items.length}`);
    
    if (cart.items.length > 0) {
      console.log(`[REFRESH CART] Item IDs: ${cart.items.map(item => item.themeId?._id?.toString() || 'null').join(', ')}`);
    } else {
      console.log(`[REFRESH CART] Giỏ hàng trống cho user: ${userId}`);
      return res.json({ success: true, data: { items: [], totalPrice: 0 } });
    }

    // Format dữ liệu giỏ hàng
    const formattedCart = formatCartResponse(cart);
    
    console.log(`[REFRESH CART] Thành công - Đã xử lý ${formattedCart.items.length} items, tổng tiền: ${formattedCart.totalPrice}`);
    
    res.json({ 
      success: true, 
      data: formattedCart
    });
  } catch (error) {
    console.error('[REFRESH CART] Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi làm mới giỏ hàng', error: error.message });
  }
}; 