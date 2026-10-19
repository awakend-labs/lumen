require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { PGlite } = require('@electric-sql/pglite');
const schema = require('../src/db/schema');
const pg = new PGlite();
const statements = [];
const db = require('drizzle-orm/pglite').drizzle(pg, { schema, logger: { logQuery(query) { statements.push(query); } } });
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '@/db') return { db };
  return originalLoad.call(this, request, parent, isMain);
};

test('real Better Auth joins sign-in data and reads a session in one database query', async () => {
  try {
    const dir = path.resolve(__dirname, '../drizzle');
    for (const file of fs.readdirSync(dir).filter(file => file.endsWith('.sql')).sort()) await pg.exec(fs.readFileSync(path.join(dir, file), 'utf8'));
    const { auth: configured } = require('../src/lib/auth.ts');
    const { betterAuth } = await import('better-auth');
    // Next cookies are handled by the real route. Exercise its database configuration outside Next.
    const auth = betterAuth({ ...configured.options, baseURL: 'http://localhost:3000', trustedOrigins: ['http://localhost:3000'], plugins: [] });
    await auth.api.signUpEmail({ body: { name: 'Join check', email: 'join-check@example.com', password: 'local-test-password-only' } });
    statements.length = 0;
    const signedIn = await auth.api.signInEmail({ body: { email: 'join-check@example.com', password: 'local-test-password-only' }, returnHeaders: true });
    assert.equal(signedIn.response.user.email, 'join-check@example.com');
    const selects = statements.filter(query => /^select /i.test(query));
    assert.equal(selects.length, 1, 'User and account must be read together');
    assert.match(selects[0], /join/i);
    const cookie = signedIn.headers.get('set-cookie').split(';')[0];
    statements.length = 0;
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    assert.equal(session.user.id, signedIn.response.user.id);
    assert.equal(statements.filter(query => /^select /i.test(query)).length, 1, 'Session and user must be read together');
    await assert.rejects(auth.api.signInEmail({ body: { email: 'join-check@example.com', password: 'incorrect-local-test-only' } }));
    await auth.api.signOut({ headers: new Headers({ cookie }) });
    assert.equal(await auth.api.getSession({ headers: new Headers({ cookie }) }), null);
  } finally { await pg.close(); }
});
