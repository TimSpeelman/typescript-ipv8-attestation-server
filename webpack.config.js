/**
 * 
 * For using Webpack with TypeScript:
 * @see https://webpack.js.org/guides/typescript/
 * 
 * If Build Performance is too slow:
 * @see https://webpack.js.org/guides/build-performance/
 */

const { webpackMetaConfiguration } = require('./config/templates/webpack/webpack.meta')
const { webpackClientConfiguration } = require('./config/templates/webpack/webpack.clients')
const { webpackServerConfiguration } = require('./config/templates/webpack/webpack.servers')

const PROJECT_ROOT = __dirname;

module.exports = [
    webpackMetaConfiguration(PROJECT_ROOT, 'meta'),
    webpackClientConfiguration(PROJECT_ROOT, 'hello-client'),
    webpackServerConfiguration(PROJECT_ROOT, 'hello-server'),
];
