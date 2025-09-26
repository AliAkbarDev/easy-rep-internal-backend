const { createClient } = require('@supabase/supabase-js');
const { logger } = require('./logger');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || "https://ihmjwvwvixaxmfkgkejc.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlobWp3dnd2aXhheG1ma2drZWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NTQ4MjYsImV4cCI6MjA2MjEzMDgyNn0.74kp5jSGn8-3Gg1nV6ZtyZuGz-nyChPgo6FfruocTsg";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlobWp3dnd2aXhheG1ma2drZWpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjU1NDgyNiwiZXhwIjoyMDYyMTMwODI2fQ.NMmETtsZU4N7aMAQa8bZU4ZeHzkUoPNTsMq0gddK2lg";

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('Missing Supabase configuration. Please check your environment variables.');
  process.exit(1);
}

// Create Supabase client for regular operations
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  }
});

// Create Supabase client with service role for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  }
});

// Test connection
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      logger.warn('Supabase connection test failed:', error.message);
    } else {
      logger.info('Supabase connection successful');
    }
  } catch (error) {
    logger.error('Supabase connection error:', error.message);
  }
};

// Initialize connection test
testConnection();

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection
}; 