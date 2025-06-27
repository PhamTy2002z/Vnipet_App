const Theme = require('../../models/Theme');
const ThemeCart = require('../../models/ThemeCart');
const UserTheme = require('../../models/UserTheme');
const PetOwnerUser = require('../../models/PetOwnerUser');
const ThemeOrder = require('../../models/ThemeOrder');

/**
 * Helper: fetch or create user's cart
 */
async function getOrCreateCart(userId) {
  let cart = await ThemeCart.findOne({ userId });
  if (!cart) {
    cart = await ThemeCart.create({ userId, items: [] });
  }
  return cart;
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
    console.log(`[GET CART] Item IDs: ${cart.items.map(item => item.themeId?._id || 'null').join(', ')}`);

    if (cart.items.length === 0) {
      console.log(`[GET CART] Giỏ hàng trống cho user: ${userId}`);
      return res.json({ success: true, data: { items: [], totalPrice: 0 } });
    }

    const totalPrice = cart.items.reduce((acc, item) => {
      const theme = item.themeId;
      if (theme && theme.isPremium) {
        return acc + (theme.price || 0);
      }
      return acc;
    }, 0);

    // Xử lý để bổ sung URL ảnh và định dạng nhất quán
    const cartData = cart.toObject();
    cartData.items = cartData.items.map(item => {
      if (!item.themeId) {
        return {
          ...item,
          imageUrl: null,
          theme: null,
        };
      }
      
      // Lấy URL ảnh từ theme (ưu tiên image.publicUrl, sau đó imageUrl)
      const imageUrl = item.themeId.image?.publicUrl || item.themeId.imageUrl || null;
      
      return {
        ...item,
        imageUrl,
        theme: {
          _id: item.themeId._id,
          name: item.themeId.name,
          price: item.themeId.price,
          description: item.themeId.description,
          isPremium: item.themeId.isPremium,
          inStore: item.themeId.inStore,
          isActive: item.themeId.isActive,
          imageUrl,
        },
      };
    });

    console.log(`[GET CART] Thành công - Đã xử lý ${cartData.items.length} items, tổng tiền: ${totalPrice}`);
    
    res.json({ 
      success: true, 
      data: { 
        items: cartData.items, 
        totalPrice,
        _id: cart._id,
        userId: cart.userId,
      } 
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

    // Kiểm tra theme hợp lệ
    const theme = await Theme.findById(themeId);
    if (!theme || !theme.isActive || !theme.inStore) {
      console.log(`[ADD TO CART] Theme không hợp lệ: ${themeId}`);
      return res.status(404).json({ success: false, message: 'Theme không khả dụng' });
    }

    console.log(`[ADD TO CART] Theme hợp lệ: ${theme.name}`);

    // Kiểm tra user đã sở hữu theme hay chưa
    const existingUserTheme = await UserTheme.findOne({ userId, themeId });
    if (existingUserTheme) {
      console.log(`[ADD TO CART] User đã sở hữu theme: ${themeId}`);
      return res.status(400).json({ success: false, message: 'Bạn đã sở hữu theme này' });
    }

    /* -------------------------------------------------------------------
     *  Thử cách khác: dùng getOrCreateCart và updateOne thay vì findOneAndUpdate
     * ------------------------------------------------------------------- */
    console.log(`[ADD TO CART] Đang tạo/lấy giỏ hàng cho user: ${userId}`);
    let cart = await getOrCreateCart(userId);
    console.log(`[ADD TO CART] Cart ID: ${cart._id}, Items count: ${cart.items.length}`);
    
    // Kiểm tra xem theme đã có trong giỏ hàng chưa
    const alreadyInCart = cart.items.some(item => item.themeId.toString() === themeId);
    if (alreadyInCart) {
      console.log(`[ADD TO CART] Theme đã có trong giỏ hàng: ${themeId}`);
      return res.status(400).json({ success: false, message: 'Theme đã có trong giỏ hàng' });
    }
    
    // Thêm theme vào giỏ hàng
    cart.items.push({ themeId, addedAt: new Date() });
    await cart.save();
    console.log(`[ADD TO CART] Đã thêm theme vào giỏ hàng. Số items mới: ${cart.items.length}`);

    // Lấy thông tin chi tiết với populate
    const populatedCart = await ThemeCart.findById(cart._id)
      .populate({
        path: 'items.themeId',
        select: 'name description price imageUrl image isPremium inStore isActive',
      }).lean();
    
    console.log(`[ADD TO CART] Populated cart items: ${populatedCart.items.length}`);
    console.log(`[ADD TO CART] Item IDs: ${populatedCart.items.map(i => i.themeId?._id || 'null').join(', ')}`);

    // Xử lý để bổ sung URL ảnh
    const cartData = { ...populatedCart };
    cartData.items = cartData.items.map(item => {
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
          price: item.themeId.price,
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

    console.log(`[ADD TO CART] Thành công - Items: ${cartData.items.length}, Tổng tiền: ${totalPrice}`);
    return res.status(201).json({
      success: true,
      message: 'Đã thêm theme vào giỏ hàng',
      data: {
        items: cartData.items,
        totalPrice,
        _id: cartData._id,
        userId: cartData.userId,
      },
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

    const cart = await ThemeCart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Giỏ hàng trống' });
    }

    const originalLength = cart.items.length;
    cart.items = cart.items.filter((i) => i.themeId.toString() !== themeId);

    if (cart.items.length === originalLength) {
      return res.status(404).json({ success: false, message: 'Theme không tìm thấy trong giỏ hàng' });
    }

    await cart.save();

    // Lấy thông tin cart với theme đã populate
    const populatedCart = await ThemeCart.findById(cart._id)
      .populate({ path: 'items.themeId', select: 'name description price imageUrl image isPremium inStore isActive' });
    
    // Xử lý để bổ sung URL ảnh
    const cartData = populatedCart.toObject();
    cartData.items = cartData.items.map(item => {
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

    res.json({ 
      success: true, 
      message: 'Đã xoá theme khỏi giỏ hàng', 
      data: { 
        items: cartData.items,
        totalPrice,
        _id: cart._id,
        userId: cart.userId,
      } 
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
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
    const cart = await ThemeCart.findOne({ userId });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
    }

    // Lấy danh sách themeIds duy nhất
    const themeIds = [...new Set(cart.items.map((i) => i.themeId.toString()))];

    // Kiểm tra theme validity + ownership
    const themes = await Theme.find({ _id: { $in: themeIds } });
    const invalidThemeIds = themeIds.filter(
      (id) => !themes.find((t) => t._id.toString() === id && t.isActive && t.inStore),
    );
    if (invalidThemeIds.length) {
      return res.status(400).json({ success: false, message: 'Một số theme không khả dụng', invalidThemeIds });
    }

    const ownedThemes = await UserTheme.find({ userId, themeId: { $in: themeIds } }).select('themeId');
    if (ownedThemes.length) {
      return res.status(400).json({ success: false, message: 'Bạn đã sở hữu một số theme', ownedThemeIds: ownedThemes.map((t) => t.themeId) });
    }

    const transactionIdPrefix = `bulk_${Date.now()}`;

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
    }

    // Cập nhật trường purchasedThemes trong user nhanh gọn với $addToSet cho từng theme
    const user = await PetOwnerUser.findById(userId);
    if (user) {
      for (const p of purchased) {
        user.addPurchasedTheme(p.themeId, p.transactionId);
      }
      await user.save();
    }

    // Xoá toàn bộ giỏ hàng sau khi checkout
    cart.items = [];
    await cart.save();

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

    res.json({ success: true, message: 'Thanh toán thành công', data: { order } });
  } catch (error) {
    console.error('Checkout cart error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi thanh toán giỏ hàng', error: error.message });
  }
}; 