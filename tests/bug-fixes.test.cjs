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

test('pre-hydration fallback never reads credentials or redirects them into a URL', () => {
  const { POST } = require('../src/app/api/auth/form-unavailable/route.ts');
  const request = new Request('https://lumen.example/api/auth/form-unavailable?mode=login', { method: 'POST', body: 'email=test-only&password=test-only' });
  request.text = () => { throw new Error('Must not read credentials'); };
  const response = POST(request);
  assert.equal(response.status, 303); assert.equal(response.headers.get('location'), 'https://lumen.example/login');
});

test('workspace search immediately matches cached routes and tags without duplicate projects', () => {
  const { searchCachedWorkspace } = require('../src/lib/workspace-search.ts');
  const project = { id: 'project', name: 'Commerce', description: '', stashes: [{ id: 'stash', name: 'Products', description: '', endpoints: [{ id: 'endpoint', name: 'List products', method: 'GET', path: '/products', description: '', tags: ['catalog'], version: 'v1' }] }] };
  assert.equal(searchCachedWorkspace('commerce', [project], [project]).length, 1);
  const route = searchCachedWorkspace('GET /products', [], [project]);
  assert.equal(route.length, 1); assert.equal(route[0].href, '/projects/project/endpoints/endpoint');
  assert.equal(searchCachedWorkspace('catalog', [], [project])[0].id, 'endpoint');
  assert.deepEqual(searchCachedWorkspace('x', [project], [project]), []);
});
