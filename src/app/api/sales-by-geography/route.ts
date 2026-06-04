import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';
import { hydratedDataset } from '../../../data/salesCubeData';
import { OlapGeographySale } from '../../../types/dashboard';
import { parseFilters, buildSqlWhere, getDateJoinIfNeeded } from '../../../lib/filter';

/**
 * GET /api/sales-by-geography?groupBy=country|city
 *
 * Aggregates sales revenue by customer country or city.
 * Attempts live SQL Server query; falls back to static data.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const groupBy = (searchParams.get('groupBy') ?? 'country') as 'country' | 'city';

  const filters = parseFilters(request);
  const isDemo = searchParams.get('demo') === 'true';

  // ---------- LIVE ATTEMPT ----------
  try {
    if (isDemo) {
      throw new Error('Forced demo mode fallback');
    }
    const pool = await getPool();
    await pool.request().query('SELECT 1');

    const groupField = groupBy === 'city' ? 'c.City' : 'c.Country';
    const labelField = groupBy === 'city' ? 'c.City' : 'c.Country';

    const dateJoin = getDateJoinIfNeeded(filters, 'fs', 'dd');
    const whereClause = buildSqlWhere(filters, 'fs', 'dd');

    const query = `
      SELECT
        ${labelField} AS location,
        SUM(fs.LineTotal)          AS lineTotal,
        SUM(fs.Quantity)           AS quantity,
        COUNT(DISTINCT fs.SalesOrderID) AS orderCount
      FROM FactSales fs
      INNER JOIN Customers c ON fs.CustomerID = c.CustomerID
      ${dateJoin}
      WHERE fs.OrderStatus != 'Cancelled' AND ${whereClause}
      GROUP BY ${groupField}
      ORDER BY lineTotal DESC
    `;

    const result = await pool.request().query(query);

    const rows: OlapGeographySale[] = result.recordset.map((r: Record<string, unknown>) => ({
      country: groupBy === 'country' ? String(r.location) : '',
      city: groupBy === 'city' ? String(r.location) : undefined,
      lineTotal: Number(r.lineTotal),
      quantity: Number(r.quantity),
      orderCount: Number(r.orderCount),
    }));

    return NextResponse.json({ data: rows, dataSource: 'live', groupBy });
  } catch (error: any) {
    console.warn('[/api/sales-by-geography] SQL query failed, falling back to static:', error.message);
  }

  // ---------- STATIC FALLBACK ----------
  const sales = hydratedDataset.filter(s => s.OrderStatus !== 'Cancelled');
  const grouped = new Map<string, { lineTotal: number; quantity: number; orderCount: Set<number> }>();

  for (const s of sales) {
    const key = groupBy === 'city' ? s.Customer.City : s.Customer.Country;
    if (!grouped.has(key)) grouped.set(key, { lineTotal: 0, quantity: 0, orderCount: new Set() });
    const g = grouped.get(key)!;
    g.lineTotal += s.LineTotal;
    g.quantity += s.Quantity;
    g.orderCount.add(s.SalesOrderID);
  }

  const rows: OlapGeographySale[] = Array.from(grouped.entries())
    .map(([key, g]) => ({
      country: groupBy === 'country' ? key : '',
      city: groupBy === 'city' ? key : undefined,
      lineTotal: Math.round(g.lineTotal * 100) / 100,
      quantity: g.quantity,
      orderCount: g.orderCount.size,
    }))
    .sort((a, b) => b.lineTotal - a.lineTotal);

  return NextResponse.json({ data: rows, dataSource: 'static', groupBy });
}
