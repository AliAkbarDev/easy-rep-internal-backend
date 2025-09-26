const express = require('express');
const { supabase } = require('../config/supabase');
const { logger } = require('../config/logger');
const { authenticateToken } = require('../middleware/auth');
const {
  successResponse,
  errorResponse,
} = require('../utils/response');

const router = express.Router();

/**
 * @route   POST /api/logs
 * @desc    Submit new log
 * @access  Private
 */
router.post("/", async (req, res) => {
  try {
    let logsArray = [];

    if (Array.isArray(req.body)) {
      logsArray = req.body;
    } else if (typeof req.body === "object" && req.body !== null) {
      logsArray = [req.body];
    } else {
      return errorResponse(res, 400, "Invalid payload format");
    }

    const formattedLogs = logsArray.map(log => ({
      type: log.type,
      parse_response: JSON.stringify(
        log.parse_response ?? log.parseResponseData ?? null
      ),
      raw_response: log.raw_response ?? log.response,
      pid: log.pid ?? log.p_id,
      key: log.command?.key,
      vehicle: log.vehicle,
      parser: log.command?.parser ?? log.command?.source,
      user_id: log.user_id ?? log.userId,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("logs")
      .insert(formattedLogs)
      .select();

    if (insertError) {
      logger.error("Insert log error:", insertError);
      return errorResponse(res, 400, "Failed to submit logs");
    }

    successResponse(res, 200, "Logs submitted successfully", inserted);
  } catch (error) {
    logger.error("Submit log error:", error);
    errorResponse(res, 500, "Failed to submit logs");
  }
});




/**
 * @route   GET /api/logs
 * @desc    Get logs (with optional filters)
 * @access  Private
 */
router.get('/alllogs', async (req, res) => {
  try {
    const { errorType, pid, limit = 20, offset = 0 } = req.query;

    let query = supabase
      .from('logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // optional filters
    if (errorType) {
      query = query.eq('error_type', errorType);
    }
    if (pid) {
      query = query.eq('pid', pid);
    }

    const { data: logs, error } = await query;

    if (error) {
      logger.error('Fetch logs error:', error);
      return errorResponse(res, 400, 'Failed to fetch logs');
    }

    successResponse(res, 200, 'Logs fetched successfully', logs);
  } catch (error) {
    logger.error('Get logs error:', error);
    errorResponse(res, 500, 'Failed to fetch logs');
  }
});

module.exports = router; 