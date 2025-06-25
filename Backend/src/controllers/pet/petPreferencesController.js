const Pet = require('../../models/Pet');
const PetOwnerUser = require('../../models/PetOwnerUser');
const { PaginationHelper } = require('../../utils/pagination');
const asyncWrap = require('../../utils/asyncWrap');

/**
 * Get Pet Data with Mobile-Optimized Lazy Loading
 * @route GET /api/v1/pet-owner/pets
 * @access Private (Pet Owner)
 */
const getPetPreferences = asyncWrap(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10, sort = 'lastUpdated', order = 'desc' } = req.query;
  
  // Phân trang params
  const pagination = PaginationHelper.parseParams(req.query, {
    defaultPage: 1,
    defaultLimit: 10,
    maxLimit: 50
  });
  
  // Tạo sort options
  const sortOptions = {};
  sortOptions[sort] = order === 'desc' ? -1 : 1;
  
  // Áp dụng filters từ query params
  const filters = { ownerAccount: userId };
  
  if (req.query.species) {
    filters['info.species'] = req.query.species;
  }
  
  if (req.query.status) {
    filters.status = req.query.status;
      }

  // Đếm tổng số document
  const total = await Pet.countDocuments(filters);
  
  // Query với phân trang
  const pets = await Pet.find(filters)
    .sort(sortOptions)
    .skip(pagination.skip)
    .limit(pagination.limit)
    .select('qrToken info avatar themeId status lastUpdated createdAt')
    .populate('themeId', 'name previewUrl')
    .lean();
  
  // Tạo metadata phân trang
  const paginationMeta = PaginationHelper.createMeta(total, pagination.page, pagination.limit);
  
  // Tối ưu hóa dữ liệu cho mobile
  const optimizedPets = pets.map(pet => ({
    id: pet._id,
    name: pet.info.name,
    species: pet.info.species,
    breed: pet.info.breed,
    age: pet.info.age,
    avatar: pet.avatar,
    qrToken: pet.qrToken,
    status: pet.status,
    theme: pet.themeId ? {
      id: pet.themeId._id,
      name: pet.themeId.name,
      preview: pet.themeId.previewUrl
    } : null,
    updatedAt: pet.lastUpdated,
    createdAt: pet.createdAt
  }));
  
  return res.apiPaginated(optimizedPets, paginationMeta, 'Pet preferences retrieved successfully');
});

/**
 * Get Pet Detail with Mobile-Optimized Data
 * @route GET /api/v1/pet-owner/pets/:petId
 * @access Private (Pet Owner)
 */
const getPetDetail = asyncWrap(async (req, res) => {
  const userId = req.user.id;
  const { petId } = req.params;
  
  const pet = await Pet.findOne({ 
    _id: petId, 
    ownerAccount: userId 
  })
  .populate('themeId')
  .lean();
  
  if (!pet) {
    return res.apiNotFound('Pet not found');
  }
  
  // Kiểm tra mobile client từ request headers
  const userAgent = req.get('user-agent') || '';
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
    
  // Nếu là mobile, tối ưu payload size
  if (isMobile && req.query.optimized !== 'false') {
    const optimizedPet = {
      id: pet._id,
      name: pet.info.name,
      species: pet.info.species,
      breed: pet.info.breed,
      age: pet.info.age,
      weight: pet.info.weight,
      avatar: pet.avatar,
      qrToken: pet.qrToken,
      status: pet.status,
      owner: {
        id: pet.ownerAccount,
        name: pet.owner?.name,
        phone: pet.owner?.phone
      },
      theme: pet.themeId ? {
        id: pet.themeId._id,
        name: pet.themeId.name,
        preview: pet.themeId.previewUrl
      } : null,
      // Tối ưu dữ liệu lịch sử
      history: pet.medicalHistory ? pet.medicalHistory.slice(0, 5).map(h => ({
        id: h._id,
        date: h.date,
        title: h.title,
        type: h.type,
        // Chỉ gửi tóm tắt, không gửi notes dài
        summary: h.notes ? h.notes.substring(0, 100) + (h.notes.length > 100 ? '...' : '') : ''
      })) : [],
      // Thêm cờ cho biết đây là dữ liệu tối ưu
      _optimized: true,
      _hasMoreHistory: (pet.medicalHistory || []).length > 5,
      updatedAt: pet.lastUpdated,
      createdAt: pet.createdAt
    };
    
    return res.apiSuccess(optimizedPet, 'Pet details retrieved successfully');
    }

  // Ngược lại, trả về đầy đủ thông tin
  return res.apiSuccess(pet, 'Pet details retrieved successfully');
});

