import { NextResponse } from 'next/server';
import { getPool } from '../../../../lib/db';
import { parseOlapNumber } from '../../../../lib/mdx';

const LINKED_SERVER_SETUP = `
-- If the linked server is missing, run this script in SSMS under a sysadmin login:
EXEC master.dbo.sp_addlinkedserver
    @server = N'SSAS_CUBE',
    @srvproduct = N'MSOLAP',
    @provider = N'MSOLAP',
    @datasrc = N'MEDAMIN\\SSAS2022',
    @catalog = N'CubeProject';

EXEC master.dbo.sp_addlinkedsrvlogin
    @rmtsrvname = N'SSAS_CUBE',
    @useself = N'TRUE';

EXEC sp_serveroption N'SSAS_CUBE', 'data access', 'true';
EXEC sp_serveroption N'SSAS_CUBE', 'rpc out', 'true';
`.trim();

export async function GET() {
  const linkedServer = process.env.SSAS_LINKED_SERVER || 'SSAS_CUBE';
  const cubeName = process.env.SSAS_CUBE_NAME || 'Entreprise DW';

  try {
    const pool = await getPool();

    // 1. Explicitly verify SQL Server connectivity first before querying SSAS
    await pool.request().query('SELECT 1 AS [online]');

    // 2. Query SSAS OLAP via OPENQUERY
    const tsql = `
      SELECT *
      FROM OPENQUERY(${linkedServer}, '
        SELECT {[Measures].[Line Total]} ON COLUMNS
        FROM [${cubeName}]
      ')
    `;

    const result = await pool.request().query(tsql);
    const row = result.recordset?.[0] ?? {};
    
    const rawColumns = Object.keys(row);
    const lineTotal = parseOlapNumber(Object.values(row)[0] as any);

    return NextResponse.json({
      ok: true,
      linkedServer,
      cube: cubeName,
      lineTotal,
      rawColumns,
      rawRow: row
    });
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error('[/api/health/olap] OLAP health check failed:', errorMsg);

    return NextResponse.json(
      {
        ok: false,
        linkedServer,
        cube: cubeName,
        error: errorMsg,
        setupScript: LINKED_SERVER_SETUP
      },
      { status: 500 }
    );
  }
}
