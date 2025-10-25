'use strict';

// Mock the validation module before any imports
jest.mock('../validation/audit-log', () => ({
  validateFindMany: jest.fn(() => async (ctx, next) => next()),
}));

describe('Audit Logs Controller', () => {
  let mockStrapi;
  let controllerFactory;

  beforeAll(() => {
    controllerFactory = require('../audit-logs');
  });

  beforeEach(() => {
    mockStrapi = {
      plugin: jest.fn(() => ({
        service: () => ({
          find: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
        })
      })),
    };
  });

  afterEach(() => jest.resetModules());

  test('find should return data and meta pagination', async () => {
    const auditService = {
      find: jest.fn().mockResolvedValue([{ id: '1' }]),
      count: jest.fn().mockResolvedValue(1),
    };

    mockStrapi.plugin = jest.fn(() => ({ service: () => auditService }));

    const ctrl = controllerFactory({ strapi: mockStrapi });

    const ctx = { query: { page: 1, pageSize: 10 }, body: {}, status: 200 };

    const res = await ctrl.find.call(
      {
        sanitizeQuery: async () => ({ where: {} }),
        sanitizeOutput: async (data) => data
      },
      ctx
    );

    expect(res).toHaveProperty('data');
    expect(res).toHaveProperty('meta');
    expect(res.meta.pagination.total).toBe(1);
  });

  test('findOne returns notFound when entry missing', async () => {
    const auditService = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    mockStrapi.plugin = jest.fn(() => ({ service: () => auditService }));

    const ctrl = controllerFactory({ strapi: mockStrapi });

    const ctx = { params: { id: 'no' }, notFound: jest.fn() };

    await ctrl.findOne.call({}, ctx);

    expect(ctx.notFound).toHaveBeenCalled();
  });
});
