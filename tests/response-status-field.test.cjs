require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { ResponseStatusField } = require('../src/features/endpoints/components/response-status-field.tsx');
global.IS_REACT_ACT_ENVIRONMENT = true;

test('typing a duplicate retains every digit and flags the actual form value', async t => {
  let renderer; const changes = [];
  function Editor() {
    const [value, setValue] = React.useState(202);
    return React.createElement(ResponseStatusField, { id:'status-test',value,usedCodes:[201],onChange:next=>{changes.push(next);setValue(next);} });
  }
  await act(async()=>{renderer=create(React.createElement(Editor));});
  t.after(async()=>{await act(async()=>{renderer.unmount();});});
  const input=()=>renderer.root.findByType('input');
  for (const text of ['2', '20', '201']) {
    await act(async()=>{input().props.onChange({target:{value:text}});});
    assert.equal(input().props.value, Number(text));
  }
  assert.deepEqual(changes,[2,20,201]);assert.equal(input().props.value,201);
  assert.equal(input().props['aria-invalid'],true);
  const alert=renderer.root.findByProps({role:'alert'});
  assert.match(alert.children.join(''),/Status 201 is already used/);
  assert.equal(input().props['aria-describedby'],alert.props.id);
  await act(async()=>{input().props.onChange({target:{value:'203'}});});
  assert.deepEqual(changes,[2,20,201,203]);assert.equal(input().props.value,203);
  assert.equal(input().props['aria-invalid'],false);
  assert.equal(renderer.root.findAllByProps({role:'alert'}).length,0);
});

test('pasting a duplicate passes the full value to the form and draft', async t => {
  let renderer;
  let draft;
  function Editor() {
    const [value, setValue] = React.useState(202);
    return React.createElement(ResponseStatusField, { id:'paste-status',value,usedCodes:[201],onChange:next=>{
      draft=JSON.stringify({responses:[{statusCode:201},{statusCode:next}]});
      setValue(next);
    }});
  }
  await act(async()=>{renderer=create(React.createElement(Editor));});
  t.after(async()=>{await act(async()=>{renderer.unmount();});});
  await act(async()=>{renderer.root.findByType('input').props.onChange({target:{value:'201'}});});
  assert.equal(renderer.root.findByType('input').props.value,201);
  assert.equal(JSON.parse(draft).responses[1].statusCode,201);
  assert.match(renderer.root.findByProps({role:'alert'}).children.join(''),/Status 201 is already used/);
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

test('clearing a status remains blank and subsequent typing has no leading zero', async t => {
  let renderer;
  const changes=[];
  function Editor() {
    const [value,setValue]=React.useState(202);
    return React.createElement(ResponseStatusField,{id:'empty-status',value,usedCodes:[201],onChange:next=>{changes.push(next);setValue(next);}});
  }
  await act(async()=>{renderer=create(React.createElement(Editor));});
  t.after(async()=>{await act(async()=>{renderer.unmount();});});
  const input=()=>renderer.root.findByType('input');
  await act(async()=>{input().props.onChange({target:{value:''}});});
  assert.equal(input().props.value,'');
  for(const text of ['2','20','201']) await act(async()=>{input().props.onChange({target:{value:text}});});
  assert.deepEqual(changes,['',2,20,201]);
  assert.equal(input().props.value,201);
  assert.equal(input().props['aria-invalid'],true);
});
