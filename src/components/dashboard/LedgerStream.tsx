import { Terminal } from 'lucide-react';
import { cn } from "@/lib/utils";

interface LedgerStreamProps {
  logs: any[];
  onLogClick: (id: string) => void;
}

export default function LedgerStream({ logs, onLogClick }: LedgerStreamProps) {
  return (
    <section className="col-span-9 row-span-2 border border-matrix-border bg-matrix-card overflow-hidden flex flex-col min-h-0 shadow-inner">
      <div className="bg-matrix-green/5 p-2 border-b border-matrix-border text-[9px] font-black uppercase flex justify-between px-4">
        <span><Terminal size={12} className="inline mr-2" /> Ledger_Stream // Transaction_History</span>
        <span className="text-zinc-700 tracking-tighter italic">Click Entry for Audit</span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-2">
        <table className="w-full text-[9px] border-collapse">
          <tbody className="divide-y divide-matrix-border/30">
            {logs?.map((log) => (
              <tr key={log.id} onClick={() => onLogClick(log.id)} className="hover:bg-[var(--hover-green)] transition-colors group cursor-pointer">
                <td className="p-3 text-matrix-green/40 italic uppercase whitespace-nowrap px-4">{new Date(log.timestamp).toLocaleTimeString('en-GB')}</td>
                <td className="p-3 px-1"><span className={cn("px-2 py-0.5 border text-[7px] font-black uppercase", log.type === 'EXPENSE' ? "border-alert-pink text-alert-pink" : "border-matrix-green text-matrix-green")}>{log.type}</span></td>
                <td className="p-3 opacity-60 italic truncate max-w-[400px]">"{log.context}"</td>
                <td className={cn("p-3 text-right font-black whitespace-nowrap px-4", log.value < 0 ? "text-alert-pink" : "text-matrix-green")}>{(log.value ?? 0).toLocaleString()} DP</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}