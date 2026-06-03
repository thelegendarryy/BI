import { NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';

const CUBE = process.env.SSAS_CUBE_NAME || 'Entreprise DW';

export async function GET() {
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
    // Validate connection
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
    console.error('[/api/sales-by-brand] Error:', message);
    return NextResponse.json(
      { error: 'Failed to query sales by brand', details: message, query: mdx, sqlQuery: tsql },
      { status: 500 }
    );
  }
}
