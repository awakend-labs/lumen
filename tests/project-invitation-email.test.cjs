require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sendProjectInvitationEmail } = require('../src/server/project-invitation-email.ts');

test('invitation email sends exact template variables and handles provider failures safely', async t => {
  const originalFetch = global.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  t.after(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });
  process.env.RESEND_API_KEY = 'test-only-key';
  const input = { email: 'invitee@example.com', url: 'https://lumen.example/invite/private-token', inviterName: 'Owner', projectName: 'Example', role: 'editor' };
  for (const role of ['editor', 'viewer']) {
    global.fetch = async (url, options) => {
      assert.equal(url, 'https://api.resend.com/emails');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers.Authorization, 'Bearer test-only-key');
      assert.ok(options.signal instanceof AbortSignal);
      assert.deepEqual(JSON.parse(options.body), {
        to: [input.email],
        template: { id: 'lumen-project-invitation-template', variables: {
          INVITER_NAME: input.inviterName, PROJECT_NAME: input.projectName,
          ROLE: role === 'editor' ? 'Editor' : 'Viewer', INVITE_URL: input.url,
        } },
      });
      return Response.json({ id: 'accepted-message' });
    };
    await sendProjectInvitationEmail({ ...input, role });
  }
  for (const status of [401, 422, 429, 500]) {
    global.fetch = async () => Response.json({ message: `${input.url} ${input.email} test-only-key` }, { status });
    await assert.rejects(sendProjectInvitationEmail(input), error => {
      assert.equal(error.status, 502);
      assert.match(error.message, /saved.*could not be sent/);
      assert.doesNotMatch(error.message, /private-token|invitee@example|test-only-key/);
      return true;
    });
  }
  global.fetch = async () => { throw new Error(input.url); };
  await assert.rejects(sendProjectInvitationEmail(input), /sending could not be confirmed/);
  for (const response of [Response.json({}), Response.json({ id: 123 }), new Response('not json')]) {
    global.fetch = async () => response;
    await assert.rejects(sendProjectInvitationEmail(input), /sending could not be confirmed/);
  }
  delete process.env.RESEND_API_KEY;
  global.fetch = () => { throw new Error('Must not send without configuration'); };
  await assert.rejects(sendProjectInvitationEmail(input), error => error.status === 503);
});
