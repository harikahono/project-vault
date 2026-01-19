import { create } from 'zustand';
import { getDb } from '@/lib/db';

interface Member { id: string; name: string; role: string; totalSpent: number; createdAt: string; }
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
      
      // Parallel fetch untuk kecepatan akses data
      const [rawP, rawM, rawL]: [any[], any[], any[]] = await Promise.all([
        db.select("SELECT * FROM projects"),
        db.select("SELECT * FROM members"),
        db.select("SELECT * FROM logs ORDER BY timestamp DESC")
      ])as [any[], any[], any[],];

      const formatted = rawP.map(p => ({
        id: p.id, name: p.name, balance: p.balance,
        members: rawM.filter(m => m.project_id === p.id).map(m => ({ 
          id: m.id, name: m.name, role: m.role, 
          totalSpent: m.total_spent,
          createdAt: m.created_at 
        })),
        logs: rawL.filter(l => l.project_id === p.id).map(l => ({ 
          id: l.id, timestamp: l.timestamp, type: l.type, context: l.context, value: l.value, memberId: l.member_id 
        }))
      }));

      set({ projects: formatted, isLoading: false });
      const saved = localStorage.getItem('vault_active_id');
      if (saved && formatted.some(p => p.id === saved)) set({ activeProjectId: saved });
    } catch (err) { 
      console.error("FETCH_FAILED", err);
      set({ isLoading: false }); 
    }
  },

  setActiveProject: (id) => {
    id ? localStorage.setItem('vault_active_id', id) : localStorage.removeItem('vault_active_id');
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
    await db.execute("INSERT INTO members (id, project_id, name, role, total_spent, created_at) VALUES ($1, $2, $3, $4, $5, $6)", 
      [crypto.randomUUID(), projectId, name, role, 0, new Date().toISOString()]);
    await get().fetchProjects();
  },

  // PROTOKOL ANTI-GHOST: Transaksi utuh satu paket
  addExpense: async (projectId, amount, context, memberId) => {
    if (get().isProcessing) return;
    set({ isProcessing: true });
    
    try {
      const db = await getDb();
      
      // Ambil data real-time dari DB sebelum kalkulasi
      const currentMembers: any[] = await db.select("SELECT id FROM members WHERE project_id = $1", [projectId]);
      const memberCount = currentMembers.length;
      const isExp = amount > 0;
      const now = new Date().toISOString();
      const logId = crypto.randomUUID();

      // Mulai transaksi eksplisit
      await db.execute("BEGIN TRANSACTION");

      // 1. Update Balance Projek
      await db.execute("UPDATE projects SET balance = balance - $1 WHERE id = $2", [amount, projectId]);

      // 2. Logic Pembagian Beban
      if (isExp) {
        if (memberId) {
          // Direct Expense ke unit tertentu
          await db.execute("UPDATE members SET total_spent = total_spent + $1 WHERE id = $2", [amount, memberId]);
        } else if (memberCount > 0) {
          // Shared Expense ke semua unit (Anti-Infinity Guard)
          const split = amount / memberCount;
          await db.execute("UPDATE members SET total_spent = total_spent + $1 WHERE project_id = $2", [split, projectId]);
        }
      }

      // 3. Pencatatan Log Mutlak
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
      
      // Balikkan dana ke brankas jika refund dipilih
      await db.execute("UPDATE projects SET balance = balance + $1 WHERE id = $2", [refundAmt, projectId]);
      await db.execute("DELETE FROM members WHERE id = $1", [memberId]);
      
      // Catat dekomisi unit sebagai suntikan dana balik
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
    set({ activeProjectId: null });
  }
}));