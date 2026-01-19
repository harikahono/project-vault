import Database from "@tauri-apps/plugin-sql";

const DB_NAME = "sqlite:vaulthk.db";
let initPromise: Promise<Database> | null = null;

export const initDatabase = async () => {
  const db = await Database.load(DB_NAME);

  // 1. SKEMA CORE: Tabel Projek
  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY, 
      name TEXT NOT NULL, 
      balance REAL DEFAULT 0
    );
  `);

  // 2. SKEMA UNIT: Tabel Member dengan Akte Kelahiran (created_at)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY, 
      project_id TEXT NOT NULL, 
      name TEXT NOT NULL, 
      role TEXT NOT NULL, 
      total_spent REAL DEFAULT 0, 
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, 
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    );
  `);

  // 3. SKEMA LEDGER: Tabel Log Transaksi
  await db.execute(`
    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY, 
      project_id TEXT NOT NULL, 
      member_id TEXT, 
      timestamp TEXT NOT NULL, 
      type TEXT NOT NULL, 
      context TEXT NOT NULL, 
      value REAL NOT NULL, 
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    );
  `);

  console.log("✓ Vault_Database_Operational: SQLite is now the sole source of truth.");
  return db;
};

export const getDb = async () => {
  if (initPromise) return initPromise;
  initPromise = initDatabase();
  return initPromise;
};