/**
 * Lazy Load Pet Medical History
 * @route GET /api/v1/pet-owner/pets/:petId/history
 * @access Private (Pet Owner)
 */
const getPetMedicalHistory = asyncWrap(async (req, res) => {
  const userId = req.user.id;
  const { petId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const pet = await Pet.findOne({ 
    _id: petId, 
    ownerAccount: userId 
  }).lean();
  
    if (!pet) {
    return res.apiNotFound('Pet not found');
    }

  // Nếu không có lịch sử
  if (!pet.medicalHistory || pet.medicalHistory.length === 0) {
    return res.apiPaginated([], {
      page: 1,
      limit: parseInt(limit),
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    }, 'No medical history found');
  }
  
  // Áp dụng phân trang với mảng trong document
  const pagination = PaginationHelper.parseParams(req.query);
  const total = pet.medicalHistory.length;
  
  // Sort theo ngày mới nhất
  const sortedHistory = [...pet.medicalHistory].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });
  
  // Phân trang trên mảng đã sắp xếp
  const paginatedHistory = sortedHistory.slice(
    pagination.skip,
    pagination.skip + pagination.limit
  );
  
  // Tạo metadata phân trang
  const paginationMeta = PaginationHelper.createMeta(total, pagination.page, pagination.limit);
  
  return res.apiPaginated(paginatedHistory, paginationMeta, 'Medical history retrieved successfully');
});

/**
 * Lazy Load Pet Vaccinations
 * @route GET /api/v1/pet-owner/pets/:petId/vaccinations
 * @access Private (Pet Owner)
 */
const getPetVaccinations = asyncWrap(async (req, res) => {
  const userId = req.user.id;
  const { petId } = req.params;
  
  const pet = await Pet.findOne({ 
    _id: petId, 
    ownerAccount: userId 
  }).lean();
  
  if (!pet) {
    return res.apiNotFound('Pet not found');
  }
  
  // Nếu không có tiêm chủng
  if (!pet.vaccinations || pet.vaccinations.length === 0) {
    return res.apiSuccess([], 'No vaccinations found');
  }
  
  // Sort theo ngày mới nhất
  const sortedVaccinations = [...pet.vaccinations].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });
  
  return res.apiSuccess(sortedVaccinations, 'Vaccinations retrieved successfully');
});

/**
 * Update pet preferences
 * PUT /api/v1/pet-owner/pets/:id/preferences
 */
const updatePetPreferences = async (req, res) => {
  try {
    const petId = req.params.id;
    const { favoriteFoods, favoriteShampoo, dailyRoutine } = req.body;
    
    // Validate input
    if (!favoriteFoods && !favoriteShampoo && !dailyRoutine) {
      return res.status(400).json({
        success: false,
        message: 'At least one preference field is required'
      });
    }
    
    // Prepare update object
    const updateData = { preferences: {} };
    
    if (favoriteFoods) updateData.preferences.favoriteFoods = favoriteFoods;
    if (favoriteShampoo) updateData.preferences.favoriteShampoo = favoriteShampoo;
    if (dailyRoutine) updateData.preferences.dailyRoutine = dailyRoutine;
    
    // Find pet and update preferences
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }
    
    // Update only the provided fields, keep existing values for others
    if (favoriteFoods) pet.preferences.favoriteFoods = favoriteFoods;
    if (favoriteShampoo) pet.preferences.favoriteShampoo = favoriteShampoo;
    if (dailyRoutine) pet.preferences.dailyRoutine = dailyRoutine;
    
    await pet.save();
    
    res.json({
      success: true,
      message: 'Pet preferences updated successfully',
      data: pet.preferences
    });
    
  } catch (error) {
    console.error('Update pet preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update pet preferences',
      error: error.message
    });
  }
};

/**
 * Update specific preference field
 * PATCH /api/v1/pet-owner/pets/:id/preferences/:field
 */
