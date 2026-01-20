import Database from "@tauri-apps/plugin-sql";

const DB_NAME = "sqlite:vaulthk.db";
let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;

export const initDatabase = async (): Promise<Database> => {
  if (dbInstance) return dbInstance;

  const db = await Database.load(DB_NAME);

  // ───────────────────────────────────────────────
  //  Migration-friendly pattern + versi tabel
  // ───────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );
  `);

  // Cek versi saat ini (default 0 jika belum ada)
  const versionRow = await db.select<{ version: number }[]>(
    "SELECT version FROM schema_version LIMIT 1"
  );
  let currentVersion = versionRow.length > 0 ? versionRow[0].version : 0;

  // ── Migration step-by-step ───────────────────────
  if (currentVersion < 1) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        balance     REAL NOT NULL DEFAULT 0,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS members (
        id          TEXT PRIMARY KEY,
        project_id  TEXT NOT NULL,
        name        TEXT NOT NULL,
        role        TEXT NOT NULL DEFAULT 'Crew',
        total_spent REAL NOT NULL DEFAULT 0,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS logs (
        id          TEXT PRIMARY KEY,
        project_id  TEXT NOT NULL,
        member_id   TEXT,                           -- NULL = shared expense/injection
        timestamp   TEXT NOT NULL DEFAULT (datetime('now')),
        type        TEXT NOT NULL CHECK(type IN ('INJECTION', 'EXPENSE', 'VOID', 'DECOMMISSION')),
        context     TEXT NOT NULL,
        value       REAL NOT NULL,                  -- positif = injection, negatif = expense
        created_by  TEXT,                           -- optional: bisa simpan user/id jika multi-user nanti
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (member_id)   REFERENCES members(id)   ON DELETE SET NULL
      );
    `);

    // Trigger untuk auto update updated_at
    await db.execute(`
      CREATE TRIGGER IF NOT EXISTS projects_update_timestamp
      AFTER UPDATE ON projects
      FOR EACH ROW
      BEGIN
        UPDATE projects SET updated_at = datetime('now') WHERE id = OLD.id;
      END;
    `);

    await db.execute("INSERT OR REPLACE INTO schema_version (version) VALUES (1)");
    currentVersion = 1;
  }

  // ── Migration v2, v3, dst bisa ditambah di sini nanti ──
  // if (currentVersion < 2) { ... }

  dbInstance = db;
  console.log(`✓ Vault Database ready (schema v${currentVersion})`);
  return db;
};

export const getDb = async (): Promise<Database> => {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = initDatabase().then((db) => {
    initPromise = null;
    return db;
  }).catch((err) => {
    initPromise = null;
    throw err;
  });

  return initPromise;
};

// Optional: helper untuk reset DB saat development/debug
export const resetDatabase = async () => {
  const db = await getDb();
  await db.execute("DROP TABLE IF EXISTS logs");
  await db.execute("DROP TABLE IF EXISTS members");
  await db.execute("DROP TABLE IF EXISTS projects");
  await db.execute("DROP TABLE IF EXISTS schema_version");
  dbInstance = null;
  console.warn("⚠️ Database telah di-reset. Panggil initDatabase lagi jika perlu.");
};