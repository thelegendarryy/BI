const sql = require('mssql/msnodesqlv8');

const INSTANCES = [
  'MEDAMIN',
  'localhost',
  '(local)',
  'MEDAMIN\\SQLEXPRESS',
  'localhost\\SQLEXPRESS',
  '.\\SQLEXPRESS'
];

async function tryConnect(server) {
  const database = 'EntrepriseDW';
  const connectionString = `Driver={ODBC Driver 17 for SQL Server};Server=${server};Database=${database};Trusted_Connection=yes;`;
  console.log(`Trying server: "${server}"...`);
  
  const config = {
    connectionString,
    connectionTimeout: 4000,
    requestTimeout: 4000
  };
  
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log(`  ✓ SUCCESS for server: "${server}"`);
    const res = await pool.request().query('SELECT @@SERVERNAME as srv, SYSTEM_USER as usr');
    console.log(`  Server details:`, res.recordset[0]);
    
    // Check if there is an SSAS linked server
    try {
      const servers = await pool.request().query(`
        SELECT name, product, provider, data_source, catalog 
        FROM sys.servers
      `);
      console.log(`  Linked servers:`);
      console.table(servers.recordset);
    } catch (e) {
      console.log(`  Could not fetch linked servers:`, e.message);
    }
    
    await pool.close();
    return true;
  } catch (err) {
    console.log(`  ✗ FAILED for server: "${server}" - ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('Starting multi-instance SQL Server connection diagnostics...');
  for (const inst of INSTANCES) {
    const success = await tryConnect(inst);
    if (success) {
      console.log(`\nFound working instance: "${inst}"!`);
      break;
    }
  }
  console.log('Diagnostics finished.');
}

main();