const updatePreferenceField = async (req, res) => {
  try {
    const petId = req.params.id;
    const field = req.params.field;
    const { value } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Value is required'
      });
    }
    
    // Validate field name
    const allowedFields = ['favoriteShampoo', 'dailyRoutine'];
    if (!allowedFields.includes(field) && field !== 'favoriteFoods') {
      return res.status(400).json({
        success: false,
        message: `Invalid field: ${field}. Allowed fields: ${allowedFields.join(', ')}, favoriteFoods`
      });
    }
    
    // Find pet
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }
    
    // Initialize preferences if not exists
    if (!pet.preferences) {
      pet.preferences = {
        favoriteFoods: [],
        favoriteShampoo: '',
        dailyRoutine: ''
      };
    }
    
    // Update the specific field
    pet.preferences[field] = value;
    await pet.save();
    
    res.json({
      success: true,
      message: `Pet preference ${field} updated successfully`,
      data: pet.preferences
    });
    
  } catch (error) {
    console.error('Update preference field error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preference field',
      error: error.message
    });
  }
};

/**
 * Reset pet preferences
 * DELETE /api/v1/pet-owner/pets/:id/preferences
 */
const resetPetPreferences = async (req, res) => {
  try {
    const petId = req.params.id;
    
    // Find pet
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }
    
    // Reset preferences
    pet.preferences = {
      favoriteFoods: [],
      favoriteShampoo: '',
      dailyRoutine: ''
    };
    
    await pet.save();
    
    res.json({
      success: true,
      message: 'Pet preferences reset successfully',
      data: pet.preferences
    });
    
  } catch (error) {
    console.error('Reset pet preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset pet preferences',
      error: error.message
    });
  }
};

/**
 * Add a favorite food
 * POST /api/v1/pet-owner/pets/:id/preferences/favorite-foods
 */
const addFavoriteFood = async (req, res) => {
  try {
    const petId = req.params.id;
    const { food } = req.body;
    
    if (!food) {
      return res.status(400).json({
        success: false,
        message: 'Food is required'
      });
    }
    
    // Find pet
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }
    
    // Initialize preferences if not exists
    if (!pet.preferences) {
      pet.preferences = {
        favoriteFoods: [],
        favoriteShampoo: '',
        dailyRoutine: ''
      };
    }
    
    // Check if food already exists
    if (pet.preferences.favoriteFoods.includes(food)) {
      return res.status(400).json({
        success: false,
        message: 'Food already exists in favorites'
      });
    }
    
    // Check if maximum limit reached
    if (pet.preferences.favoriteFoods.length >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 favorite foods allowed'
      });
    }
    
    // Add food to favorites
    pet.preferences.favoriteFoods.push(food);
    await pet.save();
    
    res.json({
      success: true,
      message: 'Favorite food added successfully',
      data: pet.preferences.favoriteFoods
    });
    
  } catch (error) {
    console.error('Add favorite food error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add favorite food',
      error: error.message
    });
  }
};

/**
 * Remove a favorite food
 * DELETE /api/v1/pet-owner/pets/:id/preferences/favorite-foods/:food
 */
const removeFavoriteFood = async (req, res) => {
  try {
    const petId = req.params.id;
    const food = req.params.food;
    
    // Find pet
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }
    
    // Check if preferences exist
    if (!pet.preferences || !pet.preferences.favoriteFoods) {
      return res.status(400).json({
        success: false,
        message: 'No favorite foods found'
      });
    }
    
    // Check if food exists
    const index = pet.preferences.favoriteFoods.indexOf(food);
    if (index === -1) {
      return res.status(400).json({
        success: false,
        message: 'Food not found in favorites'
      });
    }
    
    // Remove food from favorites
    pet.preferences.favoriteFoods.splice(index, 1);
    await pet.save();
    
    res.json({
      success: true,
      message: 'Favorite food removed successfully',
      data: pet.preferences.favoriteFoods
    });
    
  } catch (error) {
    console.error('Remove favorite food error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove favorite food',
      error: error.message
    });
  }
};

module.exports = {
  getPetPreferences,
  getPetDetail,
  getPetMedicalHistory,
  getPetVaccinations,
  updatePetPreferences,
  updatePreferenceField,
  resetPetPreferences,
  addFavoriteFood,
  removeFavoriteFood
}; 