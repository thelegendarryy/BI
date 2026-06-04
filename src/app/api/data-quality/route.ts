import { NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';
import { dataset } from '../../../data/salesCubeData';
import { DataQualityResponse } from '../../../types/dashboard';

/**
 * GET /api/data-quality
 *
 * Returns a comprehensive data warehouse health report:
 *   - Row counts per table
 *   - Null value checks
 *   - Last data refresh date
 *   - SSAS linked server status
 *   - ETL indicators
 *
 * Live SQL Server query with static fallback.
 */
export async function GET() {
  // ---------- LIVE ATTEMPT ----------
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1'); // health check

    // Run all quality checks in parallel
    const [
      totalRowsResult,
      nullChecksResult,
      lastOrderResult,
      dimCountsResult,
      linkedServerResult,
    ] = await Promise.all([
      pool.request().query(`SELECT COUNT(*) AS cnt FROM FactSales`),
      pool.request().query(`
        SELECT
          SUM(CASE WHEN LineTotal IS NULL THEN 1 ELSE 0 END) AS nullLineTotals,
          SUM(CASE WHEN CustomerID IS NULL THEN 1 ELSE 0 END) AS nullCustomers,
          SUM(CASE WHEN SalesRepID IS NULL THEN 1 ELSE 0 END) AS nullEmployees
        FROM FactSales
      `),
      pool.request().query(`
        SELECT
          MAX(CAST(OrderDate AS DATE)) AS lastOrderDate,
          GETDATE() AS refreshDate
        FROM FactSales
      `),
      pool.request().query(`
        SELECT
          (SELECT COUNT(*) FROM Brands)     AS brands,
          (SELECT COUNT(*) FROM Products)   AS products,
          (SELECT COUNT(*) FROM Customers)  AS customers,
          (SELECT COUNT(*) FROM Employees)  AS employees,
          (SELECT COUNT(*) FROM Promotions) AS promotions,
          (SELECT COUNT(*) FROM DimDate)    AS dates
      `),
      pool.request().query(`
        SELECT COUNT(*) AS exists_count FROM sys.servers WHERE name = 'SSAS_CUBE'
      `),
    ]);

    const totalRows = Number(totalRowsResult.recordset[0]?.cnt ?? 0);
    const nullChecks = nullChecksResult.recordset[0] ?? {};
    const lastOrder = lastOrderResult.recordset[0] ?? {};
    const dimCounts = dimCountsResult.recordset[0] ?? {};
    const cubeLinked = Number(linkedServerResult.recordset[0]?.exists_count ?? 0) > 0;

    const lastOrderDateStr = lastOrder.lastOrderDate
      ? new Date(lastOrder.lastOrderDate).toISOString().split('T')[0]
      : null;
    const refreshDateStr = lastOrder.refreshDate
      ? new Date(lastOrder.refreshDate).toISOString().split('T')[0]
      : null;

    const daysSinceOrder = lastOrderDateStr
      ? Math.floor((Date.now() - new Date(lastOrderDateStr).getTime()) / (1000 * 60 * 60 * 24))
      : 9999;

    const response: DataQualityResponse = {
      totalRows,
      nullLineTotals: Number(nullChecks.nullLineTotals ?? 0),
      nullCustomers: Number(nullChecks.nullCustomers ?? 0),
      nullEmployees: Number(nullChecks.nullEmployees ?? 0),
      lastOrderDate: lastOrderDateStr,
      lastRefreshDate: refreshDateStr,
      cubeLinkedServerExists: cubeLinked,
      cubeStatus: cubeLinked ? 'connected' : 'disconnected',
      dimensionCounts: {
        brands: Number(dimCounts.brands ?? 0),
        products: Number(dimCounts.products ?? 0),
        customers: Number(dimCounts.customers ?? 0),
        employees: Number(dimCounts.employees ?? 0),
        promotions: Number(dimCounts.promotions ?? 0),
        dates: Number(dimCounts.dates ?? 0),
      },
      etlIndicators: {
        totalFactRows: totalRows,
        estimatedLoadTime: totalRows > 10000 ? '>30s' : totalRows > 1000 ? '5–15s' : '<5s',
        dataFreshnessDays: daysSinceOrder,
        status: daysSinceOrder < 7 ? 'fresh' : daysSinceOrder < 90 ? 'stale' : 'unknown',
      },
    };

    return NextResponse.json(response);
  } catch (_) {
    // Fall through to static
  }

  // ---------- STATIC FALLBACK ----------
  const sales = dataset.sales;
  const lastDateKey = Math.max(...sales.map(s => s.DateKey));
  const lastDateStr = String(lastDateKey); // YYYYMMDD
  const lastOrderDate = `${lastDateStr.slice(0, 4)}-${lastDateStr.slice(4, 6)}-${lastDateStr.slice(6, 8)}`;
  const daysSince = Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));

  const response: DataQualityResponse = {
    totalRows: sales.length,
    nullLineTotals: 0,
    nullCustomers: 0,
    nullEmployees: 0,
    lastOrderDate,
    lastRefreshDate: new Date().toISOString().split('T')[0],
    cubeLinkedServerExists: false,
    cubeStatus: 'unknown',
    dimensionCounts: {
      brands: dataset.brands.length,
      products: dataset.products.length,
      customers: dataset.customers.length,
      employees: dataset.employees.length,
      promotions: dataset.promotions.length,
      dates: dataset.dates.length,
    },
    etlIndicators: {
      totalFactRows: sales.length,
      estimatedLoadTime: '<5s',
      dataFreshnessDays: daysSince,
      status: 'unknown',
    },
  };

  return NextResponse.json(response);
}
