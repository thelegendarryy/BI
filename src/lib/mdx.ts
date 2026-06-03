/**
 * mdx.ts — MDX query executor via SQL Server Linked Server
 *
 * Architecture:
 *   Next.js API Route → this module → getPool() (db.ts) → SQL Server
 *   → OPENQUERY(SSAS_CUBE, 'MDX...') → SSAS cube → JSON rows
 *
 * All MDX strings are internal — never interpolated from user input.
 * This file is server-side only. Never import from a client component.
 */

import { getPool } from './db';

/** Generic OLAP row — column names are whatever SSAS returns */
export type OlapRow = Record<string, string | number | null>;

/**
 * Escapes single-quotes in an MDX string for embedding inside a T-SQL
 * string literal: single ' → double '' (standard SQL escaping).
 */
function escapeMdxForSql(mdx: string): string {
  return mdx.replace(/'/g, "''");
}

/**
 * runMdxQuery — executes an MDX query via OPENQUERY against the
 * configured SSAS linked server.
 *
 * @param mdx  Raw MDX string (SELECT ... FROM [Cube] ...)
 * @returns    Array of result rows as plain JS objects
 * @throws     Descriptive error if SQL Server or SSAS is unreachable
 */
export async function runMdxQuery(mdx: string): Promise<OlapRow[]> {
  const linkedServer = process.env.SSAS_LINKED_SERVER || 'SSAS_CUBE';
  const escaped      = escapeMdxForSql(mdx.trim());

  // OPENQUERY forwards the MDX string to SSAS and returns results as SQL rows
  const tsql = `SELECT * FROM OPENQUERY(${linkedServer}, '${escaped}')`;

  const pool   = await getPool();
  
  // Explicitly verify SQL connectivity before running OLAP query
  await pool.request().query('SELECT 1');
  
  const result = await pool.request().query<OlapRow>(tsql);

  return result.recordset;
}

/**
 * parseOlapNumber — coerces an SSAS cell value to a JavaScript number.
 *
 * OPENQUERY can return numeric values as strings (e.g. "1,234,567.89").
 * This helper strips commas and parses, returning 0 for null/undefined/NaN.
 */
export function parseOlapNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

/**
 * firstOlapValue — returns the first numeric value found in an OLAP row,
 * regardless of column name. Useful when SSAS column names are unpredictable.
 */
export function firstOlapValue(row: OlapRow): number {
  for (const v of Object.values(row)) {
    const n = parseOlapNumber(v);
    if (n !== 0) return n;
  }
  return 0;
}
