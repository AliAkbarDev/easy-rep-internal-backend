const express = require('express');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { logger } = require('../config/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateRequest } = require('../utils/validation');
const {
  successResponse,
  errorResponse,
  updatedResponse,
  notFoundResponse,
  paginatedResponse
} = require('../utils/response');
const {
  updateProfileSchema,
  changePasswordSchema,
  userSearchSchema,
  userIdSchema
} = require('../validators/user');
const upload = require('../middleware/upload');

const router = express.Router();

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.userId)
      .single();

    if (error || !profile) {
      return notFoundResponse(res, 'Profile not found');
    }

    successResponse(res, 200, 'Profile retrieved successfully', {
      id: profile.id,
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      role: profile.role,
      status: profile.status,
      phone: profile.phone,
      bio: profile.bio,
      avatar: profile.avatar,
      location: profile.location,
      website: profile.website,
      socialLinks: profile.social_links,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    });

  } catch (error) {
    logger.error('Get profile error:', error.message);
    errorResponse(res, 500, 'Failed to retrieve profile');
  }
});

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile', authenticateToken, upload.single('avatar'), validateRequest(updateProfileSchema), async (req, res) => {
  try {
    const updateData = {
      updated_at: new Date().toISOString()
    };

    console.log('body', req?.body)

    if (req.file) {
      const filePath = `avatars/${Date.now()}_${req.file.originalname}`;

      const { data, error } = await supabaseAdmin.storage
        .from('uploads')
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true
        });

      if (error) {
        logger.error('Supabase upload error', error);
        return errorResponse(res, 500, 'Failed to upload avatar');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      updateData.avatar = publicUrl;
    }

    // Map request body to database fields
    if (req.body.firstName) updateData.first_name = req.body.firstName;
    if (req.body.familyName) updateData.last_name = req.body.familyName;
    if (req.body.username) updateData.user_name = req.body.username;
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.phone) updateData.phone = req.body.phone;
    if (req.body.bio) updateData.bio = req.body.bio;
    if (req.body.location) updateData.location = req.body.location;
    if (req.body.website) updateData.website = req.body.website;
    if (req.body.socialLinks) updateData.social_links = req.body.socialLinks;

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', req.body.userId)
      .select()
      .single();

    if (error) {
      logger.error('Profile update error:', error);
      return errorResponse(res, 500, 'Failed to update profile');
    }

    updatedResponse(res, 'Profile updated successfully', {
      id: profile.id,
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.family_name,
      username: profile.user_name,
      role: profile.role,
      status: profile.status,
      phone: profile.phone,
      bio: profile.bio,
      avatar: profile.avatar,
      location: profile.location,
      website: profile.website,
      socialLinks: profile.social_links,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    });

  } catch (error) {
    logger.error('Update profile error:', error.message);
    errorResponse(res, 500, 'Failed to update profile');
  }
});

/**
 * @route   POST /api/users/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', authenticateToken, validateRequest(changePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('chnage password user', user)

    if (authError || !user) {
      return errorResponse(res, 500, 'Failed to verify current user');
    }

    // Update password in Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      logger.error('Password change error:', updateError.message);
      return errorResponse(res, 500, 'Failed to change password');
    }

    logger.info(`Password changed for user: ${user.email}`);
    successResponse(res, 200, 'Password changed successfully');

  } catch (error) {
    logger.error('Change password error:', error.message);
    errorResponse(res, 500, 'Failed to change password');
  }
});


/**
 * @route   POST /api/feedback
 * @desc    Submit new feedback
 * @access  Public
 */
router.post('/feedback', authenticateToken, upload.single('attachment'), async (req, res) => {
  try {
    const { name, email, reason, description } = req.body;
    const file = req.file;

    const uploadedUrls = [];

    if (file) {
      const filePath = `feedback/${Date.now()}_${file.originalname}`;

      const { data, error } = await supabaseAdmin.storage
        .from('uploads')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (error) {
        logger.error('Supabase upload error', error);
        return errorResponse(res, 500, 'Failed to upload attachment');
      }

      const { data: publicUrlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        uploadedUrls.push(publicUrlData.publicUrl);
      }
    }


    const feedbackData = {
      userName: name,
      userEmail: email,
      contactReason: reason,
      description,
      attachment: uploadedUrls,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('feedback')
      .insert([feedbackData])
      .select()
      .single();

    if (insertError) {
      return errorResponse(res, 400, 'Failed to submit feedback');
    }

    successResponse(res, 200, 'Feedback submitted successfully', inserted);
  } catch (error) {
    logger.error('Submit feedback error:', error);
    errorResponse(res, 500, 'Failed to submit feedback');
  }
});


/**
 * @route   GET /api/users
 * @desc    Get all users (admin only)
 * @access  Private (Admin)
 */
router.get('/', authenticateToken, requireRole(['admin']), validateRequest(userSearchSchema, 'query'), async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (role) {
      query = query.eq('role', role);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      logger.error('Get users error:', error.message);
      return errorResponse(res, 500, 'Failed to retrieve users');
    }

    const totalPages = Math.ceil((count || 0) / limit);

    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      status: user.status,
      phone: user.phone,
      bio: user.bio,
      avatar: user.avatar,
      location: user.location,
      website: user.website,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));

    paginatedResponse(res, 'Users retrieved successfully', formattedUsers, page, limit, count, totalPages);

  } catch (error) {
    logger.error('Get users error:', error.message);
    errorResponse(res, 500, 'Failed to retrieve users');
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (admin only)
 * @access  Private (Admin)
 */
router.get('/:id', authenticateToken, requireRole(['admin']), validateRequest(userIdSchema, 'params'), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !profile) {
      return notFoundResponse(res, 'User not found');
    }

    successResponse(res, 200, 'User retrieved successfully', {
      id: profile.id,
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      role: profile.role,
      status: profile.status,
      phone: profile.phone,
      bio: profile.bio,
      avatar: profile.avatar,
      location: profile.location,
      website: profile.website,
      socialLinks: profile.social_links,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    });

  } catch (error) {
    logger.error('Get user error:', error.message);
    errorResponse(res, 500, 'Failed to retrieve user');
  }
});

/**
 * @route   PUT /api/users/:id/status
 * @desc    Update user status (admin only)
 * @access  Private (Admin)
 */
router.put('/:id/status', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return errorResponse(res, 400, 'Invalid status value');
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !profile) {
      return notFoundResponse(res, 'User not found');
    }

    logger.info(`User status updated: ${id} -> ${status}`);
    updatedResponse(res, 'User status updated successfully', {
      id: profile.id,
      email: profile.email,
      status: profile.status
    });

  } catch (error) {
    logger.error('Update user status error:', error.message);
    errorResponse(res, 500, 'Failed to update user status');
  }
});

module.exports = router; 