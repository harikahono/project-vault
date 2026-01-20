import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Interface biar TypeScript gak berisik
interface Member {
  id: string;
  name: string;
  role: string;
  totalSpent: number;
  createdAt: string;
}

interface Log {
  id: string;
  timestamp: string;
  type: string;
  context: string;
  value: number;
  memberId?: string;
  participant_count: number;
}

// 1. FUNGSI LAPORAN FULL VAULT
export const generateFullVaultPDF = (activeProject: any) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFont("courier", "bold");
  doc.setFontSize(18);
  doc.text(`VAULT REPORT: ${activeProject.name.toUpperCase()}`, 14, 20);

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`HASH_SYNC: ${crypto.randomUUID().substring(0, 8)} | ${new Date().toLocaleString()}`, 14, 26);
  
  // --- SUMMARY BOX (Duit Lu Harusnya Berapa) ---
  doc.setDrawColor(0, 255, 156); 
  doc.setLineWidth(0.5);
  doc.rect(14, 32, 180, 22); 
  
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("VERIFIED_VAULT_BALANCE", 20, 40);
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(`${activeProject.balance.toLocaleString()} DP`, 20, 48);
  
  doc.setFontSize(8);
  doc.text(`TOTAL_OPERATIVES: ${activeProject.members.length}`, 140, 40);
  doc.text(`TOTAL_LOG_ENTRIES: ${activeProject.logs.length}`, 140, 45);

  // Tabel Unit
  autoTable(doc, {
    startY: 60,
    head: [['UNIT', 'ROLE', 'BURNED_RESOURCES']],
    body: (activeProject.members || []).map((m: Member) => [
      m.name, 
      m.role, 
      `${m.totalSpent.toLocaleString()} DP`
    ]),
    headStyles: { fillColor: [0, 255, 156], textColor: [0, 0, 0] },
    styles: { font: "courier" }
  });

  // Tabel Ledger
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['TIMESTAMP', 'TYPE', 'CONTEXT', 'MAGNITUDE']],
    body: (activeProject.logs || []).map((l: Log) => [
      new Date(l.timestamp).toLocaleTimeString('en-GB'), 
      l.type, 
      l.context, 
      `${l.value.toLocaleString()} DP`
    ]),
    headStyles: { fillColor: [40, 40, 40] },
    styles: { font: "courier" }
  });

  doc.save(`VAULT_${activeProject.name}_FULL.pdf`);
};

// 2. FUNGSI AUDIT UNIT (PER ORANG)
export const generateMemberAuditPDF = (member: Member, activeProject: any) => {
  const doc = new jsPDF();
  
  doc.setFont("courier", "bold");
  doc.setFontSize(16);
  doc.text(`UNIT_AUDIT_DUMP: ${member.name.toUpperCase()}`, 14, 20);
  
  // Filter log yang relevan buat si member (termasuk shared expense masa lalu)
  const logs = activeProject.logs.filter((l: Log) => 
    l.memberId === member.id || 
    (!l.memberId && l.type === 'EXPENSE' && new Date(l.timestamp).getTime() >= (new Date(member.createdAt).getTime() - 2000))
  );

  autoTable(doc, {
    startY: 35,
    head: [['TIME', 'AUTH', 'CONTEXT', 'PERSONAL_BURN']],
    body: logs.map((l: Log) => {
      // FIX: Pake participant_count biar angka di PDF akurat
      const val = !l.memberId ? ((-l.value) / (l.participant_count || 1)) : -l.value;
      return [
        new Date(l.timestamp).toLocaleTimeString('en-GB'), 
        !l.memberId ? "SHARED" : "DIRECT", 
        l.context, 
        `${val.toLocaleString()} DP`
      ];
    }),
    headStyles: { fillColor: [255, 46, 99] },
    styles: { font: "courier" }
  });

  doc.save(`AUDIT_${member.name}.pdf`);
};