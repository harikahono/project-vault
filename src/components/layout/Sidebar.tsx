import { motion } from "framer-motion";
import { LayoutDashboard, X, Plus } from 'lucide-react';
import { cn, glitchVariants } from "@/lib/utils";

interface SidebarProps {
  projects: any[];
  activeProjectId: string | null;
  setActiveProject: (id: string | null) => void;
  deleteProject: (id: string) => Promise<void>;
  onInitProject: () => void;
}

export default function Sidebar({ projects, activeProjectId, setActiveProject, deleteProject, onInitProject }: SidebarProps) {
  return (
    <aside className="w-20 border-r border-matrix-border bg-matrix-card flex flex-col items-center py-8 gap-6 z-50 flex-shrink-0 shadow-glow-green/20">
      <motion.button 
        variants={glitchVariants} whileHover="hover"
        onClick={() => setActiveProject(null)} 
        className={cn("p-2 border transition-all shadow-glow-green", activeProjectId === null ? "border-matrix-green text-matrix-green bg-matrix-green/10" : "border-matrix-green text-matrix-green")}
      >
        <LayoutDashboard size={24} />
      </motion.button>
      
      <div className="flex flex-col gap-6 overflow-y-auto no-scrollbar flex-1 w-full items-center mt-4">
        {projects?.map((p) => (
          <div key={p.id} className="relative group flex items-center justify-center w-full px-2">
            {activeProjectId === p.id && <motion.div layoutId="active-pill" className="absolute left-0 w-1 h-8 bg-matrix-green shadow-glow-green" />}
            <motion.button 
              variants={glitchVariants} whileHover="hover" onClick={() => setActiveProject(p.id)}
              className={cn("w-12 h-12 flex items-center justify-center border text-[10px] font-black transition-all", activeProjectId === p.id ? "border-matrix-green text-matrix-green bg-matrix-green/5 shadow-glow-green" : "border-matrix-border text-zinc-600")}
            >
              {p.name?.substring(0, 2).toUpperCase()}
            </motion.button>
            <button onClick={async (e) => { e.stopPropagation(); await deleteProject(p.id); }} className="absolute -top-1 right-2 opacity-0 group-hover:opacity-100 bg-alert-pink text-white p-0.5 rounded-sm"><X size={10} /></button>
          </div>
        ))}
        <button onClick={onInitProject} className="w-12 h-12 border border-dashed border-matrix-border text-zinc-700 hover:text-matrix-green hover:border-matrix-green transition-colors"><Plus size={20} /></button>
      </div>
    </aside>
  );
}