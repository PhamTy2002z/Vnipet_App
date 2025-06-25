const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Dynamic QR Model
 * Cho phép QR code có thể điều hướng đến các URL khác nhau mà không cần tạo lại
 */
const DynamicQRSchema = new mongoose.Schema({
  // Mã định danh duy nhất của QR code (sử dụng trong URL)
  uniqueId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => crypto.randomBytes(8).toString('hex')
  },
  
  // Liên kết với pet
  petId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    required: true,
    index: true
  },
  
  // URL đích mà QR sẽ điều hướng đến
  targetUrl: {
    type: String,
    required: true
  },
  
  // URL ngắn cho QR (để giảm độ phức tạp của mã QR)
  shortUrl: {
    type: String,
    default: null
  },
  
  // Dữ liệu QR đã tạo (data URI)
  qrDataUrl: {
    type: String,
    default: null
  },
  
  // Thông tin theo dõi
  isActive: {
    type: Boolean,
    default: true
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'createdByModel',
    default: null
  },
  
  createdByModel: {
    type: String,
    enum: ['Admin', 'PetOwnerUser'],
    default: 'Admin'
  },
  
  // Thông tin tùy chỉnh
  customization: {
    // Độ lớn của QR
    size: {
      type: Number,
      default: 300
    },
    
    // Màu nền và màu mã
    backgroundColor: {
      type: String,
      default: '#FFFFFF'
    },
    
    foregroundColor: {
      type: String,
      default: '#000000'
    },
    
    // Logo ở giữa QR (tùy chọn)
    logo: {
      url: {
        type: String,
        default: null
      },
      size: {
        type: Number,
        default: 60
      }
    },
    
    // Loại QR (dots, rounded, etc.)
    style: {
      type: String,
      enum: ['standard', 'dots', 'rounded', 'sharp'],
      default: 'standard'
    },
    
    // Tỷ lệ lỗi QR code
    errorCorrectionLevel: {
      type: String,
      enum: ['L', 'M', 'Q', 'H'],
      default: 'M'
    }
  },
  
  // Thống kê
  scanCount: {
    type: Number,
    default: 0
  },
  
  lastScanned: {
    type: Date,
    default: null
  },
  
  // Hạn chế quét (nếu cần)
  restrictions: {
    expiresAt: {
      type: Date,
      default: null
    },
    
    maxScans: {
      type: Number,
      default: null
    },
    
    allowedRegions: {
      type: [String],
      default: []
    },
    
    isPasswordProtected: {
      type: Boolean,
      default: false
    },
    
    passwordHash: {
      type: String,
      default: null
    }
  },
  
  // Metadata
  version: {
    type: Number,
    default: 1
  },
  
  notes: {
    type: String,
    default: ''
  },
  
  // Thông tin UTM
  utmParams: {
    source: {
      type: String,
      default: 'qr'
    },
    
    medium: {
      type: String,
      default: 'print'
    },
    
    campaign: {
      type: String,
      default: null
    }
  }
}, {
  timestamps: true
});

// Tự động tạo UTM parameters
DynamicQRSchema.pre('save', function(next) {
  if (!this.utmParams.campaign) {
    this.utmParams.campaign = `pet_${this.petId.toString().substring(0, 8)}`;
  }
  next();
});

// Tạo URL đầy đủ với UTM params
DynamicQRSchema.methods.getFullTargetUrl = function() {
  const url = new URL(this.targetUrl);
  
  // Thêm UTM params
  url.searchParams.append('utm_source', this.utmParams.source);
  url.searchParams.append('utm_medium', this.utmParams.medium);
  url.searchParams.append('utm_campaign', this.utmParams.campaign);
  url.searchParams.append('qr_id', this.uniqueId);
  
  return url.toString();
};

// Kiểm tra xem QR có hết hạn không
DynamicQRSchema.methods.isExpired = function() {
  if (!this.restrictions.expiresAt) return false;
  return new Date() > this.restrictions.expiresAt;
};

// Kiểm tra xem QR có vượt quá số lần quét không
DynamicQRSchema.methods.isOverScanLimit = function() {
  if (!this.restrictions.maxScans) return false;
  return this.scanCount >= this.restrictions.maxScans;
};

// Kiểm tra xem QR còn có thể sử dụng không
DynamicQRSchema.methods.isUsable = function() {
  return this.isActive && !this.isExpired() && !this.isOverScanLimit();
};

// Tăng số lần quét
DynamicQRSchema.methods.incrementScanCount = function() {
  this.scanCount += 1;
  this.lastScanned = new Date();
  return this.save();
};

// Kiểm tra quyền truy cập bằng mật khẩu
DynamicQRSchema.methods.validatePassword = async function(password) {
  if (!this.restrictions.isPasswordProtected) return true;
  if (!this.restrictions.passwordHash) return true;
  
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(password, this.restrictions.passwordHash);
};

// Đặt mật khẩu bảo vệ
DynamicQRSchema.methods.setPassword = async function(password) {
  if (!password) {
    this.restrictions.isPasswordProtected = false;
    this.restrictions.passwordHash = null;
    return;
  }
  
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  this.restrictions.passwordHash = await bcrypt.hash(password, salt);
  this.restrictions.isPasswordProtected = true;
};

// Static method để tạo dynamic QR cho pet
DynamicQRSchema.statics.createForPet = async function(petId, options = {}) {
  const baseUrl = process.env.PUBLIC_URL || 'https://app.vnipet.com';
  
  const dynamic = new this({
    petId,
    targetUrl: `${baseUrl}/pet/${petId}`,
    ...options
  });
  
  await dynamic.save();
  
  // Cập nhật shortUrl sau khi lưu
  dynamic.shortUrl = `${baseUrl}/q/${dynamic.uniqueId}`;
  await dynamic.save();
  
  return dynamic;
};

module.exports = mongoose.model('DynamicQR', DynamicQRSchema); 