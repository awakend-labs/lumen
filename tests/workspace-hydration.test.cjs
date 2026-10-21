require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
let session = null;
const calls = [];
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (parent?.filename.endsWith('layout.tsx') && parent.filename.includes('(workspace)')) {
    if (request === 'next/headers') return { cookies: async () => ({ get: () => ({ value: 'false' }) }) };
    if (request === '@/components/app-shell') return { AppShell: () => null };
    if (request === '@/server/session') return { getServerSession: async () => session };
    if (request === '@/server/projects') return { listProjects: async id => { calls.push(id); return [{ id, name: 'Project' }]; } };
    if (request === '@/server/preferences') return { getEndpointView: async id => id === 'first' ? 'list' : 'grid' };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const Layout = require('../src/app/(workspace)/layout.tsx').default;

test('shell and page share request-local hydration without serializing session secrets', async () => {
  session = { user: { id: 'first' }, session: { token: 'never-serialize-this' } };
  const first = await Layout({ children: 'page' });
  assert.equal(first.props.children.props.defaultOpen, false);
  assert.equal(first.props.children.props.children, 'page');
  const data = first.props.state.queries.map(query => query.state.data);
  assert.deepEqual(data, [[{ id: 'first', name: 'Project' }], { endpointView: 'list' }]);
  assert.doesNotMatch(JSON.stringify(first.props.state), /never-serialize-this/);
  session = { user: { id: 'second' } };
  const second = await Layout({ children: 'another page' });
  assert.deepEqual(second.props.state.queries[0].state.data, [{ id: 'second', name: 'Project' }]);
  assert.deepEqual(first.props.state.queries[0].state.data, [{ id: 'first', name: 'Project' }]);
  session = null;
  const anonymous = await Layout({ children: 'page' });
  assert.equal(anonymous.props.state.queries.length, 0);
  assert.deepEqual(calls, ['first', 'second']);
});
