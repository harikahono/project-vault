import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- INTERFACES ---

interface Member {
  id: string;
  name: string;
  role: string;
  totalSpent: number;
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
  addProject: (name: string) => void;
  setActiveProject: (id: string | null) => void;
  deleteProject: (id: string) => void;
  addMember: (projectId: string, name: string, role: string) => void;
  // Menambahkan fungsi Decommissioning
  deleteMember: (projectId: string, memberId: string, refund: boolean) => void;
  addExpense: (projectId: string, amount: number, context: string, memberId?: string) => void;
}

// --- STORE IMPLEMENTATION ---

export const useVault = create<VaultState>()(
  persist(
    (set) => ({
      projects: [],
      activeProjectId: null,

      addProject: (name) => set((state) => {
        const newProject: Project = {
          id: crypto.randomUUID(),
          name,
          balance: 0, 
          members: [],
          logs: []
        };
        return { 
          projects: [...state.projects, newProject],
          activeProjectId: state.activeProjectId || newProject.id 
        };
      }),

      setActiveProject: (id) => set({ activeProjectId: id }),

      deleteProject: (id) => set((state) => ({
        projects: state.projects.filter(p => p.id !== id),
        activeProjectId: state.activeProjectId === id 
          ? (state.projects.length > 1 ? state.projects[0].id : null) 
          : state.activeProjectId
      })),

      addMember: (projectId, name, role) => set((state) => ({
        projects: state.projects.map(p => 
          p.id === projectId 
            ? { 
                ...p, 
                members: [
                  ...p.members, 
                  { id: crypto.randomUUID(), name, role, totalSpent: 0 }
                ] 
              }
            : p
        )
      })),

      /**
       * UNIT DECOMMISSIONING LOGIC:
       * - Jika refund = true: Kembalikan semua totalSpent member ke balance projek.
       * - Jika refund = false: Member dihapus, pengeluaran tetap dianggap hangus.
       */
      deleteMember: (projectId, memberId, refund) => set((state) => ({
        projects: state.projects.map(p => {
          if (p.id !== projectId) return p;
          
          const memberToDelete = p.members.find(m => m.id === memberId);
          if (!memberToDelete) return p;

          const refundAmount = refund ? memberToDelete.totalSpent : 0;
          const logContext = refund 
            ? `UNIT_DECOMMISSIONED: ${memberToDelete.name} (Refunding ${refundAmount.toLocaleString()} DP)` 
            : `UNIT_DECOMMISSIONED: ${memberToDelete.name} (Funds Retained)`;

          return {
            ...p,
            balance: p.balance + refundAmount, // Mengembalikan dana jika dipilih refund
            members: p.members.filter(m => m.id !== memberId),
            logs: [
              {
                id: crypto.randomUUID(),
                timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
                type: refund ? 'INJECTION' : 'EXPENSE',
                context: logContext,
                value: refund ? refundAmount : 0 // Dicatat sebagai penyesuaian di log
              },
              ...p.logs
            ]
          };
        })
      })),

      /**
       * MONEY FLOW + DYNAMIC SPLIT LOGIC:
       * - Jika memberId ada: Beban masuk ke 1 orang secara penuh.
       * - Jika memberId kosong: Beban dibagi rata ke SEMUA anggota yang aktif.
       */
      addExpense: (projectId, amount, context, memberId) => set((state) => ({
        projects: state.projects.map(p => {
          if (p.id !== projectId) return p;

          const isExpense = amount > 0;
          let updatedMembers = [...p.members];

          if (isExpense) {
            if (memberId) {
              // CASE 1: Pengeluaran Individu
              updatedMembers = p.members.map(m => 
                m.id === memberId ? { ...m, totalSpent: m.totalSpent + amount } : m
              );
            } else if (p.members.length > 0) {
              // CASE 2: Pengeluaran Kolektif (Shared Split)
              const splitAmount = amount / p.members.length;
              updatedMembers = p.members.map(m => ({
                ...m,
                totalSpent: m.totalSpent + splitAmount
              }));
            }
          }

          return { 
            ...p, 
            balance: p.balance - amount,
            members: updatedMembers,
            logs: [
              { 
                id: crypto.randomUUID(), 
                timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }), 
                type: isExpense ? 'EXPENSE' : 'INJECTION', 
                context: !memberId && isExpense ? `${context} (SHARED_SPLIT)` : context, 
                value: -amount,
                memberId: isExpense ? memberId : undefined 
              }, 
              ...p.logs
            ] 
          };
        })
      }))
    }),
    { name: 'vault-multi-project-storage' }
  )
);