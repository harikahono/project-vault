import { motion } from "framer-motion";
import { ArrowDownCircle, AlertTriangle } from 'lucide-react';
import { glitchVariants } from "@/lib/utils";

interface CommandPanelProps {
  onInjection: () => void;
  onExpense: () => void;
}

export default function CommandPanel({ onInjection, onExpense }: CommandPanelProps) {
  return (
    <section className="col-span-3 row-span-2 border border-matrix-border bg-matrix-card p-4 flex flex-col gap-3 justify-center shadow-glow-green/5">
      <div className="text-[7px] font-black text-matrix-green/30 uppercase mb-1 tracking-[0.3em] text-center">Execute_Command</div>
      <motion.button variants={glitchVariants} whileHover="hover" onClick={onInjection} className="flex justify-between items-center p-3 border border-matrix-green bg-matrix-green/5 text-matrix-green text-[10px] font-black hover:bg-matrix-green hover:text-black transition-all shadow-glow-green">
        INJECT_DP <ArrowDownCircle size={14} />
      </motion.button>
      <motion.button variants={glitchVariants} whileHover="hover" onClick={onExpense} className="flex justify-between items-center p-3 border border-alert-pink bg-alert-pink/5 text-alert-pink text-[10px] font-black hover:bg-alert-pink hover:text-white transition-all shadow-glow-pink">
        REPORT_EXP <AlertTriangle size={14} />
      </motion.button>
    </section>
  );
}