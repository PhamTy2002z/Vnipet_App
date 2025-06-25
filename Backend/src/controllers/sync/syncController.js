/**
 * Sync Controller
 * Quản lý đồng bộ dữ liệu giữa thiết bị di động và backend
 */

const mongoose = require('mongoose');
const Pet = require('../../models/Pet');
const User = require('../../models/PetOwnerUser');
const UserTheme = require('../../models/UserTheme');
const Theme = require('../../models/Theme');

/**
 * Lấy dữ liệu đồng bộ từ lần cuối đồng bộ
 * GET /api/v1/sync/data
 */
exports.getSyncData = async (req, res) => {
  try {
    // Lấy timestamp từ request
    const { lastSyncTime } = req.query;
    const lastSync = lastSyncTime ? new Date(parseInt(lastSyncTime)) : new Date(0);
    
    // Lấy ID của người dùng hiện tại
    const userId = req.user.id;
    
    // Lấy thú cưng đã cập nhật kể từ lần cuối đồng bộ
    const updatedPets = await Pet.find({
      ownerAccount: userId,
      updatedAt: { $gt: lastSync }
    }).lean();
    
    // Lấy thông tin người dùng
    const userInfo = await User.findById(userId)
      .select('-password -refreshTokens')
      .lean();
    
    // Lấy theme đã mua/sở hữu được cập nhật
    const userThemes = await UserTheme.find({
      userId,
      updatedAt: { $gt: lastSync }
    }).lean();
    
    // Trả về dữ liệu đã cập nhật
    return res.json({
      success: true,
      syncTime: Date.now(),
      data: {
        user: userInfo,
        pets: updatedPets,
        userThemes: userThemes
      }
    });
  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi đồng bộ dữ liệu',
      error: error.message
    });
  }
};

/**
 * Nhận các thay đổi từ thiết bị di động
 * POST /api/v1/sync/changes
 */
exports.syncChanges = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { changes } = req.body;
    const userId = req.user.id;
    const results = {
      processed: 0,
      errors: []
    };
    
    // Xử lý các thay đổi từ client
    if (changes && Array.isArray(changes)) {
      for (const change of changes) {
        try {
          // Xác thực thay đổi thuộc về người dùng này
          if (change.entity === 'pet') {
            // Xử lý thay đổi thông tin thú cưng
            if (change.action === 'update') {
              const petId = change.id;
              const pet = await Pet.findOne({ _id: petId, ownerAccount: userId });
              
              if (!pet) {
                results.errors.push({
                  id: change.id,
                  message: 'Thú cưng không thuộc về người dùng này'
                });
                continue;
              }
              
              // Cập nhật dữ liệu
              await Pet.findByIdAndUpdate(
                petId,
                { $set: change.data },
                { session, new: true }
              );
              
              results.processed++;
            }
          }
          // Thêm xử lý cho các entity khác ở đây
        } catch (error) {
          results.errors.push({
            id: change.id,
            message: error.message
          });
        }
      }
    }
    
    await session.commitTransaction();
    session.endSession();
    
    return res.json({
      success: true,
      syncTime: Date.now(),
      results
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Sync changes error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi xử lý thay đổi',
      error: error.message
    });
  }
};

/**
 * Lấy toàn bộ dữ liệu cho sử dụng offline
 * GET /api/v1/sync/offline-data
 */
exports.getOfflineData = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Lấy thông tin người dùng
    const user = await User.findById(userId)
      .select('-password -refreshTokens')
      .lean();
    
    // Lấy tất cả thú cưng của người dùng
    const pets = await Pet.find({ ownerAccount: userId }).lean();
    
    // Lấy các theme mà người dùng sở hữu
    const userThemes = await UserTheme.find({ userId }).lean();
    
    // Lấy thông tin các theme từ ID
    let themeIds = userThemes.map(ut => ut.themeId);
    const themes = await Theme.find({ _id: { $in: themeIds } }).lean();
    
    // Trả về tất cả dữ liệu
    return res.json({
      success: true,
      syncTime: Date.now(),
      data: {
        user,
        pets,
        userThemes,
        themes
      }
    });
  } catch (error) {
    console.error('Offline data sync error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy dữ liệu offline',
      error: error.message
    });
  }
};

