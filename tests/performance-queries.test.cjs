require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { QueryClient, QueryClientProvider, QueryObserver } = require('@tanstack/react-query');
global.IS_REACT_ACT_ENVIRONMENT = true;
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'sonner') return { toast: { success() {}, error() {} } };
  if (request === 'next/navigation') return { useRouter: () => ({ replace() {} }) };
  return originalLoad.call(this, request, parent, isMain);
};
const projects = require('../src/features/projects/queries.ts');
const { useEndpoint } = require('../src/features/endpoints/queries.ts');
const { useSaveEndpoint, useDeleteEndpoint } = require('../src/features/endpoints/queries.ts');
const { toEndpointSummary } = require('../src/lib/endpoint-summary.ts');
const { useUpdateStash } = require('../src/features/stashes/queries.ts');

async function fixture(t, hook) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  let result, renderer;
  function Harness() { result = hook(); return null; }
  const oldFetch = global.fetch;
  t.after(async () => { await act(async () => renderer?.unmount()); client.clear(); global.fetch = oldFetch; });
  return {
    client,
    get result() { return result; },
    async mount() { await act(async () => { renderer = create(React.createElement(QueryClientProvider, { client }, React.createElement(Harness))); }); },
  };
}

for (const [name, hook, key] of [
  ['project list', projects.useProjects, ['projects']],
  ['project detail', () => projects.useProject('p'), ['project-summary', 'p']],
  ['endpoint detail', () => useEndpoint('p', 'e'), ['endpoints', 'p', 'e']],
]) {
  test(`cancelling ${name} aborts its underlying HTTP request`, async t => {
    const f = await fixture(t, hook);
    let signal, aborted = false;
    global.fetch = (_url, init) => new Promise((_resolve, reject) => {
      signal = init.signal;
      signal.addEventListener('abort', () => { aborted = true; reject(new DOMException('Cancelled', 'AbortError')); }, { once: true });
    });
    await f.mount();
    assert.ok(signal instanceof AbortSignal);
    await act(async () => f.client.cancelQueries({ queryKey: key, exact: true }));
    assert.equal(aborted, true);
    assert.equal(f.client.getQueryState(key).fetchStatus, 'idle');
  });
}

for (const [name, hook, input] of [
  ['project update', () => projects.useUpdateProject('p'), { name: 'Changed', description: '' }],
  ['stash update', () => useUpdateStash('p'), { stashId: 's', input: { name: 'Changed', description: '', color: 'blue' } }],
]) {
  test(`${name} refreshes the list and affected project without refetching unrelated projects`, async t => {
    const f = await fixture(t, hook);
    const reads = [0, 0, 0];
    const keys = [['projects'], ['project-summary', 'p'], ['project-summary', 'other']];
    keys.forEach((key, index) => {
      const data = index === 0 ? [{ id: 'p' }] : { id: key[1], stashes: [] };
      f.client.setQueryData(key, data);
      const observer = new QueryObserver(f.client, { queryKey: key, queryFn: async () => { reads[index]++; return data; } });
      const unsubscribe = observer.subscribe(() => {});
      t.after(unsubscribe);
    });
    global.fetch = async () => Response.json({ id: 'p' });
    await f.mount();
    await act(async () => { await f.result.mutateAsync(input); });
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(reads, [1, 1, 0]);
    assert.equal(f.client.getQueryState(keys[2]).isInvalidated, false);
  });
}

test('failed project status changes restore both list and detail snapshots', async t => {
  const f = await fixture(t, projects.useSetProjectStatus);
  const list = [{ id: 'p', status: 'in_progress' }];
  const detail = { id: 'p', status: 'in_progress', stashes: [] };
  f.client.setQueryData(['projects'], list);
  f.client.setQueryData(['project-summary', 'p'], detail);
  let fail;
  global.fetch = () => new Promise(resolve => { fail = () => resolve(Response.json({ error: 'Save failed' }, { status: 500 })); });
  await f.mount();
  let settled;
  await act(async () => { settled = f.result.mutateAsync({ projectId: 'p', status: 'documented' }).catch(error => error); });
  assert.equal(f.client.getQueryData(['projects'])[0].status, 'documented');
  assert.equal(f.client.getQueryData(['project-summary', 'p']).status, 'documented');
  await act(async () => { fail(); await settled; });
  assert.deepEqual(f.client.getQueryData(['projects']), list);
  assert.deepEqual(f.client.getQueryData(['project-summary', 'p']), detail);
});

test('saving keeps summaries light while caching the entire endpoint document separately', async t => {
  const f = await fixture(t, () => useSaveEndpoint('p', 'e'));
  const endpoint = { id: 'e', projectId: 'p', stashId: 's', groupId: null, name: 'Updated', method: 'GET', path: '/test', baseUrl: '', version: '', description: 'Find me', tags: ['search'], access: 'public', isDeprecated: false, order: 0, createdAt: 'now', updatedAt: 'new', headers: [], queryParams: [], pathParams: [], requestBody: { exampleSource: '{"value":998.0}' }, responses: [{ statusCode: 200, description: 'Success', body: { big: 'x'.repeat(12000) } }] };
  f.client.setQueryData(['project-summary', 'p'], { id: 'p', role: 'editor', stashes: [{ id: 's', endpoints: [toEndpointSummary({ ...endpoint, name: 'Before' })] }] });
  global.fetch = async () => Response.json(endpoint);
  await f.mount();
  await act(async () => { await f.result.mutateAsync({}); });
  const summary = f.client.getQueryData(['project-summary', 'p']).stashes[0].endpoints[0];
  assert.deepEqual(summary, toEndpointSummary(endpoint));
  assert.equal(Object.hasOwn(summary, 'responses'), false);
  assert.deepEqual(f.client.getQueryData(['endpoints', 'p', 'e']), { endpoint, role: 'editor' });
});

test('endpoint deletion removes its full-document cache and retains unrelated endpoint data', async t => {
  const f = await fixture(t, () => useDeleteEndpoint('p'));
  f.client.setQueryData(['project-summary', 'p'], { id: 'p', stashes: [{ id: 's', endpoints: [{ id: 'e' }, { id: 'other' }] }] });
  f.client.setQueryData(['endpoints', 'p', 'e'], { endpoint: { id: 'e' } });
  f.client.setQueryData(['endpoints', 'p', 'other'], { endpoint: { id: 'other' } });
  global.fetch = async () => new Response(null, { status: 204 });
  await f.mount();
  await act(async () => { await f.result.mutateAsync('e'); });
  assert.equal(f.client.getQueryData(['endpoints', 'p', 'e']), undefined);
  assert.equal(f.client.getQueryData(['endpoints', 'p', 'other']).endpoint.id, 'other');
  assert.deepEqual(f.client.getQueryData(['project-summary', 'p']).stashes[0].endpoints, [{ id: 'other' }]);
});
