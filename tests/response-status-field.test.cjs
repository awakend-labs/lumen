require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');
// Keep these tests focused on form wiring; Radix requires a browser DOM.
const Module = require('node:module');
const originalLoad = Module._load;
const selectParts = Object.fromEntries(['Select', 'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue'].map(name => [name,
  function SelectPart({ children, ...props }) { return React.createElement('div', props, children); },
]));
Module._load = function(request, ...args) {
  if (request === '@/components/ui/select') return selectParts;
  return originalLoad.call(this, request, ...args);
};
const { ResponseStatusField } = require('../src/features/endpoints/components/response-status-field.tsx');
const { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } = selectParts;
const { RESPONSE_STATUS_CODES, nextResponseStatus } = require('../src/lib/response-status.ts');

global.IS_REACT_ACT_ENVIRONMENT = true;

async function fixture(t, props = {}) {
  let renderer;
  const changes = [];
  function Editor() {
    const [value, setValue] = React.useState(props.value ?? 202);
    return React.createElement(ResponseStatusField, {
      id: 'status-test', usedCodes: [201], ...props, value,
      onChange: next => { changes.push(next); setValue(next); },
    });
  }
  await act(async () => { renderer = create(React.createElement(Editor)); });
  t.after(async () => { await act(async () => renderer.unmount()); });
  return { renderer, changes };
}

test('selecting a status sends a number to the form and displays the chosen code', async t => {
  const { renderer, changes } = await fixture(t);
  await act(async () => renderer.root.findByType(Select).props.onValueChange('404'));
  assert.deepEqual(changes, [404]);
  assert.equal(renderer.root.findByType(Select).props.value, '404');
  assert.equal(renderer.root.findByType(SelectTrigger).props['aria-invalid'], false);
});

test('the default status displays 200 - OK', async t => {
  const { renderer } = await fixture(t, { value: 200 });
  assert.equal(renderer.root.findByType(SelectValue).props.children, '200 - OK');
});

test('menu lists labeled standard codes, disables duplicates, and caps its height', async t => {
  const { renderer } = await fixture(t);
  const content = renderer.root.findByType(SelectContent);
  assert.equal(content.props.className, 'max-h-64 w-80');
  const options = React.Children.toArray(content.props.children).filter(child => child.type === SelectItem);
  assert.equal(options.length, RESPONSE_STATUS_CODES.length);
  assert.equal(options.find(option => option.props.value === '201').props.disabled, true);
  assert.equal(options.find(option => option.props.value === '404').props.disabled, false);
  assert.equal(options.find(option => option.props.value === '404').props.children[1].props.children, 'Not Found');
  assert.ok(!options.some(option => option.props.value === '299'));
});

test('existing duplicate draft codes are flagged and clear when another row changes', async t => {
  let renderer;
  const render = usedCodes => React.createElement(ResponseStatusField, { id: 'status-test', value: 201, usedCodes, onChange() {} });
  await act(async () => { renderer = create(render([201])); });
  t.after(async () => { await act(async () => renderer.unmount()); });
  const trigger = () => renderer.root.findByType(SelectTrigger);
  assert.equal(trigger().props['aria-invalid'], true);
  const alert = renderer.root.findByProps({ role: 'alert' });
  assert.match(alert.children.join(''), /Status 201 is already used/);
  assert.equal(trigger().props['aria-describedby'], alert.props.id);
  await act(async () => renderer.update(render([202])));
  assert.equal(trigger().props['aria-invalid'], false);
  assert.equal(renderer.root.findAllByProps({ role: 'alert' }).length, 0);
});

test('blank drafts remain blank until a status is selected', async t => {
  const { renderer, changes } = await fixture(t, { value: '' });
  assert.equal(renderer.root.findByType(Select).props.value, '');
  await act(async () => renderer.root.findByType(Select).props.onValueChange('204'));
  assert.deepEqual(changes, [204]);
});

test('existing custom codes are preserved as an option', async t => {
  const { renderer } = await fixture(t, { value: 499 });
  assert.equal(renderer.root.findByType(Select).props.value, '499');
  const options = React.Children.toArray(renderer.root.findByType(SelectContent).props.children);
  assert.ok(options.some(option => option.props.value === '499'));
});

test('new responses skip unassigned codes and stop when the menu is exhausted', () => {
  const used = RESPONSE_STATUS_CODES.filter(([code]) => code >= 200 && code <= 208).map(([statusCode]) => ({ statusCode }));
  assert.equal(nextResponseStatus(used, 'GET'), 226);
  assert.equal(nextResponseStatus(RESPONSE_STATUS_CODES.map(([statusCode]) => ({ statusCode })), 'GET'), undefined);
});
