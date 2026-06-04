import { NextRequest, NextResponse } from 'next/server';
import { runMdxQuery, parseOlapNumber } from '../../../lib/mdx';
import { getPool } from '../../../lib/db';
import { parseFilters, buildSqlWhere, getDateJoinIfNeeded } from '../../../lib/filter';

const CUBE = process.env.SSAS_CUBE_NAME || 'Entreprise DW';

export async function GET(request: NextRequest) {
  const filters = parseFilters(request);
  const isFiltered = 
    filters.year !== 'All' || 
    filters.quarter !== 'All' || 
    filters.month !== 'All' || 
    filters.brand !== 'All' || 
    filters.status !== 'All';

  if (isFiltered) {
    try {
      const pool = await getPool();
      await pool.request().query('SELECT 1'); // health check
      
      const dateJoin = getDateJoinIfNeeded(filters, 'fs', 'dd');
      const whereClause = buildSqlWhere(filters, 'fs', 'dd');

      const query = `
        SELECT
          SUM(fs.LineTotal) AS totalSales,
          SUM(fs.Quantity) AS totalQuantity,
          SUM(fs.TaxAmount) AS totalTax,
          SUM(fs.DiscountAmount) AS totalDiscount
        FROM FactSales fs
        ${dateJoin}
        WHERE fs.OrderStatus != 'Cancelled' AND ${whereClause}
      `;

      const result = await pool.request().query(query);
      const row = result.recordset[0] ?? {};

      return NextResponse.json({
        totalSales: Number(row.totalSales ?? 0),
        totalQuantity: Number(row.totalQuantity ?? 0),
        totalTax: Number(row.totalTax ?? 0),
        totalDiscount: Number(row.totalDiscount ?? 0),
        dataSource: 'live-sql'
      });
    } catch (error: any) {
      console.error('[/api/kpis] SQL query failed:', error.message);
      return NextResponse.json(
        { error: 'Failed to query SQL database', details: error.message },
        { status: 500 }
      );
    }
  }

  // Unfiltered: query SSAS cube
  const mdx = `
    SELECT
      {
        [Measures].[Line Total],
        [Measures].[Quantity],
        [Measures].[Tax Amount],
        [Measures].[Discount Amount]
      } ON COLUMNS
    FROM [${CUBE}]
  `;

  try {
    const rows = await runMdxQuery(mdx);

    if (!rows || rows.length === 0) {
      throw new Error('No data returned from SSAS cube');
    }

    const row = rows[0];

    const totalSales =
      parseOlapNumber(row['[Measures].[Line Total]']) ||
      parseOlapNumber(row['Line Total']) ||
      parseOlapNumber(Object.values(row)[0] as any);

    const totalQuantity =
      parseOlapNumber(row['[Measures].[Quantity]']) ||
      parseOlapNumber(row['Quantity']) ||
      parseOlapNumber(Object.values(row)[1] as any);

    const totalTax =
      parseOlapNumber(row['[Measures].[Tax Amount]']) ||
      parseOlapNumber(row['Tax Amount']) ||
      parseOlapNumber(Object.values(row)[2] as any);

    const totalDiscount =
      parseOlapNumber(row['[Measures].[Discount Amount]']) ||
      parseOlapNumber(row['Discount Amount']) ||
      parseOlapNumber(Object.values(row)[3] as any);

    return NextResponse.json({
      totalSales,
      totalQuantity,
      totalTax,
      totalDiscount,
      dataSource: 'live-ssas'
    });
  } catch (error: any) {
    const message = error?.message || String(error);
    console.warn('[/api/kpis] SSAS query failed, falling back to SQL DW query:', message);
    
    // Fall back to SQL
    try {
      const pool = await getPool();
      const query = `
        SELECT
          SUM(LineTotal) AS totalSales,
          SUM(Quantity) AS totalQuantity,
          SUM(TaxAmount) AS totalTax,
          SUM(DiscountAmount) AS totalDiscount
        FROM FactSales
        WHERE OrderStatus != 'Cancelled'
      `;
      const result = await pool.request().query(query);
      const row = result.recordset[0] ?? {};

      return NextResponse.json({
        totalSales: Number(row.totalSales ?? 0),
        totalQuantity: Number(row.totalQuantity ?? 0),
        totalTax: Number(row.totalTax ?? 0),
        totalDiscount: Number(row.totalDiscount ?? 0),
        dataSource: 'live-sql'
      });
    } catch (sqlErr: any) {
      return NextResponse.json(
        { error: 'Failed to query SSAS and SQL Server', details: sqlErr.message },
        { status: 500 }
      );
    }
  }
}

