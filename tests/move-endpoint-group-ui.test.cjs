require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
global.IS_REACT_ACT_ENVIRONMENT = true;
let requests, result, project, closeCount;
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '@/features/projects/queries') return {
    useProject: () => ({ data: project }),
    projectKeys: { all: ['projects'], summary: id => ['project-summary', id] },
  };
  if (request === '@/lib/api') return { api: async (url, init) => {
    requests.push({ url, body: JSON.parse(init.body) });
    return result();
  } };
  if (request === 'sonner') return { toast: { success() {} } };
  if (request === '@/components/ui/dialog') return new Proxy({}, { get: (_, key) =>
    ({ children }) => React.createElement(key === 'Dialog' ? 'section' : 'div', null, children) });
  if (request === '@/components/ui/select') return {
    Select: ({ value, onValueChange, disabled, children }) => React.createElement('select', { value, disabled, onChange: event => onValueChange(event.target.value) }, children),
    SelectItem: ({ value, children }) => React.createElement('option', { value }, children),
    SelectTrigger: () => null, SelectValue: () => null,
    SelectContent: ({ children }) => children,
  };
  return originalLoad.call(this, request, parent, isMain);
};
const { MoveEndpointGroupDialog } = require('../src/features/endpoints/components/move-endpoint-group-dialog.tsx');
const endpoint = { id: 'endpoint', stashId: 'stash', groupId: 'one', name: 'Sign in', updatedAt: '2026-10-23T00:00:00.000Z' };
async function fixture(t, overrides = {}, groups = [{ id: 'one', name: 'One' }, { id: 'two', name: 'Two' }]) {
  requests = []; closeCount = 0;
  project = { role: 'owner', stashes: [{ id: 'stash', groups }, { id: 'other', groups: [{ id: 'private', name: 'Private' }] }] };
  result = () => ({ ...endpoint, ...overrides, groupId: 'two' });
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidations = [];
  client.invalidateQueries = async options => { invalidations.push(options.queryKey); };
  let renderer;
  await act(async () => { renderer = create(React.createElement(QueryClientProvider, { client }, React.createElement(MoveEndpointGroupDialog, {
    projectId: 'project', endpoint: { ...endpoint, ...overrides }, onClose: () => { closeCount++; },
  }))); });
  t.after(async () => { await act(async () => renderer.unmount()); client.clear(); });
  return {
    root: renderer.root, client, invalidations,
    async choose(value) { await act(async () => renderer.root.findByType('select').props.onChange({ target: { value } })); },
    async submit() { await act(async () => { renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); await new Promise(resolve => setTimeout(resolve, 20)); }); },
  };
}
test('only other groups in the current stash are offered; saving refreshes data and preserves version checks', async t => {
  const f = await fixture(t);
  assert.deepEqual(f.root.findAllByType('option').map(node => node.props.value), ['two', 'ungrouped']);
  assert.equal(f.root.findByProps({ type: 'submit' }).props.disabled, true);
  await f.submit(); assert.equal(requests.length, 0);
  await f.choose('two'); await f.submit();
  assert.deepEqual(requests, [{ url: '/api/projects/project/endpoints/endpoint', body: { stashId: 'stash', groupId: 'two', expectedUpdatedAt: endpoint.updatedAt } }]);
  assert.equal(f.client.getQueryData(['endpoints', 'project', 'endpoint']).endpoint.groupId, 'two');
  assert.ok(f.invalidations.some(key => key[0] === 'project-summary'));
  assert.ok(f.invalidations.some(key => key[0] === 'search'));
  assert.equal(closeCount, 1);
});
test('moving to Ungrouped sends null and failed saves keep the dialog open', async t => {
  const f = await fixture(t);
  result = () => { throw new Error('Endpoint changed. Reload it.'); };
  await f.choose('ungrouped'); await f.submit();
  assert.equal(requests[0].body.groupId, null);
  assert.equal(closeCount, 0);
  assert.equal(f.root.findByProps({ role: 'alert' }).props.children, 'Endpoint changed. Reload it.');
});
test('an ungrouped endpoint can join a group; without groups submission stays disabled', async t => {
  const f = await fixture(t, { groupId: null });
  assert.deepEqual(f.root.findAllByType('option').map(node => node.props.value), ['one', 'two']);
  await f.choose('one'); await f.submit();
  assert.equal(requests[0].body.groupId, 'one');
  const empty = await fixture(t, { groupId: null }, []);
  assert.equal(empty.root.findAllByType('select').length, 0);
  assert.equal(empty.root.findByProps({ type: 'submit' }).props.disabled, true);
  await empty.submit(); assert.equal(requests.length, 0);
});
