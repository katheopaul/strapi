'use strict';

const middleware = require('../auditLog');

// Mock the getService utility
const mockCreate = jest.fn().mockResolvedValue({});
jest.mock('../../utils/getService', () => {
  const mock = jest.fn((name) => {
    if (name === 'audit') {
      return {
        create: mockCreate
      };
    }
    return null;
  });
  return mock;
});

describe('Audit Log Middleware - Bulk Operations', () => {
  let strapi;
  let ctx;
  let next;
  let auditService;

  beforeEach(() => {
    mockCreate.mockClear(); // Clear mock call history

    strapi = {
      config: {
        get: jest.fn().mockReturnValue({
          enabled: true,
          excludeContentTypes: [],
          bulkLimit: 100
        })
      },
      log: {
        error: jest.fn()
      }
    };
    global.strapi = strapi;
    
    const getService = require('../../utils/getService');
    auditService = getService('audit');

    ctx = {
      state: {
        auth: {
          user: { id: 1 }
        }
      },
      request: {
        method: 'DELETE',
        route: {
          handler: 'api::article.article.deleteMany'
        },
        body: {
          ids: ['1', '2', '3']
        }
      },
      response: {
        body: {}
      },
      status: 200
    };

    next = jest.fn(() => Promise.resolve());
  });

  describe('Bulk Delete Operations', () => {
    it('should handle empty bulk delete operation', async () => {
      ctx.request.body.ids = [];
      await middleware()(ctx, next);
      expect(auditService.create).not.toHaveBeenCalled();
    });

    it('should handle single item in bulk delete operation', async () => {
      ctx.request.body.ids = ['1'];
      await middleware()(ctx, next);

      expect(auditService.create).toHaveBeenCalledTimes(1);
      expect(auditService.create).toHaveBeenCalledWith(expect.objectContaining({
        entityId: '1',
        bulk: true,
        bulkOperation: {
          total: 1,
          type: 'deleteMany'
        }
      }));
    });

    it('should handle concurrent bulk operations', async () => {
      const promises = [];

      // Simulate 3 concurrent bulk operations
      for (let i = 0; i < 3; i += 1) {
        ctx.request.body.ids = [`${i}1`, `${i}2`];
        promises.push(middleware()(ctx, next));
      }

      await Promise.all(promises);
      expect(auditService.create).toHaveBeenCalledTimes(6); // 2 items * 3 operations
    });

    it('should create audit logs for each deleted item', async () => {
      await middleware()(ctx, next);

      expect(auditService.create).toHaveBeenCalledTimes(3);
      // Each call should match the expected format
      const calls = mockCreate.mock.calls;
      expect(calls.length).toBe(3);
    
      calls.forEach(([logEntry]) => {
        expect(logEntry).toMatchObject({
          action: 'delete',
          contentType: 'api::article',
          bulk: true,
          bulkOperation: {
            total: 3,
            type: 'deleteMany'
          }
        });
        expect(['1', '2', '3']).toContain(logEntry.entityId);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid IDs gracefully', async () => {
      ctx.request.body.ids = [undefined, false, '1'];
      await middleware()(ctx, next);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        entityId: '1',
        bulk: true,
        bulkOperation: {
          total: 1,
          type: 'deleteMany'
        }
      }));
    });

    it('should handle database errors gracefully', async () => {
      ctx.request.body.ids = ['1', '2'];
      auditService.create.mockRejectedValue(new Error('Database error'));

      await middleware()(ctx, next);

      expect(strapi.log.error).toHaveBeenCalled();
      expect(ctx.status).toBe(200); // Should not affect the main operation
    });
  });

  describe('Bulk Create Operations', () => {
    beforeEach(() => {
      ctx.request.method = 'POST';
      ctx.request.route.handler = 'api::article.article.createMany';
      ctx.request.body = {
        data: [
          { title: 'Article 1' },
          { title: 'Article 2' }
        ]
      };
      ctx.response.body = {
        data: [
          { id: 1, title: 'Article 1' },
          { id: 2, title: 'Article 2' }
        ]
      };
    });

    it('should create audit logs for each created item', async () => {
      await middleware()(ctx, next);

      expect(mockCreate).toHaveBeenCalledTimes(2);
      const calls = mockCreate.mock.calls;
      calls.forEach(([logEntry], index) => {
        expect(logEntry).toMatchObject({
          action: 'create',
          contentType: 'api::article',
          bulk: true,
          bulkOperation: {
            total: 2,
            type: 'bulkcreate'
          },
          entityId: (index + 1).toString()
        });
      });
    });
  });

  describe('Bulk Update Operations', () => {
    beforeEach(() => {
      ctx.request.method = 'PUT';
      ctx.request.route.handler = 'api::article.article.updateMany';
      ctx.request.body = {
        data: [
          { id: 1, title: 'Updated Article 1' },
          { id: 2, title: 'Updated Article 2' }
        ]
      };
    });

    it('should create audit logs for each updated item', async () => {
      await middleware()(ctx, next);

      expect(mockCreate).toHaveBeenCalledTimes(2);
      const calls = mockCreate.mock.calls;
      calls.forEach(([logEntry], index) => {
        expect(logEntry).toMatchObject({
          action: 'update',
          contentType: 'api::article',
          bulk: true,
          bulkOperation: {
            total: 2,
            type: 'bulkupdate'
          },
          entityId: (index + 1).toString()
        });
        // Verify that changes contain the updated data
        expect(logEntry.changes).toEqual(ctx.request.body.data[index]);
      });
    });
  });
});
