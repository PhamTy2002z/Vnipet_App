/**
 * Media Controller
 * Quản lý tải lên và xử lý media (hình ảnh, video) cho ứng dụng di động
 */

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const Pet = require('../../models/Pet');

// Cấu hình lưu trữ cho multer
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadPath = path.join(process.cwd(), 'public', 'uploads', 'pets');
    
    // Tạo thư mục nếu chưa tồn tại
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    // Tạo tên file duy nhất với uuid
    const uniqueFilename = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

// Lọc file chỉ chấp nhận hình ảnh
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file hình ảnh (jpg, jpeg, png, webp, heic)'), false);
  }
};

// Cấu hình multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: fileFilter
});

/**
 * Upload avatar cho thú cưng
 * POST /api/v1/media/pet/:petId/avatar
 */
exports.uploadPetAvatar = async (req, res) => {
  try {
    // Middleware upload file
    upload.single('avatar')(req, res, async function(err) {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              error: 'Kích thước file quá lớn, tối đa 10MB'
            });
          }
        }
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Không có file được tải lên'
        });
      }
      
      const petId = req.params.petId;
      
      // Kiểm tra quyền sở hữu thú cưng
      const pet = await Pet.findOne({ 
        _id: petId,
        ownerAccount: req.user.id
      });
      
      if (!pet) {
        // Xóa file đã upload nếu không có quyền
        fs.unlinkSync(req.file.path);
        
        return res.status(404).json({
          success: false,
          error: 'Không tìm thấy thú cưng hoặc bạn không có quyền truy cập'
        });
      }
      
      // Tối ưu hóa hình ảnh với sharp
      const optimizedFilename = `optimized-${path.basename(req.file.path)}`;
      const optimizedPath = path.join(path.dirname(req.file.path), optimizedFilename);
      
      await sharp(req.file.path)
        .resize(500, 500, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toFile(optimizedPath);
      
      // Xóa file gốc sau khi đã tối ưu
      fs.unlinkSync(req.file.path);
      
      // Cập nhật avatar URL trong database
      const avatarUrl = `/uploads/pets/${optimizedFilename}`;
      
      pet.avatarUrl = avatarUrl;
      await pet.save();
      
      res.json({
        success: true,
        message: 'Avatar đã được cập nhật thành công',
        data: {
          avatarUrl
        }
      });
    });
  } catch (error) {
    console.error('Upload pet avatar error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Xóa avatar của thú cưng
 * DELETE /api/v1/media/pet/:petId/avatar
 */
exports.deletePetAvatar = async (req, res) => {
  try {
    const petId = req.params.petId;
    
    // Kiểm tra quyền sở hữu thú cưng
    const pet = await Pet.findOne({ 
      _id: petId,
      ownerAccount: req.user.id
    });
    
    if (!pet) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thú cưng hoặc bạn không có quyền truy cập'
      });
    }
    
    // Kiểm tra nếu có avatar
    if (!pet.avatarUrl) {
      return res.status(400).json({
        success: false,
        error: 'Thú cưng không có avatar'
      });
    }
    
    // Xóa file avatar
    const avatarPath = path.join(process.cwd(), 'public', pet.avatarUrl);
    
    if (fs.existsSync(avatarPath)) {
      fs.unlinkSync(avatarPath);
    }
    
    // Cập nhật database
    pet.avatarUrl = null;
    await pet.save();
    
    res.json({
      success: true,
      message: 'Avatar đã được xóa thành công'
    });
    
  } catch (error) {
    console.error('Delete pet avatar error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Upload nhiều hình ảnh cho thú cưng
 * POST /api/v1/media/pet/:petId/images
 */
exports.uploadPetImages = async (req, res) => {
  try {
    // Middleware upload nhiều file
    const uploadMultiple = upload.array('images', 10); // Tối đa 10 hình
    
    uploadMultiple(req, res, async function(err) {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              error: 'Kích thước file quá lớn, tối đa 10MB'
            });
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
              success: false,
              error: 'Số lượng file vượt quá giới hạn (tối đa 10 hình)'
            });
          }
        }
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Không có file được tải lên'
        });
      }
      
      const petId = req.params.petId;
      
      // Kiểm tra quyền sở hữu thú cưng
      const pet = await Pet.findOne({ 
        _id: petId,
        ownerAccount: req.user.id
      });
      
      if (!pet) {
        // Xóa tất cả file đã upload nếu không có quyền
        req.files.forEach(file => {
          fs.unlinkSync(file.path);
        });
        
        return res.status(404).json({
          success: false,
          error: 'Không tìm thấy thú cưng hoặc bạn không có quyền truy cập'
        });
      }
      
      // Xử lý và tối ưu từng hình ảnh
      const imageUrls = [];
      
      for (const file of req.files) {
        const optimizedFilename = `gallery-${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        const optimizedPath = path.join(path.dirname(file.path), optimizedFilename);
        
        await sharp(file.path)
          .resize(1200, null, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(optimizedPath);
        
        // Xóa file gốc sau khi đã tối ưu
        fs.unlinkSync(file.path);
        
        const imageUrl = `/uploads/pets/${optimizedFilename}`;
        imageUrls.push(imageUrl);
      }
      
      // Cập nhật gallery trong database
      if (!pet.gallery) {
        pet.gallery = [];
      }
      
      pet.gallery = [...pet.gallery, ...imageUrls];
      await pet.save();
      
      res.json({
        success: true,
        message: `${imageUrls.length} hình ảnh đã được tải lên thành công`,
        data: {
          imageUrls
        }
      });
    });
  } catch (error) {
    console.error('Upload pet images error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Xóa một hình ảnh từ gallery của thú cưng
 * DELETE /api/v1/media/pet/:petId/images/:imageIndex
 */
exports.deletePetImage = async (req, res) => {
  try {
    const { petId, imageIndex } = req.params;
    const index = parseInt(imageIndex);
    
    if (isNaN(index) || index < 0) {
      return res.status(400).json({
        success: false,
        error: 'Chỉ số hình ảnh không hợp lệ'
      });
    }
    
    // Kiểm tra quyền sở hữu thú cưng
    const pet = await Pet.findOne({ 
      _id: petId,
      ownerAccount: req.user.id
    });
    
    if (!pet) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thú cưng hoặc bạn không có quyền truy cập'
      });
    }
    
    // Kiểm tra nếu có gallery và index hợp lệ
    if (!pet.gallery || !pet.gallery[index]) {
      return res.status(400).json({
        success: false,
        error: 'Hình ảnh không tồn tại'
      });
    }
    
    // Xóa file hình ảnh
    const imageUrl = pet.gallery[index];
    const imagePath = path.join(process.cwd(), 'public', imageUrl);
    
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    
    // Cập nhật database
    pet.gallery.splice(index, 1);
    await pet.save();
    
    res.json({
      success: true,
      message: 'Hình ảnh đã được xóa thành công'
    });
    
  } catch (error) {
    console.error('Delete pet image error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}; 