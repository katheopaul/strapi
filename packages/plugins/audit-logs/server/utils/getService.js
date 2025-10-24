'use strict';

module.exports = (name) => {
  return strapi.plugin('audit-logs').service(name);
};
