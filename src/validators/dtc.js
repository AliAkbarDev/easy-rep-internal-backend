const Joi = require('joi');

// Create DTC validation schema
const createDTCSchema = Joi.object({
  vehicle_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Vehicle ID must be a valid UUID',
      'any.required': 'Vehicle ID is required'
    }),
  dtc_code: Joi.string()
    .pattern(/^[A-Z][0-9]{4}$/)
    .required()
    .messages({
      'string.pattern.base': 'DTC code must be in format: one letter followed by 4 digits (e.g., P0524)',
      'any.required': 'DTC code is required'
    }),
  description: Joi.string()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.min': 'Description must be at least 10 characters long',
      'string.max': 'Description cannot exceed 500 characters',
      'any.required': 'Description is required'
    }),
  impact_level: Joi.string()
    .valid('low', 'mid', 'high')
    .required()
    .messages({
      'any.only': 'Impact level must be one of: low, mid, high',
      'any.required': 'Impact level is required'
    }),
  status: Joi.string()
    .valid('active', 'resolved', 'ignored')
    .default('active')
    .messages({
      'any.only': 'Status must be one of: active, resolved, ignored'
    }),
  occurred_at: Joi.date()
    .iso()
    .max('now')
    .messages({
      'date.format': 'Occurred at must be a valid ISO date',
      'date.max': 'Occurred at cannot be in the future'
    })
});

// Update DTC validation schema
const updateDTCSchema = Joi.object({
  description: Joi.string()
    .min(10)
    .max(500)
    .messages({
      'string.min': 'Description must be at least 10 characters long',
      'string.max': 'Description cannot exceed 500 characters'
    }),
  impact_level: Joi.string()
    .valid('low', 'mid', 'high')
    .messages({
      'any.only': 'Impact level must be one of: low, mid, high'
    }),
  status: Joi.string()
    .valid('active', 'resolved', 'ignored')
    .messages({
      'any.only': 'Status must be one of: active, resolved, ignored'
    }),
  resolution_notes: Joi.string()
    .max(1000)
    .when('status', {
      is: 'resolved',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.max': 'Resolution notes cannot exceed 1000 characters',
      'any.required': 'Resolution notes are required when marking DTC as resolved'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// DTC ID validation schema for params
const dtcIdSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'DTC ID must be a valid UUID',
      'any.required': 'DTC ID is required'
    })
});

// Get DTCs query validation schema
const getDTCsQuerySchema = Joi.object({
  vehicle_id: Joi.string()
    .uuid()
    .messages({
      'string.guid': 'Vehicle ID must be a valid UUID'
    }),
  status: Joi.string()
    .valid('active', 'resolved', 'ignored')
    .messages({
      'any.only': 'Status must be one of: active, resolved, ignored'
    }),
  impact_level: Joi.string()
    .valid('low', 'mid', 'high')
    .messages({
      'any.only': 'Impact level must be one of: low, mid, high'
    }),
  from_date: Joi.date()
    .iso()
    .messages({
      'date.format': 'From date must be a valid ISO date'
    }),
  to_date: Joi.date()
    .iso()
    .min(Joi.ref('from_date'))
    .messages({
      'date.format': 'To date must be a valid ISO date',
      'date.min': 'To date must be after from date'
    }),
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  sort_by: Joi.string()
    .valid('occurred_at', 'dtc_code', 'impact_level', 'status', 'created_at', 'updated_at')
    .default('occurred_at')
    .messages({
      'any.only': 'Sort by must be one of: occurred_at, dtc_code, impact_level, status, created_at, updated_at'
    }),
  sort_order: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either asc or desc'
    })
});

// Bulk create DTCs validation schema
const createBulkDTCsSchema = Joi.object({
  dtcs: Joi.array()
    .items(createDTCSchema.fork('dtc_code', (schema) => schema.optional()))
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least one DTC must be provided',
      'array.max': 'Cannot create more than 50 DTCs at once',
      'any.required': 'DTCs array is required'
    })
});

// DTC code validation schema for single code lookup
const dtcCodeSchema = Joi.object({
  code: Joi.string()
    .pattern(/^[A-Z][0-9]{4}$/)
    .required()
    .messages({
      'string.pattern.base': 'DTC code must be in format: one letter followed by 4 digits (e.g., P0524)',
      'any.required': 'DTC code is required'
    })
});

// Vehicle ID validation schema for params
const vehicleIdSchema = Joi.object({
  vehicleId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Vehicle ID must be a valid UUID',
      'any.required': 'Vehicle ID is required'
    })
});

module.exports = {
  createDTCSchema,
  updateDTCSchema,
  dtcIdSchema,
  getDTCsQuerySchema,
  createBulkDTCsSchema,
  dtcCodeSchema,
  vehicleIdSchema
};