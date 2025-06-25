/**
 * Cache Control Middleware
 * Tối ưu cache headers cho mobile clients
 */

// Cấu hình cache mặc định
const DEFAULT_CACHE_CONFIG = {
  images: {
    maxAge: 7 * 24 * 60 * 60, // 7 ngày
    immutable: true
  },
  static: {
    maxAge: 24 * 60 * 60, // 1 ngày
    immutable: false
  },
  api: {
    maxAge: 5 * 60, // 5 phút
    private: true,
    noStore: false
  },
  dynamic: {
    maxAge: 0,
    noStore: true,
    noCache: true
  }
};

/**
 * Tạo Cache-Control header dựa trên cấu hình
 * @param {Object} options - Cấu hình cache
 * @returns {String} Cache-Control header value
 */
const createCacheHeader = (options) => {
  const directives = [];
  
  if (options.private) {
    directives.push('private');
  } else if (options.private === false) {
    directives.push('public');
  }
  
  if (options.maxAge !== undefined) {
    directives.push(`max-age=${options.maxAge}`);
  }
  
  if (options.immutable) {
    directives.push('immutable');
  }
  
  if (options.noStore) {
    directives.push('no-store');
  }
  
  if (options.noCache) {
    directives.push('no-cache');
  }
  
  if (options.staleWhileRevalidate) {
    directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
  }
  
  if (options.mustRevalidate) {
    directives.push('must-revalidate');
  }
  
  return directives.join(', ');
};

/**
 * Middleware cho caching các API endpoints
 */
const apiCache = (options = {}) => {
  const config = { ...DEFAULT_CACHE_CONFIG.api, ...options };
  
  return (req, res, next) => {
    // Set Cache-Control header
    res.set('Cache-Control', createCacheHeader(config));
    
    // Thêm ETag support
    if (!config.noStore) {
      res.set('Vary', 'Accept, Authorization');
    }
    
    next();
  };
};

/**
 * Middleware cho caching static resources
 */
const staticCache = (options = {}) => {
  const config = { ...DEFAULT_CACHE_CONFIG.static, ...options };
  
  return (req, res, next) => {
    // Set Cache-Control header
    res.set('Cache-Control', createCacheHeader(config));
    
    next();
  };
};

/**
 * Middleware cho caching images
 */
const imageCache = (options = {}) => {
  const config = { ...DEFAULT_CACHE_CONFIG.images, ...options };
  
  return (req, res, next) => {
    // Set Cache-Control header
    res.set('Cache-Control', createCacheHeader(config));
    
    // Image optimization hint
    res.set('Accept-CH', 'DPR, Width, Viewport-Width');
    
    next();
  };
};

/**
 * Middleware cho dynamic content (no caching)
 */
const noCache = (options = {}) => {
  const config = { ...DEFAULT_CACHE_CONFIG.dynamic, ...options };
  
  return (req, res, next) => {
    // Set Cache-Control header
    res.set('Cache-Control', createCacheHeader(config));
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    next();
  };
};

/**
 * Conditional cache middleware dựa trên request type
 */
const conditionalCache = (options = {}) => {
  const {
    apiConfig = DEFAULT_CACHE_CONFIG.api,
    staticConfig = DEFAULT_CACHE_CONFIG.static,
    imageConfig = DEFAULT_CACHE_CONFIG.images,
    dynamicConfig = DEFAULT_CACHE_CONFIG.dynamic
  } = options;
  
  return (req, res, next) => {
    const path = req.path;
    const method = req.method;
    
    // Không cache các method không phải GET hoặc HEAD
    if (method !== 'GET' && method !== 'HEAD') {
      return noCache()(req, res, next);
    }
    
    // Xác định loại content
    if (path.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i)) {
      // Image paths
      imageCache(imageConfig)(req, res, next);
    } else if (path.match(/\.(css|js|woff2|ttf|ico)$/i)) {
      // Static assets
      staticCache(staticConfig)(req, res, next);
    } else if (path.startsWith('/api/')) {
      // API endpoints
      apiCache(apiConfig)(req, res, next);
    } else {
      // Dynamic content
      noCache(dynamicConfig)(req, res, next);
    }
  };
};

module.exports = {
  createCacheHeader,
  apiCache,
  staticCache,
  imageCache,
  noCache,
  conditionalCache,
  DEFAULT_CACHE_CONFIG
}; 