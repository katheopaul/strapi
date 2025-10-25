'use strict';

module.exports = {
  register({ strapi }) {
    // Register the audit-logs permission action
    strapi.admin.services.permission.actionProvider.register({
      uid: 'plugin::audit-logs.read',
      section: 'plugins',
      pluginName: 'audit-logs',
      displayName: 'Access audit logs',
      category: 'audit logs',
    });
  },

  bootstrap({ strapi }) {
    // Only register middleware when plugin is enabled
    const cfg = strapi.config.get('plugin.audit-logs') || {};
    if (cfg.enabled) {
      strapi.server.router.use(
        strapi.plugin('audit-logs').middleware('auditLog')
      );
    }
  },

  destroy() {},
};
