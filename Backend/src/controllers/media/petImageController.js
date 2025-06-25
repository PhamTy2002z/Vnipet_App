const mongoose = require('mongoose');
const multer   = require('multer');
const Pet      = require('../../models/Pet');
const { uploadPetAvatar, deleteFile, getPublicUrl, isR2Configured } = require('../../utils/r2Storage');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/* ---------- Upload avatar (Chỉ sử dụng R2) ---------- */
exports.uploadAvatar = [
  upload.single('avatar'),
  async (req, res) => {
    try {
      console.log('[AVATAR UPLOAD] Starting upload process...');
      
      if (!req.file) {
        console.log('[AVATAR UPLOAD] Error: No file received');
        return res.status(400).json({ error: 'No file' });
      }

      console.log('[AVATAR UPLOAD] File received:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      const pet = await Pet.findById(req.params.id);
      if (!pet) {
        console.log('[AVATAR UPLOAD] Error: Pet not found:', req.params.id);
        return res.status(404).json({ error: 'Pet not found' });
      }

      console.log('[AVATAR UPLOAD] Pet found, proceeding with upload...');

      // Kiểm tra nếu R2 được cấu hình
      if (!isR2Configured()) {
        console.error('[AVATAR UPLOAD] R2 storage is not configured');
        return res.status(500).json({ error: 'Storage service is unavailable' });
      }
      
      // Tạo key tùy chỉnh dựa trên ID pet
      const customKey = `${pet._id}-${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '-')}`;
      console.log('[AVATAR UPLOAD] Generated custom key:', customKey);
        
      // Xoá avatar R2 cũ nếu có
          if (pet.avatar?.r2Key) {
        console.log('[AVATAR UPLOAD] Deleting old R2 avatar:', pet.avatar.r2Key);
        const deleteResult = await deleteFile(pet.avatar.bucket || 'vnipet', pet.avatar.r2Key);
        console.log('[AVATAR UPLOAD] Delete result:', deleteResult);
          }

      // Upload ảnh lên R2
      const r2Result = await uploadPetAvatar(
            req.file.buffer,
            {
              filename: req.file.originalname,
              contentType: req.file.mimetype,
          key: customKey // Sử dụng custom key
            }
          );

          if (!r2Result.success) {
            console.error('[AVATAR UPLOAD] R2 upload failed with error:', r2Result.error);
            console.error('[AVATAR UPLOAD] Error details:', r2Result.errorDetails || {});
        return res.status(500).json({ error: 'Failed to upload avatar' });
          }

      // Cập nhật thông tin pet với thông tin R2 mới
          pet.avatar = {
            r2Key: r2Result.key,
        bucket: r2Result.bucket,
            publicUrl: r2Result.publicUrl,
            originalName: r2Result.originalName,
            mimetype: r2Result.contentType,
            size: r2Result.size,
            uploadedAt: new Date(),
          };
      // Xóa trường cũ của GridFS
      pet.avatarFileId = undefined;

          await pet.save();
          console.log('[AVATAR UPLOAD] Success: Avatar uploaded to R2 with key:', r2Result.key);
          
          res.json({
            ...pet.toObject(),
        avatarUrl: r2Result.publicUrl
          });
    } catch (err) {
      console.error('[AVATAR UPLOAD] Unexpected error:', err);
      res.status(500).json({ error: 'Upload failed' });
    }
  },
];

/* ---------- Trả về avatar URL ---------- */
exports.getAvatar = async (req, res) => {
  try {
    const id = req.params.id;
    
    if (mongoose.Types.ObjectId.isValid(id)) {
      // Tìm pet và chuyển hướng đến R2 URL
      const pet = await Pet.findById(id);
      if (pet && pet.avatar?.publicUrl) {
        console.log('[AVATAR GET] Redirecting to R2 URL for pet:', id);
        return res.redirect(pet.avatar.publicUrl);
      }
    
      // Không tìm thấy pet hoặc avatar
      return res.status(404).json({ error: 'Avatar not found' });
    }
    
    // Không phải ObjectId hợp lệ
    return res.status(400).json({ error: 'Invalid pet ID' });
  } catch (error) {
    console.error('[AVATAR GET] Error:', error);
    res.status(400).end();
  }
};

/* ---------- Lấy avatar URL ---------- */
exports.getAvatarUrl = (pet) => {
  if (pet.avatar?.publicUrl) {
    return pet.avatar.publicUrl;
  }
  
  if (pet.avatar?.r2Key && pet.avatar?.bucket) {
    return getPublicUrl(pet.avatar.bucket, pet.avatar.r2Key);
  }
  
  return null;
};

/* ---------- Xóa avatar ---------- */
exports.deleteAvatar = async (req, res) => {
  try {
    console.log('[AVATAR DELETE] Starting avatar deletion process...');
    
    const pet = await Pet.findById(req.params.id);
    if (!pet) {
      console.log('[AVATAR DELETE] Error: Pet not found:', req.params.id);
      return res.status(404).json({ error: 'Pet not found' });
    }

    // Kiểm tra xem pet có avatar không
    if (!pet.avatar?.r2Key) {
      console.log('[AVATAR DELETE] No avatar found to delete for pet:', req.params.id);
      return res.status(404).json({ error: 'No avatar found to delete' });
    }

    console.log('[AVATAR DELETE] Pet found, proceeding with deletion...');

    // Xóa từ R2
    if (pet.avatar?.r2Key) {
      try {
        console.log('[AVATAR DELETE] Deleting R2 avatar...');
        await deleteFile(pet.avatar.bucket || 'vnipet', pet.avatar.r2Key);
        console.log('[AVATAR DELETE] R2 avatar deleted successfully');
      } catch (r2Error) {
        console.error('[AVATAR DELETE] R2 deletion failed:', r2Error);
      }
    }

    // Xóa thông tin avatar từ database
    pet.avatar = {
      r2Key: null,
      bucket: null,
      publicUrl: null,
      originalName: null,
      mimetype: null,
      size: null,
      uploadedAt: null,
    };
    // Xóa trường cũ của GridFS
    pet.avatarFileId = undefined;

    await pet.save();
    console.log('[AVATAR DELETE] Success: Avatar data cleared from database');

    // Trả về dữ liệu pet đã cập nhật
    const petData = pet.toObject();
    petData.avatarUrl = null; // Đảm bảo frontend biết avatar đã bị xóa

    res.json({
      ...petData,
      message: 'Avatar removed successfully'
    });

  } catch (err) {
    console.error('[AVATAR DELETE] Unexpected error:', err);
    res.status(500).json({ error: 'Failed to delete avatar' });
  }
};
