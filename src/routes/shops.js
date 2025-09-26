const express = require('express');
const { logger } = require('../config/logger');
const {
  successResponse,
  errorResponse,
} = require('../utils/response');
const { default: axios } = require('axios');

const router = express.Router();

/**
 * @route   POST /api/shops/nearby
 * @desc    Fetch nearby car repair shops using Google Places API
 * @access  Private
 */
router.post('/nearby', async (req, res) => {
  try {
    const { params } = req.body; 

    if (!params) {
      return errorResponse(res, 400, 'Params string is required');
    }

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
    const response = await axios.get(url);
    const data = response.data;

    successResponse(res, 200, 'Nearby repair shops fetched successfully', data);
  } catch (error) {
    logger.error('Nearby shop fetch error:', error.message || error);
    errorResponse(res, 500, 'Failed to fetch nearby shops');
  }
});


module.exports = router;