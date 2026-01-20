import { motion } from "framer-motion";

export default function BalanceCard({ balance }: { balance: number }) {
  return (
    <section className="col-span-4 row-span-4 border border-matrix-border bg-matrix-card p-6 relative flex flex-col items-center justify-center overflow-hidden shadow-glow-green/10">
      <div className="absolute top-3 left-3 text-[8px] text-matrix-green/40 uppercase font-black tracking-widest">Core_Stability</div>
      <div className="relative w-full max-w-[220px] aspect-square flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full border-[10px] border-matrix-border border-t-matrix-green shadow-glow-green" />
        <div className="flex flex-col items-center text-center">
          <span className="text-[8px] opacity-40 uppercase font-black mb-1">Available_DP</span>
          <span className="text-4xl font-black tracking-tighter text-matrix-green">{balance.toLocaleString()}</span>
          <span className="text-[10px] text-matrix-green font-bold uppercase mt-2 italic animate-pulse">Sync_Active</span>
        </div>
      </div>
    </section>
  );
}