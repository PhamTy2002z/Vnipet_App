const express = require('express');
const router = express.Router();
const { paginationMiddleware } = require('../utils/pagination');
const { versionHandler, featureFlag } = require('../middleware/apiVersion');
const asyncWrap = require('../utils/asyncWrap');

/**
 * Test endpoint for new API response format
 * GET /api/v1/test/response-format
 */
router.get('/response-format', (req, res) => {
  // Test various response types
  const testData = {
    message: 'This is a test of the new API response format',
    features: ['standardized responses', 'metadata', 'timestamps', 'request tracking'],
    apiVersion: req.apiVersion,
    requestId: res.locals.requestId
  };

  return res.apiSuccess(testData, 'API response format test successful', 200, {
    testType: 'response_format',
    clientInfo: {
      userAgent: req.headers['user-agent'],
      acceptLanguage: req.headers['accept-language']
    }
  });
});

/**
 * Test endpoint for error handling
 * GET /api/v1/test/error-handling
 */
router.get('/error-handling', (req, res) => {
  const errorType = req.query.type || 'validation';

  switch (errorType) {
    case 'validation':
      return res.apiValidation([
        { field: 'email', message: 'Email is required' },
        { field: 'phone', message: 'Phone number is invalid' }
      ], 'Validation failed');

    case 'notfound':
      return res.apiNotFound('Resource not found');

    case 'unauthorized':
      return res.apiUnauthorized('Authentication required');

    case 'forbidden':
      return res.apiForbidden('Access denied');

    case 'conflict':
      return res.apiConflict('Resource already exists');

    case 'ratelimit':
      return res.apiTooManyRequests('Rate limit exceeded');

    default:
      return res.apiError('Internal server error', 500);
  }
});

/**
 * Test endpoint for pagination
 * GET /api/v1/test/pagination
 */
router.get('/pagination', paginationMiddleware({ defaultLimit: 10, maxLimit: 50 }), (req, res) => {
  // Generate mock data
  const totalItems = 157; // Mock total
  const { page, limit, skip } = req.pagination;
  
  // Mock data array
  const mockData = Array.from({ length: limit }, (_, index) => ({
    id: skip + index + 1,
    name: `Item ${skip + index + 1}`,
    description: `This is test item number ${skip + index + 1}`,
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
  }));

  // Create pagination metadata
  const pagination = req.createPaginationMeta(totalItems);

  return res.apiPaginated(mockData, pagination, 'Pagination test successful', 200, {
    testType: 'pagination',
    generatedAt: new Date().toISOString()
  });
});

/**
 * Test endpoint for API versioning
 * GET /api/v1/test/versioning
 */
router.get('/versioning', versionHandler({
  v1: (req, res) => {
    return res.apiSuccess({
      version: 'v1',
      message: 'This is version 1 response',
      features: ['basic functionality', 'standard API'],
      deprecationWarning: req.versionInfo.isDeprecated
    }, 'Version 1 API test');
  },
  v2: (req, res) => {
    return res.apiSuccess({
      version: 'v2',
      message: 'This is version 2 response',
      features: ['enhanced functionality', 'improved performance', 'new features'],
      newFields: {
        advancedMetrics: true,
        enhancedSecurity: true
      }
    }, 'Version 2 API test');
  },
  default: (req, res) => {
    return res.apiSuccess({
      version: req.apiVersion,
      message: 'Default version handler',
      note: 'This is the fallback handler for unsupported versions'
    }, 'Default version API test');
  }
}));

/**
 * Test endpoint for feature flags
 * GET /api/v1/test/features
 */
router.get('/features', 
  featureFlag('advancedAnalytics', ['v2']),
  featureFlag('enhancedSecurity', ['v1', 'v2']),
  featureFlag('betaFeatures', []),
  (req, res) => {
    return res.apiSuccess({
      availableFeatures: req.features,
      apiVersion: req.apiVersion,
      message: 'Feature flags test completed'
    }, 'Feature flags test successful', 200, {
      testType: 'feature_flags',
      versionInfo: req.versionInfo
    });
  }
);

/**
 * Test endpoint for mobile-specific headers
 * GET /api/v1/test/mobile-headers
 */
router.get('/mobile-headers', (req, res) => {
  const mobileHeaders = {
    userAgent: req.headers['user-agent'],
    apiVersion: req.headers['api-version'] || req.headers['x-api-version'],
    requestId: req.headers['x-request-id'],
    clientVersion: req.headers['x-client-version'],
    platform: req.headers['x-platform'],
    deviceId: req.headers['x-device-id'],
    acceptLanguage: req.headers['accept-language'],
    authorization: req.headers['authorization'] ? 'Present (hidden for security)' : 'Not present'
  };

  return res.apiSuccess({
    detectedHeaders: mobileHeaders,
    recommendations: {
      apiVersion: 'Use API-Version or X-API-Version header',
      requestId: 'Include X-Request-ID for request tracking',
      clientVersion: 'Include X-Client-Version for compatibility',
      platform: 'Include X-Platform (ios/android) for platform-specific features'
    }
  }, 'Mobile headers analysis completed', 200, {
    testType: 'mobile_headers',
    serverInfo: {
      supportedVersions: req.versionInfo?.supportedVersions,
      currentVersion: req.versionInfo?.currentVersion
    }
  });
});

