require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { eq } = require('drizzle-orm');
const { PGlite } = require('@electric-sql/pglite');
const schema = require('../src/db/schema');
const pg = new PGlite();
const db = require('drizzle-orm/pglite').drizzle(pg, { schema });
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '@/db') return { db };
  return originalLoad.call(this, request, parent, isMain);
};

test('real Better Auth reset emails, tokens, expiry, password changes and session revocation', async t => {
  const originalFetch = global.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  const originalTemplate = process.env.RESEND_PASSWORD_RESET_TEMPLATE_ID;
  t.after(async () => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey;
    if (originalTemplate === undefined) delete process.env.RESEND_PASSWORD_RESET_TEMPLATE_ID; else process.env.RESEND_PASSWORD_RESET_TEMPLATE_ID = originalTemplate;
    await pg.close();
  });
  const dir = path.resolve(__dirname, '../drizzle');
  for (const file of fs.readdirSync(dir).filter(file => file.endsWith('.sql')).sort()) await pg.exec(fs.readFileSync(path.join(dir, file), 'utf8'));
  process.env.RESEND_API_KEY = 'test-only-key';
  process.env.RESEND_PASSWORD_RESET_TEMPLATE_ID = 'password-reset';
  const envelopes = [];
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    envelopes.push(JSON.parse(options.body));
    return Response.json({ id: `test-email-${envelopes.length}` });
  };
  const { auth: configured } = require('../src/lib/auth.ts');
  const { betterAuth } = await import('better-auth');
  const origin = 'http://localhost:3000';
  const errors = [];
  const auth = betterAuth({ ...configured.options, baseURL: origin, trustedOrigins: [origin], plugins: [], logger: { level: 'error', log: (level, message, ...args) => errors.push({ level, message, args }) } });
  const email = 'password-reset@example.com';
  const password = 'original-test-password';
  await auth.api.signUpEmail({ body: { name: 'Reset test', email, password } });
  const signIn = () => auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
  const firstSession = await signIn();
  const secondSession = await signIn();
  const cookies = [firstSession, secondSession].map(result => result.headers.get('set-cookie').split(';')[0]);
  const requestReset = address => auth.api.requestPasswordReset({ body: { email: address, redirectTo: `${origin}/reset-password` } });
  const known = await requestReset(email);
  const unknown = await requestReset('missing@example.com');
  assert.deepEqual(unknown, known, 'Do not expose whether an email is registered');
  assert.equal(envelopes.length, 1);
  assert.deepEqual(envelopes[0].to, [email]);
  const url = new URL(envelopes[0].template.variables.RESET_URL);
  assert.equal(url.origin, origin);
  assert.equal(url.searchParams.get('callbackURL'), `${origin}/reset-password`);
  const token = url.pathname.split('/').at(-1);
  const [row] = await db.select().from(schema.verification).where(eq(schema.verification.identifier, `reset-password:${token}`));
  const remaining = row.expiresAt.getTime() - Date.now();
  assert.ok(remaining > 29 * 60_000 && remaining <= 30 * 60_000);
  assert.equal(row.value, firstSession.response.user.id);
  const callback = await auth.handler(new Request(url));
  assert.equal(callback.status, 302);
  const redirected = new URL(callback.headers.get('location'));
  assert.equal(redirected.pathname, '/reset-password');
  assert.equal(redirected.searchParams.get('token'), token);
  const untrusted = await auth.handler(new Request(`${origin}/api/auth/request-password-reset`, {
    method: 'POST', headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify({ email, redirectTo: 'https://untrusted.example/reset-password' }),
  }));
  assert.equal(untrusted.status, 403);
  assert.equal(envelopes.length, 1, 'Untrusted callbacks must never receive a reset email');
  await assert.rejects(auth.api.resetPassword({ body: { token: 'invalid-token', newPassword: 'new-test-password' } }));
  await assert.rejects(auth.api.resetPassword({ body: { token, newPassword: 'short' } }));
  await assert.rejects(auth.api.resetPassword({ body: { token, newPassword: 'a'.repeat(129) } }));
  await auth.api.resetPassword({ body: { token, newPassword: 'new-test-password' } });
  assert.equal((await pg.query('select * from verification where identifier = $1', [`reset-password:${token}`])).rows.length, 0);
  for (const cookie of cookies) assert.equal(await auth.api.getSession({ headers: new Headers({ cookie }) }), null);
  await assert.rejects(signIn(), 'The old password no longer works');
  const updated = await auth.api.signInEmail({ body: { email, password: 'new-test-password' } });
  assert.equal(updated.user.email, email);
  const stored = (await pg.query('select password from account where user_id = $1', [updated.user.id])).rows[0].password;
  assert.notEqual(stored, 'new-test-password');
  await assert.rejects(auth.api.resetPassword({ body: { token, newPassword: 'replayed-test-password' } }));

  await requestReset(email);
  const expiredURL = new URL(envelopes.at(-1).template.variables.RESET_URL);
  const expiredToken = expiredURL.pathname.split('/').at(-1);
  await db.update(schema.verification).set({ expiresAt: new Date(Date.now() - 60_000) }).where(eq(schema.verification.identifier, `reset-password:${expiredToken}`));
  const expiredCallback = await auth.handler(new Request(expiredURL));
  assert.equal(new URL(expiredCallback.headers.get('location')).searchParams.get('error'), 'INVALID_TOKEN');
  await assert.rejects(auth.api.resetPassword({ body: { token: expiredToken, newPassword: 'expired-test-password' } }));
  global.fetch = async () => Response.json({ message: 'Provider unavailable' }, { status: 503 });
  // Better Auth deliberately keeps delivery failures private so an outage cannot
  // reveal which addresses have accounts. The sender rejects and logs safely.
  assert.deepEqual(await requestReset(email), known);
  assert.ok(errors.length > 0);
  const logged = errors.flatMap(entry => entry.args).filter(value => value instanceof Error).map(error => error.message).join(' ');
  assert.match(logged, /status 503/);
  assert.doesNotMatch(logged, /password-reset@example|test-only-key|callbackURL/);

  const limited = betterAuth({ ...configured.options, baseURL: origin, trustedOrigins: [origin], plugins: [], rateLimit: { enabled: true }, logger: { disabled: true } });
  for (let i = 0; i < 4; i++) {
    const response = await limited.handler(new Request(`${origin}/api/auth/request-password-reset`, {
      method: 'POST', headers: { 'content-type': 'application/json', origin, 'x-forwarded-for': '192.0.2.55' },
      body: JSON.stringify({ email: 'missing@example.com', redirectTo: `${origin}/reset-password` }),
    }));
    assert.equal(response.status, i === 3 ? 429 : 200);
  }
});
