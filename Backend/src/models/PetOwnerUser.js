const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PetOwnerUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[\d\s\-\+\(\)]+$/, 'Please enter a valid phone number']
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    isActive: {
      type: Boolean,
      default: true
    },
    
    // Multi-pet management fields
    pets: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pet'
    }],
    
    // Account tier and limits
    accountTier: {
      type: String,
      enum: ['basic', 'premium'],
      default: 'basic'
    },
    totalPetsLimit: {
      type: Number,
      default: 5 // Basic users can have up to 5 pets
    },
    
    // Theme management
    purchasedThemes: [{
      themeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Theme'
      },
      purchaseDate: {
        type: Date,
        default: Date.now
      },
      transactionId: String
    }],
    
    // Profile completion tracking
    hasCompletedInitialSetup: {
      type: Boolean,
      default: false
    },
    
    // Account preferences
    preferences: {
      enableEmailNotifications: {
        type: Boolean,
        default: true
      },
      enableQRLinkingNotifications: {
        type: Boolean,
        default: true
      },
      defaultPetVisibility: {
        type: String,
        enum: ['public', 'private'],
        default: 'public'
      }
    },
    
    // Mobile app sync information
    syncInfo: {
      type: Map,
      of: {
        lastSync: Date,
        syncType: {
          type: String,
          enum: ['full', 'partial', 'pets', 'themes'],
          default: 'full'
        },
        updatedAt: Date
      },
      default: {}
    },
    
    // Security settings
    lastLoginAt: {
      type: Date,
      default: null
    },
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lockoutUntil: {
      type: Date,
      default: null
    },
    // OTP for password reset
    otpCode: {
      type: String,
      default: null
    },
    otpExpiresAt: {
      type: Date,
      default: null
    },
    otpAttempts: {
      type: Number,
      default: 0
    }
  },
  { 
    timestamps: true,
    toJSON: { 
      transform: function(doc, ret) {
        delete ret.password;
        delete ret.otpCode; // Hide OTP code in JSON responses
        return ret;
      }
    }
  }
);

// Hash password before saving
PetOwnerUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
PetOwnerUserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if account is locked
PetOwnerUserSchema.methods.isLocked = function() {
  return !!(this.lockoutUntil && this.lockoutUntil > Date.now());
};

// Increment failed login attempts
PetOwnerUserSchema.methods.incrementLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockoutUntil && this.lockoutUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockoutUntil: 1 },
      $set: { failedLoginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { failedLoginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.failedLoginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockoutUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Reset failed login attempts
PetOwnerUserSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { 
      failedLoginAttempts: 1,
      lockoutUntil: 1 
    },
    $set: { lastLoginAt: new Date() }
  });
};

// Pet management methods
PetOwnerUserSchema.methods.addPet = function(petId) {
  if (!this.pets.includes(petId)) {
    this.pets.push(petId);
  }
};

PetOwnerUserSchema.methods.removePet = function(petId) {
  this.pets = this.pets.filter(id => id.toString() !== petId.toString());
};

PetOwnerUserSchema.methods.canAddMorePets = function() {
  return this.pets.length < this.totalPetsLimit;
};

PetOwnerUserSchema.methods.ownsPet = function(petId) {
  return this.pets.some(id => id.toString() === petId.toString());
};

// Theme management methods
PetOwnerUserSchema.methods.addPurchasedTheme = function(themeId, transactionId) {
  const existingTheme = this.purchasedThemes.find(
    pt => pt.themeId.toString() === themeId.toString()
  );
  
  if (!existingTheme) {
    this.purchasedThemes.push({
      themeId: themeId,
      purchaseDate: new Date(),
      transactionId: transactionId
    });
  }
};

PetOwnerUserSchema.methods.hasTheme = function(themeId) {
  return this.purchasedThemes.some(
    pt => pt.themeId.toString() === themeId.toString()
  );
};

// Generate OTP code
PetOwnerUserSchema.methods.generateOTP = function() {
  const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP
  this.otpCode = otp;
  this.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
  this.otpAttempts = 0;
  return otp;
};

// Verify OTP code
PetOwnerUserSchema.methods.verifyOTP = function(inputOTP) {
  // Check if OTP exists and hasn't expired
  if (!this.otpCode || !this.otpExpiresAt || this.otpExpiresAt < new Date()) {
    return { isValid: false, error: 'OTP đã hết hạn hoặc không tồn tại' };
  }
  
  // Check if too many attempts
  if (this.otpAttempts >= 5) {
    return { isValid: false, error: 'Đã vượt quá số lần thử OTP. Vui lòng yêu cầu OTP mới' };
  }
  
  // Increment attempts
  this.otpAttempts += 1;
  
  // Verify OTP
  if (this.otpCode === inputOTP) {
    return { isValid: true };
  } else {
    return { isValid: false, error: `Mã OTP không đúng. Còn ${5 - this.otpAttempts} lần thử` };
  }
};

// Clear OTP data
PetOwnerUserSchema.methods.clearOTP = function() {
  this.otpCode = null;
  this.otpExpiresAt = null;
  this.otpAttempts = 0;
};

// Check if OTP is valid and not expired
PetOwnerUserSchema.methods.isOTPValid = function() {
  return this.otpCode && this.otpExpiresAt && this.otpExpiresAt > new Date();
};

module.exports = mongoose.model('PetOwnerUser', PetOwnerUserSchema); 