/**
 * Test endpoint for rate limiting
 * GET /api/v1/test/rate-limit
 */
router.get('/rate-limit', (req, res) => {
  // This endpoint will be rate limited by the global rate limiting middleware
  const rateLimitHeaders = {
    'x-ratelimit-limit': res.get('X-RateLimit-Limit'),
    'x-ratelimit-remaining': res.get('X-RateLimit-Remaining'),
    'x-ratelimit-reset': res.get('X-RateLimit-Reset')
  };

  return res.apiSuccess({
    message: 'Rate limiting test - this request was allowed',
    rateLimitInfo: rateLimitHeaders,
    tip: 'Make multiple requests quickly to test rate limiting',
    limits: {
      general: '200 requests per minute',
      auth: '10 requests per 15 minutes',
      admin: '200 requests per minute',
      petOwner: '300 requests per minute'
    }
  }, 'Rate limit test successful', 200, {
    testType: 'rate_limiting'
  });
});

/**
 * Comprehensive API test - combines all features
 * GET /api/v1/test/comprehensive
 */
router.get('/comprehensive', 
  paginationMiddleware({ defaultLimit: 5 }),
  featureFlag('comprehensiveTest', ['v1', 'v2']),
  (req, res) => {
    const testResults = {
      responseFormat: 'standardized',
      pagination: {
        enabled: true,
        currentPage: req.pagination.page,
        itemsPerPage: req.pagination.limit
      },
      versioning: {
        current: req.apiVersion,
        supported: req.versionInfo?.supportedVersions,
        deprecated: req.versionInfo?.isDeprecated
      },
      features: req.features,
      headers: {
        tracked: !!res.locals.requestId,
        versioned: !!req.apiVersion
      },
      rateLimiting: 'active',
      errorHandling: 'standardized'
    };

    return res.apiSuccess(testResults, 'Comprehensive API test completed successfully', 200, {
      testType: 'comprehensive',
      testTimestamp: new Date().toISOString(),
      recommendationsForMobile: [
        'Use pagination for large datasets',
        'Include API version in headers',
        'Handle rate limiting gracefully',
        'Use standardized error responses',
        'Include request IDs for debugging'
      ]
    });
  }
);

/**
 * Test CORS configuration
 * GET /api/v1/test/cors
 */
router.get('/cors', (req, res) => {
  const headers = req.headers;
  const userAgent = headers['user-agent'] || 'No User-Agent';
  const origin = headers['origin'] || 'No Origin';
  const host = headers['host'] || 'No Host';
  
  // Kiểm tra xem có phải là mobile request không
  const isMobileRequest = 
    headers['device-id'] || 
    headers['app-version'] || 
    headers['platform'] || 
    headers['os-version'] ||
    headers['device-type'] ||
    (userAgent && (
      userAgent.includes('iOS') || 
      userAgent.includes('Android') ||
      userAgent.includes('Dart') ||
      userAgent.includes('Flutter')
    ));
  
  res.json({
    success: true,
    message: 'CORS test successful',
    data: {
      isMobileRequest,
      headers: {
        userAgent,
        origin,
        host,
        deviceId: headers['device-id'] || 'Not provided',
        platform: headers['platform'] || 'Not provided',
        appVersion: headers['app-version'] || 'Not provided',
        osVersion: headers['os-version'] || 'Not provided'
      }
    }
  });
});

/**
 * Test mobile connection
 * GET /api/v1/test/mobile-connection
 */
