import Database from "@tauri-apps/plugin-sql";

const DB_NAME = "sqlite:vaulthk.db";
let initPromise: Promise<Database> | null = null;

export const initDatabase = async () => {
  const db = await Database.load(DB_NAME);

  // Skema Tabel dengan created_at [Image of SQLite table schema with columns id, project_id, name, role, total_spent, and created_at]
  await db.execute(`CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, balance REAL DEFAULT 0);`);
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
  await db.execute(`CREATE TABLE IF NOT EXISTS logs (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, member_id TEXT, timestamp TEXT NOT NULL, type TEXT NOT NULL, context TEXT NOT NULL, value REAL NOT NULL, FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE);`);

  // Migrasi dari baseline lama
  const oldStorage = localStorage.getItem('vault-multi-project-storage');
  if (oldStorage) {
    const parsed = JSON.parse(oldStorage);
    const projects = parsed.state?.projects || [];
    await db.execute("BEGIN IMMEDIATE TRANSACTION");
    try {
      for (const p of projects) {
        await db.execute("INSERT OR REPLACE INTO projects (id, name, balance) VALUES ($1, $2, $3)", [p.id, p.name, p.balance]);
        for (const m of p.members) {
          await db.execute("INSERT OR REPLACE INTO members (id, project_id, name, role, total_spent, created_at) VALUES ($1, $2, $3, $4, $5, $6)", 
            [m.id, p.id, m.name, m.role, m.totalSpent, new Date().toISOString()]);
        }
        for (const l of p.logs) {
          await db.execute("INSERT OR REPLACE INTO logs (id, project_id, member_id, timestamp, type, context, value) VALUES ($1, $2, $3, $4, $5, $6, $7)", 
            [l.id, p.id, l.memberId || null, l.timestamp, l.type, l.context, l.value]);
        }
      }
      await db.execute("COMMIT");
      localStorage.removeItem('vault-multi-project-storage');
    } catch (e) { await db.execute("ROLLBACK"); }
  }
  return db;
};

export const getDb = async () => {
  if (initPromise) return initPromise;
  initPromise = initDatabase();
  return initPromise;
};