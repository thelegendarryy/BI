import { NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';

const CUBE = process.env.SSAS_CUBE_NAME || 'Entreprise DW';

export async function GET() {
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
    // Validate connection
    await pool.request().query('SELECT 1');

    const result = await pool.request().query(tsql);
    const data = result.recordset.map(row => ({
      name: String(row.name),
      lineTotal: Number(row.lineTotal)
    }));

    return NextResponse.json(data);
  } catch (error: any) {
    const message = error?.message || String(error);
    console.error('[/api/sales-by-product] Error:', message);
    return NextResponse.json(
      { error: 'Failed to query sales by product', details: message, query: mdx, sqlQuery: tsql },
      { status: 500 }
    );
  }
}
