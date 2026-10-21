require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const originalLoad = Module._load;
const projectId = '11111111-1111-4111-8111-111111111111';
const stashId = '22222222-2222-4222-8222-222222222222';
const endpointId = '33333333-3333-4333-8333-333333333333';
const missingId = '44444444-4444-4444-8444-444444444444';
const project = { id: projectId, stashes: [{ id: stashId, endpoints: [{ id: endpointId }] }] };
let error;
Module._load = function(request, parent, isMain) {
  if (parent?.filename.endsWith('page-access.ts')) {
    if (request === './access') return { requireUser: async () => ({ id: 'owner' }) };
    if (request === './projects') return { getProjectSummary: async () => { if (error) throw error; return project; }, getEndpoint: async (_user, id, endpoint) => { if (error) throw error; const found = id === projectId && project.stashes[0].endpoints.find(row => row.id === endpoint); if (!found) throw new (require('../src/server/http.ts').HttpError)(404, 'Endpoint not found'); return { endpoint: found, role: 'owner' }; } };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const { HttpError } = require('../src/server/http.ts');
const { loadProjectPage, loadEndpointPage, loadStashPage } = require('../src/server/page-access.ts');
const isNotFound = error => error.digest === 'NEXT_HTTP_ERROR_FALLBACK;404';

test('page loaders return resources only from the authorized project and use server 404s for missing resources', async () => {
  assert.equal((await loadEndpointPage(projectId, endpointId)).endpoint.id, endpointId);
  assert.equal((await loadStashPage(projectId, stashId)).id, stashId);
  await assert.rejects(loadProjectPage('invalid'), isNotFound);
  await assert.rejects(loadEndpointPage(projectId, missingId), isNotFound);
  await assert.rejects(loadEndpointPage(projectId, 'invalid'), isNotFound);
  await assert.rejects(loadStashPage(projectId, missingId), isNotFound);
  await assert.rejects(loadStashPage(projectId, 'invalid'), isNotFound);
  error = new HttpError(404, 'Project not found');
  await assert.rejects(loadProjectPage(projectId), isNotFound);
  error = new HttpError(500, 'Database unavailable');
  await assert.rejects(loadProjectPage(projectId), /Database unavailable/);
  error = undefined;
});
