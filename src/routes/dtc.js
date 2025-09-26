const express = require('express');
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
  createDTCSchema,
  updateDTCSchema,
  dtcIdSchema,
  getDTCsQuerySchema
} = require('../validators/dtc');

const router = express.Router();

/**
 * @route   POST /api/dtcs
 * @desc    Add a new DTC
 * @access  Private
 */
router.post('/', authenticateToken, validateRequest(createDTCSchema), async (req, res) => {
  try {
    const {
      vehicle_id,
      dtc_code,
      description,
      impact_level,
      status,
      occurred_at
    } = req.body;

    // Check if DTC with same code already exists for this vehicle
    const { data: existingDTC } = await supabase
      .from('vehicle_dtcs')
      .select('id')
      .eq('vehicle_id', vehicle_id)
      .eq('dtc_code', dtc_code)
      .eq('status', 'active')
      .single();

    if (existingDTC) {
      return errorResponse(res, 400, 'Active DTC with this code already exists for this vehicle');
    }

    // Prepare data for insertion
    const dtcData = {
      vehicle_id,
      dtc_code,
      description,
      impact_level,
      status: status || 'active',
      occurred_at: occurred_at || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert DTC into Supabase
    const { data, error } = await supabase
      .from('vehicle_dtcs')
      .insert([dtcData])
      .select()
      .single();

    if (error) {
      logger.error('Database error:', error);
      return errorResponse(res, 500, 'Failed to add DTC');
    }

    logger.info(`DTC added: ${dtc_code} for vehicle: ${vehicle_id}`);
    createdResponse(res, 'DTC added successfully', data);

  } catch (error) {
    logger.error('Add DTC error:', error.message);
    errorResponse(res, 500, 'Failed to add DTC');
  }
});

/**
 * @route   PUT /api/dtcs/:id
 * @desc    Update DTC status or details
 * @access  Private
 */
router.put('/:id', authenticateToken, validateRequest(dtcIdSchema, 'params'), validateRequest(updateDTCSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Check if DTC exists
    const { data: existingDTC, error: fetchError } = await supabase
      .from('vehicle_dtcs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingDTC) {
      return notFoundResponse(res, 'DTC not found');
    }

    // Add updated timestamp
    updateData.updated_at = new Date().toISOString();

    // If resolving the DTC, set resolved_at timestamp
    if (updateData.status === 'resolved' && existingDTC.status !== 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }

    // Update DTC in Supabase
    const { data, error } = await supabase
      .from('vehicle_dtcs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Database error:', error.message);
      return errorResponse(res, 500, 'Failed to update DTC');
    }

    logger.info(`DTC updated: ${id} - Status: ${updateData.status || existingDTC.status}`);
    successResponse(res, 200, 'DTC updated successfully', data);

  } catch (error) {
    logger.error('Update DTC error:', error.message);
    errorResponse(res, 500, 'Failed to update DTC');
  }
});

/**
 * @route   GET /api/dtcs/:id
 * @desc    Get DTC by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, validateRequest(dtcIdSchema, 'params'), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: dtc, error } = await supabase
      .from('vehicle_dtcs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !dtc) {
      return notFoundResponse(res, 'DTC not found');
    }

    successResponse(res, 200, 'DTC retrieved successfully', dtc);

  } catch (error) {
    logger.error('Get DTC by ID error:', error.message);
    errorResponse(res, 500, 'Failed to retrieve DTC');
  }
});

/**
 * @route   GET /api/dtcs/vehicle/:vehicleId/active
 * @desc    Get active DTCs for a specific vehicle
 * @access  Private
 */
router.get('/vehicle/:vehicleId/active', authenticateToken, async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const { data, error } = await supabase
      .from('vehicle_dtcs')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('status', 'active')
      .order('impact_level', { ascending: false })
      .order('occurred_at', { ascending: false });

    if (error) {
      logger.error('Database error:', error.message);
      return errorResponse(res, 500, 'Failed to retrieve active DTCs');
    }

    const dtcCounts = {
      high: data.filter(dtc => dtc.impact_level === 'high').length,
      mid: data.filter(dtc => dtc.impact_level === 'mid').length,
      low: data.filter(dtc => dtc.impact_level === 'low').length
    };

    successResponse(res, 200, 'Active DTCs retrieved successfully', {
      dtcs: data,
      total_active: data.length,
      impact_breakdown: dtcCounts
    });

  } catch (error) {
    logger.error('Get active DTCs error:', error.message);
    errorResponse(res, 500, 'Failed to retrieve active DTCs');
  }
});

/**
 * @route   GET /api/dtcs/vehicle/:vehicleId/resolved
 * @desc    Get resolved DTCs for a specific vehicle
 * @access  Private
 */
router.get('/vehicle/:vehicleId/resolved', authenticateToken, async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const { data, error } = await supabase
      .from('vehicle_dtcs')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('status', 'resolved')
      .order('resolved_at', { ascending: false })
      .limit(50); // Limit to last 50 resolved DTCs

    if (error) {
      logger.error('Database error:', error.message);
      return errorResponse(res, 500, 'Failed to retrieve resolved DTCs');
    }

    successResponse(res, 200, 'Resolved DTCs retrieved successfully', {
      dtcs: data,
      total_resolved: data.length
    });

  } catch (error) {
    logger.error('Get resolved DTCs error:', error.message);
    errorResponse(res, 500, 'Failed to retrieve resolved DTCs');
  }
});


/**
 * @route   GET /api/dtcs
 * @desc    Get DTCs with filtering options
 * @access  Private
 */
router.get('/', authenticateToken, validateRequest(getDTCsQuerySchema, 'query'), async (req, res) => {
  try {
    const {
      vehicle_id,
      status,
      impact_level,
      from_date,
      to_date,
      page = 1,
      limit = 10,
      sort_by = 'occurred_at',
      sort_order = 'desc'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build query with filters
    let query = supabase
      .from('vehicle_dtcs')
      .select('*', { count: 'exact' });

    if (vehicle_id) {
      query = query.eq('vehicle_id', vehicle_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (impact_level) {
      query = query.eq('impact_level', impact_level);
    }

    if (from_date) {
      query = query.gte('occurred_at', from_date);
    }

    if (to_date) {
      query = query.lte('occurred_at', to_date);
    }

    // Apply sorting and pagination
    query = query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(offset, offset + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Database error:', error.message);
      return errorResponse(res, 500, 'Failed to retrieve DTCs');
    }

    paginatedResponse(res, 200, 'DTCs retrieved successfully', data, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      totalPages: Math.ceil(count / parseInt(limit))
    });

  } catch (error) {
    logger.error('Get DTCs error:', error.message);
    errorResponse(res, 500, 'Failed to retrieve DTCs');
  }
});

module.exports = router;