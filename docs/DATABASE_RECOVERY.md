# Database migration and recovery

The durable character/campaign database defaults to `sqlite.db` or the path in `DATABASE_URL`.
Stop application writes before migration, backup, or restore operations.

## Safe migration sequence

1. Create a verified pre-migration backup:
   `npm run db:backup -- <database-path> <backup-path>`
2. Perform a restore drill against that backup:
   `npm run db:restore:verify -- <backup-path>`
3. Apply reviewed, checksummed migrations:
   `npm run db:migrate -- <database-path>`
4. Create and verify a post-migration backup.
5. Start the application. Startup also applies any pending reviewed migrations and refuses altered or
   unknown migration history.

Backup and restore commands refuse to overwrite files. Verification runs SQLite integrity and
foreign-key checks, checks every registered migration checksum, compares a logical row/content
manifest for every table, and verifies V3 aggregate checksums. Restore verification copies the backup
to a new temporary file, validates it, compares it with the backup, and removes the drill copy. It
never replaces the live database.

## Actual recovery

1. Stop the application and retain the damaged database unchanged for investigation.
2. Run `npm run db:restore:verify -- <backup-path>`.
3. Copy the verified backup to a **new** database path.
4. Set `DATABASE_URL` to that new path and run `npm run db:migrate -- <new-path>`.
5. Start the application against the new path and validate the five MOB characters before retiring
   the damaged database.

The older generic KV subsystem currently uses `data/party-stats.db`, separately from `sqlite.db`.
Until that state is retired or consolidated, back it up and restore-test it with the same commands as
a second database file.
