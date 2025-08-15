/**
 * End-to-End tests for Media Upload Flow
 * Tests the complete flow from upload to gallery display
 */

const { chromium } = require('playwright');

describe('Media Upload Flow E2E Tests', () => {
  let browser;
  let page;
  let context;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: false }); // Set to true for CI
    context = await browser.newContext();
    page = await context.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    // Setup: Login and navigate to admin panel
    await page.goto('http://localhost:3000/login');
    
    // Login with test credentials (adjust based on your auth flow)
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    
    // Wait for redirect to home or corner selector
    await page.waitForURL(/\/(home|corner-selector)/);
    
    // Navigate to admin panel
    await page.goto('http://localhost:3000/admin');
    await page.waitForLoadState('networkidle');
  });

  test('should successfully upload media and display in gallery', async () => {
    // Create a new memory group
    const memoryGroupTitle = `Test Memory ${Date.now()}`;
    await page.click('[data-testid="create-memory-group-button"]');
    await page.fill('[data-testid="memory-group-title"]', memoryGroupTitle);
    await page.fill('[data-testid="memory-group-description"]', 'Test description for E2E test');
    await page.click('[data-testid="save-memory-group"]');
    
    // Wait for memory group to be created
    await page.waitForSelector(`[data-testid="memory-group-${memoryGroupTitle}"]`);
    
    // Upload media to the memory group
    const testImagePath = './qa/test-files/test-image.jpg'; // You'll need to create this
    await page.click('[data-testid="upload-media-button"]');
    await page.setInputFiles('[data-testid="file-input"]', testImagePath);
    await page.selectOption('[data-testid="memory-group-select"]', memoryGroupTitle);
    await page.click('[data-testid="upload-submit"]');
    
    // Wait for upload confirmation
    await page.waitForSelector('[data-testid="upload-success"]', { timeout: 10000 });
    
    // Navigate to main gallery
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    
    // Verify the memory group appears in gallery
    await expect(page.locator(`[data-testid="memory-group-card"]`)).toContainText(memoryGroupTitle);
    
    // Click on the memory group to open it
    await page.click(`[data-testid="memory-group-card"]:has-text("${memoryGroupTitle}")`);
    
    // Verify media appears in the modal
    await page.waitForSelector('[data-testid="media-detail-modal"]');
    await expect(page.locator('[data-testid="media-item"]')).toBeVisible();
    
    // Verify media title displays correctly (not HTML)
    const mediaTitle = await page.locator('[data-testid="media-title"]').textContent();
    expect(mediaTitle).not.toContain('<p>');
    expect(mediaTitle).not.toContain('</p>');
  });

  test('should display video controls for video uploads', async () => {
    // Similar to above but with video file
    const memoryGroupTitle = `Video Test ${Date.now()}`;
    await page.click('[data-testid="create-memory-group-button"]');
    await page.fill('[data-testid="memory-group-title"]', memoryGroupTitle);
    await page.click('[data-testid="save-memory-group"]');
    
    // Upload video file
    const testVideoPath = './qa/test-files/test-video.mp4';
    await page.click('[data-testid="upload-media-button"]');
    await page.setInputFiles('[data-testid="file-input"]', testVideoPath);
    await page.selectOption('[data-testid="memory-group-select"]', memoryGroupTitle);
    await page.click('[data-testid="upload-submit"]');
    
    await page.waitForSelector('[data-testid="upload-success"]', { timeout: 10000 });
    
    // Navigate to gallery and open video
    await page.goto('http://localhost:3000/');
    await page.click(`[data-testid="memory-group-card"]:has-text("${memoryGroupTitle}")`);
    await page.waitForSelector('[data-testid="media-detail-modal"]');
    
    // Verify video controls are present
    await expect(page.locator('[data-testid="video-play-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="video-volume-button"]')).toBeVisible();
    
    // Test video play/pause functionality
    await page.click('[data-testid="video-play-button"]');
    // Video should start playing - verify play button changes to pause
    await expect(page.locator('[data-testid="video-pause-button"]')).toBeVisible();
  });

  test('should handle public locked memory visibility', async () => {
    // Create a public locked memory
    const memoryGroupTitle = `Public Locked ${Date.now()}`;
    await page.click('[data-testid="create-memory-group-button"]');
    await page.fill('[data-testid="memory-group-title"]', memoryGroupTitle);
    
    // Set as locked and public
    await page.check('[data-testid="is-locked-checkbox"]');
    await page.click('[data-testid="lock-visibility-public"]');
    await page.check('[data-testid="show-title-checkbox"]');
    await page.check('[data-testid="show-description-checkbox"]');
    
    await page.click('[data-testid="save-memory-group"]');
    
    // Upload media to locked group
    const testImagePath = './qa/test-files/test-image.jpg';
    await page.click('[data-testid="upload-media-button"]');
    await page.setInputFiles('[data-testid="file-input"]', testImagePath);
    await page.selectOption('[data-testid="memory-group-select"]', memoryGroupTitle);
    await page.click('[data-testid="upload-submit"]');
    
    await page.waitForSelector('[data-testid="upload-success"]');
    
    // Navigate to main gallery
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    
    // Verify public locked memory appears in gallery
    await expect(page.locator(`[data-testid="memory-group-card"]`)).toContainText(memoryGroupTitle);
    
    // Verify it shows as locked
    const lockedCard = page.locator(`[data-testid="memory-group-card"]:has-text("${memoryGroupTitle}")`);
    await expect(lockedCard.locator('[data-testid="lock-icon"]')).toBeVisible();
    
    // Try to click - should not open (public locked memories are not clickable)
    await lockedCard.click();
    await page.waitForTimeout(1000); // Wait to ensure modal doesn't open
    await expect(page.locator('[data-testid="media-detail-modal"]')).not.toBeVisible();
  });

  test('should handle memory group deletion', async () => {
    // Create memory group
    const memoryGroupTitle = `Delete Test ${Date.now()}`;
    await page.click('[data-testid="create-memory-group-button"]');
    await page.fill('[data-testid="memory-group-title"]', memoryGroupTitle);
    await page.click('[data-testid="save-memory-group"]');
    
    // Navigate to memory management
    await page.click('[data-testid="memory-management-tab"]');
    await page.waitForLoadState('networkidle');
    
    // Find the memory group and delete it
    const memoryRow = page.locator(`[data-testid="memory-row"]:has-text("${memoryGroupTitle}")`);
    await memoryRow.locator('[data-testid="delete-button"]').click();
    
    // Handle confirmation dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Are you sure');
      await dialog.accept();
    });
    
    // Wait for deletion to complete
    await page.waitForTimeout(2000);
    
    // Verify memory group is no longer visible
    await expect(page.locator(`[data-testid="memory-row"]:has-text("${memoryGroupTitle}")`)).not.toBeVisible();
    
    // Verify it doesn't appear in main gallery
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`[data-testid="memory-group-card"]:has-text("${memoryGroupTitle}")`)).not.toBeVisible();
  });

  test('should handle authentication state properly', async () => {
    // Test logout functionality
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to login
    await page.waitForURL(/\/login/);
    
    // Try to access admin without auth - should redirect
    await page.goto('http://localhost:3000/admin');
    await page.waitForURL(/\/login/);
    
    // Login again
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    
    // Should be able to access admin again
    await page.goto('http://localhost:3000/admin');
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
  });
});