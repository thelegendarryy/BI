const sql = require('mssql/msnodesqlv8');

async function main() {
  const server = 'MEDAMIN';
  const database = 'EntrepriseDW';
  const connectionString = `Driver={ODBC Driver 17 for SQL Server};Server=${server};Database=${database};Trusted_Connection=yes;`;

  console.log('Attempting to connect to SQL Server...');
  console.log('Connection string:', connectionString);

  try {
    const pool = await sql.connect(connectionString);
    console.log('✓ SQL Server Connection Successful!');

    // Test 1: Simple SELECT 1
    const res1 = await pool.request().query('SELECT 1 AS test');
    console.log('SELECT 1 Result:', res1.recordset);

    // Test 2: Table counts
    const res2 = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM FactSales) AS FactSalesCount,
        (SELECT COUNT(*) FROM Customers) AS CustomersCount,
        (SELECT COUNT(*) FROM Products) AS ProductsCount,
        (SELECT COUNT(*) FROM Brands) AS BrandsCount,
        (SELECT COUNT(*) FROM Employees) AS EmployeesCount,
        (SELECT COUNT(*) FROM Promotions) AS PromotionsCount,
        (SELECT COUNT(*) FROM DimDate) AS DimDateCount
    `);
    console.log('Table counts:', res2.recordset[0]);

    // Test 3: Check linked servers
    const res3 = await pool.request().query(`
      SELECT name, product, provider, data_source, catalog 
      FROM sys.servers
    `);
    console.log('Linked servers registered:');
    console.table(res3.recordset);

    // Test 4: Test SSAS OPENQUERY
    console.log('Testing SSAS OPENQUERY...');
    try {
      const res4 = await pool.request().query(`
        SELECT * FROM OPENQUERY(SSAS_CUBE, '
          SELECT 
            [Measures].[Line Total] ON COLUMNS
          FROM [Entreprise DW]
        ')
      `);
      console.log('✓ SSAS OPENQUERY successful!');
      console.log('SSAS Result:', res4.recordset);
    } catch (ssasErr) {
      console.error('✗ SSAS OPENQUERY Failed:', ssasErr.message);
    }

    await pool.close();
  } catch (err) {
    console.error('✗ SQL Server Connection Failed:', err.message);
  }
}

main();
