/**
 * Mobile CORS Middleware
 * Middleware đặc biệt để xử lý các CORS issues với mobile clients
 */

/**
 * Xử lý preflight requests cho mobile apps
 * Tối ưu hóa OPTIONS requests
 */
const handleMobilePreflights = (req, res, next) => {
  // Nếu là OPTIONS request
  if (req.method === 'OPTIONS') {
    // Kiểm tra nếu có các header đặc trưng cho mobile apps
    const isMobileRequest = 
      req.headers['device-id'] || 
      req.headers['app-version'] || 
      req.headers['platform'] || 
      req.headers['os-version'] ||
      req.headers['device-type'];
    
    // Tối ưu hóa cho mobile: trả về OK ngay lập tức không cần xử lý thêm
    if (isMobileRequest) {
      // Cache preflight response cho mobile trong 24 giờ
      res.set('Access-Control-Max-Age', '86400');
      
      // Đảm bảo tất cả headers mobile cần đều được cho phép
      const requestHeaders = req.headers['access-control-request-headers'];
      if (requestHeaders) {
        res.set('Access-Control-Allow-Headers', requestHeaders);
      }
      
      // Đảm bảo tất cả methods mobile cần đều được cho phép
      const requestMethod = req.headers['access-control-request-method'];
      if (requestMethod) {
        res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      }
      
      // Allow credentials
      res.set('Access-Control-Allow-Credentials', 'true');
      
      // Cho phép mobile client từ bất kỳ nguồn nào
      res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
      
      // Thêm các headers được expose
      res.set('Access-Control-Expose-Headers', 
        'Content-Length, Content-Type, ETag, Cache-Control, Last-Modified, ' + 
        'X-Rate-Limit-Limit, X-Rate-Limit-Remaining, X-Rate-Limit-Reset, ' +
        'X-Total-Count, X-API-Version, X-Request-ID');
      
      // Trả về 204 No Content ngay lập tức
      return res.status(204).end();
    }
  }
  
  // Không phải preflight mobile request, tiếp tục
  next();
};

/**
 * Thêm headers đặc biệt cho mobile responses
 */
const addMobileResponseHeaders = (req, res, next) => {
  // Tiếp tục xử lý cho các requests không phải OPTIONS
  if (req.method !== 'OPTIONS') {
    // Kiểm tra xem có phải mobile request không
    const isMobileRequest = 
      req.headers['device-id'] || 
      req.headers['app-version'] || 
      req.headers['platform'] || 
      req.headers['device-type'] ||
      // iOS apps thường set các header sau
      req.headers['x-device-id'] ||
      req.headers['x-app-version'] ||
      (req.headers['user-agent'] && 
        (req.headers['user-agent'].includes('iOS') || 
         req.headers['user-agent'].includes('Android') ||
         req.headers['user-agent'].includes('Darwin')));
    
    if (isMobileRequest) {
      // Đảm bảo mobile có thể nhận response ngay cả khi không có origin
      const origin = req.headers.origin || '*';
      res.set('Access-Control-Allow-Origin', origin);
      
      // Thêm các headers cần thiết cho mobile
      res.set('Access-Control-Allow-Credentials', 'true');
      
      // Thêm server timing để hỗ trợ performance debugging trên mobile
      if (process.env.NODE_ENV !== 'production') {
        const startTime = process.hrtime();
        
        // Bắt event response finish để tính timing
        res.on('finish', () => {
          const duration = process.hrtime(startTime);
          const timeInMs = (duration[0] * 1000 + duration[1] / 1e6).toFixed(2);
          
          // Ghi log để debug
          console.log(`[MOBILE] Request completed in ${timeInMs}ms: ${req.method} ${req.originalUrl}`);
        });
      }
    }
  }
  
  next();
};

/**
 * Add vendor-specific CORS headers cho một số trình duyệt/webview mobile
 */
const addVendorSpecificHeaders = (req, res, next) => {
  // Thêm các headers cho Webview trên iOS và Android
  const userAgent = req.headers['user-agent'] || '';
  
  if (userAgent.includes('iPhone') || 
      userAgent.includes('iPad') || 
      userAgent.includes('Android')) {
    
    // Giải quyết vấn đề với WKWebView trên iOS
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.set('Access-Control-Allow-Credentials', 'true');
      
      // Thêm hỗ trợ cho cả cũ và mới headers
      res.set('X-Content-Type-Options', 'nosniff');
    }
    
    // Giải quyết vấn đề với Webview trên Android
    if (userAgent.includes('Android')) {
      res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.set('Access-Control-Allow-Credentials', 'true');
    }
  }
  
  next();
};

/**
 * Kiểm tra xem có phải là mobile request không dựa trên headers và user agent
 */
