const QRCode = require('qrcode');
const DynamicQR = require('../models/DynamicQR');
const { v4: uuidv4 } = require('uuid');

/**
 * Tạo mã QR dạng data-URI (PNG base64)
 * @param {string} text - Nội dung cần mã hóa
 * @param {Object} options - Tùy chọn tạo QR
 * @returns {Promise<string>} Data-URI của mã QR
 */
async function generateQRCode(text, options = {}) {
  try {
    const defaultOptions = {
      margin: 2,
      scale: 8,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };

    const qrOptions = { ...defaultOptions, ...options };
    return await QRCode.toDataURL(text, qrOptions);
  } catch (err) {
    console.error('[QR] Generate ERROR:', err);
    throw new Error('Failed to generate QR');
  }
}

/**
 * Tạo mã QR động có thể cập nhật mà không cần tái tạo
 * @param {string} petId - ID của pet
 * @param {Object} options - Tùy chọn tạo QR
 * @returns {Promise<Object>} Đối tượng DynamicQR đã tạo
 */
async function createDynamicQR(petId, options = {}) {
  try {
    // Tạo đối tượng Dynamic QR
    const dynamicQR = await DynamicQR.createForPet(petId, options);
    
    // Tạo QR code cho shortUrl
    const qrOptions = {
      margin: 2,
      scale: 8,
      errorCorrectionLevel: options.errorCorrectionLevel || 'M',
      color: {
        dark: options.foregroundColor || '#000000',
        light: options.backgroundColor || '#FFFFFF'
      }
    };
    
    // Tạo QR data URL và lưu lại
    dynamicQR.qrDataUrl = await QRCode.toDataURL(dynamicQR.shortUrl, qrOptions);
    await dynamicQR.save();
    
    return dynamicQR;
  } catch (err) {
    console.error('[QR] Create Dynamic QR ERROR:', err);
    throw new Error('Failed to create dynamic QR');
  }
}

/**
 * Cập nhật URL đích của mã QR động
 * @param {string} uniqueId - ID duy nhất của mã QR động
 * @param {string} newTargetUrl - URL đích mới
 * @returns {Promise<Object>} Đối tượng DynamicQR đã cập nhật
 */
async function updateDynamicQRTarget(uniqueId, newTargetUrl) {
  try {
    const dynamicQR = await DynamicQR.findOne({ uniqueId });
    if (!dynamicQR) {
      throw new Error('Dynamic QR not found');
    }
    
    dynamicQR.targetUrl = newTargetUrl;
    dynamicQR.version += 1;
    await dynamicQR.save();
    
    return dynamicQR;
  } catch (err) {
    console.error('[QR] Update Dynamic QR ERROR:', err);
    throw new Error('Failed to update dynamic QR');
  }
}

/**
 * Tạo mã QR với logo (sử dụng cách đơn giản hơn không cần canvas)
 * @param {string} text - Nội dung cần mã hóa
 * @param {string} logoUrl - URL của logo
 * @param {Object} options - Tùy chọn tạo QR
 * @returns {Promise<Object>} Object chứa data-URI và thông tin hướng dẫn để client tự vẽ logo
 */
async function generateQRWithLogo(text, logoUrl, options = {}) {
  try {
    // Tạo QR code với error correction cao
    const qrOptions = {
      margin: 4,
      scale: 12,
      errorCorrectionLevel: 'H', // Cần H để có thể chèn logo
      color: {
        dark: options.foregroundColor || '#000000',
        light: options.backgroundColor || '#FFFFFF'
      }
    };
    
    // Tạo QR code dạng data URL
    const qrDataUrl = await QRCode.toDataURL(text, qrOptions);
    
    // Trả về cả QR code và thông tin logo để client tự vẽ
    return {
      qrDataUrl,
      logoInfo: {
        url: logoUrl,
        size: options.logoSize || 60,
        position: 'center'
      },
      instructions: `
        Để chèn logo vào QR code:
        1. Tải và hiển thị QR code
        2. Vẽ nền trắng ở giữa QR code
        3. Chèn logo vào giữa QR code
      `
    };
  } catch (err) {
    console.error('[QR] Generate QR with Logo ERROR:', err);
    throw new Error('Failed to generate QR with logo');
  }
}

/**
 * Tạo mã QR động cho nhiều pet cùng lúc
 * @param {Array<string>} petIds - Mảng các ID pet
 * @param {Object} options - Tùy chọn tạo QR
 * @returns {Promise<Array<Object>>} Mảng các đối tượng DynamicQR đã tạo
 */
async function createBulkDynamicQR(petIds, options = {}) {
  try {
    const results = [];
    
    for (const petId of petIds) {
      const dynamicQR = await createDynamicQR(petId, options);
      results.push(dynamicQR);
    }
    
    return results;
  } catch (err) {
    console.error('[QR] Create Bulk Dynamic QR ERROR:', err);
    throw new Error('Failed to create bulk dynamic QRs');
  }
}

/**
 * Tạo mã QR SVG với tùy chỉnh nâng cao
 * @param {string} text - Nội dung cần mã hóa
 * @param {Object} options - Tùy chọn tạo QR
 * @returns {Promise<string>} Chuỗi SVG của mã QR
 */
async function generateSVGQR(text, options = {}) {
  try {
    const qrOptions = {
      type: 'svg',
      margin: options.margin || 2,
      errorCorrectionLevel: options.errorCorrectionLevel || 'M',
      color: {
        dark: options.foregroundColor || '#000000',
        light: options.backgroundColor || '#FFFFFF'
      }
    };
    
    return await QRCode.toString(text, qrOptions);
  } catch (err) {
    console.error('[QR] Generate SVG QR ERROR:', err);
    throw new Error('Failed to generate SVG QR');
  }
}

/**
 * Lấy thông tin mã QR động
 * @param {string} uniqueId - ID duy nhất của mã QR
 * @returns {Promise<Object>} Thông tin về mã QR động
 */
async function getDynamicQRInfo(uniqueId) {
  try {
    const dynamicQR = await DynamicQR.findOne({ uniqueId });
    if (!dynamicQR) {
      throw new Error('Dynamic QR not found');
    }
    
    return dynamicQR;
  } catch (err) {
    console.error('[QR] Get Dynamic QR Info ERROR:', err);
    throw new Error('Failed to get dynamic QR info');
  }
}

module.exports = {
  generateQRCode,
  createDynamicQR,
  updateDynamicQRTarget,
  generateQRWithLogo,
  createBulkDynamicQR,
  generateSVGQR,
  getDynamicQRInfo
};
