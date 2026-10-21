require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { renderToStaticMarkup } = require('react-dom/server');
const Module = require('node:module');
global.IS_REACT_ACT_ENVIRONMENT = true;
const Theme = React.createContext(null);
const originalLoad = Module._load;
let request, errors = [];
Module._load = function(name, parent, isMain) {
  if (name === 'next-themes') return { useTheme: () => React.useContext(Theme) };
  if (name === '@/lib/api') return { api: (...args) => request(...args) };
  if (name === 'sonner') return { toast: { error: message => errors.push(message) } };
  return originalLoad.call(this, name, parent, isMain);
};
const { ThemePreferenceProvider, useThemePreference } = require('../src/components/theme-preference-provider.tsx');
const { ProfileThemeSettings } = require('../src/features/profile/components/profile-theme-settings.tsx');

async function fixture(t, { initialTheme = 'dark', userId = 'first', initialBrowserTheme = initialTheme } = {}) {
  let current, renderer;
  errors = [];
  function Harness() {
    const [theme, setTheme] = React.useState(initialBrowserTheme);
    return React.createElement(Theme.Provider, { value: { theme, setTheme } },
      React.createElement(ThemePreferenceProvider, { userId, initialTheme }, React.createElement(Probe)));
  }
  function Probe() { current = useThemePreference(); return React.createElement(ProfileThemeSettings); }
  await act(async () => { renderer = create(React.createElement(React.StrictMode, null, React.createElement(Harness))); });
  t.after(async () => { await act(async () => renderer.unmount()); });
  return { get current() { return current; }, renderer };
}

test('profile offers accessible default choices and applies a theme only after the account save succeeds', async t => {
  let finish, sent;
  request = (url, init) => { sent = { url, input: JSON.parse(init.body) }; return new Promise(resolve => { finish = resolve; }); };
  const f = await fixture(t);
  assert.equal(f.renderer.root.findAllByType('input').length, 3);
  const light = f.renderer.root.findAllByType('input').find(input => input.props.value === 'light');
  let selection;
  await act(async () => { selection = light.props.onChange({ target: { value: 'light' } }); });
  assert.deepEqual(sent, { url: '/api/preferences/theme', input: { theme: 'light' } });
  assert.equal(f.current.theme, 'dark');
  assert.equal(f.current.isSaving, true);
  assert.equal(f.renderer.root.findByType('fieldset').props.disabled, true);
  await act(async () => { finish({ theme: 'light' }); await selection; });
  assert.equal(f.current.theme, 'light');
  assert.match(JSON.stringify(f.renderer.toJSON()), /Default theme saved/);
  assert.equal(f.current.isSaving, false);
});

test('failed saves retain the previous theme, report failure and allow retry', async t => {
  request = async () => { throw Error('offline'); };
  const f = await fixture(t);
  let result;
  await act(async () => { result = await f.current.setTheme('light'); });
  assert.equal(result, false);
  assert.equal(f.current.theme, 'dark');
  assert.equal(f.current.isSaving, false);
  assert.equal(errors.length, 1);
  request = async () => ({ theme: 'system' });
  await act(async () => { result = await f.current.setTheme('system'); });
  assert.equal(result, true);
  assert.equal(f.current.theme, 'system');
});

test('legacy preference initializes once, honors a choice from another device and never replays over later changes', async t => {
  const calls = [];
  request = async (_url, init) => { const input = JSON.parse(init.body); calls.push(input); return { theme: input.initialize ? 'light' : input.theme }; };
  const f = await fixture(t, { initialTheme: null, initialBrowserTheme: 'dark' });
  assert.deepEqual(calls, [{ theme: 'dark', initialize: true }]);
  assert.equal(f.current.theme, 'light');
  await act(async () => { await f.current.setTheme('system'); });
  assert.equal(f.current.theme, 'system');
  assert.deepEqual(calls, [{ theme: 'dark', initialize: true }, { theme: 'system' }]);
});

test('anonymous themes need no account request and the profile controls are disabled during SSR', async t => {
  request = () => { throw Error('anonymous request'); };
  const f = await fixture(t, { userId: null, initialTheme: null, initialBrowserTheme: 'dark' });
  await act(async () => { assert.equal(await f.current.setTheme('light'), true); });
  assert.equal(f.current.theme, 'light');
  const html = renderToStaticMarkup(React.createElement(Theme.Provider, { value: { theme: undefined, setTheme() {} } },
    React.createElement(ThemePreferenceProvider, { initialTheme: null }, React.createElement(ProfileThemeSettings))));
  assert.match(html, /<fieldset disabled=""/);
  assert.match(html, /Default theme/);
  assert.doesNotMatch(html, /checked=""/);
});
