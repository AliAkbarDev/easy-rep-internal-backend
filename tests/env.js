// Test environment setup
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
process.env.SUPABASE_URL = 'https://ihmjwvwvixaxmfkgkejc.supabase.co';
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlobWp3dnd2aXhheG1ma2drZWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NTQ4MjYsImV4cCI6MjA2MjEzMDgyNn0.74kp5jSGn8-3Gg1nV6ZtyZuGz-nyChPgo6FfruocTsg';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlobWp3dnd2aXhheG1ma2drZWpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjU1NDgyNiwiZXhwIjoyMDYyMTMwODI2fQ.NMmETtsZU4N7aMAQa8bZU4ZeHzkUoPNTsMq0gddK2lg';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.MAX_FILE_SIZE = '5242880';
process.env.UPLOAD_PATH = './test-uploads';
process.env.LOG_LEVEL = 'error';
process.env.LOG_FILE = './test-logs/test.log';
process.env.LINKEDIN_CLIENT_ID = 'test-linkedin-client-id';
process.env.LINKEDIN_CLIENT_SECRET = 'test-linkedin-client-secret';
process.env.LINKEDIN_REDIRECT_URI = 'http://localhost:3001/auth/linkedin/callback';
process.env.FRONTEND_URL = 'http://localhost:3000'; 