// Real Neon Drizzle adapter, with its HTTP query/transaction boundary backed by local PostgreSQL.
// This verifies generated SQL and rollback, not Neon's network transport.
const { PGlite } = require('@electric-sql/pglite');
const { drizzle } = require('drizzle-orm/neon-http');
const fs = require('node:fs');
const path = require('node:path');

async function createLocalDatabase() {
  const pg = new PGlite();
  let beforeStatement = () => {};
  const counters = { queries: 0, transactions: 0, statements: 0 };
  async function execute(connection, statement) {
    beforeStatement(statement.sql);
    counters.statements++;
    return connection.query(statement.sql, statement.params, {
      rowMode: statement.options.arrayMode ? 'array' : 'object',
      parsers: { 1184: value => value, 1114: value => value, 1082: value => value },
    });
  }
  const client = (sql, params = [], options = {}) => {
    const statement = { sql, params, options };
    return { ...statement, then(resolve, reject) { counters.queries++; return execute(pg, statement).then(resolve, reject); } };
  };
  client.query = client;
  client.transaction = statements => {
    counters.transactions++;
    return pg.transaction(async tx => {
      const result = [];
      for (const statement of statements) result.push(await execute(tx, statement));
      return result;
    });
  };
  const db = drizzle(client);
  const migrations = path.resolve(__dirname, '../../drizzle');
  for (const name of fs.readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) {
    await pg.exec(fs.readFileSync(path.join(migrations, name), 'utf8'));
  }
  return { db, pg, counters, failBefore(callback) { beforeStatement = callback; } };
}

module.exports = { createLocalDatabase };
