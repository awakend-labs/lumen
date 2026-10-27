require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { bodyFieldsToJson } = require('../src/lib/body-field-json.ts');
const { endpointInputSchema } = require('../src/lib/validators.ts');
const { requestBodyFields } = require('../src/features/endpoints/components/field-table.tsx');
const { generateCurl, parseCurl } = require('../src/lib/curl.ts');

const uuid = '550e8400-e29b-41d4-a716-446655440000';
const field = { key: 'collectionId', type: 'uuid', value: uuid, required: true, description: 'Collection identifier' };

test('UUID fields generate string schemas with UUID format and retain documented values', () => {
  const generated = bodyFieldsToJson([{ ...field, format: 'email', min: 36, max: 36, default: uuid, enum: [uuid] }]);
  const schema = JSON.parse(generated.requestSchema);
  assert.deepEqual(schema.properties.collectionId, {
    type: 'string', description: field.description, format: 'uuid', enum: [uuid], default: uuid, minLength: 36, maxLength: 36,
  });
  assert.deepEqual(schema.required, ['collectionId']);
  assert.deepEqual(JSON.parse(generated.requestExample), { collectionId: uuid });
  for (const extra of [{ value: '' }, { value: '', default: uuid }, { value: '', enumValues: [uuid] }]) {
    assert.equal(JSON.parse(bodyFieldsToJson([{ ...field, ...extra }]).requestExample).collectionId, uuid);
  }
  // Documentation text remains a string, even when it resembles JSON.
  assert.equal(JSON.parse(bodyFieldsToJson([{ ...field, value: '123' }]).requestExample).collectionId, '123');
});

test('UUID fields survive endpoint validation and serialization in body, query, and path parameters', () => {
  const input = {
    stashId: uuid, name: 'Update collection', method: 'POST', path: '/collections/{collectionId}',
    pathParams: [field], queryParams: [field], requestBody: { fields: [field] },
  };
  const saved = endpointInputSchema.parse(JSON.parse(JSON.stringify(endpointInputSchema.parse(input))));
  for (const fields of [saved.pathParams, saved.queryParams, saved.requestBody.fields]) {
    assert.equal(fields[0].type, 'uuid');
    assert.equal(fields[0].value, uuid);
  }
});

test('generated schemas keep UUID labels in the documentation table', () => {
  const schema = JSON.parse(bodyFieldsToJson([field]).requestSchema);
  assert.equal(requestBodyFields([field], schema)[0].type, 'uuid');
  assert.equal(requestBodyFields(undefined, schema)[0].type, 'uuid');
});

test('cURL generates UUID strings from documented fields and standard UUID schemas', () => {
  const endpoint = { ...parseCurl('curl https://api.example.com/collections'), method: 'POST' };
  for (const requestBody of [
    { fields: [field] },
    { fields: [{ ...field, value: '' }] },
    { schema: JSON.parse(bodyFieldsToJson([field]).requestSchema) },
  ]) {
    const generated = parseCurl(generateCurl({ ...endpoint, requestBody }));
    assert.deepEqual(generated.requestBody.example, { collectionId: uuid });
  }
});
