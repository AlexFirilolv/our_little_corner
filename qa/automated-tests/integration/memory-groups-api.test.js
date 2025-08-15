/**
 * Integration tests for Memory Groups API
 * Tests the full CRUD operations for memory groups
 */

const request = require('supertest');

describe('Memory Groups API Integration Tests', () => {
  let app;
  let testCorner;
  let authHeaders;

  beforeAll(async () => {
    // Setup test environment
    // This would need to be implemented based on your test setup
    // For now, providing the structure
  });

  afterAll(async () => {
    // Cleanup test data
  });

  describe('GET /api/memory-groups', () => {
    test('should require corner_id parameter', async () => {
      const response = await request(app)
        .get('/api/memory-groups')
        .set(authHeaders);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Corner ID is required');
    });

    test('should return memory groups for valid corner', async () => {
      const response = await request(app)
        .get(`/api/memory-groups?cornerId=${testCorner.id}`)
        .set(authHeaders);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.memoryGroups)).toBe(true);
    });

    test('should exclude locked memories when includeLocked=false', async () => {
      // Create a locked memory group first
      const lockedGroup = await createTestMemoryGroup({ is_locked: true, lock_visibility: 'private' });
      
      const response = await request(app)
        .get(`/api/memory-groups?cornerId=${testCorner.id}&includeLocked=false`)
        .set(authHeaders);
      
      expect(response.status).toBe(200);
      const lockedGroups = response.body.memoryGroups.filter(g => g.is_locked && g.lock_visibility === 'private');
      expect(lockedGroups).toHaveLength(0);
    });

    test('should include public locked memories when includeLocked=false', async () => {
      // Create a public locked memory group
      const publicLockedGroup = await createTestMemoryGroup({ 
        is_locked: true, 
        lock_visibility: 'public',
        show_title: true,
        show_description: true 
      });
      
      const response = await request(app)
        .get(`/api/memory-groups?cornerId=${testCorner.id}&includeLocked=false`)
        .set(authHeaders);
      
      expect(response.status).toBe(200);
      const publicLockedGroups = response.body.memoryGroups.filter(g => 
        g.is_locked && g.lock_visibility === 'public'
      );
      expect(publicLockedGroups.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/memory-groups', () => {
    test('should require both id and corner_id', async () => {
      const response = await request(app)
        .put('/api/memory-groups')
        .set(authHeaders)
        .send({ title: 'New Title' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Memory group ID is required');
    });

    test('should update memory group lock status', async () => {
      const testGroup = await createTestMemoryGroup({ is_locked: false });
      
      const response = await request(app)
        .put('/api/memory-groups')
        .set(authHeaders)
        .send({ 
          id: testGroup.id, 
          corner_id: testCorner.id,
          is_locked: true,
          lock_visibility: 'public',
          show_title: true
        });
      
      expect(response.status).toBe(200);
      expect(response.body.is_locked).toBe(true);
      expect(response.body.lock_visibility).toBe('public');
    });

    test('should validate corner ownership', async () => {
      const otherCornerGroup = await createTestMemoryGroup({ corner_id: 'other-corner-id' });
      
      const response = await request(app)
        .put('/api/memory-groups')
        .set(authHeaders)
        .send({ 
          id: otherCornerGroup.id, 
          corner_id: 'other-corner-id',
          title: 'Hacked Title'
        });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied to this corner');
    });
  });

  describe('DELETE /api/memory-groups', () => {
    test('should require both id and corner_id parameters', async () => {
      const response = await request(app)
        .delete('/api/memory-groups?id=test-id')
        .set(authHeaders);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Corner ID is required');
    });

    test('should successfully delete memory group', async () => {
      const testGroup = await createTestMemoryGroup();
      
      const response = await request(app)
        .delete(`/api/memory-groups?id=${testGroup.id}&corner_id=${testCorner.id}`)
        .set(authHeaders);
      
      expect(response.status).toBe(200);
      
      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/memory-groups/${testGroup.id}`)
        .set(authHeaders);
      
      expect(getResponse.status).toBe(404);
    });

    test('should validate corner ownership for deletion', async () => {
      const testGroup = await createTestMemoryGroup();
      
      const response = await request(app)
        .delete(`/api/memory-groups?id=${testGroup.id}&corner_id=wrong-corner-id`)
        .set(authHeaders);
      
      expect(response.status).toBe(403);
    });
  });

  // Helper functions
  async function createTestMemoryGroup(overrides = {}) {
    const defaultGroup = {
      corner_id: testCorner.id,
      title: 'Test Memory Group',
      description: 'Test Description',
      is_locked: false,
      lock_visibility: 'private',
      ...overrides
    };
    
    // Implementation would create test memory group
    return defaultGroup;
  }
});