import { Activity, FileText, Wifi } from 'lucide-react';

interface HeaderProps {
  projectName: string;
  onExportPDF: () => void;
}

export default function Header({ projectName, onExportPDF }: HeaderProps) {
  return (
    <header className="flex justify-between items-center border-b border-matrix-border pb-4 flex-shrink-0">
      <div className="flex items-center gap-4">
        <Activity className="text-matrix-green drop-shadow-[0_0_8px_#00FF9C] animate-pulse" size={20} />
        <div>
          <h1 className="text-sm font-black italic uppercase tracking-tighter text-matrix-green">Vault // {projectName}</h1>
          <p className="text-[8px] text-matrix-green/50 font-bold uppercase tracking-widest">Protocol_Established</p>
        </div>
      </div>
      <div className="flex gap-4 text-[9px] font-bold text-matrix-green items-center">
        <button onClick={onExportPDF} className="flex items-center gap-2 px-3 py-1 border border-matrix-green/30 hover:border-matrix-green bg-matrix-green/5 transition-all text-matrix-green font-black">
          <FileText size={12} /> EXPORT_LEDGER
        </button>
        <span className="opacity-40 uppercase tracking-tighter"><Wifi size={14} className="inline mr-1" /> 12ms</span>
        <span className="px-3 py-1 border border-matrix-green bg-matrix-green/10 shadow-glow-green font-black uppercase">Status: Secure</span>
      </div>
    </header>
  );
}