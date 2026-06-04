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
      requestTimeout: 8000 // low request timeout
    });
    await pool.connect();
    console.log('✓ Connected to SQL Server.');

    console.log('Querying SSAS via OPENQUERY...');
    const res = await pool.request().query(`
      SELECT * FROM OPENQUERY(SSAS_CUBE, '
        SELECT
          [Measures].[Line Total] ON COLUMNS
        FROM [Entreprise DW]
      ')
    `);
    console.log('✓ SSAS query successful!');
    console.table(res.recordset);

    await pool.close();
  } catch (err) {
    console.error('✗ SSAS query failed or timed out:', err.message);
  }
}

main();
