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
let currentForm, requests, resets, history, requestResult, resetResult;
Module._load = function(request, parent, isMain) {
  if (request === '@/components/theme-toggle') return { ThemeToggle: () => null };
  if (request === 'react-hook-form') return { ...hookForm, useForm: options => { currentForm = hookForm.useForm(options); return currentForm; } };
  if (request === '@/lib/auth-client') return { authClient: {
    requestPasswordReset: async input => { requests.push(input); return requestResult(); },
    resetPassword: async input => { resets.push(input); return resetResult(); },
  } };
  if (request === 'next/navigation') return { useSearchParams: () => new URLSearchParams() };
  if (request === 'next/link') return function Link({ children, ...props }) { return React.createElement('a', props, children); };
  return originalLoad.call(this, request, parent, isMain);
};
const { PasswordResetForm } = require('../src/features/auth/components/password-reset-form.tsx');
const { AuthForm } = require('../src/features/auth/components/auth-form.tsx');
const ResetPage = require('../src/app/reset-password/page.tsx').default;
const ForgotPage = require('../src/app/forgot-password/page.tsx').default;

async function fixture(t, props = { mode: 'request' }) {
  requests = []; resets = []; history = [];
  requestResult = resetResult = async () => ({ data: { status: true } });
  global.window = { location: { origin: 'https://lumen.example' }, history: { replaceState: (...args) => history.push(args) } };
  let renderer;
  await act(async () => { renderer = create(React.createElement(PasswordResetForm, props)); });
  t.after(async () => { await act(async () => renderer.unmount()); delete global.window; });
  return {
    renderer,
    text: () => JSON.stringify(renderer.toJSON()),
    async values(values) { await act(async () => { for (const [key, value] of Object.entries(values)) currentForm.setValue(key, value); }); },
    async submit() { await act(async () => { await renderer.root.findByType('form').props.onSubmit({ preventDefault() {}, persist() {} }); }); },
  };
}

test('login links to recovery; public reset pages parse tokens safely', async () => {
  const login = renderToStaticMarkup(React.createElement(AuthForm, { mode: 'login' }));
  const signup = renderToStaticMarkup(React.createElement(AuthForm, { mode: 'signup' }));
  assert.match(login, /href="\/forgot-password"/);
  assert.doesNotMatch(signup, /Forgot password/);
  assert.equal(ForgotPage().props.mode, 'request');
  for (const params of [{}, { token: ['a', 'b'] }, { token: 'unused', error: 'INVALID_TOKEN' }]) {
    const page = await ResetPage({ searchParams: Promise.resolve(params) });
    assert.equal(page.props.token, undefined);
  }
  assert.equal((await ResetPage({ searchParams: Promise.resolve({ token: 'test-token' }) })).props.token, 'test-token');
});

test('recovery forms cannot submit before hydration and never put passwords in URL fields', () => {
  for (const props of [{ mode: 'request' }, { mode: 'reset', token: 'test-token' }]) {
    const html = renderToStaticMarkup(React.createElement(PasswordResetForm, props));
    assert.match(html, /<form\b[^>]*method="post"/);
    assert.match(html, /<fieldset disabled=""/);
    assert.doesNotMatch(html, /test-token/);
    for (const id of props.mode === 'request' ? ['reset-email'] : ['newPassword', 'confirmPassword']) {
      assert.match(html, new RegExp(`for="${id}"`));
      assert.match(html, new RegExp(`id="${id}"`));
    }
  }
});

test('requests validate email, build a trusted callback and show a non-enumerating confirmation', async t => {
  const f = await fixture(t);
  await f.values({ email: 'invalid' }); await f.submit();
  assert.equal(requests.length, 0); assert.match(f.text(), /Enter a valid email/);
  await f.values({ email: 'reset@example.com' }); await f.submit();
  assert.deepEqual(requests, [{ email: 'reset@example.com', redirectTo: 'https://lumen.example/reset-password' }]);
  assert.match(f.text(), /If an account exists/); assert.match(f.text(), /30 minutes/);
  assert.equal(f.renderer.root.findAllByType('form').length, 0);
});

test('request failures and rate limits do not show a sent confirmation', async t => {
  const f = await fixture(t);
  await f.values({ email: 'reset@example.com' });
  requestResult = async () => ({ error: { status: 429 } });
  await f.submit(); assert.match(f.text(), /wait a minute/); assert.doesNotMatch(f.text(), /Check your email/);
  requestResult = async () => ({ error: { status: 500 } });
  await f.submit(); assert.match(f.text(), /couldn.t send/);
  requestResult = async () => { throw new Error('Offline'); };
  await f.submit(); assert.match(f.text(), /couldn.t connect/);
});

test('reset validates confirmation, submits the token, clears passwords and removes the token from history', async t => {
  const f = await fixture(t, { mode: 'reset', token: 'test-token' });
  await f.values({ newPassword: 'new-test-password', confirmPassword: 'different-password' }); await f.submit();
  assert.equal(resets.length, 0); assert.match(f.text(), /Passwords don.t match/);
  await f.values({ newPassword: 'short', confirmPassword: 'short' }); await f.submit();
  assert.equal(resets.length, 0); assert.match(f.text(), /at least 8/);
  await f.values({ newPassword: 'new-test-password', confirmPassword: 'new-test-password' });
  const form = currentForm;
  await f.submit();
  assert.deepEqual(resets, [{ token: 'test-token', newPassword: 'new-test-password' }]);
  assert.deepEqual(form.getValues(), { newPassword: '', confirmPassword: '' });
  assert.deepEqual(history, [[null, '', '/reset-password']]);
  assert.match(f.text(), /previous sessions have been signed out/);
  assert.equal(f.renderer.root.findAllByType('form').length, 0);
});

test('expired or missing tokens offer a new link and never report a successful reset', async t => {
  const f = await fixture(t, { mode: 'reset', token: 'expired-test-token' });
  await f.values({ newPassword: 'new-test-password', confirmPassword: 'new-test-password' });
  resetResult = async () => ({ error: { code: 'INVALID_TOKEN' } });
  await f.submit(); assert.match(f.text(), /has expired/); assert.doesNotMatch(f.text(), /has been updated/);
  assert.equal(f.renderer.root.findAllByType('form').length, 0);
  const html = renderToStaticMarkup(React.createElement(PasswordResetForm, { mode: 'reset' }));
  assert.match(html, /href="\/forgot-password"/); assert.doesNotMatch(html, /<form/);
});

test('reset service errors preserve retry and password visibility controls work', async t => {
  const f = await fixture(t, { mode: 'reset', token: 'test-token' });
  const toggle = f.renderer.root.findAllByType('button').find(node => node.props['aria-controls'] === 'newPassword confirmPassword');
  await act(async () => toggle.props.onClick());
  assert.ok(f.renderer.root.findAllByType('input').every(input => input.props.type === 'text'));
  await f.values({ newPassword: 'new-test-password', confirmPassword: 'new-test-password' });
  resetResult = async () => ({ error: { status: 500 } });
  await f.submit(); assert.match(f.text(), /couldn.t reset/); assert.equal(history.length, 0);
  resetResult = async () => { throw new Error('Offline'); };
  await f.submit(); assert.match(f.text(), /couldn.t connect/); assert.equal(history.length, 0);
});
