"use client"
import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FolderPlus, Loader2, FileCheck } from 'lucide-react';

import { useVault } from "@/store/useVault";
import { generateFullVaultPDF, generateMemberAuditPDF } from "@/lib/pdf"; 

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import BalanceCard from "@/components/dashboard/BalanceCard";
import MemberGrid from "@/components/dashboard/MemberGrid";
import LedgerStream from "@/components/dashboard/LedgerStream";
import CommandPanel from "@/components/layout/CommandPanel";
import MemberAuditModal from "@/components/modals/MemberAuditModal";
import LogAuditModal from "@/components/modals/LogAuditModal";
import ActionModal from "@/components/modals/ActionModal";

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
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null); // State untuk Toast
  const [formData, setFormData] = useState({ name: "", role: "", amount: "" });
  const [expenseMemberId, setExpenseMemberId] = useState("");

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // Logic untuk auto-hide toast setelah 3 detik
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
    if (isProcessing || (!activeProject && modalType !== "PROJECT")) return;
    const amountNum = parseInt(formData.amount.toString().replace(/\./g, '')) || 0;
    try {
      if (modalType === "PROJECT" && formData.name) await addProject(formData.name);
      else if (activeProject) {
        if (modalType === "OPERATIVE" && formData.name) await addMember(activeProject.id, formData.name, formData.role || "UNIT");
        else if (modalType === "INJECTION" && amountNum !== 0) await addExpense(activeProject.id, -amountNum, formData.name || "Initial Injection");
        else if (modalType === "EXPENSE" && amountNum !== 0) await addExpense(activeProject.id, amountNum, formData.name || "Operation Log", expenseMemberId);
      }
      handleCloseModals();
    } catch (err) { console.error(err); }
  };

  // PDF HANDLERS WITH TOAST TRIGGER
  const exportFullPDF = () => {
    if (!activeProject) return;
    generateFullVaultPDF(activeProject);
    setDownloadStatus("FULL_LEDGER_EXTRACTED");
  };

  const exportMemberPDF = (member: any) => {
    if (!activeProject || !member) return;
    generateMemberAuditPDF(member, activeProject);
    setDownloadStatus(`UNIT_${member.name.toUpperCase()}_DUMPED`);
  };

  return (
    <div className="flex h-screen w-screen bg-matrix-bg font-mono text-white overflow-hidden select-none relative">
      <div className="absolute inset-0 pointer-events-none scanline opacity-30 z-[100]" />
      
      <Sidebar 
        projects={projects} activeProjectId={activeProjectId} 
        setActiveProject={setActiveProject} deleteProject={deleteProject} 
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
                  members={activeProject.members} projectBalance={activeProject.balance} 
                  onMemberClick={setSelectedMemberId} onAddUnit={() => setModalType("OPERATIVE")} 
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

      {/* MODALS CONTAINER */}
      <AnimatePresence>
        {selectedMemberId && detailMember && activeProject && (
          <MemberAuditModal 
            isOpen={!!selectedMemberId} member={detailMember} logs={memberLogs} 
            isProcessing={isProcessing} onClose={handleCloseModals} onExportPDF={exportMemberPDF} 
            onDecommission={(refund) => deleteMember(activeProject.id, selectedMemberId, refund)}
            memberCount={activeProject.members.length} 
          />
        )}
        {selectedLogId && detailLog && activeProject && (
          <LogAuditModal 
            isOpen={!!selectedLogId} log={detailLog} isProcessing={isProcessing} 
            onClose={handleCloseModals} onVoid={() => deleteLog(activeProject.id, selectedLogId)} 
            activeMembers={activeProject.members}
          />
        )}
        {modalType && (
          <ActionModal 
            isOpen={!!modalType} type={modalType} formData={formData} setFormData={setFormData} 
            expenseMemberId={expenseMemberId} setExpenseMemberId={setExpenseMemberId} 
            activeProject={activeProject} isProcessing={isProcessing} 
            onClose={handleCloseModals} onExecute={handleExecute} 
          />
        )}
      </AnimatePresence>

      {/* GLOBAL TRANSMISSION TOAST - MATRIX THEMED */}
      <AnimatePresence>
        {downloadStatus && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: "-50%", scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.2 } }} 
            className="fixed bottom-10 left-1/2 z-[1000] flex items-center gap-4 bg-matrix-card border border-matrix-green p-5 shadow-glow-green min-w-[300px]"
          >
            <div className="p-2 bg-matrix-green/10 border border-matrix-green">
              <FileCheck className="text-matrix-green animate-pulse" size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-matrix-green tracking-[0.2em]">Transmission_Success</span>
              <span className="text-[8px] text-zinc-500 uppercase font-black truncate max-w-[200px]">{downloadStatus}</span>
            </div>
            <div className="ml-auto w-1 h-8 bg-matrix-green shadow-glow-green" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}