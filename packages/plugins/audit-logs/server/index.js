'use strict';

const register = require('./register');
const contentTypes = require('./content-types');
const controllers = require('./controllers');
const services = require('./services');
const middlewares = require('./middlewares');
const policies = require('./policies');
const routes = require('./routes');
const config = require('./config');

module.exports = () => ({
  register: register.register,
  bootstrap: register.bootstrap,
  destroy: register.destroy,
  contentTypes,
  controllers,
  services,
  middlewares,
  policies,
  routes,
  config
});
