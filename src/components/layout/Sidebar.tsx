import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, X, Plus, ShieldAlert, Loader2 } from 'lucide-react';
import { useState } from "react";
import { cn, glitchVariants } from "@/lib/utils";

interface SidebarProps {
  projects: any[];
  activeProjectId: string | null;
  setActiveProject: (id: string | null) => void;
  deleteProject: (id: string) => Promise<void>;
  onInitProject: () => void;
}

export default function Sidebar({ projects, activeProjectId, setActiveProject, deleteProject, onInitProject }: SidebarProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmTermination = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    await deleteProject(deletingId);
    setIsDeleting(false);
    setDeletingId(null);
  };

  return (
    <aside className="w-20 border-r border-matrix-border bg-matrix-card flex flex-col items-center py-8 gap-6 z-50 flex-shrink-0 shadow-glow-green/20 relative">
      {/* ROOT DASHBOARD */}
      <motion.button 
        variants={glitchVariants} whileHover="hover"
        onClick={() => setActiveProject(null)} 
        className={cn(
          "p-3 border transition-all shadow-glow-green", 
          activeProjectId === null 
            ? "border-matrix-green text-matrix-green bg-matrix-green/10" 
            : "border-matrix-green/40 text-matrix-green/40 hover:border-matrix-green hover:text-matrix-green"
        )}
      >
        <LayoutDashboard size={22} className={cn(activeProjectId === null && "animate-pulse")} />
      </motion.button>
      
      <div className="w-8 h-[1px] bg-matrix-border/50" />

      {/* PROJECT LIST */}
      <div className="flex flex-col gap-5 overflow-y-auto no-scrollbar flex-1 w-full items-center">
        {projects?.map((p) => (
          <div key={p.id} className="relative group flex items-center justify-center w-full px-2">
            {activeProjectId === p.id && (
              <motion.div layoutId="active-pill" className="absolute left-0 w-1 h-8 bg-matrix-green shadow-glow-green" />
            )}
            
            <motion.button 
              variants={glitchVariants} whileHover="hover" 
              onClick={() => setActiveProject(p.id)}
              className={cn(
                "w-12 h-12 flex items-center justify-center border text-[10px] font-black transition-all", 
                activeProjectId === p.id 
                  ? "border-matrix-green text-matrix-green bg-matrix-green/5 shadow-glow-green" 
                  : "border-matrix-border text-zinc-600 hover:text-matrix-green"
              )}
            >
              {p.name?.substring(0, 2).toUpperCase()}
            </motion.button>

            {/* DELETE TRIGGER */}
            <button 
              onClick={(e) => { e.stopPropagation(); setDeletingId(p.id); }} 
              className="absolute -top-1 right-2 opacity-0 group-hover:opacity-100 bg-alert-pink text-white p-0.5 rounded-sm hover:scale-110 transition-all shadow-glow-pink/50"
            >
              <X size={10} />
            </button>
          </div>
        ))}

        {/* INITIALIZE NEW PROJECT */}
        <button 
          onClick={onInitProject} 
          className="w-12 h-12 flex items-center justify-center border border-dashed border-matrix-border text-zinc-800 hover:text-matrix-green hover:border-matrix-green hover:bg-matrix-green/5 transition-all group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      {/* SYSTEM INFO - SEKARANG LEBIH TERANG & TAJAM */}
      <div className="mt-auto flex flex-col items-center gap-3">
        <div className="w-1 h-1 bg-matrix-green shadow-glow-green animate-pulse mb-1" />
        <div className="text-[7px] text-matrix-green/80 font-black uppercase rotate-180 [writing-mode:vertical-lr] tracking-[0.2em] drop-shadow-[0_0_3px_#00FF9C44]">
          system_v2.2_hk_vault
        </div>
      </div>

      {/* MATRIX CONFIRM OVERLAY */}
      <AnimatePresence>
        {deletingId && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] bg-matrix-bg/90 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, skewX: 10 }} animate={{ scale: 1, skewX: 0 }} exit={{ scale: 0.9 }}
              className="max-w-xs w-full bg-matrix-card border border-alert-pink p-6 shadow-glow-pink"
            >
              <div className="flex items-center gap-3 mb-4 text-alert-pink">
                <ShieldAlert size={20} className="animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">Termination_Required</span>
              </div>
              <p className="text-[9px] text-alert-pink/80 uppercase font-bold leading-relaxed mb-6">
                Menghapus projek ini akan memusnahkan semua ledger dan data unit secara permanen. Lanjutkan?
              </p>
              <div className="flex gap-3">
                <button 
                  disabled={isDeleting}
                  onClick={confirmTermination}
                  className="flex-1 py-3 bg-alert-pink/20 border border-alert-pink text-alert-pink text-[9px] font-black uppercase hover:bg-alert-pink hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 size={12} className="animate-spin" /> : "CONFIRM_DELETE"}
                </button>
                <button 
                  onClick={() => setDeletingId(null)}
                  className="px-4 py-3 border border-zinc-800 text-zinc-500 text-[9px] font-black uppercase hover:bg-zinc-800 transition-all"
                >
                  ABORT
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}