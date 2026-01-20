import { motion, AnimatePresence } from "framer-motion";
import { User, Download, Trash2, X, AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';
import { useState } from "react";
import { cn } from "@/lib/utils";

interface MemberAuditModalProps {
  isOpen: boolean;
  member: any;
  logs: any[];
  isProcessing: boolean;
  onClose: () => void;
  onExportPDF: (m: any) => void;
  onDecommission: (refund: boolean) => Promise<void>;
  memberCount: number; // Tetap ada agar tidak error di page.tsx
}

export default function MemberAuditModal({ isOpen, member, logs, isProcessing, onClose, onExportPDF, onDecommission }: MemberAuditModalProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-matrix-bg/95 backdrop-blur-lg">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0" />
      <motion.div initial={{ scale: 0.9, opacity: 0, skewX: 5 }} animate={{ scale: 1, opacity: 1, skewX: 0 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-2xl bg-matrix-card border border-matrix-border p-10 shadow-glow-green flex flex-col h-[80vh] overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-matrix-green to-transparent opacity-50" />
        <div className="flex justify-between items-start mb-8 border-b border-matrix-border pb-6">
          <div className="flex gap-6 items-center">
            <div className="w-16 h-16 bg-zinc-900 border border-matrix-green flex items-center justify-center shadow-glow-green"><User size={32} className="text-matrix-green" /></div>
            <div>
              <h2 className="text-xl font-black uppercase text-matrix-green tracking-widest">{member.name}</h2>
              <p className="text-xs text-matrix-green/50 font-black uppercase italic tracking-[0.2em]">{member.role}</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="text-right">
              <p className="text-[10px] text-zinc-600 uppercase font-black">Burn_Total</p>
              <p className="text-2xl font-black text-alert-pink">{(member.totalSpent ?? 0).toLocaleString()} DP</p>
            </div>
            <button onClick={() => onExportPDF(member)} className="p-2 border border-matrix-green/30 text-matrix-green/40 hover:text-matrix-green hover:border-matrix-green transition-all shadow-glow-green/50"><Download size={18} /></button>
            {!isConfirmingDelete && <button onClick={() => setIsConfirmingDelete(true)} className="p-2 border border-alert-pink/30 text-alert-pink/40 hover:text-alert-pink hover:border-alert-pink transition-all"><Trash2 size={18} /></button>}
            <button onClick={onClose} className="ml-4 text-zinc-600 hover:text-alert-pink transition-colors"><X size={24} /></button>
          </div>
        </div>

        <AnimatePresence>
          {isConfirmingDelete && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-6 border border-alert-pink bg-alert-pink/5 p-6 overflow-hidden shadow-glow-pink/30">
              <div className="flex items-center gap-4 mb-4">
                <AlertTriangle className="text-alert-pink animate-pulse" size={24} />
                <div>
                  <p className="text-xs font-black uppercase text-alert-pink">Decommission_Sequence</p>
                  <p className="text-[9px] text-alert-pink/60 uppercase">Duit mau dibalikin atau dianggap hangus?</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button disabled={isProcessing} onClick={() => onDecommission(true)} className="flex-1 py-3 bg-matrix-green/20 border border-matrix-green text-matrix-green text-[9px] font-black uppercase hover:bg-matrix-green transition-all flex items-center justify-center gap-2 shadow-glow-green/50">
                  {isProcessing ? <Loader2 className="animate-spin" size={12} /> : <><RotateCcw size={12} /> REFUND</>}
                </button>
                <button disabled={isProcessing} onClick={() => onDecommission(false)} className="flex-1 py-3 bg-alert-pink/20 border border-alert-pink text-alert-pink text-[9px] font-black uppercase hover:bg-alert-pink transition-all flex items-center justify-center gap-2 shadow-glow-pink/50">
                  {isProcessing ? <Loader2 className="animate-spin" size={12} /> : <><Trash2 size={12} /> RETAIN</>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-matrix-bg p-4 shadow-inner border border-matrix-border/50">
          <table className="w-full text-[10px]">
            <tbody className="divide-y divide-matrix-border/20">
              {logs?.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--hover-green)]">
                  <td className="py-3 text-matrix-green/30 italic whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString('en-GB')}</td>
                  <td className="py-3 px-4"><span className={cn("px-2 py-0.5 border text-[8px] font-black uppercase", !log.memberId ? "border-zinc-700 text-zinc-700" : "border-alert-pink text-alert-pink")}>{!log.memberId ? "SHARED" : "DIRECT"}</span></td>
                  <td className="py-3 opacity-80 uppercase tracking-tighter truncate max-w-[200px]">"{log.context}"</td>
                  {/* UPDATE: Pembagi diganti dari memberCount menjadi log.participant_count agar akurat */}
                  <td className="py-3 text-right font-black text-alert-pink">
                    {(!log.memberId 
                      ? ((-log.value) / (log.participant_count || 1)) 
                      : -log.value
                    ).toLocaleString()} DP
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}