const express = require('express');
const fs = require('fs');
const path = require('path');
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
    createVehicleSchema,
    updateVehicleSchema,
    vehicleIdSchema,
} = require('../validators/vehicle');

const router = express.Router();

/**
 * @route   POST /api/vehicles
 * @desc    Add a new vehicle
 * @access  Private
 */
router.post('/', authenticateToken, validateRequest(createVehicleSchema), async (req, res) => {
    try {
        const {
            brand,
            model,
            registration_date,
            type,
            vin,
            owner_id,
        } = req.body;

        console.log('req', req?.body)

        // Check if vehicle with same VIN already exists
        const { data: existingVehicle } = await supabase
            .from('vehicles')
            .select('id')
            .eq('vin', vin)
            .single();

        if (existingVehicle) {
            return errorResponse(res, 400, 'Vehicle with this VIN already exists');
        }

        // Prepare data for insertion
        const vehicleData = {
            brand,
            model,
            registration_date,
            type,
            vin,
            owner_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Insert vehicle into Supabase
        const { data, error } = await supabase
            .from('vehicles')
            .insert([vehicleData])
            .select()
            .single();

        if (error) {
            logger.error('Database error:', error);
            return errorResponse(res, 500, 'Failed to add vehicle');
        }

        logger.info(`Vehicle added: ${brand} ${model} (${registration_date}) - VIN: ${vin}`);
        createdResponse(res, 'Vehicle added successfully', data);

    } catch (error) {
        logger.error('Add vehicle error:', error);
        errorResponse(res, 500, 'Failed to add vehicle');
    }
});

/**
 * @route   PUT /api/vehicles/:id
 * @desc    Update vehicle details
 * @access  Private
 */
router.put('/:id', authenticateToken, validateRequest(vehicleIdSchema, 'params'), validateRequest(updateVehicleSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        // Check if vehicle exists
        const { data: existingVehicle, error: fetchError } = await supabase
            .from('vehicles')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existingVehicle) {
            return notFoundResponse(res, 'Vehicle not found');
        }

        // Check VIN uniqueness if being updated
        if (updateData.vin && updateData.vin !== existingVehicle.vin) {
            const { data: vinExists } = await supabase
                .from('vehicles')
                .select('id')
                .eq('vin', updateData.vin)
                .neq('id', id)
                .single();

            if (vinExists) {
                return errorResponse(res, 400, 'Vehicle with this VIN already exists');
            }
        }

        // Add updated timestamp
        updateData.updated_at = new Date().toISOString();

        // Update vehicle in Supabase
        const { data, error } = await supabase
            .from('vehicles')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            logger.error('Database error:', error.message);
            return errorResponse(res, 500, 'Failed to update vehicle');
        }

        logger.info(`Vehicle updated: ${id} - ${updateData.brand || existingVehicle.brand} ${updateData.model || existingVehicle.model}`);
        successResponse(res, 200, 'Vehicle updated successfully', data);

    } catch (error) {
        logger.error('Update vehicle error:', error.message);
        errorResponse(res, 500, 'Failed to update vehicle');
    }
});

/**
 * @route   DELETE /api/vehicles/:id
 * @desc    Delete vehicle 
 * @access  Private
 */
router.delete('/:id', authenticateToken, validateRequest(vehicleIdSchema, 'params'), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if vehicle exists
        const { data: existingVehicle, error: fetchError } = await supabase
            .from('vehicles')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existingVehicle) {
            return notFoundResponse(res, 'Vehicle not found');
        }

        // Check if vehicle has active DTCs
        const { data: activeDTCs } = await supabase
            .from('vehicle_dtcs')
            .select('id')
            .eq('vehicle_id', id)
            .eq('status', 'active');

        if (activeDTCs && activeDTCs.length > 0) {
            return errorResponse(res, 400, 'Cannot delete vehicle with active DTCs. Please resolve all DTCs first.');
        }

        // Permanently delete vehicle
        const { error: deleteError } = await supabase
            .from('vehicles')
            .delete()
            .eq('id', id);

        if (deleteError) {
            logger.error('Database error:', deleteError.message);
            return errorResponse(res, 500, 'Failed to delete vehicle');
        }

        logger.info(`Vehicle permanently deleted: ${id} - ${existingVehicle.brand} ${existingVehicle.model}`);
        successResponse(res, 200, 'Vehicle deleted successfully');

    } catch (error) {
        logger.error('Delete vehicle error:', error.message);
        errorResponse(res, 500, 'Failed to delete vehicle');
    }
});

