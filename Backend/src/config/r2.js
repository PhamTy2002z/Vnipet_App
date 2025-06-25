/**
 * Cloudflare R2 / S3 Configuration
 * Cấu hình lưu trữ CDN cho iOS-optimized delivery
 */

const DEFAULT_CONFIG = {
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || '',
  // Cloudflare R2 không sử dụng path-style URLs
  forcePathStyle: false,
  // Public URL cho CDN (có thể là custom domain)
  publicUrl: process.env.R2_PUBLIC_URL || process.env.R2_ENDPOINT || '',
  // Bucket names
  buckets: {
    main: process.env.R2_MAIN_BUCKET || 'vnipet',
    avatars: process.env.R2_AVATARS_BUCKET || 'vnipet-avatars',
    themes: process.env.R2_THEMES_BUCKET || 'vnipet-themes'
  },
  // Các prefixes cho tổ chức tệp tin
  prefixes: {
    petAvatars: 'pet-avatars/',
    themeImages: 'theme-images/',
    userUploads: 'user-uploads/',
    temp: 'temp/'
  },
  // Cache control defaults
  cacheControl: {
    public: 'public, max-age=604800, immutable',
    private: 'private, max-age=3600, no-transform',
    temp: 'no-cache, max-age=300'
  },
  // Content types
  contentTypes: {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif',
    heic: 'image/heic',
    pdf: 'application/pdf',
    json: 'application/json'
  },
  // Cloudflare image optimization
  imageResizing: {
    enabled: true,
    formatPriority: ['avif', 'webp', 'jpeg'],
    sizes: [640, 828, 1080, 1200, 1920]
  }
};

/**
 * Xác định Content-Type dựa trên tên tệp
 * @param {String} filename - Tên tệp để phân tích
 * @returns {String} MIME content type
 */
const getContentType = (filename) => {
  if (!filename) return 'application/octet-stream';
  
  const extension = filename.split('.').pop().toLowerCase();
  return DEFAULT_CONFIG.contentTypes[extension] || 'application/octet-stream';
};

/**
 * Tạo S3 client
 */
const createS3Client = () => {
  // Lazy loading để tránh import không cần thiết
  const { S3Client } = require('@aws-sdk/client-s3');
  
  return new S3Client({
    region: DEFAULT_CONFIG.region,
    endpoint: DEFAULT_CONFIG.endpoint,
    credentials: {
      accessKeyId: DEFAULT_CONFIG.credentials.accessKeyId,
      secretAccessKey: DEFAULT_CONFIG.credentials.secretAccessKey,
    },
    forcePathStyle: DEFAULT_CONFIG.forcePathStyle,
  });
};

/**
 * Generate presigned URL for direct upload từ mobile
 */
const generatePresignedUrl = async (bucket, key, contentType, expiresIn = 3600) => {
  // Lazy loading để tránh import không cần thiết
  const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  
  const client = createS3Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    CacheControl: DEFAULT_CONFIG.cacheControl.public
  });
  
  return getSignedUrl(client, command, { expiresIn });
};

/**
 * Generate CDN URL với image optimization
 */
const generateCdnUrl = (bucket, key, options = {}) => {
  if (!DEFAULT_CONFIG.publicUrl) {
    return null;
  }
  
  // Cloudflare Images URL format
  if (DEFAULT_CONFIG.imageResizing.enabled && options.imageOptimization) {
    const { width, format, quality, fit = 'contain' } = options;
    
    let url = `${DEFAULT_CONFIG.publicUrl}/cdn-cgi/image`;
    
    // Add options
    const params = [];
    if (width) params.push(`width=${width}`);
    if (format) params.push(`format=${format}`);
    if (quality) params.push(`quality=${quality}`);
    if (fit) params.push(`fit=${fit}`);
    
    // Build URL
    url += params.length > 0 ? `/${params.join(',')}` : '';
    url += `/${bucket}/${key}`;
    
    return url;
  }
  
  // Standard CDN URL
  return `${DEFAULT_CONFIG.publicUrl}/${bucket}/${key}`;
};

/**
 * Kiểm tra xem R2 có được cấu hình đúng không
 */
const isConfigured = () => {
  console.log('Checking R2 config:', {
    accessKeyConfigured: !!DEFAULT_CONFIG.credentials.accessKeyId,
    secretKeyConfigured: !!DEFAULT_CONFIG.credentials.secretAccessKey,
    endpointConfigured: !!DEFAULT_CONFIG.endpoint,
    publicUrlConfigured: !!DEFAULT_CONFIG.publicUrl
  });

  return (
    DEFAULT_CONFIG.credentials.accessKeyId &&
    DEFAULT_CONFIG.credentials.secretAccessKey &&
    DEFAULT_CONFIG.endpoint
  );
};

module.exports = {
  config: DEFAULT_CONFIG,
  createS3Client,
  getContentType,
  generatePresignedUrl,
  generateCdnUrl,
  isConfigured
}; 