/**
 * Admin Theme Controller
 * Quản lý theme cho admin
 */

const Theme = require('../../models/Theme');
const UserTheme = require('../../models/UserTheme');
const Pet = require('../../models/Pet');
const { uploadThemeImage } = require('../../utils/r2Storage');

/**
 * Get all themes with pagination
 * GET /api/v1/admin/themes
 */
exports.getThemes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Filter options
    const filter = {};
    
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.search) {
      const search = req.query.search;
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Get themes
    const themes = await Theme.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total count
    const total = await Theme.countDocuments(filter);
    
    // Get usage counts for each theme
    const themeIds = themes.map(theme => theme._id);
    const usageCounts = await UserTheme.aggregate([
      {
        $match: {
          themeId: { $in: themeIds }
        }
      },
      {
        $group: {
          _id: '$themeId',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Map usage counts to themes
    const themesWithUsageCount = themes.map(theme => {
      const usageCount = usageCounts.find(uc => uc._id.toString() === theme._id.toString());
      return {
        ...theme,
        usageCount: usageCount ? usageCount.count : 0
      };
    });
    
    res.json({
      success: true,
      data: {
        themes: themesWithUsageCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Admin get themes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load themes',
      error: error.message
    });
  }
};

/**
 * Get theme details
 * GET /api/v1/admin/theme/:themeId
 */
exports.getThemeDetails = async (req, res) => {
  try {
    const { themeId } = req.params;
    
    // Get theme details
    const theme = await Theme.findById(themeId).lean();
    
    if (!theme) {
      return res.status(404).json({
        success: false,
        message: 'Theme not found'
      });
    }
    
    // Get usage statistics
    const userCount = await UserTheme.countDocuments({ themeId });
    
    // Get pets using this theme
    const petCount = await Pet.countDocuments({ themeId });
    
    // Get recent purchases
    const recentPurchases = await UserTheme.find({ themeId })
      .sort({ purchaseDate: -1 })
      .limit(10)
      .populate('userId', 'name email')
      .lean();
    
    res.json({
      success: true,
      data: {
        theme,
        stats: {
          userCount,
          petCount
        },
        recentPurchases: recentPurchases.map(purchase => ({
          id: purchase._id,
          user: purchase.userId ? {
            id: purchase.userId._id,
            name: purchase.userId.name,
            email: purchase.userId.email
          } : null,
          purchaseDate: purchase.purchaseDate,
          transactionId: purchase.transactionId
        }))
      }
    });
    
  } catch (error) {
    console.error('Admin get theme details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load theme details',
      error: error.message
    });
  }
};

/**
 * Create new theme
 * POST /api/v1/admin/theme
 */
exports.createTheme = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      presetKey,
      templateData,
      isActive
    } = req.body;
    
    // Validate required fields
    if (!name || !description || price === undefined || !presetKey) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, preset key, and price are required'
      });
    }
    
    // Xử lý image nếu có file upload
    let imageData = {};
    if (req.files && req.files.image) {
      const imageFile = req.files.image;
      
      const r2Result = await uploadThemeImage(
        imageFile.data,
        {
          filename: imageFile.name,
          contentType: imageFile.mimetype
        }
      );
      
      if (!r2Result.success) {
        console.error('[THEME CREATE] Image upload failed:', r2Result.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload theme image',
          error: r2Result.error
        });
      }
      
      imageData = {
        r2Key: r2Result.key,
        bucket: r2Result.bucket,
        publicUrl: r2Result.publicUrl,
        originalName: r2Result.originalName,
        mimetype: r2Result.contentType,
        size: r2Result.size,
        uploadedAt: new Date()
      };
    }
    
    // Create theme
    const theme = await Theme.create({
      name,
      description,
      presetKey,
      price: parseFloat(price) || 0,
      category: category || 'general',
      image: imageData,
      templateData: templateData || {},
      isActive: isActive !== undefined ? isActive : true,
      isPremium: parseFloat(price) > 0,
      inStore: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    res.status(201).json({
      success: true,
      message: 'Theme created successfully',
      data: theme
    });
    
  } catch (error) {
    console.error('Admin create theme error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create theme',
      error: error.message
    });
  }
};

