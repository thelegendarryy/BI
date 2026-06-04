import { NextRequest, NextResponse } from 'next/server';
import { runMdxQuery, parseOlapNumber } from '../../../lib/mdx';
import { getPool } from '../../../lib/db';
import { parseFilters, buildSqlWhere, getDateJoinIfNeeded } from '../../../lib/filter';

const CUBE = process.env.SSAS_CUBE_NAME || 'Entreprise DW';

export async function GET(request: NextRequest) {
  const filters = parseFilters(request);
  const isFiltered = 
    filters.year !== 'All' || 
    filters.quarter !== 'All' || 
    filters.month !== 'All' || 
    filters.brand !== 'All' || 
    filters.status !== 'All';

  if (isFiltered) {
    try {
      const pool = await getPool();
      await pool.request().query('SELECT 1'); // health check
      
      const dateJoin = getDateJoinIfNeeded(filters, 'fs', 'dd');
      const whereClause = buildSqlWhere(filters, 'fs', 'dd');

      const query = `
        SELECT
          SUM(fs.LineTotal) AS totalSales,
          SUM(fs.Quantity) AS totalQuantity,
          SUM(fs.TaxAmount) AS totalTax,
          COUNT(DISTINCT fs.SalesOrderID) AS totalOrders,
          SUM(fs.LineTotal - fs.TaxAmount - (fs.Quantity * p.StandardCost)) AS totalProfit,
          COUNT(DISTINCT fs.BrandID) AS activeBrands,
          COUNT(DISTINCT fs.ProductID) AS activeProducts
        FROM FactSales fs
        JOIN Products p ON fs.ProductID = p.ProductID
        ${dateJoin}
        WHERE fs.OrderStatus != 'Cancelled' AND ${whereClause}
      `;

      const result = await pool.request().query(query);
      const row = result.recordset[0] ?? {};

      return NextResponse.json({
        totalSales: Number(row.totalSales ?? 0),
        totalQuantity: Number(row.totalQuantity ?? 0),
        totalTax: Number(row.totalTax ?? 0),
        totalOrders: Number(row.totalOrders ?? 0),
        totalProfit: Number(row.totalProfit ?? 0),
        activeBrands: Number(row.activeBrands ?? 0),
        activeProducts: Number(row.activeProducts ?? 0),
        dataSource: 'live-sql'
      });
    } catch (error: any) {
      console.error('[/api/kpis] SQL query failed:', error.message);
      return NextResponse.json(
        { error: 'Failed to query SQL database', details: error.message },
        { status: 500 }
      );
    }
  }

  // Unfiltered: query SSAS cube
  const mdx = `
    SELECT
      {
        [Measures].[Line Total],
        [Measures].[Quantity],
        [Measures].[Tax Amount],
        [Measures].[Fact Sales Nombre]
      } ON COLUMNS
    FROM [${CUBE}]
  `;

  try {
    const rows = await runMdxQuery(mdx);

    if (!rows || rows.length === 0) {
      throw new Error('No data returned from SSAS cube');
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

    const totalOrders =
      parseOlapNumber(row['[Measures].[Fact Sales Nombre]']) ||
      parseOlapNumber(row['Fact Sales Nombre']) ||
      parseOlapNumber(Object.values(row)[3] as any);

    // Fetch profit and active counts in parallel from SQL Server
    const pool = await getPool();
    const extraQuery = `
      SELECT
        SUM(fs.LineTotal - fs.TaxAmount - (fs.Quantity * p.StandardCost)) AS totalProfit,
        COUNT(DISTINCT fs.BrandID) AS activeBrands,
        COUNT(DISTINCT fs.ProductID) AS activeProducts
      FROM FactSales fs
      JOIN Products p ON fs.ProductID = p.ProductID
      WHERE fs.OrderStatus != 'Cancelled'
    `;
    const extraResult = await pool.request().query(extraQuery);
    const extraRow = extraResult.recordset[0] ?? {};

    return NextResponse.json({
      totalSales,
      totalQuantity,
      totalTax,
      totalOrders,
      totalProfit: Number(extraRow.totalProfit ?? 0),
      activeBrands: Number(extraRow.activeBrands ?? 0),
      activeProducts: Number(extraRow.activeProducts ?? 0),
      dataSource: 'live-ssas'
    });
  } catch (error: any) {
    const message = error?.message || String(error);
    console.warn('[/api/kpis] SSAS query failed, falling back to SQL DW query:', message);
    
    // Fall back to SQL
    try {
      const pool = await getPool();
      const query = `
        SELECT
          SUM(fs.LineTotal) AS totalSales,
          SUM(fs.Quantity) AS totalQuantity,
          SUM(fs.TaxAmount) AS totalTax,
          COUNT(DISTINCT fs.SalesOrderID) AS totalOrders,
          SUM(fs.LineTotal - fs.TaxAmount - (fs.Quantity * p.StandardCost)) AS totalProfit,
          COUNT(DISTINCT fs.BrandID) AS activeBrands,
          COUNT(DISTINCT fs.ProductID) AS activeProducts
        FROM FactSales fs
        JOIN Products p ON fs.ProductID = p.ProductID
        WHERE fs.OrderStatus != 'Cancelled'
      `;
      const result = await pool.request().query(query);
      const row = result.recordset[0] ?? {};

      return NextResponse.json({
        totalSales: Number(row.totalSales ?? 0),
        totalQuantity: Number(row.totalQuantity ?? 0),
        totalTax: Number(row.totalTax ?? 0),
        totalOrders: Number(row.totalOrders ?? 0),
        totalProfit: Number(row.totalProfit ?? 0),
        activeBrands: Number(row.activeBrands ?? 0),
        activeProducts: Number(row.activeProducts ?? 0),
        dataSource: 'live-sql'
      });
    } catch (sqlErr: any) {
      return NextResponse.json(
        { error: 'Failed to query SSAS and SQL Server', details: sqlErr.message },
        { status: 500 }
      );
    }
  }
}
