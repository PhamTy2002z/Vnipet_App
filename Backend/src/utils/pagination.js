/**
 * Pagination Utility for Mobile Apps
 * Handles pagination logic for large datasets
 */

class PaginationHelper {
  /**
   * Parse pagination parameters from request query
   * @param {Object} query - Express request query object
   * @param {Object} options - Default options
   * @returns {Object} Parsed pagination parameters
   */
  static parseParams(query, options = {}) {
    const {
      defaultPage = 1,
      defaultLimit = 20,
      maxLimit = 100,
      minLimit = 1
    } = options;

    let page = parseInt(query.page) || defaultPage;
    let limit = parseInt(query.limit) || defaultLimit;

    // Validate and constrain values
    page = Math.max(1, page);
    limit = Math.max(minLimit, Math.min(maxLimit, limit));

    const skip = (page - 1) * limit;

    return {
      page,
      limit,
      skip,
      offset: skip // Alias for skip
    };
  }

  /**
   * Create pagination metadata
   * @param {number} total - Total number of documents
   * @param {number} page - Current page
   * @param {number} limit - Items per page
   * @returns {Object} Pagination metadata
   */
  static createMeta(total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
      nextPage: hasNext ? page + 1 : null,
      prevPage: hasPrev ? page - 1 : null,
      startIndex: (page - 1) * limit + 1,
      endIndex: Math.min(page * limit, total)
    };
  }

  /**
   * Apply pagination to Mongoose query
   * @param {Object} query - Mongoose query object
   * @param {Object} params - Pagination parameters from parseParams
   * @returns {Object} Modified query
   */
  static applyToQuery(query, params) {
    return query.skip(params.skip).limit(params.limit);
  }

  /**
   * Get total count for a Mongoose model with filters
   * @param {Object} Model - Mongoose model
   * @param {Object} filter - Query filter object
   * @returns {Promise<number>} Total count
   */
  static async getTotal(Model, filter = {}) {
    return await Model.countDocuments(filter);
  }

  /**
   * Complete pagination wrapper for Mongoose queries
   * @param {Object} Model - Mongoose model
   * @param {Object} filter - Query filter
   * @param {Object} options - Pagination and query options
   * @returns {Promise<Object>} Paginated results with metadata
   */
  static async paginate(Model, filter = {}, options = {}) {
    const {
      page = 1,
      limit = 20,
      sort = { createdAt: -1 },
      populate = null,
      select = null,
      lean = true
    } = options;

    const params = this.parseParams({ page, limit }, options);
    
    // Get total count
    const total = await this.getTotal(Model, filter);
    
    // Build query
    let query = Model.find(filter);
    
    // Apply pagination
    query = this.applyToQuery(query, params);
    
    // Apply sorting
    if (sort) {
      query = query.sort(sort);
    }
    
    // Apply population
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach(pop => query = query.populate(pop));
      } else {
        query = query.populate(populate);
      }
    }
    
    // Apply field selection
    if (select) {
      query = query.select(select);
    }
    
    // Apply lean for better performance
    if (lean) {
      query = query.lean();
    }
    
    // Execute query
    const data = await query.exec();
    
    // Create pagination metadata
    const pagination = this.createMeta(total, params.page, params.limit);
    
    return {
      data,
      pagination
    };
  }

  /**
   * Create pagination links for APIs
   * @param {string} baseUrl - Base URL for the API
   * @param {Object} pagination - Pagination metadata
   * @param {Object} extraParams - Additional query parameters
   * @returns {Object} Pagination links
   */
  static createLinks(baseUrl, pagination, extraParams = {}) {
    const createUrl = (page) => {
      const params = new URLSearchParams({
        ...extraParams,
        page: page.toString(),
        limit: pagination.limit.toString()
      });
      return `${baseUrl}?${params.toString()}`;
    };

    const links = {
      first: createUrl(1),
      last: createUrl(pagination.totalPages)
    };

    if (pagination.hasPrev) {
      links.prev = createUrl(pagination.prevPage);
    }

    if (pagination.hasNext) {
      links.next = createUrl(pagination.nextPage);
    }

    links.self = createUrl(pagination.page);

    return links;
  }
}

/**
 * Express middleware for automatic pagination
 * Usage: Add to routes that need pagination
 */
const paginationMiddleware = (options = {}) => {
  return (req, res, next) => {
    const params = PaginationHelper.parseParams(req.query, options);
    
    // Add pagination params to request
    req.pagination = params;
    
    // Add helper methods to request
    req.createPaginationMeta = (total) => {
      return PaginationHelper.createMeta(total, params.page, params.limit);
    };
    
    req.createPaginationLinks = (baseUrl, pagination, extraParams = {}) => {
      return PaginationHelper.createLinks(baseUrl, pagination, extraParams);
    };
    
    next();
  };
};

/**
 * Aggregation pipeline pagination helper
 * @param {Array} pipeline - MongoDB aggregation pipeline
 * @param {Object} params - Pagination parameters
 * @returns {Array} Modified pipeline with pagination stages
 */
const addPaginationToAggregation = (pipeline, params) => {
  return [
    ...pipeline,
    { $skip: params.skip },
    { $limit: params.limit }
  ];
};

/**
 * Get total count for aggregation pipeline
 * @param {Object} Model - Mongoose model
 * @param {Array} pipeline - Aggregation pipeline (without pagination stages)
 * @returns {Promise<number>} Total count
 */
const getAggregationTotal = async (Model, pipeline) => {
  const countPipeline = [
    ...pipeline,
    { $count: 'total' }
  ];
  
  const result = await Model.aggregate(countPipeline);
  return result.length > 0 ? result[0].total : 0;
};

module.exports = {
  PaginationHelper,
  paginationMiddleware,
  addPaginationToAggregation,
  getAggregationTotal
}; 