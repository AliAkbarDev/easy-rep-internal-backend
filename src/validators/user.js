const Joi = require('joi');

// Profile update validation schema
const updateProfileSchema = Joi.object({
  username: Joi.string()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'username must be at least 2 characters long',
      'string.max': 'username cannot exceed 50 characters',
    }),
  email: Joi.string()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'email must be at least 2 characters long',
      'string.max': 'email cannot exceed 50 characters'
    }),
  firstName: Joi.string()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters'
    }),
  familyName: Joi.string()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'family name must be at least 2 characters long',
      'string.max': 'family name cannot exceed 50 characters'
    }),
  phone: Joi.string()
    .pattern(/^\+?[\d\s\-\(\)]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  bio: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Bio cannot exceed 500 characters'
    }),
  avatar: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Please provide a valid URL for avatar'
    }),
  location: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Location cannot exceed 100 characters'
    }),
  website: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Please provide a valid URL for website'
    }),
  socialLinks: Joi.object({
    linkedin: Joi.string().uri().optional(),
    twitter: Joi.string().uri().optional(),
    github: Joi.string().uri().optional(),
    facebook: Joi.string().uri().optional()
  }).optional(),
  userId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': ' userId be a valid UUID',
    }),
});

// Password change validation schema
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'New password is required'
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    })
});

// User search/filter schema
const userSearchSchema = Joi.object({
  search: Joi.string()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Search term must be at least 2 characters long',
      'string.max': 'Search term cannot exceed 50 characters'
    }),
  role: Joi.string()
    .valid('user', 'admin', 'moderator')
    .optional()
    .messages({
      'any.only': 'Role must be one of: user, admin, moderator'
    }),
  status: Joi.string()
    .valid('active', 'inactive', 'suspended')
    .optional()
    .messages({
      'any.only': 'Status must be one of: active, inactive, suspended'
    }),
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional()
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
    .optional()
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    })
});

// User ID validation schema
const userIdSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Please provide a valid user ID',
      'any.required': 'User ID is required'
    })
});

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
  userSearchSchema,
  userIdSchema
}; 