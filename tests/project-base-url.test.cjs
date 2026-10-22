require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const pg = new PGlite();
const db = require('drizzle-orm/pglite').drizzle(pg);
let testUser = { id: 'owner', email: 'owner@example.com' };
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '@/db') return { db };
  if (request === '@/lib/auth') return { auth: { api: { getSession: async () => testUser ? { user: testUser } : null } } };
  if (request === 'next/headers') return { headers: async () => new Headers() };
  return originalLoad.call(this, request, parent, isMain);
};
// Run batches transactionally in local Postgres. This does not test Neon HTTP transport.
db.batch = async queries => {
  await pg.exec('BEGIN');
  try {
    const results = [];
    for (const query of queries) results.push(await query);
    await pg.exec('COMMIT');
    return results;
  } catch (error) { await pg.exec('ROLLBACK'); throw error; }
};

test('project base URL bulk updates preserve stash selection, permissions, and endpoint editing', async t => {
  t.after(() => pg.close());
  for (const file of fs.readdirSync(path.resolve(__dirname, '../drizzle')).filter(file => file.endsWith('.sql')).sort()) {
    await pg.exec(fs.readFileSync(path.resolve(__dirname, '../drizzle', file), 'utf8'));
  }
  await pg.exec(`insert into "user" (id,name,email) values ('owner','Owner','owner@example.com'), ('outsider','Outsider','outsider@example.com'), ('editor','Editor','editor@example.com'), ('viewer','Viewer','viewer@example.com')`);
  const service = require('../src/server/projects.ts');
  const stashService = require('../src/server/stashes.ts');
  const { endpointInputSchema } = require('../src/lib/validators.ts');
  const { projectMembers } = require('../src/db/schema');
  const route = require('../src/app/api/projects/[projectId]/base-url/route.ts');
  const project = await service.createProject('owner', { name: 'Bulk URLs', description: 'Keep me', baseUrl: 'https://old.example.com' });
  const other = await service.createProject('outsider', { name: 'Other', description: '', baseUrl: 'https://other.example.com' });
  await db.insert(projectMembers).values(['editor', 'viewer'].map(role => ({ projectId: project.id, userId: role, role })));
  const selected = await stashService.createStash('owner', project.id, { name: 'Selected', description: '', color: 'blue' });
  const unselected = await stashService.createStash('owner', project.id, { name: 'Unselected', description: '', color: 'green' });
  const empty = await stashService.createStash('owner', project.id, { name: 'Empty', description: '', color: 'slate' });
  const foreign = await stashService.createStash('outsider', other.id, { name: 'Foreign', description: '', color: 'red' });
  const makeInput = (stashId, name, baseUrl = '') => endpointInputSchema.parse({ stashId, name, baseUrl, path: `/${name}`, method: 'GET', version: '', description: 'Keep endpoint documentation', headers: [{ key: 'Accept', value: 'application/json' }] });
  const original = await service.createEndpoint('owner', project.id, makeInput(selected.id, 'inherited'));
  const custom = await service.createEndpoint('owner', project.id, makeInput(selected.id, 'custom', 'https://custom.example.com'));
  const untouched = await service.createEndpoint('owner', project.id, makeInput(unselected.id, 'untouched', 'https://keep.example.com'));
  const unrelated = await service.createEndpoint('outsider', other.id, makeInput(foreign.id, 'foreign'));
  const read = async (endpoint, user = 'owner') => (await service.getEndpoint(user, endpoint.projectId, endpoint.id)).endpoint;
  const send = body => route.PATCH(new Request('http://local.test/base-url', { method: 'PATCH', body: JSON.stringify(body) }), { params: Promise.resolve({ projectId: project.id }) });

  await t.test('selected stashes include overrides, duplicates and empty stashes; other data stays intact', async () => {
    const response = await send({ baseUrl: ' https://new.example.com/api/ ', stashIds: [selected.id, selected.id, empty.id] });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { baseUrl: 'https://new.example.com/api', updatedEndpointCount: 2 });
    for (const before of [original, custom]) {
      const after = await read(before);
      assert.equal(after.baseUrl, 'https://new.example.com/api');
      assert.ok(Date.parse(after.updatedAt) > Date.parse(before.updatedAt));
      assert.deepEqual({ ...after, baseUrl: before.baseUrl, updatedAt: before.updatedAt }, before);
    }
    assert.deepEqual(await read(untouched), untouched);
    assert.deepEqual(await read(unrelated, 'outsider'), unrelated);
    const savedProject = await service.getProjectSummary('owner', project.id);
    assert.equal(savedProject.baseUrl, 'https://new.example.com/api');
    assert.equal(savedProject.name, project.name);
    assert.equal(savedProject.description, 'Keep me');
    assert.equal(savedProject.stashes.find(stash => stash.id === selected.id).endpoints[0].baseUrl, 'https://new.example.com/api');
  });

  await t.test('open editors cannot restore a stale URL; individual overrides still save afterward', async () => {
    await assert.rejects(service.updateEndpoint('owner', project.id, original.id, { ...makeInput(selected.id, 'inherited'), baseUrl: original.baseUrl, expectedUpdatedAt: original.updatedAt }), error => error.status === 409);
    const latest = await read(original);
    const overridden = await service.updateEndpoint('owner', project.id, original.id, { ...makeInput(selected.id, 'inherited'), baseUrl: 'https://individual.example.com', expectedUpdatedAt: latest.updatedAt });
    assert.equal(overridden.baseUrl, 'https://individual.example.com');
    assert.equal((await read(custom)).baseUrl, 'https://new.example.com/api');
  });

  await t.test('no selection updates only the default, which new endpoints inherit', async () => {
    const before = await read(original);
    const response = await send({ baseUrl: 'https://future.example.com', stashIds: [] });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).updatedEndpointCount, 0);
    assert.deepEqual(await read(original), before);
    assert.deepEqual(await read(untouched), untouched);
    assert.equal((await service.createEndpoint('owner', project.id, makeInput(empty.id, 'new'))).baseUrl, 'https://future.example.com');
  });

  await t.test('foreign or deleted stash IDs reject the entire request before saving', async () => {
    const before = await service.getProjectSummary('owner', project.id);
    const endpointBefore = await read(original);
    for (const id of [foreign.id, crypto.randomUUID()]) {
      const response = await send({ baseUrl: 'https://denied.example.com', stashIds: [selected.id, id] });
      assert.equal(response.status, 400);
      assert.deepEqual(await service.getProjectSummary('owner', project.id), before);
      assert.deepEqual(await read(original), endpointBefore);
    }
  });

  await t.test('owner permission is enforced and invalid payloads cannot write', async () => {
    for (const [user, status] of [['editor', 403], ['viewer', 403], ['outsider', 404], [null, 401]]) {
      testUser = user ? { id: user } : null;
      assert.equal((await send({ baseUrl: 'https://denied.example.com', stashIds: [selected.id] })).status, status);
    }
    testUser = { id: 'owner' };
    for (const body of [{ baseUrl: 'https://valid.example.com' }, { baseUrl: 'https://valid.example.com', stashIds: ['invalid'] }, { baseUrl: 'https://user:pass@example.com', stashIds: [] }, { baseUrl: 'https://valid.example.com?key=1', stashIds: [] }]) {
      assert.equal((await send(body)).status, 400);
    }
    assert.equal((await service.getProjectSummary('owner', project.id)).baseUrl, 'https://future.example.com');
  });

  await t.test('an endpoint write failure rolls back both the project default and all endpoints', async () => {
    const before = await service.getProjectSummary('owner', project.id);
    await pg.exec(`create function reject_bulk_url() returns trigger as $$ begin if NEW.base_url = 'https://fail.example.com' then raise exception 'Simulated endpoint failure'; end if; return NEW; end; $$ language plpgsql;
      create trigger reject_bulk_url before update on endpoints for each row execute function reject_bulk_url();`);
    await assert.rejects(service.updateProjectBaseUrl('owner', project.id, { baseUrl: 'https://fail.example.com', stashIds: [selected.id] }));
    assert.deepEqual(await service.getProjectSummary('owner', project.id), before);
    await pg.exec('drop trigger reject_bulk_url on endpoints; drop function reject_bulk_url();');
  });

  await t.test('clearing the URL is supported and leaves unselected endpoint URLs intact', async () => {
    assert.equal((await send({ baseUrl: '', stashIds: [selected.id] })).status, 200);
    assert.equal((await read(original)).baseUrl, '');
    assert.equal((await read(custom)).baseUrl, '');
    assert.deepEqual(await read(untouched), untouched);
  });
});
