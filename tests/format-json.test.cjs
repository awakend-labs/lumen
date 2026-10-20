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

test('saved JSON sources preserve decimals, large numbers and exponents despite object key reordering', () => {
  const { stringifyJson, matchesJsonSource } = require('../src/lib/json-source.ts');
  const source = '{"z":998.0,"a":[1.2300e+25,90071992547409931234,-0]}';
  const parsed = JSON.parse(source);
  const reordered = { a: parsed.a, z: parsed.z };
  assert.equal(matchesJsonSource(reordered, source), true);
  assert.match(stringifyJson(reordered, source), /998\.0/);
  assert.match(stringifyJson(reordered, source), /1\.2300e\+25/);
  assert.match(stringifyJson(reordered, source), /90071992547409931234/);
  assert.equal(matchesJsonSource({ z: 999 }, source), false);
  assert.equal(matchesJsonSource({}, '{invalid'), false);
  assert.equal(stringifyJson(998, '999.0'), '998');
});
