"use client"
import { AnimatePresence, motion } from "framer-motion";
import { FolderPlus, Loader2 } from 'lucide-react'; // FIX: Tambah Loader2 di sini
import { useVault } from "@/store/useVault";
import { useState, useEffect, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Modular Components
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import BalanceCard from "@/components/dashboard/BalanceCard";
import MemberGrid from "@/components/dashboard/MemberGrid";
import LedgerStream from "@/components/dashboard/LedgerStream";
import CommandPanel from "@/components/layout/CommandPanel";

// Modals
import ActionModal from "@/components/modals/ActionModal";
import MemberAuditModal from "@/components/modals/MemberAuditModal";
import LogAuditModal from "@/components/modals/LogAuditModal";

export default function VaultPage() {
  const { 
    projects, activeProjectId, setActiveProject, 
    addProject, deleteProject, addMember, addExpense, deleteMember, deleteLog,
    fetchProjects, isLoading, isProcessing 
  } = useVault();
  
  const activeProject = projects?.find(p => p.id === activeProjectId);

  // UI STATE
  const [modalType, setModalType] = useState<"PROJECT" | "OPERATIVE" | "EXPENSE" | "INJECTION" | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", role: "", amount: "" });
  const [expenseMemberId, setExpenseMemberId] = useState("");

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    if (downloadStatus) {
      const timer = setTimeout(() => setDownloadStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [downloadStatus]);

  // DERIVED DATA
  const detailMember = useMemo(() => activeProject?.members?.find((m: any) => m.id === selectedMemberId), [activeProject, selectedMemberId]);
  const detailLog = useMemo(() => activeProject?.logs?.find((l: any) => l.id === selectedLogId), [activeProject, selectedLogId]);
  
  const memberLogs = useMemo(() => {
    if (!detailMember || !activeProject) return [];
    return activeProject.logs.filter((l: any) => {
      if (l.memberId === selectedMemberId) return true;
      if (!l.memberId && l.type === 'EXPENSE') {
        const logTime = new Date(l.timestamp).getTime();
        const joinTime = new Date(detailMember.createdAt).getTime();
        return !isNaN(logTime) && !isNaN(joinTime) && logTime >= (joinTime - 2000);
      }
      return false;
    });
  }, [activeProject, detailMember, selectedMemberId]);

  // HANDLERS
  const handleCloseModals = () => {
    if (isProcessing) return;
    setModalType(null); setSelectedMemberId(null); setSelectedLogId(null);
    setFormData({ name: "", role: "", amount: "" }); setExpenseMemberId("");
  };

  const handleExecute = async () => {
    if (isProcessing) return;
    // Guard untuk TypeScript: Mencegah eksekusi jika activeProject undefined kecuali untuk proyek baru
    if (!activeProject && modalType !== "PROJECT") return;

    const cleanAmount = formData.amount.toString().replace(/\./g, '');
    const amountNum = parseInt(cleanAmount) || 0;
    
    try {
      if (modalType === "PROJECT" && formData.name) {
        await addProject(formData.name);
      } else if (activeProject) { // Guard tambahan untuk TS
        if (modalType === "OPERATIVE" && formData.name) await addMember(activeProject.id, formData.name, formData.role || "UNIT");
        else if (modalType === "INJECTION" && amountNum !== 0) await addExpense(activeProject.id, -amountNum, formData.name || "Initial Injection");
        else if (modalType === "EXPENSE" && amountNum !== 0) await addExpense(activeProject.id, amountNum, formData.name || "Operation Log", expenseMemberId);
      }
      handleCloseModals();
    } catch (err) { console.error(err); }
  };

  const exportFullPDF = () => {
    if (!activeProject) return;
    const doc = new jsPDF();
    doc.setFont("courier", "bold");
    doc.text(`VAULT REPORT: ${activeProject.name.toUpperCase()}`, 14, 20);
    autoTable(doc, {
      startY: 30, head: [['UNIT', 'ROLE', 'BURNED']],
      body: (activeProject.members || []).map((m: any) => [m.name, m.role, `${(m.totalSpent ?? 0).toLocaleString()} DP`]),
      headStyles: { fillColor: [0, 255, 156], textColor: [0, 0, 0] }
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10, head: [['TIME', 'TYPE', 'CONTEXT', 'VALUE']],
      body: (activeProject.logs || []).map((l: any) => [new Date(l.timestamp).toLocaleTimeString('en-GB'), l.type, l.context, l.value.toLocaleString()]),
    });
    doc.save(`VAULT_${activeProject.name}.pdf`);
    setDownloadStatus("FULL_LEDGER_EXTRACTED");
  };

  const exportMemberPDF = (member: any) => {
    if (!activeProject || !member) return;
    const doc = new jsPDF();
    doc.setFont("courier", "bold");
    doc.text(`UNIT AUDIT: ${member.name.toUpperCase()}`, 14, 20);
    const logs = activeProject.logs.filter((l: any) => l.memberId === member.id || (!l.memberId && l.type === 'EXPENSE' && new Date(l.timestamp).getTime() >= (new Date(member.createdAt).getTime() - 2000)));
    autoTable(doc, {
      startY: 40, head: [['TIME', 'AUTH', 'CONTEXT', 'MAGNITUDE']],
      body: logs.map((l: any) => [new Date(l.timestamp).toLocaleTimeString('en-GB'), !l.memberId ? "SHARED" : "DIRECT", l.context, `${(!l.memberId ? ((-l.value) / (activeProject.members.length || 1)) : -l.value).toLocaleString()} DP`]),
      headStyles: { fillColor: [255, 46, 99] }
    });
    doc.save(`AUDIT_${member.name}.pdf`);
    setDownloadStatus(`UNIT_${member.name.toUpperCase()}_DUMPED`);
  };

  return (
    <div className="flex h-screen w-screen bg-matrix-bg font-mono text-white overflow-hidden select-none relative">
      <div className="absolute inset-0 pointer-events-none scanline opacity-30 z-[100]" />
      
      <Sidebar 
        projects={projects} 
        activeProjectId={activeProjectId} 
        setActiveProject={setActiveProject} 
        deleteProject={deleteProject} 
        onInitProject={() => setModalType("PROJECT")} 
      />

      <main className="flex-1 flex flex-col p-6 gap-6 min-w-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {isLoading ? (
             <div key="loading" className="h-full flex flex-col items-center justify-center text-center">
               <Header projectName="SYNCING..." onExportPDF={() => {}} />
               <Loader2 size={48} className="text-matrix-green animate-spin mb-4 opacity-20" />
             </div>
          ) : activeProject ? (
            <motion.div key={activeProject.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col gap-6 overflow-hidden">
              <Header projectName={activeProject.name} onExportPDF={exportFullPDF} />
              <div className="flex-1 grid grid-cols-12 grid-rows-6 gap-6 overflow-hidden min-h-0">
                <BalanceCard balance={activeProject.balance ?? 0} />
                <MemberGrid 
                  members={activeProject.members} 
                  projectBalance={activeProject.balance} 
                  onMemberClick={setSelectedMemberId} 
                  onAddUnit={() => setModalType("OPERATIVE")} 
                />
                <LedgerStream logs={activeProject.logs} onLogClick={setSelectedLogId} />
                <CommandPanel onInjection={() => setModalType("INJECTION")} onExpense={() => setModalType("EXPENSE")} />
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12">
              <FolderPlus size={64} className="text-matrix-green/20 mb-8 animate-pulse" />
              <h2 className="text-xl font-black italic uppercase tracking-[0.5em] text-matrix-green">Vault_By_harikahono</h2>
              <button onClick={() => setModalType("PROJECT")} className="mt-10 px-12 py-4 border border-matrix-green text-matrix-green text-[10px] font-black tracking-[0.5em] hover:bg-matrix-green hover:text-black transition-all shadow-glow-green">INITIALIZE_NEW_VAULT</button>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals Container */}
      <AnimatePresence>
        {selectedMemberId && detailMember && activeProject && (
          <MemberAuditModal 
            isOpen={!!selectedMemberId} 
            member={detailMember} 
            logs={memberLogs} 
            isProcessing={isProcessing} 
            onClose={handleCloseModals} 
            onExportPDF={exportMemberPDF} 
            onDecommission={(refund) => deleteMember(activeProject.id, selectedMemberId, refund)} 
            memberCount={activeProject.members?.length ?? 0} // FIX: Tambah fallback ?? 0
          />
        )}
        
        {selectedLogId && detailLog && activeProject && (
          <LogAuditModal 
            isOpen={!!selectedLogId} 
            log={detailLog} 
            isProcessing={isProcessing} 
            onClose={handleCloseModals} 
            onVoid={() => deleteLog(activeProject.id, selectedLogId)} 
            activeMembers={activeProject.members ?? []} // FIX: Tambah fallback ?? []
          />
        )}

        {modalType && (
          <ActionModal 
            isOpen={!!modalType} 
            type={modalType} 
            formData={formData} 
            setFormData={setFormData} 
            expenseMemberId={expenseMemberId} 
            setExpenseMemberId={setExpenseMemberId} 
            activeProject={activeProject} 
            isProcessing={isProcessing} 
            onClose={handleCloseModals} 
            onExecute={handleExecute} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}