require('../../tests/register.cjs');
const fs = require('node:fs');
const { randomUUID, createHash } = require('node:crypto');
const { gzipSync } = require('node:zlib');
const Module = require('node:module');
const { createLocalDatabase } = require('../../tests/helpers/neon-pglite.cjs');
const { performance } = require('node:perf_hooks');

async function main() {
  const local = await createLocalDatabase();
  const originalLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    if (request === '@/db') return { db: local.db };
    if (request === './session' && parent?.filename.endsWith('access.ts')) return { getServerSession: async () => null };
    return originalLoad.call(this, request, parent, isMain);
  };
  const service = require('../../src/server/projects.ts');
  const { endpoints } = require('../../src/db/schema');
  const { toEndpointSummary } = require('../../src/lib/endpoint-summary.ts');
  const results = [];
  try {
    await local.pg.exec(`insert into "user" (id,name,email) values ('benchmark','Benchmark','benchmark@example.test')`);
    for (const size of [50, 500, 2000]) {
      const projectId = randomUUID(), stashId = randomUUID();
      await local.pg.query('insert into projects(id,name,slug,owner_id) values($1,$2,$3,$4)', [projectId, `Fixture ${size}`, `fixture-${size}`, 'benchmark']);
      await local.pg.query('insert into project_members(project_id,user_id,role) values($1,$2,$3)', [projectId, 'benchmark', 'owner']);
      await local.pg.query('insert into stashes(id,project_id,name) values($1,$2,$3)', [stashId, projectId, 'Routes']);
      for (let offset = 0; offset < size; offset += 100) {
        const values = Array.from({ length: Math.min(100, size - offset) }, (_, item) => {
          const n = offset + item;
          const body = { items: Array.from({ length: 70 }, (_, i) => ({ id: i, name: `Item ${n}-${i}`, token: createHash('sha256').update(`${n}:${i}`).digest('hex'), amount: 998 })) };
          return { id: randomUUID(), projectId, stashId, name: `Read ${n}`, path: `/items/${n}`, method: 'GET', version: n % 2 ? '' : 'v1', description: 'Documented endpoint', order: n,
            requestBody: { schema: { type: 'object' }, example: { amount: 998 }, exampleSource: '{"amount":998.0}' },
            responses: [{ statusCode: 200, description: 'Successful result', body, bodySource: JSON.stringify(body) }] };
        });
        await local.db.insert(endpoints).values(values);
      }
      let full, summary;
      const fullMs = [], summaryMs = [];
      for (let run = 0; run < 6; run++) {
        let start = performance.now(); full = await service.getProjectDetail('benchmark', projectId); const f = performance.now() - start;
        start = performance.now(); summary = await service.getProjectSummary('benchmark', projectId); const s = performance.now() - start;
        if (run) { fullMs.push(f); summaryMs.push(s); }
      }
      const expected = full.stashes[0].endpoints.map(toEndpointSummary);
      require('node:assert/strict').deepEqual(summary.stashes[0].endpoints, expected);
      const fullJson = JSON.stringify(full), summaryJson = JSON.stringify(summary);
      const median = values => values.sort((a,b) => a-b)[Math.floor(values.length/2)];
      results.push({ endpoints: size, fullBytes: Buffer.byteLength(fullJson), summaryBytes: Buffer.byteLength(summaryJson), fullGzipBytes: gzipSync(fullJson).length, summaryGzipBytes: gzipSync(summaryJson).length,
        fullReadMedianMs: +median(fullMs).toFixed(2), summaryReadMedianMs: +median(summaryMs).toFixed(2), selectedEndpointBytes: Buffer.byteLength(JSON.stringify(full.stashes[0].endpoints[0])) });
      console.log(`Verified ${size} endpoints`);
    }
    const report = { environment: 'Local in-memory PostgreSQL via the Neon Drizzle adapter; synthetic documents; five measured warm reads after one warmup. No live database or network writes.', results };
    fs.writeFileSync('docs/performance-runtime-results.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally { Module._load = originalLoad; await local.pg.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
