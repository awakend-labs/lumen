require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { QueryClient } = require('@tanstack/react-query');
const originalLoad = Module._load;
let client = new QueryClient();
let session, preview, project, mutationState, queries, mutations, confirmations;
let removals = 0;
let lastFormDefaults;
const hookForm = require('react-hook-form');
const blankMutation = { isPending: false, isError: false, mutate: () => { removals += 1; }, reset() {} };
function reset() {
  client = new QueryClient();
  session = { data: { user: { id: 'invitee', email: 'invitee@example.com' } }, isPending: false, error: null };
  preview = { data: { projectId: 'p', projectName: 'Example', email: 'invitee@example.com', role: 'viewer', status: 'pending' }, isLoading: false, isError: false };
  project = { data: { id: 'p', role: 'viewer' }, isLoading: false, isError: false };
  mutationState = blankMutation; queries = {}; mutations = []; confirmations = []; removals = 0;
}
Module._load = function(request, parent, isMain) {
  if (request === '@/components/theme-preference-provider') return { useThemePreference: () => ({ theme: 'dark', isSaving: false, setTheme: async () => true }) };
  if (request === 'react-hook-form') return { ...hookForm, useForm: options => { lastFormDefaults = options.defaultValues; return hookForm.useForm(options); } };
  if (request === 'react' && parent?.filename.endsWith('project-frame.tsx')) return { ...React, useSyncExternalStore: () => true };
  if (request === 'next/navigation') return { useRouter: () => ({ replace() {} }), useSearchParams: () => new URLSearchParams() };
  if (request === 'next/link') return function TestLink({ children, ...props }) { return React.createElement('a', props, children); };
  if (request === 'sonner') return { toast: { success() {}, error() {} } };
  if (request === '@/lib/auth-client') return { authClient: { useSession: () => session } };
  if (request === '@/features/projects/queries') return { useProject: () => project, projectKeys: { all: ['projects'], detail: id => ['projects', id], summary: id => ['project-summary', id] } };
  if (request === '@/features/invitations/queries') return { useInvitationPreview: () => preview, useAcceptInvitation: () => mutationState };
  if (request === '@tanstack/react-query') return {
    useQueryClient: () => client,
    useQuery: options => queries[options.queryKey[0]] ?? { data: [], isLoading: false, isError: false, isFetching: false },
    useMutation: options => { mutations.push(options); return mutationState; },
  };
  if (request === '@/components/confirm-delete') return { ConfirmDelete: props => { confirmations.push(props); return props.trigger; } };
  return originalLoad.call(this, request, parent, isMain);
};
const { InviteAccept } = require('../src/features/invitations/components/invite-accept.tsx');
const { ProjectFrame } = require('../src/features/projects/components/project-frame.tsx');
const { ProjectSettings } = require('../src/features/members/components/project-settings.tsx');
const { useInviteMember, useRevokeInvitation } = require('../src/features/members/queries.ts');
const { useAcceptInvitation } = require('../src/features/invitations/queries.ts');
const { useCreateStash } = require('../src/features/stashes/queries.ts');
const { EndpointForm } = require('../src/features/endpoints/components/endpoint-form.tsx');
const { AuthForm } = require('../src/features/auth/components/auth-form.tsx');
const { EnumValuesEditor } = require('../src/features/endpoints/components/enum-values-editor.tsx');
const { CompactMarkdown } = require('../src/components/compact-markdown.tsx');
const renderInvite = () => renderToStaticMarkup(React.createElement(InviteAccept, { token: 'fixture' }));

test('invite UI hides Accept for another email, during session loading, and on session errors', () => {
  reset(); session.data.user.email = 'wrong@example.com';
  let html = renderInvite();
  assert.match(html, /This invitation is for/); assert.match(html, /Use the invited account/);
  assert.doesNotMatch(html, /Accept invitation/);
  preview.data.status = 'accepted';
  assert.doesNotMatch(renderInvite(), /Open project/);
  reset(); session.isPending = true;
  html = renderInvite(); assert.match(html, /Checking your account/); assert.doesNotMatch(html, /Accept invitation|Sign in to accept/);
  reset(); session.error = { message: 'Session failed' };
  html = renderInvite(); assert.match(html, /couldn’t verify your account/); assert.doesNotMatch(html, /Accept invitation/);
  reset(); session.data.user.email = 'INVITEE@EXAMPLE.COM';
  assert.match(renderInvite(), /Accept invitation/);
  reset(); session.data = null;
  assert.match(renderInvite(), /Sign in to accept/);
});

