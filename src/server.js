const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();
const Sentry = require("@sentry/node");
const http = require("http");
const { Server } = require("socket.io");


Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: 1.0,
});

// Import configurations
const { logger } = require('./config/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { notFoundHandler } = require('./middleware/notFoundHandler');


// Import routes
const authRoutes = require('./routes/auth');
const shopsRoutes = require('./routes/shops');
const logsRoutes = require('./routes/logs');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');
const dataRoutes = require('./routes/performanceData');
const dtcRoutes = require('./routes/dtc');
const vehicleRoutes = require('./routes/vehicle')
const healthRoutes = require('./routes/health');
const { supabase } = require('./config/supabase');

app.use(cors())

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// app.use(Sentry.Handlers.errorHandler());


const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
});


const vehicleConnections = new Map();

// Make io and vehicleConnections available to routes
app.set('io', io);
app.set('vehicleConnections', vehicleConnections);



io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // Handle vehicle subscription
  socket.on('subscribe-vehicle', (vehicleId) => {
    if (!vehicleId) {
      socket.emit('error', 'Vehicle ID is required');
      return;
    }

    // Join vehicle-specific room
    socket.join(`vehicle-${vehicleId}`);

    // Track connection for this vehicle
    if (!vehicleConnections.has(vehicleId)) {
      vehicleConnections.set(vehicleId, new Set());
    }
    vehicleConnections.get(vehicleId).add(socket.id);

    logger.info(`Client ${socket.id} subscribed to vehicle ${vehicleId}`);
    socket.emit('subscribed', { vehicleId, message: 'Successfully subscribed to vehicle updates' });
  });

  // Handle unsubscribe from vehicle
  socket.on('unsubscribe-vehicle', (vehicleId) => {
    if (vehicleId) {
      socket.leave(`vehicle-${vehicleId}`);

      const connections = vehicleConnections.get(vehicleId);
      if (connections) {
        connections.delete(socket.id);
        if (connections.size === 0) {
          vehicleConnections.delete(vehicleId);
        }
      }

      logger.info(`Client ${socket.id} unsubscribed from vehicle ${vehicleId}`);
      socket.emit('unsubscribed', { vehicleId });
    }
  });

  // Handle performance data from frontend
  socket.on('performance-data', async (data) => {
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
      } = data;

      // Validate required fields
      if (!vehicle_id) {
        socket.emit('data-error', { message: 'Vehicle ID is required' });
        return;
      }

      // Prepare data for insertion
      const performanceData = {
        vehicle_id,
        rpm: rpm || null,
        speed: speed || null,
        batteryVoltage: batteryVoltage || null,
        fuelTankLevel: fuelTankLevel || null,
        intakeAirTemp: intakeAirTemp || null,
        coolantTemp: coolantTemp || null,
        engineTemp: engineTemp || null,
        fuelConsumption: fuelConsumption || null,
        timestamp: new Date().toISOString()
      };

      // Insert data into Supabase
      const { data: insertedData, error } = await supabase
        .from('vehicle_performance_data')
        .insert([performanceData])
        .select()
        .single();

      if (error) {
        logger.error('Database error:', error);
        socket.emit('data-error', { message: 'Failed to store performance data' });
        return;
      }

      logger.info(`Performance data stored for vehicle: ${vehicle_id} via Socket.io`);

      // Acknowledge successful storage to the sender
      socket.emit('data-stored', {
        success: true,
        vehicleId: vehicle_id,
        timestamp: performanceData.timestamp
      });

    } catch (error) {
      logger.error('Socket performance data error:', error.message);
      socket.emit('data-error', { message: 'Failed to process performance data' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);

    // Remove from all vehicle connections
    vehicleConnections.forEach((connections, vehicleId) => {
      if (connections.has(socket.id)) {
        connections.delete(socket.id);
        if (connections.size === 0) {
          vehicleConnections.delete(vehicleId);
        }
      }
    });
  });

  // Handle errors
  socket.on('error', (error) => {
    logger.error(`Socket error for ${socket.id}:`, error);
  });
});


// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/shops', shopsRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/dtc', dtcRoutes);
app.use('/api/vehicle', vehicleRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Health check available at: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

module.exports = app; 