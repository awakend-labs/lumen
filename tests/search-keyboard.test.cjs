require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { QueryClient } = require('@tanstack/react-query');
global.IS_REACT_ACT_ENVIRONMENT = true;
const client = new QueryClient();
client.setQueryData(['projects'], [
  { id: 'one', name: 'Orders one', description: '' },
  { id: 'two', name: 'Orders two', description: '' },
]);
const navigations = [];
const originalLoad = Module._load;
const passthrough = tag => function TestElement({ children, ...props }) { return React.createElement(tag, props, children); };
Module._load = function(request, parent, isMain) {
  if (request === 'next/navigation') return { useRouter: () => ({ push: href => navigations.push(href) }) };
  if (request === 'next/link') return passthrough('a');
  if (request === '@tanstack/react-query') return { useQueryClient: () => client, useQuery: () => ({ data: [], isFetching: false }) };
  if (request === '@/components/ui/dialog') return {
    Dialog: ({ open, children }) => open ? children : null,
    DialogContent: passthrough('section'), DialogDescription: passthrough('p'),
    DialogHeader: passthrough('header'), DialogTitle: passthrough('h2'),
  };
  if (request === '@/components/ui/button') return { Button: passthrough('button') };
  if (request === '@/components/ui/input') return { Input: passthrough('input') };
  return originalLoad.call(this, request, parent, isMain);
};
const { GlobalSearch } = require('../src/features/search/components/global-search.tsx');

test('search arrows select results, Enter opens the selection, and every reopen starts empty', async t => {
  const previousWindow = global.window;
  global.window = new EventTarget();
  let renderer;
  await act(async () => { renderer = create(React.createElement(GlobalSearch)); });
  t.after(async () => { await act(async () => renderer.unmount()); global.window = previousWindow; client.clear(); });
  const shortcut = async () => {
    const event = new Event('keydown', { cancelable: true });
    Object.assign(event, { ctrlKey: true, key: 'k' });
    await act(async () => window.dispatchEvent(event));
  };
  const input = () => renderer.root.findByType('input');
  const type = async value => { await act(async () => input().props.onChange({ target: { value } })); };
  const key = async value => { await act(async () => input().props.onKeyDown({ key: value, nativeEvent: {}, preventDefault() {} })); };
  const options = () => renderer.root.findAllByProps({ role: 'option' }).filter(node => node.type === 'a');
  await shortcut(); await type('Orders');
  assert.equal(options().length, 2); assert.equal(options()[0].props['aria-selected'], true);
  await key('ArrowDown'); assert.equal(options()[1].props['aria-selected'], true);
  await key('ArrowUp'); assert.equal(options()[0].props['aria-selected'], true);
  await key('ArrowUp'); assert.equal(options()[1].props['aria-selected'], true);
  await key('Enter'); assert.deepEqual(navigations, ['/projects/two']);
  await shortcut(); assert.equal(input().props.value, '');
  await type('New search'); await shortcut(); await shortcut(); assert.equal(input().props.value, '');
  await shortcut();
  await act(async () => renderer.root.findByType('button').props.onClick());
  assert.equal(input().props.value, '');
});