test('expired, revoked, and failed invitations have visible feedback instead of actionable acceptance', () => {
  reset(); preview.data.status = 'expired';
  assert.match(renderInvite(), /invitation is.*expired/s); assert.doesNotMatch(renderInvite(), /Accept invitation/);
  reset(); preview = { isError: true, error: new Error('Invitation not found') };
  assert.match(renderInvite(), /Invitation not found/); assert.doesNotMatch(renderInvite(), /Accept invitation/);
  reset(); mutationState = { ...blankMutation, isError: true, error: new Error('Invitation changed') };
  assert.match(renderInvite(), /role="alert"[^>]*>Invitation changed/);
});

test('read-only and removed collaborators never render editor content, even with cached project data', () => {
  reset(); let renderedEditor = false;
  const render = () => renderToStaticMarkup(React.createElement(ProjectFrame, { projectId: 'p', editable: true }, () => { renderedEditor = true; return 'Editor content'; }));
  assert.match(render(), /Read-only access/); assert.equal(renderedEditor, false);
  project = { ...project, isError: true, error: new Error('Project not found') };
  assert.match(render(), /Project unavailable/); assert.equal(renderedEditor, false);
  project = { data: { id: 'p', role: 'editor' }, isLoading: false, isError: false };
  assert.match(render(), /Editor content/); assert.equal(renderedEditor, true);
});

test('member removal requires confirmation and the pending invite list does not flash an empty state', () => {
  reset(); queries.members = { data: [{ id: 'member', name: 'Invitee', email: 'invitee@example.com', role: 'viewer', createdAt: new Date().toISOString() }] };
  mutationState = { ...blankMutation, isPending: true };
  const render = () => renderToStaticMarkup(React.createElement(ProjectSettings, { projectId: 'p', role: 'owner' }));
  assert.doesNotMatch(render(), /No pending invitations/);
  assert.equal(confirmations.length, 1); assert.equal(confirmations[0].confirmLabel, 'Remove collaborator');
  assert.match(confirmations[0].description, /invitee@example.com.*lose access/);
  assert.equal(confirmations[0].trigger.props.onClick, undefined); assert.equal(removals, 0);
  confirmations[0].onConfirm(); assert.equal(removals, 1);
  confirmations = []; mutationState = blankMutation;
  assert.match(render(), /No pending invitations/);
  queries.invitations = { data: [], isFetching: true };
  assert.doesNotMatch(render(), /No pending invitations/);
});

test('acceptance removes cached no-access data and navigates to a fresh project page', () => {
  reset(); let destination;
  global.window = { location: { replace: path => { destination = path; } } };
  client.setQueryData(['project-summary', 'p'], { unavailable: true });
  client.setQueryData(['projects'], []);
  client.setQueryData(['invitation', 'fixture'], preview.data);
  useAcceptInvitation('fixture');
  mutations.at(-1).onSuccess({ projectId: 'p' });
  assert.equal(client.getQueryData(['project-summary', 'p']), undefined);
  assert.equal(client.getQueryState(['projects']).isInvalidated, true);
  assert.equal(client.getQueryData(['invitation', 'fixture']).status, 'accepted');
  assert.equal(destination, '/projects/p');
  delete global.window;
});

