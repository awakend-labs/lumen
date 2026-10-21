require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { createLocalDatabase } = require('./helpers/neon-pglite.cjs');
let db, session = { user: { id: 'first' } };
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '@/db') return { db };
  if (request === './session') return { getServerSession: async () => session };
  return originalLoad.call(this, request, parent, isMain);
};

test('theme migration, authenticated persistence and endpoint preferences stay independent', async t => {
  const local = await createLocalDatabase();
  db = local.db;
  t.after(() => local.pg.close());
  await local.pg.exec(`insert into "user" (id, name, email) values ('first','First','first@example.com'),('second','Second','second@example.com')`);
  const service = require('../src/server/preferences.ts');
  const route = require('../src/app/api/preferences/theme/route.ts');
  const patch = input => route.PATCH(new Request('http://localhost/api/preferences/theme', { method: 'PATCH', body: JSON.stringify(input) }));
  assert.equal(await service.getThemePreference('first'), null);
  await service.setEndpointView('first', 'list');
  assert.deepEqual(await service.setThemePreference('first', 'dark', true), { theme: 'dark' });
  assert.equal(await service.getEndpointView('first'), 'list');
  assert.deepEqual(await service.setThemePreference('first', 'light', true), { theme: 'dark' });
  assert.equal(await service.getThemePreference('second'), null);
  for (const theme of ['light', 'dark', 'system']) {
    const response = await patch({ theme, userId: 'second' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.deepEqual(await response.json(), { theme });
    assert.equal(await service.getThemePreference('first'), theme);
    assert.equal(await service.getThemePreference('second'), null);
  }
  await service.setEndpointView('first', 'grid');
  assert.equal(await service.getThemePreference('first'), 'system');
  assert.equal((await patch({ theme: 'invalid' })).status, 400);
  assert.equal((await patch({ theme: 'dark', initialize: 'yes' })).status, 400);
  session = null;
  assert.equal((await patch({ theme: 'dark' })).status, 401);
  assert.equal(await service.getThemePreference('first'), 'system');
});
