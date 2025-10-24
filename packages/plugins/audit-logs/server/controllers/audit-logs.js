'use strict';

const { validateFindMany } = require('./validation/audit-log');

module.exports = ({ strapi }) => ({
  async find(ctx) {
    await validateFindMany(ctx.query);

    const { query } = ctx;
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    const auditService = strapi.plugin('audit-logs').service('audit');
    
    const [entries, count] = await Promise.all([
      auditService.find(sanitizedQuery),
      auditService.count(sanitizedQuery),
    ]);

    const sanitizedEntries = await this.sanitizeOutput(entries, ctx);

    return {
      data: sanitizedEntries,
      meta: {
        pagination: {
          page: parseInt(query.page, 10) || 1,
          pageSize: parseInt(query.pageSize, 10) || 10,
          pageCount: Math.ceil(count / (parseInt(query.pageSize, 10) || 10)),
          total: count,
        },
      },
    };
  },

  async findOne(ctx) {
    const { id } = ctx.params;
    const auditService = strapi.plugin('audit-logs').service('audit');
    
    const entry = await auditService.findOne(id);
    
    if (!entry) {
      return ctx.notFound('Audit log not found');
    }

    const sanitizedEntry = await this.sanitizeOutput(entry, ctx);
    return {
      data: sanitizedEntry,
    };
  },
});
