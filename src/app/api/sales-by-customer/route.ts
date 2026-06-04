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
          COALESCE(c.CompanyName, c.FirstName + ' ' + c.LastName) AS customer,
          SUM(fs.LineTotal) AS lineTotal
        FROM FactSales fs
        JOIN Customers c ON fs.CustomerID = c.CustomerID
        ${dateJoin}
        WHERE fs.OrderStatus != 'Cancelled' AND ${whereClause}
        GROUP BY c.CompanyName, c.FirstName, c.LastName
        ORDER BY lineTotal DESC
      `;

      const result = await pool.request().query(query);
      const data = result.recordset.slice(0, 20).map(row => ({
        customer: String(row.customer),
        lineTotal: Number(row.lineTotal)
      }));

      return NextResponse.json(data);
    } catch (error: any) {
      console.error('[/api/sales-by-customer] SQL query failed:', error.message);
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
      [Customers].[Customer ID].Members ON ROWS
    FROM [${CUBE}]
  `;

  const tsql = `
    SELECT 
      COALESCE(c.CompanyName, c.FirstName + ' ' + c.LastName) AS customer,
      SUM(CAST(oq."[Measures].[Line Total]" AS DECIMAL(18,2))) AS lineTotal
    FROM OPENQUERY(SSAS_CUBE, '
      SELECT
        {[Measures].[Line Total]} ON COLUMNS,
        NON EMPTY
        [Customers].[Customer ID].Members ON ROWS
      FROM [${CUBE}]
    ') oq
    JOIN Customers c ON CAST(c.CustomerID AS VARCHAR(50)) = CAST(oq."[Customers].[Customer ID].[Customer ID].[MEMBER_CAPTION]" AS VARCHAR(50))
    GROUP BY c.CompanyName, c.FirstName, c.LastName
    ORDER BY lineTotal DESC
  `;

  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1');

    const result = await pool.request().query(tsql);
    const data = result.recordset.slice(0, 20).map(row => ({
      customer: String(row.customer),
      lineTotal: Number(row.lineTotal)
    }));

    return NextResponse.json(data);
  } catch (error: any) {
    const message = error?.message || String(error);
    console.warn('[/api/sales-by-customer] SSAS failed, running direct DW fallback:', message);
    
    // SQL Server DW fallback
    try {
      const pool = await getPool();
      const query = `
        SELECT 
          COALESCE(c.CompanyName, c.FirstName + ' ' + c.LastName) AS customer,
          SUM(fs.LineTotal) AS lineTotal
        FROM FactSales fs
        JOIN Customers c ON fs.CustomerID = c.CustomerID
        WHERE fs.OrderStatus != 'Cancelled'
        GROUP BY c.CompanyName, c.FirstName, c.LastName
        ORDER BY lineTotal DESC
      `;
      const result = await pool.request().query(query);
      const data = result.recordset.slice(0, 20).map(row => ({
        customer: String(row.customer),
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

