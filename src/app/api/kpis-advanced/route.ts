import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';
import { hydratedDataset } from '../../../data/salesCubeData';
import { OlapAdvancedKpiResponse } from '../../../types/dashboard';

/**
 * GET /api/kpis-advanced
 *
 * Returns advanced KPI metrics including:
 *   - YTD / QTD / MTD revenue
 *   - Previous year / quarter revenue
 *   - Revenue growth %
 *   - Average order value
 *   - Profit margin estimate
 *   - Discount impact
 *
 * Attempts live SSAS query first; falls back to static data computation.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isDemo = searchParams.get('demo') === 'true';

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1–12
  const currentQuarter = Math.ceil(currentMonth / 3);

  // ---------- LIVE SSAS ATTEMPT ----------
  try {
    if (isDemo) {
      throw new Error('Forced demo mode fallback');
    }
    const pool = await getPool();
    await pool.request().query('SELECT 1'); // health check

    // YTD query
    const ytdQuery = `
      SELECT
        SUM(fs.LineTotal)        AS ytdRevenue,
        SUM(fs.LineTotal * (1 - fs.DiscountPercent)) AS netRevenue,
        SUM(fs.TaxAmount)        AS taxAmount,
        SUM(fs.DiscountAmount)   AS discountImpact,
        COUNT(DISTINCT fs.SalesOrderID) AS totalOrders,
        AVG(fs.LineTotal)        AS avgOrderValue
      FROM FactSales fs
      INNER JOIN DimDate dd ON fs.DateKey = dd.DateKey
      WHERE dd.YearNumber = ${currentYear}
    `;

    const qtdQuery = `
      SELECT SUM(fs.LineTotal) AS qtdRevenue
      FROM FactSales fs
      INNER JOIN DimDate dd ON fs.DateKey = dd.DateKey
      WHERE dd.YearNumber = ${currentYear}
        AND dd.QuarterNumber = ${currentQuarter}
    `;

    const mtdQuery = `
      SELECT SUM(fs.LineTotal) AS mtdRevenue
      FROM FactSales fs
      INNER JOIN DimDate dd ON fs.DateKey = dd.DateKey
      WHERE dd.YearNumber = ${currentYear}
        AND dd.MonthNumber = ${currentMonth}
    `;

    const pyQuery = `
      SELECT SUM(fs.LineTotal) AS previousYearRevenue
      FROM FactSales fs
      INNER JOIN DimDate dd ON fs.DateKey = dd.DateKey
      WHERE dd.YearNumber = ${currentYear - 1}
    `;

    const pqQuery = `
      SELECT SUM(fs.LineTotal) AS previousQuarterRevenue
      FROM FactSales fs
      INNER JOIN DimDate dd ON fs.DateKey = dd.DateKey
      WHERE dd.YearNumber = ${currentQuarter === 1 ? currentYear - 1 : currentYear}
        AND dd.QuarterNumber = ${currentQuarter === 1 ? 4 : currentQuarter - 1}
    `;

    const [ytdResult, qtdResult, mtdResult, pyResult, pqResult] = await Promise.all([
      pool.request().query(ytdQuery),
      pool.request().query(qtdQuery),
      pool.request().query(mtdQuery),
      pool.request().query(pyQuery),
      pool.request().query(pqQuery),
    ]);

    const ytd = ytdResult.recordset[0];
    const qtd = qtdResult.recordset[0];
    const mtd = mtdResult.recordset[0];
    const py = pyResult.recordset[0];
    const pq = pqResult.recordset[0];

    const ytdRevenue = Number(ytd?.ytdRevenue ?? 0);
    const previousYearRevenue = Number(py?.previousYearRevenue ?? 0);
    const growth = previousYearRevenue > 0 ? (ytdRevenue - previousYearRevenue) / previousYearRevenue : 0;
    const netRevenue = Number(ytd?.netRevenue ?? 0);
    const estimatedProfit = netRevenue * 0.28; // ~28% margin estimate

    const response: OlapAdvancedKpiResponse = {
      ytdRevenue,
      qtdRevenue: Number(qtd?.qtdRevenue ?? 0),
      mtdRevenue: Number(mtd?.mtdRevenue ?? 0),
      previousYearRevenue,
      previousQuarterRevenue: Number(pq?.previousQuarterRevenue ?? 0),
      revenueGrowthPct: Math.round(growth * 10000) / 100,
      totalOrders: Number(ytd?.totalOrders ?? 0),
      avgOrderValue: Math.round(Number(ytd?.avgOrderValue ?? 0) * 100) / 100,
      netRevenue,
      estimatedProfit: Math.round(estimatedProfit * 100) / 100,
      profitMarginPct: Math.round((estimatedProfit / (ytdRevenue || 1)) * 10000) / 100,
      discountImpact: Number(ytd?.discountImpact ?? 0),
      taxAmount: Number(ytd?.taxAmount ?? 0),
      currentYear,
      currentQuarter,
      currentMonth,
      dataSource: 'live',
    };

    return NextResponse.json(response);
  } catch (_) {
    // Fall through to static computation
  }

  // ---------- STATIC FALLBACK ----------
  const sales = hydratedDataset.filter(s => s.OrderStatus !== 'Cancelled');

  const ytdSales = sales.filter(s => s.DateInfo.YearNumber === currentYear);
  const qtdSales = sales.filter(
    s => s.DateInfo.YearNumber === currentYear && s.DateInfo.QuarterNumber === currentQuarter
  );
  const mtdSales = sales.filter(
    s => s.DateInfo.YearNumber === currentYear && s.DateInfo.MonthNumber === currentMonth
  );
  const pySales = sales.filter(s => s.DateInfo.YearNumber === currentYear - 1);
  const pqSales = sales.filter(
    s =>
      s.DateInfo.YearNumber === (currentQuarter === 1 ? currentYear - 1 : currentYear) &&
      s.DateInfo.QuarterNumber === (currentQuarter === 1 ? 4 : currentQuarter - 1)
  );

  // Use 2025 data as main reference if current year has no data
  const refYear = ytdSales.length > 0 ? currentYear : 2025;
  const refSales = sales.filter(s => s.DateInfo.YearNumber === refYear);
  const prevYearSales = sales.filter(s => s.DateInfo.YearNumber === refYear - 1);

  const sum = (arr: typeof sales) => arr.reduce((t, s) => t + s.LineTotal, 0);
  const discountSum = (arr: typeof sales) => arr.reduce((t, s) => t + s.DiscountAmount, 0);
  const taxSum = (arr: typeof sales) => arr.reduce((t, s) => t + s.TaxAmount, 0);
  const uniqueOrders = (arr: typeof sales) => new Set(arr.map(s => s.SalesOrderID)).size;

  const ytdRevenue = sum(refSales);
  const previousYearRevenue = sum(prevYearSales);
  const growth = previousYearRevenue > 0 ? (ytdRevenue - previousYearRevenue) / previousYearRevenue : 0;
  const netRevenue = ytdRevenue - discountSum(refSales);
  const estimatedProfit = netRevenue * 0.28;
  const allOrders = uniqueOrders(refSales);

  const response: OlapAdvancedKpiResponse = {
    ytdRevenue: Math.round(ytdRevenue * 100) / 100,
    qtdRevenue: Math.round(sum(qtdSales.length ? qtdSales : sales.filter(s => s.DateInfo.YearNumber === refYear && s.DateInfo.QuarterNumber === 4)) * 100) / 100,
    mtdRevenue: Math.round(sum(mtdSales.length ? mtdSales : sales.filter(s => s.DateInfo.YearNumber === refYear && s.DateInfo.MonthNumber === 11)) * 100) / 100,
    previousYearRevenue: Math.round(previousYearRevenue * 100) / 100,
    previousQuarterRevenue: Math.round(sum(pqSales.length ? pqSales : sales.filter(s => s.DateInfo.YearNumber === refYear && s.DateInfo.QuarterNumber === 3)) * 100) / 100,
    revenueGrowthPct: Math.round(growth * 10000) / 100,
    totalOrders: allOrders,
    avgOrderValue: allOrders > 0 ? Math.round((ytdRevenue / allOrders) * 100) / 100 : 0,
    netRevenue: Math.round(netRevenue * 100) / 100,
    estimatedProfit: Math.round(estimatedProfit * 100) / 100,
    profitMarginPct: Math.round((estimatedProfit / (ytdRevenue || 1)) * 10000) / 100,
    discountImpact: Math.round(discountSum(refSales) * 100) / 100,
    taxAmount: Math.round(taxSum(refSales) * 100) / 100,
    currentYear: refYear,
    currentQuarter,
    currentMonth,
    dataSource: 'static',
  };

  return NextResponse.json(response);
}
