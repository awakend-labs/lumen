require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { useForm, useWatch } = require('react-hook-form');
const { MarkdownWriteField } = require('../src/features/endpoints/components/markdown-write-field.tsx');
const { useEndpointDraft } = require('../src/features/endpoints/use-endpoint-draft.ts');
global.IS_REACT_ACT_ENVIRONMENT = true;

test('first description edit reaches the saved draft and survives preview remount and reset', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const previousFetch = global.fetch, previousWindow = global.window;
  global.window = new EventTarget();
  let form, renderer;
  const writes = [];
  global.fetch = async (_url, init) => {
    if (!init?.method) return Response.json({ revision: 'initial', writeOrder: 0, payload: null });
    writes.push(JSON.parse(init.body));
    return Response.json({ revision: 'initial' });
  };
  function Editor({ preview = false }) {
    form = useForm({ defaultValues: { description: '' } });
    useEndpointDraft('project', 'endpoint:description', form, JSON.parse);
    const value = useWatch({ control: form.control, name: 'description' });
    return preview ? React.createElement('p', null, value) : React.createElement(MarkdownWriteField, {
      value, registration: form.register('description'),
      onValue: text => form.setValue('description', text, { shouldDirty: true }),
    });
  }
  t.after(async () => {
    await act(async () => renderer?.unmount());
    global.fetch = previousFetch; global.window = previousWindow;
  });
  await act(async () => { renderer = create(React.createElement(Editor)); });
  const description = '## First entry\nSaved on the first attempt.';
  await act(async () => { renderer.root.findByType('textarea').props.onChange({ target: { value: description } }); });
  assert.equal(form.getValues('description'), description);
  await act(async () => { t.mock.timers.tick(600); });
  assert.equal(JSON.parse(writes.at(-1).payload).description, description);
  await act(async () => renderer.update(React.createElement(Editor, { preview: true })));
  assert.equal(renderer.root.findByType('p').children.join(''), description);
  await act(async () => renderer.update(React.createElement(Editor)));
  assert.equal(renderer.root.findByType('textarea').props.value, description);
  await act(async () => form.reset({ description: 'Recovered description' }));
  assert.equal(renderer.root.findByType('textarea').props.value, 'Recovered description');
});
