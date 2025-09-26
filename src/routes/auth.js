const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const { logger } = require('../config/logger');
const { validateRequest } = require('../utils/validation');
// import { createClient } from '@supabase/supabase-js';
const {
  successResponse,
  errorResponse,
  createdResponse,
  badRequestResponse,
  unauthorizedResponse,
  BadAuthRequestResponse
} = require('../utils/response');
const {
  registerSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  emailVerificationSchema
} = require('../validators/auth');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a user
 * @access  Public
 */
router.post('/register', validateRequest(registerSchema), async (req, res) => {
  try {
    const { email, password, userName, firstName, familyName, role } = req.body;

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL || "https://ihmjwvwvixaxmfkgkejc.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlobWp3dnd2aXhheG1ma2drZWpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjU1NDgyNiwiZXhwIjoyMDYyMTMwODI2fQ.NMmETtsZU4N7aMAQa8bZU4ZeHzkUoPNTsMq0gddK2lg",
    );

    const { data: existingAuthUser, error: authUserError } = await supabaseAdmin.auth.admin.listUsers();

    console.log('existingAuthUser', existingAuthUser)

    const emailAlreadyExists = existingAuthUser?.users?.some(user => user.email === email);

    if (emailAlreadyExists) {
      return BadAuthRequestResponse(res, 'email', 'Email already exist');
    }

    // 2. Check if username already exists in 'profiles'
    const { data: existingUserName, error: userNameCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_name', userName)
      .maybeSingle();

    if (userNameCheckError) {
      logger.error('Username check error:', userNameCheckError.message);
      return errorResponse(res, 500, 'Error checking username');
    }

    if (existingUserName) {
      return BadAuthRequestResponse(res, 'username', 'Username already exist');
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://easy-rep-internal-backend.vercel.app/auth-callback.html',
        data: {
          user_name: userName,
          role: role || 'user'
        }
      }
    });

    console.log('authDataSession', authData?.session)
    console.log('authData', authData)

    if (authError) {
      logger.error('Auth signup error:', authError);
      return badRequestResponse(res, authError.message);
    }

    // Create user profile in database
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          email,
          first_name: firstName,
          family_name: familyName,
          user_name: userName,
          role: role || 'user',
          status: 'active',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (profileError) {
      logger.error('Profile creation error:', profileError);
      await supabase.auth.admin.deleteUser(authData.user.id);
      return errorResponse(res, 500, 'Failed to create user profile');
    }

    createdResponse(res, 'User registered successfully', {
      user: {
        id: authData.user.id,
        email: authData.user.email,
        firstName,
        familyName,
        userName,
        role: role || 'user'
      },
    });

  } catch (error) {
    logger.error('Registration error:', error);
    errorResponse(res, 500, 'Registration failed');
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validateRequest(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      logger.warn(`Login failed for email: ${email}`, authError);
      let errormessage = ''
      if (authError?.message == 'Email not confirmed') {
        errormessage = 'Verify your email before login'
      } else {
        errormessage = authError?.message
      }
      return unauthorizedResponse(res, errormessage);
    }

    const accessToken = authData.session?.access_token;
    const refreshToken = authData.session.refresh_token;

    if (!accessToken) {
      logger.error(`Access token not found for user: ${email}`);
      return errorResponse(res, 'Login failed - missing access token');
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      logger.error('Profile fetch error:', profileError?.message);
      return errorResponse(res, 500, 'Failed to fetch user profile');
    }

    // Check if user is active
    if (profile.status !== 'active') {
      return unauthorizedResponse(res, 'Account is not active');
    }

    // Get user vehicle
    const { data: vehicleData, error: vehicleError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('owner_id', authData.user.id)
      .maybeSingle();


    if (vehicleError) {
      logger.error('Vehicle fetch error:', vehicleError);
      return errorResponse(res, 500, 'Failed to fetch user vehicle');
    }

    successResponse(res, 200, 'Login successful', {
      user: {
        id: authData.user.id,
        email: authData.user.email,
        firstName: profile.first_name,
        lastName: profile.family_name,
        userName: profile.user_name,
        avatar: profile.avatar,
        role: profile.role,
        status: profile.status
      },
      vehicle: {
        id: vehicleData?.id || null,
        brand: vehicleData?.brand || null,
        model: vehicleData?.model || null,
        type: vehicleData?.type || null,
        date: vehicleData?.registration_date || null
      },
      token: accessToken,
      refreshToken
    });

  } catch (error) {
    logger.error('Login error:', error);
    errorResponse(res, 500, 'Login failed');
  }
});


