-- ============================================================
-- SSAS Linked Server Setup Script
-- File: setup-ssas-linked-server.sql
-- Run this in SSMS against your SQL Server 2022 instance
-- BEFORE starting the Next.js application.
-- ============================================================

-- ============================================================
-- STEP 1: Drop existing linked server (if re-running this script)
-- ============================================================
IF EXISTS (SELECT 1 FROM sys.servers WHERE name = N'SSAS_CUBE')
BEGIN
    EXEC sp_dropserver N'SSAS_CUBE', 'droplogins';
    PRINT 'Dropped existing SSAS_CUBE linked server.';
END

-- ============================================================
-- STEP 2: Create the linked server pointing to SSAS
-- ============================================================
EXEC sp_addlinkedserver
    @server     = N'SSAS_CUBE',           -- Linked server name (used in OPENQUERY calls)
    @srvproduct = N'MSOLAP',              -- OLE DB provider product name for SSAS
    @provider   = N'MSOLAP',             -- OLE DB provider (MSOLAP = Analysis Services)
    @datasrc    = N'MEDAMIN\SSAS2022',   -- SSAS instance (SERVER\INSTANCE format)
    @catalog    = N'CubeProject';        -- SSAS database/catalog name

PRINT 'Linked server SSAS_CUBE created.';

-- ============================================================
-- STEP 3: Configure linked server options
-- ============================================================
-- Allow remote connections (required for OPENQUERY)
EXEC sp_serveroption N'SSAS_CUBE', 'rpc out', 'true';
-- Allow ad-hoc distributed queries
EXEC sp_serveroption N'SSAS_CUBE', 'data access', 'true';

-- ============================================================
-- STEP 4: Map login (Windows Auth passthrough)
-- Use Windows identity passthrough — no separate credentials needed.
-- ============================================================
EXEC sp_addlinkedsrvlogin
    @rmtsrvname  = N'SSAS_CUBE',
    @useself     = N'TRUE';   -- Pass current Windows login to SSAS

PRINT 'Login mapping configured for SSAS_CUBE.';

-- ============================================================
-- STEP 5: Enable Ad Hoc Distributed Queries (if not already on)
-- Required for OPENQUERY to work.
-- ============================================================
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
EXEC sp_configure 'Ad Hoc Distributed Queries', 1;
RECONFIGURE;

PRINT 'Ad Hoc Distributed Queries enabled.';

-- ============================================================
-- STEP 6: Verify linked server was created
-- ============================================================
SELECT
    s.name         AS LinkedServerName,
    s.product      AS Product,
    s.provider     AS Provider,
    s.data_source  AS DataSource,
    s.catalog       AS Catalog
FROM sys.servers s
WHERE s.name = N'SSAS_CUBE';

-- ============================================================
-- STEP 7: Test basic MDX connectivity
-- This should return a single numeric value for [Line Total].
-- If it works, the app can connect to SSAS successfully.
-- ============================================================
PRINT 'Testing MDX query via OPENQUERY...';

SELECT * FROM OPENQUERY(SSAS_CUBE,
'
SELECT
  [Measures].[Line Total] ON COLUMNS
FROM [Entreprise DW]
');

-- ============================================================
-- STEP 8: Test a dimension slice (Products)
-- ============================================================
PRINT 'Testing Products dimension slice...';

SELECT TOP 10 * FROM OPENQUERY(SSAS_CUBE,
'
SELECT
  [Measures].[Line Total] ON COLUMNS,
  NON EMPTY
    TOPCOUNT(
      [Products].[Product Name].Members,
      10,
      [Measures].[Line Total]
    )
  ON ROWS
FROM [Entreprise DW]
');

-- ============================================================
-- STEP 9: Test Employees dimension slice
-- ============================================================
PRINT 'Testing Employees dimension slice...';

SELECT * FROM OPENQUERY(SSAS_CUBE,
'
SELECT
  {
    [Measures].[Line Total],
    [Measures].[Quantity]
  } ON COLUMNS,
  NON EMPTY
    ORDER(
      [Employees].[Employee Name].Members,
      [Measures].[Line Total],
      BDESC
    )
  ON ROWS
FROM [Entreprise DW]
');

-- ============================================================
-- STEP 10: Test Brands dimension slice
-- ============================================================
PRINT 'Testing Brands dimension slice...';

SELECT * FROM OPENQUERY(SSAS_CUBE,
'
SELECT
  [Measures].[Line Total] ON COLUMNS,
  NON EMPTY
    [Brands].[Brand Name].Members
  ON ROWS
FROM [Entreprise DW]
');

-- ============================================================
-- NOTE: Column name discovery
-- After running a query, check the column names in the result set.
-- SSAS OPENQUERY column names depend on the cube schema.
-- Common formats:
--   [DimensionName].[AttributeName].[AttributeName].[MEMBER_CAPTION]
--   [DimensionName].[AttributeName].[MEMBER_CAPTION]
--   Simple string: "AttributeName"
--
-- If column names differ from what the API routes expect,
-- update the parseOlapNumber() calls in each route.ts file accordingly.
-- ============================================================
PRINT 'Setup complete. Check column names in results above.';
