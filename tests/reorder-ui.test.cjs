require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');
const Module = require('node:module');
const originalLoad = Module._load;
global.IS_REACT_ACT_ENVIRONMENT = true;
let mode = 'grid', endpointSaves = [], stashSaves = [], sortableOptions = [];
const sortable = require('@dnd-kit/sortable');
const { DndContext: MemoDndContext } = require('@dnd-kit/core');
const DndContext = MemoDndContext.type ?? MemoDndContext;
const { gridReorderModifiers, listReorderModifiers } = require('../src/lib/reorder.ts');
const activatorRef = () => {};
Module._load = function(request, parent, isMain) {
  if (request === '@/components/ui/collapsible') return {
    Collapsible: ({ children }) => React.createElement('div', null, children),
    CollapsibleContent: ({ children }) => React.createElement('div', null, children),
    CollapsibleTrigger: ({ children }) => children,
  };
  if (request === '@/components/ui/dropdown-menu') return new Proxy({}, { get: (_, key) =>
    key === 'DropdownMenuContent' ? () => null : ({ children }) => React.createElement(React.Fragment, null, children) });
  if (request === '@dnd-kit/sortable') return { ...sortable, useSortable: options => {
    sortableOptions.push(options);
    return { setNodeRef() {}, setActivatorNodeRef: activatorRef, attributes: {}, listeners: {},
      transform: { x: 12, y: 16, scaleX: 0.4, scaleY: 2 }, transition: 'transform 180ms ease', isDragging: false, isSorting: false };
  } };
  if (request === '@/hooks/use-view-mode') return { useViewMode: () => [mode, () => {}] };
  if (request === '@/features/endpoints/queries') return { useDeleteEndpoint: () => ({}), useReorderEndpoints: () => ({ mutate: input => endpointSaves.push(input) }) };
  if (request === '@/features/stashes/queries') return { useUpdateStash: () => ({}), useDeleteStash: () => ({}), useReorderStashes: () => ({ mutate: input => stashSaves.push(input) }) };
  if (request === '@/features/stashes/components/stash-dialog') return { StashDialog: () => null };
  if (request === '@/features/stashes/components/api-group-section') return {
    ApiGroupControl: () => null,
    ApiGroupSection: ({ children, name }) => React.createElement('section', { 'aria-label': name }, children),
  };
  if (request === 'next/navigation') return { useRouter: () => ({ push() {} }) };
  if (request === 'next/link') return function Link({ children, ...props }) { return React.createElement('a', props, children); };
  if (request === 'framer-motion/m') return { div: ({ children }) => React.createElement('div', null, children) };
  return originalLoad.call(this, request, parent, isMain);
};
const { EndpointBrowser } = require('../src/features/endpoints/components/endpoint-browser.tsx');
const endpoint = (id, groupId = null) => ({ id, groupId, name: id, path: `/${id}`, method: 'GET', version: '', firstResponse: null, description: '', isDeprecated: false });
const stash = (id, endpoints = [], groups = []) => ({ id, name: id, description: '', color: 'blue', status: 'active', groups, endpoints });

async function fixture(t, stashes, options = {}) {
  mode = options.mode ?? 'grid'; endpointSaves = []; stashSaves = []; sortableOptions = [];
  let renderer;
  await act(async () => { renderer = create(React.createElement(EndpointBrowser, { project: { id: 'project', role: options.role ?? 'owner', stashes }, stashId: options.stashId })); });
  t.after(async () => { await act(async () => renderer.unmount()); });
  return renderer;
}

test('each API group and Ungrouped APIs have an independent grid drag context', async t => {
  const endpoints = [endpoint('a1', 'a'), endpoint('a2', 'a'), endpoint('b1', 'b'), endpoint('b2', 'b'), endpoint('u1'), endpoint('u2')];
  const renderer = await fixture(t, [stash('stash', endpoints, [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }])]);
  const contexts = renderer.root.findAllByType(DndContext);
  assert.equal(contexts.length, 4);
  assert.equal(contexts[0].props.modifiers, listReorderModifiers);
  for (const context of contexts.slice(1)) {
    assert.equal(context.props.modifiers, gridReorderModifiers);
    assert.equal(context.findByType(sortable.SortableContext).props.strategy, sortable.rectSortingStrategy);
    assert.equal(context.findAllByType('button').filter(button => button.props['aria-label']?.startsWith('Reorder ')).length, 2);
  }
  await act(async () => contexts[1].props.onDragEnd({ active: { id: 'a1' }, over: { id: 'a2' } }));
  assert.deepEqual(endpointSaves, [{ stashId: 'stash', ids: ['a2', 'a1', 'b1', 'b2', 'u1', 'u2'] }]);
  await act(async () => contexts[1].props.onDragEnd({ active: { id: 'a1' }, over: { id: 'b1' } }));
  assert.equal(endpointSaves.length, 1);
  const handles = renderer.root.findAllByType('button').filter(button => button.props['aria-label']?.startsWith('Reorder '));
  for (const handle of handles) { assert.match(handle.props.className, /touch-none/); assert.equal(handle.props.ref, activatorRef); }
  const styles = renderer.root.findAllByType('div').filter(div => div.props.style?.transform).map(div => div.props.style.transform);
  assert.ok(styles.length > 0);
  assert.ok(styles.every(transform => transform.includes('translate') && !transform.includes('scale')));
});

test('flat and stash-only list reordering stays vertical and retains all endpoint IDs', async t => {
  const renderer = await fixture(t, [stash('stash', [endpoint('one'), endpoint('two'), endpoint('three')])], { mode: 'list', stashId: 'stash' });
  const context = renderer.root.findAllByType(DndContext)[1];
  assert.equal(context.props.modifiers, listReorderModifiers);
  assert.equal(context.findByType(sortable.SortableContext).props.strategy, sortable.verticalListSortingStrategy);
  await act(async () => context.props.onDragEnd({ active: { id: 'three' }, over: { id: 'one' } }));
  assert.deepEqual(endpointSaves, [{ stashId: 'stash', ids: ['three', 'one', 'two'] }]);
  await act(async () => context.props.onDragEnd({ active: { id: 'one' }, over: null }));
  assert.equal(endpointSaves.length, 1);
});

test('stashes stay in their vertical area; singleton groups and viewer/filter states have no handles', async t => {
  const stashes = [stash('first', [endpoint('one')]), stash('second', [endpoint('two')])];
  const renderer = await fixture(t, stashes);
  const contexts = renderer.root.findAllByType(DndContext);
  assert.equal(contexts.length, 1);
  await act(async () => contexts[0].props.onDragEnd({ active: { id: 'second' }, over: { id: 'first' } }));
  assert.deepEqual(stashSaves, [['second', 'first']]);
  assert.equal(renderer.root.findAllByType('button').filter(button => button.props['aria-label'] === 'Reorder stash').length, 2);
  await act(async () => renderer.root.findByType('input').props.onChange({ target: { value: 'one' } }));
  assert.equal(renderer.root.findAllByType('button').filter(button => button.props['aria-label']?.startsWith('Reorder ')).length, 0);
  const viewer = await fixture(t, stashes, { role: 'viewer' });
  assert.equal(viewer.root.findAllByType('button').filter(button => button.props['aria-label']?.startsWith('Reorder ')).length, 0);
});
