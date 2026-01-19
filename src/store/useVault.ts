import { create } from 'zustand';
import { getDb } from '@/lib/db';

interface Member { 
  id: string; 
  name: string; 
  role: string; 
  totalSpent: number; 
  createdAt: string; // Tambahkan field ini
}

interface Log { id: string; timestamp: string; type: 'EXPENSE' | 'INJECTION'; context: string; value: number; memberId?: string; }
interface Project { id: string; name: string; balance: number; members: Member[]; logs: Log[]; }

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
      
      const rawP: any[] = await db.select("SELECT * FROM projects");
      const rawM: any[] = await db.select("SELECT * FROM members");
      const rawL: any[] = await db.select("SELECT * FROM logs ORDER BY timestamp DESC");

      const formatted: Project[] = rawP.map(p => ({
        id: p.id, name: p.name, balance: p.balance,
        members: rawM.filter(m => m.project_id === p.id).map(m => ({ 
          id: m.id, name: m.name, role: m.role, 
          totalSpent: m.total_spent, // Fix Mapping Burn
          createdAt: m.created_at   // Akte kelahiran unit
        })),
        logs: rawL.filter(l => l.project_id === p.id).map(l => ({ 
          id: l.id, timestamp: l.timestamp, type: l.type, context: l.context, value: l.value, memberId: l.member_id 
        }))
      }));
      
      set({ projects: formatted, isLoading: false });
      const saved = localStorage.getItem('vault_active_id');
      if (saved && formatted.some(p => p.id === saved)) set({ activeProjectId: saved });
    } catch (err) { set({ isLoading: false }); }
  },

  setActiveProject: (id) => {
    id ? localStorage.setItem('vault_active_id', id) : localStorage.removeItem('vault_active_id');
    set({ activeProjectId: id });
  },

  addProject: async (name) => {
    const db = await getDb();
    const id = crypto.randomUUID();
    await db.execute("INSERT OR REPLACE INTO projects (id, name, balance) VALUES ($1, $2, $3)", [id, name, 0]);
    await get().fetchProjects();
    get().setActiveProject(id);
  },

  addMember: async (projectId, name, role) => {
    const db = await getDb();
    const now = new Date().toISOString(); // Simpan waktu join
    await db.execute(
      "INSERT INTO members (id, project_id, name, role, total_spent, created_at) VALUES ($1, $2, $3, $4, $5, $6)", 
      [crypto.randomUUID(), projectId, name, role, 0, now]
    );
    await get().fetchProjects();
  },

  deleteMember: async (projectId, memberId, refund) => {
    if (get().isProcessing) return;
    set({ isProcessing: true });
    const db = await getDb();
    const p = get().projects.find(x => x.id === projectId);
    const m = p?.members.find(x => x.id === memberId);
    if (!m) { set({ isProcessing: false }); return; }

    try {
      await db.execute("BEGIN IMMEDIATE TRANSACTION");
      const refundAmt = refund ? m.totalSpent : 0;
      await db.execute("UPDATE projects SET balance = balance + $1 WHERE id = $2", [refundAmt, projectId]);
      await db.execute("DELETE FROM members WHERE id = $1", [memberId]);
      await db.execute("INSERT INTO logs (id, project_id, timestamp, type, context, value) VALUES ($1, $2, $3, $4, $5, $6)", [crypto.randomUUID(), projectId, new Date().toISOString(), 'INJECTION', `DECOMMISSION: ${m.name}`, refundAmt]);
      await db.execute("COMMIT");
    } catch (e) { await db.execute("ROLLBACK").catch(() => {}); }
    finally { set({ isProcessing: false }); await get().fetchProjects(); }
  },

  addExpense: async (projectId, amount, context, memberId) => {
    if (get().isProcessing) return;
    set({ isProcessing: true });
    const db = await getDb();
    const project = get().projects.find(p => p.id === projectId);
    if (!project) { set({ isProcessing: false }); return; }

    try {
      await db.execute("BEGIN IMMEDIATE TRANSACTION");
      await db.execute("UPDATE projects SET balance = balance - $1 WHERE id = $2", [amount, projectId]);

      if (amount > 0) {
        if (memberId) {
          await db.execute("UPDATE members SET total_spent = total_spent + $1 WHERE id = $2", [amount, memberId]);
        } else if (project.members.length > 0) {
          const split = amount / project.members.length;
          await db.execute("UPDATE members SET total_spent = total_spent + $1 WHERE project_id = $2", [split, projectId]);
        }
      }

      await db.execute("INSERT INTO logs (id, project_id, member_id, timestamp, type, context, value) VALUES ($1, $2, $3, $4, $5, $6, $7)", [crypto.randomUUID(), projectId, memberId || null, new Date().toISOString(), 'EXPENSE', !memberId ? `${context} (SHARED)` : context, -amount]);
      await db.execute("COMMIT");
    } catch (e) { await db.execute("ROLLBACK").catch(() => {}); }
    finally { set({ isProcessing: false }); await get().fetchProjects(); }
  },

  deleteProject: async (id) => {
    const db = await getDb();
    await db.execute("DELETE FROM projects WHERE id = $1", [id]);
    await get().fetchProjects();
  }
}));