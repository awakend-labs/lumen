require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { inferResponseSchema, responseContractFields, responseTypeScript, responseSuccessCode, resolveResponse } = require('../src/lib/response-contract.ts');
const { endpointInputSchema, responseErrorFormatSchema } = require('../src/lib/validators.ts');

test('example inference preserves nested shapes, distinguishes null, and merges array item contracts', () => {
  const schema = inferResponseSchema({ accessToken: 'abc', user: { image: null }, items: [{ id: 1, label: 'one' }, { id: 2, label: null }, { id: 3 }], empty: [] });
  assert.equal(schema.properties.accessToken.type, 'string');
  assert.deepEqual(schema.required, ['accessToken', 'user', 'items', 'empty']);
  assert.equal(schema.properties.user.properties.image.type, 'null');
  const item = schema.properties.items.items;
  assert.deepEqual(item.required, ['id']);
  assert.deepEqual(item.properties.label.type, ['string', 'null']);
  assert.deepEqual(schema.properties.empty.items, {});
  assert.equal(inferResponseSchema(null).type, 'null');
  assert.equal(inferResponseSchema(false).type, 'boolean');
  assert.equal(inferResponseSchema(998).type, 'number');
  const prototype = inferResponseSchema(JSON.parse('{"__proto__":{"safe":true}}'));
  assert.ok(Object.hasOwn(prototype.properties, '__proto__'));
});

test('field tree and TypeScript preserve required, optional and nullable contracts', () => {
  const schema = { type: 'object', required: ['accessToken', 'user'], properties: {
    accessToken: { type: 'string' },
    user: { type: 'object', required: ['image'], properties: { image: { type: ['string', 'null'] }, nickname: { type: 'string' } } },
    roles: { type: 'array', items: { enum: ['member', 'admin'] } },
  } };
  const fields = responseContractFields(schema);
  assert.deepEqual(fields.find(field => field.path === 'user.image'), { path: 'user.image', depth: 1, required: true, type: 'string or null', description: undefined });
  assert.equal(fields.find(field => field.path === 'user.nickname').required, false);
  const source = responseTypeScript(schema, 'LoginResponse201');
  assert.match(source, /"accessToken": string/);
  assert.match(source, /"image": string \| null/);
  assert.match(source, /"nickname"\?: string/);
  assert.match(source, /"roles"\?: Array<"member" \| "admin">/);
  const parsed = ts.createSourceFile('response.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length, 0);
});

test('TypeScript handles unions, local references and arbitrary field names without executing them', () => {
  const schema = { type: 'object', properties: { 'x-y': { $ref: '#/$defs/Id' }, nested: { anyOf: [{ type: 'number' }, { type: 'null' }] } }, $defs: { Id: { type: 'integer' } } };
  const source = responseTypeScript(schema, 'Login-409');
  assert.match(source, /export type Login409/);
  assert.match(source, /"x-y"\?: number/);
  assert.match(source, /\(number\) \| \(null\)/);
  assert.equal(responseTypeScript(false), 'export type ResponseBody = never;\n');
});

test('the primary success defaults follow the method and explicit success wins', () => {
  const rows = [200, 201, 400, 409].map(statusCode => ({ statusCode, description: '' }));
  assert.equal(responseSuccessCode(rows, 'POST'), 201);
  assert.equal(responseSuccessCode(rows, 'GET'), 200);
  assert.equal(responseSuccessCode(rows.map(row => ({ ...row, isSuccess: row.statusCode === 201 })), 'GET'), 201);
  assert.equal(responseSuccessCode(rows.filter(row => row.statusCode >= 400), 'GET'), undefined);
});

test('shared errors resolve dynamically and custom responses remain independent', () => {
  const shared = { body: { error: 'CONFLICT', message: 'Already exists' }, schema: inferResponseSchema({ error: '', message: '' }) };
  const reference = { statusCode: 409, description: 'Email already registered', useSharedError: true };
  assert.equal(resolveResponse(reference, shared).body.message, 'Already exists');
  assert.equal(resolveResponse(reference, { ...shared, body: { message: 'Updated format' } }).body.message, 'Updated format');
  assert.equal(resolveResponse({ ...reference, useSharedError: false, body: { own: true } }, shared).body.own, true);
  assert.equal(responseErrorFormatSchema.safeParse({ body: shared.body, schema: shared.schema }).success, true);
  const base = { stashId: '11111111-1111-4111-8111-111111111111', name: 'Test', method: 'POST', path: '/' };
  assert.equal(endpointInputSchema.safeParse({ ...base, responses: [{ ...reference, isSuccess: true }] }).success, false);
  assert.equal(endpointInputSchema.safeParse({ ...base, responses: [{ statusCode: 200, description: '', isSuccess: true }, { statusCode: 201, description: '', isSuccess: true }] }).success, false);
});
