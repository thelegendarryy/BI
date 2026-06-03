import { NextResponse } from 'next/server';
import { getPool } from '../../../../lib/db';

export async function GET() {
  const server = process.env.SQL_SERVER || '';
  const database = process.env.SQL_DATABASE || '';
  const authMode = 'Windows Authentication (msnodesqlv8)';

  try {
    const pool = await getPool();

    // Query to verify SYSTEM_USER, DB_NAME and linked server SSAS_CUBE existence
    const result = await pool.request().query<{ sysUser: string; db: string; ssasCubeExists: number }>(
      `SELECT 
         SYSTEM_USER AS [sysUser], 
         DB_NAME() AS [db],
         (SELECT COUNT(*) FROM sys.servers WHERE name = 'SSAS_CUBE') AS [ssasCubeExists]`
    );

    const row = result.recordset[0];
    const systemUser = row?.sysUser ?? 'unknown';
    const dbName = row?.db ?? 'unknown';
    const hasLinkedServer = row?.ssasCubeExists > 0;

    return NextResponse.json({
      ok: true,
      server,
      database: dbName,
      authMode,
      systemUser,
      linkedServerExists: hasLinkedServer,
      message: 'SQL Server connection is healthy and verified.'
    });
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error('[/api/health/sql] SQL health check failed:', errorMsg);
    
    return NextResponse.json(
      {
        ok: false,
        server,
        database,
        authMode,
        error: errorMsg
      },
      { status: 500 }
    );
  }
}
