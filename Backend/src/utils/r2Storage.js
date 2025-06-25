/**
 * Cloudflare R2 Storage Utility
 * Utility để lưu trữ và quản lý tệp tin trên Cloudflare R2
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const r2Config = require('../config/r2');
const imageProcessor = require('./imageProcessor');

// Lazy loading các AWS SDK modules
let S3Commands;
let Upload;

/**
 * Khởi tạo các module cần thiết
 */
const initModules = () => {
  if (!S3Commands) {
    S3Commands = require('@aws-sdk/client-s3');
  }
  
  if (!Upload) {
    Upload = require('@aws-sdk/lib-storage').Upload;
  }
};

/**
 * Upload tệp tin đến R2
 * @param {Buffer|string} fileData - Dữ liệu tệp hoặc đường dẫn
 * @param {Object} options - Tùy chọn upload
 * @returns {Promise<Object>} Kết quả upload
 */
const uploadFile = async (fileData, options = {}) => {
  try {
    // Kiểm tra cấu hình
    if (!r2Config.isConfigured()) {
      throw new Error('R2 storage is not configured');
    }
    
    // Khởi tạo modules
    initModules();
    
    const {
      bucket = r2Config.config.buckets.main,
      key,
      prefix = r2Config.config.prefixes.userUploads,
      contentType,
      metadata = {},
      isPublic = true,
      processImage = false,
      imageOptions = {}
    } = options;

    // Tạo key nếu chưa được cung cấp
    const finalKey = key || `${prefix}${uuidv4()}`;
    
    // Log cấu hình upload để debug
    console.log(`[R2] Upload config: bucket=${bucket}, key=${finalKey}`);
    
    // Xác định Content-Type
    let finalContentType = contentType;
    if (!finalContentType) {
      if (typeof fileData === 'string') {
        finalContentType = r2Config.getContentType(fileData);
      } else if (options.filename) {
        finalContentType = r2Config.getContentType(options.filename);
      } else {
        finalContentType = 'application/octet-stream';
      }
    }
    
    // Xử lý hình ảnh nếu cần
    let uploadData = fileData;
    let processedImageResult = null;
    
    if (processImage && finalContentType.startsWith('image/')) {
      // Đọc từ đường dẫn nếu là string
      if (typeof fileData === 'string') {
        uploadData = await fs.readFile(fileData);
      }
      
      // Xử lý hình ảnh
      processedImageResult = await imageProcessor.processImage(uploadData, {
        format: imageOptions.format || 'webp',
        quality: imageOptions.quality || 80,
        width: imageOptions.width,
        height: imageOptions.height,
        ...imageOptions
      });
      
      if (processedImageResult.success) {
        // Sử dụng dữ liệu đã xử lý
        uploadData = await fs.readFile(processedImageResult.outputPath);
        finalContentType = `image/${processedImageResult.format}`;
      }
    } else if (typeof fileData === 'string') {
      // Đọc từ đường dẫn nếu là string (không xử lý hình ảnh)
      uploadData = await fs.readFile(fileData);
    }
    
    // Chuẩn bị tham số upload
    const params = {
      Bucket: bucket,
      Key: finalKey,
      Body: uploadData,
      ContentType: finalContentType,
      Metadata: {
        ...metadata,
        uploadedAt: new Date().toISOString()
      },
      CacheControl: isPublic 
        ? r2Config.config.cacheControl.public
        : r2Config.config.cacheControl.private
    };
    
    // Thêm ACL nếu là public
    if (isPublic) {
      params.ACL = 'public-read';
    }
    
    // Tạo S3 client
    const s3Client = r2Config.createS3Client();
    
    // Upload sử dụng Upload utility cho tệp lớn
    const upload = new Upload({
      client: s3Client,
      params
    });
    
    // Bắt đầu upload
    console.log(`[R2] Uploading file to ${bucket}/${finalKey}...`);
    const result = await upload.done();
    console.log(`[R2] Upload completed successfully:`, result.ETag);

    // Generate public URL
    const publicUrl = r2Config.generateCdnUrl(bucket, finalKey);
    console.log(`[R2] Generated public URL: ${publicUrl}`);

    return {
      success: true,
      bucket,
      key: finalKey,
      etag: result.ETag,
      publicUrl,
      contentType: finalContentType,
      size: Buffer.isBuffer(uploadData) ? uploadData.length : null,
      processedImage: processedImageResult,
      originalName: options.filename || 'unknown'
    };
    
  } catch (error) {
    console.error('R2 upload error:', error);
    // Thêm thông tin chi tiết về lỗi
    const errorDetails = {
      message: error.message,
      code: error.code || error.Code || 'UNKNOWN',
      status: error.$metadata?.httpStatusCode || 'UNKNOWN',
      requestId: error.$metadata?.requestId || 'UNKNOWN'
    };
    console.error('[R2] Error details:', errorDetails);
    
    return {
      success: false,
      error: error.message,
      errorDetails
    };
  }
};