/**
 * @route   GET /api/vehicles/:id
 * @desc    Get vehicles data
 * @access  Private
 */
router.get('/brands', async (req, res) => {
    const filePath = path.join(__dirname, '../../data/automobiles.json');
    const rawData = fs.readFileSync(filePath);
    const cars = JSON.parse(rawData);

    const parsedCars = cars.map(car => {
        const brand = car.name?.split(' ')[0] || 'Unknown';

        const modelMatch = car.name?.match(/^.*? (.*?) \d{4}/);
        const model = modelMatch ? modelMatch[1] : 'Unknown';

        return {
            brand,
            model,
        };
    });

    res.json(parsedCars);
});


/**
 * @route   GET /api/vehicles/:id
 * @desc    Get vehicle by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, validateRequest(vehicleIdSchema, 'params'), async (req, res) => {
    try {
        const { id } = req.params;

        const { data: vehicle, error } = await supabase
            .from('vehicles')
            .select('*')
            .eq('id', id)
            .single();


        if (error || !vehicle) {
            return notFoundResponse(res, 'Vehicle not found');
        }

        // Get vehicle statistics
        const { data: dtcStats } = await supabase
            .from('vehicle_dtcs')
            .select('status, impact_level')
            .eq('vehicle_id', id);

        const stats = {
            total_dtcs: dtcStats?.length || 0,
            active_dtcs: dtcStats?.filter(dtc => dtc.status === 'active').length || 0,
            resolved_dtcs: dtcStats?.filter(dtc => dtc.status === 'resolved').length || 0,
            high_impact: dtcStats?.filter(dtc => dtc.impact_level === 'high' && dtc.status === 'active').length || 0
        };

        successResponse(res, 200, 'Vehicle retrieved successfully', {
            ...vehicle,
            statistics: stats
        });

    } catch (error) {
        logger.error('Get vehicle by ID error:', error.message);
        errorResponse(res, 500, 'Failed to retrieve vehicle');
    }
});

/**
 * @route   GET /api/vehicles/:id
 * @desc    Get vehicle by OwnerID
 * @access  Private
 */
router.get('/owner/:id', authenticateToken, validateRequest(vehicleIdSchema, 'params'), async (req, res) => {
    try {
        const { id } = req.params;

        const { data: vehicle, error } = await supabase
            .from('vehicles')
            .select('*')
            .eq('owner_id', id)
            .single();


        if (error || !vehicle) {
            console.log('error',error)
            return notFoundResponse(res, 'Vehicle not found');
        }

        // Get vehicle statistics
        const { data: dtcStats } = await supabase
            .from('vehicle_dtcs')
            .select('status, impact_level')
            .eq('vehicle_id', id);

        const stats = {
            total_dtcs: dtcStats?.length || 0,
            active_dtcs: dtcStats?.filter(dtc => dtc.status === 'active').length || 0,
            resolved_dtcs: dtcStats?.filter(dtc => dtc.status === 'resolved').length || 0,
            high_impact: dtcStats?.filter(dtc => dtc.impact_level === 'high' && dtc.status === 'active').length || 0
        };

        successResponse(res, 200, 'Vehicle retrieved successfully', {
            ...vehicle,
            statistics: stats
        });

    } catch (error) {
        logger.error('Get vehicle by ID error:', error.message);
        errorResponse(res, 500, 'Failed to retrieve vehicle');
    }
});

module.exports = router;