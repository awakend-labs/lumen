require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { renderToStaticMarkup } = require('react-dom/server');
const hookForm = require('react-hook-form');
const originalLoad = Module._load;
global.IS_REACT_ACT_ENVIRONMENT = true;
let nameForm, passwordForm, updateUser, changePassword, refreshes = 0;
let session = null;
Module._load = function(request, parent, isMain) {
  if (request === 'react-hook-form') return { ...hookForm, useForm: options => {
    const form = hookForm.useForm(options);
    if ('name' in options.defaultValues) nameForm = form; else passwordForm = form;
    return form;
  } };
  if (request === '@/lib/auth-client') return { authClient: { updateUser: input => updateUser(input), changePassword: input => changePassword(input) } };
  if (request === '@/server/session') return { getServerSession: async () => session };
  if (request === '@/components/ui/avatar') return {
    Avatar: ({ children, ...props }) => React.createElement('span', props, children),
    AvatarFallback: ({ children, ...props }) => React.createElement('span', props, children),
    AvatarImage: props => React.createElement('img', props),
  };
  if (request === 'next/navigation') return { useRouter: () => ({ refresh() { refreshes++; } }), redirect: path => { throw new Error(`redirect:${path}`); } };
  if (request === 'next/link') return function Link({ children, ...props }) { return React.createElement('a', props, children); };
  return originalLoad.call(this, request, parent, isMain);
};
const { ProfileSettings } = require('../src/features/profile/components/profile-settings.tsx');
const ProfilePage = require('../src/app/(workspace)/profile/page.tsx').default;
const user = { name: 'Jamie Smith', email: 'jamie@example.com' };

async function fixture(t) {
  refreshes = 0; updateUser = async () => ({ data: { status: true } }); changePassword = async () => ({ data: { user } });
  let renderer;
  await act(async () => { renderer = create(React.createElement(ProfileSettings, { user })); });
  t.after(async () => { await act(async () => renderer.unmount()); });
  return {
    renderer,
    submit: async index => { await act(async () => { await renderer.root.findAllByType('form')[index].props.onSubmit({ preventDefault() {}, persist() {} }); }); },
    name: async value => { await act(async () => nameForm.setValue('name', value, { shouldDirty: true })); },
    passwords: async values => { await act(async () => { for (const [key, value] of Object.entries(values)) passwordForm.setValue(key, value, { shouldDirty: true }); }); },
    text: () => JSON.stringify(renderer.toJSON()),
  };
}

test('profile requires a real session and only sends public user details to its form', async () => {
  session = null; await assert.rejects(ProfilePage(), /redirect:\/login\?callbackUrl=%2Fprofile/);
  session = { user: { ...user, id: 'user-id', image: null, emailVerified: true }, session: { token: 'must-not-reach-client' } };
  const page = await ProfilePage();
  assert.deepEqual(page.props.user, { ...user, image: null });
  assert.doesNotMatch(JSON.stringify(page.props), /must-not-reach-client/);
});

test('profile forms use POST fallbacks, connected labels and disabled controls before hydration', () => {
  const html = renderToStaticMarkup(React.createElement(ProfileSettings, { user }));
  const forms = html.match(/<form\b[^>]*>/g) ?? [];
  assert.equal(forms.length, 2);
  for (const form of forms) { assert.match(form, /method="post"/); assert.match(form, /action="\/profile"/); }
  assert.equal((html.match(/<fieldset disabled=""/g) ?? []).length, 2);
  for (const id of ['profile-name', 'profile-current-password', 'profile-new-password', 'profile-confirm-password']) {
    assert.match(html, new RegExp(`for="${id}"`)); assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.equal((html.match(/type="password"/g) ?? []).length, 3);
  assert.match(html, /jamie@example.com/); assert.doesNotMatch(html, /type="email"/);
});

test('name changes are trimmed, saved through Better Auth and refresh the account display', async t => {
  const f = await fixture(t); let input;
  updateUser = async value => { input = value; return { data: { status: true } }; };
  await f.name('  Alex Rivera  '); await f.submit(0);
  assert.deepEqual(input, { name: 'Alex Rivera' }); assert.equal(refreshes, 1);
  assert.equal(nameForm.getValues('name'), 'Alex Rivera'); assert.equal(nameForm.formState.isDirty, false);
  assert.match(f.text(), /Alex Rivera/); assert.match(f.text(), /Name updated/);
});

test('blank names and mismatched passwords never make account requests', async t => {
  const f = await fixture(t); let calls = 0;
  updateUser = changePassword = async () => { calls++; return {}; };
  await f.name('   '); await f.submit(0); assert.match(f.text(), /Name is required/);
  await f.passwords({ currentPassword: 'old-test-password', newPassword: 'new-test-password', confirmPassword: 'different-password' });
  await f.submit(1); assert.match(f.text(), /Passwords don.t match/); assert.equal(calls, 0);
});

test('incorrect current passwords have a visible field error and successful changes clear all password fields', async t => {
  const f = await fixture(t); let input;
  const values = { currentPassword: 'old-test-password', newPassword: 'new-test-password', confirmPassword: 'new-test-password' };
  await f.passwords(values);
  changePassword = async () => ({ error: { code: 'INVALID_PASSWORD', message: 'Invalid password' } });
  await f.submit(1); assert.match(f.text(), /Your current password is incorrect/);
  assert.doesNotMatch(f.text(), /Password changed/);
  changePassword = async value => { input = value; return { data: { user } }; };
  await f.submit(1);
  assert.deepEqual(input, { currentPassword: values.currentPassword, newPassword: values.newPassword });
  assert.deepEqual(passwordForm.getValues(), { currentPassword: '', newPassword: '', confirmPassword: '' });
  assert.match(f.text(), /Password changed/);
});

test('connection failures and server errors stay visible without claiming success', async t => {
  const f = await fixture(t);
  updateUser = async () => { throw new Error('Offline'); };
  await f.name('Unsaved name'); await f.submit(0);
  assert.match(f.text(), /Couldn.t connect/); assert.doesNotMatch(f.text(), /Name updated/);
  assert.equal(nameForm.getValues('name'), 'Unsaved name'); assert.equal(refreshes, 0);
  changePassword = async () => ({ error: { message: 'Too many attempts. Try again later.' } });
  await f.passwords({ currentPassword: 'old-test-password', newPassword: 'new-test-password', confirmPassword: 'new-test-password' });
  await f.submit(1); assert.match(f.text(), /Too many attempts/); assert.doesNotMatch(f.text(), /Password changed/);
});
