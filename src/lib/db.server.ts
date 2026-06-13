import notionSeed from "./notion-cache-seed.json";

let DatabaseSync: any;
let fs: any;
let path: any;
let dbInstance: any;

// A high-fidelity in-memory Mock Database for platforms that use 'unenv' or don't support SQLite
class MockDatabase {
  kv = new Map<string, { value: string; updated_at: number }>();
  sessions = new Map<string, { expires_at: number }>();

  exec(sql: string) {
    // No-op for mock DB setup
  }

  prepare(sql: string) {
    const trimmed = sql.trim().replace(/\s+/g, ' ');
    const self = this;

    // 1. SELECT value FROM kv_store WHERE key = ?
    if (trimmed.includes("SELECT value FROM kv_store WHERE key = ?")) {
      return {
        get: (key: string) => {
          const row = self.kv.get(key);
          return row ? { value: row.value } : undefined;
        }
      };
    }

    // 2. INSERT INTO kv_store
    if (trimmed.includes("INSERT INTO kv_store")) {
      return {
        run: (key: string, value: string, updatedAt: number) => {
          self.kv.set(key, { value, updated_at: updatedAt });
        }
      };
    }

    // 3. DELETE FROM kv_store WHERE key = ?
    if (trimmed.includes("DELETE FROM kv_store WHERE key = ?")) {
      return {
        run: (key: string) => {
          self.kv.delete(key);
        }
      };
    }

    // 4. SELECT key, value FROM kv_store WHERE key LIKE ?
    if (trimmed.includes("SELECT key, value FROM kv_store WHERE key LIKE ?")) {
      return {
        all: (prefix: string) => {
          const prefixClean = prefix.replace('%', '');
          const results: Array<{ key: string; value: string }> = [];
          for (const [k, v] of self.kv.entries()) {
            if (k.startsWith(prefixClean)) {
              results.push({ key: k, value: v.value });
            }
          }
          return results;
        }
      };
    }

    // 5. SELECT key, value FROM kv_store
    if (trimmed.includes("SELECT key, value FROM kv_store")) {
      return {
        all: () => {
          const results: Array<{ key: string; value: string }> = [];
          for (const [k, v] of self.kv.entries()) {
            results.push({ key: k, value: v.value });
          }
          return results;
        }
      };
    }

    // 6. INSERT INTO sessions (id, expires_at)
    if (trimmed.includes("INSERT INTO sessions")) {
      return {
        run: (id: string, expiresAt: number) => {
          self.sessions.set(id, { expires_at: expiresAt });
        }
      };
    }

    // 7. SELECT expires_at FROM sessions WHERE id = ?
    if (trimmed.includes("SELECT expires_at FROM sessions WHERE id = ?")) {
      return {
        get: (id: string) => {
          const row = self.sessions.get(id);
          return row ? { expires_at: row.expires_at } : undefined;
        }
      };
    }

    // 8. DELETE FROM sessions WHERE id = ?
    if (trimmed.includes("DELETE FROM sessions WHERE id = ?")) {
      return {
        run: (id: string) => {
          self.sessions.delete(id);
        }
      };
    }

    // 9. DELETE FROM sessions WHERE expires_at < ?
    if (trimmed.includes("DELETE FROM sessions WHERE expires_at < ?")) {
      return {
        run: (now: number) => {
          for (const [id, s] of self.sessions.entries()) {
            if (s.expires_at < now) {
              self.sessions.delete(id);
            }
          }
        }
      };
    }

    // Fallback Mock Statement
    return {
      get: () => undefined,
      run: () => {},
      all: () => []
    };
  }
}

// Helper to initialize database dynamically on server context only
async function initDb() {
  if (dbInstance) return dbInstance;

  const globalForDb = globalThis as unknown as {
    dbInstance: any;
  };

  if (globalForDb.dbInstance) {
    dbInstance = globalForDb.dbInstance;
    return dbInstance;
  }

  // 1. Try importing standard node:sqlite dynamically
  let sqliteModule: any = null;
  let fsModule: any = null;
  let pathModule: any = null;

  try {
    sqliteModule = await import("node:sqlite");
    fsModule = await import("node:fs");
    pathModule = await import("node:path");

    DatabaseSync = sqliteModule.DatabaseSync;
    fs = fsModule.default || fsModule;
    path = pathModule.default || pathModule;
    
    if (!DatabaseSync) {
      throw new Error("DatabaseSync is undefined in node:sqlite");
    }
  } catch (importError) {
    console.warn("node:sqlite is not supported on this platform. Falling back to in-memory store. Error:", importError);
    dbInstance = new MockDatabase();
    globalForDb.dbInstance = dbInstance;
    return dbInstance;
  }

  // 2. Try instantiating DatabaseSync at default path
  let dbPath = "";
  try {
    const dbDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    dbPath = path.join(dbDir, "party-stats.db");

    dbInstance = new DatabaseSync(dbPath);
    dbInstance.exec("CREATE TABLE IF NOT EXISTS __write_test (id INTEGER PRIMARY KEY); DROP TABLE __write_test;");
    console.log("Database initialized successfully at default path:", dbPath);
  } catch (error) {
    const errStr = String(error);
    if (errStr.includes("not implemented") || errStr.includes("is not a constructor")) {
      console.warn("node:sqlite is a mock (unenv). Falling back to in-memory store.");
      dbInstance = new MockDatabase();
      globalForDb.dbInstance = dbInstance;
      return dbInstance;
    }

    console.warn("Failed to initialize database at default path, attempting temp fallback. Error:", error);
    try {
      const tempDir = process.env.TEMP || process.env.TMP || "/tmp";
      const tempDbPath = path.join(tempDir, "party-stats.db");

      dbInstance = new DatabaseSync(tempDbPath);
      dbInstance.exec("CREATE TABLE IF NOT EXISTS __write_test (id INTEGER PRIMARY KEY); DROP TABLE __write_test;");
      dbPath = tempDbPath;
      console.log("Database initialized successfully at temp path:", dbPath);
    } catch (tempError) {
      const tempErrStr = String(tempError);
      if (tempErrStr.includes("not implemented") || tempErrStr.includes("is not a constructor")) {
        console.warn("DatabaseSync temp fallback threw unenv error. Falling back to in-memory store.");
      } else {
        console.warn("Failed to initialize database in both paths. Falling back to in-memory store. Error:", tempError);
      }
      dbInstance = new MockDatabase();
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
  if (row) return row.value;

  if (key.startsWith("notion:") && (notionSeed as Record<string, string>)[key]) {
    return (notionSeed as Record<string, string>)[key];
  }
  return null;
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

  if (prefix.startsWith("notion")) {
    for (const [k, v] of Object.entries(notionSeed)) {
      if (k.startsWith(prefix) && !result[k]) {
        result[k] = v;
      }
    }
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
