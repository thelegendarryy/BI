import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';
import { parseFilters, buildSqlWhere } from '../../../lib/filter';

const CUBE = process.env.SSAS_CUBE_NAME || 'Entreprise DW';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const granularity = searchParams.get('granularity') || 'year';

  const filters = parseFilters(request);
  const isFiltered = 
    filters.year !== 'All' || 
    filters.quarter !== 'All' || 
    filters.month !== 'All' || 
    filters.brand !== 'All' || 
    filters.status !== 'All';

  // Helper to determine T-SQL selects for dates
  let periodSelect = '';
  let groupBy = '';
  let orderBy = '';

  if (granularity === 'month') {
    periodSelect = `d.MonthName + ' ' + CAST(d.YearNumber AS VARCHAR) AS period`;
    groupBy = 'd.YearNumber, d.MonthNumber, d.MonthName';
    orderBy = 'd.YearNumber ASC, d.MonthNumber ASC';
  } else if (granularity === 'quarter') {
    periodSelect = `CAST(d.YearNumber AS VARCHAR) + '-Q' + CAST(d.QuarterNumber AS VARCHAR) AS period`;
    groupBy = 'd.YearNumber, d.QuarterNumber';
    orderBy = 'd.YearNumber ASC, d.QuarterNumber ASC';
  } else {
    periodSelect = `CAST(d.YearNumber AS VARCHAR) AS period`;
    groupBy = 'd.YearNumber';
    orderBy = 'd.YearNumber ASC';
  }

  if (isFiltered) {
    try {
      const pool = await getPool();
      await pool.request().query('SELECT 1');

      const whereClause = buildSqlWhere(filters, 'fs', 'd');

      const query = `
        SELECT 
          ${periodSelect},
          SUM(fs.LineTotal) AS lineTotal,
          SUM(fs.Quantity) AS volume,
          SUM(fs.LineTotal - fs.TaxAmount - (fs.Quantity * p.StandardCost)) AS profit
        FROM FactSales fs
        INNER JOIN DimDate d ON fs.DateKey = d.DateKey
        INNER JOIN Products p ON fs.ProductID = p.ProductID
        WHERE fs.OrderStatus != 'Cancelled' AND ${whereClause}
        GROUP BY ${groupBy}
        ORDER BY ${orderBy}
      `;

      const result = await pool.request().query(query);
      const data = result.recordset.map(row => ({
        period: String(row.period),
        lineTotal: Number(row.lineTotal),
        volume: Number(row.volume),
        profit: Number(row.profit)
      }));

      return NextResponse.json(data);
    } catch (error: any) {
      console.error('[/api/sales-by-date] SQL query failed:', error.message);
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
      [Dim Date].[Date Key].Members ON ROWS
    FROM [${CUBE}]
  `;

  // We write T-SQL using SQL Server joins to compute volume and profit even for SSAS path
  const tsql = `
    SELECT 
      ${periodSelect},
      SUM(CAST(oq."[Measures].[Line Total]" AS DECIMAL(18,2))) AS lineTotal,
      SUM(fs.Quantity) AS volume,
      SUM(fs.LineTotal - fs.TaxAmount - (fs.Quantity * p.StandardCost)) AS profit
    FROM OPENQUERY(SSAS_CUBE, '
      SELECT
        {[Measures].[Line Total]} ON COLUMNS,
        NON EMPTY
        [Dim Date].[Date Key].Members ON ROWS
      FROM [${CUBE}]
    ') oq
    JOIN DimDate d ON d.DateKey = CAST(CAST(oq."[Dim Date].[Date Key].[Date Key].[MEMBER_CAPTION]" AS VARCHAR(50)) AS INT)
    JOIN FactSales fs ON fs.DateKey = d.DateKey
    JOIN Products p ON fs.ProductID = p.ProductID
    WHERE fs.OrderStatus != 'Cancelled'
    GROUP BY ${groupBy}
    ORDER BY ${orderBy}
  `;

  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1');

    const result = await pool.request().query(tsql);
    const data = result.recordset.map(row => ({
      period: String(row.period),
      lineTotal: Number(row.lineTotal),
      volume: Number(row.volume),
      profit: Number(row.profit)
    }));

    return NextResponse.json(data);
  } catch (error: any) {
    const message = error?.message || String(error);
    console.warn('[/api/sales-by-date] SSAS failed, running direct DW query:', message);
    
    // SQL Server DW fallback
    try {
      const pool = await getPool();
      const query = `
        SELECT 
          ${periodSelect},
          SUM(fs.LineTotal) AS lineTotal,
          SUM(fs.Quantity) AS volume,
          SUM(fs.LineTotal - fs.TaxAmount - (fs.Quantity * p.StandardCost)) AS profit
        FROM FactSales fs
        INNER JOIN DimDate d ON fs.DateKey = d.DateKey
        INNER JOIN Products p ON fs.ProductID = p.ProductID
        WHERE fs.OrderStatus != 'Cancelled'
        GROUP BY ${groupBy}
        ORDER BY ${orderBy}
      `;
      const result = await pool.request().query(query);
      const data = result.recordset.map(row => ({
        period: String(row.period),
        lineTotal: Number(row.lineTotal),
        volume: Number(row.volume),
        profit: Number(row.profit)
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

