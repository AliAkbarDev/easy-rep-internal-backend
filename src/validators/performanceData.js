const Joi = require('joi');

// Performance data creation validation schema
const createPerformanceDataSchema = Joi.object({
  vehicle_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Vehicle ID must be a valid UUID',
      'any.required': 'Vehicle ID is required'
    }),
  rpm: Joi.number()
    .messages({
      'number.base': 'RPM must be a number',
    }),
  speed: Joi.number()
    .messages({
      'number.base': 'Speed must be a number',
    }),
  coolantTemp: Joi.number()
    .messages({
      'number.base': 'Coolant temperature must be a number',
    }),
  engineTemp: Joi.number()
    .messages({
      'number.base': 'engine temperature must be a number',
    }),
  fuelTankLevel: Joi.number()
    .messages({
      'number.base': 'Fuel Tank level must be a number',
    }),
  intakeAirTemp: Joi.number()
    .messages({
      'number.base': 'IntakeAirTemp must be a number',
    }),
  batteryVoltage: Joi.number()
    .messages({
      'number.base': 'Battery voltage must be a number',
    }),
  fuelConsumption: Joi.number()
    .messages({
      'number.base': 'fuel Consumption must be a number',
    }),
  timestamp: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'Timestamp must be in ISO 8601 format',
      'date.base': 'Timestamp must be a valid date'
    })
});

// Bulk performance data creation validation schema
const createBulkPerformanceDataSchema = Joi.object({
  data: Joi.array()
    .items(createPerformanceDataSchema)
    .min(1)
    .max(1000)
    .required()
    .messages({
      'array.min': 'At least one performance data entry is required',
      'array.max': 'Cannot process more than 1000 entries at once',
      'any.required': 'Performance data array is required'
    })
});

// Aggregated data query validation schema
const aggregatedDataQuerySchema = Joi.object({
  vehicle_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Vehicle ID must be a valid UUID',
      'any.required': 'Vehicle ID is required'
    }),
  from_date: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'From date must be in ISO 8601 format',
      'date.base': 'From date must be a valid date'
    }),
  to_date: Joi.date()
    .iso()
    .min(Joi.ref('from_date'))
    .optional()
    .messages({
      'date.format': 'To date must be in ISO 8601 format',
      'date.base': 'To date must be a valid date',
      'date.min': 'To date must be after from date'
    }),
  group_by: Joi.string()
    .valid('hour', 'day', 'week', 'month')
    .default('day')
    .optional()
    .messages({
      'any.only': 'Group by must be one of: hour, day, week, month'
    }),
  metrics: Joi.array()
    .items(Joi.string().valid('rpm', 'speed', 'temperature'))
    .min(1)
    .default(['rpm', 'speed', 'temperature'])
    .optional()
    .messages({
      'array.min': 'At least one metric must be specified',
      'any.only': 'Metrics must be one of: rpm, speed, temperature'
    }),
  aggregation_type: Joi.string()
    .valid('avg', 'min', 'max', 'all')
    .default('all')
    .optional()
    .messages({
      'any.only': 'Aggregation type must be one of: avg, min, max, all'
    })
});

// Performance data ID validation schema
const performanceDataIdSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Please provide a valid performance data ID',
      'any.required': 'Performance data ID is required'
    })
});

// Vehicle ID validation schema
const vehicleIdSchema = Joi.object({
  vehicle_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Vehicle ID must be a valid UUID',
      'any.required': 'Vehicle ID is required'
    }),
});

module.exports = {
  createPerformanceDataSchema,
  createBulkPerformanceDataSchema,
  aggregatedDataQuerySchema,
  performanceDataIdSchema,
  vehicleIdSchema,
};