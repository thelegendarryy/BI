import { NextRequest, NextResponse } from 'next/server';
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
      await pool.request().query('SELECT 1');

      const dateJoin = getDateJoinIfNeeded(filters, 'fs', 'dd');
      const whereClause = buildSqlWhere(filters, 'fs', 'dd');

      const query = `
        SELECT 
          b.BrandName AS brand,
          SUM(fs.LineTotal) AS lineTotal,
          SUM(fs.Quantity) AS quantity
        FROM FactSales fs
        JOIN Brands b ON fs.BrandID = b.BrandID
        ${dateJoin}
        WHERE fs.OrderStatus != 'Cancelled' AND ${whereClause}
        GROUP BY b.BrandName
        ORDER BY lineTotal DESC
      `;

      const result = await pool.request().query(query);
      const data = result.recordset.map(row => ({
        brand: String(row.brand),
        lineTotal: Number(row.lineTotal),
        quantity: Number(row.quantity)
      }));

      return NextResponse.json(data);
    } catch (error: any) {
      console.error('[/api/sales-by-brand] SQL query failed:', error.message);
      return NextResponse.json(
        { error: 'Failed to query SQL database', details: error.message },
        { status: 500 }
      );
    }
  }

  // Unfiltered: try SSAS linked server
  const mdx = `
    SELECT
      {
        [Measures].[Line Total],
        [Measures].[Quantity]
      } ON COLUMNS,
      NON EMPTY
      [Brands].[Brand ID].Members ON ROWS
    FROM [${CUBE}]
  `;

  const tsql = `
    SELECT 
      b.BrandName AS brand,
      SUM(CAST(oq."[Measures].[Line Total]" AS DECIMAL(18,2))) AS lineTotal,
      SUM(CAST(oq."[Measures].[Quantity]" AS INT)) AS quantity
    FROM OPENQUERY(SSAS_CUBE, '
      SELECT
        {
          [Measures].[Line Total],
          [Measures].[Quantity]
        } ON COLUMNS,
        NON EMPTY
        [Brands].[Brand ID].Members ON ROWS
      FROM [${CUBE}]
    ') oq
    JOIN Brands b ON CAST(b.BrandID AS VARCHAR(50)) = CAST(oq."[Brands].[Brand ID].[Brand ID].[MEMBER_CAPTION]" AS VARCHAR(50))
    GROUP BY b.BrandName
    ORDER BY lineTotal DESC
  `;

  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1');

    const result = await pool.request().query(tsql);
    const data = result.recordset.map(row => ({
      brand: String(row.brand),
      lineTotal: Number(row.lineTotal),
      quantity: Number(row.quantity)
    }));

    return NextResponse.json(data);
  } catch (error: any) {
    const message = error?.message || String(error);
    console.warn('[/api/sales-by-brand] SSAS failed, running direct DW fallback:', message);
    
    // SQL Server DW fallback
    try {
      const pool = await getPool();
      const query = `
        SELECT 
          b.BrandName AS brand,
          SUM(fs.LineTotal) AS lineTotal,
          SUM(fs.Quantity) AS quantity
        FROM FactSales fs
        JOIN Brands b ON fs.BrandID = b.BrandID
        WHERE fs.OrderStatus != 'Cancelled'
        GROUP BY b.BrandName
        ORDER BY lineTotal DESC
      `;
      const result = await pool.request().query(query);
      const data = result.recordset.map(row => ({
        brand: String(row.brand),
        lineTotal: Number(row.lineTotal),
        quantity: Number(row.quantity)
      }));
      return NextResponse.json(data);
    } catch (sqlErr: any) {
      return NextResponse.json(
        { error: 'Failed to query SSAS and SQL Server', details: sqlErr.message },
        { status: 500 }
      );
    }
  }
}

