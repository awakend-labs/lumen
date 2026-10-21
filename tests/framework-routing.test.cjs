require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NextRequest } = require('next/server');
const { middleware } = require('../src/middleware.ts');

test('Next 16 protected-route redirects preserve the complete callback path', () => {
  for (const route of ['/dashboard', '/projects/project-1/endpoints/endpoint-1/edit?from=search']) {
    const response = middleware(new NextRequest(`https://lumen.example${route}`));
    assert.equal(response.status, 307);
    const location = new URL(response.headers.get('location'));
    assert.equal(location.origin, 'https://lumen.example');
    assert.equal(location.pathname, '/login');
    assert.equal(location.searchParams.get('callbackUrl'), route);
  }
});

test('Next 16 cookie shortcuts leave session validation and expired-cookie recovery to the server', () => {
  for (const name of ['better-auth.session_token', '__Secure-better-auth.session_token']) {
    const headers = { cookie: `${name}=synthetic-test-only` };
    const landing = middleware(new NextRequest('https://lumen.example/', { headers }));
    assert.equal(landing.headers.get('location'), 'https://lumen.example/dashboard');
    for (const route of ['/login', '/signup', '/dashboard', '/projects/project-1']) {
      const response = middleware(new NextRequest(`https://lumen.example${route}`, { headers }));
      assert.equal(response.headers.get('location'), null);
      assert.equal(response.headers.get('x-middleware-next'), '1');
    }
  }
  const anonymousLanding = middleware(new NextRequest('https://lumen.example/'));
  assert.equal(anonymousLanding.headers.get('x-middleware-next'), '1');
});
