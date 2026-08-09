# Database Deployment

The SQL Server database is managed with ordered, rerunnable migrations in
`database/migrations`.

## Migration Rules

1. Treat the current database schema as the baseline. Do not replay old root-level SQL files.
2. Add one migration for each schema or programmable-object change.
3. Name migrations `YYYYMMDD_NNN_description.sql`.
4. Make migrations rerunnable with `IF EXISTS`, `IF NOT EXISTS`, and `CREATE OR ALTER`.
5. Record each applied migration in `dbo.ims_schema_migrations`.
6. Test migrations locally with `sqlcmd -b` before production deployment.
7. Take a native SQL Server `.bak` backup before applying production migrations.

## Apply A Migration

Run from the repository root using Windows authentication:

```powershell
sqlcmd -S localhost,1433 -E -f 65001 -b -V 16 -i "database\migrations\20260731_001_restore_schema_compatibility.sql"
```

For SQL authentication, use environment-specific credentials at execution time. Do not store
passwords in migration files or scripts.

## Verify

Check migration history:

```sql
SELECT migration_id, description, applied_at
FROM dbo.ims_schema_migrations
ORDER BY applied_at;
```

Run database integrity validation after restore or deployment:

```sql
DBCC CHECKDB (N'InventoryManagementDB') WITH NO_INFOMSGS, ALL_ERRORMSGS;
```

## Recovery Baseline

`Local-DBBackup-31-07-2026.sql` is a schema-only generated script. It contains no table data,
so it cannot recover users, roles, inventory, requests, or transaction history. Use native full
database backups (`.bak`) for future recoveries and retain the generated SQL script only as a
schema reference.

Do not run `create-clean-inventory-database-schema.sql` or
`IMS-DB-DEPLOY-ALL-OBJECTS.sql` against a restored or production database without first
reconciling them with the live schema.