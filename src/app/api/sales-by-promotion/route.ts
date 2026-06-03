import { NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';

const CUBE = process.env.SSAS_CUBE_NAME || 'Entreprise DW';

export async function GET() {
  const mdx = `
    SELECT
      {
        [Measures].[Line Total],
        [Measures].[Discount Amount],
        [Measures].[Quantity]
      } ON COLUMNS,
      NON EMPTY
      [Promotions].[Promotion ID].Members ON ROWS
    FROM [${CUBE}]
  `;

  const tsql = `
    SELECT 
      p.PromotionName AS promotionType,
      SUM(CAST(oq."[Measures].[Line Total]" AS DECIMAL(18,2))) AS lineTotal,
      SUM(CAST(oq."[Measures].[Discount Amount]" AS DECIMAL(18,2))) AS discountAmount,
      SUM(CAST(oq."[Measures].[Quantity]" AS INT)) AS quantity
    FROM OPENQUERY(SSAS_CUBE, '
      SELECT
        {
          [Measures].[Line Total],
          [Measures].[Discount Amount],
          [Measures].[Quantity]
        } ON COLUMNS,
        NON EMPTY
        [Promotions].[Promotion ID].Members ON ROWS
      FROM [${CUBE}]
    ') oq
    JOIN Promotions p ON CAST(p.PromotionID AS VARCHAR(50)) = CAST(oq."[Promotions].[Promotion ID].[Promotion ID].[MEMBER_CAPTION]" AS VARCHAR(50))
    GROUP BY p.PromotionName
    ORDER BY lineTotal DESC
  `;

  try {
    const pool = await getPool();
    // Validate connection
    await pool.request().query('SELECT 1');

    const result = await pool.request().query(tsql);
    const data = result.recordset.map(row => {
      const promotionType = String(row.promotionType);
      const lineTotal = Number(row.lineTotal);
      const discountAmount = Number(row.discountAmount);
      const quantity = Number(row.quantity);

      // Display label check
      const displayName = promotionType === 'No Promotion' ? 'Standard Sales' : promotionType;

      const avgDiscountPercent =
        lineTotal + discountAmount > 0
          ? Math.round((discountAmount / (lineTotal + discountAmount)) * 100)
          : 0;

      return {
        promotionType: displayName,
        lineTotal,
        discountAmount,
        quantity,
        avgDiscountPercent
      };
    });

    return NextResponse.json(data);
  } catch (error: any) {
    const message = error?.message || String(error);
    console.error('[/api/sales-by-promotion] Error:', message);
    return NextResponse.json(
      { error: 'Failed to query sales by promotion', details: message, query: mdx, sqlQuery: tsql },
      { status: 500 }
    );
  }
}
