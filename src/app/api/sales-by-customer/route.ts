import { NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';

const CUBE = process.env.SSAS_CUBE_NAME || 'Entreprise DW';

export async function GET() {
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
    // Validate connection
    await pool.request().query('SELECT 1');

    // Fetch top 20 customers
    const result = await pool.request().query(tsql);
    const data = result.recordset.slice(0, 20).map(row => ({
      customer: String(row.customer),
      lineTotal: Number(row.lineTotal)
    }));

    return NextResponse.json(data);
  } catch (error: any) {
    const message = error?.message || String(error);
    console.error('[/api/sales-by-customer] Error:', message);
    return NextResponse.json(
      { error: 'Failed to query sales by customer', details: message, query: mdx, sqlQuery: tsql },
      { status: 500 }
    );
  }
}
