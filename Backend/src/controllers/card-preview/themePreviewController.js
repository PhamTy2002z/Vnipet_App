const mongoose = require('mongoose');
const Theme = require('../../models/Theme');
const UserTheme = require('../../models/UserTheme');
const Pet = require('../../models/Pet');

/**
 * Lấy danh sách tất cả các theme card mà user đã mua để hiển thị preview
 * Sử dụng cho Card Swiper/Carousel
 * GET /api/v1/pet-owner/card-preview/themes
 */
exports.getPreviewableThemes = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Query params cho phân trang và sắp xếp
    const { page = 1, limit = 10, sortBy = 'purchaseDate', sortDirection = 'desc' } = req.query;
    
    // Tạo điều kiện sắp xếp
    const sort = {};
    sort[sortBy === 'name' ? 'themeId.name' : sortBy] = sortDirection === 'asc' ? 1 : -1;

    // Tìm tất cả theme mà user đã mua
    const userThemes = await UserTheme.find({ userId })
      .populate({
        path: 'themeId',
        select: 'name image imageUrl description presetKey isPremium price isActive inStore'
      })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Đếm tổng số theme để phân trang
    const totalThemes = await UserTheme.countDocuments({ userId });

    // Xử lý và format data để gửi về client
    const previewThemes = userThemes
      .filter(ut => ut.themeId && ut.themeId.isActive) // Chỉ lấy các theme còn active
      .map(ut => ({
        id: ut.themeId._id,
        name: ut.themeId.name,
        imageUrl: ut.themeId.image?.publicUrl || ut.themeId.imageUrl || null,
        presetKey: ut.themeId.presetKey,
        isPremium: ut.themeId.isPremium,
        price: ut.themeId.price,
        description: ut.themeId.description,
        purchaseDate: ut.purchaseDate,
        transactionId: ut.transactionId,
        // Thêm các thông tin cần thiết cho preview
        previewData: {
          presetKey: ut.themeId.presetKey,
          isApplied: ut.appliedToPets && ut.appliedToPets.length > 0,
          appliedCount: ut.appliedToPets ? ut.appliedToPets.length : 0
        }
      }));

    res.json({
      themes: previewThemes,
      pagination: {
        total: totalThemes,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalThemes / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get previewable themes error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get previewable themes',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

/**
 * Lấy chi tiết một theme cụ thể cho preview
 * GET /api/v1/pet-owner/card-preview/themes/:themeId
 */
exports.getSingleThemePreview = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { themeId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!mongoose.isValidObjectId(themeId)) {
      return res.status(400).json({ error: 'Invalid theme ID' });
    }

    // Tìm theme trong bộ sưu tập của user
    const userTheme = await UserTheme.findOne({ userId, themeId })
      .populate({
        path: 'themeId',
        select: 'name image imageUrl description presetKey isPremium price isActive inStore'
      });

    if (!userTheme || !userTheme.themeId) {
      return res.status(404).json({ error: 'Theme not found in your collection' });
    }

    // Lấy danh sách pet của user để hiển thị ứng dụng theme
    const userPets = await Pet.find({ ownerAccount: userId })
      .select('_id info.name info.species avatar')
      .lean();

    // Lọc những pet đã áp dụng theme này
    const appliedPetIds = userTheme.appliedToPets.map(app => app.petId.toString());
    const appliedPets = userPets.filter(pet => appliedPetIds.includes(pet._id.toString()));

    // Tạo response với đầy đủ thông tin cho preview
    const themePreview = {
      id: userTheme.themeId._id,
      name: userTheme.themeId.name,
      imageUrl: userTheme.themeId.image?.publicUrl || userTheme.themeId.imageUrl || null,
      presetKey: userTheme.themeId.presetKey,
      isPremium: userTheme.themeId.isPremium,
      price: userTheme.themeId.price,
      description: userTheme.themeId.description,
      purchaseDate: userTheme.purchaseDate,
      transactionId: userTheme.transactionId,
      isActive: userTheme.themeId.isActive,
      previewData: {
        presetKey: userTheme.themeId.presetKey,
        appliedPets: appliedPets.map(pet => ({
          id: pet._id,
          name: pet.info?.name || 'Unnamed Pet',
          species: pet.info?.species || 'Unknown',
          avatar: pet.avatar
        })),
        availablePets: userPets.map(pet => ({
          id: pet._id,
          name: pet.info?.name || 'Unnamed Pet',
          species: pet.info?.species || 'Unknown',
          avatar: pet.avatar,
          isApplied: appliedPetIds.includes(pet._id.toString())
        }))
      }
    };

    res.json({
      success: true,
      theme: themePreview
    });
  } catch (error) {
    console.error('Get single theme preview error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get theme preview',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
}; 