test('creating an invitation cancels a stale list request before updating the cache', async () => {
  reset(); let finishOldRequest;
  client.setQueryData(['invitations', 'p'], []);
  const staleFetch = client.fetchQuery({ queryKey: ['invitations', 'p'], queryFn: () => new Promise(resolve => { finishOldRequest = resolve; }) }).catch(() => {});
  useInviteMember('p'); const mutation = mutations.at(-1);
  await mutation.onMutate();
  const created = { id: 'invite', email: 'invitee@example.com', role: 'viewer' };
  await mutation.onSuccess(created);
  finishOldRequest([]); await staleFetch;
  assert.deepEqual(client.getQueryData(['invitations', 'p']), [created]);
  await mutation.onSuccess({ ...created, role: 'editor' });
  assert.deepEqual(client.getQueryData(['invitations', 'p']), [{ ...created, role: 'editor' }]);
});

test('creating a second stash caches complete empty groups and endpoints without crashing', async () => {
  reset(); client.setQueryData(['project-summary', 'p'], { id: 'p', stashes: [{ id: 'existing', groups: [], endpoints: [] }] });
  client.setQueryData(['projects'], [{ id: 'p', stashCount: 1, previewStashes: [{ id: 'existing' }] }]);
  useCreateStash('p'); await mutations.at(-1).onSuccess({ id: 'new', projectId: 'p', name: 'New stash' });
  const stashes = client.getQueryData(['project-summary', 'p']).stashes;
  assert.equal(stashes.length, 2);
  assert.deepEqual(stashes[1].groups, []); assert.deepEqual(stashes[1].endpoints, []);
  assert.equal(stashes.reduce((sum, stash) => sum + stash.groups.length + stash.endpoints.length, 0), 0);
  assert.equal(client.getQueryData(['projects'])[0].stashCount, 2);
});

test('revoke removes the invitation immediately and a stale list cannot restore it', async () => {
  reset(); const invitation = { id: 'i', link: 'https://example.com/invite/test' };
  client.setQueryData(['invitations','p'], [invitation]);
  let finish; const old = client.fetchQuery({ queryKey: ['invitations','p'], queryFn: () => new Promise(resolve => { finish = resolve; }) }).catch(()=>{});
  useRevokeInvitation('p'); const mutation = mutations.at(-1);
  await mutation.onMutate(); await mutation.onSuccess(undefined, 'i');
  finish([invitation]); await old;
  assert.deepEqual(client.getQueryData(['invitations','p']), []);
});

test('settings does not render cached member emails for a viewer', () => {
  reset(); queries.members = { data: [{ id: 'member', name: 'Owner', email: 'private@example.com', role: 'owner' }] };
  assert.equal(renderToStaticMarkup(React.createElement(ProjectSettings, { projectId: 'p', role: 'viewer' })), '');
});

test('editors see read-only members, with no invite form or owner controls even if invitations are cached', () => {
  reset();
  queries.members = { data: [{ id: 'member', name: 'Collaborator', email: 'collaborator@example.com', role: 'viewer', createdAt: new Date().toISOString() }] };
  queries.invitations = { data: [{ id: 'invite', email: 'pending@example.com', role: 'editor', expiresAt: new Date().toISOString(), link: 'https://example.com/invite/test' }] };
  const render = role => renderToStaticMarkup(React.createElement(ProjectSettings, { projectId: 'p', role }));
  assert.match(render('owner'), /invite-email/);
  confirmations = [];
  const html = render('editor');
  assert.match(html, /Members/); assert.match(html, /collaborator@example.com/);
  assert.doesNotMatch(html, /invite-email|Create link|Pending invitations|pending@example.com|Remove|Revoke|role="combobox"/);
  assert.equal(confirmations.length, 0);
});

test('new endpoints start with the project Base URL and duplicates retain their override', () => {
  reset(); const stashId = '11111111-1111-4111-8111-111111111111';
  const props = { projectId: 'p', stashes: [{id:stashId,groups:[],endpoints:[]}], initialStashId:stashId, projectBaseUrl: 'https://api.example.com/v1' };
  assert.match(renderToStaticMarkup(React.createElement(EndpointForm, props)), /value="https:\/\/api.example.com\/v1"/);
  assert.match(renderToStaticMarkup(React.createElement(EndpointForm, { ...props, duplicateFrom: {id:'e',name:'Copy',baseUrl:'https://other.example.com',method:'GET'} })), /value="https:\/\/other.example.com"/);
});