router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.body.refresh_token;

    if (!refreshToken) {
      return errorResponse(res, 401, 'No refresh token found');
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      logger.warn('Failed to refresh session', error);
      return errorResponse(res, 401, 'Invalid or expired refresh token');
    }

    const newAccessToken = data.session.access_token;
    const newRefreshToken = data.session.refresh_token;

    successResponse(res, 200, 'Token refreshed', {
      token: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt: data.session.expires_at
    });

  } catch (err) {
    logger.error('Refresh error:', err);
    errorResponse(res, 500, 'Failed to refresh token');
  }
});



router.get('/verify-email', async (req, res) => {
  try {
    const { type, access_token, refresh_token, token_hash } = req.query;

    if (token_hash && type) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type === 'signup' ? 'signup' : 'email',
      });

      if (error) {
        console.error('Token verification error:', error);
        return res.status(400).sendFile(path.join(__dirname, '../views/verification-failed.html'));
      }
      return res.sendFile(path.join(__dirname, '../views/verification-success.html'));
    }

    if (access_token) {
      const { data: userData, error: userError } = await supabase.auth.getUser(access_token);

      if (userError) {
        console.error('User verification error:', userError);
        return res.status(400).sendFile(path.join(__dirname, '../views/verification-failed.html'));
      }

      if (refresh_token) {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
        }
      }

      return res.sendFile(path.join(__dirname, '../views/verification-success.html'));
    }

    console.log('No valid verification parameters found');
    res.status(400).sendFile(path.join(__dirname, '../views/verification-failed.html'));

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).sendFile(path.join(__dirname, '../views/verification-failed.html'));
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const access_token = authHeader && authHeader.split(' ')[1];

    if (!access_token) {
      return unauthorizedResponse(res, 'Access token is required');
    }

    const response = await fetch(`${process.env.SUPABASE_URL || "https://ihmjwvwvixaxmfkgkejc.supabase.co"}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_ANON_KEY  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlobWp3dnd2aXhheG1ma2drZWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NTQ4MjYsImV4cCI6MjA2MjEzMDgyNn0.74kp5jSGn8-3Gg1nV6ZtyZuGz-nyChPgo6FfruocTsg",
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return unauthorizedResponse(res, errorData?.msg || 'Failed to revoke token');
    }

    successResponse(res, 200, 'Access token revoked successfully');
  } catch (error) {
    logger.error('Logout error:', error.message);
    errorResponse(res, 500, 'An error occurred while revoking the token');
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change Password
 * @access  Public
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, password } = req.body;
    console.log('req.body;', req.body)
    const userId = req.userId;

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL || "https://ihmjwvwvixaxmfkgkejc.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlobWp3dnd2aXhheG1ma2drZWpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjU1NDgyNiwiZXhwIjoyMDYyMTMwODI2fQ.NMmETtsZU4N7aMAQa8bZU4ZeHzkUoPNTsMq0gddK2lg",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get user details
    const { data: user, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

    console.log('user', user)
    if (getUserError || !user) {
      logger.error('Get user error:', getUserError);
      return errorResponse(res, 404, 'User not found');
    }

    // Verify current password using admin client
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: user.user.email,
      password: currentPassword
    });

    if (signInError) {
      logger.error('Current password verification failed:', signInError);
      return errorResponse(res, 400, 'Current password is incorrect');
    }

    // Update password
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password }
    );

    console.log('updateData', updateData)

    if (updateError) {
      logger.error('Password update error:', updateError);
      return errorResponse(res, 500, 'Failed to update password');
    }

    const { data: signInAfterUpdate, error: signInAfterUpdateError } = await supabase.auth.signInWithPassword({
      email: user.user.email,
      password // new password
    });

    if (signInAfterUpdateError) {
      return errorResponse(res, 500, 'Password updated but failed to re-login');
    }

    logger.info('Password updated successfully for user:', userId);
    successResponse(res, 200, 'Password updated successfully', {
      accessToken: signInAfterUpdate.session.access_token,
      refreshToken: signInAfterUpdate.session.refresh_token,
      user: signInAfterUpdate.user
    });



  } catch (error) {
    logger.error('Change password error:', error);
    errorResponse(res, 500, 'Password change failed', error);
  }
});
/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', validateRequest(passwordResetRequestSchema), async (req, res) => {
  try {
    const { email } = req.body;

    const supabaseAdmin = createClient(
 process.env.SUPABASE_URL || "https://ihmjwvwvixaxmfkgkejc.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlobWp3dnd2aXhheG1ma2drZWpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjU1NDgyNiwiZXhwIjoyMDYyMTMwODI2fQ.NMmETtsZU4N7aMAQa8bZU4ZeHzkUoPNTsMq0gddK2lg",
    );

    const { data: existingAuthUser, error: authUserError } = await supabaseAdmin.auth.admin.listUsers();

    const emailExists = existingAuthUser?.users?.some(user => user.email === email);

    if (!emailExists) {
      return errorResponse(res, 500, 'This email does not exist');
    }

    const { error, data } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: ``
    });

    logger.info('data', data)

    if (error) {
      logger.error('Password reset otp request error:', error);
      return errorResponse(res, 500, 'Failed to send password reset otp email');
    }

    successResponse(res, 200, 'Password reset otp email sent successfully', data.session);
  } catch (error) {
    logger.error('Forgot password error:', error);
    errorResponse(res, 500, 'Password reset otp request failed', error);
  }
});

/**
 * @route   POST /api/auth/verify-OTP
 * @desc    verify Otp for password reset
 * @access  Private
 */

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const { error, data } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    if (error) {
      console.error('OTP verification error:', error.message);
      return errorResponse(res, 500, 'Invalid or expired OTP', error);
    }

    console.log('data', data)

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data?.session?.user?.id)
      .single();

    if (profileError || !profile) {
      logger.error('Profile fetch error:', profileError?.message);
      return errorResponse(res, 500, 'Failed to fetch user profile');
    }

    // Check if user is active
    if (profile.status !== 'active') {
      return unauthorizedResponse(res, 'Account is not active');
    }

    logger.info(`User logged in: ${email}`);

    // Get user vehicle
    const { data: vehicleData, error: vehicleError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('owner_id', data?.session?.user?.id)
      .maybeSingle();


    if (vehicleError) {
      logger.error('Vehicle fetch error:', vehicleError);
      return errorResponse(res, 500, 'Failed to fetch user vehicle');
    }

    successResponse(res, 200, 'OTP verified successfully', {
      user: {
        id: data?.session?.user?.id,
        email: data?.session?.user?.email,
        firstName: profile.first_name,
        lastName: profile.family_name,
        userName: profile.user_name,
        role: profile.role,
        avatar: profile.avatar,
        status: profile.status
      },
      vehicle: {
        id: vehicleData?.id || null,
        brand: vehicleData?.brand || null,
        model: vehicleData?.model || null,
        type: vehicleData?.type || null,
        date: vehicleData?.registration_date || null
      },
      token: data.session?.access_token,
      refreshToken: data.session?.refresh_token

    });
  } catch (error) {
    console.error('Server error:', error.message);
    return errorResponse(res, 500, 'OTP verification error:', error);
  }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { password, access_token, email } = req.body;

    if (!access_token) {
      return badRequestResponse(res, 'Access token is required');
    }

    const decoded = jwt.decode(access_token);

    if (!decoded || typeof decoded !== 'object' || !decoded.sub) {
      return badRequestResponse(res, 'Invalid access token');
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL || "https://ihmjwvwvixaxmfkgkejc.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlobWp3dnd2aXhheG1ma2drZWpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjU1NDgyNiwiZXhwIjoyMDYyMTMwODI2fQ.NMmETtsZU4N7aMAQa8bZU4ZeHzkUoPNTsMq0gddK2lg",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const userId = decoded.sub;

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
    });

    if (error) {
      logger.error('Password reset error:', error);
      return badRequestResponse(res, 'Failed to reset password');
    }

    const { data: signInAfterUpdate, error: signInAfterUpdateError } = await supabase.auth.signInWithPassword({
      email,
      password // new password
    });

    if (signInAfterUpdateError) {
      return errorResponse(res, 500, 'Password updated but failed to re-login');
    }

    logger.info('Password reset successfully');
    successResponse(res, 200, 'Password reset successfully', {
      accessToken: signInAfterUpdate.session.access_token,
      refreshToken: signInAfterUpdate.session.refresh_token,
      user: signInAfterUpdate.user
    });
  } catch (error) {
    logger.error('Reset password error:', error.message);
    errorResponse(res, 500, 'Password reset failed');
  }
});

module.exports = router; 