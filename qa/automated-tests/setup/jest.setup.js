/**
 * Jest setup file for automated tests
 * Configures test environment and global utilities
 */

// Mock Next.js specific modules
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/mock-path',
}));

// Mock Firebase
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'mock-api-key';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'mock-auth-domain';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mock-project-id';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Global test utilities
global.mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
};

global.mockCorner = {
  id: 'test-corner-id',
  name: 'Test Corner',
  slug: 'test-corner',
  admin_firebase_uid: 'test-user-id',
};

global.mockMemoryGroup = {
  id: 'test-memory-group-id',
  corner_id: 'test-corner-id',
  title: 'Test Memory Group',
  description: 'Test Description',
  is_locked: false,
  lock_visibility: 'private',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

global.mockMediaItem = {
  id: 'test-media-id',
  corner_id: 'test-corner-id',
  memory_group_id: 'test-memory-group-id',
  filename: 'test-image.jpg',
  original_name: 'Test Image.jpg',
  s3_key: 'media/test-image.jpg',
  s3_url: 'https://bucket.s3.amazonaws.com/media/test-image.jpg',
  file_type: 'image/jpeg',
  file_size: 102400,
  width: 1920,
  height: 1080,
  title: 'Test Media',
  created_at: new Date().toISOString(),
  uploaded_by_firebase_uid: 'test-user-id',
};

// Setup and teardown helpers
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.resetModules();
});

// Custom matchers
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
  
  toBeValidHTML(received) {
    const hasHTMLTags = /<[^>]*>/g.test(received);
    const pass = hasHTMLTags;
    if (pass) {
      return {
        message: () => `expected ${received} not to contain HTML tags`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to contain HTML tags`,
        pass: false,
      };
    }
  },
});