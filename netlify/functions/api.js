const serverless = require('serverless-http');
const app = require('../../backend/server');

console.log('🚀 Loading Netlify Function: api');

module.exports.handler = serverless(app, {
    basePath: '/.netlify/functions/api'
});
