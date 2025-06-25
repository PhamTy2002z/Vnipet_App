/**
 * API Response Formatter for Mobile Apps
 * Provides consistent response format across all endpoints
 */

class APIResponse {
  constructor() {
    this.timestamp = new Date().toISOString();
    this.version = process.env.API_VERSION || 'v1';
  }

  success(res, data = null, message = 'Success', statusCode = 200, meta = {}) {
    const response = {
      success: true,
      statusCode,
      message,
      data,
      meta: {
        timestamp: this.timestamp,
        version: this.version,
        requestId: res.locals.requestId || null,
        ...meta
      }
    };

    return res.status(statusCode).json(response);
  }

  error(res, message = 'Internal Server Error', statusCode = 500, errors = null, meta = {}) {
    const response = {
      success: false,
      statusCode,
      message,
      errors,
      meta: {
        timestamp: this.timestamp,
        version: this.version,
        requestId: res.locals.requestId || null,
        ...meta
      }
    };

    return res.status(statusCode).json(response);
  }

  paginated(res, data, pagination, message = 'Success', statusCode = 200, meta = {}) {
    const response = {
      success: true,
      statusCode,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
        hasNext: pagination.hasNext,
        hasPrev: pagination.hasPrev,
        nextPage: pagination.hasNext ? pagination.page + 1 : null,
        prevPage: pagination.hasPrev ? pagination.page - 1 : null
      },
      meta: {
        timestamp: this.timestamp,
        version: this.version,
        requestId: res.locals.requestId || null,
        ...meta
      }
    };

    return res.status(statusCode).json(response);
  }

  created(res, data = null, message = 'Created successfully', meta = {}) {
    return this.success(res, data, message, 201, meta);
  }

  updated(res, data = null, message = 'Updated successfully', meta = {}) {
    return this.success(res, data, message, 200, meta);
  }

  deleted(res, message = 'Deleted successfully', meta = {}) {
    return this.success(res, null, message, 200, meta);
  }

  notFound(res, message = 'Resource not found', meta = {}) {
    return this.error(res, message, 404, null, meta);
  }

  badRequest(res, message = 'Bad request', errors = null, meta = {}) {
    return this.error(res, message, 400, errors, meta);
  }

  unauthorized(res, message = 'Unauthorized', meta = {}) {
    return this.error(res, message, 401, null, meta);
  }

  forbidden(res, message = 'Forbidden', meta = {}) {
    return this.error(res, message, 403, null, meta);
  }

  validation(res, errors, message = 'Validation failed', meta = {}) {
    return this.error(res, message, 422, errors, meta);
  }

  conflict(res, message = 'Conflict', meta = {}) {
    return this.error(res, message, 409, null, meta);
  }

  tooManyRequests(res, message = 'Too many requests', meta = {}) {
    return this.error(res, message, 429, null, meta);
  }
}

// Express middleware to add response formatter to res object
const responseMiddleware = (req, res, next) => {
  // Generate unique request ID for tracking
  res.locals.requestId = req.headers['x-request-id'] || 
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add response formatter methods to res object
  const formatter = new APIResponse();
  
  res.apiSuccess = formatter.success.bind(formatter, res);
  res.apiError = formatter.error.bind(formatter, res);
  res.apiPaginated = formatter.paginated.bind(formatter, res);
  res.apiCreated = formatter.created.bind(formatter, res);
  res.apiUpdated = formatter.updated.bind(formatter, res);
  res.apiDeleted = formatter.deleted.bind(formatter, res);
  res.apiNotFound = formatter.notFound.bind(formatter, res);
  res.apiBadRequest = formatter.badRequest.bind(formatter, res);
  res.apiUnauthorized = formatter.unauthorized.bind(formatter, res);
  res.apiForbidden = formatter.forbidden.bind(formatter, res);
  res.apiValidation = formatter.validation.bind(formatter, res);
  res.apiConflict = formatter.conflict.bind(formatter, res);
  res.apiTooManyRequests = formatter.tooManyRequests.bind(formatter, res);

  next();
};

module.exports = {
  APIResponse,
  responseMiddleware
}; 