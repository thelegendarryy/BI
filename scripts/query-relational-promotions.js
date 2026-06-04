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
    
    // Promotions row count
    const res1 = await pool.request().query('SELECT COUNT(*) AS cnt FROM Promotions');
    console.log('Promotions table row count:', res1.recordset[0].cnt);
    
    // Select all from Promotions
    const res2 = await pool.request().query('SELECT * FROM Promotions');
    console.log('Promotions list:');
    console.table(res2.recordset);
    
    // Distinct PromotionID in FactSales
    const res3 = await pool.request().query('SELECT PromotionID, COUNT(*) AS count FROM FactSales GROUP BY PromotionID');
    console.log('Distinct PromotionID count in FactSales:');
    console.table(res3.recordset);
    
    await pool.close();
  } catch (err) {
    console.error(err);
  }
}
main();