test('unversioned endpoints keep a blank version when edited or duplicated and render no version badge', () => {
  reset();
  const { EndpointVersionBadge } = require('../src/components/method-badge.tsx');
  assert.equal(renderToStaticMarkup(React.createElement(EndpointVersionBadge, { version: '' })), '');
  assert.match(renderToStaticMarkup(React.createElement(EndpointVersionBadge, { version: 'v2' })), /v2/);
  const stashId = '11111111-1111-4111-8111-111111111111';
  const props = { projectId: 'p', stashes: [{ id: stashId, groups: [], endpoints: [] }], initialStashId: stashId };
  const endpoint = { id: 'e', name: 'No version', stashId, method: 'GET', version: '' };
  for (const source of [{ endpoint }, { duplicateFrom: endpoint }]) {
    const html = renderToStaticMarkup(React.createElement(EndpointForm, { ...props, ...source }));
    assert.equal(lastFormDefaults.version, '');
    assert.match(html, /Leave blank for an unversioned endpoint/);
    assert.doesNotMatch(html, /Version is required/);
  }
});

test('response example has a connected label and the generated schema starts collapsed', () => {
  reset(); const stashId = '11111111-1111-4111-8111-111111111111';
  const html = renderToStaticMarkup(React.createElement(EndpointForm, { projectId: 'p', stashes: [{ id: stashId, groups: [], endpoints: [] }], initialStashId: stashId }));
  for (const type of ['body']) {
    const id = html.match(new RegExp(`for="(response-${type}-[^\"]+)"`))?.[1];
    assert.ok(id, `response ${type} label`);
    assert.ok((html.match(/<textarea\b[^>]*>/g) ?? []).some(tag => tag.includes(`id="${id}"`)), `response ${type} input`);
  }
  assert.match(html, /Generated from example/);
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /id="response-schema-/);
});

