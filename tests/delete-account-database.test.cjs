require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { PGlite } = require('@electric-sql/pglite');
const schema = require('../src/db/schema');
const pg = new PGlite();
const db = require('drizzle-orm/pglite').drizzle(pg, { schema });
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '@/db') return { db };
  return originalLoad.call(this, request, parent, isMain);
};

test('account deletion requires authentication and password, cascades owned data, preserves other projects and revokes every session', async t => {
  t.after(async () => pg.close());
  const dir = path.resolve(__dirname, '../drizzle');
  for (const file of fs.readdirSync(dir).filter(file => file.endsWith('.sql')).sort()) await pg.exec(fs.readFileSync(path.join(dir, file), 'utf8'));
  const { auth: configured } = require('../src/lib/auth.ts');
  const { betterAuth } = await import('better-auth');
  const origin = 'http://localhost:3000';
  const auth = betterAuth({ ...configured.options, baseURL: origin, trustedOrigins: [origin], plugins: [] });
  const email = 'delete-account@example.com';
  const password = 'local-deletion-test-password';
  const deleted = await auth.api.signUpEmail({ body: { name: 'Delete me', email, password } });
  const other = await auth.api.signUpEmail({ body: { name: 'Keep me', email: 'keep-account@example.com', password } });
  const cookies = [];
  for (let i = 0; i < 2; i++) {
    const signedIn = await auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
    cookies.push(signedIn.headers.get('set-cookie').split(';')[0]);
  }
  const headers = new Headers({ cookie: cookies[0] });
  const [owned] = await db.insert(schema.projects).values({ name: 'Owned', slug: 'owned', ownerId: deleted.user.id }).returning();
  const [shared] = await db.insert(schema.projects).values({ name: 'Shared', slug: 'shared', ownerId: other.user.id }).returning();
  const [stash] = await db.insert(schema.stashes).values({ projectId: owned.id, name: 'Stash' }).returning();
  const [group] = await db.insert(schema.apiGroups).values({ stashId: stash.id, name: 'Group' }).returning();
  await db.insert(schema.endpoints).values({ projectId: owned.id, stashId: stash.id, groupId: group.id, name: 'Endpoint', method: 'GET', path: '/example' });
  await db.insert(schema.userPreferences).values({ userId: deleted.user.id, theme: 'dark' });
  await db.insert(schema.projectMembers).values([
    { projectId: owned.id, userId: other.user.id, role: 'editor', invitedBy: deleted.user.id },
    { projectId: shared.id, userId: deleted.user.id, role: 'viewer', invitedBy: other.user.id },
    { projectId: shared.id, userId: other.user.id, role: 'owner', invitedBy: deleted.user.id },
  ]);
  await db.insert(schema.invitations).values({ projectId: owned.id, email: 'invite@example.com', role: 'viewer', token: 'local-test-invite', expiresAt: new Date(Date.now() + 60_000) });
  await assert.rejects(auth.api.deleteUser({ body: { password } }), error => error.statusCode === 401);
  for (const body of [{}, { password: '' }]) {
    await assert.rejects(auth.api.deleteUser({ headers, body }), error => error.body?.code === 'PASSWORD_REQUIRED');
  }
  await assert.rejects(auth.api.deleteUser({ headers, body: { password: 'wrong-password' } }), error => error.body?.code === 'INVALID_PASSWORD');
  assert.equal((await db.select().from(schema.projects)).length, 2);
  assert.ok(await auth.api.getSession({ headers }));
  const untrusted = await auth.handler(new Request(`${origin}/api/auth/delete-user`, {
    method: 'POST', headers: { cookie: cookies[0], origin: 'https://untrusted.example', 'content-type': 'application/json' }, body: JSON.stringify({ password }),
  }));
  assert.equal(untrusted.status, 403);
  const response = await auth.handler(new Request(`${origin}/api/auth/delete-user`, {
    method: 'POST', headers: { cookie: cookies[0], origin, 'content-type': 'application/json' }, body: JSON.stringify({ password }),
  }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  assert.deepEqual((await db.select().from(schema.user)).map(row => row.id), [other.user.id]);
  assert.deepEqual((await db.select().from(schema.projects)).map(row => row.id), [shared.id]);
  for (const table of [schema.stashes, schema.apiGroups, schema.endpoints, schema.invitations, schema.userPreferences]) {
    assert.equal((await db.select().from(table)).length, 0);
  }
  const members = await db.select().from(schema.projectMembers);
  assert.equal(members.length, 1);
  assert.equal(members[0].userId, other.user.id);
  assert.equal(members[0].invitedBy, null);
  assert.ok((await db.select().from(schema.account)).every(row => row.userId !== deleted.user.id));
  for (const cookie of cookies) assert.equal(await auth.api.getSession({ headers: new Headers({ cookie }) }), null);
  await assert.rejects(auth.api.signInEmail({ body: { email, password } }));
  await assert.rejects(auth.api.deleteUser({ headers, body: { password } }), error => error.statusCode === 401);
});
