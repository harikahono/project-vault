import { motion } from "framer-motion";
import { Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";

interface ActionModalProps {
  isOpen: boolean;
  type: "PROJECT" | "OPERATIVE" | "EXPENSE" | "INJECTION" | null;
  formData: any;
  setFormData: (data: any) => void;
  expenseMemberId: string;
  setExpenseMemberId: (id: string) => void;
  activeProject: any;
  isProcessing: boolean;
  onClose: () => void;
  onExecute: () => Promise<void>;
}

export default function ActionModal({ isOpen, type, formData, setFormData, expenseMemberId, setExpenseMemberId, activeProject, isProcessing, onClose, onExecute }: ActionModalProps) {
  if (!isOpen || !type) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-matrix-bg/95 backdrop-blur-lg">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0" />
      <motion.div initial={{ scale: 0.9, opacity: 0, skewX: 10 }} animate={{ scale: 1, opacity: 1, skewX: 0 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm bg-matrix-card border border-matrix-border p-10 shadow-glow-green overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-matrix-green to-transparent opacity-50" />
        <h2 className="text-[12px] font-black uppercase text-matrix-green mb-8 border-b border-matrix-border pb-4 tracking-[0.4em] text-center">{type}_SEQUENCE</h2>
        <div className="space-y-6">
          {type === "EXPENSE" && (
            <div className="space-y-2">
              <label className="text-[8px] uppercase font-black text-zinc-600 tracking-widest">Assign_Operative</label>
              <select title="Select Unit" className="w-full bg-matrix-bg border border-matrix-border p-4 text-[10px] text-matrix-green outline-none appearance-none cursor-pointer focus:border-matrix-green font-bold" value={expenseMemberId} onChange={(e) => setExpenseMemberId(e.target.value)}>
                <option value="">-- ALL UNITS (SHARED_SPLIT) --</option>
                {activeProject?.members?.map((m: any) => <option key={m.id} value={m.id}>{m.name} // {m.role}</option>)}
              </select>
            </div>
          )}
          <input autoFocus className="w-full bg-matrix-bg border border-matrix-border p-4 text-[10px] text-matrix-green outline-none focus:border-matrix-green font-bold uppercase" placeholder="Reason / Context" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          {(type === "EXPENSE" || type === "INJECTION") && (
            <input type="number" className={cn("w-full bg-matrix-bg border border-matrix-border p-4 text-[10px] outline-none font-bold", type === "EXPENSE" ? "text-alert-pink focus:border-alert-pink" : "text-matrix-green focus:border-matrix-green")} placeholder="DP_Magnitude" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} />
          )}
          {type === "OPERATIVE" && (
            <input className="w-full bg-matrix-bg border border-matrix-border p-4 text-[10px] text-white outline-none focus:border-white uppercase font-bold" placeholder="Designation" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} />
          )}
          <div className="flex gap-4 pt-4">
            <button disabled={isProcessing} onClick={onExecute} className={cn("flex-1 py-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-lg flex items-center justify-center gap-2", type === "EXPENSE" ? "bg-alert-pink/20 border border-alert-pink text-alert-pink hover:bg-alert-pink hover:text-white shadow-glow-pink" : "bg-matrix-green/20 border border-matrix-green text-matrix-green hover:bg-matrix-green hover:text-black shadow-glow-green")}>
              {isProcessing ? <Loader2 className="animate-spin" size={16} /> : "EXECUTE"}
            </button>
            <button disabled={isProcessing} onClick={onClose} className="px-6 py-4 border border-zinc-800 text-zinc-600 text-[10px] font-black hover:bg-zinc-800 transition-all uppercase">Abort</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}