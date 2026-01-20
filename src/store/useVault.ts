import { create } from 'zustand';
import { getDb } from '@/lib/db';

interface Member {
  id: string;
  name: string;
  role: string;
  totalSpent: number;
  createdAt: string;
}

interface Log {
  id: string;
  timestamp: string;
  type: 'EXPENSE' | 'INJECTION';
  context: string;
  value: number;
  memberId?: string;
}

interface Project {
  id: string;
  name: string;
  balance: number;
  members: Member[];
  logs: Log[];
}

interface VaultState {
  projects: Project[];
  activeProjectId: string | null;
  isLoading: boolean;
  isProcessing: boolean;
  fetchProjects: () => Promise<void>;
  setActiveProject: (id: string | null) => void;
  addProject: (name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addMember: (projectId: string, name: string, role: string) => Promise<void>;
  deleteMember: (projectId: string, memberId: string, refund: boolean) => Promise<void>;
  addExpense: (projectId: string, amount: number, context: string, memberId?: string) => Promise<void>;
  deleteLog: (projectId: string, logId: string) => Promise<void>; // Protokol Void
}

export const useVault = create<VaultState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  isLoading: false,
  isProcessing: false,

  fetchProjects: async () => {
    try {
      set({ isLoading: true });
      const db = await getDb();

      // Parallel fetch untuk kecepatan
      const [rawP, rawM, rawL] = await Promise.all([
        db.select("SELECT * FROM projects"),
        db.select("SELECT * FROM members"),
        db.select("SELECT * FROM logs ORDER BY timestamp DESC"),
      ]) as [any[], any[], any[]];

      const formatted = rawP.map((p) => ({
        id: p.id,
        name: p.name,
        balance: p.balance,
        members: rawM
          .filter((m) => m.project_id === p.id)
          .map((m) => ({
            id: m.id,
            name: m.name,
            role: m.role,
            totalSpent: m.total_spent,
            createdAt: m.created_at,
          })),
        logs: rawL
          .filter((l) => l.project_id === p.id)
          .map((l) => ({
            id: l.id,
            timestamp: l.timestamp,
            type: l.type,
            context: l.context,
            value: l.value,
            memberId: l.member_id,
          })),
      }));

      set({ projects: formatted, isLoading: false });

      const saved = localStorage.getItem('vault_active_id');
      if (saved && formatted.some((p) => p.id === saved)) {
        set({ activeProjectId: saved });
      }
    } catch (err) {
      console.error("FETCH_FAILED", err);
      set({ isLoading: false });
    }
  },

  setActiveProject: (id) => {
    if (id) {
      localStorage.setItem('vault_active_id', id);
    } else {
      localStorage.removeItem('vault_active_id');
    }
    set({ activeProjectId: id });
  },

  addProject: async (name) => {
    const db = await getDb();
    const id = crypto.randomUUID();
    await db.execute("INSERT INTO projects (id, name, balance) VALUES ($1, $2, $3)", [id, name, 0]);
    await get().fetchProjects();
    get().setActiveProject(id);
  },

  addMember: async (projectId, name, role) => {
    const db = await getDb();
    await db.execute(
      "INSERT INTO members (id, project_id, name, role, total_spent, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
      [crypto.randomUUID(), projectId, name, role, 0, new Date().toISOString()]
    );
    await get().fetchProjects();
  },

  // Versi paling aman & lengkap (dari base)
  addExpense: async (projectId, amount, context, memberId) => {
    if (get().isProcessing) return;
    set({ isProcessing: true });

    try {
      const db = await getDb();

      // Ambil data real-time
      const currentMembers: any[] = await db.select("SELECT id FROM members WHERE project_id = $1", [projectId]);
      const memberCount = currentMembers.length;
      const isExp = amount > 0;
      const now = new Date().toISOString();
      const logId = crypto.randomUUID();

      await db.execute("BEGIN TRANSACTION");

      // 1. Update balance project
      await db.execute("UPDATE projects SET balance = balance - $1 WHERE id = $2", [amount, projectId]);

      // 2. Update member spent (jika expense)
      if (isExp) {
        if (memberId) {
          // Direct expense
          await db.execute("UPDATE members SET total_spent = total_spent + $1 WHERE id = $2", [amount, memberId]);
        } else if (memberCount > 0) {
          // Shared expense
          const split = amount / memberCount;
          await db.execute("UPDATE members SET total_spent = total_spent + $1 WHERE project_id = $2", [split, projectId]);
        }
      }

      // 3. Catat log
      const logCtx = !memberId && isExp ? `${context} (SHARED_SPLIT)` : context;
      await db.execute(
        "INSERT INTO logs (id, project_id, member_id, timestamp, type, context, value) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [logId, projectId, memberId || null, now, isExp ? 'EXPENSE' : 'INJECTION', logCtx, -amount]
      );

      await db.execute("COMMIT");
      console.log("✓ Transaction_Secured");
    } catch (e) {
      const db = await getDb();
      await db.execute("ROLLBACK").catch(() => {});
      console.error("CRITICAL_TRANSACTION_FAILURE:", e);
    } finally {
      set({ isProcessing: false });
      await get().fetchProjects();
    }
  },

