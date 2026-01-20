import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Trash2, X, Fingerprint, Loader2 } from 'lucide-react';
import { useState } from "react";
import { cn } from "@/lib/utils";

interface LogAuditModalProps {
  isOpen: boolean;
  log: any;
  isProcessing: boolean;
  onClose: () => void;
  onVoid: () => Promise<void>;
  activeMembers: any[];
}

export default function LogAuditModal({ isOpen, log, isProcessing, onClose, onVoid, activeMembers }: LogAuditModalProps) {
  const [isConfirmingVoid, setIsConfirmingVoid] = useState(false);

  if (!isOpen || !log) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-matrix-bg/95 backdrop-blur-lg">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0" />
      <motion.div initial={{ scale: 0.8, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0 }} className="relative w-full max-w-md bg-matrix-card border border-matrix-green/50 p-8 shadow-glow-green">
        <div className="flex justify-between items-center mb-8 border-b border-matrix-border pb-4">
          <h2 className="text-xs font-black uppercase text-matrix-green tracking-[0.4em] flex items-center gap-3"><ShieldCheck size={16} /> Transaction_Audit</h2>
          <div className="flex items-center gap-3">
            {!isConfirmingVoid && <button onClick={() => setIsConfirmingVoid(true)} className="text-alert-pink hover:text-white transition-colors p-1 border border-alert-pink/30 hover:border-alert-pink shadow-glow-pink/30"><Trash2 size={16} /></button>}
            <button onClick={onClose} className="text-zinc-600 hover:text-alert-pink"><X size={20} /></button>
          </div>
        </div>

        <AnimatePresence>
          {isConfirmingVoid && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-6 p-4 border border-alert-pink bg-alert-pink/10 text-[10px] space-y-4 shadow-glow-pink/20">
              <p className="font-black uppercase text-alert-pink tracking-widest animate-pulse">Void_Sequence: Hapus transaksi ini dan koreksi saldo otomatis?</p>
              <div className="flex gap-2">
                <button disabled={isProcessing} onClick={onVoid} className="flex-1 py-2 bg-alert-pink text-white font-black uppercase hover:bg-white hover:text-alert-pink transition-all shadow-glow-pink">
                  {isProcessing ? <Loader2 className="animate-spin inline mr-2" size={12} /> : "Confirm_Void"}
                </button>
                <button onClick={() => setIsConfirmingVoid(false)} className="px-4 py-2 border border-zinc-700 text-zinc-500 font-black uppercase hover:bg-zinc-800 transition-all">Abort</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-matrix-bg border border-matrix-border"><p className="text-[7px] text-zinc-600 uppercase font-black mb-1">Auth_Protocol</p><p className="text-[10px] font-black text-matrix-green">{log.type}</p></div>
            <div className="p-3 bg-matrix-bg border border-matrix-border"><p className="text-[7px] text-zinc-600 uppercase font-black mb-1">Time_Sync</p><p className="text-[10px] font-black text-white">{new Date(log.timestamp).toLocaleTimeString('en-GB')}</p></div>
          </div>
          <div className="p-4 bg-matrix-bg border border-matrix-border relative overflow-hidden">
            <div className="absolute top-0 right-0 p-1 opacity-10"><Fingerprint size={40} /></div>
            <p className="text-[7px] text-zinc-600 uppercase font-black mb-2">Identification_String</p>
            <p className="text-sm font-black italic text-white uppercase tracking-tighter">"{log.context}"</p>
          </div>
          <div className="p-4 border border-matrix-border bg-matrix-green/5">
            <p className="text-[7px] text-zinc-600 uppercase font-black mb-2">Magnitude</p>
            <p className={cn("text-3xl font-black tracking-tighter", log.value < 0 ? "text-alert-pink" : "text-matrix-green")}>{(log.value ?? 0).toLocaleString()} DP</p>
            <div className="mt-4 pt-4 border-t border-matrix-border flex justify-between items-center">
              <span className="text-[8px] font-black text-zinc-500">Origin_Unit:</span>
              <span className="text-[9px] font-black text-matrix-green uppercase">{log.memberId ? activeMembers.find(m => m.id === log.memberId)?.name : "SHARED_ALLOCATION"}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}