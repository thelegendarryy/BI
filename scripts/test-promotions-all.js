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
    console.table(res.recordset);
    await pool.close();
  } catch (err) {
    console.error(err);
  }
}
main();
