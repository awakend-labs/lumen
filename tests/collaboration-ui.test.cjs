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
const blankMutation = { isPending: false, isError: false, mutate: () => { removals += 1; }, reset() {} };
function reset() {
  client = new QueryClient();
  session = { data: { user: { id: 'invitee', email: 'invitee@example.com' } }, isPending: false, error: null };
  preview = { data: { projectId: 'p', projectName: 'Example', email: 'invitee@example.com', role: 'viewer', status: 'pending' }, isLoading: false, isError: false };
  project = { data: { id: 'p', role: 'viewer' }, isLoading: false, isError: false };
  mutationState = blankMutation; queries = {}; mutations = []; confirmations = []; removals = 0;
}
Module._load = function(request, parent, isMain) {
  if (request === 'react' && parent?.filename.endsWith('project-frame.tsx')) return { ...React, useSyncExternalStore: () => true };
  if (request === 'next/navigation') return { useRouter: () => ({ replace() {} }) };
  if (request === 'next/link') return function TestLink({ children, ...props }) { return React.createElement('a', props, children); };
  if (request === 'sonner') return { toast: { success() {}, error() {} } };
  if (request === '@/lib/auth-client') return { authClient: { useSession: () => session } };
  if (request === '@/features/projects/queries') return { useProject: () => project };
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
const { useInviteMember } = require('../src/features/members/queries.ts');
const { useAcceptInvitation } = require('../src/features/invitations/queries.ts');
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
  client.setQueryData(['projects', 'p'], { unavailable: true });
  client.setQueryData(['projects'], []);
  client.setQueryData(['invitation', 'fixture'], preview.data);
  useAcceptInvitation('fixture');
  mutations.at(-1).onSuccess({ projectId: 'p' });
  assert.equal(client.getQueryData(['projects', 'p']), undefined);
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
