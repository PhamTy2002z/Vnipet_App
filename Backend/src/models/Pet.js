// src/models/Pet.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const VaccinationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
  }
);

const ReExaminationSchema = new mongoose.Schema(
  {
    date        : { type: Date, required: true },
    note        : { type: String, default: '' },
    reminderSent: { type: Boolean, default: false },
  }
);

const PetSchema = new mongoose.Schema(
  {
    qrCodeUrl   : { type: String, required: true },
    qrToken     : { type: String, unique: true, sparse: true },
    
    // Legacy GridFS storage (for migration)
    avatarFileId: { type: mongoose.Schema.Types.ObjectId, default: null },
    
    // New R2 storage
    avatar: {
      r2Key: { type: String, default: null }, // R2 object key
      bucket: { type: String, default: 'vnipet' }, // R2 bucket name
      publicUrl: { type: String, default: null }, // Direct access URL
      originalName: { type: String, default: null },
      mimetype: { type: String, default: null },
      size: { type: Number, default: null },
      uploadedAt: { type: Date, default: null },
    },
    
    // Pet image with enhanced iOS support
    petImage: { type: String, default: null }, // Main pet image URL
    petImageThumbnail: { type: String, default: null }, // Thumbnail version
    petImageLiveVideo: { type: String, default: null }, // For iOS Live Photos
    petImageMetadata: {
      format: { type: String, default: null }, // jpeg, webp, heic, etc.
      width: { type: Number, default: null },
      height: { type: Number, default: null },
      hasDepthData: { type: Boolean, default: false }, // Portrait mode
      isLivePhoto: { type: Boolean, default: false },
      quality: { type: String, default: 'high' }, // low, medium, high, ultra
      originalFilename: { type: String, default: null }
    },
    
    // Pet videos
    petVideo: { type: String, default: null }, // Main video URL
    petVideoThumbnail: { type: String, default: null }, // Video thumbnail
    petVideoPreview: { type: String, default: null }, // Short preview clip
    petVideoMetadata: {
      duration: { type: Number, default: null },
      width: { type: Number, default: null },
      height: { type: Number, default: null },
      isSlowMotion: { type: Boolean, default: false },
      quality: { type: String, default: 'medium' } // low, medium, high, original
    },
    
    // Medical images (e.g. x-rays, test results)
    medicalImages: [{
      url: { type: String, required: true },
      thumbnail: { type: String },
      title: { type: String, default: '' },
      date: { type: Date, default: Date.now },
      type: { type: String, default: 'other' }, // xray, scan, test, other
      metadata: {
        format: { type: String },
        width: { type: Number },
        height: { type: Number }
      }
    }],
    
    themeId     : { type: mongoose.Schema.Types.ObjectId, ref: 'Theme', default: null },

    // Updated: Link to pet owner user account (renamed from ownerId)
    ownerAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'PetOwnerUser', default: null },

    // Updated status enum for account-first flow
    status: {
      type   : String,
      enum   : ['unlinked', 'linked', 'active'],
      default: 'unlinked',
    },

    lastScannedAt: { type: Date, default: null },
    
    // Account linking metadata
    linking: {
      linkedAt: { type: Date, default: null },
      linkingMethod: { 
        type: String, 
        enum: ['qr_scan', 'manual_entry', 'admin'], 
        default: 'qr_scan' 
      },
      isLinked: { type: Boolean, default: false }
    },

    // Profile setup tracking
    setupStatus: {
      isFirstTime: { type: Boolean, default: true }, // true until basic info completed
      basicInfoCompleted: { type: Boolean, default: false }, // true after 4 basic fields filled
      hasOwnerAccount: { type: Boolean, default: false }, // true when linked to user account
    },

    // Public viewing settings
    visibility: {
      isPubliclyViewable: { type: Boolean, default: true }, // allow viewing without login
      allowContactView: { type: Boolean, default: true }, // show contact info to public
    },

    // Legacy security fields (kept for migration compatibility)
    security: {
      passcode: { type: String, default: null }, // hashed passcode (deprecated)
      isPasscodeSet: { type: Boolean, default: false }, // deprecated
      isFirstTime: { type: Boolean, default: true }, // deprecated
      lockedFields: { type: Boolean, default: false }, // deprecated
      unlockExpiresAt: { type: Date, default: null }, // deprecated
      failedAttempts: { type: Number, default: 0 }, // deprecated
      lockoutUntil: { type: Date, default: null }, // deprecated
      lockoutNotificationSent: { type: Boolean, default: false }, // deprecated
    },

    info: {
      name       : { type: String, default: '' },
      species    : { type: String, default: '' },
      birthDate  : { type: Date, default: null },
      description: { type: String, default: '' },
    },

    owner: {
      name : { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '', lowercase: true, trim: true },
    },

    allergicInfo: {
      substances: {
        type: [String],
        default: [],
        validate: [
          {
            validator(arr) {
              return arr.every(
                (s) => typeof s === 'string' && /^[\p{L} ]{1,10}$/u.test(s),
              );
            },
            message: 'Allergy names ≤ 10 ký tự, chỉ chữ + khoảng trắng.',
          },
        ],
      },
      note: { type: String, default: '' },
    },

    preferences: {
      favoriteFoods: {
        type: [String],
        default: [],
        validate: [
          {
            validator: function(arr) {
              // Maximum 5 foods
              if (arr.length > 5) return false;
              
              // Each food must be valid
              return arr.every(food => {
                // If it's one of the preset options, it's valid
                if (['Reward Soup', 'Dried Chicken'].includes(food)) {
                  return true;
                }
                // If it's custom text, validate length
                return typeof food === 'string' && food.length <= 100 && food.length > 0;
              });
            },
            message: 'Maximum 5 favorite foods allowed. Each must be a preset option or custom text up to 100 characters'
          }
        ]
      },
      favoriteShampoo: {
        type: String,
        default: '',
        maxlength: [100, 'Favorite shampoo brand cannot exceed 100 characters']
      },
      dailyRoutine: {
        type: String,
        default: '',
        maxlength: [500, 'Daily routine cannot exceed 500 characters']
      }
    },

    vaccinations  : { type: [VaccinationSchema], default: [] },
    reExaminations: { type: [ReExaminationSchema], default: [] },
  },
  { timestamps: true },
);

