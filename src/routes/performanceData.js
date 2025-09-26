const express = require('express');
const WebSocket = require('ws');
const { supabase } = require('../config/supabase');
const { logger } = require('../config/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateRequest } = require('../utils/validation');
const {
  successResponse,
  errorResponse,
  createdResponse,
  notFoundResponse,
  paginatedResponse
} = require('../utils/response');
const {
  createPerformanceDataSchema,
  createBulkPerformanceDataSchema,
  aggregatedDataQuerySchema,
  performanceDataIdSchema,
} = require('../validators/performanceData');
const { removeNulls } = require('../utils/utils');

const router = express.Router();

/**
 * @route   POST /api/performance-data
 * @desc    Store performance data
 * @access  Private
 */
router.post('/', validateRequest(createPerformanceDataSchema), async (req, res) => {
  try {
    const {
      vehicle_id,
      rpm,
      speed,
      batteryVoltage,
      fuelTankLevel,
      intakeAirTemp,
      coolantTemp,
      engineTemp,
      fuelConsumption,
    } = req.body;

    const vehicleConnections = req.app.get('vehicleConnections');

    // Prepare data for insertion
    const performanceData = {
      vehicle_id,
      rpm,
      speed,
      batteryVoltage,
      fuelTankLevel,
      intakeAirTemp,
      coolantTemp,
      engineTemp,
      fuelConsumption,
    };

    // Insert data into Supabase
    const { data, error } = await supabase
      .from('vehicle_performance_data')
      .insert([performanceData])
      .select()
      .single();

    if (error) {
      logger.error('Database error:', error);
      return errorResponse(res, 500, 'Failed to store performance data');
    }

    logger.info(`Performance data stored for vehicle: ${vehicle_id}`);
    createdResponse(res, 'Performance data stored successfully', data); 


    const connections = vehicleConnections.get(vehicle_id);
    if (connections && connections.size > 0) {
      const message = JSON.stringify({
        timestamp: new Date().toISOString(),
        ...performanceData,
      });

      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }

  } catch (error) {
    logger.error('Store performance data error:', error.message);
    errorResponse(res, 500, 'Failed to store performance data');
  }
});

/**
 * @route   GET /api/performance-data/aggregated
 * @desc    Get aggregated data by time periods (for charts)
 * @access  Private
 */
router.get('/aggregated', authenticateToken, validateRequest(aggregatedDataQuerySchema, 'query'), async (req, res) => {
  try {
    const {
      vehicle_id,
      from_date,
      to_date,
      group_by,
      metrics = ['rpm', 'speed', 'temperature'],
      aggregation_type = 'all'
    } = req.query;

    // Build aggregation query based on group_by parameter
    let dateFormat;
    switch (group_by) {
      case 'hour':
        dateFormat = 'YYYY-MM-DD HH24:00:00';
        break;
      case 'day':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'week':
        dateFormat = 'YYYY-"W"WW';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
    }

    // Build the aggregation query
    let query = `
      SELECT 
        to_char(timestamp, '${dateFormat}') as period,
        AVG(rpm)::INTEGER as avg_rpm,
        AVG(speed_kmh)::NUMERIC(5,2) as avg_speed,
        AVG(coolant_temperature_celsius)::NUMERIC(5,2) as avg_temperature,
        MAX(rpm) as max_rpm,
        MAX(speed_kmh) as max_speed,
        MAX(coolant_temperature_celsius) as max_temperature,
        MIN(rpm) as min_rpm,
        MIN(speed_kmh) as min_speed,
        MIN(coolant_temperature_celsius) as min_temperature,
        COUNT(*) as data_points
      FROM vehicle_performance_data
      WHERE 1=1
    `;

    const queryParams = [];
    let paramIndex = 1;

    if (vehicle_id) {
      query += ` AND vehicle_id = $${paramIndex}`;
      queryParams.push(vehicle_id);
      paramIndex++;
    }

    if (from_date) {
      query += ` AND timestamp >= $${paramIndex}`;
      queryParams.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      query += ` AND timestamp <= $${paramIndex}`;
      queryParams.push(to_date);
      paramIndex++;
    }

    query += ` GROUP BY period ORDER BY period`;

    // Execute raw SQL query
    const { data, error } = await supabase.rpc('execute_sql', {
      query: query,
      params: queryParams
    });

    if (error) {
      logger.error('Database error:', error.message);
      return errorResponse(res, 500, 'Failed to retrieve aggregated data');
    }

    successResponse(res, 200, 'Aggregated data retrieved successfully', {
      aggregated_data: data || [],
      group_by: group_by,
      metrics: metrics,
      aggregation_type: aggregation_type,
      total_periods: data?.length || 0
    });

  } catch (error) {
    logger.error('Get aggregated data error:', error.message);
    errorResponse(res, 500, 'Failed to retrieve aggregated data');
  }
});


/**
 * @route   GET /api/performance-data/:id
 * @desc    Get performance data by ID with date filtering
 * @access  Private
 */
router.get('/:id', authenticateToken, validateRequest(performanceDataIdSchema, 'params'), async (req, res) => {
  try {
    const { id } = req.params;
    const { filterType, date, fromDate, toDate } = req.query;

    // Build the base query
    let query = supabase
      .from('vehicle_performance_data')
      .select('*')
      .eq('vehicle_id', id)
      .order('timestamp', { ascending: true });

    // Apply date filtering based on filterType
    if (filterType === 'day') {
      // Filter for specific day
      const targetDate = date || new Date().toISOString().split('T')[0];
      const startOfDay = `${targetDate}T00:00:00.000Z`;
      const endOfDay = `${targetDate}T23:59:59.999Z`;

      query = query
        .gte('timestamp', startOfDay)
        .lte('timestamp', endOfDay);

    } else if (filterType === 'weekend') {
      // Filter for specific week
      let startDate, endDate;

      if (date) {
        // If specific date is provided, calculate week containing that date
        const targetDate = new Date(date);
        const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

        // Calculate start of week (Monday)
        startDate = new Date(targetDate);
        startDate.setDate(targetDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        startDate.setHours(0, 0, 0, 0);

        // Calculate end of week (Sunday)
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else {
        // Default to current week
        const now = new Date();
        const dayOfWeek = now.getDay();

        startDate = new Date(now);
        startDate.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      }

      query = query
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

    } else if (filterType === 'range' || filterType === 'week') {
      // Filter for date range
      if (!fromDate || !toDate) {
        return errorResponse(res, 400, 'fromDate and toDate are required for range filtering');
      }

      const startOfFromDate = `${fromDate}T00:00:00.000Z`;
      const endOfToDate = `${toDate}T23:59:59.999Z`;

      query = query
        .gte('timestamp', startOfFromDate)
        .lte('timestamp', endOfToDate);

    } else {
      // Default: return today's data
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = `${today}T00:00:00.000Z`;
      const endOfDay = `${today}T23:59:59.999Z`;

      query = query
        .gte('timestamp', startOfDay)
        .lte('timestamp', endOfDay);
    }

    const { data: performanceData, error } = await query;

    if (error) {
      logger.error('Database query error:', error.message);
      return errorResponse(res, 500, 'Failed to retrieve performance data');
    }

    if (!performanceData) {
      return notFoundResponse(res, 'Performance data not found');
    }

    const filteredData = performanceData.map(record => removeNulls(record));

    // Add metadata about the query
    const metadata = {
      filterType: filterType || 'day',
      totalRecords: filteredData.length,
      dateRange: {
        from: req.query.fromDate || req.query.date || new Date().toISOString().split('T')[0],
        to: req.query.toDate || req.query.date || new Date().toISOString().split('T')[0]
      }
    };

    successResponse(res, 200, 'Performance data retrieved successfully', filteredData, metadata);

  } catch (error) {
    logger.error('Get performance data by ID error:', error.message);
    errorResponse(res, 500, 'Failed to retrieve performance data');
  }
});


module.exports = router;



