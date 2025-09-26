// Jest setup file
require('dotenv').config({ path: '.env.test' });

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  // Generate test user data
  generateTestUser: (overrides = {}) => ({
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    ...overrides,
  }),

  // Generate test file data
  generateTestFile: (overrides = {}) => ({
    originalName: 'test-file.jpg',
    fileName: `test-${Date.now()}.jpg`,
    filePath: 'test/folder/test-file.jpg',
    fileUrl: 'https://example.com/test-file.jpg',
    fileSize: 1024,
    mimeType: 'image/jpeg',
    folder: 'test',
    ...overrides,
  }),

  // Wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Clean up test data
  cleanupTestData: async (supabase) => {
    try {
      await supabase.from('linkedin_shares').delete().like('content', 'test%');
      await supabase.from('linkedin_connections').delete().like('email', 'test%');
      await supabase.from('files').delete().like('original_name', 'test%');
      await supabase.from('profiles').delete().like('email', 'test%');
    } catch (error) {
      console.warn('Cleanup error:', error.message);
    }
  },
};

// Mock Supabase for tests
jest.mock('../src/config/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      range: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
        remove: jest.fn(),
      })),
    },
    rpc: jest.fn(),
  },
  supabaseAdmin: {
    rpc: jest.fn(),
  },
}));

// Mock logger for tests
jest.mock('../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions in tests
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
}); 