// Method to link pet to an account
PetSchema.methods.linkToAccount = function(userId, method = 'qr_scan') {
  this.ownerAccount = userId;
  this.linking.linkedAt = new Date();
  this.linking.linkingMethod = method;
  this.linking.isLinked = true;
  this.status = 'linked';
  this.setupStatus.hasOwnerAccount = true;
};

// Method to sync owner information from user account
PetSchema.methods.syncOwnerInfo = async function() {
  if (!this.ownerAccount) {
    return false;
  }
  
  try {
    // Import inside method to avoid circular dependency
    const PetOwnerUser = mongoose.model('PetOwnerUser');
    
    // Find the linked user account
    const user = await PetOwnerUser.findById(this.ownerAccount);
    if (!user) {
      return false;
    }
    
    // Update pet owner information from user account
    this.owner.name = user.name || this.owner.name;
    this.owner.phone = user.phone || this.owner.phone;
    this.owner.email = user.email || this.owner.email;
    
    return true;
  } catch (error) {
    console.error('Error syncing owner info:', error);
    return false;
  }
};

// Method to unlink pet from account
PetSchema.methods.unlinkFromAccount = function() {
  this.ownerAccount = null;
  this.linking.linkedAt = null;
  this.linking.isLinked = false;
  this.status = 'unlinked';
  this.setupStatus.hasOwnerAccount = false;
};

// Method to check if pet is owned by specific user
PetSchema.methods.isOwnedBy = function(userId) {
  return this.ownerAccount && this.ownerAccount.toString() === userId.toString();
};

// Method to hash and set passcode
PetSchema.methods.setPasscode = async function(passcode) {
  const salt = await bcrypt.genSalt(10);
  this.security.passcode = await bcrypt.hash(passcode, salt);
  this.security.isPasscodeSet = true;
};

// Method to compare passcode
PetSchema.methods.comparePasscode = async function(passcode) {
  if (!this.security.passcode) return false;
  return await bcrypt.compare(passcode, this.security.passcode);
};

// Method to check if pet is locked out
PetSchema.methods.isLockedOut = function() {
  return this.security.lockoutUntil && this.security.lockoutUntil > new Date();
};

// Method to check if editing is unlocked
PetSchema.methods.isUnlocked = function() {
  return this.security.unlockExpiresAt && this.security.unlockExpiresAt > new Date();
};

// Method to unlock editing for 1 hour
PetSchema.methods.unlockEditing = function() {
  this.security.unlockExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  this.security.failedAttempts = 0;
};

// Method to increment failed attempts and potentially lock out
PetSchema.methods.incrementFailedAttempts = function() {
  this.security.failedAttempts += 1;
  if (this.security.failedAttempts >= 5) {
    this.security.lockoutUntil = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours
    this.security.lockoutNotificationSent = false; // Reset notification flag
  }
};

// Method to lock fields after first save
PetSchema.methods.lockFields = function() {
  this.security.lockedFields = true;
  this.security.isFirstTime = false;
};

// Updated status computation for account-first flow
function computeStatus(doc) {
  const hasInfo =
    doc.info?.name ||
    doc.owner?.name ||
    doc.owner?.phone ||
    doc.owner?.email;
    
  const hasOwnerAccount = doc.ownerAccount;
  
  if (hasOwnerAccount && hasInfo) {
    doc.status = 'active';
  } else if (hasOwnerAccount) {
    doc.status = 'linked';
  } else {
    doc.status = 'unlinked';
  }
  
  // Update setup status
  if (doc.setupStatus) {
    doc.setupStatus.basicInfoCompleted = !!(doc.info?.name && doc.info?.species && doc.owner?.name && doc.owner?.phone);
    doc.setupStatus.hasOwnerAccount = !!hasOwnerAccount;
    doc.setupStatus.isFirstTime = !(doc.setupStatus.basicInfoCompleted);
  }
  
  // Update linking status
  if (doc.linking) {
    doc.linking.isLinked = !!hasOwnerAccount;
  }
}

PetSchema.pre('save', function (next) {
  computeStatus(this);
  next();
});

PetSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update.$set) computeStatus(update.$set);
  next();
});

module.exports = mongoose.model('Pet', PetSchema);
