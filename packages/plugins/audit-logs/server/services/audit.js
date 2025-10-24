'use strict';

/**
 * Sanitizes the audit log entry before sending to API
 * Removes internal performance data
 */
const sanitizeEntry = (entry) => {
  if (!entry) return entry;

  // Create a new object with enumerable properties
  const sanitized = { ...entry };

  // Remove performance data if present
  if (sanitized.changes) {
    const changes = { ...sanitized.changes };
    
    // Get both string keys and symbol keys
    const allKeys = [
      ...Object.getOwnPropertyNames(sanitized.changes),
      ...Object.getOwnPropertySymbols(sanitized.changes)
    ];

    sanitized.changes = allKeys.reduce((acc, key) => {
      // Skip the performance data symbol
      if (key !== Symbol.for('audit-logs.performance')) {
        acc[key] = changes[key];
      }
      return acc;
    }, {});
  }

  return sanitized;
};

module.exports = ({ strapi }) => ({
  async create(data) {
    return strapi.entityService.create('plugin::audit-logs.audit-log', {
      data: {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  },

  async find(params = {}) {
    const entries = await strapi.entityService.findMany('plugin::audit-logs.audit-log', {
      ...params,
      populate: ['user'],
    });

    // Sanitize entries before sending to API
    return Array.isArray(entries) 
      ? entries.map(sanitizeEntry)
      : sanitizeEntry(entries);
  },

  async findOne(id, params = {}) {
    const entry = await strapi.entityService.findOne('plugin::audit-logs.audit-log', id, {
      ...params,
      populate: ['user'],
    });

    return sanitizeEntry(entry);
  },

  async count(params = {}) {
    return strapi.entityService.count('plugin::audit-logs.audit-log', params);
  },
});
