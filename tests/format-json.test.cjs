require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { formatJson } = require('../src/lib/format-json.ts');

test('JSON formatting indents nested objects and arrays using two spaces', () => {
  assert.equal(formatJson('{"items":[{"id":1},{}],"empty":[]}'), '{\n  "items": [\n    {\n      "id": 1\n    },\n    {}\n  ],\n  "empty": []\n}');
});
test('formatting preserves numeric spelling, key order, escaped strings and duplicate keys', () => {
  const source='{"2":90071992547409931234,"1":1.2300e+25,"name":"a,b: \\"ok\\"","name":"\\u0041"}';
  const formatted=formatJson(source);
  assert.ok(formatted.indexOf('"2"') < formatted.indexOf('"1"'));
  assert.match(formatted,/90071992547409931234/);
  assert.match(formatted,/1\.2300e\+25/);
  assert.ok(formatted.includes('a,b: \\"ok\\"'));
  assert.ok(formatted.includes('"\\u0041"'));
  assert.equal((formatted.match(/"name":/g)||[]).length,2);
});
test('formatting rejects invalid JSON without producing replacement content', () => {
  assert.throws(()=>formatJson('{"missing":}'), SyntaxError);
  assert.equal(formatJson(''), '');
  assert.equal(formatJson('true'), 'true');
  assert.equal(formatJson(formatJson('{"ok":true}')), formatJson('{"ok":true}'));
});
