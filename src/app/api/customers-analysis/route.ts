import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';
import { hydratedDataset } from '../../../data/salesCubeData';
import { OlapCustomerAnalysis } from '../../../types/dashboard';
import { parseFilters, buildSqlWhere, getDateJoinIfNeeded } from '../../../lib/filter';

/**
 * GET /api/customers-analysis
 *
 * Returns:
 *   - Top 10 customers by revenue
 *   - Revenue by customer segment (Corporate, Wholesale, Retail)
 *
 * Live SQL Server + static fallback.
 */
export async function GET(request: NextRequest) {
  const filters = parseFilters(request);

  // ---------- LIVE ATTEMPT ----------
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1');

    const dateJoin = getDateJoinIfNeeded(filters, 'fs', 'dd');
    const whereClause = buildSqlWhere(filters, 'fs', 'dd');

    const topCustomersQuery = `
      SELECT TOP 10
        ISNULL(c.CompanyName, c.FirstName + ' ' + c.LastName) AS customer,
        c.CustomerType,
        c.Country,
        SUM(fs.LineTotal)               AS lineTotal,
        COUNT(DISTINCT fs.SalesOrderID) AS orderCount,
        AVG(fs.LineTotal)               AS avgOrderValue
      FROM FactSales fs
      INNER JOIN Customers c ON fs.CustomerID = c.CustomerID
      ${dateJoin}
      WHERE fs.OrderStatus != 'Cancelled' AND ${whereClause}
      GROUP BY c.CustomerID, c.CompanyName, c.FirstName, c.LastName, c.CustomerType, c.Country
      ORDER BY lineTotal DESC
    `;

    const segmentQuery = `
      SELECT
        c.CustomerType      AS segment,
        SUM(fs.LineTotal)               AS lineTotal,
        COUNT(DISTINCT fs.SalesOrderID) AS orderCount,
        COUNT(DISTINCT c.CustomerID)    AS customerCount
      FROM FactSales fs
      INNER JOIN Customers c ON fs.CustomerID = c.CustomerID
      ${dateJoin}
      WHERE fs.OrderStatus != 'Cancelled' AND ${whereClause}
      GROUP BY c.CustomerType
      ORDER BY lineTotal DESC
    `;

    const [topResult, segResult] = await Promise.all([
      pool.request().query(topCustomersQuery),
      pool.request().query(segmentQuery),
    ]);

    const response: OlapCustomerAnalysis = {
      topCustomers: topResult.recordset.map((r: Record<string, unknown>) => ({
        customer: String(r.customer),
        customerType: String(r.CustomerType),
        country: String(r.Country),
        lineTotal: Number(r.lineTotal),
        orderCount: Number(r.orderCount),
        avgOrderValue: Math.round(Number(r.avgOrderValue) * 100) / 100,
      })),
      bySegment: segResult.recordset.map((r: Record<string, unknown>) => ({
        segment: String(r.segment),
        lineTotal: Number(r.lineTotal),
        orderCount: Number(r.orderCount),
        customerCount: Number(r.customerCount),
      })),
      dataSource: 'live',
    };

    return NextResponse.json(response);
  } catch (_) {
    // Fall through to static
  }

  // ---------- STATIC FALLBACK ----------
  const sales = hydratedDataset.filter(s => s.OrderStatus !== 'Cancelled');

  // Top customers
  const customerMap = new Map<number, {
    customer: string;
    customerType: string;
    country: string;
    lineTotal: number;
    orderCount: Set<number>;
  }>();

  for (const s of sales) {
    const cid = s.Customer.CustomerID;
    if (!customerMap.has(cid)) {
      customerMap.set(cid, {
        customer: s.Customer.CompanyName || `${s.Customer.FirstName} ${s.Customer.LastName}`,
        customerType: s.Customer.CustomerType,
        country: s.Customer.Country,
        lineTotal: 0,
        orderCount: new Set(),
      });
    }
    const c = customerMap.get(cid)!;
    c.lineTotal += s.LineTotal;
    c.orderCount.add(s.SalesOrderID);
  }

  const topCustomers = Array.from(customerMap.values())
    .map(c => ({
      customer: c.customer,
      customerType: c.customerType,
      country: c.country,
      lineTotal: Math.round(c.lineTotal * 100) / 100,
      orderCount: c.orderCount.size,
      avgOrderValue: Math.round((c.lineTotal / (c.orderCount.size || 1)) * 100) / 100,
    }))
    .sort((a, b) => b.lineTotal - a.lineTotal)
    .slice(0, 10);

  // By segment
  const segmentMap = new Map<string, { lineTotal: number; orderCount: Set<number>; customerCount: Set<number> }>();
  for (const s of sales) {
    const seg = s.Customer.CustomerType;
    if (!segmentMap.has(seg)) segmentMap.set(seg, { lineTotal: 0, orderCount: new Set(), customerCount: new Set() });
    const g = segmentMap.get(seg)!;
    g.lineTotal += s.LineTotal;
    g.orderCount.add(s.SalesOrderID);
    g.customerCount.add(s.Customer.CustomerID);
  }

  const bySegment = Array.from(segmentMap.entries())
    .map(([seg, g]) => ({
      segment: seg,
      lineTotal: Math.round(g.lineTotal * 100) / 100,
      orderCount: g.orderCount.size,
      customerCount: g.customerCount.size,
    }))
    .sort((a, b) => b.lineTotal - a.lineTotal);

  const response: OlapCustomerAnalysis = { topCustomers, bySegment, dataSource: 'static' };
  return NextResponse.json(response);
}
