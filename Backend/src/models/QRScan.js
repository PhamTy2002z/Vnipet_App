const mongoose = require('mongoose');

/**
 * QR Scan Model
 * Lưu trữ thông tin về các lượt quét mã QR để analytics
 */
const QRScanSchema = new mongoose.Schema({
  petId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    required: true,
    index: true
  },
  qrToken: {
    type: String,
    required: true,
    index: true
  },
  scannedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Thông tin thiết bị
  deviceInfo: {
    deviceId: String,
    platform: {
      type: String,
      enum: ['ios', 'android', 'web', 'unknown'],
      default: 'unknown'
    },
    browserName: String,
    browserVersion: String,
    osName: String,
    osVersion: String,
    deviceModel: String,
    deviceType: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop', 'unknown'],
      default: 'unknown'
    },
    isMobile: {
      type: Boolean,
      default: false
    }
  },
  // Thông tin người dùng (nếu có)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PetOwnerUser',
    default: null
  },
  userType: {
    type: String,
    enum: ['guest', 'owner', 'admin'],
    default: 'guest'
  },
  // Thông tin vị trí (nếu user cho phép)
  location: {
    city: String,
    country: String,
    countryCode: String,
    region: String,
    latitude: Number,
    longitude: Number,
    accuracy: Number, // Độ chính xác (mét)
    hasLocation: {
      type: Boolean,
      default: false
    }
  },
  // Thông tin request
  ipAddress: String,
  userAgent: String,
  referrer: String,
  scanSource: {
    type: String,
    enum: ['camera', 'url', 'app', 'other'],
    default: 'other'
  },
  // Kết quả sau khi quét
  action: {
    type: String,
    enum: ['view', 'link', 'edit', 'none'],
    default: 'view'
  },
  actionSuccess: {
    type: Boolean,
    default: true
  },
  // Thời gian tương tác
  sessionDuration: {
    type: Number, // Thời gian tương tác tính bằng giây
    default: 0
  }
}, {
  timestamps: true
});

// Indexes cho tìm kiếm và analytics hiệu quả
QRScanSchema.index({ scannedAt: 1, petId: 1 });
QRScanSchema.index({ 'deviceInfo.platform': 1, scannedAt: 1 });
QRScanSchema.index({ 'location.country': 1, scannedAt: 1 });

// Phân tích theo thời gian
QRScanSchema.statics.getHourlyScanCount = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        scannedAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$scannedAt" },
          month: { $month: "$scannedAt" },
          day: { $dayOfMonth: "$scannedAt" },
          hour: { $hour: "$scannedAt" }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 }
    }
  ]);
};

// Phân tích theo vị trí
QRScanSchema.statics.getLocationScanStats = async function() {
  return this.aggregate([
    {
      $match: {
        'location.hasLocation': true
      }
    },
    {
      $group: {
        _id: {
          country: "$location.country",
          city: "$location.city"
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Phân tích theo thiết bị
QRScanSchema.statics.getDeviceStats = async function() {
  return this.aggregate([
    {
      $group: {
        _id: {
          platform: "$deviceInfo.platform",
          deviceType: "$deviceInfo.deviceType"
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Phân tích theo pet
QRScanSchema.statics.getPetScanStats = async function() {
  return this.aggregate([
    {
      $group: {
        _id: "$petId",
        scanCount: { $sum: 1 },
        lastScanned: { $max: "$scannedAt" }
      }
    },
    {
      $sort: { scanCount: -1 }
    },
    {
      $lookup: {
        from: "pets",
        localField: "_id",
        foreignField: "_id",
        as: "petInfo"
      }
    },
    {
      $unwind: "$petInfo"
    },
    {
      $project: {
        _id: 1,
        scanCount: 1,
        lastScanned: 1,
        "petName": "$petInfo.info.name",
        "petSpecies": "$petInfo.info.species"
      }
    }
  ]);
};

module.exports = mongoose.model('QRScan', QRScanSchema); 