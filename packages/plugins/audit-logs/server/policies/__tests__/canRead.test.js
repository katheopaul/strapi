'use strict';

describe('Audit Logs Policy', () => {
  test('canRead returns false when no user', async () => {
    const policy = require('../canRead');
    const ctx = { state: {} };
    const result = await policy(ctx, {}, { strapi: {} });
    expect(result).toBe(false);
  });

  test('canRead returns userAbility result', async () => {
    const mockCan = jest.fn().mockReturnValue(true);
    const ctx = { state: { user: { id: 1 }, userAbility: { can: mockCan } } };
    const policy = require('../canRead');
    const result = await policy(ctx, {}, { strapi: {} });
    expect(result).toBe(true);
    expect(mockCan).toHaveBeenCalledWith('plugin::audit-logs.read');
  });
});
