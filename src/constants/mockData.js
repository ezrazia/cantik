/**
 * @module constants/mockData
 * Data mock (simulasi) yang digunakan di seluruh aplikasi selama pengembangan.
 * Nantinya data ini akan digantikan oleh data dari API backend.
 */

/**
 * Data petugas lapangan beserta progress pencacahan.
 * @type {Array<{name: string, desa: string, target: number, selesai: number, sync: string, status: string}>}
 */
const PETUGAS_DATA = [
  { name:"Budi Santoso",   desa:"Harapan Jaya", target:15, selesai:12, sync:"2j lalu", status:"active"  },
  { name:"Siti Rahayu",    desa:"Maju Bersama", target:12, selesai:12, sync:"1j lalu", status:"done"    },
  { name:"Agus Prasetyo",  desa:"Sejahtera",    target:18, selesai:7,  sync:"5j lalu", status:"active"  },
  { name:"Dewi Lestari",   desa:"Harapan Jaya", target:15, selesai:9,  sync:"3j lalu", status:"active"  },
  { name:"Rudi Hermawan",  desa:"Maju Bersama", target:12, selesai:3,  sync:"8j lalu", status:"active"  },
];

/**
 * Data desa dengan target dan progress pencacahan.
 * @type {Array<{name: string, target: number, selesai: number, color: string}>}
 */
const DESA_DATA = [
  { name:"Desa Harapan Jaya", target:30, selesai:21, color:"#2563eb" },
  { name:"Desa Maju Bersama", target:24, selesai:15, color:"#0891b2" },
  { name:"Desa Sejahtera",    target:36, selesai:19, color:"#7c3aed" },
];

/**
 * Data chart batang harian (kiriman dokumen per hari).
 * @type {Array<{h: string, k: number, t: number}>}
 */
const CHART_DATA = [
  {h:"Sen",k:8,t:1},{h:"Sel",k:12,t:2},{h:"Rab",k:15,t:1},
  {h:"Kam",k:10,t:3},{h:"Jum",k:18,t:0},{h:"Sab",k:7,t:1},
];

/**
 * Data pie chart status dokumen.
 * @type {Array<{name: string, value: number, color: string}>}
 */
const PIE_DATA = [
  { name:"Disetujui", value:55, color:"#16a34a" },
  { name:"Pending",   value:25, color:"#f59e0b" },
  { name:"Ditolak",   value:12, color:"#dc2626" },
  { name:"Draft",     value:8,  color:"#94a3b8" },
];

/**
 * Data awal respons/dokumen untuk halaman Review Data.
 * @type {Array<{id: string, petugas: string, desa: string, tgl: string, status: string, flag: number}>}
 */
const RESPONSES_INIT = [
  { id:"R-0231", petugas:"Budi Santoso",  desa:"Harapan Jaya", tgl:"10/05/26", status:"submitted", flag:2, isPrelist: true },
  { id:"R-0232", petugas:"Siti Rahayu",   desa:"Maju Bersama", tgl:"09/05/26", status:"approved",  flag:0, isPrelist: true },
  { id:"R-0233", petugas:"Agus Prasetyo", desa:"Sejahtera",    tgl:"07/05/26", status:"pml_approved",  flag:5, isPrelist: true },
  { id:"R-0234", petugas:"Dewi Lestari",  desa:"Harapan Jaya", tgl:"10/05/26", status:"submitted", flag:1, isPrelist: false },
  { id:"R-0235", petugas:"Rudi Hermawan", desa:"Maju Bersama", tgl:"09/05/26", status:"menunggu",     flag:0, isPrelist: true },
  { id:"R-0236", petugas:"Budi Santoso",  desa:"Harapan Jaya", tgl:"11/05/26", status:"menunggu",     flag:0, isPrelist: true },
  { id:"R-0237", petugas:"Siti Rahayu",   desa:"Maju Bersama", tgl:"11/05/26", status:"pml_approved",  flag:1, isPrelist: false },
  { id:"R-0238", petugas:"Agus Prasetyo", desa:"Sejahtera",    tgl:"12/05/26", status:"approved",  flag:0, isPrelist: false },
];

/**
 * Data awal pertanyaan kuesioner untuk Form Builder.
 * @type {Array<{id: number, r: string, label: string, type: string, req: boolean, val: string|null, skip: string|null}>}
 */
const FORM_QS_INIT = [
  { id:1, r:"301", label:"Nama Kepala Rumah Tangga",    type:"text",   req:true,  val:null,           skip:null },
  { id:2, r:"302", label:"Hubungan dengan KRT",         type:"select", req:true,  val:null,           skip:null },
  { id:3, r:"303", label:"Jenis Kelamin",               type:"radio",  req:true,  val:null,           skip:null },
  { id:4, r:"304", label:"Umur (tahun)",                type:"number", req:true,  val:"range: 0–120", skip:null },
  { id:5, r:"305", label:"Status Perkawinan",           type:"radio",  req:true,  val:null,           skip:null },
  { id:6, r:"306", label:"Pendidikan Tertinggi",        type:"select", req:true,  val:null,           skip:null },
  { id:7, r:"307", label:"Bekerja seminggu terakhir?",  type:"radio",  req:true,  val:null,           skip:null },
  { id:8, r:"308", label:"Lapangan Usaha Utama",        type:"text",   req:false, val:null,           skip:"Aktif jika r307 = 1 (Ya)" },
];

/**
 * Data daftar rumah tangga untuk halaman Petugas Home.
 * @type {Array<{id: string, krt: string, alamat: string, status: string, sync: boolean}>}
 */
const RT_LIST = [
  { id:"RT-001", krt:"Ahmad Subagyo",  alamat:"Jl. Melati No. 12",   status:"selesai",  sync:true  },
  { id:"RT-002", krt:"Slamet Widodo",  alamat:"Jl. Mangga No. 5",    status:"progress", sync:false },
  { id:"RT-003", krt:"Ika Wahyuni",    alamat:"Jl. Rambutan No. 8",  status:"belum",    sync:false },
  { id:"RT-004", krt:"Bambang Susilo", alamat:"Jl. Durian No. 3",    status:"belum",    sync:false },
  { id:"RT-005", krt:"Nurhayati",      alamat:"Jl. Nangka No. 15",   status:"belum",    sync:false },
];

/**
 * Data antrian sinkronisasi dokumen untuk halaman Petugas Sync.
 * Sebelumnya inline di PetugasSync.jsx, dipindahkan ke sini untuk konsistensi.
 * @type {Array<{id: number, name: string, status: string, date: string}>}
 */
const SYNC_ITEMS = [
  { id: 1, name: "RT-001 (Ahmad Subagyo)", status: "ready", date: "10/05/2026 14:20" },
  { id: 2, name: "RT-003 (Slamet Widodo)", status: "ready", date: "11/05/2026 09:15" },
  { id: 3, name: "RT-005 (Ika Wahyuni)", status: "synced", date: "08/05/2026 16:45" },
  { id: 4, name: "RT-007 (Siti Aminah)", status: "ready", date: "12/05/2026 08:30" },
];

export { PETUGAS_DATA, DESA_DATA, CHART_DATA, PIE_DATA, RESPONSES_INIT, FORM_QS_INIT, RT_LIST, SYNC_ITEMS };