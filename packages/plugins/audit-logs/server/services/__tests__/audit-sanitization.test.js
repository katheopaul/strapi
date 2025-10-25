'use strict';

const { createDiff } = require('../../utils/diff');

describe('Audit Service - Sanitization', () => {
  let strapi;
  let auditService;

  beforeEach(() => {
    strapi = {
      entityService: {
        findMany: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        count: jest.fn()
      },
      query: jest.fn(() => ({
        findOne: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      })),
      service: jest.fn(() => ({
        sanitizeEntity: jest.fn(entity => entity)
      })),
      log: { warn: jest.fn() }
    };
    global.strapi = strapi;

    const createAuditService = require('../audit');
    auditService = createAuditService({ strapi });
  });

  describe('Data Sanitization', () => {
    it('should remove performance data from single entry', async () => {
      // Create an entry with performance data
      const contentType = {
        collectionName: 'api::article.article',
        attributes: { title: { type: 'string' } }
      };

      const changes = createDiff(
        { title: 'Old' },
        { title: 'New' },
        contentType
      );

      const entry = {
        id: 1,
        action: 'update',
        contentType: 'api::article.article',
        changes
      };

      strapi.entityService.findOne.mockResolvedValue(entry);

      const sanitized = await auditService.findOne(1);

      // Verify performance data is removed
      expect(sanitized.changes[Symbol.for('audit-logs.performance')]).toBeUndefined();
      // Verify regular change data is preserved
      expect(sanitized.changes.title).toBeDefined();
    });

    it('should remove performance data from multiple entries', async () => {
      const entries = [
        {
          id: 1,
          action: 'update',
          changes: {
            title: { previous: 'Old', new: 'New' },
            [Symbol.for('audit-logs.performance')]: { durationMs: 50 }
          }
        },
        {
          id: 2,
          action: 'create',
          changes: {
            [Symbol.for('audit-logs.performance')]: { durationMs: 30 }
          }
        }
      ];

      strapi.entityService.findMany.mockResolvedValue(entries);

      const sanitized = await auditService.find({});

      expect(Array.isArray(sanitized)).toBe(true);
      sanitized.forEach(entry => {
        expect(entry.changes?.[Symbol.for('audit-logs.performance')]).toBeUndefined();
      });
    });

    it('should handle entries without changes or performance data', async () => {
      const entry = {
        id: 1,
        action: 'delete',
        contentType: 'api::article.article'
      };

      strapi.entityService.findOne.mockResolvedValue(entry);

      const sanitized = await auditService.findOne(1);

      expect(sanitized).toEqual(entry);
    });

    it('should preserve all non-performance related symbols', async () => {
      const customSymbol = Symbol('custom.metadata');
      const entry = {
        id: 1,
        changes: {
          title: { previous: 'Old', new: 'New' },
          [customSymbol]: { some: 'metadata' },
          [Symbol.for('audit-logs.performance')]: { durationMs: 50 }
        }
      };

      strapi.query().findOne.mockResolvedValue(entry);
      strapi.entityService.findOne.mockResolvedValue(entry);

      const sanitized = await auditService.findOne(1);

      expect(sanitized.changes[customSymbol]).toBeDefined();
      expect(sanitized.changes[Symbol.for('audit-logs.performance')]).toBeUndefined();
    });
  });
});
