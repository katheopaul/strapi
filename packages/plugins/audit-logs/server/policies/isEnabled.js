'use strict';

module.exports = async (ctx) => {
  const cfg = strapi.config.get('plugin.audit-logs') || {};
  return Boolean(cfg.enabled);
};
