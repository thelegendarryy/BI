-- ============================================================
-- SQL Server Windows Authentication Diagnostic Script
-- File: scripts/check-sql-auth.sql
-- Run this in SSMS connected to the MEDAMIN instance
-- ============================================================

PRINT '============================================================';
PRINT 'SQL Server Windows Authentication Diagnostic Report';
PRINT '============================================================';
PRINT 'Report Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT 'Server Name: ' + @@SERVERNAME;
PRINT 'Current User: ' + SYSTEM_USER;
PRINT '============================================================';
GO

-- 1. SQL Server Authentication Mode
PRINT '';
PRINT '1. SQL Server Authentication Mode:';
PRINT '---------------------------------';
SELECT 
    CASE SERVERPROPERTY('IsIntegratedSecurityOnly')   
        WHEN 1 THEN '✅ Windows Authentication Mode Only (Windows Auth Only Mode Active)'   
        WHEN 0 THEN 'Mixed Authentication Mode (Windows & SQL Server)'   
    END AS [Authentication Mode];
GO

-- 2. Verify Windows Login [MEDAMIN\user] status
PRINT '';
PRINT '2. Windows Login [MEDAMIN\user] Status:';
PRINT '---------------------------------------';
IF EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'MEDAMIN\user')
BEGIN
    SELECT 
        name AS [Login Name], 
        type_desc AS [Login Type], 
        CASE is_disabled 
            WHEN 1 THEN '❌ Disabled' 
            WHEN 0 THEN '✅ Enabled' 
        END AS [Status],
        create_date AS [Creation Date], 
        modify_date AS [Last Modified]
    FROM sys.server_principals
    WHERE name = N'MEDAMIN\user';
END
ELSE
BEGIN
    PRINT '❌ Login [MEDAMIN\user] DOES NOT EXIST on this SQL Server instance.';
END
GO

-- 3. Verify access to EntrepriseDW and db_datareader role
PRINT '';
PRINT '3. Database Access and Roles in [EntrepriseDW]:';
PRINT '------------------------------------------------';
IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = 'EntrepriseDW')
BEGIN
    PRINT '❌ Database [EntrepriseDW] DOES NOT EXIST on this server.';
END
ELSE
BEGIN
    USE [EntrepriseDW];
    
    IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'MEDAMIN\user')
    BEGIN
        SELECT 
            dp.name AS [Database User],
            dp.type_desc AS [User Type],
            ISNULL(rp.name, '❌ NO ROLE ASSIGNED') AS [Database Role],
            CASE 
                WHEN rp.name = 'db_datareader' THEN '✅ Read Access Granted'
                ELSE '❌ No Read Access (Requires db_datareader)'
            END AS [Read Permission Status]
        FROM sys.database_principals dp
        LEFT JOIN sys.database_role_members drm ON dp.principal_id = drm.member_principal_id
        LEFT JOIN sys.database_principals rp ON drm.role_principal_id = rp.principal_id
        WHERE dp.name = N'MEDAMIN\user';
    END
    ELSE
    BEGIN
        PRINT '❌ Login [MEDAMIN\user] is NOT mapped as a user in database [EntrepriseDW].';
    END
END
GO

-- 4. Verify linked server 'SSAS_CUBE' existence and properties
USE [master];
PRINT '';
PRINT '4. Linked Server [SSAS_CUBE] Status:';
PRINT '-----------------------------------';
IF EXISTS (SELECT 1 FROM sys.servers WHERE name = 'SSAS_CUBE')
BEGIN
    SELECT 
        name AS [Linked Server],
        product AS [Product],
        provider AS [Provider],
        data_source AS [Data Source (SSAS Instance)],
        catalog AS [Catalog (SSAS Database)]
    FROM sys.servers
    WHERE name = 'SSAS_CUBE';
    
    -- Check linked server logins for MEDAMIN\user
    PRINT '';
    PRINT 'Linked Server Login Mapping for [MEDAMIN\user]:';
    SELECT 
        s.name AS [Linked Server],
        sp.name AS [Local Login],
        ll.remote_name AS [Remote Login],
        CASE ll.uses_self_credential
            WHEN 1 THEN '✅ Yes (uses local Windows identity)'
            WHEN 0 THEN 'No (explicit mapping/guest)'
        END AS [Uses Self]
    FROM sys.servers s
    JOIN sys.linked_logins ll ON s.server_id = ll.server_id
    LEFT JOIN sys.server_principals sp ON ll.local_principal_id = sp.principal_id
    WHERE s.name = 'SSAS_CUBE' AND (sp.name = N'MEDAMIN\user' OR ll.local_principal_id = 0);
END
ELSE
BEGIN
    PRINT '❌ Linked Server [SSAS_CUBE] DOES NOT EXIST.';
END
GO
