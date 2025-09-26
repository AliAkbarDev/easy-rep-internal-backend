const Joi = require('joi');

// Create vehicle validation schema
const createVehicleSchema = Joi.object({
    brand: Joi.string()
        .min(2)
        .max(50)
        .required()
        .messages({
            'string.min': 'Brand must be at least 2 characters long',
            'string.max': 'Brand cannot exceed 50 characters',
            'any.required': 'Brand is required'
        }),
    model: Joi.string()
        .min(1)
        .max(100)
        .required()
        .messages({
            'string.min': 'Model must be at least 1 character long',
            'string.max': 'Model cannot exceed 100 characters',
            'any.required': 'Model is required'
        }),
    registration_date: Joi.date()
        .min('1900-01-01')
        .max(new Date(new Date().getFullYear() + 2, 11, 31)) // up to Dec 31, 2 years ahead
        .required()
        .messages({
            'date.base': 'Registration date must be a valid date',
            'date.min': 'Registration date must be after Jan 1, 1900',
            'date.max': `Registration date cannot be later than ${new Date().getFullYear() + 2}`,
            'any.required': 'Registration date is required'
        }),
    type: Joi.string()
        .required()
        .messages({
            'any.required': 'Vehicle type is required'
        }),
    vin: Joi.string()
        .length(17)
        .pattern(/^[A-HJ-NPR-Z0-9]{17}$/)
        .optional()
        .messages({
            'string.length': 'VIN must be exactly 17 characters long',
            'string.pattern.base': 'VIN must contain only valid characters (A-H, J-N, P-R, Z, 0-9)',
        }),
    owner_id: Joi.string()
        .uuid()
        .optional()
        .messages({
            'string.guid': 'Please provide a valid owner ID'
        }),
});

// Update vehicle validation schema (all fields optional)
const updateVehicleSchema = Joi.object({
    brand: Joi.string()
        .min(2)
        .max(50)
        .optional()
        .messages({
            'string.min': 'Brand must be at least 2 characters long',
            'string.max': 'Brand cannot exceed 50 characters'
        }),
    model: Joi.string()
        .min(1)
        .max(100)
        .optional()
        .messages({
            'string.min': 'Model must be at least 1 character long',
            'string.max': 'Model cannot exceed 100 characters'
        }),
    registration_date: Joi.date()
        .min('1900-01-01')
        .max(new Date(new Date().getFullYear() + 2, 11, 31)) // up to Dec 31, 2 years ahead
        .required()
        .messages({
            'date.base': 'Registration date must be a valid date',
            'date.min': 'Registration date must be after Jan 1, 1900',
            'date.max': `Registration date cannot be later than ${new Date().getFullYear() + 2}`,
            'any.required': 'Registration date is required'
        }),
    type: Joi.string()
        .required()
        .messages({
            'any.required': 'Vehicle type is required'
        }),
    vin: Joi.string()
        .length(17)
        .pattern(/^[A-HJ-NPR-Z0-9]{17}$/)
        .optional()
        .messages({
            'string.length': 'VIN must be exactly 17 characters long',
            'string.pattern.base': 'VIN must contain only valid characters (A-H, J-N, P-R, Z, 0-9)',
        }),
    owner_id: Joi.string()
        .uuid()
        .optional()
        .messages({
            'string.guid': 'Please provide a valid owner ID',
        }),
});

// Vehicle ID validation schema
const vehicleIdSchema = Joi.object({
    id: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.guid': 'Please provide a valid vehicle ID',
            'any.required': 'Vehicle ID is required'
        })
});

module.exports = {
    createVehicleSchema,
    updateVehicleSchema,
    vehicleIdSchema,
};