const isMobileRequest = (req) => {
  const headers = req.headers;
  const userAgent = headers['user-agent'] || '';
  
  // Kiểm tra các header đặc trưng của mobile app
  const hasMobileHeaders = 
    headers['device-id'] || 
    headers['app-version'] || 
    headers['platform'] || 
    headers['os-version'] ||
    headers['device-type'] ||
    headers['x-device-id'] ||
    headers['x-app-version'];
  
  // Kiểm tra User-Agent để phân biệt Flutter/Dart client
  const isFlutterApp = 
    userAgent.includes('Dart') || 
    userAgent.includes('Flutter') ||
    userAgent.includes('io.flutter') ||
    userAgent.includes('fk=') || // Flutter custom identifier
    userAgent.includes('dart:io');
  
  // Kiểm tra User-Agent để phân biệt iOS/Android native client
  const isNativeApp = 
    (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) && 
    !userAgent.includes('Safari') ||
    userAgent.includes('Android') && !userAgent.includes('Chrome');
  
  return hasMobileHeaders || isFlutterApp || isNativeApp;
};

/**
 * Middleware để chỉ cho phép mobile app và admin website, từ chối các web browser khác
 */
const allowOnlyMobileApp = (req, res, next) => {
  // Bỏ qua OPTIONS requests (đã được xử lý bởi handleMobilePreflights)
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Log chi tiết cho debugging
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[REQUEST] ${req.method} ${req.originalUrl}`);
    console.log(`[HEADERS] ${JSON.stringify(req.headers)}`);
    console.log(`[IP] ${req.ip}`);
  }
  
  // Kiểm tra xem có phải là request đến admin API không
  const isAdminRequest = req.originalUrl.includes('/api/v1/admin');
  
  // Nếu là admin request, cho phép truy cập từ web browser
  if (isAdminRequest) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ACCESS] Admin API request - Allowed');
    }
    return next();
  }
  
  // Kiểm tra xem có phải là mobile request không
  const isMobileAppRequest = isMobileRequest(req);
  
  // Cho phép các request từ môi trường phát triển CHỈ KHI ở chế độ development
  const isDevelopmentRequest = 
    process.env.NODE_ENV === 'development' && 
    (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip.startsWith('192.168.'));
  
  // Nếu là mobile app hoặc môi trường phát triển, cho phép request
  if (isMobileAppRequest) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ACCESS] Mobile app request - Allowed');
    }
    return next();
  }
  
  if (isDevelopmentRequest) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ACCESS] Development environment request - Allowed');
    }
    return next();
  }
  
  // Kiểm tra xem có phải là request từ Swagger UI không
  const isSwaggerRequest = req.headers.referer && req.headers.referer.includes('/api-docs');
  if (isSwaggerRequest) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ACCESS] Swagger UI request - Allowed');
    }
    return next();
  }
  
  // Kiểm tra các endpoint công khai không cần xác thực
  const isPublicEndpoint = 
    req.originalUrl.includes('/api/v1/auth') || // Đăng nhập/đăng ký
    req.originalUrl.includes('/api/v1/store/themes') && req.method === 'GET' || // Chỉ cho phép GET themes
    req.originalUrl.includes('/api/v1/qr/scan') || // QR scan
    req.originalUrl.includes('/api/v1/test/mobile-connection') || // Test endpoint
    req.originalUrl.includes('/api/v1/sync') || // Thêm endpoint sync vào danh sách công khai
    req.originalUrl.includes('/healthz'); // Health check
  
  // Cho phép truy cập vào các endpoint công khai
  if (isPublicEndpoint) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ACCESS] Public endpoint request - Allowed');
    }
    return next();
  }
  
  // Kiểm tra User-Agent để phân biệt mobile app và web browser
  const userAgent = req.headers['user-agent'] || '';
  
  // Các pattern của web browser phổ biến
  const isBrowser = 
    userAgent.includes('Mozilla/') && 
    (userAgent.includes('Chrome') || 
     userAgent.includes('Safari') || 
     userAgent.includes('Firefox') || 
     userAgent.includes('Edge') ||
     userAgent.includes('MSIE') ||
     userAgent.includes('Trident'));
  
  // Từ chối tất cả các request còn lại
  if (process.env.NODE_ENV !== 'production') {
    console.log('[ACCESS] Request denied - Not from mobile app');
    if (isBrowser) {
      console.log('[ACCESS] Browser detected:', userAgent);
    }
  }
  
  return res.status(403).json({
    success: false,
    message: 'Truy cập bị từ chối. API chỉ có thể được gọi từ ứng dụng di động.',
    error: 'MOBILE_ACCESS_REQUIRED',
    requiredHeaders: {
      'Device-ID': 'Unique device identifier',
      'Platform': 'iOS or Android',
      'App-Version': 'Your app version',
      'OS-Version': 'Your OS version'
    }
  });
};

/**
 * Middleware tổng hợp cho mobile CORS
 */
const mobileCorsMiddleware = [
  handleMobilePreflights,
  allowOnlyMobileApp, // Thêm middleware mới vào pipeline
  addMobileResponseHeaders,
  addVendorSpecificHeaders
];

module.exports = {
  handleMobilePreflights,
  addMobileResponseHeaders,
  addVendorSpecificHeaders,
  allowOnlyMobileApp, // Export middleware mới
  mobileCorsMiddleware
}; 