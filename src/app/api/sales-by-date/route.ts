import { NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';

const CUBE = process.env.SSAS_CUBE_NAME || 'Entreprise DW';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const granularity = searchParams.get('granularity') || 'year';

  const mdx = `
    SELECT
      {[Measures].[Line Total]} ON COLUMNS,
      NON EMPTY
      [Dim Date].[Date Key].Members ON ROWS
    FROM [${CUBE}]
  `;

  let tsql = '';
  if (granularity === 'month') {
    tsql = `
      SELECT 
        d.MonthName + ' ' + CAST(d.YearNumber AS VARCHAR) AS period,
        SUM(CAST(oq."[Measures].[Line Total]" AS DECIMAL(18,2))) AS lineTotal
      FROM OPENQUERY(SSAS_CUBE, '
        SELECT
          {[Measures].[Line Total]} ON COLUMNS,
          NON EMPTY
          [Dim Date].[Date Key].Members ON ROWS
        FROM [${CUBE}]
      ') oq
      JOIN DimDate d ON d.DateKey = CAST(CAST(oq."[Dim Date].[Date Key].[Date Key].[MEMBER_CAPTION]" AS VARCHAR(50)) AS INT)
      GROUP BY d.YearNumber, d.MonthNumber, d.MonthName
      ORDER BY d.YearNumber ASC, d.MonthNumber ASC
    `;
  } else if (granularity === 'quarter') {
    tsql = `
      SELECT 
        CAST(d.YearNumber AS VARCHAR) + '-Q' + CAST(d.QuarterNumber AS VARCHAR) AS period,
        SUM(CAST(oq."[Measures].[Line Total]" AS DECIMAL(18,2))) AS lineTotal
      FROM OPENQUERY(SSAS_CUBE, '
        SELECT
          {[Measures].[Line Total]} ON COLUMNS,
          NON EMPTY
          [Dim Date].[Date Key].Members ON ROWS
        FROM [${CUBE}]
      ') oq
      JOIN DimDate d ON d.DateKey = CAST(CAST(oq."[Dim Date].[Date Key].[Date Key].[MEMBER_CAPTION]" AS VARCHAR(50)) AS INT)
      GROUP BY d.YearNumber, d.QuarterNumber
      ORDER BY d.YearNumber ASC, d.QuarterNumber ASC
    `;
  } else {
    // Default: year
    tsql = `
      SELECT 
        CAST(d.YearNumber AS VARCHAR) AS period,
        SUM(CAST(oq."[Measures].[Line Total]" AS DECIMAL(18,2))) AS lineTotal
      FROM OPENQUERY(SSAS_CUBE, '
        SELECT
          {[Measures].[Line Total]} ON COLUMNS,
          NON EMPTY
          [Dim Date].[Date Key].Members ON ROWS
        FROM [${CUBE}]
      ') oq
      JOIN DimDate d ON d.DateKey = CAST(CAST(oq."[Dim Date].[Date Key].[Date Key].[MEMBER_CAPTION]" AS VARCHAR(50)) AS INT)
      GROUP BY d.YearNumber
      ORDER BY d.YearNumber ASC
    `;
  }

  try {
    const pool = await getPool();
    // Validate connection first
    await pool.request().query('SELECT 1');

    const result = await pool.request().query(tsql);
    const data = result.recordset.map(row => ({
      period: String(row.period),
      lineTotal: Number(row.lineTotal)
    }));

    return NextResponse.json(data);
  } catch (error: any) {
    const message = error?.message || String(error);
    console.error('[/api/sales-by-date] Error:', message);
    return NextResponse.json(
      { error: 'Failed to query sales by date', details: message, query: mdx, sqlQuery: tsql },
      { status: 500 }
    );
  }
}
