require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const React = require('react');
const { create, act } = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const Dialog = React.createContext(null);
const originalLoad = Module._load;
let deleteUser;
const dialogs = {
  AlertDialog: ({ children, ...value }) => React.createElement(Dialog.Provider, { value }, children),
  AlertDialogTrigger: ({ children }) => {
    const dialog = React.useContext(Dialog);
    return React.cloneElement(children, { onClick: () => dialog.onOpenChange(true) });
  },
  AlertDialogCancel: ({ children, ...props }) => {
    const dialog = React.useContext(Dialog);
    return React.createElement('button', { type: 'button', ...props, onClick: () => dialog.onOpenChange(false) }, children);
  },
  AlertDialogContent: ({ children, ...props }) => React.useContext(Dialog).open ? React.createElement('div', { role: 'alertdialog', ...props }, children) : null,
};
for (const name of ['AlertDialogHeader', 'AlertDialogFooter', 'AlertDialogTitle', 'AlertDialogDescription']) {
  dialogs[name] = ({ children }) => React.createElement('div', null, children);
}
Module._load = function(request, parent, isMain) {
  if (request === '@/lib/auth-client') return { authClient: { deleteUser: input => deleteUser(input) } };
  // Keep state transitions testable without a browser; the real modal uses shared Radix primitives.
  if (request === '@/components/ui/alert-dialog') return dialogs;
  return originalLoad.call(this, request, parent, isMain);
};
const { ProfileDeleteAccount } = require('../src/features/profile/components/profile-delete-account.tsx');

async function fixture(t) {
  let renderer;
  const navigations = [];
  const previousWindow = global.window;
  global.window = { location: { replace: path => navigations.push(path) } };
  await act(async () => { renderer = create(React.createElement(ProfileDeleteAccount)); });
  t.after(async () => {
    await act(async () => renderer.unmount());
    if (previousWindow === undefined) delete global.window; else global.window = previousWindow;
  });
  return {
    renderer, navigations,
    open: async () => { await act(async () => renderer.root.findAllByType('button')[0].props.onClick()); },
    cancel: async () => { await act(async () => renderer.root.findAllByType('button')[1].props.onClick()); },
    password: async value => { await act(async () => renderer.root.findByType('input').props.onChange({ target: { value } })); },
    submit: async () => { await act(async () => renderer.root.findByType('form').props.onSubmit({ preventDefault() {} })); },
    text: () => JSON.stringify(renderer.toJSON()),
  };
}

test('deletion needs explicit confirmation and password; cancelling clears sensitive input', async t => {
  const f = await fixture(t); let calls = 0;
  deleteUser = async () => { calls++; return { data: { success: true } }; };
  assert.equal(f.renderer.root.findAllByType('form').length, 0);
  await f.open();
  assert.match(f.text(), /Collaborators will also lose access/);
  assert.equal(f.renderer.root.findByType('input').props.type, 'password');
  assert.equal(f.renderer.root.findAllByType('button')[2].props.disabled, true);
  await f.submit(); assert.equal(calls, 0);
  await f.password('local-test-password'); await f.cancel(); await f.open();
  assert.equal(f.renderer.root.findByType('input').props.value, '');
  assert.equal(calls, 0); assert.deepEqual(f.navigations, []);
});

test('failed deletion stays open with feedback and can be retried successfully', async t => {
  const f = await fixture(t); await f.open(); await f.password('local-test-password');
  deleteUser = async () => ({ error: { code: 'INVALID_PASSWORD' } });
  await f.submit(); assert.match(f.text(), /Your current password is incorrect/);
  assert.deepEqual(f.navigations, []);
  deleteUser = async () => { throw new Error('Offline'); };
  await f.submit(); assert.match(f.text(), /Couldn.t connect/);
  deleteUser = async input => { assert.deepEqual(input, { password: 'local-test-password' }); return { data: { success: true } }; };
  await f.submit(); assert.deepEqual(f.navigations, ['/login']);
});

test('pending deletion prevents duplicate requests and modal dismissal', async t => {
  const f = await fixture(t); await f.open(); await f.password('local-test-password');
  let resolve, request, calls = 0;
  deleteUser = () => { calls++; return new Promise(done => { resolve = done; }); };
  await act(async () => { request = f.renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  assert.equal(f.renderer.root.findByType('input').props.disabled, true);
  assert.equal(f.renderer.root.findAllByType('button')[1].props.disabled, true);
  await f.submit(); await f.cancel();
  assert.equal(calls, 1); assert.equal(f.renderer.root.findAllByType('form').length, 1);
  let prevented = false;
  f.renderer.root.findByProps({ role: 'alertdialog' }).props.onEscapeKeyDown({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  await act(async () => { resolve({ error: { message: 'Please try again later.' } }); await request; });
  assert.match(f.text(), /Please try again later/);
  assert.deepEqual(f.navigations, []);
});
