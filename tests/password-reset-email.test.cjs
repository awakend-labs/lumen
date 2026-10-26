require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sendPasswordResetEmail } = require('../src/server/password-reset-email.ts');

test('Resend uses the published template, server credentials and exact RESET_URL variable', async t => {
  const originalFetch = global.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  const originalTemplate = process.env.RESEND_PASSWORD_RESET_TEMPLATE_ID;
  t.after(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey;
    if (originalTemplate === undefined) delete process.env.RESEND_PASSWORD_RESET_TEMPLATE_ID; else process.env.RESEND_PASSWORD_RESET_TEMPLATE_ID = originalTemplate;
  });
  process.env.RESEND_API_KEY = 'test-only-key';
  delete process.env.RESEND_PASSWORD_RESET_TEMPLATE_ID;
  const input = { email: 'reset@example.com', url: 'https://lumen.example/api/auth/reset-password/test-token?callbackURL=%2Freset-password' };
  let calls = 0;
  global.fetch = async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer test-only-key');
    assert.ok(options.signal instanceof AbortSignal);
    assert.deepEqual(JSON.parse(options.body), { to: [input.email], template: { id: 'lumen-password-reset-template', variables: { RESET_URL: input.url } } });
    return Response.json({ id: 'accepted-message' });
  };
  await sendPasswordResetEmail(input);
  assert.equal(calls, 1);

  process.env.RESEND_PASSWORD_RESET_TEMPLATE_ID = 'custom-template';
  global.fetch = async (_url, options) => {
    assert.equal(JSON.parse(options.body).template.id, 'custom-template');
    return Response.json({ id: 'accepted-message' });
  };
  await sendPasswordResetEmail(input);
  for (const status of [401, 422, 429, 500]) {
    global.fetch = async () => Response.json({ message: `private: ${input.url} ${input.email}` }, { status });
    await assert.rejects(sendPasswordResetEmail(input), error => {
      assert.match(error.message, new RegExp(`status ${status}`));
      assert.doesNotMatch(error.message, /private:|reset@example|test-token|test-only-key/);
      return true;
    });
  }
  global.fetch = async () => { throw new Error(`private: ${input.url}`); };
  await assert.rejects(sendPasswordResetEmail(input), /could not be sent/);
  global.fetch = async () => Response.json({});
  await assert.rejects(sendPasswordResetEmail(input), /not accepted/);
  global.fetch = async () => new Response('not json');
  await assert.rejects(sendPasswordResetEmail(input), /not accepted/);
  delete process.env.RESEND_API_KEY;
  global.fetch = () => { throw new Error('Must not send without configuration'); };
  await assert.rejects(sendPasswordResetEmail(input), /not configured/);
});
