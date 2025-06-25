/* -------------------------------------------------------------------------- */
/*  src/server.js – FULL SOURCE                                               */
/* -------------------------------------------------------------------------- */
require('dotenv').config();
const path         = require('path');
const fs           = require('fs');
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const bodyParser   = require('body-parser');
const mongoose     = require('mongoose');
const compression  = require('compression');

/* ---------- Swagger Documentation -------------------------------------- */
const swagger      = require('../swagger');

/* ---------- Mobile-optimized middleware ---------------------------------- */
const { responseMiddleware } = require('./utils/responseFormatter');
const { apiVersionMiddleware } = require('./middleware/apiVersion');
const { conditionalCache, imageCache } = require('./utils/cacheControl');
const { mobileCorsMiddleware, allowOnlyMobileApp } = require('./middleware/mobileCors');

/* ---------- route groups -------------------------------------------------- */
const commonRoutes = require('./routes/common');
const authRoutes   = require('./routes/auth');
const adminRoutes  = require('./routes/admin');
const userRoutes   = require('./routes/user');
const storeRoutes  = require('./routes/store');          //  <-- thêm
const petOwnerRoutes = require('./routes/petOwner');     // <-- new pet owner routes
const accountRoutes = require('./routes/account');       // <-- new account management routes
const syncRoutes   = require('./routes/sync');           // <-- offline sync support
const testRoutes   = require('./routes/test');           // <-- test routes for mobile features
const mobileAuthRoutes = require('./routes/mobileAuth'); // <-- mobile auth with refresh tokens
const iosMediaRoutes = require('./routes/ios-media');    // <-- iOS media handling
const mediaRoutes  = require('./routes/media');         // <-- Media handling (images, videos)
const qrRoutes = require('./routes/qr-new');           // <-- QR code và analytics
const { startReminderJob, startTokenCleanupJob } = require('./utils/scheduler');

// Đảm bảo NODE_ENV được đặt
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

