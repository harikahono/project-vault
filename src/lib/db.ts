import Database from "@tauri-apps/plugin-sql";

const DB_NAME = "sqlite:vaulthk.db";
let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;

export const initDatabase = async (): Promise<Database> => {
  if (dbInstance) return dbInstance;

  const db = await Database.load(DB_NAME);

  await db.execute("PRAGMA journal_mode = WAL;");
  await db.execute("PRAGMA busy_timeout = 5000;");
  await db.execute("PRAGMA foreign_keys = ON;");

  // ───────────────────────────────────────────────
  // Migration-friendly pattern + versi tabel
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
    // Tabel projects
    await db.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        balance     REAL NOT NULL DEFAULT 0,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Tabel members
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

    // Tabel logs + kolom baru participant_count
    await db.execute(`
      CREATE TABLE IF NOT EXISTS logs (
        id                TEXT PRIMARY KEY,
        project_id        TEXT NOT NULL,
        member_id         TEXT,                           -- NULL = shared expense/injection
        timestamp         TEXT NOT NULL DEFAULT (datetime('now')),
        type              TEXT NOT NULL CHECK(type IN ('INJECTION', 'EXPENSE', 'VOID', 'DECOMMISSION')),
        context           TEXT NOT NULL,
        value             REAL NOT NULL,                  -- positif = injection, negatif = expense
        participant_count INTEGER DEFAULT 1,              -- Jumlah member saat transaksi shared (untuk reverse void akurat)
        created_by        TEXT,                           -- optional: user ID jika multi-user nanti
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (member_id)   REFERENCES members(id)   ON DELETE SET NULL
      );
    `);

    // Trigger auto update updated_at pada projects
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

  // ── Migration v2: Tambah participant_count jika belum ada (untuk DB lama) ──
  if (currentVersion < 2) {
    try {
      // Cek apakah kolom sudah ada
      const columns = await db.select<{ name: string }[]>(
        "PRAGMA table_info(logs)"
      );
      const hasParticipantCount = columns.some(col => col.name === 'participant_count');

      if (!hasParticipantCount) {
        console.log("Menambahkan kolom participant_count ke tabel logs...");
        await db.execute("ALTER TABLE logs ADD COLUMN participant_count INTEGER DEFAULT 1");
      }

      await db.execute("INSERT OR REPLACE INTO schema_version (version) VALUES (2)");
      currentVersion = 2;
      console.log("Migration v2 selesai: participant_count ditambahkan");
    } catch (err) {
      console.error("Gagal migrasi v2:", err);
    }
  }

  // ── Migration v3, dst bisa ditambah di sini nanti ──
  // if (currentVersion < 3) { ... }

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

// Optional: helper reset DB untuk development/debug
export const resetDatabase = async () => {
  const db = await getDb();
  await db.execute("DROP TABLE IF EXISTS logs");
  await db.execute("DROP TABLE IF EXISTS members");
  await db.execute("DROP TABLE IF EXISTS projects");
  await db.execute("DROP TABLE IF EXISTS schema_version");
  dbInstance = null;
  console.warn("⚠️ Database telah di-reset. Panggil initDatabase lagi jika perlu.");
};