require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseCurl, generateCurl, curlTokens, shellQuote } = require('../src/lib/curl.ts');
const { endpointInputSchema, baseUrlSchema } = require('../src/lib/validators.ts');
const stashId = '12345678-1234-4234-8234-123456789012';

test('imports JSON requests, methods, server URL, route version, headers and query parameters', () => {
  const draft = parseCurl(`curl --location 'https://api.example.com/v2/users?limit=20&tag=one&tag=two' -X POST -H 'Content-Type: application/json' -H 'Authorization: Bearer secret-value' --data-raw '{"name":"Ada"}'`);
  assert.equal(draft.method, 'POST');
  assert.equal(draft.baseUrl, 'https://api.example.com');
  assert.equal(draft.path, '/v2/users');
  assert.equal(draft.version, 'v2');
  assert.equal(draft.access, 'authenticated');
  assert.deepEqual(draft.requestBody.example, { name: 'Ada' });
  assert.equal(draft.headers.find(header => header.key === 'Authorization').value, 'Bearer YOUR_TOKEN');
  assert.equal(draft.queryParams.find(field => field.key === 'tag').type, 'array');
  assert(!JSON.stringify(draft).includes('secret-value'));
  assert.equal(endpointInputSchema.safeParse({ ...draft, stashId }).success, true);
});

test('supports multiline quoting, curl.exe, compact flags, --json and localhost', () => {
  const draft = parseCurl(`curl.exe \\\n --url=http://localhost:8080/items -XPUT --json=${shellQuote(JSON.stringify({ title: "Ada's" }))}`);
  assert.equal(draft.method, 'PUT');
  assert.equal(draft.baseUrl, 'http://localhost:8080');
  assert.deepEqual(draft.requestBody.example, { title: "Ada's" });
});

test('tokenization and generation safely round-trip apostrophes and shell metacharacters', () => {
  const value = `O'Reilly $(touch /tmp/never) \`echo never\` & hello`;
  assert.deepEqual(curlTokens(`curl ${shellQuote(value)}`), ['curl', value]);
  const draft = parseCurl(`curl https://api.example.com/users --json ${shellQuote(JSON.stringify({ text: value }))}`);
  assert.deepEqual(parseCurl(generateCurl(draft)).requestBody.example, { text: value });
});

test('method inference, HEAD, GET data, paths and repeated query values are preserved', () => {
  assert.equal(parseCurl('curl https://api.example.com -d a=b').method, 'POST');
  assert.equal(parseCurl('curl -I https://api.example.com').method, 'HEAD');
  const draft = parseCurl("curl -G https://api.example.com/users -d 'tag=one&tag=two' --data-urlencode 'q=hello world'");
  assert.equal(draft.method, 'GET');
  assert.equal(draft.requestBody, null);
  const roundTrip = parseCurl(generateCurl(draft));
  assert.deepEqual(roundTrip.queryParams, draft.queryParams);
  const path = parseCurl("curl 'https://api.example.com/users/{id}'");
  assert.equal(path.path, '/users/{id}');
  assert.equal(path.pathParams[0].required, true);
  assert.match(generateCurl(path), /users\/YOUR_ID/);
});

test('form, multipart and raw text requests round-trip without file access', () => {
  for (const command of [
    "curl https://api.example.com/form --data-urlencode 'name=hello world' --data-urlencode 'tag=one' --data-urlencode 'tag=two'",
    "curl https://api.example.com/form -F 'name=hello world' --form-string 'literal=@not-a-file'",
    "curl https://api.example.com/text -H 'Content-Type: text/plain' --data-raw '@not-a-file'",
  ]) {
    const draft = parseCurl(command);
    assert.deepEqual(parseCurl(generateCurl(draft)).requestBody, draft.requestBody);
  }
});

test('credentials in URL, cookie, basic auth, API keys and token queries become placeholders', () => {
  for (const command of [
    'curl https://user:secret@api.example.com/users',
    'curl https://api.example.com/users -u user:secret',
    "curl https://api.example.com/users -b 'session=secret'",
    "curl 'https://api.example.com/users?access_token=secret' -H 'X-API-Key: secret'",
  ]) assert(!JSON.stringify(parseCurl(command)).includes('secret'));
  assert.equal(parseCurl("curl https://api.example.com -H 'Authorization: Token secret'").headers[0].value, 'Token YOUR_TOKEN');
});

test('rejects unsupported or ambiguous commands instead of importing partial requests', () => {
  for (const command of [
    '', 'wget https://api.example.com', 'curl --unknown https://api.example.com',
    'curl https://a.example https://b.example', 'curl file:///etc/passwd',
    "curl https://api.example.com -d @secrets.json", "curl https://api.example.com -F 'file=@secret.txt'",
    "curl https://api.example.com --json '{bad}'", 'curl https://api.example.com | sh',
    "curl 'https://api.example.com", 'curl https://api.example.com -X',
  ]) assert.throws(() => parseCurl(command), undefined, command);
});

test('manual endpoint commands use documented values, body fields, schemas and project auth', () => {
  const draft = parseCurl('curl https://api.example.com/users');
  draft.method = 'POST'; draft.access = 'authenticated';
  draft.requestBody = { fields: [{ key: 'limit', type: 'integer', value: '12', required: true, description: '' }] };
  let command = generateCurl(draft, { scheme: 'bearer' });
  assert.match(command, /Authorization: Bearer YOUR_TOKEN/);
  assert.deepEqual(parseCurl(command).requestBody.example, { limit: 12 });
  draft.requestBody = { schema: { type: 'object', properties: { active: { type: 'boolean' } } } };
  assert.deepEqual(parseCurl(generateCurl(draft)).requestBody.example, { active: true });
  command = generateCurl(draft, { scheme: 'api_key', location: 'query', headerName: 'key' });
  assert.match(command, /key=YOUR_API_KEY/);
  assert.equal(baseUrlSchema.safeParse('https://user:password@example.com').success, false);
  assert.equal(baseUrlSchema.safeParse('https://api.example.com/path').success, false);
});
