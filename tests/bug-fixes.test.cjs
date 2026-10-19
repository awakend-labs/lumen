require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { confirmSignOut, registerSignOutGuard } = require('../src/lib/unsaved-changes.ts');
const { toErrorResponse } = require('../src/server/http.ts');
const { projectInputSchema, endpointInputSchema } = require('../src/lib/validators.ts');

test('sign-out can be cancelled before destroying an unsaved draft and the guard cleans up', () => {
  global.window = new EventTarget();
  let prompted = 0;
  const cleanup = registerSignOutGuard(() => { prompted += 1; return false; });
  assert.equal(confirmSignOut(), false); assert.equal(prompted, 1);
  cleanup(); assert.equal(confirmSignOut(), true); assert.equal(prompted, 1);
  const allowCleanup = registerSignOutGuard(() => true);
  assert.equal(confirmSignOut(), true); allowCleanup(); delete global.window;
});

test('overlength names show a clear limit in validation and API errors', async () => {
  const project = projectInputSchema.safeParse({ name: 'x'.repeat(81) });
  assert.equal(project.success, false);
  assert.equal((await toErrorResponse(project.error).json()).error, 'Name must be 80 characters or fewer.');
  const name = endpointInputSchema.shape.name.safeParse('x'.repeat(121));
  assert.equal(name.success, false); assert.equal(name.error.issues[0].message, 'Name must be 120 characters or fewer.');
});
