/**
 * API Version Management Middleware
 * Handles API versioning for mobile app compatibility
 */

const SUPPORTED_VERSIONS = ['v1', 'v2'];
const DEFAULT_VERSION = 'v1';
const CURRENT_VERSION = 'v1';

/**
 * Parse API version from request
 * Priority: Header > URL path > Query param > Default
 */
const parseApiVersion = (req) => {
  // 1. Check custom header (recommended for mobile apps)
  let version = req.headers['api-version'] || req.headers['x-api-version'];
  
  // 2. Check URL path (/api/v1/, /api/v2/, etc.)
  if (!version) {
    const pathMatch = req.path.match(/^\/api\/(v\d+)\//);
    if (pathMatch) {
      version = pathMatch[1];
    }
  }
  
  // 3. Check query parameter
  if (!version) {
    version = req.query.version || req.query.api_version;
  }
  
  // 4. Use default version
  if (!version) {
    version = DEFAULT_VERSION;
  }
  
  // Clean and validate version
  version = version.toLowerCase();
  if (!version.startsWith('v')) {
    version = `v${version}`;
  }
  
  return version;
};

/**
 * Check if version is supported
 */
const isSupportedVersion = (version) => {
  return SUPPORTED_VERSIONS.includes(version);
};

/**
 * Check if version is deprecated
 */
const isDeprecatedVersion = (version) => {
  // For now, no versions are deprecated
  // You can add logic here when you deprecate older versions
  return false;
};

/**
 * Get version compatibility info
 */
const getVersionInfo = (version) => {
  return {
    version,
    isSupported: isSupportedVersion(version),
    isDeprecated: isDeprecatedVersion(version),
    isCurrent: version === CURRENT_VERSION,
    supportedVersions: SUPPORTED_VERSIONS,
    currentVersion: CURRENT_VERSION
  };
};

/**
 * Main API version middleware
 */
const apiVersionMiddleware = (options = {}) => {
  const {
    enforceVersion = false,
    allowUnsupported = false,
    deprecationWarning = true
  } = options;

  return (req, res, next) => {
    const version = parseApiVersion(req);
    const versionInfo = getVersionInfo(version);
    
    // Add version info to request
    req.apiVersion = version;
    req.versionInfo = versionInfo;
    
    // Add version to response headers
    res.set('API-Version', version);
    res.set('API-Supported-Versions', SUPPORTED_VERSIONS.join(', '));
    res.set('API-Current-Version', CURRENT_VERSION);
    
    // Check if version is supported
    if (!versionInfo.isSupported && !allowUnsupported) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `API version '${version}' is not supported`,
        error: 'UNSUPPORTED_API_VERSION',
        supportedVersions: SUPPORTED_VERSIONS,
        currentVersion: CURRENT_VERSION,
        meta: {
          timestamp: new Date().toISOString(),
          version: CURRENT_VERSION
        }
      });
    }
    
    // Add deprecation warning for deprecated versions
    if (versionInfo.isDeprecated && deprecationWarning) {
      res.set('Deprecation', 'true');
      res.set('API-Deprecation-Date', getDeprecationDate(version));
      res.set('API-Sunset-Date', getSunsetDate(version));
      res.set('Warning', `API version ${version} is deprecated. Please upgrade to ${CURRENT_VERSION}`);
    }
    
    next();
  };
};

/**
 * Version-specific route handler
 * Allows different logic for different API versions
 */
const versionHandler = (handlers) => {
  return (req, res, next) => {
    const version = req.apiVersion || DEFAULT_VERSION;
    const handler = handlers[version] || handlers.default;
    
    if (!handler) {
      return res.status(500).json({
        success: false,
        statusCode: 500,
        message: `No handler available for API version ${version}`,
        error: 'NO_VERSION_HANDLER',
        meta: {
          timestamp: new Date().toISOString(),
          version
        }
      });
    }
    
    return handler(req, res, next);
  };
};

/**
 * Feature flag middleware based on API version
 */
const featureFlag = (feature, enabledVersions = [CURRENT_VERSION]) => {
  return (req, res, next) => {
    const version = req.apiVersion || DEFAULT_VERSION;
    const isEnabled = enabledVersions.includes(version);
    
    req.features = req.features || {};
    req.features[feature] = isEnabled;
    
    next();
  };
};

/**
 * Compatibility layer for old mobile app versions
 */
const compatibilityLayer = () => {
  return (req, res, next) => {
    const version = req.apiVersion || DEFAULT_VERSION;
    
    // Add compatibility transformations here
    switch (version) {
      case 'v1':
        // Transform request/response for v1 compatibility
        req.isLegacyVersion = true;
        break;
      case 'v2':
        // Add v2 specific features
        req.supportsNewFeatures = true;
        break;
      default:
        break;
    }
    
    next();
  };
};

/**
 * Response transformer based on API version
 */
const versionResponseTransformer = () => {
  return (req, res, next) => {
    const originalJson = res.json;
    const version = req.apiVersion || DEFAULT_VERSION;
    
    res.json = function(body) {
      // Transform response based on version
      const transformedBody = transformResponseForVersion(body, version);
      return originalJson.call(this, transformedBody);
    };
    
    next();
  };
};

/**
 * Transform response structure based on API version
 */
const transformResponseForVersion = (body, version) => {
  switch (version) {
    case 'v1':
      // Keep legacy response format for v1
      return body;
    case 'v2':
      // Add new fields or modify structure for v2
      if (body && typeof body === 'object') {
        return {
          ...body,
          apiVersion: version,
          responseTime: new Date().toISOString()
        };
      }
      return body;
    default:
      return body;
  }
};

/**
 * Get deprecation date for a version (placeholder)
 */
const getDeprecationDate = (version) => {
  // Return deprecation dates for versions
  const deprecationDates = {
    // 'v1': '2024-12-31'
  };
  return deprecationDates[version] || null;
};

/**
 * Get sunset date for a version (placeholder)
 */
const getSunsetDate = (version) => {
  // Return sunset dates for versions
  const sunsetDates = {
    // 'v1': '2025-06-30'
  };
  return sunsetDates[version] || null;
};

module.exports = {
  apiVersionMiddleware,
  versionHandler,
  featureFlag,
  compatibilityLayer,
  versionResponseTransformer,
  parseApiVersion,
  isSupportedVersion,
  isDeprecatedVersion,
  getVersionInfo,
  SUPPORTED_VERSIONS,
  DEFAULT_VERSION,
  CURRENT_VERSION
}; 