/**
 * Update theme
 * PUT /api/v1/admin/theme/:themeId
 */
exports.updateTheme = async (req, res) => {
  try {
    const { themeId } = req.params;
    const updateData = req.body;
    
    // Validate update data
    const allowedFields = [
      'name',
      'description',
      'price',
      'category',
      'presetKey',
      'templateData',
      'isActive',
      'inStore',
      'order'
    ];
    
    // Filter out non-allowed fields
    const filteredData = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    });
    
    // Set isPremium based on price
    if (filteredData.price !== undefined) {
      filteredData.isPremium = parseFloat(filteredData.price) > 0;
    }
    
    // Add updated timestamp
    filteredData.updatedAt = new Date();
    
    // Tìm theme hiện tại
    const theme = await Theme.findById(themeId);
    if (!theme) {
      return res.status(404).json({
        success: false,
        message: 'Theme not found'
      });
    }
    
    // Xử lý image nếu có file upload
    if (req.files && req.files.image) {
      const imageFile = req.files.image;
      
      // Xóa ảnh cũ nếu có
      if (theme.image && theme.image.r2Key) {
        try {
          const { deleteFile } = require('../../utils/r2Storage');
          await deleteFile(theme.image.bucket || 'vnipet', theme.image.r2Key);
        } catch (deleteErr) {
          console.warn('[THEME UPDATE] Failed to delete old image:', deleteErr);
        }
      }
      
      const r2Result = await uploadThemeImage(
        imageFile.data,
        {
          filename: imageFile.name,
          contentType: imageFile.mimetype
        }
      );
      
      if (!r2Result.success) {
        console.error('[THEME UPDATE] Image upload failed:', r2Result.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload theme image',
          error: r2Result.error
        });
      }
      
      filteredData.image = {
        r2Key: r2Result.key,
        bucket: r2Result.bucket,
        publicUrl: r2Result.publicUrl,
        originalName: r2Result.originalName,
        mimetype: r2Result.contentType,
        size: r2Result.size,
        uploadedAt: new Date()
      };
    }
    
    // Update theme
    const updatedTheme = await Theme.findByIdAndUpdate(
      themeId,
      { $set: filteredData },
      { new: true, runValidators: true }
    );
    
    if (!updatedTheme) {
      return res.status(404).json({
        success: false,
        message: 'Theme not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Theme updated successfully',
      data: updatedTheme
    });
    
  } catch (error) {
    console.error('Admin update theme error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update theme',
      error: error.message
    });
  }
};

/**
 * Delete theme
 * DELETE /api/v1/admin/theme/:themeId
 */
exports.deleteTheme = async (req, res) => {
  try {
    const { themeId } = req.params;
    
    // Check if theme is in use
    const userThemeCount = await UserTheme.countDocuments({ themeId });
    const petCount = await Pet.countDocuments({ themeId });
    
    if (userThemeCount > 0 || petCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete theme that is in use. Deactivate it instead.',
        data: {
          userThemeCount,
          petCount
        }
      });
    }
    
    // Tìm theme trước khi xóa
    const theme = await Theme.findById(themeId);
    if (!theme) {
      return res.status(404).json({
        success: false,
        message: 'Theme not found'
      });
    }
    
    // Xóa ảnh trên R2 nếu có
    if (theme.image && theme.image.r2Key) {
      try {
        const { deleteFile } = require('../../utils/r2Storage');
        await deleteFile(theme.image.bucket || 'vnipet', theme.image.r2Key);
      } catch (deleteErr) {
        console.warn('[THEME DELETE] Failed to delete image:', deleteErr);
      }
    }
    
    // Delete theme
    await Theme.findByIdAndDelete(themeId);
    
    res.json({
      success: true,
      message: 'Theme deleted successfully'
    });
    
  } catch (error) {
    console.error('Admin delete theme error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete theme',
      error: error.message
    });
  }
}; 