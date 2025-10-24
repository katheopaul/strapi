'use strict';

module.exports = {
  default: {
    enabled: true,
    excludeContentTypes: [],
    bulkLimit: 100, // Default bulk operation size limit
  },
  validator(config) {
    if (typeof config.enabled !== 'boolean') {
      throw new Error('config.enabled must be a boolean');
    }
    if (!Array.isArray(config.excludeContentTypes)) {
      throw new Error('config.excludeContentTypes must be an array');
    }
    if (config.bulkLimit !== undefined) {
      if (!Number.isInteger(config.bulkLimit) || config.bulkLimit < 1) {
        throw new Error('config.bulkLimit must be a positive integer');
      }
    }
  },
};
