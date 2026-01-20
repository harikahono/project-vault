# VAULT // BY HARIKAHONO

```
██      ██  █████   ██      ██ ██      ████████ 
██      ██ ██   ██  ██      ██ ██         ██    
██      ██ ███████  ██      ██ ██         ██    
██      ██ ██   ██  ██      ██ ██         ██    
  ██████   ██   ██   ██████   ███████     ██    
                                               
 >> TACTICAL_LEDGER_INTERFACE_V2.0
 >> ARCHITECT: HARIKAHONO
 >> STATUS: ENCRYPTED // LINK_STABLE
 >> DATABASE: SQLITE_ACTIVE

```

**Vault** adalah sistem manajemen sumber daya taktis (tactical ledger) berperforma tinggi yang dirancang untuk Netrunners dan Tim Operatif. Dibangun dengan estetika **Arasaka HUD**, aplikasi ini memungkinkan monitoring alokasi dana, pelacakan *burn rate* unit, dan audit transaksi dengan presisi nol-latensi.

---

## CORE_PROTOCOLS

* **Multi-Vault Infrastructure**: Inisialisasi dan kelola beberapa proyek aman sekaligus dalam satu terminal dashboard.
* **Core Integrity Tracking**: Monitoring saldo utama secara real-time dengan indikator stabilitas pulse.
* **Operative-Linked Ledger**: Hubungkan pengeluaran ke anggota unit spesifik atau jalankan protokol **SHARED_SPLIT** untuk pembagian rata biaya tim secara otomatis.
* **Historical Accuracy**: Menggunakan sistem `participant_count` untuk memastikan perhitungan saldo tetap akurat meskipun jumlah anggota tim berubah di masa depan.
* **Unit Decommissioning**: Terminasi link anggota dengan opsi protokol **REFUND** (pengembalian dana ke kas) atau **RETAIN** (biaya hangus).
* **Advanced Audit Modules**: Modul audit mendalam untuk membedah histori transaksi per anggota (Transaction Hash & Auth Protocol).
* **Data Extraction**: Ekspor laporan PDF terenkripsi dengan **Verified Balance Summary** untuk seluruh ledger proyek atau laporan audit khusus per individu unit.

---

## TECH_STACK

| Component | Technology |
| --- | --- |
| **Framework** | [Tauri](https://tauri.app/) (Desktop-Native) |
| **Frontend** | React + TypeScript + Vite |
| **Database** | SQLite via Tauri-Plugin-SQL (Migration-Ready) |
| **State Management** | Zustand (Internal Store Protocol) |
| **Animations** | Framer Motion (CRT & Glitch FX) |
| **Styling** | Tailwind CSS (Custom Arasaka Theme) |
| **Reporting** | jsPDF + AutoTable |

---

## INITIALIZATION

Pastikan terminal lu sudah terpasang `pnpm`.

1. **Clone Terminal**:

```bash
git clone https://github.com/harikahono/project-vault.git
cd project-vault

```

2. **Install Dependencies**:

```bash
pnpm install

```

3. **Launch HUD (Development)**:

```bash
pnpm tauri dev

```

4. **Compile Production**:

```bash
pnpm tauri build

```

---

## SYSTEM_LOG_NOTES

* **Storage Logic**: Data dikelola secara relasional melalui SQLite (`vaulthk.db`) dengan dukungan skema migrasi otomatis v1 & v2.
* **Privacy**: Semua data bersifat lokal; tidak ada transmisi eksternal yang terdeteksi di luar enkripsi PDF.
* **Performance**: Mendukung **Write-Ahead Logging (WAL)** untuk operasi I/O database yang cepat dan anti-locking.

---

**Developed by [harikahono**](https://www.google.com/search?q=https://github.com/harikahono)
*"Secure the funds. Track the burn. Rule the sprawl."*

---