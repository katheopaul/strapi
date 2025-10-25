'use strict';

const path = require('path');
const fs = require('fs');
const { rimraf } = require('rimraf');
const execa = require('execa');
const { createStrapi } = require('create-strapi-app');

/**
 * Deletes a test app
 * @param {string} appPath - name of the app / folder where the app is located
 */
const cleanTestApp = async (appPath) => {
  await rimraf(path.resolve(appPath));
};

/**
 * Runs strapi generate new
 * @param {Object} options - Options
 * @param {string} options.appPath - Name of the app that will be created (also the name of the folder)
 * @param {database} options.database - Arguments to create the testApp with the provided database params
 * @param {string} options.template - Optional template path
 * @param {boolean} options.link - Whether to link monorepo packages via yalc
 * @param {string[]} options.includePlugins - Array of plugin names to enable in config/plugins.js
 * @param {('yalc'|'file')} [options.installMethod] - How to install included plugins
 */
const generateTestApp = async ({ appPath, database, template, link = false, includePlugins = [], installMethod }) => {
  const pkg = require(path.resolve(__dirname, '../../packages/core/strapi/package.json'));

  const scope = {
    database,
    rootPath: path.resolve(appPath),
    name: path.basename(appPath),
    packageManager: 'yarn',
    // disable quickstart run app after creation
    runApp: false,
    // use package version as strapiVersion (all packages have the same version);
    strapiVersion: pkg.version,
    isQuickstart: false,
    uuid: undefined,
    deviceId: null,
    installDependencies: false,
    dependencies: {
      '@strapi/strapi': pkg.version,
      '@strapi/plugin-users-permissions': pkg.version,
      '@strapi/plugin-graphql': pkg.version,
      '@strapi/plugin-documentation': pkg.version,
      '@strapi/plugin-cloud': pkg.version,
      react: '18.2.0',
      'react-dom': '18.2.0',
      'react-router-dom': '^6.0.0',
      'styled-components': '^6.0.0',
    },
    template: template ? path.resolve(template) : template,
    gitInit: false,
  };

  await createStrapi(scope);

  if (link) {
    await linkPackages(scope);
  }

  // Install plugin via file: dependency if requested
  if (!link && installMethod === 'file' && includePlugins.includes('audit-logs')) {
    await addFileDependency(scope, '@strapi/plugin-audit-logs', path.resolve(__dirname, '../../packages/plugins/audit-logs'));
  }

  // Write config/plugins.js if plugins are requested
  if (includePlugins.length > 0) {
    await writePluginsConfig(scope, includePlugins);
  }
};

const linkPackages = async (scope) => {
  fs.writeFileSync(path.join(scope.rootPath, 'yarn.lock'), '');

  await execa('node', [path.join(__dirname, '../..', 'scripts', 'yalc-link.js')], {
    cwd: scope.rootPath,
    stdio: 'inherit',
  });
};

/**
 * Adds a file: dependency and runs yarn install
 * @param {object} scope
 * @param {string} name
 * @param {string} pkgPath absolute path to the package
 */
const addFileDependency = async (scope, name, pkgPath) => {
  const pkgJsonPath = path.join(scope.rootPath, 'package.json');
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  pkgJson.dependencies = pkgJson.dependencies || {};
  // Use forward slashes in file path for cross-platform yarn
  const fileRef = `file:${pkgPath.replace(/\\/g, '/')}`;
  pkgJson.dependencies[name] = fileRef;
  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
  // Ensure this app is treated as an independent project by Yarn Berry
  const yarnLockPath = path.join(scope.rootPath, 'yarn.lock');
  if (!fs.existsSync(yarnLockPath)) {
    fs.writeFileSync(yarnLockPath, '');
  }

  await execa('yarn', ['install'], { cwd: scope.rootPath, stdio: 'inherit' });
};

/**
 * Writes config/plugins.js to enable specified plugins
 * @param {Object} scope - Strapi app scope with rootPath
 * @param {string[]} plugins - Array of plugin names to enable
 */
const writePluginsConfig = async (scope, plugins) => {
  const configDir = path.join(scope.rootPath, 'config');
  
  // Ensure config directory exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const pluginConfig = plugins.reduce((acc, pluginName) => {
    acc[pluginName] = { enabled: true };
    return acc;
  }, {});

  const configContent = `module.exports = ${JSON.stringify(pluginConfig, null, 2)};\n`;
  
  fs.writeFileSync(path.join(configDir, 'plugins.js'), configContent);
};

/**
 * Runs a test app
 * @param {string} appPath - name of the app / folder where the app is located
 */
const runTestApp = async (appPath) => {
  const cmdContext = {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '../..', appPath),
    env: {
      // if STRAPI_LICENSE is in the env the test will run in ee automatically
      STRAPI_DISABLE_EE: !process.env.STRAPI_LICENSE,
      FORCE_COLOR: 1,
      JWT_SECRET: 'aSecret',
    },
  };

  try {
    await execa('yarn', ['strapi', 'build'], cmdContext);
    await execa('yarn', ['strapi', 'start'], cmdContext);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

module.exports = {
  cleanTestApp,
  generateTestApp,
  runTestApp,
};
