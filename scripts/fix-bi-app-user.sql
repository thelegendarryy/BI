-- ============================================================
-- SQL Windows Authentication Repair Script
-- File: scripts/fix-bi-app-user.sql
-- Run this in SSMS connected to the MEDAMIN instance under a sysadmin login
-- to map the Windows login [MEDAMIN\user] to [EntrepriseDW].
-- ============================================================

USE [master];
GO

-- 1. Create Windows Login [MEDAMIN\user] if missing
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'MEDAMIN\user')
BEGIN
    CREATE LOGIN [MEDAMIN\user] FROM WINDOWS WITH DEFAULT_DATABASE=[master];
    PRINT '✅ Created Windows login [MEDAMIN\user]';
END
ELSE
BEGIN
    PRINT '✅ Windows login [MEDAMIN\user] already exists';
END
GO

-- 2. Enable SQL login representation
ALTER LOGIN [MEDAMIN\user] ENABLE;
PRINT '✅ SQL Login [MEDAMIN\user] enabled.';
GO

-- 3. Map login to EntrepriseDW and grant db_datareader role
IF EXISTS (SELECT 1 FROM sys.databases WHERE name = N'EntrepriseDW')
BEGIN
    USE [EntrepriseDW];
    
    IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'MEDAMIN\user')
    BEGIN
        CREATE USER [MEDAMIN\user] FOR LOGIN [MEDAMIN\user];
        PRINT '✅ Created database user [MEDAMIN\user] in [EntrepriseDW].';
    END
    
    -- Grant db_datareader role
    ALTER ROLE [db_datareader] ADD MEMBER [MEDAMIN\user];
    PRINT '✅ Added [MEDAMIN\user] to db_datareader role in [EntrepriseDW].';
END
ELSE
BEGIN
    PRINT '❌ Database [EntrepriseDW] was not found! Cannot map user.';
END
GO

-- 4. Grant master DB access and CONNECT
USE [master];
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'MEDAMIN\user')
BEGIN
    CREATE USER [MEDAMIN\user] FOR LOGIN [MEDAMIN\user];
    PRINT '✅ Created database user [MEDAMIN\user] in [master].';
END

GRANT CONNECT SQL TO [MEDAMIN\user];
PRINT '✅ Granted master DB CONNECT privilege to [MEDAMIN\user].';
GO

-- 5. Ensure Linked Server login mapping for MEDAMIN\user on SSAS_CUBE uses Windows Identity passthrough
IF EXISTS (SELECT 1 FROM sys.servers WHERE name = N'SSAS_CUBE')
BEGIN
    -- Drop custom mappings for this login to avoid conflicts
    IF EXISTS (
        SELECT 1 
        FROM sys.linked_logins ll
        JOIN sys.servers s ON ll.server_id = s.server_id
        LEFT JOIN sys.server_principals sp ON ll.local_principal_id = sp.principal_id
        WHERE s.name = N'SSAS_CUBE' AND sp.name = N'MEDAMIN\user'
    )
    BEGIN
        EXEC sp_droplinkedsrvlogin @rmtsrvname = N'SSAS_CUBE', @locallogin = N'MEDAMIN\user';
        PRINT '✅ Dropped explicit mapping for [MEDAMIN\user].';
    END

    -- Set useself = TRUE so Windows credentials pass through natively to SSAS
    EXEC master.dbo.sp_addlinkedsrvlogin
        @rmtsrvname  = N'SSAS_CUBE',
        @useself     = N'TRUE',
        @locallogin  = N'MEDAMIN\user',
        @rmtuser     = NULL,
        @rmtpassword = NULL;
    PRINT '✅ Configured Windows passthrough mapping for [MEDAMIN\user] on linked server [SSAS_CUBE].';
END
ELSE
BEGIN
    PRINT '⚠️ Linked server [SSAS_CUBE] does not exist yet. Please create it first.';
END
GO
