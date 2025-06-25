/**
 * QR Controller
 * Quản lý QR code cho thú cưng
 */

const Pet = require('../../models/Pet');
const User = require('../../models/PetOwnerUser');
const QRScan = require('../../models/QRScan');
const { generateQRCode } = require('../../utils/qr');
const { nanoid } = require('nanoid');

/**
 * Tạo QR code cho thú cưng
 * POST /api/v1/qr/generate
 */
exports.generateQR = async (req, res) => {
  try {
    const { petId } = req.body;
    
    if (!petId) {
      return res.status(400).json({
        success: false,
        error: 'ID thú cưng là bắt buộc'
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
    
    // Tạo mã QR ngắn nếu chưa có
    if (!pet.qrShortCode) {
      pet.qrShortCode = nanoid(10); // Tạo mã ngắn 10 ký tự
      await pet.save();
    }
    
    // Tạo URL cho QR code
    const baseUrl = process.env.BASE_URL || 'https://vnipet.com';
    const qrUrl = `${baseUrl}/q/${pet.qrShortCode}`;
    
    // Tạo QR code
    const qrCodeDataURL = await generateQRCode(qrUrl);
    
    res.json({
      success: true,
      data: {
        qrCode: qrCodeDataURL,
        qrUrl: qrUrl,
        shortCode: pet.qrShortCode
      }
    });
    
  } catch (error) {
    console.error('Generate QR error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Quét QR code và trả về thông tin thú cưng
 * GET /api/v1/qr/scan/:shortCode
 */
exports.scanQR = async (req, res) => {
  try {
    const { shortCode } = req.params;
    
    if (!shortCode) {
      return res.status(400).json({
        success: false,
        error: 'Mã QR không hợp lệ'
      });
    }
    
    // Tìm thú cưng theo mã QR
    const pet = await Pet.findOne({ qrShortCode: shortCode })
      .populate('themeId')
      .populate('ownerAccount', 'name email phone');
    
    if (!pet) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thông tin thú cưng với mã QR này'
      });
    }
    
    // Ghi nhận lượt quét QR
    const scanInfo = {
      petId: pet._id,
      scanType: 'public',
      scanMethod: 'qr',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      location: req.body.location || {}
    };
    
    // Nếu có thông tin người dùng đã đăng nhập
    if (req.user && req.user.id) {
      scanInfo.scannedBy = req.user.id;
      scanInfo.scanType = 'authenticated';
    }
    
    // Lưu thông tin quét
    await QRScan.create(scanInfo);
    
    // Cập nhật số lượt quét cho thú cưng
    pet.scanCount = (pet.scanCount || 0) + 1;
    pet.lastScanAt = new Date();
    await pet.save();
    
    // Trả về thông tin thú cưng
    res.json({
      success: true,
      data: {
        pet: {
          id: pet._id,
          name: pet.info.name,
          species: pet.info.species,
          breed: pet.info.breed,
          avatarUrl: pet.avatarUrl,
          description: pet.info.description,
          gender: pet.info.gender,
          birthdate: pet.info.birthdate,
          allergies: pet.allergicInfo,
          owner: pet.owner ? {
            name: pet.owner.name,
            phone: pet.owner.phone,
            email: pet.owner.email
          } : null,
          theme: pet.themeId,
          gallery: pet.gallery || []
        },
        scanCount: pet.scanCount,
        qrShortCode: pet.qrShortCode
      }
    });
    
  } catch (error) {
    console.error('Scan QR error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Lấy thống kê lượt quét QR của thú cưng
 * GET /api/v1/qr/stats/:petId
 */
exports.getQRStats = async (req, res) => {
  try {
    const { petId } = req.params;
    
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
    
    // Lấy thống kê quét QR
    const totalScans = await QRScan.countDocuments({ petId });
    
    // Thống kê theo ngày (7 ngày gần nhất)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last7Days = new Date(today);
    last7Days.setDate(today.getDate() - 6);
    
    const dailyStats = await QRScan.aggregate([
      {
        $match: {
          petId: pet._id,
          createdAt: { $gte: last7Days }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Thống kê theo thiết bị
    const deviceStats = await QRScan.aggregate([
      {
        $match: { petId: pet._id }
      },
      {
        $addFields: {
          deviceType: {
            $cond: {
              if: { $regexMatch: { input: '$userAgent', regex: /Android/i } },
              then: 'Android',
              else: {
                $cond: {
                  if: { $regexMatch: { input: '$userAgent', regex: /iPhone|iPad|iPod/i } },
                  then: 'iOS',
                  else: 'Other'
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$deviceType',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        totalScans,
        dailyStats,
        deviceStats,
        lastScan: pet.lastScanAt
      }
    });
    
  } catch (error) {
    console.error('Get QR stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Lấy danh sách lượt quét QR gần đây của thú cưng
 * GET /api/v1/qr/recent-scans/:petId
 */
exports.getRecentScans = async (req, res) => {
  try {
    const { petId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
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
    
    // Lấy danh sách lượt quét gần đây
    const recentScans = await QRScan.find({ petId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('scannedBy', 'name email');
    
    res.json({
      success: true,
      data: recentScans.map(scan => ({
        id: scan._id,
        scanType: scan.scanType,
        scanMethod: scan.scanMethod,
        ipAddress: scan.ipAddress,
        location: scan.location,
        userAgent: scan.userAgent,
        scannedBy: scan.scannedBy,
        createdAt: scan.createdAt
      }))
    });
    
  } catch (error) {
    console.error('Get recent scans error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Tạo QR code ngắn cho thú cưng
 * POST /api/v1/qr/short-code
 */
exports.generateShortCode = async (req, res) => {
  try {
    const { petId } = req.body;
    
    if (!petId) {
      return res.status(400).json({
        success: false,
        error: 'ID thú cưng là bắt buộc'
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
    
    // Tạo mã QR ngắn mới
    pet.qrShortCode = nanoid(10);
    await pet.save();
    
    // Tạo URL cho QR code
    const baseUrl = process.env.BASE_URL || 'https://vnipet.com';
    const qrUrl = `${baseUrl}/q/${pet.qrShortCode}`;
    
    res.json({
      success: true,
      data: {
        shortCode: pet.qrShortCode,
        qrUrl: qrUrl
      }
    });
    
  } catch (error) {
    console.error('Generate short code error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Tạo QR codes hàng loạt cho admin
 * POST /api/v1/qr/admin/bulk
 */
exports.createBulkQRCodes = async (req, res) => {
  try {
    const { quantity, type } = req.body;
    
    if (!quantity || quantity <= 0 || quantity > 100) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng QR code không hợp lệ. Vui lòng nhập số từ 1-100'
      });
    }
    
    if (!type || !['static', 'dynamic'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Loại QR code không hợp lệ. Vui lòng chọn "static" hoặc "dynamic"'
      });
    }
    
    const createdPets = [];
    const createdQRs = [];
    
    // Tạo danh sách pet mới với QR code
    for (let i = 0; i < quantity; i++) {
      // Tạo mã QR ngắn
      const qrShortCode = nanoid(10);
      const qrToken = nanoid(16);
      
      // Tạo URL cho QR code
      const baseUrl = process.env.BASE_URL || 'https://vnipet.com';
      const qrUrl = `${baseUrl}/q/${qrShortCode}`;
      
      // Tạo pet mới với trạng thái unlinked
      const pet = new Pet({
        info: {
          name: `Pet ${qrToken.substring(0, 6)}`,
          species: 'Chưa xác định',
          breed: 'Chưa xác định',
        },
        qrCodeUrl: qrUrl,
        qrToken,
        qrShortCode,
        status: 'unlinked',
        visibility: {
          isPubliclyViewable: true
        },
        createdBy: 'admin'
      });
      
      await pet.save();
      
      // Tạo QR code
      const qrCodeDataURL = await generateQRCode(qrUrl);
      
      createdPets.push(pet);
      createdQRs.push({
        petId: pet._id,
        qrToken,
        qrShortCode,
        qrUrl,
        qrCodeDataURL
      });
    }
    
    res.json({
      success: true,
      message: `Đã tạo thành công ${quantity} QR code`,
      data: {
        quantity,
        type,
        qrCodes: createdQRs
      }
    });
    
  } catch (error) {
    console.error('Create bulk QR codes error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo QR codes hàng loạt',
      error: error.message
    });
  }
};

/**
 * Tạo một QR code mới cho admin
 * POST /api/v1/qr/admin/generate
 */
exports.createSingleQRCode = async (req, res) => {
  try {
    const { type } = req.body;
    
    if (!type || !['static', 'dynamic'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Loại QR code không hợp lệ. Vui lòng chọn "static" hoặc "dynamic"'
      });
    }
    
    // Tạo mã QR ngắn
    const qrShortCode = nanoid(10);
    const qrToken = nanoid(16);
    
    // Tạo URL cho QR code
    const baseUrl = process.env.BASE_URL || 'https://vnipet.com';
    const qrUrl = `${baseUrl}/q/${qrShortCode}`;
    
    // Tạo pet mới với trạng thái unlinked
    const pet = new Pet({
      info: {
        name: `Pet ${qrToken.substring(0, 6)}`,
        species: 'Chưa xác định',
        breed: 'Chưa xác định',
      },
      qrCodeUrl: qrUrl,
      qrToken,
      qrShortCode,
      status: 'unlinked',
      visibility: {
        isPubliclyViewable: true
      },
      createdBy: 'admin'
    });
    
    await pet.save();
    
    // Tạo QR code
    const qrCodeDataURL = await generateQRCode(qrUrl);
    
    res.json({
      success: true,
      message: 'Đã tạo QR code thành công',
      data: {
        petId: pet._id,
        qrToken,
        qrShortCode,
        qrUrl,
        qrCodeDataURL,
        type
      }
    });
    
  } catch (error) {
    console.error('Create single QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo QR code',
      error: error.message
    });
  }
}; 