'use strict';

module.exports = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/audit-logs',
      handler: 'audit-logs.find',
      config: {
        policies: ['plugin::audit-logs.isEnabled', 'admin::isAuthenticatedAdmin', 'plugin::audit-logs.canRead'],
      },
    },
    {
      method: 'GET',
      path: '/audit-logs/:id',
      handler: 'audit-logs.findOne',
      config: {
        policies: ['plugin::audit-logs.isEnabled', 'admin::isAuthenticatedAdmin', 'plugin::audit-logs.canRead'],
      },
    },
  ],
};
