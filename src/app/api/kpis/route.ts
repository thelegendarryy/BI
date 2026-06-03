import { NextResponse } from 'next/server';
import { runMdxQuery, parseOlapNumber } from '../../../lib/mdx';

const CUBE = process.env.SSAS_CUBE_NAME || 'Entreprise DW';

export async function GET() {
  const mdx = `
    SELECT
      {
        [Measures].[Line Total],
        [Measures].[Quantity],
        [Measures].[Tax Amount],
        [Measures].[Discount Amount]
      } ON COLUMNS
    FROM [${CUBE}]
  `;

  try {
    const rows = await runMdxQuery(mdx);

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'No data returned from SSAS cube', query: mdx },
        { status: 404 }
      );
    }

    const row = rows[0];

    const totalSales =
      parseOlapNumber(row['[Measures].[Line Total]']) ||
      parseOlapNumber(row['Line Total']) ||
      parseOlapNumber(Object.values(row)[0] as any);

    const totalQuantity =
      parseOlapNumber(row['[Measures].[Quantity]']) ||
      parseOlapNumber(row['Quantity']) ||
      parseOlapNumber(Object.values(row)[1] as any);

    const totalTax =
      parseOlapNumber(row['[Measures].[Tax Amount]']) ||
      parseOlapNumber(row['Tax Amount']) ||
      parseOlapNumber(Object.values(row)[2] as any);

    const totalDiscount =
      parseOlapNumber(row['[Measures].[Discount Amount]']) ||
      parseOlapNumber(row['Discount Amount']) ||
      parseOlapNumber(Object.values(row)[3] as any);

    return NextResponse.json({
      totalSales,
      totalQuantity,
      totalTax,
      totalDiscount
    });
  } catch (error: any) {
    const message = error?.message || String(error);
    console.error('[/api/kpis] Error:', message);
    return NextResponse.json(
      { error: 'Failed to query SSAS cube', details: message, query: mdx },
      { status: 500 }
    );
  }
}
