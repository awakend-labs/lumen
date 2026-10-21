// Creates a temporary, isolated browser fixture. It never authenticates or writes to a database.
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const directory = path.resolve('src/app/performance-regression-fixture');
const file = path.join(directory, 'page.tsx');
if (fs.existsSync(directory)) throw Error('The temporary fixture directory already exists; refusing to overwrite it.');
const projectId = '11111111-1111-4111-8111-111111111111';
const stashId = '22222222-2222-4222-8222-222222222222';
const endpoint = { id: '33333333-3333-4333-8333-333333333333', projectId, stashId, groupId: null, name: 'Read account', method: 'GET', path: '/accounts/{id}', baseUrl: 'https://api.example.test', description: '## Read an account\nReturns **documented** account details.', version: '', access: 'authenticated', isDeprecated: false, tags: ['accounts'], headers: [], queryParams: [], pathParams: [{ key: 'id', type: 'string', value: '123', required: true, description: 'Account ID' }],
  requestBody: { fields: [{ key: 'amount', type: 'number', value: '998.0', required: true, description: 'Amount' }], schema: { type: 'object', properties: { custom: { type: 'number' } } }, schemaSource: '{"type":"object","properties":{"custom":{"type":"number"}}}', example: { custom: 998 }, exampleSource: '{"custom":998.0}' },
  responses: [{ statusCode: 200, description: 'Account returned', body: { total: 998 }, bodySource: '{"total":998.0}', schema: { type: 'object', properties: { total: { type: 'number' } } } }, { statusCode: 409, description: 'Conflict response', useSharedError: true }], order: 0, createdAt: '2026-10-21T00:00:00.000Z', updatedAt: '2026-10-21T00:00:00.000Z' };
fs.mkdirSync(directory);
fs.writeFileSync(file, `"use client";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EndpointForm } from "@/features/endpoints/components/endpoint-form";
import { EndpointBrowser } from "@/features/endpoints/components/endpoint-browser";
import { ResponsesView } from "@/features/endpoints/components/responses-view";
import { toEndpointSummary } from "@/lib/endpoint-summary";
import type { EndpointRecord, ProjectSummary } from "@/lib/types";
const endpoint: EndpointRecord = ${JSON.stringify(endpoint)};
const project: ProjectSummary = { id: endpoint.projectId, name: "Local fixture", slug: "local-fixture", description: "Synthetic regression data", baseUrl: endpoint.baseUrl, auth: { scheme: "bearer", headerName: "X-API-Key", location: "header", description: "" }, role: "owner", status: "in_progress", createdAt: endpoint.createdAt, updatedAt: endpoint.updatedAt, responseErrorFormat: { body: { error: "CONFLICT" }, schema: { type: "object", properties: { error: { type: "string" } } } }, stashes: [{ id: endpoint.stashId, projectId: endpoint.projectId, name: "Accounts", description: "Synthetic routes", color: "blue", status: "active", order: 0, groups: [], createdAt: endpoint.createdAt, updatedAt: endpoint.updatedAt, endpoints: [toEndpointSummary(endpoint)] }] };
export default function Review() {
 const [ready, setReady] = useState(false);
 const [section, setSection] = useState("editor");
 const [kind, setKind] = useState("edit");
 const [writes, setWrites] = useState(0);
 const [preference, setPreference] = useState("grid");
 const [client] = useState(() => { const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } }); client.setQueryData(["project-summary", project.id], project); client.setQueryData(["preferences"], { endpointView: "grid" }); return client; });
 useEffect(() => {
  const original = window.fetch;
  let order = 0; let endpointView = "grid";
  window.fetch = async (input, init) => {
   const url = String(input);
   if (url === "/api/preferences") { if (init?.body) { endpointView = JSON.parse(String(init.body)).endpointView; setPreference(endpointView); } return Response.json({ endpointView }); }
   if (!url.startsWith("/api/projects/" + project.id)) return original(input, init);
   if (init?.method && init.method !== "GET") setWrites(value => value + 1);
   if (url.includes("/drafts/")) return Response.json({ revision: "local-revision", writeOrder: ++order, payload: null });
   if (url.endsWith("/response-error-format")) return Response.json(init?.body ? JSON.parse(String(init.body)) : project.responseErrorFormat);
   if (url.endsWith("/summary")) return Response.json(project);
   return Response.json({ error: "This local fixture does not save real endpoints." }, { status: 503 });
  };
  setReady(true);
  return () => { window.fetch = original; };
 }, []);
 return <QueryClientProvider client={client}><main className="mx-auto max-w-6xl space-y-6 p-6"><h1>Local performance regression fixture</h1><p>No live data. Simulated writes: {writes}. Saved fixture preference: {preference}</p><nav className="flex gap-3">{["editor", "browser", "responses"].map(value => <button key={value} onClick={() => setSection(value)}>{value}</button>)}</nav>{ready && <>{section === "browser" ? <EndpointBrowser project={project} /> : section === "responses" ? <ResponsesView responses={endpoint.responses} method={endpoint.method} endpointName={endpoint.name} shared={project.responseErrorFormat} /> : <><nav className="flex gap-3">{["edit", "new", "duplicate"].map(value => <button key={value} onClick={() => setKind(value)}>{value}</button>)}</nav><EndpointForm key={kind} projectId={project.id} stashes={project.stashes} projectBaseUrl={project.baseUrl} projectAuth={project.auth} initialStashId={endpoint.stashId} endpoint={kind === "edit" ? endpoint : undefined} duplicateFrom={kind === "duplicate" ? endpoint : undefined} /></>}</>}</main></QueryClientProvider>;
}
`);
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--webpack', '--port', '3117', '--hostname', '127.0.0.1'], { stdio: 'inherit', windowsHide: true, env: { ...process.env, LUMEN_PERFORMANCE_RUN: '1', LUMEN_PERFORMANCE_BUNDLER: 'webpack' } });
function cleanup() {
  if (fs.existsSync(file)) fs.unlinkSync(file);
  if (fs.existsSync(directory) && fs.readdirSync(directory).length === 0) fs.rmdirSync(directory);
  const config = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  config.include = config.include.filter(item => !item.startsWith('.next-performance/'));
  fs.writeFileSync('tsconfig.json', JSON.stringify(config, null, 2) + '\n');
}
process.once('SIGINT', () => {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  else child.kill('SIGTERM');
  cleanup(); process.exit();
});
child.once('exit', code => { cleanup(); process.exitCode = code ?? 1; });
