"use client"
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, Plus, Terminal, ArrowDownCircle, 
  AlertTriangle, Users, LayoutDashboard, X, FolderPlus, User, Trash2, RotateCcw, FileText, Download, Fingerprint, ShieldCheck, CheckCircle2, Wifi, Loader2
} from 'lucide-react';
import { useVault } from "@/store/useVault";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --- ANIMATION CONFIG ---
const glitch = {
  hover: {
    x: [0, -1, 1, 0],
    filter: ["hue-rotate(0deg)", "hue-rotate(90deg)", "hue-rotate(0deg)"],
    transition: { duration: 0.1, repeat: Infinity }
  }
};

export default function VaultPage() {
  const { 
    projects, activeProjectId, setActiveProject, 
    addProject, deleteProject, addMember, addExpense, deleteMember,
    fetchProjects, isLoading 
  } = useVault();
  
  const activeProject = projects?.find(p => p.id === activeProjectId);

  // --- UI STATE ---
  const [modalType, setModalType] = useState<"PROJECT" | "OPERATIVE" | "EXPENSE" | "INJECTION" | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null); 
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [formData, setFormData] = useState({ name: "", role: "", amount: "" });
  const [expenseMemberId, setExpenseMemberId] = useState(""); 

  // --- STARTUP PROTOCOL ---
  useEffect(() => {
    fetchProjects(); 
  }, [fetchProjects]);

  // --- AUTO-HIDE DOWNLOAD NOTIF ---
  useEffect(() => {
    if (downloadStatus) {
      const timer = setTimeout(() => setDownloadStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [downloadStatus]);

  // --- DERIVED DATA & SMART FILTERING ---
  const detailMember = useMemo(() => 
    activeProject?.members?.find(m => m.id === selectedMemberId),
    [activeProject, selectedMemberId]
  );

  const detailLog = useMemo(() => 
    activeProject?.logs?.find(l => l.id === selectedLogId),
    [activeProject, selectedLogId]
  );

  // --- FIX: PROTOKOL AUDIT CERDAS ---
  const memberLogs = useMemo(() => {
    if (!detailMember || !activeProject) return [];
    return activeProject.logs.filter(l => {
      // 1. DIRECT LOG: Jika log ini ditembak ke member ini, WAJIB tampil.
      if (l.memberId === selectedMemberId) return true;

      // 2. SHARED LOG: Jika log patungan, tampilkan jika terjadi setelah join (dengan buffer 2s)
      if (!l.memberId && l.type === 'EXPENSE') {
        const logTime = new Date(l.timestamp).getTime();
        const joinTime = new Date(detailMember.createdAt).getTime();
        if (isNaN(logTime) || isNaN(joinTime)) return true;
        
        // Buffer 2000ms untuk mengatasi race condition saat penulisan database
        return logTime >= (joinTime - 2000);
      }
      return false;
    });
  }, [activeProject, detailMember, selectedMemberId]);

  // --- HANDLER: CLOSE ALL MODALS ---
  const handleCloseModal = () => {
    setModalType(null);
    setSelectedMemberId(null);
    setSelectedLogId(null);
    setFormData({ name: "", role: "", amount: "" });
    setExpenseMemberId("");
    setIsConfirmingDelete(false);
  };

  // --- PDF LOGIC ---
  const exportFullPDF = () => {
    if (!activeProject) return;
    const doc = new jsPDF();
    doc.setFont("courier", "bold");
    doc.text(`VAULT REPORT: ${activeProject.name.toUpperCase()}`, 14, 20);
    autoTable(doc, {
      startY: 30,
      head: [['UNIT', 'ROLE', 'BURNED']],
      body: (activeProject.members || []).map(m => [m.name, m.role, `${(m.totalSpent ?? 0).toLocaleString()} DP`]),
      headStyles: { fillColor: [0, 255, 156], textColor: [0, 0, 0] }
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['TIME', 'TYPE', 'CONTEXT', 'VALUE']],
      body: (activeProject.logs || []).map(l => [
        new Date(l.timestamp).toLocaleTimeString('en-GB'),
        l.type, 
        l.context, 
        l.value.toLocaleString()
      ]),
    });
    doc.save(`VAULT_${activeProject.name}.pdf`);
    setDownloadStatus("FULL_LEDGER_EXTRACTED");
  };

  const exportMemberPDF = (member: any) => {
    if (!activeProject || !member) return;
    const doc = new jsPDF();
    doc.setFont("courier", "bold");
    doc.text(`UNIT AUDIT: ${member.name.toUpperCase()}`, 14, 20);
    
    // Samakan logika filter PDF dengan filter UI (Zero-Latency Protection)
    const filteredLogs = activeProject.logs.filter(l => {
        if (l.memberId === member.id) return true;
        if (!l.memberId && l.type === 'EXPENSE') {
            return new Date(l.timestamp).getTime() >= (new Date(member.createdAt).getTime() - 2000);
        }
        return false;
    });

    autoTable(doc, {
      startY: 40,
      head: [['TIME', 'AUTH', 'CONTEXT', 'MAGNITUDE']],
      body: filteredLogs.map(l => {
        const val = !l.memberId ? ((-l.value) / (activeProject.members.length || 1)) : -l.value;
        return [new Date(l.timestamp).toLocaleTimeString('en-GB'), !l.memberId ? "SHARED" : "DIRECT", l.context, `${val.toLocaleString()} DP`];
      }),
      headStyles: { fillColor: [255, 46, 99] }
    });
    doc.save(`AUDIT_${member.name}.pdf`);
    setDownloadStatus(`UNIT_${member.name.toUpperCase()}_DUMPED`);
  };

  // --- ASYNC EXECUTION ---
  const handleExecute = async () => {
    if (!activeProject && modalType !== "PROJECT") return;
    
    // Konversi angka yang sudah dibersihkan dari titik di useVault atau UI
    const cleanAmount = formData.amount.toString().replace(/\./g, '');
    const amountNum = parseInt(cleanAmount) || 0;

    try {
      if (modalType === "PROJECT" && formData.name) {
        await addProject(formData.name);
      } else if (modalType === "OPERATIVE" && activeProject && formData.name) {
        await addMember(activeProject.id, formData.name, formData.role || "UNIT");
      } else if (modalType === "INJECTION" && activeProject && amountNum !== 0) {
        await addExpense(activeProject.id, -amountNum, formData.name || "Initial Injection");
      } else if (modalType === "EXPENSE" && activeProject && amountNum !== 0) {
        await addExpense(activeProject.id, amountNum, formData.name || "Operation Log", expenseMemberId);
      }
      handleCloseModal();
    } catch (err) {
      console.error("EXECUTION_PROTOCOL_FAILED", err);
    }
  };

  const handleDecommission = async (refund: boolean) => {
    if (activeProject && selectedMemberId) {
      await deleteMember(activeProject.id, selectedMemberId, refund);
      handleCloseModal();
    }
  };

  return (
    <div className="flex h-screen w-screen bg-matrix-bg font-mono text-white overflow-hidden select-none relative">
      <div className="absolute inset-0 pointer-events-none scanline opacity-30 z-[100]" />

      <AnimatePresence>
        {downloadStatus && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-3 bg-matrix-card border border-matrix-green p-4 shadow-[0_0_30px_rgba(0,255,156,0.2)]"
          >
            <CheckCircle2 className="text-matrix-green animate-pulse" size={20} />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-matrix-green tracking-[0.2em]">Transmission_Success</span>
              <span className="text-[8px] text-zinc-500 uppercase">{downloadStatus}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <aside className="w-20 border-r border-matrix-border bg-matrix-card flex flex-col items-center py-8 gap-6 z-50 flex-shrink-0">
        <motion.button 
          title="Return to System Hub" variants={glitch} whileHover="hover"
          onClick={() => setActiveProject(null)} 
          className={cn(
            "p-2 border transition-all shadow-glow-green",
            activeProjectId === null ? "border-matrix-green text-matrix-green bg-matrix-green/10" : "border-matrix-green text-matrix-green"
          )}
        >
          <LayoutDashboard size={24} />
        </motion.button>
        
        <div className="flex flex-col gap-6 overflow-y-auto no-scrollbar flex-1 w-full items-center mt-4">
          {projects?.map((p) => (
            <div key={p.id} className="relative group flex items-center justify-center w-full px-2">
              {activeProjectId === p.id && <motion.div layoutId="active-pill" className="absolute left-0 w-1 h-8 bg-matrix-green shadow-[0_0_15px_#00FF9C]" />}
              <motion.button title={p.name} variants={glitch} whileHover="hover" onClick={() => setActiveProject(p.id)} className={cn("w-12 h-12 flex items-center justify-center border text-[10px] font-black transition-all", activeProjectId === p.id ? "border-matrix-green text-matrix-green bg-matrix-green/5" : "border-matrix-border text-zinc-600")}>{p.name?.substring(0, 2).toUpperCase()}</motion.button>
              <button title="Delete Project" onClick={async (e) => { e.stopPropagation(); await deleteProject(p.id); }} className="absolute -top-1 right-2 opacity-0 group-hover:opacity-100 bg-alert-pink text-white p-0.5"><X size={10} /></button>
            </div>
          ))}
          <button title="Create Project" onClick={() => setModalType("PROJECT")} className="w-12 h-12 border border-dashed border-matrix-border text-zinc-700 hover:text-matrix-green transition-colors"><Plus size={20} /></button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col p-6 gap-6 min-w-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {isLoading ? (
             <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center text-center">
                <Loader2 size={48} className="text-matrix-green animate-spin mb-4 opacity-20" />
                <p className="text-[10px] text-matrix-green/40 font-black uppercase tracking-[0.5em] animate-pulse">Syncing_Vault_Database...</p>
             </motion.div>
          ) : activeProject ? (
            <motion.div key={activeProject.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col gap-6 overflow-hidden">
              <header className="flex justify-between items-center border-b border-matrix-border pb-4 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <Activity className="text-matrix-green drop-shadow-[0_0_8px_#00FF9C] animate-pulse" size={20} />
                  <div><h1 className="text-sm font-black italic uppercase tracking-tighter text-matrix-green">Vault // {activeProject.name}</h1><p className="text-[8px] text-matrix-green/50 font-bold uppercase tracking-widest">Protocol_Established</p></div>
                </div>
                <div className="flex gap-4 text-[9px] font-bold text-matrix-green items-center">
                  <button title="Export PDF" onClick={exportFullPDF} className="flex items-center gap-2 px-3 py-1 border border-matrix-green/30 hover:border-matrix-green bg-matrix-green/5 transition-all text-matrix-green font-black"><FileText size={12} /> EXPORT_LEDGER</button>
                  <span className="opacity-40 uppercase tracking-tighter"><Wifi size={14} className="inline mr-1" /> 12ms</span>
                  <span className="px-3 py-1 border border-matrix-green bg-matrix-green/10 shadow-glow-green font-black uppercase">Status: Secure</span>
                </div>
              </header>

              <div className="flex-1 grid grid-cols-12 grid-rows-6 gap-6 overflow-hidden min-h-0">
                {/* Balance Section */}
                <section className="col-span-4 row-span-4 border border-matrix-border bg-matrix-card p-6 relative flex flex-col items-center justify-center overflow-hidden">
                  <div className="absolute top-3 left-3 text-[8px] text-matrix-green/40 uppercase font-black tracking-widest">Core_Stability</div>
                  <div className="relative w-full max-w-[220px] aspect-square flex items-center justify-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full border-[10px] border-matrix-border border-t-matrix-green shadow-[0_0_40px_rgba(0,255,156,0.15)]" />
                    <div className="flex flex-col items-center text-center">
                      <span className="text-[8px] opacity-40 uppercase font-black mb-1">Available_DP</span>
                      <span className="text-4xl font-black tracking-tighter text-matrix-green">{(activeProject.balance ?? 0).toLocaleString()}</span>
                      <span className="text-[10px] text-matrix-green font-bold uppercase mt-2 italic animate-pulse">Sync_Active</span>
                    </div>
                  </div>
                </section>

                {/* Members Section */}
                <section className="col-span-8 row-span-4 border border-matrix-border bg-matrix-card p-5 flex flex-col overflow-hidden">
                  <h2 className="text-[10px] uppercase font-black text-zinc-500 mb-4 tracking-widest flex items-center gap-2 flex-shrink-0 px-2"><Users size={14} className="text-matrix-green" /> Operatives_Linked</h2>
                  <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden content-start pr-1">
                    {activeProject.members?.slice(0, 6).map((m) => {
                      const impact = (activeProject.balance + (m.totalSpent ?? 0)) > 0 ? ((m.totalSpent ?? 0) / (activeProject.balance + (m.totalSpent ?? 0))) * 100 : 0;
                      return (
                        <motion.div whileHover={{ scale: 1.02 }} onClick={() => setSelectedMemberId(m.id)} key={m.id} className="border border-matrix-border bg-matrix-card p-4 h-32 flex flex-col justify-between hover:border-matrix-green transition-all group cursor-pointer shadow-lg">
                          <div className="flex justify-between items-start"><div className="flex gap-3 min-w-0"><div className="w-10 h-10 bg-zinc-900 border border-matrix-border flex items-center justify-center text-[9px] text-matrix-green/10 font-black">HUD</div><div className="min-w-0"><h3 className="text-[10px] font-black uppercase truncate text-white">{m.name}</h3><p className="text-[8px] text-matrix-green/50 font-black italic truncate uppercase">{m.role}</p></div></div></div>
                          <div className="space-y-1.5"><div className="flex justify-between text-[7px] font-black uppercase tracking-tighter"><span className="text-zinc-600">Spent:</span><span className="text-alert-pink font-bold">{(m.totalSpent ?? 0).toLocaleString()} DP</span></div><div className="h-1 bg-matrix-border w-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${impact}%` }} className="h-full bg-alert-pink shadow-[0_0_10px_#FF2E63]" /></div></div>
                        </motion.div>
                      );
                    })}
                    {activeProject.members?.length < 6 && <button title="Add Unit" onClick={() => setModalType("OPERATIVE")} className="border border-dashed border-matrix-border h-32 flex flex-col items-center justify-center gap-2 hover:border-matrix-green hover:bg-matrix-green/5 transition-all text-zinc-800"><Plus size={20} /><span className="text-[8px] font-black uppercase tracking-tighter">Reg_Unit</span></button>}
                  </div>
                </section>

                {/* Ledger Stream */}
                <section className="col-span-9 row-span-2 border border-matrix-border bg-matrix-card overflow-hidden flex flex-col min-h-0 shadow-inner">
                  <div className="bg-matrix-green/5 p-2 border-b border-matrix-border text-[9px] font-black uppercase flex justify-between px-4"><span><Terminal size={12} className="inline mr-2" /> Ledger_Stream // Transaction_History</span><span className="text-zinc-700 tracking-tighter italic">Click Entry for Audit</span></div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pb-2">
                    <table className="w-full text-[9px] border-collapse">
                      <tbody className="divide-y divide-matrix-border/30">
                        {activeProject.logs?.map((log) => (
                          <tr key={log.id} onClick={() => setSelectedLogId(log.id)} className="hover:bg-matrix-green/10 transition-colors group cursor-pointer">
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

                {/* Commands */}
                <section className="col-span-3 row-span-2 border border-matrix-border bg-matrix-card p-4 flex flex-col gap-3 justify-center shadow-glow-green/5">
                  <div className="text-[7px] font-black text-matrix-green/30 uppercase mb-1 tracking-[0.3em] text-center">Execute_Command</div>
                  <motion.button title="Inject DP" variants={glitch} whileHover="hover" onClick={() => setModalType("INJECTION")} className="flex justify-between items-center p-3 border border-matrix-green bg-matrix-green/5 text-matrix-green text-[10px] font-black hover:bg-matrix-green hover:text-black transition-all shadow-glow-green font-black">INJECT_DP <ArrowDownCircle size={14} /></motion.button>
                  <motion.button title="Report Expense" variants={glitch} whileHover="hover" onClick={() => setModalType("EXPENSE")} className="flex justify-between items-center p-3 border border-alert-pink bg-alert-pink/5 text-alert-pink text-[10px] font-black hover:bg-alert-pink hover:text-white transition-all shadow-[0_0_15px_rgba(255,46,99,0.15)] font-black">REPORT_EXP <AlertTriangle size={14} /></motion.button>
                </section>
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-center p-12">
              <FolderPlus size={64} className="text-matrix-green/20 mb-8 animate-pulse" />
              <div className="space-y-2 mb-10">
                <h2 className="text-xl font-black italic uppercase tracking-[0.5em] text-matrix-green">Vault_By_harikahono</h2>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Terminal_Awaiting_Data_Input // Select_Vault_To_Begin</p>
              </div>
              <button title="Init New Project" onClick={() => setModalType("PROJECT")} className="px-12 py-4 border border-matrix-green text-matrix-green text-[10px] font-black tracking-[0.5em] hover:bg-matrix-green hover:text-black transition-all shadow-glow-green">INITIALIZE_NEW_VAULT</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- MODAL 1: UNIT AUDIT --- */}
        <AnimatePresence>
          {selectedMemberId && detailMember && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCloseModal} className="absolute inset-0" />
              <motion.div initial={{ scale: 0.9, opacity: 0, skewX: 5 }} animate={{ scale: 1, opacity: 1, skewX: 0 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-2xl bg-matrix-card border border-matrix-border p-10 shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col h-[80vh] overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-matrix-green to-transparent opacity-50" />
                <div className="flex justify-between items-start mb-8 border-b border-matrix-border pb-6">
                  <div className="flex gap-6 items-center">
                    <div className="w-16 h-16 bg-zinc-900 border border-matrix-green flex items-center justify-center shadow-glow-green"><User size={32} className="text-matrix-green" /></div>
                    <div><h2 className="text-xl font-black uppercase text-matrix-green tracking-widest">{detailMember.name}</h2><p className="text-xs text-matrix-green/50 font-black uppercase italic tracking-[0.2em]">{detailMember.role}</p></div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="text-right"><p className="text-[10px] text-zinc-600 uppercase font-black">Burn_Total</p><p className="text-2xl font-black text-alert-pink">{(detailMember.totalSpent ?? 0).toLocaleString()} DP</p></div>
                    <button title="Download Audit" onClick={() => exportMemberPDF(detailMember)} className="p-2 border border-matrix-green/30 text-matrix-green/40 hover:text-matrix-green hover:border-matrix-green transition-all"><Download size={18} /></button>
                    {!isConfirmingDelete && <button title="Delete" onClick={() => setIsConfirmingDelete(true)} className="p-2 border border-alert-pink/30 text-alert-pink/40 hover:text-alert-pink hover:border-alert-pink transition-all"><Trash2 size={18} /></button>}
                  </div>
                  <button title="Close" onClick={handleCloseModal} className="ml-4 text-zinc-600 hover:text-alert-pink transition-colors"><X size={24} /></button>
                </div>
                
                <AnimatePresence>
                  {isConfirmingDelete && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-6 border border-alert-pink bg-alert-pink/5 p-6 overflow-hidden">
                      <div className="flex items-center gap-4 mb-4"><AlertTriangle className="text-alert-pink animate-pulse" size={24} /><div><p className="text-xs font-black uppercase text-alert-pink">Decommission_Sequence</p><p className="text-[9px] text-alert-pink/60 uppercase">Duit mau dibalikin atau dianggap hangus?</p></div></div>
                      <div className="flex gap-3">
                        <button title="Refund" onClick={() => handleDecommission(true)} className="flex-1 py-3 bg-matrix-green/20 border border-matrix-green text-matrix-green text-[9px] font-black uppercase hover:bg-matrix-green transition-all flex items-center justify-center gap-2"><RotateCcw size={12} /> REFUND</button>
                        <button title="Retain" onClick={() => handleDecommission(false)} className="flex-1 py-3 bg-alert-pink/20 border border-alert-pink text-alert-pink text-[9px] font-black uppercase hover:bg-alert-pink transition-all flex items-center justify-center gap-2"><Trash2 size={12} /> RETAIN</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-matrix-bg p-4 shadow-inner border border-matrix-border/50">
                   <table className="w-full text-[10px]">
                      <tbody className="divide-y divide-matrix-border/20">
                        {memberLogs?.map((log) => (
                          <tr key={log.id} className="hover:bg-matrix-green/5">
                            <td className="py-3 text-matrix-green/30 italic whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString('en-GB')}</td>
                            <td className="py-3 px-4"><span className={cn("px-2 py-0.5 border text-[8px] font-black uppercase", !log.memberId ? "border-zinc-700 text-zinc-700" : "border-alert-pink text-alert-pink")}>{!log.memberId ? "SHARED" : "DIRECT"}</span></td>
                            <td className="py-3 opacity-80 uppercase tracking-tighter truncate max-w-[200px]">"{log.context}"</td>
                            <td className="py-3 text-right font-black text-alert-pink">{(!log.memberId ? ((-log.value) / (activeProject?.members?.length || 1)) : -log.value).toLocaleString()} DP</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* --- MODAL 2: LOG AUDIT --- */}
        <AnimatePresence>
          {selectedLogId && detailLog && (
            <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/95 backdrop-blur-lg">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCloseModal} className="absolute inset-0" />
              <motion.div initial={{ scale: 0.8, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0 }} className="relative w-full max-w-md bg-matrix-card border border-matrix-green/50 p-8 shadow-[0_0_80px_rgba(0,255,156,0.1)]">
                <div className="flex justify-between items-center mb-8 border-b border-matrix-border pb-4">
                  <h2 className="text-xs font-black uppercase text-matrix-green tracking-[0.4em] flex items-center gap-3"><ShieldCheck size={16} /> Transaction_Audit</h2>
                  <button title="Close" onClick={handleCloseModal} className="text-zinc-600 hover:text-alert-pink"><X size={20} /></button>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-matrix-bg border border-matrix-border"><p className="text-[7px] text-zinc-600 uppercase font-black mb-1">Auth_Protocol</p><p className="text-[10px] font-black text-matrix-green">{detailLog.type}</p></div>
                    <div className="p-3 bg-matrix-bg border border-matrix-border"><p className="text-[7px] text-zinc-600 uppercase font-black mb-1">Time_Sync</p><p className="text-[10px] font-black text-white">{new Date(detailLog.timestamp).toLocaleTimeString('en-GB')}</p></div>
                  </div>
                  <div className="p-4 bg-matrix-bg border border-matrix-border relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-1 opacity-10"><Fingerprint size={40} /></div>
                    <p className="text-[7px] text-zinc-600 uppercase font-black mb-2">Identification_String</p>
                    <p className="text-sm font-black italic text-white uppercase tracking-tighter">"{detailLog.context}"</p>
                  </div>
                  <div className="p-4 border border-matrix-border bg-matrix-green/5">
                    <p className="text-[7px] text-zinc-600 uppercase font-black mb-2">Magnitude</p>
                    <p className={cn("text-3xl font-black tracking-tighter", detailLog.value < 0 ? "text-alert-pink" : "text-matrix-green")}>{detailLog.value.toLocaleString()} DP</p>
                    <div className="mt-4 pt-4 border-t border-matrix-border flex justify-between items-center"><span className="text-[8px] font-black text-zinc-500">Origin_Unit:</span><span className="text-[9px] font-black text-matrix-green uppercase">{detailLog.memberId ? activeProject?.members.find(m => m.id === detailLog.memberId)?.name : "SHARED_ALLOCATION"}</span></div>
                  </div>
                  <div className="text-[7px] text-zinc-700 font-bold uppercase tracking-[0.2em] text-center border-t border-matrix-border/30 pt-4">Hash: {crypto.randomUUID().split('-')[0].toUpperCase()} // AES-256</div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* --- MODAL 3: INPUT SEQUENCES --- */}
        <AnimatePresence>
          {modalType && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCloseModal} className="absolute inset-0" />
              <motion.div initial={{ scale: 0.9, opacity: 0, skewX: 10 }} animate={{ scale: 1, opacity: 1, skewX: 0 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm bg-matrix-card border border-matrix-border p-10 shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-matrix-green to-transparent opacity-50" />
                <h2 className="text-[12px] font-black uppercase text-matrix-green mb-8 border-b border-matrix-border pb-4 tracking-[0.4em] text-center">{modalType}_SEQUENCE</h2>
                <div className="space-y-6">
                  {modalType === "EXPENSE" && (
                    <div className="space-y-2">
                      <label className="text-[8px] uppercase font-black text-zinc-600 tracking-widest">Assign_Operative</label>
                      <select title="Select Unit" className="w-full bg-matrix-bg border border-matrix-border p-4 text-[10px] text-matrix-green outline-none appearance-none cursor-pointer focus:border-matrix-green font-bold" value={expenseMemberId} onChange={(e) => setExpenseMemberId(e.target.value)}>
                        <option value="">-- ALL UNITS (SHARED_SPLIT) --</option>
                        {activeProject?.members?.map(m => <option key={m.id} value={m.id}>{m.name} // {m.role}</option>)}
                      </select>
                    </div>
                  )}
                  <input autoFocus className="w-full bg-matrix-bg border border-matrix-border p-4 text-[10px] text-matrix-green outline-none focus:border-matrix-green font-bold uppercase" placeholder="Reason / Context" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  {(modalType === "EXPENSE" || modalType === "INJECTION") && (
                    <input type="number" className={cn("w-full bg-matrix-bg border border-matrix-border p-4 text-[10px] outline-none font-bold", modalType === "EXPENSE" ? "text-alert-pink focus:border-alert-pink" : "text-matrix-green focus:border-matrix-green")} placeholder="DP_Magnitude" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} />
                  )}
                  {modalType === "OPERATIVE" && (
                    <input className="w-full bg-matrix-bg border border-matrix-border p-4 text-[10px] text-white outline-none focus:border-white uppercase font-bold" placeholder="Designation" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} />
                  )}
                  <div className="flex gap-4 pt-4">
                    <button title="Execute" onClick={handleExecute} className={cn("flex-1 py-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-lg", modalType === "EXPENSE" ? "bg-alert-pink/20 border border-alert-pink text-alert-pink hover:bg-alert-pink hover:text-white" : "bg-matrix-green/20 border border-matrix-green text-matrix-green hover:bg-matrix-green hover:text-black shadow-glow-green")}>EXECUTE</button>
                    <button title="Abort" onClick={handleCloseModal} className="px-6 py-4 border border-zinc-800 text-zinc-600 text-[10px] font-black hover:bg-zinc-800 transition-all uppercase">Abort</button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}