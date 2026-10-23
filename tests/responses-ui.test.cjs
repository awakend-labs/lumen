require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const Module = require('node:module');
const { create, act } = require('react-test-renderer');
const { useForm, useFieldArray } = require('react-hook-form');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
global.IS_REACT_ACT_ENVIRONMENT = true;
let project = { responseErrorFormat: { body: { error: 'CONFLICT', message: 'Already registered' } } };
const originalLoad = Module._load;
let resolvedResponses = 0, generatedTypes = 0;
Module._load = function(request, parent, isMain) {
  if (request === '@/components/ui/select') return Object.fromEntries(['Select', 'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue'].map(name => [name,
    function SelectPart({ children, ...props }) { return React.createElement('div', props, children); },
  ]));
  if (request === '@/lib/response-contract' && parent?.filename.endsWith('responses-view.tsx')) {
    const contract = originalLoad.call(this, request, parent, isMain);
    return { ...contract,
      resolveResponse: (...args) => { resolvedResponses++; return contract.resolveResponse(...args); },
      responseTypeScript: (...args) => { generatedTypes++; return contract.responseTypeScript(...args); },
    };
  }
  if (request === '@/features/projects/queries') return { useProject: () => ({ data: project }) };
  if (request === './json-editor') return { JsonEditor: function TestEditor({ id, value, label, onChange }) { return React.createElement('textarea', { id, value, 'aria-label': label, onChange: event => onChange(event.target.value) }); } };
  return originalLoad.call(this, request, parent, isMain);
};
const { ResponsesEditor } = require('../src/features/endpoints/components/responses-editor.tsx');
const { ResponsesView } = require('../src/features/endpoints/components/responses-view.tsx');
const { ResponseStatusField } = require('../src/features/endpoints/components/response-status-field.tsx');
const text = node => typeof node === 'string' ? node : (node.children ?? []).map(text).join('');

test('inactive response tabs do no resolution work and TypeScript is generated only when copied', async t => {
  const { Button } = require('../src/components/ui/button.tsx');
  const oldNavigator = Object.getOwnPropertyDescriptor(global, 'navigator');
  const oldFrame = global.requestAnimationFrame, oldCancel = global.cancelAnimationFrame;
  global.requestAnimationFrame = callback => setTimeout(callback, 0);
  global.cancelAnimationFrame = clearTimeout;
  let copied, renderer;
  Object.defineProperty(global, 'navigator', { configurable: true, value: { clipboard: { writeText: async value => { copied = value; } } } });
  t.after(async () => {
    await act(async () => renderer?.unmount());
    global.requestAnimationFrame = oldFrame; global.cancelAnimationFrame = oldCancel;
    if (oldNavigator) Object.defineProperty(global, 'navigator', oldNavigator); else delete global.navigator;
  });
  const responses = [
    { statusCode: 200, description: 'Success', body: { count: 998 }, bodySource: '{"count":998.0}', schema: { type: 'object', properties: { count: { type: 'number' } } } },
    { statusCode: 409, description: 'Conflict', useSharedError: true },
  ];
  resolvedResponses = 0; generatedTypes = 0;
  const props = { responses, method: 'GET', endpointName: 'Read', shared: { body: { error: 'OLD' }, schema: { type: 'object', properties: { oldError: { type: 'string' } } } } };
  await act(async () => { renderer = create(React.createElement(ResponsesView, props)); });
  assert.equal(resolvedResponses, 1);
  assert.equal(generatedTypes, 0);
  assert.match(text(renderer.toJSON()), /998\.0/);
  // Remount on the shared response; Radix's DOM layout effects are unavailable in this renderer.
  const conflictProps = { ...props, responses: responses.slice(1) };
  await act(async () => renderer.update(React.createElement(ResponsesView, { ...conflictProps, key: 'conflict' })));
  assert.equal(resolvedResponses, 2);
  assert.equal(generatedTypes, 0);
  await act(async () => renderer.update(React.createElement(ResponsesView, { ...conflictProps, key: 'conflict', shared: { body: { error: 'NEW' }, schema: { type: 'object', properties: { newError: { type: 'string' } } } } })));
  const copy = renderer.root.findAllByType(Button).find(node => text(node).includes('Copy as TypeScript'));
  await act(async () => { await copy.props.onClick(); });
  assert.equal(generatedTypes, 1);
  assert.match(copied, /newError/);
  assert.doesNotMatch(copied, /oldError/);
});

async function fixture(t) {
  const client = new QueryClient(); let form, renderer;
  function Editor() {
    form = useForm({ defaultValues: { method: 'POST', responses: [
      { statusCode: 201, description: 'Login succeeded', body: '{"accessToken":"abc","user":{"image":null}}', schema: '', schemaMode: 'generated', isSuccess: true },
      { statusCode: 409, description: 'Email already registered', body: '', schema: '', schemaMode: 'generated', useSharedError: false },
    ] } });
    const rows = useFieldArray({ control: form.control, name: 'responses' });
    return React.createElement(ResponsesEditor, { projectId: 'p', form, rows, disabled: false, paused: false });
  }
  await act(async () => { renderer = create(React.createElement(QueryClientProvider, { client }, React.createElement(Editor))); });
  t.after(async () => { await act(async () => renderer.unmount()); client.clear(); });
  return { renderer, get form() { return form; } };
}

