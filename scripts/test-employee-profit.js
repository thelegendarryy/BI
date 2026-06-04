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
        e.FirstName + ' ' + e.LastName AS employee,
        SUM(CAST(oq."[Measures].[Line Total]" AS DECIMAL(18,2))) AS lineTotal,
        SUM(CAST(oq."[Measures].[Quantity]" AS INT)) AS quantity,
        SUM(CAST(oq."[Measures].[Fact Sales Nombre]" AS INT)) AS orderLines,
        COALESCE(pft.profit, 0) AS profit
      FROM OPENQUERY(SSAS_CUBE, '
        SELECT
          {
            [Measures].[Line Total],
            [Measures].[Quantity],
            [Measures].[Fact Sales Nombre]
          } ON COLUMNS,
          NON EMPTY
          [Employees].[Employee ID].Members ON ROWS
        FROM [Entreprise DW]
      ') oq
      JOIN Employees e ON CAST(e.EmployeeID AS VARCHAR(50)) = CAST(oq."[Employees].[Employee ID].[Employee ID].[MEMBER_CAPTION]" AS VARCHAR(50))
      LEFT JOIN (
        SELECT 
          SalesRepID,
          SUM(fs.LineTotal - fs.TaxAmount - (fs.Quantity * p.StandardCost)) AS profit
        FROM FactSales fs
        JOIN Products p ON fs.ProductID = p.ProductID
        WHERE fs.OrderStatus != 'Cancelled'
        GROUP BY SalesRepID
      ) pft ON pft.SalesRepID = e.EmployeeID
      GROUP BY e.FirstName, e.LastName, pft.profit
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
