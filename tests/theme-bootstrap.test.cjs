require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { themeBootstrapScript, themeStorageKey } = require('../src/lib/theme.ts');

function run(script, { stored = {}, dark = false, blocked = false } = {}) {
  const classes = new Set(['h-full', 'antialiased']);
  const root = { style: {}, classList: { remove: (...values) => values.forEach(value => classes.delete(value)), add: value => classes.add(value) } };
  vm.runInNewContext(script, {
    document: { documentElement: root },
    window: { matchMedia: () => ({ matches: dark }) },
    localStorage: { getItem: key => { if (blocked) throw Error('blocked'); return stored[key]; }, setItem: (key, value) => { if (blocked) throw Error('blocked'); stored[key] = value; } },
  });
  return { classes: [...classes], scheme: root.style.colorScheme, stored };
}

test('first-paint bootstrap honors the account before stale browser values and isolates account caches', () => {
  const key = themeStorageKey('first');
  const result = run(themeBootstrapScript('dark', key), { stored: { [key]: 'light', theme: 'light', [themeStorageKey('second')]: 'light' } });
  assert.deepEqual(result.classes, ['h-full', 'antialiased', 'dark']);
  assert.equal(result.scheme, 'dark');
  assert.equal(result.stored[key], 'dark');
  assert.equal(result.stored[themeStorageKey('second')], 'light');
});

test('existing browser choices migrate; system, missing, invalid and unavailable storage are handled before hydration', () => {
  const script = themeBootstrapScript(null, themeStorageKey('first'));
  assert.equal(run(script, { stored: { theme: 'dark' } }).scheme, 'dark');
  assert.equal(run(script, { dark: true }).scheme, 'dark');
  assert.equal(run(script, { dark: false }).scheme, 'light');
  assert.equal(run(script, { dark: true, stored: { theme: 'invalid' } }).scheme, 'dark');
  assert.equal(run(script, { dark: true, blocked: true }).scheme, 'dark');
  assert.equal(run(themeBootstrapScript('dark', 'theme'), { blocked: true }).scheme, 'dark');
  assert.equal(run(themeBootstrapScript('light', 'theme'), { dark: true }).scheme, 'light');
  assert.equal(run(themeBootstrapScript('system', 'theme'), { dark: true }).scheme, 'dark');
});

test('Worker keepNames transformation cannot inject missing helpers into the browser script', () => {
  const esbuild = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('drizzle-kit'))] }));
  const filename = path.resolve(__dirname, '../src/lib/theme.ts');
  const built = esbuild.transformSync(fs.readFileSync(filename, 'utf8'), { loader: 'ts', format: 'cjs', keepNames: true });
  const bundled = new Module(filename, module);
  bundled._compile(built.code, filename);
  const script = bundled.exports.themeBootstrapScript('dark', 'theme');
  assert.doesNotMatch(script, /__name/);
  assert.equal(run(script).scheme, 'dark');
  assert.doesNotMatch(themeBootstrapScript(null, '</script>'), /<\/script>/);
});

test('root layout sends the database theme and an executable head script before body content', async () => {
  const originalLoad = Module._load;
  let session = { user: { id: 'first' }, session: { token: 'secret-session-token' } };
  Module._load = function(request, parent, isMain) {
    if (request === '@/components/providers') return { Providers: () => null };
    if (request === '@/server/session') return { getServerSession: async () => session };
    if (request === '@/server/preferences') return { getThemePreference: async () => 'dark' };
    if (request === './globals.css') return {};
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    const Layout = require('../src/app/layout.tsx').default;
    const root = await Layout({ children: 'content' });
    assert.match(root.props.className, /dark/);
    assert.equal(root.props.style.colorScheme, 'dark');
    const [head, body] = root.props.children;
    assert.equal(head.type, 'head');
    assert.equal(head.props.children.props['data-cfasync'], 'false');
    assert.equal(run(head.props.children.props.dangerouslySetInnerHTML.__html).scheme, 'dark');
    assert.equal(body.props.children.props.initialTheme, 'dark');
    assert.doesNotMatch(JSON.stringify(root), /secret-session-token/);
    session = null;
    const anonymous = await Layout({ children: 'content' });
    assert.equal(anonymous.props.children[1].props.children.props.initialTheme, null);
  } finally { Module._load = originalLoad; }
});
