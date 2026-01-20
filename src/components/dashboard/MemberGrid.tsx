import { motion } from "framer-motion";
import { Users, Plus } from 'lucide-react';

interface MemberGridProps {
  members: any[];
  projectBalance: number;
  onMemberClick: (id: string) => void;
  onAddUnit: () => void;
}

export default function MemberGrid({ members, projectBalance, onMemberClick, onAddUnit }: MemberGridProps) {
  return (
    <section className="col-span-8 row-span-4 border border-matrix-border bg-matrix-card p-5 flex flex-col overflow-hidden">
      <h2 className="text-[10px] uppercase font-black text-zinc-500 mb-4 tracking-widest flex items-center gap-2 flex-shrink-0 px-2">
        <Users size={14} className="text-matrix-green" /> Operatives_Linked
      </h2>
      <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden content-start pr-1">
        {members?.slice(0, 6).map((m) => {
          const impact = (projectBalance + (m.totalSpent ?? 0)) > 0 ? ((m.totalSpent ?? 0) / (projectBalance + (m.totalSpent ?? 0))) * 100 : 0;
          return (
            <motion.div whileHover={{ scale: 1.02 }} onClick={() => onMemberClick(m.id)} key={m.id} className="border border-matrix-border bg-matrix-card p-4 h-32 flex flex-col justify-between hover:border-matrix-green transition-all group cursor-pointer shadow-lg">
              <div className="flex justify-between items-start">
                <div className="flex gap-3 min-w-0">
                  <div className="w-10 h-10 bg-zinc-900 border border-matrix-border flex items-center justify-center text-[9px] text-matrix-green/10 font-black">HUD</div>
                  <div className="min-w-0">
                    <h3 className="text-[10px] font-black uppercase truncate text-white">{m.name}</h3>
                    <p className="text-[8px] text-matrix-green/50 font-black italic truncate uppercase">{m.role}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[7px] font-black uppercase tracking-tighter">
                  <span className="text-zinc-600">Spent:</span>
                  <span className="text-alert-pink font-bold">{(m.totalSpent ?? 0).toLocaleString()} DP</span>
                </div>
                <div className="h-1 bg-matrix-border w-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${impact}%` }} className="h-full bg-alert-pink shadow-glow-pink" />
                </div>
              </div>
            </motion.div>
          );
        })}
        {members?.length < 6 && (
          <button onClick={onAddUnit} className="border border-dashed border-matrix-border h-32 flex flex-col items-center justify-center gap-2 hover:border-matrix-green hover:bg-matrix-green/5 transition-all text-zinc-800">
            <Plus size={20} /><span className="text-[8px] font-black uppercase tracking-tighter">Reg_Unit</span>
          </button>
        )}
      </div>
    </section>
  );
}