test('status descriptions are read-only and follow the selected code in the form and draft', async t => {
  const f = await fixture(t);
  const descriptionInputs = () => f.renderer.root.findAll(node => node.type === 'input' && node.props.name?.endsWith('.description'));
  assert.deepEqual(descriptionInputs().map(node => node.props.value), ['CREATED', 'CONFLICT']);
  assert.ok(descriptionInputs().every(node => node.props.readOnly === true && !node.props.onChange));
  assert.equal(f.form.getValues('responses.0.description'), 'CREATED');
  await act(async () => f.renderer.root.findAllByType(ResponseStatusField)[0].props.onChange(404));
  assert.equal(descriptionInputs()[0].props.value, 'NOT FOUND');
  assert.equal(f.form.getValues('responses.0.description'), 'NOT FOUND');
  assert.equal(f.form.getValues('responses.0.isSuccess'), false);
  await act(async () => f.renderer.root.findAllByType(ResponseStatusField)[0].props.onChange(200));
  assert.equal(descriptionInputs()[0].props.value, 'OK');
  assert.equal(f.form.getValues('responses.0.description'), 'OK');
  const add = f.renderer.root.findAllByType('button').find(node => text(node).includes('Add response'));
  await act(async () => add.props.onClick());
  assert.equal(descriptionInputs()[2].props.value, 'CREATED');
  assert.equal(f.form.getValues('responses.2.description'), 'CREATED');
});

test('response example generates a schema; custom edits survive later example edits', async t => {
  const f = await fixture(t);
  assert.equal(JSON.parse(f.form.getValues('responses.0.schema')).properties.accessToken.type, 'string');
  assert.equal(f.renderer.root.findAllByType('textarea').length, 2);
  const edit = f.renderer.root.findAllByType('button').find(node => node.props['aria-expanded'] === false);
  await act(async () => edit.props.onClick());
  const schemaEditor = f.renderer.root.findAllByType('textarea').find(node => node.props['aria-label'] === 'Response schema');
  assert.ok(schemaEditor.props.id.startsWith('response-schema-'));
  const custom = '{"type":"object","properties":{"user":{"type":"object","properties":{"image":{"type":["string","null"]}}}}}';
  await act(async () => schemaEditor.props.onChange({ target: { value: custom } }));
  assert.equal(f.form.getValues('responses.0.schemaMode'), 'custom');
  await act(async () => f.form.setValue('responses.0.body', '{"accessToken":"new","user":{"image":"photo.png"}}'));
  assert.equal(f.form.getValues('responses.0.schema'), custom);
});

test('error rows can use the project format without an example and can switch back', async t => {
  const f = await fixture(t);
  const checkbox = f.renderer.root.findByProps({ type: 'checkbox' });
  await act(async () => checkbox.props.onChange({ target: { checked: true } }));
  assert.equal(f.form.getValues('responses.1.useSharedError'), true);
  assert.equal(f.renderer.root.findAllByType('textarea').length, 1);
  assert.match(JSON.stringify(f.renderer.toJSON()), /Uses the project error format/);
  assert.equal(f.form.getValues('responses.1.description'), 'CONFLICT');
  await act(async () => checkbox.props.onChange({ target: { checked: false } }));
  assert.equal(f.renderer.root.findAllByType('textarea').length, 2);
});

test('response reader starts on the POST success and shows nullable fields and TypeScript copy', async t => {
  const oldFrame = global.requestAnimationFrame, oldCancel = global.cancelAnimationFrame;
  global.requestAnimationFrame = callback => setTimeout(callback, 0); global.cancelAnimationFrame = clearTimeout;
  let renderer;
  t.after(async () => { await act(async () => renderer?.unmount()); global.requestAnimationFrame = oldFrame; global.cancelAnimationFrame = oldCancel; });
  const responses = [
    { statusCode: 409, description: 'Email already registered', useSharedError: true },
    { statusCode: 201, description: 'Login succeeded', body: { user: { image: null } }, schema: { type: 'object', required: ['user'], properties: { user: { type: 'object', required: ['image'], properties: { image: { type: ['string', 'null'] } } } } } },
  ];
  await act(async () => { renderer = create(React.createElement(ResponsesView, { responses, method: 'POST', endpointName: 'Login', shared: project.responseErrorFormat })); });
  const output = JSON.stringify(renderer.toJSON());
  assert.match(output, /Login succeeded/);
  assert.match(output, /user.image/);
  assert.match(output, /string or null/);
  assert.match(output, /Copy as TypeScript/);
  assert.ok(renderer.root.findAll(node => node.type === 'div' && node.props.role === 'tablist' && node.props['aria-label'] === 'Response status codes').length);
});

test('Copy as TypeScript writes the current response contract', async t => {
  const { Button } = require('../src/components/ui/button.tsx');
  const oldNavigator = Object.getOwnPropertyDescriptor(global, 'navigator');
  const oldFrame = global.requestAnimationFrame, oldCancel = global.cancelAnimationFrame;
  global.requestAnimationFrame = callback => setTimeout(callback, 0);
  global.cancelAnimationFrame = clearTimeout;
  let copied = '', renderer;
  Object.defineProperty(global, 'navigator', { configurable: true, value: { clipboard: { writeText: async value => { copied = value; } } } });
  t.after(async () => { await act(async () => renderer?.unmount()); global.requestAnimationFrame = oldFrame; global.cancelAnimationFrame = oldCancel; if (oldNavigator) Object.defineProperty(global, 'navigator', oldNavigator); else delete global.navigator; });
  await act(async () => { renderer = create(React.createElement(ResponsesView, { method: 'POST', endpointName: 'Login', responses: [{ statusCode: 201, description: 'Success', schema: { type: 'object', required: ['image'], properties: { image: { type: ['string', 'null'] } } } }] })); });
  const copy = renderer.root.findAllByType(Button).find(node => text(node).includes('Copy as TypeScript'));
  await act(async () => { await copy.props.onClick(); });
  assert.match(copied, /export type LoginResponse201/);
  assert.match(copied, /"image": string \| null/);
});
