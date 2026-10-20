require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const React = require('react');
const { create, act } = require('react-test-renderer');
const hookForm = require('react-hook-form');
const originalLoad = Module._load;
let currentForm, mutations = [];
global.IS_REACT_ACT_ENVIRONMENT = true;
const wrap = tag => function TestElement({ children, ...props }) { return React.createElement(tag, props, children); };
Module._load = function(request, parent, isMain) {
  if (request === 'react-hook-form') return { ...hookForm, useForm: options => { currentForm = hookForm.useForm(options); return currentForm; } };
  if (request === '@/features/members/queries') return Object.fromEntries(['useInviteMember', 'useInvitations', 'useMembers', 'useRemoveMember', 'useRevokeInvitation', 'useUpdateMemberRole'].map(key => [key, () => ({ data: [], mutate: values => mutations.push(values) })]));
  if (request === '@/components/ui/dialog') return Object.fromEntries(['Dialog', 'DialogContent', 'DialogFooter', 'DialogDescription', 'DialogHeader', 'DialogTitle'].map(key => [key, wrap('div')]));
  if (request === '@/components/ui/select') return Object.fromEntries(['Select', 'SelectContent', 'SelectGroup', 'SelectItem', 'SelectTrigger', 'SelectValue'].map(key => [key, wrap('div')]));
  if (request === '@/components/ui/toggle-group') return { ToggleGroup: wrap('div'), ToggleGroupItem: wrap('button') };
  return originalLoad.call(this, request, parent, isMain);
};
const { StashDialog } = require('../src/features/stashes/components/stash-dialog.tsx');
const { ProjectSettings } = require('../src/features/members/components/project-settings.tsx');

test('stash validation renders an error for long unbroken descriptions and keeps a bounded form layout', async t => {
  let renderer;
  await act(async () => { renderer = create(React.createElement(StashDialog, { open: true, onOpenChange() {}, onSubmit() {} })); });
  t.after(async () => { await act(async () => renderer.unmount()); });
  await act(async () => { currentForm.setValue('name', 'Orders'); currentForm.setValue('description', 'x'.repeat(2000)); });
  await act(async () => { await renderer.root.findByType('form').props.onSubmit({ preventDefault() {}, persist() {} }); });
  const textarea = renderer.root.findByType('textarea');
  assert.equal(textarea.props['aria-invalid'], true);
  assert.match(JSON.stringify(renderer.toJSON()), /Description must be 500 characters or fewer/);
  assert.match(textarea.props.className, /field-sizing-fixed/);
  assert.ok(renderer.root.findAll(node => node.type === 'div' && node.props.className?.includes('max-h-[90dvh]')).length);
  assert.ok(renderer.root.findAll(node => node.type === 'button' && node.props.type === 'submit').length);
});

test('invalid invitation email shows an associated error and never creates a link', async t => {
  mutations = []; let renderer;
  await act(async () => { renderer = create(React.createElement(ProjectSettings, { projectId: 'p', role: 'owner' })); });
  t.after(async () => { await act(async () => renderer.unmount()); });
  const form = renderer.root.findByType('form');
  assert.equal(form.props.noValidate, true);
  await act(async () => { currentForm.setValue('email', 'not-an-email'); });
  await act(async () => { await form.props.onSubmit({ preventDefault() {}, persist() {} }); });
  const input = renderer.root.findByProps({ id: 'invite-email' });
  assert.equal(input.props['aria-invalid'], true);
  assert.equal(input.props['aria-describedby'], 'invite-email-error');
  assert.match(JSON.stringify(renderer.toJSON()), /Enter a valid email/);
  assert.equal(mutations.length, 0);
  await act(async () => { currentForm.setValue('email', 'teammate@example.com'); });
  await act(async () => { await form.props.onSubmit({ preventDefault() {}, persist() {} }); });
  assert.deepEqual(mutations, [{ email: 'teammate@example.com', role: 'editor' }]);
});
