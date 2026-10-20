require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { endpointInputSchema, projectAuthSchema } = require('../src/lib/validators.ts');
const { validEndpointPath, pathParameterNames, canonicalPath } = require('../src/lib/endpoint-path.ts');
const { schemaFields, requestBodyFields, FieldTable } = require('../src/features/endpoints/components/field-table.tsx');
const { renderToStaticMarkup } = require('react-dom/server');
const React = require('react');
const base = { stashId: '12345678-1234-4234-8234-123456789012', name: 'Get user', method: 'GET', path: '/users/{id}', pathParams: [{ key: 'id', required: true }] };

test('endpoint versions accept blank values while preserving versioned validation and defaults', () => {
  assert.equal(endpointInputSchema.parse({ ...base, version: '' }).version, '');
  assert.equal(endpointInputSchema.parse({ ...base, version: '  ' }).version, '');
  assert.equal(endpointInputSchema.parse({ ...base, version: ' V2 ' }).version, 'v2');
  assert.equal(endpointInputSchema.parse(base).version, 'v1');
  for (const version of ['latest', 'v', 'v1/test']) assert.equal(endpointInputSchema.safeParse({ ...base, version }).success, false);
});

test('route validation rejects whitespace, fragments, queries, malformed placeholders and escapes', () => {
  for (const value of ['/users here', '/users#x', '/users?a=1', 'users', '/users/{bad-name}', '/users/{id', '/x%ZZ']) assert.equal(validEndpointPath(value), false, value);
  for (const value of ['/users/{id}', '/users/:id', '/v1/me', '/files/a%20b']) assert.equal(validEndpointPath(value), true, value);
  assert.deepEqual(pathParameterNames('/users/{id}/items/:item'), ['id', 'item']);
  assert.equal(canonicalPath('/users/{id}'), canonicalPath('/users/:userId'));
});

test('routes support Unicode and emoji while still rejecting malformed parameters and controls', () => {
  for (const route of ['/订单/商品', '/café/é', '/emoji/👩‍💻', '/🎉/{id}', '/商品/:id']) assert.equal(validEndpointPath(route), true, route);
  for (const route of ['/unicode/\u0085', '/unicode/\ud800', '/bad/{oops', '/bad?query', '/bad#fragment', '/has space']) assert.equal(validEndpointPath(route), false, route);
});

test('preserving JSON text does not impose a new size limit on existing JSON documents', () => {
  const example = { description: 'x'.repeat(22000), amount: 998 };
  const exampleSource = JSON.stringify(example).replace('998', '998.0');
  assert.equal(endpointInputSchema.safeParse({ ...base, requestBody: { example, exampleSource } }).success, true);
});
test('path parameters must match route and be required', () => {
  assert.equal(endpointInputSchema.safeParse(base).success, true);
  assert.equal(endpointInputSchema.safeParse({ ...base, pathParams: [] }).success, false);
  assert.equal(endpointInputSchema.safeParse({ ...base, pathParams: [{ key: 'id', required: false }] }).success, false);
  assert.equal(endpointInputSchema.safeParse({ ...base, pathParams: [{ key: 'other', required: true }] }).success, false);
});
test('typed fields and access survive validation, with invalid ranges and duplicates rejected', () => {
  const input = { ...base, access: 'admin_only', queryParams: [{ key: 'limit', type: 'integer', enum: ['10', '20'], default: '10', min: 1, max: 100, format: 'int32' }], requestBody: { fields: [{ key: 'email', type: 'string', format: 'email', required: true }] } };
  const result = endpointInputSchema.parse(input);
  assert.equal(result.access, 'admin_only'); assert.equal(result.queryParams[0].max, 100); assert.equal(result.requestBody.fields[0].format, 'email');
  assert.equal(endpointInputSchema.safeParse({ ...input, queryParams: [{ key: 'x', min: 5, max: 2 }] }).success, false);
  assert.equal(endpointInputSchema.safeParse({ ...base, headers: [{ key: 'Accept' }, { key: 'accept' }] }).success, false);
});
test('auth schemes validate API key location and name', () => {
  for (const scheme of ['none', 'bearer', 'api_key', 'basic']) assert.equal(projectAuthSchema.safeParse({ scheme }).success, true);
  assert.equal(projectAuthSchema.safeParse({ scheme: 'api_key', headerName: '' }).success, false);
  assert.equal(projectAuthSchema.safeParse({ scheme: 'api_key', location: 'cookie' }).success, false);
});
test('schema tables show nested fields, required flags, types and constraints safely', () => {
  const fields = schemaFields({ type: 'object', required: ['user'], properties: { user: { type: 'object', properties: { name: { type: 'string', minLength: 1, description: '<script>alert(1)</script>' } } }, count: { type: 'integer', minimum: 0, maximum: 10 } } });
  assert.equal(fields[0].required, true); assert.equal(fields[1].key, 'user.name'); assert.equal(fields[2].min, 0);
  const html = renderToStaticMarkup(React.createElement(FieldTable, { fields }));
  assert.match(html, /<table/); assert.match(html, /integer/); assert.match(html, /Required/); assert.doesNotMatch(html, /<script>/);
});

