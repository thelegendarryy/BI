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
          p.ProductName AS name,
          SUM(fs.LineTotal) AS lineTotal
        FROM FactSales fs
        JOIN Products p ON fs.ProductID = p.ProductID
        ${dateJoin}
        WHERE fs.OrderStatus != 'Cancelled' AND ${whereClause}
        GROUP BY p.ProductName
        ORDER BY lineTotal DESC
      `;

      const result = await pool.request().query(query);
      const data = result.recordset.map(row => ({
        name: String(row.name),
        lineTotal: Number(row.lineTotal)
      }));

      return NextResponse.json(data);
    } catch (error: any) {
      console.error('[/api/sales-by-product] SQL query failed:', error.message);
      return NextResponse.json(
        { error: 'Failed to query SQL database', details: error.message },
        { status: 500 }
      );
    }
  }

  // Unfiltered: try SSAS linked server
  const mdx = `
    SELECT
      {[Measures].[Line Total]} ON COLUMNS,
      NON EMPTY
      [Products].[Product ID].Members ON ROWS
    FROM [${CUBE}]
  `;

  const tsql = `
    SELECT 
      p.ProductName AS name,
      SUM(CAST(oq."[Measures].[Line Total]" AS DECIMAL(18,2))) AS lineTotal
    FROM OPENQUERY(SSAS_CUBE, '
      SELECT
        {[Measures].[Line Total]} ON COLUMNS,
        NON EMPTY
        [Products].[Product ID].Members ON ROWS
      FROM [${CUBE}]
    ') oq
    JOIN Products p ON CAST(p.ProductID AS VARCHAR(50)) = CAST(oq."[Products].[Product ID].[Product ID].[MEMBER_CAPTION]" AS VARCHAR(50))
    GROUP BY p.ProductName
    ORDER BY lineTotal DESC
  `;

  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1');

    const result = await pool.request().query(tsql);
    const data = result.recordset.map(row => ({
      name: String(row.name),
      lineTotal: Number(row.lineTotal)
    }));

    return NextResponse.json(data);
  } catch (error: any) {
    const message = error?.message || String(error);
    console.warn('[/api/sales-by-product] SSAS failed, running direct DW fallback:', message);
    
    // SQL Server DW fallback
    try {
      const pool = await getPool();
      const query = `
        SELECT 
          p.ProductName AS name,
          SUM(fs.LineTotal) AS lineTotal
        FROM FactSales fs
        JOIN Products p ON fs.ProductID = p.ProductID
        WHERE fs.OrderStatus != 'Cancelled'
        GROUP BY p.ProductName
        ORDER BY lineTotal DESC
      `;
      const result = await pool.request().query(query);
      const data = result.recordset.map(row => ({
        name: String(row.name),
        lineTotal: Number(row.lineTotal)
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