/**
 * Upload tệp tin ảnh pet avatar
 * @param {Buffer|string} fileData - Dữ liệu tệp
 * @param {Object} options - Tùy chọn upload
 * @returns {Promise<Object>} Kết quả upload
 */
const uploadPetAvatar = async (fileData, options = {}) => {
  console.log('[R2] Starting pet avatar upload with options:', {
    bucket: r2Config.config.buckets.main,
    prefix: r2Config.config.prefixes.petAvatars
  });
  
  const uploadOptions = {
    ...options,
    bucket: r2Config.config.buckets.main,
    prefix: r2Config.config.prefixes.petAvatars,
    processImage: true,
    imageOptions: {
      format: 'webp',
      quality: 85,
      width: 800,
      height: 800,
      fit: 'cover',
      ...options.imageOptions
    }
  };
  
  return uploadFile(fileData, uploadOptions);
};

/**
 * Upload tệp tin ảnh theme
 * @param {Buffer|string} fileData - Dữ liệu tệp
 * @param {Object} options - Tùy chọn upload
 * @returns {Promise<Object>} Kết quả upload
 */
const uploadThemeImage = async (fileData, options = {}) => {
  console.log('[R2] Starting theme image upload with options:', {
    bucket: r2Config.config.buckets.main,
    prefix: r2Config.config.prefixes.themeImages
  });
  
  const uploadOptions = {
    ...options,
    bucket: r2Config.config.buckets.main,
    prefix: r2Config.config.prefixes.themeImages,
    processImage: true,
    imageOptions: {
      format: 'webp',
      quality: 90,
      ...options.imageOptions
    }
  };
  
  return uploadFile(fileData, uploadOptions);
};

/**
 * Tạo presigned URL cho upload trực tiếp từ client
 * @param {Object} options - Tùy chọn
 * @returns {Promise<Object>} URL và thông tin presigned
 */
