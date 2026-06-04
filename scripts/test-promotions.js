const sql = require('mssql/msnodesqlv8');

async function main() {
  const server = 'MEDAMIN';
  const database = 'EntrepriseDW';
  const connectionString = `Driver={ODBC Driver 17 for SQL Server};Server=${server};Database=${database};Trusted_Connection=yes;`;

  console.log('Connecting...');
  try {
    const pool = new sql.ConnectionPool({
      connectionString,
      connectionTimeout: 5000,
      requestTimeout: 10000
    });
    await pool.connect();
    console.log('✓ Connected to SQL Server.');

    console.log('Running Promotions MDX directly via OPENQUERY...');
    const res = await pool.request().query(`
      SELECT * FROM OPENQUERY(SSAS_CUBE, '
        SELECT
          {
            [Measures].[Line Total],
            [Measures].[Discount Amount],
            [Measures].[Quantity]
          } ON COLUMNS,
          NON EMPTY
          [Promotions].[Promotion ID].Members ON ROWS
        FROM [Entreprise DW]
      ')
    `);
    console.log('✓ Query successful. Recordset length:', res.recordset.length);
    if (res.recordset.length > 0) {
      console.log('First row columns and data:');
      console.log(res.recordset[0]);
    }

    await pool.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
