Beres, Bos! Ini versi Markdown (`.md`) murni buat lu. Gue udah bikinin **ASCII Art** yang gahar di paling atas biar pas orang buka repo lu di GitHub, langsung berasa aura terminal *hacker*.

Silakan lu salin semua teks di bawah ini ke file `README.md` lu:

---

```markdown
# 🟢 VAULT // BY HARIKAHONO

```text
██    ██  █████  ██    ██ ██      ████████ 
██    ██ ██   ██ ██    ██ ██         ██    
██    ██ ███████ ██    ██ ██         ██    
██    ██ ██   ██ ██    ██ ██         ██    
 ██████  ██   ██  ██████  ███████    ██    
                                           
 >> TACTICAL_LEDGER_INTERFACE_V1.0
 >> ARCHITECT: HARIKAHONO
 >> STATUS: ENCRYPTED // LINK_STABLE

```

**Vault** adalah sistem manajemen sumber daya taktis (tactical ledger) berperforma tinggi yang dirancang untuk Netrunners dan Tim Operatif. Dibangun dengan estetika **Arasaka HUD**, aplikasi ini memungkinkan monitoring alokasi dana, pelacakan *burn rate* unit, dan audit transaksi dengan presisi nol-latensi.

---

## ⚡ CORE PROTOCOLS

* **Multi-Vault Infrastructure**: Inisialisasi dan kelola beberapa proyek aman sekaligus dalam satu terminal dashboard.
* **Core Integrity Tracking**: Monitoring saldo utama secara real-time dengan indikator stabilitas pulse.
* **Operative-Linked Ledger**: Hubungkan pengeluaran ke anggota unit spesifik atau jalankan protokol **SHARED_SPLIT** untuk pembagian rata biaya tim secara otomatis.
* **Unit Decommissioning**: Terminasi link anggota dengan opsi protokol **REFUND** (duit balik ke kas) atau **RETAIN** (anggap hangus sebagai biaya operasional).
* **Advanced Audit Modules**: Klik entri log manapun atau kartu anggota untuk membedah data audit transaksi secara mendalam (Transaction Hash & Auth Protocol).
* **Data Extraction**: Ekspor laporan PDF terenkripsi untuk seluruh Ledger proyek atau laporan audit khusus per individu unit.
* **Tactical UI**: Interface imersif dengan *scanline overlays*, efek *digital glitch*, dan skema warna *Matrix-Green*.

---

## 🛠 TECH STACK

| Component | Technology |
| --- | --- |
| **Framework** | [Tauri](https://tauri.app/) (Desktop-Native Desktop App) |
| **Frontend** | React + TypeScript + Vite |
| **State Management** | Zustand (Persistent Storage Protocol) |
| **Animations** | Framer Motion (Glitch & Skew FX) |
| **Styling** | Tailwind CSS (Custom Arasaka Theme) |
| **Reporting** | jsPDF + AutoTable |

---

## 🚀 INITIALIZATION

Pastikan terminal lu sudah terpasang `pnpm`.

1. **Clone Terminal**:
```bash
git clone [https://github.com/harikahono/project-vault.git](https://github.com/harikahono/project-vault.git)
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

## 📜 SYSTEM LOG NOTES

* **Storage Logic**: Saat ini data masih tersimpan melalui `localStorage` (Zustand Persist).
* **Privacy**: Semua data bersifat lokal; tidak ada transmisi eksternal yang terdeteksi.
* **Update Roadmap**: Integrasi SQLite untuk integritas data relasional dan performa kelas perusahaan.

---

**Developed by [harikahono**](https://www.google.com/search?q=https://github.com/harikahono)
*“Secure the funds. Track the burn. Rule the sprawl.”*

```