require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveEndpointAuth } = require('../src/lib/endpoint-auth.ts');
const { generateCurl } = require('../src/lib/curl.ts');
const { endpointInputSchema, projectAuthSchema } = require('../src/lib/validators.ts');

test('existing endpoints inherit live project auth while explicit overrides remain independent', () => {
  const bearer = projectAuthSchema.parse({ scheme: 'bearer' });
  const session = projectAuthSchema.parse({ scheme: 'session_token', headerName: 'better-auth.session_token' });
  assert.equal(resolveEndpointAuth({ authScheme: null }, bearer), bearer);
  assert.equal(resolveEndpointAuth({ authScheme: null }, session), session);
  assert.equal(resolveEndpointAuth({}, session), session);
  assert.equal(resolveEndpointAuth({ authScheme: 'basic' }, session).scheme, 'basic');
  assert.equal(resolveEndpointAuth({ authScheme: 'none' }, session).scheme, 'none');
  assert.equal(resolveEndpointAuth({ authScheme: 'session_token' }, session), session);
  assert.equal(projectAuthSchema.safeParse({ scheme: 'session_token', headerName: 'bad;cookie' }).success, false);
});

test('cURL resolves endpoint overrides and session cookies without adding credentials to public routes', () => {
  const endpoint = endpointInputSchema.parse({ stashId: '00000000-0000-4000-8000-000000000001', name: 'Read', method: 'GET', path: '/read', access: 'authenticated' });
  const session = projectAuthSchema.parse({ scheme: 'session_token', headerName: 'better-auth.session_token' });
  assert.match(generateCurl(endpoint, session), /Cookie: better-auth.session_token=YOUR_SESSION_TOKEN/);
  assert.doesNotMatch(generateCurl({ ...endpoint, authScheme: 'basic' }, session), /Cookie:/);
  assert.match(generateCurl({ ...endpoint, authScheme: 'basic' }, session), /Authorization: Basic/);
  assert.doesNotMatch(generateCurl({ ...endpoint, authScheme: 'none' }, session), /Cookie:|Authorization:/);
  assert.doesNotMatch(generateCurl({ ...endpoint, access: 'public' }, session), /Cookie:/);
  assert.equal(endpoint.authScheme, null);
});
