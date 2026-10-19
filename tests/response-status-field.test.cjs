require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { ResponseStatusField } = require('../src/features/endpoints/components/response-status-field.tsx');
global.IS_REACT_ACT_ENVIRONMENT = true;

test('typing or pasting a duplicate status is rejected with an inline explanation', async t => {
  let renderer; const changes = [];
  function Editor() {
    const [value, setValue] = React.useState(202);
    return React.createElement(ResponseStatusField, { id:'status-test',value,usedCodes:[201],onChange:next=>{changes.push(next);setValue(next);} });
  }
  await act(async()=>{renderer=create(React.createElement(Editor));});
  t.after(async()=>{await act(async()=>{renderer.unmount();});});
  const input=()=>renderer.root.findByType('input');
  await act(async()=>{input().props.onChange({target:{value:'201'}});});
  assert.deepEqual(changes,[]);assert.equal(input().props.value,202);
  assert.equal(input().props['aria-invalid'],true);
  const alert=renderer.root.findByProps({role:'alert'});
  assert.match(alert.children.join(''),/Status 201 is already used/);
  assert.equal(input().props['aria-describedby'],alert.props.id);
  await act(async()=>{input().props.onChange({target:{value:'203'}});});
  assert.deepEqual(changes,[203]);assert.equal(input().props.value,203);
  assert.equal(input().props['aria-invalid'],false);
  assert.equal(renderer.root.findAllByProps({role:'alert'}).length,0);
});

test('existing duplicate draft codes are flagged and clear when the other row changes', async t => {
  let renderer;
  const render=usedCodes=>React.createElement(ResponseStatusField,{id:'status-test',value:201,usedCodes,onChange(){}});
  await act(async()=>{renderer=create(render([201]));});
  t.after(async()=>{await act(async()=>{renderer.unmount();});});
  assert.equal(renderer.root.findByType('input').props['aria-invalid'],true);
  await act(async()=>{renderer.update(render([202]));});
  assert.equal(renderer.root.findByType('input').props['aria-invalid'],false);
  assert.equal(renderer.root.findAllByProps({role:'alert'}).length,0);
});
