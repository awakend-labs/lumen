require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const React = require('react');
const { act, create } = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
let mutation, requests;
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '@/features/projects/queries') return { useUpdateProjectBaseUrl: () => mutation };
  if (request === '@/components/ui/checkbox') return { Checkbox: ({ onCheckedChange, ...props }) => React.createElement('input', { ...props, type: 'checkbox', onChange: e => onCheckedChange(e.target.checked) }) };
  // Exercise settings state independently of Radix's DOM portal; real dialogs are checked in the browser.
  if (request === '@/components/ui/dialog') return {
    Dialog: ({ open, children }) => open ? children : null,
    DialogContent: ({ children }) => React.createElement('div', { role: 'dialog' }, children),
    DialogHeader: ({ children }) => React.createElement('header', {}, children),
    DialogTitle: ({ children }) => React.createElement('h2', {}, children),
    DialogDescription: ({ children }) => React.createElement('p', {}, children),
    DialogFooter: ({ children }) => React.createElement('footer', {}, children),
  };
  return originalLoad.call(this, request, parent, isMain);
};
const { ProjectBaseUrlSettings } = require('../src/features/projects/components/project-base-url-settings.tsx');
const project = { id: 'p', role: 'owner', baseUrl: 'https://old.example.com', stashes: [{ id: 'a', name: 'Users', color: 'blue', endpoints: [{ id: 'e1' }, { id: 'e2' }] }, { id: 'b', name: 'Billing', color: 'green', endpoints: [{ id: 'e3' }] }] };
async function fixture(t, props = project) {
  requests = [];
  mutation = { isPending: false, isError: false, reset() {}, mutate: (input, callbacks) => requests.push({ input, callbacks }) };
  let renderer;
  const element = () => React.createElement(ProjectBaseUrlSettings, { project: props });
  await act(async () => { renderer = create(element()); });
  t.after(async () => { await act(async () => renderer.unmount()); });
  return {
    get root() { return renderer.root; },
    async edit(value) { await act(async () => renderer.root.findByProps({ id: 'project-settings-base-url' }).props.onChange({ target: { value } })); },
    async open() { await act(async () => renderer.root.findByType('form').props.onSubmit({ preventDefault() {} })); },
    async check(label, checked) { await act(async () => renderer.root.findByProps({ 'aria-label': label, type: 'checkbox' }).props.onChange({ target: { checked } })); },
    async click(text) { const button = renderer.root.findAllByType('button').find(node => node.props.children === text); assert.ok(button, text); await act(async () => button.props.onClick()); },
    async refresh() { await act(async () => renderer.update(element())); },
    dialogs() { return renderer.root.findAllByProps({ role: 'dialog' }).length; },
  };
}

test('saving opens an all-selected checklist; only checked stashes are sent after Update', async t => {
  const f = await fixture(t);
  await f.edit(' https://new.example.com/api/ ');
  await f.open();
  assert.equal(requests.length, 0);
  assert.equal(f.dialogs(), 1);
  assert.equal(f.root.findByProps({ 'aria-label': 'Update Users', type: 'checkbox' }).props.checked, true);
  assert.equal(f.root.findByProps({ 'aria-label': 'Select all stashes', type: 'checkbox' }).props.checked, true);
  await f.check('Update Billing', false);
  assert.equal(f.root.findByProps({ 'aria-label': 'Select all stashes', type: 'checkbox' }).props.checked, 'indeterminate');
  await f.click('Update');
  assert.deepEqual(requests[0].input, { baseUrl: 'https://new.example.com/api', stashIds: ['a'] });
  await act(async () => requests[0].callbacks.onSuccess());
  assert.equal(f.dialogs(), 0);
});

test('cancel writes nothing and reopening resets the selection', async t => {
  const f = await fixture(t);
  await f.open();
  await f.check('Select all stashes', false);
  await f.click('Cancel');
  assert.equal(requests.length, 0);
  assert.equal(f.dialogs(), 0);
  await f.open();
  assert.equal(f.root.findByProps({ 'aria-label': 'Update Users', type: 'checkbox' }).props.checked, true);
});

test('select none and an empty project can update just the default', async t => {
  const f = await fixture(t);
  await f.open();
  await f.check('Select all stashes', false);
  await f.click('Update');
  assert.deepEqual(requests[0].input.stashIds, []);
  await f.check('Select all stashes', true);
  assert.equal(f.root.findByProps({ 'aria-label': 'Update Billing', type: 'checkbox' }).props.checked, true);
});

test('projects without stashes still show a confirmation and save their default', async t => {
  const f = await fixture(t, { ...project, stashes: [] });
  await f.edit('https://new.example.com');
  await f.open();
  assert.equal(f.dialogs(), 1);
  await f.click('Update');
  assert.deepEqual(requests[0].input, { baseUrl: 'https://new.example.com', stashIds: [] });
});

test('invalid URLs and read-only roles cannot open the update dialog', async t => {
  const f = await fixture(t);
  await f.edit('javascript:alert(1)');
  await f.open();
  assert.equal(f.dialogs(), 0);
  assert.equal(requests.length, 0);
  const viewer = await fixture(t, { ...project, role: 'viewer' });
  await viewer.open();
  assert.equal(viewer.dialogs(), 0);
});

test('failed updates keep the checklist and selection, while pending updates disable confirmation', async t => {
  const f = await fixture(t);
  await f.open();
  await f.check('Update Billing', false);
  await f.click('Update');
  mutation.isError = true;
  mutation.error = new Error('Unable to update');
  await f.refresh();
  assert.equal(f.dialogs(), 1);
  assert.equal(f.root.findByProps({ role: 'alert' }).props.children, 'Unable to update');
  assert.equal(f.root.findByProps({ 'aria-label': 'Update Billing', type: 'checkbox' }).props.checked, false);
  mutation.isPending = true;
  await f.refresh();
  assert.equal(f.root.findAllByType('button').find(node => node.props.children === 'Updating…').props.disabled, true);
  await f.click('Updating…');
  assert.equal(requests.length, 1);
});
