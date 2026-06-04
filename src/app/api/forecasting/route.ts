import { NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';
import { hydratedDataset } from '../../../data/salesCubeData';
import { generateForecast, buildMonthlySeries } from '../../../lib/forecasting';
import { OlapForecastResponse } from '../../../types/dashboard';

/**
 * GET /api/forecasting
 *
 * Computes a 3-month ahead sales revenue forecast using:
 *   - Linear Regression (60% weight)
 *   - 3-Month Moving Average (40% weight)
 *
 * Attempts live DW query first; falls back to static dataset.
 */
export async function GET() {
  // ---------- LIVE ATTEMPT ----------
  try {
    const pool = await getPool();

    const query = `
      SELECT
        CAST(dd.YearNumber AS VARCHAR(4)) + '-' + RIGHT('0' + CAST(dd.MonthNumber AS VARCHAR(2)), 2) AS period,
        SUM(fs.LineTotal) AS revenue
      FROM FactSales fs
      INNER JOIN DimDate dd ON fs.DateKey = dd.DateKey
      WHERE fs.OrderStatus != 'Cancelled'
      GROUP BY dd.YearNumber, dd.MonthNumber
      ORDER BY dd.YearNumber, dd.MonthNumber
    `;

    const result = await pool.request().query(query);

    const series = result.recordset.map((r: Record<string, unknown>) => ({
      period: String(r.period),
      value: Number(r.revenue),
    }));

    if (series.length < 3) throw new Error('Not enough data');

    const forecast = generateForecast(series, 3, 3);

    const response: OlapForecastResponse = {
      data: forecast.data,
      nextMonthForecast: forecast.nextMonthForecast,
      nextQuarterForecast: forecast.nextQuarterForecast,
      method: forecast.method,
      confidence: forecast.confidence,
      rSquared: forecast.rSquared,
      dataSource: 'live',
    };

    return NextResponse.json(response);
  } catch (_) {
    // Fall through to static
  }

  // ---------- STATIC FALLBACK ----------
  const series = buildMonthlySeries(
    hydratedDataset
      .filter(s => s.OrderStatus !== 'Cancelled')
      .map(s => ({ OrderDate: s.OrderDate, LineTotal: s.LineTotal })),
    24
  );

  const forecast = generateForecast(series, 3, 3);

  const response: OlapForecastResponse = {
    data: forecast.data,
    nextMonthForecast: forecast.nextMonthForecast,
    nextQuarterForecast: forecast.nextQuarterForecast,
    method: forecast.method,
    confidence: forecast.confidence,
    rSquared: forecast.rSquared,
    dataSource: 'static',
  };

  return NextResponse.json(response);
}