test('login and signup are safe before hydration: native POST fallback and disabled fieldset', () => {
  reset(); for (const mode of ['login', 'signup']) {
    const html = renderToStaticMarkup(React.createElement(AuthForm, { mode }));
    const form = html.match(/<form\b[^>]*>/)?.[0] ?? '';
    assert.match(form, /method="post"/);
    assert.match(form, /action="\/api\/auth\/form-unavailable\?mode=/);
    assert.match(html, /<fieldset disabled=""/);
    assert.match(html, /type="password"/);
  }
});

test('compact descriptions preserve real unordered and ordered Markdown lists', () => {
  const html = renderToStaticMarkup(React.createElement(CompactMarkdown, { content: '- first\n- **second**\n\n1. step one\n2. step two' }));
  assert.match(html, /<ul>/); assert.match(html, /<ol>/); assert.match(html, /<li><strong>second<\/strong><\/li>/);
});

test('enum values are separate removable entries, including a value containing a comma', () => {
  const html = renderToStaticMarkup(React.createElement(EnumValuesEditor, { values: ['admin', 'member, guest'], onChange() {} }));
  assert.equal((html.match(/<li /g) ?? []).length, 2);
  assert.match(html, /Remove allowed value member, guest/); assert.match(html, /New allowed value/);
  assert.doesNotMatch(html, /comma separated/);
});

test('POST response defaults to 200 and path parameter Add is no longer permanently disabled', () => {
  reset(); const stashId = '11111111-1111-4111-8111-111111111111';
  const html = renderToStaticMarkup(React.createElement(EndpointForm, { projectId: 'p', stashes: [{ id: stashId, groups: [], endpoints: [] }], endpoint: { id: 'e', stashId, method: 'POST', responses: [] } }));
  assert.match(html, /value="OK"/);
  const section = html.slice(html.indexOf('id="path-parameters"'), html.indexOf('id="body-fields"'));
  assert.ok(section.length); const add = section.match(/<button[^>]*>/)?.[0];
  assert.ok(add); assert.doesNotMatch(add, /\sdisabled(?:=|\s|>)/);
});

test('revoking an invitation requires an explicit confirmation', () => {
  reset(); queries.invitations = { data: [{ id: 'i', email: 'invitee@example.com', role: 'viewer', expiresAt: new Date().toISOString(), link: 'https://example.com/invite/fixture' }] };
  renderToStaticMarkup(React.createElement(ProjectSettings, { projectId: 'p', role: 'owner' }));
  const revoke = confirmations.find(item => item.confirmLabel === 'Revoke invitation');
  assert.ok(revoke); assert.equal(revoke.trigger.props.onClick, undefined); assert.equal(removals, 0);
  revoke.onConfirm(); assert.equal(removals, 1);
});

test('new endpoints inherit project auth, while edits and duplicates retain explicit Public access', () => {
  reset();
  const { generateCurl } = require('../src/lib/curl.ts');
  const stashId = '11111111-1111-4111-8111-111111111111';
  const auth = { scheme: 'bearer', headerName: 'X-API-Key', location: 'header', description: '' };
  const props = { projectId: 'p', stashes: [{ id: stashId, groups: [], endpoints: [] }], initialStashId: stashId, projectAuth: auth };
  renderToStaticMarkup(React.createElement(EndpointForm, props));
  assert.equal(lastFormDefaults.access, 'authenticated');
  assert.match(generateCurl({ ...lastFormDefaults, requestBody: null }, auth), /Authorization: Bearer YOUR_TOKEN/);
  const existing = { id: 'e', name: 'Public endpoint', stashId, access: 'public', updatedAt: '2026-10-20T00:00:00.000Z' };
  renderToStaticMarkup(React.createElement(EndpointForm, { ...props, endpoint: existing }));
  assert.equal(lastFormDefaults.access, 'public'); assert.equal(lastFormDefaults.expectedUpdatedAt, existing.updatedAt);
  renderToStaticMarkup(React.createElement(EndpointForm, { ...props, duplicateFrom: existing }));
  assert.equal(lastFormDefaults.access, 'public');
  renderToStaticMarkup(React.createElement(EndpointForm, { ...props, projectAuth: { ...auth, scheme: 'none' } }));
  assert.equal(lastFormDefaults.access, 'public');
});

test('deprecated endpoint details show a warning and strike through the title', () => {
  reset();
  const { EndpointDetail } = require('../src/features/endpoints/components/endpoint-detail.tsx');
  const endpoint = { id: 'e', name: 'Old orders', method: 'GET', path: '/orders', baseUrl: '', version: 'v1', access: 'public', tags: [], headers: [], queryParams: [], pathParams: [], responses: [], description: '', requestBody: null };
  const render = isDeprecated => renderToStaticMarkup(React.createElement(EndpointDetail, { projectId: 'p', role: 'viewer', endpoint: { ...endpoint, isDeprecated } }));
  const deprecated = render(true);
  assert.match(deprecated, />Deprecated</); assert.match(deprecated, /Avoid using it in new integrations/);
  assert.match(deprecated, /<h1[^>]*line-through/);
  const active = render(false);
  assert.doesNotMatch(active, />Deprecated<|Avoid using it in new integrations|<h1[^>]*line-through/);
});

test('reopened JSON editors and read-only panels retain authored decimal spelling', () => {
  reset();
  const { JsonBlock } = require('../src/features/endpoints/components/endpoint-detail.tsx');
  const body = { amount: 998 }, source = '{"amount":998.0}';
  const stashId = '11111111-1111-4111-8111-111111111111';
  renderToStaticMarkup(React.createElement(EndpointForm, {
    projectId: 'p', stashes: [{ id: stashId, groups: [], endpoints: [] }],
    endpoint: { id: 'e', stashId, requestBody: { example: body, exampleSource: source }, responses: [{ statusCode: 200, body, bodySource: source }] },
  }));
  assert.match(lastFormDefaults.requestExample, /998\.0/);
  assert.match(lastFormDefaults.responses[0].body, /998\.0/);
  assert.match(renderToStaticMarkup(React.createElement(JsonBlock, { title: 'Example', value: body, source })), /998\.0/);
});
