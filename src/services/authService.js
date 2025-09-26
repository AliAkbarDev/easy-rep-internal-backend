const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const { logger } = require('../config/logger');

class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Object} - Registration result
   */
  async registerUser(userData) {
    try {
      const { email, password, firstName, lastName, role = 'user' } = userData;

      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists'
        };
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: role
          }
        }
      });

      if (authError) {
        logger.error('Auth signup error:', authError.message);
        return {
          success: false,
          message: authError.message
        };
      }

      // Create user profile in database
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            email,
            first_name: firstName,
            last_name: lastName,
            role: role,
            status: 'active',
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (profileError) {
        logger.error('Profile creation error:', profileError.message);
        // Clean up auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        return {
          success: false,
          message: 'Failed to create user profile'
        };
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: authData.user.id, 
          email: authData.user.email,
          role: role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      logger.info(`New user registered: ${email}`);

      return {
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: authData.user.id,
            email: authData.user.email,
            firstName,
            lastName,
            role: role
          },
          token
        }
      };

    } catch (error) {
      logger.error('Registration error:', error.message);
      return {
        success: false,
        message: 'Registration failed'
      };
    }
  }

  /**
   * Login user
   * @param {Object} credentials - User credentials
   * @returns {Object} - Login result
   */
  async loginUser(credentials) {
    try {
      const { email, password } = credentials;

      // Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        logger.warn(`Login failed for email: ${email}`, authError.message);
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        logger.error('Profile fetch error:', profileError?.message);
        return {
          success: false,
          message: 'Failed to fetch user profile'
        };
      }

      // Check if user is active
      if (profile.status !== 'active') {
        return {
          success: false,
          message: 'Account is not active'
        };
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: authData.user.id, 
          email: authData.user.email,
          role: profile.role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      logger.info(`User logged in: ${email}`);

      return {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: authData.user.id,
            email: authData.user.email,
            firstName: profile.first_name,
            lastName: profile.last_name,
            role: profile.role,
            status: profile.status
          },
          token
        }
      };

    } catch (error) {
      logger.error('Login error:', error.message);
      return {
        success: false,
        message: 'Login failed'
      };
    }
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Object} - Verification result
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return {
          success: false,
          message: 'Invalid or expired token'
        };
      }

      return {
        success: true,
        data: {
          user,
          decoded
        }
      };

    } catch (error) {
      logger.error('Token verification error:', error.message);
      return {
        success: false,
        message: 'Token verification failed'
      };
    }
  }

  /**
   * Refresh JWT token
   * @param {string} token - Current JWT token
   * @returns {Object} - Refresh result
   */
  async refreshToken(token) {
    try {
      // Verify current token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get fresh user data
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return {
          success: false,
          message: 'Invalid refresh token'
        };
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return {
          success: false,
          message: 'Failed to fetch user profile'
        };
      }

      // Generate new token
      const newToken = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          role: profile.role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      return {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newToken
        }
      };

    } catch (error) {
      logger.error('Token refresh error:', error.message);
      return {
        success: false,
        message: 'Token refresh failed'
      };
    }
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Object} - Reset request result
   */
  async requestPasswordReset(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/reset-password`
      });

      if (error) {
        logger.error('Password reset request error:', error.message);
        return {
          success: false,
          message: 'Failed to send password reset email'
        };
      }

      return {
        success: true,
        message: 'Password reset email sent successfully'
      };

    } catch (error) {
      logger.error('Password reset request error:', error.message);
      return {
        success: false,
        message: 'Password reset request failed'
      };
    }
  }

  /**
   * Reset password
   * @param {string} token - Reset token
   * @param {string} password - New password
   * @returns {Object} - Reset result
   */
  async resetPassword(token, password) {
    try {
      // Update password in Supabase
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        logger.error('Password reset error:', error.message);
        return {
          success: false,
          message: 'Failed to reset password'
        };
      }

      return {
        success: true,
        message: 'Password reset successfully'
      };

    } catch (error) {
      logger.error('Password reset error:', error.message);
      return {
        success: false,
        message: 'Password reset failed'
      };
    }
  }
}

module.exports = new AuthService(); 