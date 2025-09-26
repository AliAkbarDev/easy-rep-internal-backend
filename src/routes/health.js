const express = require('express');
const { supabase } = require('../config/supabase');
const { logger } = require('../config/logger');
const { successResponse, errorResponse } = require('../utils/response');

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/', (req, res) => {
  try {
    successResponse(res, 200, 'Service is healthy running on amazon', {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });

  } catch (error) {
    logger.error('Health check failed:', err);
    errorResponse(res, 500, 'Server health check failed');
  }
});

/**
 * @route   GET /api/health/detailed
 * @desc    Detailed health check with database connectivity
 * @access  Public
 */
router.get('/detailed', async (req, res) => {
  try {
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: 'unknown',
        memory: 'unknown',
        disk: 'unknown'
      }
    };

    // Check database connectivity
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      health.checks.database = error ? 'error' : 'ok';
      if (error) {
        logger.warn('Database health check failed:', error.message);
      }
    } catch (dbError) {
      health.checks.database = 'error';
      logger.error('Database health check error:', dbError.message);
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    health.checks.memory = 'ok';
    health.memory = memUsageMB;

    // Determine overall status
    const hasErrors = Object.values(health.checks).some(check => check === 'error');
    health.status = hasErrors ? 'DEGRADED' : 'OK';

    const statusCode = hasErrors ? 503 : 200;
    successResponse(res, statusCode, 'Health check completed', health);

  } catch (error) {
    logger.error('Health check error:', error.message);
    errorResponse(res, 500, 'Health check failed');
  }
});

/**
 * @route   GET /api/health/ready
 * @desc    Readiness probe for Kubernetes
 * @access  Public
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if application is ready to serve requests
    const { data, error } = await supabase.from('users').select('count').limit(1);

    if (error) {
      logger.warn('Readiness check failed:', error.message);
      return errorResponse(res, 503, 'Service not ready');
    }

    successResponse(res, 200, 'Service is ready');
  } catch (error) {
    logger.error('Readiness check error:', error.message);
    errorResponse(res, 503, 'Service not ready');
  }
});

/**
 * @route   GET /api/health/live
 * @desc    Liveness probe for Kubernetes
 * @access  Public
 */
router.get('/live', (req, res) => {
  // Simple liveness check - if we can respond, we're alive
  successResponse(res, 200, 'Service is alive');
});

module.exports = router; 