router.get('/mobile-connection', (req, res) => {
  const headers = req.headers;
  const userAgent = headers['user-agent'] || 'No User-Agent';
  
  // Kiểm tra các header đặc trưng của mobile app
  const deviceId = headers['device-id'];
  const platform = headers['platform'];
  const appVersion = headers['app-version'];
  const osVersion = headers['os-version'];
  
  // Kiểm tra User-Agent để phân biệt Flutter app
  const isFlutterApp = 
    userAgent.includes('Dart') || 
    userAgent.includes('Flutter') ||
    userAgent.includes('io.flutter') ||
    userAgent.includes('fk=');
  
  // Kiểm tra đầy đủ các header bắt buộc
  const missingHeaders = [];
  if (!deviceId) missingHeaders.push('Device-ID');
  if (!platform) missingHeaders.push('Platform');
  if (!appVersion) missingHeaders.push('App-Version');
  if (!osVersion) missingHeaders.push('OS-Version');
  
  // Trả về kết quả
  res.json({
    success: true,
    message: 'Mobile connection test successful',
    data: {
      isValidMobileRequest: missingHeaders.length === 0,
      isFlutterApp,
      deviceInfo: {
        deviceId,
        platform,
        appVersion,
        osVersion
      },
      userAgent,
      missingHeaders: missingHeaders.length > 0 ? missingHeaders : null,
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * Test API version
 * GET /api/v1/test/version
 */
router.get('/version', (req, res) => {
  res.json({
    success: true,
    data: {
      apiVersion: process.env.API_VERSION || 'v1',
      serverTime: new Date().toISOString(),
      environment: process.env.NODE_ENV
    }
  });
});

/**
 * Test authentication
 * GET /api/v1/test/auth
 */
router.get('/auth', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided',
      error: 'UNAUTHORIZED'
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  // Chỉ kiểm tra xem token có tồn tại không, không verify
  res.json({
    success: true,
    message: 'Authentication header detected',
    data: {
      tokenProvided: true,
      tokenLength: token.length
    }
  });
});

/**
 * Test header requirements for mobile app
 * GET /api/v1/test/headers
 */
router.get('/headers', (req, res) => {
  // Kiểm tra các header bắt buộc
  const requiredHeaders = {
    'Device-ID': req.headers['device-id'] || null,
    'Platform': req.headers['platform'] || null,
    'App-Version': req.headers['app-version'] || null,
    'OS-Version': req.headers['os-version'] || null
  };
  
  // Kiểm tra xem có thiếu header nào không
  const missingHeaders = Object.entries(requiredHeaders)
    .filter(([key, value]) => value === null)
    .map(([key]) => key);
  
  // Trả về kết quả
  res.json({
    success: true,
    message: missingHeaders.length === 0 
      ? 'All required headers provided' 
      : `Missing ${missingHeaders.length} required headers`,
    data: {
      requiredHeaders,
      missingHeaders: missingHeaders.length > 0 ? missingHeaders : null,
      allHeadersProvided: missingHeaders.length === 0,
      userAgent: req.headers['user-agent'] || 'Not provided'
    }
  });
});

/**
 * Test QR code features
 * @route GET /api/v1/test/qr
 */
router.get('/qr', asyncWrap(async (req, res) => {
  const { 
    text = 'https://vnipet.com', 
    type = 'basic',
    backgroundColor = '#FFFFFF',
    foregroundColor = '#000000',
    dynamic = false
  } = req.query;
  
  // Import QR utilities
  const { 
    generateQRCode, 
    generateSVGQR,
    generateQRWithLogo,
    createDynamicQR
  } = require('../utils/qr');

  const testResults = {};

  // 1. Generate basic QR code
  if (type === 'basic' || type === 'all') {
    testResults.basic = {
      type: 'Basic QR Code',
      dataUrl: await generateQRCode(text, {
        color: {
          dark: foregroundColor,
          light: backgroundColor
        }
      })
    };
  }

  // 2. Generate SVG QR code
  if (type === 'svg' || type === 'all') {
    testResults.svg = {
      type: 'SVG QR Code',
      svg: await generateSVGQR(text, {
        foregroundColor,
        backgroundColor
      })
    };
  }

  // 3. Generate QR with logo
  if (type === 'logo' || type === 'all') {
    const logoUrl = 'https://vnipet.com/uploads/themes/vnipet-logo.png';
    testResults.logo = {
      type: 'QR Code with Logo',
      ...await generateQRWithLogo(text, logoUrl, {
        foregroundColor,
        backgroundColor,
        logoSize: 60
      })
    };
  }

  // 4. Generate dynamic QR
  if ((type === 'dynamic' || type === 'all') && dynamic === 'true') {
    try {
      // Find a test pet or create one
      const Pet = require('../models/Pet');
      let testPet = await Pet.findOne({ 'info.name': 'Test QR Pet' });
      
      if (!testPet) {
        // Get QR code for a simple URL
        const qrCodeUrl = await generateQRCode('https://vnipet.com/test-pet');
        
        testPet = await Pet.create({
          qrCodeUrl,
          qrToken: 'test-qr-token-' + Date.now(),
          info: {
            name: 'Test QR Pet',
            species: 'Test',
          }
        });
      }
      
      // Create dynamic QR for the test pet
      const dynamicQR = await createDynamicQR(testPet._id, {
        customization: {
          backgroundColor,
          foregroundColor
        },
        notes: 'Test QR created from test endpoint'
      });
      
      testResults.dynamic = {
        type: 'Dynamic QR Code',
        uniqueId: dynamicQR.uniqueId,
        shortUrl: dynamicQR.shortUrl,
        targetUrl: dynamicQR.targetUrl,
        qrDataUrl: dynamicQR.qrDataUrl,
        pet: {
          id: testPet._id,
          name: testPet.info.name
        }
      };
    } catch (error) {
      testResults.dynamic = {
        type: 'Dynamic QR Code',
        error: error.message
      };
    }
  }

  res.json({
    success: true,
    message: 'QR test completed',
    data: testResults
  });
}));

/**
 * Simple QR test
 * @route GET /api/v1/test/qr-simple
 */
router.get('/qr-simple', (req, res) => {
  const QRCode = require('qrcode');
  const text = req.query.text || 'https://vnipet.com';
  
  QRCode.toDataURL(text)
    .then(url => {
      res.json({
        success: true,
        data: {
          qrDataUrl: url
        }
      });
    })
    .catch(err => {
      res.status(500).json({
        success: false,
        error: err.message
      });
    });
});

module.exports = router; 