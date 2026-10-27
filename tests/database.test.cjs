require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const pglite = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const pg = new pglite.PGlite();
const originalLoad = Module._load;
let testUser = { id: 'owner', email: 'owner@example.com' };
let db;
Module._load = function (request, parent, isMain) {
  if (request === '@electric-sql/pglite') return pglite;
  if (request === '@/db') return { db };
  if (request === '@/lib/auth') return { auth: { api: { getSession: async () => testUser ? ({ user: testUser }) : null } } };
  if (request === 'next/headers') return { headers: async () => new Headers() };
  return originalLoad.call(this, request, parent, isMain);
};
db = require('drizzle-orm/pglite').drizzle(pg);
// Exercise the same SQL in local Postgres. This does not simulate Neon HTTP transport.
db.batch = async queries => { const result = []; for (const query of queries) result.push(await query); return result; };

test('migrations, endpoint scope/uniqueness, search, auth, invitations, and status persist in PostgreSQL', async t => {
  const originalFetch = global.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  const invitationEmails = [];
  process.env.RESEND_API_KEY = 'test-only-key';
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    invitationEmails.push(JSON.parse(options.body));
    return Response.json({ id: 'accepted-message' });
  };
  t.after(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });
  const dir = path.resolve(__dirname, '../drizzle');
  for (const file of fs.readdirSync(dir).filter(file => file.endsWith('.sql')).sort()) {
    if (file === '0007_odd_rhino.sql') {
      await pg.exec(`insert into "user" (id,name,email) values ('migration-user','Migration check','migration@example.com');
        insert into projects (id,name,slug,owner_id) values ('00000000-0000-4000-8000-000000000001','Migration check','migration-check','migration-user');
        insert into stashes (project_id,name) values ('00000000-0000-4000-8000-000000000001','Temp'), ('00000000-0000-4000-8000-000000000001','temp'), ('00000000-0000-4000-8000-000000000001','Temp (2)');`);
    }
    if (file === '0008_dazzling_rocket_raccoon.sql') {
      await pg.exec(`insert into endpoints (project_id,stash_id,name,method,path,base_url)
        select project_id,id,'Default URL fixture','GET','/default','https://api.example.com/v1' from stashes
        where project_id = '00000000-0000-4000-8000-000000000001' limit 1;`);
    }
    await pg.exec(fs.readFileSync(path.join(dir, file), 'utf8'));
  }
  const migratedNames = (await pg.query("select name from stashes where project_id = '00000000-0000-4000-8000-000000000001'")).rows.map(row => row.name.toLowerCase());
  assert.equal(migratedNames.length, 3); assert.equal(new Set(migratedNames).size, 3);
  assert.ok(migratedNames.includes('temp (2)')); assert.ok(migratedNames.includes('temp (3)'));
  assert.equal((await pg.query("select base_url from projects where id = '00000000-0000-4000-8000-000000000001'")).rows[0].base_url, 'https://api.example.com/v1');
  await pg.exec("delete from projects where id = '00000000-0000-4000-8000-000000000001'; delete from \"user\" where id = 'migration-user';");
  await pg.exec(`insert into "user" (id,name,email) values ('owner','Owner','owner@example.com'), ('other','Other','other@example.com'), ('viewer','Viewer','viewer@example.com')`);
  const service = require('../src/server/projects.ts');
  const updateEndpoint = async (userId, projectId, endpointId, values) => {
    const { endpoint } = await service.getEndpoint(userId, projectId, endpointId);
    return service.updateEndpoint(userId, projectId, endpointId, { expectedUpdatedAt: endpoint.updatedAt, ...values });
  };
  const stashService = require('../src/server/stashes.ts');
  const collaboration = require('../src/server/collaboration.ts');
  const { endpointInputSchema } = require('../src/lib/validators.ts');
  const a = await service.createProject('owner', { name: 'Alpha', description: '' });
  const b = await service.createProject('other', { name: 'Secret Alpha', description: '' });
  const stash = await stashService.createStash('owner', a.id, { name: 'Users', description: '', color: 'blue' });
  const otherStash = await stashService.createStash('other', b.id, { name: 'Users', description: '', color: 'blue' });
  const input = endpointInputSchema.parse({ baseUrl: 'https://service.example.com', stashId: stash.id, name: 'Alpha user', method: 'GET', path: '/users/{id}', pathParams: [{ key: 'id', required: true }], access: 'authenticated' });
  const created = await service.createEndpoint('owner', a.id, input);
  assert.equal(created.access, 'authenticated');
  assert.equal(created.authScheme, null);
  const overridden = await updateEndpoint('owner', a.id, created.id, { ...input, authScheme: 'session_token', description: '## Saved on first entry' });
  assert.equal(overridden.authScheme, 'session_token');
  const persisted = (await service.getEndpoint('owner', a.id, created.id)).endpoint;
  assert.equal(persisted.authScheme, 'session_token');
  assert.equal(persisted.description, '## Saved on first entry');
  const inheritedAuth = await updateEndpoint('owner', a.id, created.id, { ...input, authScheme: null });
  assert.equal(inheritedAuth.authScheme, null);
  assert.equal(created.baseUrl, 'https://service.example.com');
  await assert.rejects(service.createEndpoint('owner', a.id, { ...input, name: 'Different', path: '/users/:userId' }), error => error.cause?.code === '23505');
  await assert.rejects(service.createEndpoint('owner', a.id, { ...input, name: 'ALPHA USER', path: '/other' }), error => error.cause?.code === '23505');
  const v2 = await service.createEndpoint('owner', a.id, { ...input, version: 'v2' });
  // Unversioned endpoints persist separately from v1/v2 and retain uniqueness protection.
  const unversioned = await service.createEndpoint('owner', a.id, endpointInputSchema.parse({ ...input, version: '' }));
  assert.equal((await service.getEndpoint('owner', a.id, unversioned.id)).endpoint.version, '');
  await assert.rejects(service.createEndpoint('owner', a.id, { ...input, version: '' }), error => error.cause?.code === '23505');
  const versionedAgain = await updateEndpoint('owner', a.id, unversioned.id, { ...input, version: 'v3' });
  assert.equal(versionedAgain.version, 'v3');
  const blankAgain = await updateEndpoint('owner', a.id, unversioned.id, { ...input, version: '' });
  assert.equal(blankAgain.version, '');
  await service.deleteEndpoint('owner', a.id, unversioned.id);
  const secret = await service.createEndpoint('other', b.id, { ...input, stashId: otherStash.id, name: 'Secret Alpha user' });
  await assert.rejects(updateEndpoint('owner', a.id, secret.id, { ...input, name: 'Hacked', path: '/hacked' }), /Endpoint not found/);
  assert.equal((await service.getEndpoint('other', b.id, secret.id)).endpoint.name, 'Secret Alpha user');
  await service.setProjectStatus('owner', a.id, 'documented');
  assert.equal((await service.getProjectDetail('owner', a.id)).status, 'documented');
  assert.equal((await service.listProjects('owner'))[0].stashCount, 1);
  const secondStash = await stashService.createStash('owner', a.id, { name: 'Second', description: '', color: 'blue' });
  assert.equal((await service.listProjects('owner'))[0].stashCount, 2);
  await service.reorderEndpoints('owner', a.id, stash.id, [v2.id, created.id]);
  assert.equal((await service.getProjectDetail('owner', a.id)).stashes[0].endpoints[0].id, v2.id);
  await assert.rejects(service.reorderEndpoints('owner', a.id, stash.id, [created.id, created.id]), /out of date/);
  const invite = await collaboration.createInvitation('owner', a.id, { email: 'viewer@example.com', role: 'viewer' });
  assert.deepEqual(invitationEmails.at(-1), {
    to: ['viewer@example.com'],
    template: { id: 'lumen-project-invitation-template', variables: {
      INVITER_NAME: 'Owner', PROJECT_NAME: 'Alpha', ROLE: 'Viewer', INVITE_URL: invite.link,
    } },
  });
  assert.equal((await collaboration.listInvitations('owner', a.id))[0].id, invite.id);
  await collaboration.revokeInvitation('owner', a.id, invite.id);
  assert.equal((await collaboration.listInvitations('owner', a.id)).length, 0);
  await assert.rejects(collaboration.previewInvitation(invite.link.split('/').pop()), /not found/);
  const search = require('../src/app/api/search/route.ts');
  const results = await (await search.GET(new Request('http://localhost/api/search?q=Alpha'))).json();
  assert.ok(results.some(row => row.title === 'Alpha user'));
  assert.ok(results.every(row => !row.title.includes('Secret')));
  const authRoute = require('../src/app/api/projects/[projectId]/auth/route.ts');
  const response = await authRoute.PUT(new Request('http://localhost', { method: 'PUT', body: JSON.stringify({ scheme: 'bearer' }) }), { params: Promise.resolve({ projectId: a.id }) });
  assert.equal(response.status, 200); assert.equal((await service.getProjectDetail('owner', a.id)).auth.scheme, 'bearer');
  const invitation = await collaboration.createInvitation('owner', a.id, { email: 'viewer@example.com', role: 'viewer' });
  await collaboration.acceptInvitation({ id: 'viewer', email: 'viewer@example.com' }, invitation.link.split('/').pop());
  await assert.rejects(service.createEndpoint('viewer', a.id, input), /permission/);
  testUser = { id: 'viewer', email: 'viewer@example.com' };
  const denied = await authRoute.PUT(new Request('http://localhost', { method: 'PUT', body: JSON.stringify({ scheme: 'basic' }) }), { params: Promise.resolve({ projectId: a.id }) });
  assert.equal(denied.status, 403);

  // Card previews use creation time, even after an older stash is edited or reordered.
  const thirdStash = await stashService.createStash('owner', a.id, { name: 'Newest', description: '', color: 'green' });
  await pg.query('update stashes set created_at = $1 where id = $2', ['2026-01-01T00:00:00Z', stash.id]);
  await pg.query('update stashes set created_at = $1 where id = $2', ['2026-01-02T00:00:00Z', secondStash.id]);
  await pg.query('update stashes set created_at = $1 where id = $2', ['2026-01-03T00:00:00Z', thirdStash.id]);
  await stashService.updateStash('owner', a.id, stash.id, { name: 'Updated oldest', description: '', color: 'pink' });
  await stashService.reorderStashes('owner', a.id, [stash.id, thirdStash.id, secondStash.id]);
  const emptyProject = await service.createProject('owner', { name: 'Empty', description: '' });
  const listed = await service.listProjects('owner');
  assert.deepEqual(listed.find(project => project.id === a.id).previewStashes, [
    { id: thirdStash.id, name: 'Newest', color: 'green' },
    { id: secondStash.id, name: 'Second', color: 'blue' },
  ]);
  assert.deepEqual(listed.find(project => project.id === emptyProject.id).previewStashes, []);
  assert.ok(listed.every(project => project.id !== b.id));
  await stashService.deleteStash('owner', a.id, thirdStash.id);
  assert.deepEqual((await service.listProjects('owner')).find(project => project.id === a.id).previewStashes.map(stash => stash.name), ['Second', 'Updated oldest']);

  const projectRoute = require('../src/app/api/projects/[projectId]/route.ts');
  const stashRoute = require('../src/app/api/projects/[projectId]/stashes/[stashId]/route.ts');
  const endpointRoute = require('../src/app/api/projects/[projectId]/endpoints/[endpointId]/route.ts');
  const renameRequest = name => new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ name }) });
  const projectContext = { params: Promise.resolve({ projectId: a.id }) };
  const stashContext = { params: Promise.resolve({ projectId: a.id, stashId: stash.id }) };
  const endpointContext = { params: Promise.resolve({ projectId: a.id, endpointId: created.id }) };
  testUser = { id: 'owner', email: 'owner@example.com' };
  await service.updateProject('owner', a.id, { name: 'Alpha', description: 'Keep project details', status: 'documented' });
  assert.equal((await projectRoute.PATCH(renameRequest('  Renamed project  '), projectContext)).status, 200);
  const renamedProject = await service.getProjectDetail('owner', a.id);
  assert.equal(renamedProject.name, 'Renamed project');
  assert.equal(renamedProject.slug, a.slug);
  assert.equal(renamedProject.description, 'Keep project details');
  assert.equal(renamedProject.status, 'documented');
  assert.equal(renamedProject.auth.scheme, 'bearer');
  await stashService.updateStash('owner', a.id, stash.id, { name: 'Updated oldest', description: 'Keep these details', color: 'pink', status: 'testing' });
  assert.equal((await stashRoute.PATCH(renameRequest('Renamed stash'), stashContext)).status, 200);
  const renamedStash = (await service.getProjectDetail('owner', a.id)).stashes.find(item => item.id === stash.id);
  assert.equal(renamedStash.name, 'Renamed stash');
  assert.equal(renamedStash.description, 'Keep these details');
  assert.equal(renamedStash.color, 'pink');
  assert.equal(renamedStash.status, 'testing');
  const beforeRename = (await service.getEndpoint('owner', a.id, created.id)).endpoint;
  assert.equal((await endpointRoute.PATCH(renameRequest('Renamed endpoint'), endpointContext)).status, 200);
  const afterRename = (await service.getEndpoint('owner', a.id, created.id)).endpoint;
  assert.deepEqual({ ...afterRename, name: beforeRename.name, updatedAt: beforeRename.updatedAt }, beforeRename);
  assert.equal(afterRename.name, 'Renamed endpoint');
  await service.createEndpoint('owner', a.id, { ...input, name: 'Collision', path: '/collision', pathParams: [] });
  assert.equal((await endpointRoute.PATCH(renameRequest('collision'), endpointContext)).status, 409);
  assert.equal((await projectRoute.PATCH(renameRequest('   '), projectContext)).status, 400);
  assert.equal((await stashRoute.PATCH(renameRequest('x'.repeat(81)), stashContext)).status, 400);
  assert.equal((await endpointRoute.PATCH(renameRequest('x'.repeat(121)), endpointContext)).status, 400);
  assert.equal((await stashRoute.PATCH(renameRequest('Not yours'), { params: Promise.resolve({ projectId: a.id, stashId: otherStash.id }) })).status, 404);
  assert.equal((await endpointRoute.PATCH(renameRequest('Not yours'), { params: Promise.resolve({ projectId: a.id, endpointId: secret.id }) })).status, 404);
  testUser = { id: 'viewer', email: 'viewer@example.com' };
  for (const [route, context] of [[projectRoute, projectContext], [stashRoute, stashContext], [endpointRoute, endpointContext]]) {
    assert.equal((await route.PATCH(renameRequest('Forbidden rename'), context)).status, 403);
  }
  await pg.exec(`insert into project_members (project_id,user_id,role) values ('${a.id}','other','editor')`);
  testUser = { id: 'other', email: 'other@example.com' };
  // Editors can inspect members, but invitations and membership changes remain owner-only.
  assert.ok((await collaboration.listMembers('other', a.id)).length > 0);
  await assert.rejects(collaboration.createInvitation('other', a.id, { email: 'invitee@example.com', role: 'editor' }), error => error.status === 403);
  await assert.rejects(collaboration.listInvitations('other', a.id), error => error.status === 403);
  const invitationsRoute = require('../src/app/api/projects/[projectId]/invitations/route.ts');
  assert.equal((await invitationsRoute.POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ email: 'invitee@example.com', role: 'editor' }) }), projectContext)).status, 403);
  assert.equal((await projectRoute.PATCH(renameRequest('Forbidden project rename'), projectContext)).status, 403);
  assert.equal((await stashRoute.PATCH(renameRequest('Editor stash name'), stashContext)).status, 200);
  assert.equal((await endpointRoute.PATCH(renameRequest('Editor endpoint name'), endpointContext)).status, 200);
  // Moving changes membership/order only; editing a stale form must not move it back.
  const moveRequest = stashId => new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ stashId }) });
  const beforeMove = (await service.getEndpoint('owner', a.id, created.id)).endpoint;
  const destinationEndpoint = await service.createEndpoint('owner', a.id, { ...input, stashId: secondStash.id, name: 'Destination route', path: '/destination', pathParams: [] });
  const movedResponse = await endpointRoute.PATCH(moveRequest(secondStash.id), endpointContext);
  assert.equal(movedResponse.status, 200); // Editors can move, too.
  const moved = await movedResponse.json();
  assert.equal(moved.stashId, secondStash.id);
  assert.equal(moved.order, destinationEndpoint.order + 1);
  assert.deepEqual({ ...moved, stashId: beforeMove.stashId, order: beforeMove.order, updatedAt: beforeMove.updatedAt }, beforeMove);
  const detail = await service.getProjectDetail('owner', a.id);
  assert.ok(!detail.stashes.find(item => item.id === stash.id).endpoints.some(item => item.id === created.id));
  assert.ok(detail.stashes.find(item => item.id === secondStash.id).endpoints.some(item => item.id === created.id));
  const repeated = await service.moveEndpoint('owner', a.id, created.id, secondStash.id);
  assert.deepEqual(repeated, moved);
  const edited = await updateEndpoint('owner', a.id, created.id, { ...input, description: 'Edited after moving' });
  assert.equal(edited.stashId, secondStash.id);
  assert.equal((await endpointRoute.PATCH(moveRequest(otherStash.id), endpointContext)).status, 400);
  assert.equal((await endpointRoute.PATCH(moveRequest('00000000-0000-4000-8000-000000000000'), endpointContext)).status, 400);
  assert.equal((await endpointRoute.PATCH(moveRequest('invalid'), endpointContext)).status, 400);
  assert.equal((await endpointRoute.PATCH(moveRequest(secondStash.id), { params: Promise.resolve({ projectId: a.id, endpointId: secret.id }) })).status, 404);
  testUser = { id: 'viewer', email: 'viewer@example.com' };
  assert.equal((await endpointRoute.PATCH(moveRequest(stash.id), endpointContext)).status, 403);
  assert.equal((await service.getEndpoint('owner', a.id, created.id)).endpoint.stashId, secondStash.id);
  const groups = require('../src/server/api-groups.ts');
  const groupRoute = require('../src/app/api/projects/[projectId]/stashes/[stashId]/groups/route.ts');
  const groupItemRoute = require('../src/app/api/projects/[projectId]/stashes/[stashId]/groups/[groupId]/route.ts');
  const groupRequest = name => new Request('http://localhost', { method: 'POST', body: JSON.stringify({ name }) });
  const groupContext = { params: Promise.resolve({ projectId: a.id, stashId: secondStash.id }) };
  assert.equal((await groupRoute.POST(groupRequest('Denied'), groupContext)).status, 403);
  testUser = { id: 'owner', email: 'owner@example.com' };
  assert.equal((await groupRoute.POST(groupRequest('   '), groupContext)).status, 400);
  const groupResponse = await groupRoute.POST(groupRequest('Email Authentication'), groupContext);
  assert.equal(groupResponse.status, 201);
  const group = await groupResponse.json();
  const groupItemContext = { params: Promise.resolve({ projectId: a.id, stashId: secondStash.id, groupId: group.id }) };
  const otherGroup = await groups.saveApiGroup('other', b.id, otherStash.id, 'Private');
  await assert.rejects(groups.saveApiGroup('owner', a.id, otherStash.id, 'Wrong project'), /Stash not found/);
  await assert.rejects(groups.saveApiGroup('owner', a.id, secondStash.id, 'email authentication'), error => error.cause?.code === '23505');
  const groupedEndpoint = await service.createEndpoint('owner', a.id, { ...input, stashId: secondStash.id, groupId: group.id, name: 'Grouped sign in', path: '/sign-in', pathParams: [] });
  assert.equal(groupedEndpoint.groupId, group.id);
  const destinationGroup = await groups.saveApiGroup('owner', a.id, secondStash.id, 'Destination group');
  const groupedContext = { params: Promise.resolve({ projectId: a.id, endpointId: groupedEndpoint.id }) };
  const moveGroupRequest = (groupId, overrides = {}) => new Request('http://localhost', {
    method: 'PATCH', body: JSON.stringify({ stashId: secondStash.id, groupId, expectedUpdatedAt: groupedEndpoint.updatedAt, ...overrides }),
  });
  const movedGroupResponse = await endpointRoute.PATCH(moveGroupRequest(destinationGroup.id), groupedContext);
  assert.equal(movedGroupResponse.status, 200);
  const movedGroup = await movedGroupResponse.json();
  assert.equal(movedGroup.groupId, destinationGroup.id);
  assert.notEqual(movedGroup.updatedAt, groupedEndpoint.updatedAt);
  const { groupId: _oldGroup, updatedAt: _oldTime, ...originalDocumentation } = groupedEndpoint;
  const { groupId: _newGroup, updatedAt: _newTime, ...movedDocumentation } = movedGroup;
  assert.deepEqual(movedDocumentation, originalDocumentation);
  assert.equal((await endpointRoute.PATCH(moveGroupRequest(group.id), groupedContext)).status, 409);
  assert.equal((await endpointRoute.PATCH(moveGroupRequest(otherGroup.id), groupedContext)).status, 400);
  assert.equal((await endpointRoute.PATCH(moveGroupRequest('invalid'), groupedContext)).status, 400);
  assert.equal((await endpointRoute.PATCH(moveGroupRequest(null, { expectedUpdatedAt: undefined }), groupedContext)).status, 400);
  assert.equal((await endpointRoute.PATCH(moveGroupRequest(null, { stashId: stash.id }), groupedContext)).status, 409);
  assert.equal((await endpointRoute.PATCH(moveGroupRequest(group.id), { params: Promise.resolve({ projectId: a.id, endpointId: secret.id }) })).status, 404);
  testUser = { id: 'viewer', email: 'viewer@example.com' };
  assert.equal((await endpointRoute.PATCH(moveGroupRequest(null, { expectedUpdatedAt: movedGroup.updatedAt }), groupedContext)).status, 403);
  testUser = { id: 'owner', email: 'owner@example.com' };
  const ungroupResponse = await endpointRoute.PATCH(moveGroupRequest(null, { expectedUpdatedAt: movedGroup.updatedAt }), groupedContext);
  assert.equal(ungroupResponse.status, 200);
  const ungroupedEndpoint = await ungroupResponse.json();
  assert.equal(ungroupedEndpoint.groupId, null);
  assert.equal((await endpointRoute.PATCH(moveGroupRequest(group.id, { expectedUpdatedAt: ungroupedEndpoint.updatedAt }), groupedContext)).status, 200);
  await groups.deleteApiGroup('owner', a.id, secondStash.id, destinationGroup.id);
  await assert.rejects(service.createEndpoint('owner', a.id, { ...input, groupId: group.id, name: 'Invalid grouping', path: '/invalid' }), /API group in this stash/);
  await assert.rejects(updateEndpoint('owner', a.id, groupedEndpoint.id, { ...input, stashId: secondStash.id, groupId: otherGroup.id }), /API group in this stash/);
  await assert.rejects(pg.query('update endpoints set group_id = $1 where id = $2', [otherGroup.id, groupedEndpoint.id]), error => error.code === '23503');
  let groupDetail = await service.getProjectDetail('viewer', a.id);
  assert.ok(groupDetail.stashes.find(item => item.id === secondStash.id).groups.some(item => item.id === group.id));
  assert.ok(groupDetail.stashes.every(item => item.groups.every(value => value.id !== otherGroup.id)));
  assert.equal((await groupItemRoute.PATCH(groupRequest('Session Management'), groupItemContext)).status, 200);
  const groupInput = { ...input, stashId: secondStash.id, name: groupedEndpoint.name, path: '/sign-in', pathParams: [] };
  await updateEndpoint('owner', a.id, groupedEndpoint.id, { ...groupInput, groupId: null });
  assert.equal((await service.getEndpoint('owner', a.id, groupedEndpoint.id)).endpoint.groupId, null);
  await updateEndpoint('owner', a.id, groupedEndpoint.id, { ...groupInput, groupId: group.id });
  await updateEndpoint('owner', a.id, groupedEndpoint.id, groupInput);
  assert.equal((await service.getEndpoint('owner', a.id, groupedEndpoint.id)).endpoint.groupId, group.id);
  await service.moveEndpoint('owner', a.id, groupedEndpoint.id, stash.id);
  assert.equal((await service.getEndpoint('owner', a.id, groupedEndpoint.id)).endpoint.groupId, null);
  await assert.rejects(updateEndpoint('owner', a.id, groupedEndpoint.id, { ...groupInput, groupId: group.id }), /moved to another stash/);
  const secondGrouped = await service.createEndpoint('owner', a.id, { ...groupInput, groupId: group.id, name: 'Keep after deleting group', path: '/keep' });
  testUser = { id: 'viewer', email: 'viewer@example.com' };
  assert.equal((await groupItemRoute.DELETE(new Request('http://localhost'), groupItemContext)).status, 403);
  testUser = { id: 'other', email: 'other@example.com' };
  assert.equal((await groupItemRoute.DELETE(new Request('http://localhost'), groupItemContext)).status, 204);
  assert.equal((await service.getEndpoint('owner', a.id, secondGrouped.id)).endpoint.groupId, null);
  groupDetail = await service.getProjectDetail('owner', a.id);
  assert.deepEqual(groupDetail.stashes.find(item => item.id === secondStash.id).groups, []);
  // Stash deletion cascades through both groups and their endpoints.
  const disposable = await stashService.createStash('owner', a.id, { name: 'Disposable', description: '', color: 'blue' });
  const disposableGroup = await groups.saveApiGroup('owner', a.id, disposable.id, 'Temporary');
  await service.createEndpoint('owner', a.id, { ...groupInput, stashId: disposable.id, groupId: disposableGroup.id, name: 'Temporary route', path: '/temporary' });
  await stashService.deleteStash('owner', a.id, disposable.id);
  assert.equal((await pg.query('select id from api_groups where id = $1', [disposableGroup.id])).rows.length, 0);
  // Invitations commit membership atomically, tolerate retries, and cannot restore revoked access.
  await pg.exec(`insert into "user" (id,name,email) values ('invitee','Invitee','invitee@example.com'), ('wrong','Wrong account','wrong@example.com')`);
  const inviteProject = await service.createProject('owner', { name: 'Collaboration checks', description: '' });
  const inviteStash = await stashService.createStash('owner', inviteProject.id, { name: 'Auth', description: '', color: 'blue' });
  const inviteEndpoint = await service.createEndpoint('owner', inviteProject.id, { ...input, stashId: inviteStash.id, name: 'Session', path: '/session', pathParams: [] });
  const { invitationInputSchema } = require('../src/lib/validators.ts');
  const normalizedInvite = invitationInputSchema.parse({ email: '  INVITEE@EXAMPLE.COM  ', role: 'viewer' });
  assert.equal(normalizedInvite.email, 'invitee@example.com');
  const inviteForViewer = await collaboration.createInvitation('owner', inviteProject.id, normalizedInvite);
  const inviteToken = inviteForViewer.link.split('/').pop();
  await assert.rejects(collaboration.acceptInvitation({ id: 'wrong', email: 'wrong@example.com' }, inviteToken), /different email/);
  assert.equal((await collaboration.previewInvitation(inviteToken)).status, 'pending');
  await assert.rejects(service.getProjectDetail('invitee', inviteProject.id), /not found/);
  await assert.rejects(collaboration.acceptInvitation({ id: 'missing-user', email: 'invitee@example.com' }, inviteToken), error => error.cause?.code === '23503');
  assert.equal((await collaboration.previewInvitation(inviteToken)).status, 'pending'); // Failed membership rolls back the claim.
  const accepts = await Promise.all([
    collaboration.acceptInvitation({ id: 'invitee', email: 'INVITEE@example.com' }, inviteToken),
    collaboration.acceptInvitation({ id: 'invitee', email: 'invitee@example.com' }, inviteToken),
  ]);
  assert.ok(accepts.every(result => result.projectId === inviteProject.id));
  assert.equal((await service.getProjectDetail('invitee', inviteProject.id)).role, 'viewer');
  assert.equal((await collaboration.listInvitations('owner', inviteProject.id)).length, 0);
  assert.equal((await collaboration.previewInvitation(inviteToken)).status, 'accepted');
  const acceptRoute = require('../src/app/api/invitations/[token]/accept/route.ts');
  testUser = { id: 'invitee', email: 'invitee@example.com' };
  assert.equal((await acceptRoute.POST(new Request('http://localhost'), { params: Promise.resolve({ token: inviteToken }) })).status, 200);
  const ProjectLayout = require('../src/app/(workspace)/projects/[projectId]/layout.tsx').default;
  const EditLayout = require('../src/app/(workspace)/projects/[projectId]/endpoints/[endpointId]/edit/layout.tsx').default;
  const NewLayout = require('../src/app/(workspace)/projects/[projectId]/endpoints/new/layout.tsx').default;
  const SettingsLayout = require('../src/app/(workspace)/projects/[projectId]/settings/layout.tsx').default;
  const pageProps = { children: 'protected content', params: Promise.resolve({ projectId: inviteProject.id, endpointId: inviteEndpoint.id }) };
  const projectPage = await ProjectLayout(pageProps);
  assert.equal(projectPage.props.children, 'protected content');
  assert.equal(projectPage.props.state.queries[0].state.data.stashes[0].endpoints[0].id, inviteEndpoint.id);
  assert.deepEqual(projectPage.props.state.queries[0].queryKey, ['project-summary', inviteProject.id]);
  assert.equal(Object.hasOwn(projectPage.props.state.queries[0].state.data.stashes[0].endpoints[0], 'responses'), false);
  const EndpointLayout = require('../src/app/(workspace)/projects/[projectId]/endpoints/[endpointId]/layout.tsx').default;
  const endpointPage = await EndpointLayout(pageProps);
  assert.deepEqual(endpointPage.props.state.queries[0].queryKey, ['endpoints', inviteProject.id, inviteEndpoint.id]);
  assert.equal(endpointPage.props.state.queries[0].state.data.endpoint.id, inviteEndpoint.id);
  assert.equal(endpointPage.props.state.queries[0].state.data.role, 'viewer');
  const redirectsToProject = error => error.digest?.startsWith('NEXT_REDIRECT;') && error.digest.includes(`/projects/${inviteProject.id}`);
  await assert.rejects(EditLayout(pageProps), redirectsToProject);
  await assert.rejects(NewLayout(pageProps), redirectsToProject);
  await assert.rejects(SettingsLayout(pageProps), redirectsToProject);
  await assert.rejects(collaboration.listMembers('invitee', inviteProject.id), /permission/);
  const membersRoute = require('../src/app/api/projects/[projectId]/members/route.ts');
  assert.equal((await membersRoute.GET(new Request('http://localhost'), { params: Promise.resolve({ projectId: inviteProject.id }) })).status, 403);
  const viewerEndpointContext = { params: Promise.resolve({ projectId: inviteProject.id, endpointId: inviteEndpoint.id }) };
  assert.equal((await endpointRoute.PATCH(renameRequest('Denied'), viewerEndpointContext)).status, 403);
  testUser = { id: 'owner', email: 'owner@example.com' };
  assert.equal(await EditLayout(pageProps), 'protected content');
  assert.equal(await SettingsLayout(pageProps), 'protected content');
  const membersBeforeRemoval = await collaboration.listMembers('owner', inviteProject.id);
  const inviteeMember = membersBeforeRemoval.find(member => member.userId === 'invitee');
  const ownerMember = membersBeforeRemoval.find(member => member.role === 'owner');
  await assert.rejects(collaboration.removeMember('invitee', inviteProject.id, ownerMember.id), /permission/);
  await assert.rejects(collaboration.removeMember('owner', inviteProject.id, ownerMember.id), /owner can't be removed/);
  await collaboration.removeMember('owner', inviteProject.id, inviteeMember.id);
  testUser = { id: 'invitee', email: 'invitee@example.com' };
  const is404 = error => error.digest === 'NEXT_HTTP_ERROR_FALLBACK;404';
  for (const layout of [ProjectLayout, EditLayout, NewLayout, SettingsLayout]) await assert.rejects(layout(pageProps), is404);
  assert.equal((await projectRoute.GET(new Request('http://localhost'), { params: Promise.resolve({ projectId: inviteProject.id }) })).status, 404);
  assert.equal((await endpointRoute.GET(new Request('http://localhost'), viewerEndpointContext)).status, 404);
  assert.equal((await acceptRoute.POST(new Request('http://localhost'), { params: Promise.resolve({ token: inviteToken }) })).status, 403);
  await assert.rejects(service.getProjectDetail('invitee', inviteProject.id), /not found/);
  testUser = { id: 'wrong', email: 'wrong@example.com' };
  await assert.rejects(ProjectLayout(pageProps), is404);
  assert.equal((await acceptRoute.POST(new Request('http://localhost'), { params: Promise.resolve({ token: inviteToken }) })).status, 403);
  const replacement = await collaboration.createInvitation('owner', inviteProject.id, { email: 'invitee@example.com', role: 'editor' });
  const replaced = await collaboration.createInvitation('owner', inviteProject.id, { email: 'invitee@example.com', role: 'viewer' });
  assert.equal(replacement.id, replaced.id);
  await assert.rejects(collaboration.acceptInvitation({ id: 'invitee', email: 'invitee@example.com' }, replacement.link.split('/').pop()), /not found/);
  await collaboration.revokeInvitation('owner', inviteProject.id, replaced.id);
  await assert.rejects(collaboration.acceptInvitation({ id: 'invitee', email: 'invitee@example.com' }, replaced.link.split('/').pop()), /not found/);
  const expiredInvite = await collaboration.createInvitation('owner', inviteProject.id, { email: 'invitee@example.com', role: 'editor' });
  await pg.query("update invitations set expires_at = now() - interval '1 second' where id = $1", [expiredInvite.id]);
  assert.equal((await collaboration.previewInvitation(expiredInvite.link.split('/').pop())).status, 'expired');
  await assert.rejects(collaboration.acceptInvitation({ id: 'invitee', email: 'invitee@example.com' }, expiredInvite.link.split('/').pop()), /expired/);
  assert.equal((await collaboration.listMembers('owner', inviteProject.id)).length, 1);
  // Invalid projects produce a 404; signed-out users are redirected to sign in.
  const LoginPage = require('../src/app/login/page.tsx').default;
  const SignupPage = require('../src/app/signup/page.tsx').default;
  testUser = { id: 'owner', email: 'owner@example.com' };
  for (const page of [LoginPage, SignupPage]) await assert.rejects(page(), error => error.digest?.startsWith('NEXT_REDIRECT;') && error.digest.includes('/dashboard'));
  await assert.rejects(ProjectLayout({ ...pageProps, params: Promise.resolve({ projectId: 'invalid' }) }), is404);
  testUser = null;
  await assert.rejects(ProjectLayout(pageProps), error => error.digest?.startsWith('NEXT_REDIRECT;') && error.digest.includes('/login?callbackUrl='));
  // Stash names are unique within a project, including case/whitespace variants.
  const named = await stashService.createStash('owner', a.id, { name: 'Temp', description: '', color: 'blue' });
  await assert.rejects(stashService.createStash('owner', a.id, { name: ' temp ', description: '', color: 'blue' }), /already exists/);
  await assert.rejects(stashService.updateStash('owner', a.id, secondStash.id, { name: 'TEMP', description: '', color: 'blue' }), /already exists/);
  await assert.rejects(pg.query('insert into stashes (project_id, name) values ($1, $2)', [a.id, 'temp']), error => error.code === '23505');
  await stashService.createStash('other', b.id, { name: 'Temp', description: '', color: 'blue' });
  // Base URL paths and JSON insertion order survive a full database round trip.
  const ordered = { password: 'example', email: 'example', role: 'member' };
  const orderedSchema = { type: 'object', properties: { password: { type: 'string' }, email: { type: 'string' }, role: { type: 'string' } } };
  const storedInput = endpointInputSchema.parse({ ...input, pathParams: [], stashId: named.id, name: 'Ordered payload', path: '/ordered', baseUrl: 'https://api.shopkart.dev/v1', requestBody: { contentType: 'application/json', example: ordered, schema: orderedSchema }, responses: [{ statusCode: 201, description: 'Created', body: ordered, schema: orderedSchema }] });
  const stored = await service.createEndpoint('owner', a.id, storedInput);
  const roundTrip = (await service.getEndpoint('owner', a.id, stored.id)).endpoint;
  assert.equal(roundTrip.baseUrl, 'https://api.shopkart.dev/v1');
  for (const object of [roundTrip.requestBody.example, roundTrip.requestBody.schema.properties, roundTrip.responses[0].body, roundTrip.responses[0].schema.properties]) assert.deepEqual(Object.keys(object), ['password', 'email', 'role']);
  // Drafts recover incomplete input, belong to one editor, and reject late writes after publishing/discard.
  const drafts = require('../src/server/endpoint-drafts.ts');
  const key = `new:${named.id}`;
  const token = await drafts.getEndpointDraft('owner', a.id, key);
  const payload = JSON.stringify({ name: '', baseUrl: 'https://api.shopkart.dev/v1', requestSchema: '{ incomplete' });
  await drafts.saveEndpointDraft('owner', a.id, key, { revision: token.revision, writeOrder: 2, payload });
  assert.equal((await drafts.getEndpointDraft('owner', a.id, key)).payload, payload);
  await assert.rejects(drafts.saveEndpointDraft('owner', a.id, key, { revision: token.revision, writeOrder: 1, payload: '{}' }), /changed in another tab/);
  assert.equal((await drafts.getEndpointDraft('other', a.id, key)).payload, null);
  await assert.rejects(drafts.saveEndpointDraft('other', a.id, key, { revision: token.revision, writeOrder: 3, payload: '{}' }), /changed in another tab/);
  await assert.rejects(drafts.getEndpointDraft('viewer', a.id, key), /permission/);
  assert.equal((await pg.query('select count(*)::int as count from endpoint_drafts where user_id=$1', ['viewer'])).rows[0].count, 0);
  await assert.rejects(drafts.getEndpointDraft('owner', a.id, `new:${otherStash.id}`), /not found/);
  await service.createEndpoint('owner', a.id, { ...storedInput, name: 'Published draft', path: '/published', draft: { key, revision: token.revision } });
  const cleared = await drafts.getEndpointDraft('owner', a.id, key);
  assert.equal(cleared.payload, null); assert.notEqual(cleared.revision, token.revision);
  await assert.rejects(drafts.saveEndpointDraft('owner', a.id, key, { revision: token.revision, writeOrder: 4, payload }), /changed in another tab/);
  await drafts.saveEndpointDraft('owner', a.id, key, { revision: cleared.revision, writeOrder: 1, payload });
  await drafts.clearEndpointDraft('owner', a.id, key, cleared.revision);
  await assert.rejects(drafts.saveEndpointDraft('owner', a.id, key, { revision: cleared.revision, writeOrder: 2, payload }), /changed in another tab/);
  const editKey = `endpoint:${stored.id}`;
  const editToken = await drafts.getEndpointDraft('owner', a.id, editKey);
  await drafts.saveEndpointDraft('owner', a.id, editKey, { revision: editToken.revision, writeOrder: 1, payload });
  await updateEndpoint('owner', a.id, stored.id, { ...storedInput, draft: { key: editKey, revision: editToken.revision } });
  assert.equal((await drafts.getEndpointDraft('owner', a.id, editKey)).payload, null);
  await service.updateProject('owner', a.id, { name: 'Alpha', description: '', baseUrl: 'https://api.shopkart.dev/v1' });
  assert.equal((await service.getProjectDetail('owner', a.id)).baseUrl, 'https://api.shopkart.dev/v1');
  assert.equal((await service.listProjects('owner')).find(project => project.id === a.id).baseUrl, 'https://api.shopkart.dev/v1');
  const inherited = await service.createEndpoint('owner', a.id, { ...storedInput, name: 'Inherited origin', path: '/inherited', baseUrl: '' });
  assert.equal(inherited.baseUrl, 'https://api.shopkart.dev/v1');
  await service.updateProject('owner', a.id, { name: 'Renamed Alpha', description: '' });
  assert.equal((await service.getProjectDetail('owner', a.id)).baseUrl, 'https://api.shopkart.dev/v1');
  await assert.rejects(service.updateProject('viewer', a.id, { name: 'Denied', description: '', baseUrl: 'https://evil.example' }), /permission/);
  // Two editors using the same version: only the first save may change the row.
  const conflictInput = { ...storedInput, name: 'Concurrent endpoint', path: '/concurrent' };
  const concurrent = await service.createEndpoint('owner', a.id, conflictInput);
  const conflictKey = `endpoint:${concurrent.id}`;
  const conflictDraft = await drafts.getEndpointDraft('owner', a.id, conflictKey);
  await drafts.saveEndpointDraft('owner', a.id, conflictKey, { revision: conflictDraft.revision, writeOrder: 1, payload: '{"name":"Unsaved edits"}' });
  const competingSaves = await Promise.allSettled([
    service.updateEndpoint('owner', a.id, concurrent.id, { ...conflictInput, expectedUpdatedAt: concurrent.updatedAt, description: 'First editor', isDeprecated: true }),
    service.updateEndpoint('other', a.id, concurrent.id, { ...conflictInput, expectedUpdatedAt: concurrent.updatedAt, description: 'Second editor', isDeprecated: true }),
  ]);
  assert.equal(competingSaves.filter(result => result.status === 'fulfilled').length, 1);
  const conflict = competingSaves.find(result => result.status === 'rejected').reason;
  assert.equal(conflict.status, 409); assert.match(conflict.message, /changed since you opened/);
  const winner = (await service.getEndpoint('owner', a.id, concurrent.id)).endpoint;
  assert.notEqual(winner.updatedAt, concurrent.updatedAt);
  assert.equal(winner.isDeprecated, true);
  testUser = { id: 'owner', email: 'owner@example.com' };
  const staleResponse = await endpointRoute.PATCH(new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ ...conflictInput, expectedUpdatedAt: concurrent.updatedAt, draft: { key: conflictKey, revision: conflictDraft.revision } }) }), { params: Promise.resolve({ projectId: a.id, endpointId: concurrent.id }) });
  assert.equal(staleResponse.status, 409);
  assert.equal((await drafts.getEndpointDraft('owner', a.id, conflictKey)).payload, '{"name":"Unsaved edits"}');
  assert.deepEqual((await service.getEndpoint('owner', a.id, concurrent.id)).endpoint, winner);
  await assert.rejects(service.updateEndpoint('owner', a.id, concurrent.id, conflictInput), error => error.status === 409);
  const resolved = await service.updateEndpoint('owner', a.id, concurrent.id, { ...conflictInput, expectedUpdatedAt: winner.updatedAt, description: 'Reviewed latest version' });
  assert.equal(resolved.description, 'Reviewed latest version');
  const jsonSource = '{"amount":998.0,"rate":1.2300e+2}';
  const lexical = await service.createEndpoint('owner', a.id, endpointInputSchema.parse({
    ...storedInput, name: 'Lexical JSON example', path: '/lexical-json',
    requestBody: { contentType: 'application/json', example: JSON.parse(jsonSource), exampleSource: jsonSource },
    responses: [{ statusCode: 200, body: JSON.parse(jsonSource), bodySource: jsonSource }],
  }));
  const lexicalRoundTrip = (await service.getEndpoint('owner', a.id, lexical.id)).endpoint;
  assert.equal(lexicalRoundTrip.requestBody.exampleSource, jsonSource);
  assert.equal(lexicalRoundTrip.responses[0].bodySource, jsonSource);
  const { stringifyJson } = require('../src/lib/json-source.ts');
  assert.match(stringifyJson(lexicalRoundTrip.requestBody.example, lexicalRoundTrip.requestBody.exampleSource), /998\.0/);
  assert.equal(endpointInputSchema.safeParse({ ...storedInput, requestBody: { example: 999, exampleSource: '998.0' } }).success, false);
  const responseFormatRoute = require('../src/app/api/projects/[projectId]/response-error-format/route.ts');
  const responseContext = { params: Promise.resolve({ projectId: a.id }) };
  const sharedError = { body: { error: 'CONFLICT', message: 'Already registered' }, schemaMode: 'generated' };
  const formatRequest = value => new Request('http://localhost', { method: 'PUT', body: JSON.stringify(value) });
  await assert.rejects(service.createEndpoint('owner', a.id, { ...storedInput, name: 'No shared format yet', path: '/no-error-format', responses: [{ statusCode: 400, description: 'Invalid', useSharedError: true }] }), /Define the project error format/);
  assert.equal((await responseFormatRoute.PUT(formatRequest(sharedError), responseContext)).status, 200);
  assert.equal((await service.getProjectDetail('owner', a.id)).responseErrorFormat.body.message, 'Already registered');
  testUser = { id: 'viewer', email: 'viewer@example.com' };
  assert.equal((await responseFormatRoute.PUT(formatRequest(sharedError), responseContext)).status, 403);
  assert.equal((await responseFormatRoute.PUT(formatRequest(sharedError), { params: Promise.resolve({ projectId: b.id }) })).status, 404);
  testUser = { id: 'owner', email: 'owner@example.com' };
  const responseEndpoint = await service.createEndpoint('owner', a.id, endpointInputSchema.parse({ ...storedInput, name: 'Response contract endpoint', path: '/response-contract', responses: [
    { statusCode: 201, description: 'Created', isSuccess: true, body: { token: 'example', user: { image: null } }, schemaMode: 'generated' },
    { statusCode: 409, description: 'Email already registered', useSharedError: true },
  ] }));
  const savedResponses = (await service.getEndpoint('owner', a.id, responseEndpoint.id)).endpoint.responses;
  assert.equal(savedResponses[0].isSuccess, true);
  assert.equal(savedResponses[0].schema.properties.user.properties.image.type, 'null');
  assert.equal(savedResponses[1].useSharedError, true); assert.equal(savedResponses[1].body, undefined);
  const { resolveResponse } = require('../src/lib/response-contract.ts');
  assert.equal(resolveResponse(savedResponses[1], (await service.getProjectDetail('owner', a.id)).responseErrorFormat).body.message, 'Already registered');
  await responseFormatRoute.PUT(formatRequest({ ...sharedError, body: { error: 'CONFLICT', message: 'New shared message' } }), responseContext);
  assert.equal(resolveResponse(savedResponses[1], (await service.getProjectDetail('owner', a.id)).responseErrorFormat).body.message, 'New shared message');
  const customSchema = { type: 'object', required: ['user'], properties: { user: { type: 'object', required: ['image'], properties: { image: { type: ['string', 'null'] } } } } };
  const editedResponses = await service.updateEndpoint('owner', a.id, responseEndpoint.id, { ...storedInput, name: responseEndpoint.name, path: responseEndpoint.path, expectedUpdatedAt: responseEndpoint.updatedAt, responses: [{ ...savedResponses[0], schemaMode: 'custom', schema: customSchema }] });
  assert.deepEqual(editedResponses.responses[0].schema, customSchema);
  // Provider failure preserves a retryable invite, and missing configuration writes nothing.
  const emailCount = invitationEmails.length;
  await assert.rejects(collaboration.createInvitation('other', a.id, { email: 'retry@example.com', role: 'editor' }), error => error.status === 403);
  assert.equal(invitationEmails.length, emailCount);
  delete process.env.RESEND_API_KEY;
  await assert.rejects(collaboration.createInvitation('owner', a.id, { email: 'retry@example.com', role: 'editor' }), error => error.status === 503);
  assert.equal((await collaboration.listInvitations('owner', a.id)).some(invite => invite.email === 'retry@example.com'), false);
  process.env.RESEND_API_KEY = 'test-only-key';
  const acceptedFetch = global.fetch;
  global.fetch = async () => Response.json({ error: 'provider failed' }, { status: 500 });
  await assert.rejects(collaboration.createInvitation('owner', a.id, { email: 'retry@example.com', role: 'editor' }), error => error.status === 502);
  const savedInvite = (await collaboration.listInvitations('owner', a.id)).find(invite => invite.email === 'retry@example.com');
  assert.ok(savedInvite);
  global.fetch = acceptedFetch;
  const resent = await collaboration.createInvitation('owner', a.id, { email: 'retry@example.com', role: 'viewer' });
  assert.equal(resent.id, savedInvite.id);
  assert.notEqual(resent.link, savedInvite.link);
  assert.equal(invitationEmails.at(-1).template.variables.INVITE_URL, resent.link);
  assert.equal(invitationEmails.at(-1).template.variables.ROLE, 'Viewer');
  await assert.rejects(collaboration.previewInvitation(savedInvite.link.split('/').pop()), /not found/);
  await pg.close();
});
