const sql = require('mssql/msnodesqlv8');

async function main() {
  const server = 'MEDAMIN';
  const database = 'EntrepriseDW';
  const connectionString = `Driver={ODBC Driver 17 for SQL Server};Server=${server};Database=${database};Trusted_Connection=yes;`;

  try {
    const pool = new sql.ConnectionPool({
      connectionString,
      connectionTimeout: 5000,
      requestTimeout: 10000
    });
    await pool.connect();
    console.log('✓ Connected.');

    const q = `
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
        FROM [Entreprise DW]
      ') oq
      LEFT JOIN Promotions p
        ON TRY_CAST(p.PromotionID AS VARCHAR(50))
         = TRY_CAST(oq."[Promotions].[Promotion ID].[Promotion ID].[MEMBER_CAPTION]" AS VARCHAR(50))
      WHERE oq."[Promotions].[Promotion ID].[Promotion ID].[MEMBER_CAPTION]" IS NOT NULL
      GROUP BY COALESCE(p.PromotionName, 'Standard Sales (No Promotion)')
      ORDER BY lineTotal DESC
    `;

    const res = await pool.request().query(q);
    console.table(res.recordset);
    
    await pool.close();
  } catch (err) {
    console.error('Query failed:', err.message);
  }
}
main();
