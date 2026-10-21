// Explicit staging connection only. EXPLAIN ANALYZE executes bounded read queries; no writes or schema changes.
const { neon } = require('@neondatabase/serverless');
const fs = require('node:fs');

async function main() {
  const connection = process.env.LUMEN_STAGING_DATABASE_URL;
  const userId = process.env.LUMEN_STAGING_USER_ID;
  if (!connection || !userId) throw Error('Set LUMEN_STAGING_DATABASE_URL and LUMEN_STAGING_USER_ID explicitly. Production .env is not loaded.');
  const sql = neon(connection);
  const results = [];
  for (const query of ['ab', 'document', 'GET /', '%_', '\\']) {
    const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
    const rows = await sql.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      select e.id, e.name, e.path, e.method, e.version, e.project_id, p.name, s.name
      from endpoints e
      inner join projects p on p.id = e.project_id
      inner join stashes s on s.id = e.stash_id
      inner join project_members m on m.project_id = e.project_id
      where m.user_id = $1 and (e.name ilike $2 or e.path ilike $2 or e.description ilike $2
        or array_to_string(e.tags, ' ') ilike $2 or (e.method::text || ' ' || e.path) ilike $2)
      order by e.name, e.id limit 30`, [userId, pattern]);
    results.push({ query, plan: rows[0]['QUERY PLAN'] });
  }
  fs.mkdirSync('.next-performance', { recursive: true });
  fs.writeFileSync('.next-performance/search-plans.json', JSON.stringify(results, null, 2) + '\n');
  console.log('Read-only staging plans saved to .next-performance/search-plans.json. Compare rows scanned, buffer reads, and execution time before adding a search index.');
}
main().catch(error => { console.error(error.message.startsWith('Set LUMEN_') ? error.message : 'Staging plan collection failed. Connection details withheld.'); process.exitCode = 1; });
