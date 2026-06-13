let DatabaseSync: any;
let fs: any;
let path: any;
let dbInstance: any;

// Helper to initialize database dynamically on server context only
async function initDb() {
  if (dbInstance) return dbInstance;

  const sqliteModule = await import("node:sqlite");
  const fsModule = await import("node:fs");
  const pathModule = await import("node:path");

  DatabaseSync = sqliteModule.DatabaseSync;
  fs = fsModule.default || fsModule;
  path = pathModule.default || pathModule;

  const globalForDb = globalThis as unknown as {
    dbInstance: any;
  };

  if (globalForDb.dbInstance) {
    dbInstance = globalForDb.dbInstance;
    return dbInstance;
  }

  let dbPath = "";
  try {
    const dbDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    dbPath = path.join(dbDir, "party-stats.db");
    
    // Attempt to open and write to verify permissions
    dbInstance = new DatabaseSync(dbPath);
    dbInstance.exec("CREATE TABLE IF NOT EXISTS __write_test (id INTEGER PRIMARY KEY); DROP TABLE __write_test;");
    console.log("Database initialized successfully at default path:", dbPath);
  } catch (error) {
    console.warn("Failed to initialize database at default path, attempting temp fallback. Error:", error);
    try {
      const tempDir = process.env.TEMP || process.env.TMP || "/tmp";
      const tempDbPath = path.join(tempDir, "party-stats.db");
      
      dbInstance = new DatabaseSync(tempDbPath);
      dbInstance.exec("CREATE TABLE IF NOT EXISTS __write_test (id INTEGER PRIMARY KEY); DROP TABLE __write_test;");
      dbPath = tempDbPath;
      console.log("Database initialized successfully at temp path:", dbPath);
    } catch (tempError) {
      console.error("Critical: Failed to initialize database in both default and temp path:", tempError);
      throw tempError;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    globalForDb.dbInstance = dbInstance;
  }

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL
    );
  `);

  return dbInstance;
}

export async function getKv(key: string): Promise<string | null> {
  const db = await initDb();
  const stmt = db.prepare("SELECT value FROM kv_store WHERE key = ?");
  const row = stmt.get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

export async function setKv(key: string, value: string): Promise<void> {
  const db = await initDb();
  const stmt = db.prepare(`
    INSERT INTO kv_store (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `);
  stmt.run(key, value, Date.now());
}

export async function deleteKv(key: string): Promise<void> {
  const db = await initDb();
  const stmt = db.prepare("DELETE FROM kv_store WHERE key = ?");
  stmt.run(key);
}

export async function getAllKv(): Promise<Record<string, string>> {
  const db = await initDb();
  const stmt = db.prepare("SELECT key, value FROM kv_store");
  const rows = stmt.all() as Array<{ key: string; value: string }>;
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export async function getKvWithPrefix(prefix: string): Promise<Record<string, string>> {
  const db = await initDb();
  const stmt = db.prepare("SELECT key, value FROM kv_store WHERE key LIKE ?");
  const rows = stmt.all(`${prefix}%`) as Array<{ key: string; value: string }>;
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export async function createSession(id: string, expiresAt: number): Promise<void> {
  await cleanExpiredSessions();
  const db = await initDb();
  const stmt = db.prepare("INSERT INTO sessions (id, expires_at) VALUES (?, ?)");
  stmt.run(id, expiresAt);
}

export async function isSessionValid(id: string): Promise<boolean> {
  const db = await initDb();
  const stmt = db.prepare("SELECT expires_at FROM sessions WHERE id = ?");
  const row = stmt.get(id) as { expires_at: number } | undefined;
  if (!row) return false;

  if (Date.now() > row.expires_at) {
    await deleteSession(id);
    return false;
  }
  return true;
}

export async function deleteSession(id: string): Promise<void> {
  const db = await initDb();
  const stmt = db.prepare("DELETE FROM sessions WHERE id = ?");
  stmt.run(id);
}

export async function cleanExpiredSessions(): Promise<void> {
  const db = await initDb();
  const stmt = db.prepare("DELETE FROM sessions WHERE expires_at < ?");
  stmt.run(Date.now());
}
