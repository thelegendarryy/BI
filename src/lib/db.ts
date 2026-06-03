/**
 * db.ts — SQL Server connection pool (Windows Authentication via msnodesqlv8)
 *
 * Driver and Authentication:
 * ──────────────────────────
 * - Node.js Driver: mssql (configured with native 'msnodesqlv8' connector).
 * - Authentication Mode: Windows Authentication (Trusted Connection / Integrated Security).
 * - Protocol: Shared Memory / Named Pipes (or TCP if configured).
 *
 * This allows the Node.js backend to connect using the active Windows identity
 * of the process (MEDAMIN\user) without exposing usernames or passwords.
 */

import sql from 'mssql/msnodesqlv8';

function buildConfig(): sql.config {
  const server = process.env.SQL_SERVER;
  const database = process.env.SQL_DATABASE;

  const missingVars = [];
  if (!server) missingVars.push('SQL_SERVER');
  if (!database) missingVars.push('SQL_DATABASE');

  if (missingVars.length > 0) {
    throw new Error(`Missing required SQL Server environment variables in process.env: ${missingVars.join(', ')}`);
  }

  // Build the connection string using ODBC Driver 17 for SQL Server
  // which is installed and verified on the system.
  const connectionString = `Driver={ODBC Driver 17 for SQL Server};Server=${server};Database=${database};Trusted_Connection=yes;`;

  return {
    connectionString,
    pool: { max: 10, min: 0, idleTimeoutMillis: 30_000 },
    requestTimeout: 60_000,
    connectionTimeout: 30_000,
  } as unknown as sql.config;
}

declare global {
  // eslint-disable-next-line no-var
  var __mssqlPool: sql.ConnectionPool | undefined;
}

export async function getPool(): Promise<sql.ConnectionPool> {
  if (global.__mssqlPool?.connected) {
    return global.__mssqlPool;
  }

  if (global.__mssqlPool) {
    try { await global.__mssqlPool.close(); } catch { /* ignore */ }
    global.__mssqlPool = undefined;
  }

  const config = buildConfig();

  console.log('[DB] Connecting to SQL Server using Windows Integrated Authentication...', {
    server: process.env.SQL_SERVER,
    database: process.env.SQL_DATABASE,
    driver: 'msnodesqlv8',
    authMode: 'Windows Authentication (Trusted Connection)'
  });

  const pool = new sql.ConnectionPool(config);

  pool.on('error', (err) => {
    console.error('[DB] Pool error — will recreate on next call:', err.message);
    global.__mssqlPool = undefined;
  });

  try {
    await pool.connect();
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    console.error('[DB] ✗ Connection FAILED:', msg);
    throw new Error(`SQL Server connection failed — ${msg}`);
  }

  console.log('[DB] ✓ Connected →', process.env.SQL_SERVER, process.env.SQL_DATABASE);
  global.__mssqlPool = pool;
  return pool;
}

export { sql };
