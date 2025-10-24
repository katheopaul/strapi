'use strict';

const middlewareFactory = require('../auditLog');

// Mock the getService utility
const mockCreate = jest.fn().mockResolvedValue({ id: 'log-1' });
jest.mock('../../utils/getService', () => {
  return jest.fn((name) => {
    if (name === 'audit') {
      return {
        create: mockCreate
      };
    }
    return null;
  });
});

describe('Audit Log Middleware', () => {
  let mockStrapi;

  beforeEach(() => {
    mockCreate.mockClear(); // Clear mock call history

    mockStrapi = {
      config: {
        get: jest.fn(() => ({ enabled: true, excludeContentTypes: [] })),
        set: jest.fn(),
      },
      log: { error: jest.fn() },
      entityService: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' })
      }
    };

    // expose global strapi for the middleware utils
    global.strapi = mockStrapi;
  });

  afterEach(() => {
    jest.resetAllMocks();
    delete global.strapi;
  });

  test('should create audit log on POST create action', async () => {
    const middleware = middlewareFactory();

    const ctx = {
      request: {
        method: 'POST',
        body: { title: 'Hello' },
        route: { handler: 'api::article.article.create' }
      },
      params: {},
      response: { body: { data: { id: '1' } } },
      status: 200,
      state: { auth: { user: { id: 2 } } },
    };

    const next = jest.fn(async () => {
      // simulate downstream controller creating the entity
      ctx.response.body = { data: { id: '42' } };
    });

    await middleware(ctx, next);

    // Wait for async operations to complete
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });

    expect(next).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const createdArg = mockCreate.mock.calls[0][0];
    expect(createdArg).toMatchObject({
      action: 'create',
      contentType: 'api::article',
      entityId: '42'
    });
  });

  test('should not create log when plugin disabled', async () => {
    mockStrapi.config.get.mockReturnValue({ enabled: false, excludeContentTypes: [] });
    const middleware = middlewareFactory();

    const ctx = {
      request: { method: 'POST', body: {}, route: { handler: 'api::article.article.create' } },
      params: {},
      response: {},
      status: 200,
      state: {}
    };
    const next = jest.fn();

    await middleware(ctx, next);

    expect(next).toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('should skip excluded content types', async () => {
    mockStrapi.config.get.mockReturnValue({
      enabled: true,
      excludeContentTypes: ['api::article']
    });
    const middleware = middlewareFactory();

    const ctx = {
      request: { method: 'POST', body: {}, route: { handler: 'api::article.article.create' } },
      params: {},
      response: {},
      status: 200,
      state: {}
    };
    const next = jest.fn();

    await middleware(ctx, next);

    expect(next).toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