/**
 * Tạo hoặc cập nhật marker đồng bộ
 * POST /api/v1/sync/markers
 */
exports.createSyncMarker = async (req, res) => {
  try {
    const userId = req.user.id;
    const { deviceId, syncTime, type } = req.body;
    
    if (!deviceId || !syncTime) {
      return res.status(400).json({
        success: false,
        message: 'deviceId và syncTime là bắt buộc'
      });
    }
    
    // Cập nhật thông tin đồng bộ cuối cùng của người dùng
    await User.findByIdAndUpdate(userId, {
      $set: {
        [`syncInfo.${deviceId}`]: {
          lastSync: new Date(parseInt(syncTime)),
          syncType: type || 'full',
          updatedAt: new Date()
        }
      }
    });
    
    return res.json({
      success: true,
      message: 'Đã cập nhật marker đồng bộ'
    });
  } catch (error) {
    console.error('Sync marker error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật marker đồng bộ',
      error: error.message
    });
  }
};

/**
 * Sync Controller
 * Quản lý đồng bộ dữ liệu offline cho ứng dụng di động
 */

/**
 * Đồng bộ dữ liệu người dùng
 * POST /api/v1/sync/user
 */
exports.syncUserData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { lastSyncTimestamp } = req.body;
    
    // Kiểm tra timestamp
    const lastSync = lastSyncTimestamp ? new Date(parseInt(lastSyncTimestamp)) : new Date(0);
    
    // Lấy thông tin người dùng
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy người dùng'
      });
    }
    
    // Kiểm tra nếu dữ liệu người dùng đã thay đổi kể từ lần đồng bộ cuối
    const userUpdated = user.updatedAt > lastSync;
    
    // Lấy danh sách thú cưng của người dùng đã thay đổi kể từ lần đồng bộ cuối
    const updatedPets = await Pet.find({
      ownerAccount: userId,
      updatedAt: { $gt: lastSync }
    }).populate('themeId');
    
    // Lấy danh sách theme đã thay đổi kể từ lần đồng bộ cuối
    const updatedThemes = await Theme.find({
      updatedAt: { $gt: lastSync },
      $or: [
        { isPublic: true },
        { purchasedBy: userId }
      ]
    });
    
    // Tạo đối tượng dữ liệu đồng bộ
    const syncData = {
      timestamp: Date.now(),
      user: userUpdated ? {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        preferences: user.preferences,
        accountTier: user.accountTier,
        totalPetsLimit: user.totalPetsLimit,
        hasCompletedInitialSetup: user.hasCompletedInitialSetup,
        updatedAt: user.updatedAt
      } : null,
      pets: updatedPets.length > 0 ? updatedPets : null,
      themes: updatedThemes.length > 0 ? updatedThemes : null
    };
    
    res.json({
      success: true,
      data: syncData,
      hasChanges: userUpdated || updatedPets.length > 0 || updatedThemes.length > 0
    });
    
  } catch (error) {
    console.error('Sync user data error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Đồng bộ dữ liệu thú cưng
 * POST /api/v1/sync/pets
 */
exports.syncPetData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { lastSyncTimestamp, petIds } = req.body;
    
    // Kiểm tra timestamp
    const lastSync = lastSyncTimestamp ? new Date(parseInt(lastSyncTimestamp)) : new Date(0);
    
    // Tìm kiếm các thú cưng đã thay đổi
    let query = {
      ownerAccount: userId,
      updatedAt: { $gt: lastSync }
    };
    
    // Nếu có danh sách petIds, chỉ đồng bộ những thú cưng đó
    if (petIds && Array.isArray(petIds) && petIds.length > 0) {
      query._id = { $in: petIds };
    }
    
    const updatedPets = await Pet.find(query)
      .populate('themeId')
      .sort({ updatedAt: -1 });
    
    res.json({
      success: true,
      timestamp: Date.now(),
      data: updatedPets,
      count: updatedPets.length
    });
    
  } catch (error) {
    console.error('Sync pet data error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Đồng bộ dữ liệu theme
 * POST /api/v1/sync/themes
 */
exports.syncThemeData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { lastSyncTimestamp } = req.body;
    
    // Kiểm tra timestamp
    const lastSync = lastSyncTimestamp ? new Date(parseInt(lastSyncTimestamp)) : new Date(0);
    
    // Lấy danh sách theme đã thay đổi (public hoặc đã mua)
    const updatedThemes = await Theme.find({
      updatedAt: { $gt: lastSync },
      $or: [
        { isPublic: true },
        { purchasedBy: userId }
      ]
    }).sort({ updatedAt: -1 });
    
    res.json({
      success: true,
      timestamp: Date.now(),
      data: updatedThemes,
      count: updatedThemes.length
    });
    
  } catch (error) {
    console.error('Sync theme data error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Đồng bộ dữ liệu offline
 * POST /api/v1/sync/offline-changes
 */
exports.syncOfflineChanges = async (req, res) => {
  try {
    const userId = req.user.id;
    const { changes } = req.body;
    
    if (!changes || !Array.isArray(changes) || changes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Không có dữ liệu thay đổi để đồng bộ'
      });
    }
    
    const results = {
      success: [],
      failed: []
    };
    
    // Xử lý từng thay đổi
    for (const change of changes) {
      try {
        const { type, action, data, localId } = change;
        
        if (type === 'pet') {
          await processPetChange(userId, action, data, localId, results);
        } else if (type === 'user') {
          await processUserChange(userId, action, data, results);
        } else {
          results.failed.push({
            localId: localId || 'unknown',
            error: `Loại dữ liệu không được hỗ trợ: ${type}`
          });
        }
      } catch (error) {
        results.failed.push({
          localId: change.localId || 'unknown',
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      results,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Sync offline changes error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Xử lý thay đổi dữ liệu thú cưng
 */
async function processPetChange(userId, action, data, localId, results) {
  // Kiểm tra quyền sở hữu thú cưng nếu có ID
  if (data._id) {
    const pet = await Pet.findOne({
      _id: data._id,
      ownerAccount: userId
    });
    
    if (!pet) {
      throw new Error('Không tìm thấy thú cưng hoặc bạn không có quyền truy cập');
    }
  }
  
  let result;
  
  switch (action) {
    case 'update':
      // Cập nhật thú cưng
      result = await Pet.findOneAndUpdate(
        { _id: data._id, ownerAccount: userId },
        { $set: data },
        { new: true }
      );
      break;
      
    case 'create':
      // Tạo thú cưng mới
      data.ownerAccount = userId;
      result = await Pet.create(data);
      break;
      
    default:
      throw new Error(`Hành động không được hỗ trợ: ${action}`);
  }
  
  results.success.push({
    localId: localId || 'unknown',
    serverId: result._id,
    type: 'pet',
    action,
    timestamp: Date.now()
  });
}

/**
 * Xử lý thay đổi dữ liệu người dùng
 */
async function processUserChange(userId, action, data, results) {
  if (action !== 'update') {
    throw new Error(`Hành động không được hỗ trợ cho người dùng: ${action}`);
  }
  
  // Chỉ cho phép cập nhật một số trường nhất định
  const allowedFields = ['name', 'phone', 'preferences'];
  const updateData = {};
  
  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  });
  
  const result = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true }
  );
  
  results.success.push({
    serverId: result._id,
    type: 'user',
    action,
    timestamp: Date.now()
  });
}

/**
 * Kiểm tra trạng thái đồng bộ
 * GET /api/v1/sync/status
 */
exports.getSyncStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Lấy thông tin người dùng
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy người dùng'
      });
    }
    
    // Đếm số lượng thú cưng
    const petCount = await Pet.countDocuments({ ownerAccount: userId });
    
    // Đếm số lượng theme đã mua
    const themeCount = await Theme.countDocuments({ purchasedBy: userId });
    
    res.json({
      success: true,
      data: {
        lastSyncTimestamp: Date.now(),
        user: {
          id: user._id,
          updatedAt: user.updatedAt
        },
        counts: {
          pets: petCount,
          themes: themeCount
        }
      }
    });
    
  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}; 