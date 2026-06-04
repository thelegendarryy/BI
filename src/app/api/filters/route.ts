import { NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';
import { dataset } from '../../../data/salesCubeData';

export async function GET() {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1'); // health check

    const [yearsRes, brandsRes, statusesRes] = await Promise.all([
      pool.request().query('SELECT DISTINCT YearNumber FROM DimDate WHERE YearNumber IS NOT NULL ORDER BY YearNumber DESC'),
      pool.request().query('SELECT BrandID AS id, BrandName AS name FROM Brands ORDER BY BrandName'),
      pool.request().query('SELECT DISTINCT OrderStatus FROM FactSales WHERE OrderStatus IS NOT NULL ORDER BY OrderStatus')
    ]);

    return NextResponse.json({
      years: yearsRes.recordset.map(r => Number(r.YearNumber)),
      brands: brandsRes.recordset.map(r => ({ id: Number(r.id), name: String(r.name) })),
      statuses: statusesRes.recordset.map(r => String(r.OrderStatus)),
      dataSource: 'live'
    });
  } catch (error: any) {
    console.warn('[/api/filters] Database unreachable, falling back to static lists:', error.message);
    
    // Static Fallback
    const staticYears = Array.from(new Set(dataset.dates.map(d => d.YearNumber))).sort((a, b) => b - a);
    const staticBrands = dataset.brands.map(b => ({ id: b.BrandID, name: b.BrandName }));
    const staticStatuses = Array.from(new Set(dataset.sales.map(s => s.OrderStatus)));

    return NextResponse.json({
      years: staticYears,
      brands: staticBrands,
      statuses: staticStatuses,
      dataSource: 'static'
    });
  }
}
