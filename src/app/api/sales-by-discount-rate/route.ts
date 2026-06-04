import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';
import { hydratedDataset } from '../../../data/salesCubeData';
import { parseFilters, buildSqlWhere, getDateJoinIfNeeded } from '../../../lib/filter';

export async function GET(request: NextRequest) {
  const filters = parseFilters(request);
  
  // ---------- LIVE DW ATTEMPT ----------
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1'); // health check

    const dateJoin = getDateJoinIfNeeded(filters, 'fs', 'dd');
    const whereClause = buildSqlWhere(filters, 'fs', 'dd');

    const query = `
      SELECT
        CAST(ROUND(fs.DiscountPercent * 100, 0) AS INT) AS discount,
        SUM(fs.Quantity)                               AS volume,
        SUM(fs.LineTotal)                              AS revenue,
        SUM(fs.LineTotal - fs.TaxAmount - (fs.Quantity * p.StandardCost)) AS profit,
        COUNT(fs.SalesOrderID)                         AS count
      FROM FactSales fs
      JOIN Products p ON fs.ProductID = p.ProductID
      ${dateJoin}
      WHERE fs.OrderStatus != 'Cancelled' AND ${whereClause}
      GROUP BY ROUND(fs.DiscountPercent * 100, 0)
      ORDER BY discount ASC
    `;

    const result = await pool.request().query(query);
    
    const data = result.recordset.map(row => {
      const discount = Number(row.discount);
      const revenue = Number(row.revenue);
      const profit = Number(row.profit);
      const volume = Number(row.volume);
      const count = Number(row.count);

      return {
        name: `${discount}%`,
        discount,
        volume,
        revenue: Math.round(revenue * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        marginPercent: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0,
        avgOrderQuantity: count > 0 ? Math.round((volume / count) * 10) / 10 : 0
      };
    });

    return NextResponse.json({ data, dataSource: 'live' });
  } catch (error: any) {
    console.warn('[/api/sales-by-discount-rate] Live query failed, falling back to static:', error.message);
  }

  // ---------- STATIC FALLBACK ----------
  const sales = hydratedDataset.filter(s => {
    if (s.OrderStatus === 'Cancelled') return false;
    if (filters.year !== 'All' && s.DateInfo.YearNumber !== filters.year) return false;
    if (filters.quarter !== 'All' && s.DateInfo.QuarterNumber !== filters.quarter) return false;
    if (filters.month !== 'All' && s.DateInfo.MonthNumber !== filters.month) return false;
    if (filters.brand !== 'All' && s.BrandID !== filters.brand) return false;
    if (filters.status !== 'All' && s.OrderStatus !== filters.status) return false;
    return true;
  });

  const buckets: Record<string, { discountPercent: number; volume: number; revenue: number; profit: number; count: number }> = {};

  sales.forEach(record => {
    const pct = Math.round(record.DiscountPercent * 100);
    const key = `${pct}%`;

    if (!buckets[key]) {
      buckets[key] = { discountPercent: pct, volume: 0, revenue: 0, profit: 0, count: 0 };
    }

    const netSales = record.LineTotal - record.TaxAmount;
    const profit = netSales - (record.Quantity * record.Product.StandardCost);

    buckets[key].volume += record.Quantity;
    buckets[key].revenue += record.LineTotal;
    buckets[key].profit += profit;
    buckets[key].count += 1;
  });

  const data = Object.values(buckets)
    .map(b => {
      const marginPercent = b.revenue > 0 ? (b.profit / b.revenue) * 100 : 0;
      return {
        name: `${b.discountPercent}%`,
        discount: b.discountPercent,
        volume: b.volume,
        revenue: Math.round(b.revenue * 100) / 100,
        profit: Math.round(b.profit * 100) / 100,
        marginPercent: Math.round(marginPercent * 10) / 10,
        avgOrderQuantity: Math.round((b.volume / b.count) * 10) / 10
      };
    })
    .sort((a, b) => a.discount - b.discount);

  return NextResponse.json({ data, dataSource: 'static' });
}
