const Pet = require('../models/Pet');

// Middleware to check if pet editing is allowed
exports.checkEditingPermission = (protectedFields = []) => {
  return async (req, res, next) => {
    try {
      const pet = await Pet.findById(req.params.id);
      if (!pet) {
        return res.status(404).json({ error: 'Pet not found' });
      }

      // If it's first time setup, allow editing
      if (pet.security.isFirstTime) {
        req.pet = pet;
        return next();
      }

      // If fields are not locked, allow editing
      if (!pet.security.lockedFields) {
        req.pet = pet;
        return next();
      }

      // Check if trying to edit protected fields
      const isEditingProtectedFields = protectedFields.length > 0;
      
      if (!isEditingProtectedFields) {
        req.pet = pet;
        return next(); // Allow editing non-protected fields
      }

      // If trying to edit protected fields, check if unlocked
      if (pet.isUnlocked()) {
        req.pet = pet;
        return next();
      }

      return res.status(403).json({ 
        error: 'Trường này đã bị khóa. Vui lòng nhập mã bảo vệ để mở khóa chỉnh sửa.',
        securityError: true,
        requiresPasscode: true
      });
    } catch (error) {
      console.error('Security check error:', error);
      return res.status(500).json({ error: 'Lỗi hệ thống' });
    }
  };
};

// Middleware to check if pet is currently locked out
exports.checkLockout = async (req, res, next) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    if (pet.isLockedOut()) {
      const lockoutEnd = pet.security.lockoutUntil;
      const hoursLeft = Math.ceil((lockoutEnd - new Date()) / (1000 * 60 * 60));
      
      return res.status(423).json({ 
        error: `Tài khoản đã bị khóa. Vui lòng thử lại sau ${hoursLeft} giờ`,
        lockoutUntil: lockoutEnd,
        hoursLeft,
        isLockedOut: true
      });
    }

    req.pet = pet;
    next();
  } catch (error) {
    console.error('Lockout check error:', error);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
}; 