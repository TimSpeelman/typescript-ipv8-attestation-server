const path = require('path')
const ports = require('../ports')
const { webpackClientServeConfiguration } = require('./templates/webpack.clients-serve')

const PROJECT_ROOT = path.join(__dirname, '../../');

module.exports =
    webpackClientServeConfiguration(PROJECT_ROOT, 'hello-client', ports.helloClient);
