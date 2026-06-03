import { NextResponse } from 'next/server';
import { getPool } from '../../../../lib/db';

export async function GET() {
  const tsql = `
    SELECT 
      d.YearNumber AS period,
      SUM(CAST(oq."[Measures].[Line Total]" AS DECIMAL(18,2))) AS lineTotal
    FROM OPENQUERY(SSAS_CUBE, '
      SELECT
        {[Measures].[Line Total]} ON COLUMNS,
        NON EMPTY
        [Dim Date].[Date Key].Members ON ROWS
      FROM [Entreprise DW]
    ') oq
    JOIN DimDate d ON d.DateKey = CAST(CAST(oq."[Dim Date].[Date Key].[Date Key].[MEMBER_CAPTION]" AS VARCHAR(50)) AS INT)
    GROUP BY d.YearNumber
    ORDER BY d.YearNumber ASC
  `;

  try {
    const pool = await getPool();
    const result = await pool.request().query(tsql);
    return NextResponse.json({
      ok: true,
      query: tsql,
      rows: result.recordset
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      query: tsql,
      error: err?.message || String(err)
    }, { status: 500 });
  }
}
