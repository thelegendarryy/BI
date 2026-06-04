import { NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';
import { hydratedDataset } from '../../../data/salesCubeData';
import { OlapPromotionSale } from '../../../types/dashboard';

const CUBE = process.env.SSAS_CUBE_NAME || 'Entreprise DW';

/**
 * GET /api/sales-by-promotion
 *
 * Strategy:
 * 1. Try OPENQUERY via SSAS linked server + LEFT JOIN to Promotions (prevents NULL drops)
 * 2. If SSAS returns 0 rows or errors → fallback to direct T-SQL against FactSales
 * 3. If SQL Server entirely unreachable → static dataset fallback
 */
export async function GET() {
  // ── Strategy 1: SSAS via OPENQUERY + LEFT JOIN ──────────────────────────────
    const ssasQuery = `
      SELECT
        COALESCE(p.PromotionName, 'Standard Sales (No Promotion)') AS promotionType,
        SUM(CAST(oq."[Measures].[Line Total]"        AS DECIMAL(18,2))) AS lineTotal,
        SUM(CAST(oq."[Measures].[Discount Amount]"   AS DECIMAL(18,2))) AS discountAmount,
        SUM(CAST(oq."[Measures].[Quantity]"          AS INT))           AS quantity
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
      -- LEFT JOIN prevents rows from being dropped when SSAS returns Promotion ID "All"
      LEFT JOIN Promotions p
        ON TRY_CAST(p.PromotionID AS VARCHAR(50))
         = TRY_CAST(oq."[Promotions].[Promotion ID].[Promotion ID].[MEMBER_CAPTION]" AS VARCHAR(50))
      WHERE oq."[Promotions].[Promotion ID].[Promotion ID].[MEMBER_CAPTION]" IS NOT NULL
      GROUP BY COALESCE(p.PromotionName, 'Standard Sales (No Promotion)')
      ORDER BY lineTotal DESC
    `;

  // ── Strategy 2: Direct DW query (no SSAS) ───────────────────────────────────
  const directQuery = `
    SELECT
      COALESCE(p.PromotionName, 'Standard Sales (No Promotion)') AS promotionType,
      SUM(fs.LineTotal)      AS lineTotal,
      SUM(fs.DiscountAmount) AS discountAmount,
      SUM(fs.Quantity)       AS quantity
    FROM FactSales fs
    LEFT JOIN Promotions p ON fs.PromotionID = p.PromotionID
    WHERE fs.OrderStatus != 'Cancelled'
    GROUP BY COALESCE(p.PromotionName, 'Standard Sales (No Promotion)')
    ORDER BY lineTotal DESC
  `;

  const buildResponse = (recordset: Record<string, unknown>[]): OlapPromotionSale[] =>
    recordset.map(row => {
      const lineTotal = Number(row.lineTotal ?? 0);
      const discountAmount = Number(row.discountAmount ?? 0);
      const quantity = Number(row.quantity ?? 0);
      const displayName =
        String(row.promotionType ?? 'Standard Sales') === 'No Promotion' ||
        String(row.promotionType ?? '').trim() === ''
          ? 'Standard Sales (No Promotion)'
          : String(row.promotionType);

      const avgDiscountPercent =
        lineTotal + discountAmount > 0
          ? Math.round((discountAmount / (lineTotal + discountAmount)) * 10000) / 100
          : 0;

      return { promotionType: displayName, lineTotal, discountAmount, quantity, avgDiscountPercent };
    });

  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1'); // connection health check

    // Try SSAS first
    try {
      const ssasResult = await pool.request().query(ssasQuery);
      if (ssasResult.recordset.length > 0) {
        return NextResponse.json(buildResponse(ssasResult.recordset));
      }
    } catch (ssasErr) {
      console.warn('[/api/sales-by-promotion] SSAS OPENQUERY failed, trying direct DW:', ssasErr);
    }

    // Fall back to direct DW query
    const directResult = await pool.request().query(directQuery);
    if (directResult.recordset.length > 0) {
      return NextResponse.json(buildResponse(directResult.recordset));
    }
  } catch (error) {
    console.error('[/api/sales-by-promotion] SQL Server unreachable:', error);
    // Fall through to static
  }

  // ── Strategy 3: Static dataset fallback ─────────────────────────────────────
  const sales = hydratedDataset.filter(s => s.OrderStatus !== 'Cancelled');
  const promoMap = new Map<string, { lineTotal: number; discountAmount: number; quantity: number }>();

  for (const s of sales) {
    const label =
      s.Promotion.PromotionName === 'Standard Sales (No Promotion)' ||
      s.Promotion.PromotionType === 'No Promotion'
        ? 'Standard Sales (No Promotion)'
        : s.Promotion.PromotionName;

    if (!promoMap.has(label)) promoMap.set(label, { lineTotal: 0, discountAmount: 0, quantity: 0 });
    const g = promoMap.get(label)!;
    g.lineTotal += s.LineTotal;
    g.discountAmount += s.DiscountAmount;
    g.quantity += s.Quantity;
  }

  const staticData: OlapPromotionSale[] = Array.from(promoMap.entries())
    .map(([label, g]) => ({
      promotionType: label,
      lineTotal: Math.round(g.lineTotal * 100) / 100,
      discountAmount: Math.round(g.discountAmount * 100) / 100,
      quantity: g.quantity,
      avgDiscountPercent:
        g.lineTotal + g.discountAmount > 0
          ? Math.round((g.discountAmount / (g.lineTotal + g.discountAmount)) * 10000) / 100
          : 0,
    }))
    .sort((a, b) => b.lineTotal - a.lineTotal);

  return NextResponse.json(staticData);
}
