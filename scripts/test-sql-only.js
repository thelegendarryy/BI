const sql = require('mssql/msnodesqlv8');

async function main() {
  const server = 'MEDAMIN';
  const database = 'EntrepriseDW';
  const connectionString = `Driver={ODBC Driver 17 for SQL Server};Server=${server};Database=${database};Trusted_Connection=yes;`;

  console.log('Connecting using ConnectionPool...');
  try {
    const pool = new sql.ConnectionPool({
      connectionString,
      connectionTimeout: 10000,
      requestTimeout: 30000
    });
    await pool.connect();
    console.log('✓ Connected to SQL Server.');

    console.log('Querying FactSales count...');
    const res = await pool.request().query('SELECT COUNT(*) AS count FROM FactSales');
    console.log('FactSales Count:', res.recordset[0].count);

    console.log('Querying first 2 rows of FactSales...');
    const res2 = await pool.request().query('SELECT TOP 2 * FROM FactSales');
    console.table(res2.recordset);

    await pool.close();
    console.log('Done.');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
