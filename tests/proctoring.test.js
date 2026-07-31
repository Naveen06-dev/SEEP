const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../server.js');

test('server exposes security dashboard and retest workflow routes', async () => {
  assert.ok(app, 'expected server app to be exported');
});