  // Protokol Void dari versi baru
  deleteLog: async (projectId, logId) => {
    if (get().isProcessing) return;
    set({ isProcessing: true });

    try {
      const db = await getDb();
      const logs: any[] = await db.select("SELECT * FROM logs WHERE id = $1 AND project_id = $2", [logId, projectId]);
      if (logs.length === 0) throw new Error("LOG_NOT_FOUND");

      const log = logs[0];

      await db.execute("BEGIN TRANSACTION");

      // 1. Reverse saldo project (karena value di log negatif, kita tambah balik)
      //    → balance + (-value) = balance - value (karena value sudah negatif)
      await db.execute("UPDATE projects SET balance = balance - $1 WHERE id = $2", [log.value, projectId]);

      // 2. Reverse member spent (hanya jika EXPENSE)
      if (log.type === 'EXPENSE') {
        if (log.member_id) {
          // Direct → kurangi total_spent member (karena sebelumnya ditambah)
          await db.execute("UPDATE members SET total_spent = total_spent + $1 WHERE id = $2", [log.value, log.member_id]);
        } else {
          // Shared → kurangi semua member
          const members: any[] = await db.select("SELECT id FROM members WHERE project_id = $1", [projectId]);
          if (members.length > 0) {
            const splitDiff = log.value / members.length; // value negatif → splitDiff negatif
            await db.execute("UPDATE members SET total_spent = total_spent + $1 WHERE project_id = $2", [splitDiff, projectId]);
          }
        }
      }

      // 3. Hapus log
      await db.execute("DELETE FROM logs WHERE id = $1", [logId]);

      await db.execute("COMMIT");
    } catch (e) {
      const db = await getDb();
      await db.execute("ROLLBACK").catch(() => {});
      console.error("VOID_FAILED:", e);
    } finally {
      set({ isProcessing: false });
      await get().fetchProjects();
    }
  },

  deleteMember: async (projectId, memberId, refund) => {
    if (get().isProcessing) return;
    set({ isProcessing: true });

    try {
      const db = await getDb();
      const members: any[] = await db.select("SELECT total_spent, name FROM members WHERE id = $1", [memberId]);
      if (members.length === 0) throw new Error("UNIT_NOT_FOUND");

      const m = members[0];
      const refundAmt = refund ? m.total_spent : 0;
      const now = new Date().toISOString();

      await db.execute("BEGIN TRANSACTION");

      await db.execute("UPDATE projects SET balance = balance + $1 WHERE id = $2", [refundAmt, projectId]);
      await db.execute("DELETE FROM members WHERE id = $1", [memberId]);

      await db.execute(
        "INSERT INTO logs (id, project_id, timestamp, type, context, value) VALUES ($1, $2, $3, $4, $5, $6)",
        [crypto.randomUUID(), projectId, now, 'INJECTION', `UNIT_DECOMMISSIONED: ${m.name}`, refundAmt]
      );

      await db.execute("COMMIT");
    } catch (e) {
      const db = await getDb();
      await db.execute("ROLLBACK").catch(() => {});
      console.error("DECOMMISSION_FAILED", e);
    } finally {
      set({ isProcessing: false });
      await get().fetchProjects();
    }
  },

  deleteProject: async (id) => {
    const db = await getDb();
    await db.execute("DELETE FROM projects WHERE id = $1", [id]);
    await get().fetchProjects();
    if (get().activeProjectId === id) {
      set({ activeProjectId: null });
    }
  },
}));