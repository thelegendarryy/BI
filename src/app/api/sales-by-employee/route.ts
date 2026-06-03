import { NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';

const CUBE = process.env.SSAS_CUBE_NAME || 'Entreprise DW';

export async function GET() {
  const mdx = `
    SELECT
      {
        [Measures].[Line Total],
        [Measures].[Quantity],
        [Measures].[Fact Sales Nombre]
      } ON COLUMNS,
      NON EMPTY
      [Employees].[Employee ID].Members ON ROWS
    FROM [${CUBE}]
  `;

  const tsql = `
    SELECT 
      e.FirstName + ' ' + e.LastName AS employee,
      SUM(CAST(oq."[Measures].[Line Total]" AS DECIMAL(18,2))) AS lineTotal,
      SUM(CAST(oq."[Measures].[Quantity]" AS INT)) AS quantity,
      SUM(CAST(oq."[Measures].[Fact Sales Nombre]" AS INT)) AS orderLines
    FROM OPENQUERY(SSAS_CUBE, '
      SELECT
        {
          [Measures].[Line Total],
          [Measures].[Quantity],
          [Measures].[Fact Sales Nombre]
        } ON COLUMNS,
        NON EMPTY
        [Employees].[Employee ID].Members ON ROWS
      FROM [${CUBE}]
    ') oq
    JOIN Employees e ON CAST(e.EmployeeID AS VARCHAR(50)) = CAST(oq."[Employees].[Employee ID].[Employee ID].[MEMBER_CAPTION]" AS VARCHAR(50))
    GROUP BY e.FirstName, e.LastName
    ORDER BY lineTotal DESC
  `;

  try {
    const pool = await getPool();
    // Validate connection
    await pool.request().query('SELECT 1');

    const result = await pool.request().query(tsql);
    const data = result.recordset.map(row => ({
      employee: String(row.employee),
      lineTotal: Number(row.lineTotal),
      quantity: Number(row.quantity),
      orderLines: Number(row.orderLines)
    }));

    return NextResponse.json(data);
  } catch (error: any) {
    const message = error?.message || String(error);
    console.error('[/api/sales-by-employee] Error:', message);
    return NextResponse.json(
      { error: 'Failed to query sales by employee', details: message, query: mdx, sqlQuery: tsql },
      { status: 500 }
    );
  }
}