test('schema-required body fields remain required when separate rows exist', () => {
  const schema = { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' }, profile: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } } };
  const fields = requestBodyFields([{ key: 'email', type: 'string', required: false, value: '', description: 'Account email' }], schema);
  assert.equal(fields[0].required, true); assert.equal(fields[0].description, 'Account email');
  assert.equal(fields.find(field => field.key === 'profile.name').required, true);
  assert.equal(fields.find(field => field.key === 'profile').required, false);
});

test('response status codes are unique and Add response chooses an unused code', () => {
  const { nextResponseStatus } = require('../src/lib/response-status.ts');
  assert.equal(nextResponseStatus([], 'POST'), 201);
  assert.equal(nextResponseStatus([{ statusCode: 201 }], 'POST'), 202);
  assert.equal(nextResponseStatus([{ statusCode: 201 }, { statusCode: 202 }, { statusCode: 204 }], 'POST'), 203);
  assert.equal(nextResponseStatus([{ statusCode: 200 }, { statusCode: 202 }], 'GET'), 201);
  const result = endpointInputSchema.safeParse({ ...base, responses: [{ statusCode: 200 }, { statusCode: 200 }] });
  assert.equal(result.success, false); assert.match(result.error.issues[0].message, /different status code/);
  assert.equal(endpointInputSchema.safeParse({ ...base, responses: [{ statusCode: 200 }, { statusCode: 400 }] }).success, true);
  assert.equal(nextResponseStatus(Array.from({length:500}, (_,i)=>({statusCode:100+i})), 'GET'), undefined);
});

test('body field table follows schema order while retaining metadata and undocumented fields', () => {
  const fields = requestBodyFields([
    { key: 'email', type: 'string', required: false, value: 'example@example.com', description: 'Account email' },
    { key: 'password', type: 'string', required: false, value: '', description: 'Password notes' },
    { key: 'role', type: 'string', required: false, value: '', description: '' },
    { key: 'extra', type: 'string', required: false, value: '', description: 'Extra notes' },
  ], { type:'object', required:['password','email'], properties: { password:{type:'string'}, email:{type:'string',format:'email'}, role:{type:'string'} } });
  assert.deepEqual(fields.map(field => field.key), ['password','email','role','extra']);
  assert.equal(fields[1].value, 'example@example.com'); assert.equal(fields[1].description, 'Account email');
  assert.equal(fields[0].required, true);
  const html = renderToStaticMarkup(React.createElement(FieldTable, { fields }));
  assert.ok(html.indexOf('>password</td>') < html.indexOf('>email</td>'));
  assert.deepEqual(requestBodyFields(fields, undefined).map(field => field.key), fields.map(field => field.key));
});
