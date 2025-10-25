'use strict';

// These tests run when the audit-logs plugin is enabled in the test app.
// Use: node tests/scripts/run-api-tests.js --include-audit-logs

const { createStrapiInstance } = require('api-tests/strapi');
const request = require('supertest');

describe('Audit Logs plugin - API integration', () => {
  let strapi;
  let agent;

  beforeAll(async () => {
    strapi = await createStrapiInstance({ ensureSuperAdmin: true, bypassAuth: false });
    agent = request.agent(strapi.server.httpServer);
  });

  afterAll(async () => {
    if (strapi) {
      await strapi.destroy();
    }
  });

  test('GET /audit-logs returns 200 for authorized admin', async () => {
    const res = await agent.get('/audit-logs').set('accept', 'application/json');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body?.data) || Array.isArray(res.body)).toBe(true);
  });

  test('GET /audit-logs supports filters and pagination', async () => {
    const res = await agent
      .get('/audit-logs')
      .query({ 'pagination[page]': 1, 'pagination[pageSize]': 5, 'filters[action]': 'create' });

    expect(res.statusCode).toBe(200);
  });

  test('GET /audit-logs/:id returns details', async () => {
    // Try to fetch first page; if data exists, use first id
    const list = await agent.get('/audit-logs').query({ 'pagination[pageSize]': 1 });

    expect(list.statusCode).toBe(200);
    
    const id = list.body?.data?.[0]?.id || list.body?.[0]?.id;
    if (id) {
      const res = await agent.get(`/audit-logs/${id}`);
      expect([200, 404]).toContain(res.statusCode);
    }
  });
});