const getPresignedUploadUrl = async (options = {}) => {
  try {
    // Kiểm tra cấu hình
    if (!r2Config.isConfigured()) {
      throw new Error('R2 storage is not configured');
    }
    
    const {
      bucket = r2Config.config.buckets.main,
      prefix = r2Config.config.prefixes.userUploads,
      key,
      contentType = 'application/octet-stream',
      expiresIn = 3600 // 1 hour
    } = options;

    // Tạo key nếu chưa được cung cấp
    const finalKey = key || `${prefix}${uuidv4()}`;

    const presignedUrl = await r2Config.generatePresignedUrl(
      bucket,
      finalKey,
      contentType,
      expiresIn
    );
    
    return {
      success: true,
      uploadUrl: presignedUrl,
      bucket,
      key: finalKey,
      contentType,
      expiresIn,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      publicUrl: r2Config.generateCdnUrl(bucket, finalKey)
    };
    
  } catch (error) {
    console.error('Generate presigned URL error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Tạo responsive image URLs cho các kích thước khác nhau
 * @param {string} bucket - Bucket name
 * @param {string} key - Object key
 * @param {Object} options - Tùy chọn
 * @returns {Object} Các URLs cho responsive images
 */
const getResponsiveImageUrls = (bucket, key, options = {}) => {
  // Kiểm tra cấu hình
  if (!r2Config.isConfigured() || !r2Config.config.publicUrl) {
    return { error: 'R2 storage or public URL not configured' };
  }
  
  const {
    widths = r2Config.config.imageResizing.sizes,
    formats = r2Config.config.imageResizing.formatPriority,
    quality = 80
  } = options;
  
  const baseUrl = r2Config.generateCdnUrl(bucket, key);
  const urls = {};
  
  // Generate URLs cho mỗi kích thước
  widths.forEach(width => {
    urls[`w${width}`] = r2Config.generateCdnUrl(bucket, key, {
      imageOptimization: true,
      width,
      quality
    });
  });
  
  // Generate URLs cho mỗi format
  formats.forEach(format => {
    urls[format] = r2Config.generateCdnUrl(bucket, key, {
      imageOptimization: true,
      format,
      quality
    });
  });
  
  // Generate srcset string
  const srcset = widths
    .map(width => {
      const url = r2Config.generateCdnUrl(bucket, key, {
        imageOptimization: true,
        width,
        quality
      });
      return `${url} ${width}w`;
    })
    .join(', ');
  
  return {
    original: baseUrl,
    sizes: urls,
    srcset,
    primaryFormat: formats[0] || 'jpeg'
  };
};

/**
 * Xóa tệp tin từ R2
 * @param {string} bucket - Bucket name
 * @param {string} key - Object key
 * @returns {Promise<Object>} Kết quả xóa
 */
const deleteFile = async (bucket, key) => {
  try {
    // Kiểm tra cấu hình
    if (!r2Config.isConfigured()) {
      throw new Error('R2 storage is not configured');
    }
    
    // Khởi tạo modules
    initModules();
    
    // Tạo S3 client
    const s3Client = r2Config.createS3Client();
    
    // Xóa tệp tin
    const command = new S3Commands.DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    });

    const result = await s3Client.send(command);
    
    return {
      success: true,
      bucket,
      key,
      result
    };
    
  } catch (error) {
    console.error('R2 delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Kiểm tra xem tệp tin có tồn tại không
 * @param {string} bucket - Bucket name
 * @param {string} key - Object key
 * @returns {Promise<boolean>} Tệp tin có tồn tại không
 */
const fileExists = async (bucket, key) => {
  try {
    // Kiểm tra cấu hình
    if (!r2Config.isConfigured()) {
      return false;
  }
  
    // Khởi tạo modules
    initModules();
    
    // Tạo S3 client
    const s3Client = r2Config.createS3Client();
    
    // Kiểm tra tệp tin
    const command = new S3Commands.HeadObjectCommand({
      Bucket: bucket,
      Key: key
    });
    
    await s3Client.send(command);
    return true;
    
  } catch (error) {
    if (error.name === 'NotFound') {
      return false;
    }
    
    console.error('R2 check error:', error);
    return false;
  }
};

/**
 * Kiểm tra xem R2 storage đã được cấu hình chưa
 * @returns {Boolean} true nếu đã cấu hình
 */
const isR2Configured = () => {
  return r2Config.isConfigured();
};

module.exports = {
  uploadFile,
  uploadToR2: uploadFile, // Alias for uploadFile
  uploadPetAvatar, // Thêm function cho pet avatar
  uploadThemeImage, // Thêm function cho theme image
  deleteFile,
  deleteFromR2: deleteFile, // Alias for deleteFile
  fileExists,
  getPresignedUploadUrl,
  getResponsiveImageUrls,
  getPublicUrl: (bucket, key) => r2Config.generateCdnUrl(bucket, key),
  isR2Configured
}; 