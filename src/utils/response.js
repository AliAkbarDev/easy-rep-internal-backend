/**
 * Response utility functions for consistent API responses
 */

/**
 * Success response helper
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {*} data - Response data
 * @param {Object} meta - Additional metadata
 */
const successResponse = (res, statusCode = 200, message = 'Success', data = null, meta = null) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Error response helper
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {*} errors - Error details
 * @param {string} code - Error code
 */
const errorResponse = (res, statusCode = 500, message = 'Internal server error', field = null, errors = null, code = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (field !== null) {
    response.field = field;
  }

  if (errors !== null) {
    response.errors = errors;
  }

  if (code !== null) {
    response.code = code;
  }

  return res.status(statusCode).json(response);
};

/**
 * Pagination response helper
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Array} data - Array of data items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @param {number} totalPages - Total number of pages
 */
const paginatedResponse = (res, message, data, page, limit, total, totalPages) => {
  return successResponse(res, 200, message, data, {
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
};

/**
 * Created response helper
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {*} data - Created resource data
 */
const createdResponse = (res, message = 'Resource created successfully', data = null) => {
  return successResponse(res, 201, message, data);
};

/**
 * Updated response helper
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {*} data - Updated resource data
 */
const updatedResponse = (res, message = 'Resource updated successfully', data = null) => {
  return successResponse(res, 200, message, data);
};

/**
 * Deleted response helper
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 */
const deletedResponse = (res, message = 'Resource deleted successfully') => {
  return successResponse(res, 200, message);
};

/**
 * Not found response helper
 * @param {Object} res - Express response object
 * @param {string} message - Not found message
 */
const notFoundResponse = (res, message = 'Resource not found') => {
  return errorResponse(res, 404, message);
};

/**
 * Bad request response helper
 * @param {Object} res - Express response object
 * @param {string} message - Bad request message
 * @param {*} errors - Validation errors
 */
const badRequestResponse = (res, message = 'Bad request', errors = null) => {
  return errorResponse(res, 400, message, errors);
};

/**
 * Bad request response helper
 * @param {Object} res - Express response object
 * @param {string} message - Bad request message
 * @param {string} field - Bad request field
 * @param {*} errors - Validation errors
 */
const BadAuthRequestResponse = (res, field = null, message = 'Bad request', errors = null) => {
  return errorResponse(res, 400, message, field, errors);
};

/**
 * Unauthorized response helper
 * @param {Object} res - Express response object
 * @param {string} message - Unauthorized message
 */
const unauthorizedResponse = (res, message = 'Unauthorized') => {
  return errorResponse(res, 401, message);
};

/**
 * Forbidden response helper
 * @param {Object} res - Express response object
 * @param {string} message - Forbidden message
 */
const forbiddenResponse = (res, message = 'Forbidden') => {
  return errorResponse(res, 403, message);
};

/**
 * Conflict response helper
 * @param {Object} res - Express response object
 * @param {string} message - Conflict message
 */
const conflictResponse = (res, message = 'Resource conflict') => {
  return errorResponse(res, 409, message);
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  createdResponse,
  updatedResponse,
  deletedResponse,
  notFoundResponse,
  badRequestResponse,
  BadAuthRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  conflictResponse
}; 