/* ========================================================================== */
/*  APP FACTORY                                                               */
/* ========================================================================== */
const createApp = () => {
  const app = express();

  // Kiểm tra cấu hình R2
  const r2Config = require('./config/r2');
  console.log('===== R2 Configuration Check =====');
  console.log(`R2 configured: ${r2Config.isConfigured()}`);
  console.log(`Endpoint: ${r2Config.config.endpoint || 'NOT CONFIGURED'}`);
  console.log(`Public URL: ${r2Config.config.publicUrl || 'NOT CONFIGURED'}`);
  console.log(`Main bucket: ${r2Config.config.buckets.main}`); 
  console.log(`Avatars bucket: ${r2Config.config.buckets.avatars}`);
  console.log(`Themes bucket: ${r2Config.config.buckets.themes}`);
  console.log(`Avatar prefix: ${r2Config.config.prefixes.petAvatars}`);
  console.log(`Theme prefix: ${r2Config.config.prefixes.themeImages}`);
  console.log('=================================');

  /* ---------- 1. Reverse-proxy header (Render / Heroku) ------------------- */
  if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

  /* ---------- 2. Security middlewares ------------------------------------- */
  app.use(
    helmet({
      /**  Nếu để mặc định, Chrome sẽ chặn ảnh do header
       *   `Cross-Origin-Resource-Policy: same-origin`.
       *   Chúng ta cho phép cross-origin đối với file tĩnh.                 */
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  
  /* ---------- Mobile-optimized compression ------------------------------ */
  app.use(compression({
    // Ngưỡng nén: Chỉ nén các phản hồi lớn hơn 1kb
    threshold: 1024,
    // Không nén các file đã nén sẵn
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    // Mức độ nén: 0 (không nén) - 9 (nén tối đa, chậm hơn)
    level: 6
  }));
  
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  
  /* ---------- Mobile-optimized rate limiting ----------------------------- */
  const createRateLimit = (windowMs, max, message) => rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      statusCode: 429,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        retryAfter: Math.ceil(windowMs / 1000)
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Different rate limits for different endpoints
  app.use('/api/v1/auth', createRateLimit(15 * 60 * 1000, 10, 'Too many authentication attempts')); // 10 per 15min
  app.use('/api/v1/admin', createRateLimit(60 * 1000, 200, 'Admin rate limit exceeded')); // 200 per minute
  app.use('/api/v1/pet-owner', createRateLimit(60 * 1000, 300, 'Pet owner rate limit exceeded')); // 300 per minute  
  app.use('/api/v1/account', createRateLimit(60 * 1000, 300, 'Account rate limit exceeded')); // 300 per minute
  app.use('/api/v1/store', createRateLimit(60 * 1000, 150, 'Store rate limit exceeded')); // 150 per minute
  app.use('/api/v1/ios', createRateLimit(60 * 1000, 300, 'iOS media upload rate limit exceeded')); // 300 per minute
  app.use('/api/v1/qr/scan', createRateLimit(60 * 1000, 500, 'QR scan rate limit exceeded')); // 500 per minute for QR scans
  app.use('/api/v1/qr', createRateLimit(60 * 1000, 200, 'QR API rate limit exceeded')); // 200 per minute for other QR APIs
  app.use('/api/v1', createRateLimit(60 * 1000, 200, 'API rate limit exceeded')); // 200 per minute general
  app.use(cookieParser());

  /* ---------- 3. Mobile-optimized CORS ----------------------------------- */
  const allowedOrigins = (process.env.CORS_WHITELIST || '')
    .split(',')
    .filter(Boolean);

  // Mobile app bundle identifiers
  const mobileAppBundleIds = (process.env.MOBILE_APP_BUNDLE_IDS || 'com.vnipet.app,com.vnipet.ios,com.vnipet.android')
    .split(',')
    .filter(Boolean);
    
  // Cấu hình CORS được tối ưu cho mobile
  app.use(
    cors({
      origin(origin, cb) {
        // Trường hợp 1: Không có origin (mobile app hoặc truy cập trực tiếp)
        if (!origin) {
          console.log('[CORS] No origin - likely mobile app request');
          return cb(null, true);
        }
        
        // Trường hợp 2: Origin trong whitelist (web app)
        if (allowedOrigins.includes(origin)) {
          console.log(`[CORS] Allowed origin: ${origin}`);
          return cb(null, true);
        }
        
        // Trường hợp 3: Mobile app với custom scheme URL (iOS Universal Links)
        // Format: <app-scheme>://<path> hoặc <bundle-id>://<path>
        const mobileSchemeRegex = /^[a-z0-9.-]+:\/\/.+$/i;
        if (mobileSchemeRegex.test(origin)) {
          // Kiểm tra xem có phải là bundle ID trong danh sách cho phép
          const bundleId = origin.split('://')[0];
          if (mobileAppBundleIds.some(id => bundleId.includes(id))) {
            console.log(`[CORS] Allowed mobile scheme: ${origin}`);
            return cb(null, true);
          }
        }
        
        // Trường hợp 4: Mobile development origins (localhost với port khác nhau)
        if (origin.match(/^https?:\/\/localhost(:[0-9]+)?$/) || 
            origin.match(/^https?:\/\/127\.0\.0\.1(:[0-9]+)?$/)) {
          console.log(`[CORS] Allowed development origin: ${origin}`);
          return cb(null, true);
        }
        
        // Từ chối các origin khác
        console.log(`[CORS] Blocked origin: ${origin}`);
        return cb(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      
      // Mobile apps cần nhiều header hơn
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin',
        'X-API-Key',
        'Device-ID',
        'Device-Type', 
        'App-Version',
        'OS-Version',
        'Platform',
        'User-Agent',
        'Accept-Language',
        'Cache-Control',
        'X-CSRF-Token',
        'If-None-Match',
        'X-Refresh-Token',
        'X-Device-Fingerprint'
      ],
      
      // Mobile apps có thể gửi những header này
      exposedHeaders: [
        'Content-Length',
        'Content-Type',
        'ETag',
        'Cache-Control',
        'Last-Modified',
        'X-Rate-Limit-Limit',
        'X-Rate-Limit-Remaining',
        'X-Rate-Limit-Reset',
        'X-Total-Count',
        'X-API-Version',
        'X-Request-ID'
      ],
      
      // Preflight cache cho tối ưu mobile (24 giờ)
      maxAge: 86400,
    }),
  );

  /* ---------- 4. Mobile-optimized middleware ----------------------------- */
  // Áp dụng mobile CORS middleware trước tiên (phải đặt trước các middleware khác)
  mobileCorsMiddleware.forEach(middleware => app.use(middleware));
  
  // Các middleware khác
  app.use(apiVersionMiddleware({ deprecationWarning: true }));
  app.use(responseMiddleware);
  // Áp dụng cache control middleware
  app.use(conditionalCache());

  /* ---------- 5. Body parsers -------------------------------------------- */
  app.use(bodyParser.json({ limit: '10mb' })); // Increased for mobile image uploads
  app.use(bodyParser.urlencoded({ extended: false, limit: '10mb' }));

  /* ---------- 6. MongoDB Connection -------------------------------------- */
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser   : true,
    useUnifiedTopology: true,
  });
  mongoose.connection.once('open', () => {
    console.log('MongoDB connected');
  });

  /* ---------- 7. Static uploads (public/uploads/*) ----------------------- */
  const uploadsPath = path.join(__dirname, '..', 'public', 'uploads');
  
  // Enhanced static file serving with proper headers
  app.use('/uploads', express.static(uploadsPath, {
    maxAge: '7d', // Cache for 7 days
    setHeaders: (res, filePath) => {
      // Set CORS headers for images
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET');
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      
      // Set proper content types
      if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        res.set('Content-Type', 'image/jpeg');
      } else if (filePath.endsWith('.png')) {
        res.set('Content-Type', 'image/png');
      }
    }
  }));

  // Optimized image cache for processed images
  app.use('/uploads/processed', imageCache());

  /* ---------- Swagger Documentation Routes ------------------------------ */
  app.use('/api-docs', swagger.serve, swagger.setup);

  /* ---------- 8. API Routes ---------------------------------------------- */
  // Áp dụng middleware chỉ cho phép mobile app cho tất cả API routes
  // Middleware đã được cập nhật để cho phép admin website truy cập vào API admin
  app.use('/api/v1', allowOnlyMobileApp);

  // API routes
  app.use('/api/v1/auth', mobileAuthRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/user', userRoutes);
  app.use('/api/v1/store', storeRoutes);
  app.use('/api/v1/pet-owner', petOwnerRoutes);
  app.use('/api/v1/account', accountRoutes);
  app.use('/api/v1/sync', syncRoutes);
  app.use('/api/v1/test', testRoutes);
  app.use('/api/v1/ios', iosMediaRoutes);
  app.use('/api/v1/media', mediaRoutes);
  app.use('/api/v1/qr', qrRoutes);
  app.use('/api/v1', commonRoutes);

  /* ---------- 9. Error Handling ------------------------------------------ */
  app.use((err, req, res, next) => {
    console.error('Server error:', err);
    
    // Định dạng lỗi cho mobile client
    const statusCode = err.statusCode || 500;
    const errorResponse = {
      success: false,
      error: err.message || 'Internal server error',
      statusCode,
    };
    
    // Thêm stack trace trong development
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.stack = err.stack;
    }
    
    res.status(statusCode).json(errorResponse);
  });

  /* ---------- 10. Not Found Handler -------------------------------------- */
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Resource not found',
      statusCode: 404,
    });
  });

  return app;
};

/* ========================================================================== */
/*  SERVER START                                                              */
/* ========================================================================== */
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const app = createApp();
  
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Mobile-only API access: ${process.env.NODE_ENV === 'production' ? 'ENABLED' : 'DISABLED (development mode)'}`);
    
    // Start scheduled jobs
    startReminderJob();
    startTokenCleanupJob();
  });
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

module.exports = { createApp };
