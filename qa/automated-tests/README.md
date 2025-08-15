# Our Little Corner - Automated Tests

This directory contains comprehensive automated tests for the Our Little Corner application, covering unit tests, integration tests, and end-to-end tests.

## Test Structure

```
qa/automated-tests/
├── unit/               # Unit tests for individual functions and components
├── integration/        # Integration tests for API endpoints and services
├── e2e/               # End-to-end tests for complete user workflows
├── setup/             # Test configuration and setup files
├── test-files/        # Sample files for testing uploads
└── package.json       # Test dependencies and scripts
```

## Getting Started

### Prerequisites

1. **Node.js** (v18 or higher)
2. **Docker** and **Docker Compose** (for running the app during tests)
3. **Test Database** (separate from production)

### Installation

```bash
cd qa/automated-tests
npm install
```

### Environment Setup

1. Copy test environment file:
```bash
cp ../../.env.example .env.test
```

2. Update test environment variables:
```env
# Test Database
DATABASE_URL=postgresql://postgres:testpassword@localhost:5433/our_little_corner_test
POSTGRES_DB=our_little_corner_test
POSTGRES_PASSWORD=testpassword

# Test Firebase Project (separate from production)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-test-project-id
# ... other Firebase test config

# Test AWS S3 Bucket
S3_BUCKET_NAME=your-test-bucket
```

## Running Tests

### All Tests
```bash
npm run test:all
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### End-to-End Tests Only
```bash
npm run test:e2e
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

## Test Categories

### Unit Tests (`unit/`)

Tests individual functions and utility methods in isolation.

**Coverage:**
- HTML utility functions (`htmlUtils.test.js`)
- Authentication helpers
- Database query builders
- Validation functions

**Example:**
```bash
npm run test:unit -- htmlUtils.test.js
```

### Integration Tests (`integration/`)

Tests API endpoints and database operations with actual database connections.

**Coverage:**
- Memory Groups API (`memory-groups-api.test.js`)
- Media Upload API
- Authentication API
- Corner Management API

**Example:**
```bash
npm run test:integration -- memory-groups-api.test.js
```

### End-to-End Tests (`e2e/`)

Tests complete user workflows using a real browser.

**Coverage:**
- Media upload flow (`media-upload-flow.test.js`)
- Authentication flows
- Memory group management
- Gallery viewing and interaction
- Admin panel functionality

**Example:**
```bash
npm run test:e2e -- media-upload-flow.test.js
```

## Test Files Required

Create these test files in `test-files/` directory:

```
test-files/
├── test-image.jpg      # Sample image file (< 5MB)
├── test-video.mp4      # Sample video file (< 10MB)
├── test-document.pdf   # Sample document
└── large-file.jpg      # Large file for testing limits (> 20MB)
```

## Test Database Setup

For integration and E2E tests, you need a separate test database:

```bash
# Start test database
docker run -d \
  --name our-corner-test-db \
  -e POSTGRES_DB=our_little_corner_test \
  -e POSTGRES_PASSWORD=testpassword \
  -p 5433:5432 \
  postgres:15-alpine

# Run migrations on test database
cd ../..
DATABASE_URL=postgresql://postgres:testpassword@localhost:5433/our_little_corner_test npm run migrate
```

## Writing New Tests

### Unit Test Example

```javascript
// qa/automated-tests/unit/myFunction.test.js
const { myFunction } = require('../../../app/lib/myModule');

describe('myFunction', () => {
  test('should handle valid input', () => {
    expect(myFunction('valid')).toBe('expected-result');
  });
  
  test('should handle edge cases', () => {
    expect(myFunction('')).toBe('');
    expect(myFunction(null)).toBe('');
  });
});
```

### Integration Test Example

```javascript
// qa/automated-tests/integration/my-api.test.js
const request = require('supertest');

describe('My API', () => {
  test('should return expected response', async () => {
    const response = await request(app)
      .get('/api/my-endpoint')
      .set(authHeaders);
    
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: expect.any(Array)
    });
  });
});
```

### E2E Test Example

```javascript
// qa/automated-tests/e2e/my-workflow.test.js
const { test, expect } = require('@playwright/test');

test('should complete user workflow', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="my-button"]');
  await expect(page.locator('[data-testid="result"]')).toBeVisible();
});
```

## Test Data Management

### Test Data Creation

Use the provided mock objects in `setup/jest.setup.js`:
- `global.mockUser`
- `global.mockCorner`
- `global.mockMemoryGroup`
- `global.mockMediaItem`

### Test Data Cleanup

Tests automatically clean up after themselves, but for manual cleanup:

```bash
# Clear test database
docker exec our-corner-test-db psql -U postgres -d our_little_corner_test -c "TRUNCATE TABLE media, memory_groups, corners CASCADE;"
```

## Continuous Integration

Add to your CI pipeline (GitHub Actions example):

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: testpassword
          POSTGRES_DB: our_little_corner_test
        ports:
          - 5433:5432
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd qa/automated-tests
          npm ci
      
      - name: Run tests
        run: |
          cd qa/automated-tests
          npm run test:all
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check if test database is running
   docker ps | grep postgres
   ```

2. **E2E Tests Timeout**
   ```bash
   # Increase timeout in playwright.config.js
   timeout: 60000
   ```

3. **File Upload Tests Fail**
   ```bash
   # Ensure test files exist
   ls -la test-files/
   ```

### Debug Mode

Run E2E tests with browser visible:
```bash
# Edit e2e test file
browser = await chromium.launch({ headless: false });
```

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Descriptive Names**: Use clear, descriptive test names
3. **Data Cleanup**: Always clean up test data
4. **Mocking**: Mock external services in unit tests
5. **Assertions**: Use specific assertions, avoid generic ones
6. **Performance**: Keep tests fast and focused

## Contributing

When adding new features:

1. Write unit tests for new utility functions
2. Add integration tests for new API endpoints
3. Create E2E tests for new user workflows
4. Update this README if new test categories are added

## Test Coverage Goals

- **Unit Tests**: >90% coverage for utility functions
- **Integration Tests**: 100% coverage for API endpoints
- **E2E Tests**: Cover all critical user paths

Run coverage report to check current status:
```bash
npm run test:coverage
```