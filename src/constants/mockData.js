/**
 * @module constants/mockData
 * Data mock (simulasi) yang digunakan di seluruh aplikasi selama pengembangan.
 * Menyediakan fungsi getter untuk mensimulasikan kueri database.
 */

// Internal database state
let petugasData = [
  { name: "Budi Santoso",   desa: "Tideng Pale", target: 15, selesai: 12, sync: "2j lalu", status: "active"  },
  { name: "Siti Rahayu",    desa: "Tideng Pale", target: 12, selesai: 12, sync: "1j lalu", status: "done"    },
  { name: "Agus Prasetyo",  desa: "Limbu Sedulun", target: 18, selesai: 7,  sync: "5j lalu", status: "active"  },
  { name: "Dewi Lestari",   desa: "Tideng Pale", target: 15, selesai: 9,  sync: "3j lalu", status: "active"  },
  { name: "Rudi Hermawan",  desa: "Sesayap Hilir", target: 12, selesai: 3,  sync: "8j lalu", status: "active"  },
];

let desaData = [
  { name: "Desa Tideng Pale", target: 30, selesai: 24, color: "#2563eb" },
  { name: "Desa Sesayap Hilir", target: 24, selesai: 15, color: "#0891b2" },
  { name: "Desa Limbu Sedulun", target: 36, selesai: 19, color: "#7c3aed" },
  { name: "Desa Tanah Merah", target: 20, selesai: 15, color: "#10b981" },
  { name: "Desa Seludau", target: 15, selesai: 10, color: "#ec4899" }, // Seludim -> Seludau under Sesayap Hilir
];

let chartData = [
  { h: "Sen", k: 8, t: 1 }, { h: "Sel", k: 12, t: 2 }, { h: "Rab", k: 15, t: 1 },
  { h: "Kam", k: 10, t: 3 }, { h: "Jum", k: 18, t: 0 }, { h: "Sab", k: 7, t: 1 },
];

let pieData = [
  { name: "Disetujui", value: 55, color: "#16a34a" },
  { name: "Pending",   value: 25, color: "#f59e0b" },
  { name: "Ditolak",   value: 12, color: "#dc2626" },
  { name: "Draft",     value: 8,  color: "#94a3b8" },
];

let responsesInit = [
  { id: "R-0231", petugas: "Budi Santoso",  desa: "Tideng Pale", tgl: "10/05/26", status: "submitted", flag: 2, isPrelist: true, sls: "SLS 01 Tideng Pale", subSls: "RT 01 A Tideng Pale" },
  { id: "R-0232", petugas: "Siti Rahayu",   desa: "Tideng Pale", tgl: "09/05/26", status: "approved",  flag: 0, isPrelist: true, sls: "SLS 01 Tideng Pale", subSls: "RT 01 B Tideng Pale" },
  { id: "R-0233", petugas: "Agus Prasetyo", desa: "Limbu Sedulun", tgl: "07/05/26", status: "pml_approved",  flag: 5, isPrelist: true, sls: "SLS 01 Limbu Sedulun", subSls: "" },
  { id: "R-0234", petugas: "Dewi Lestari",  desa: "Tideng Pale", tgl: "10/05/26", status: "submitted", flag: 1, isPrelist: false, sls: "SLS 02 Tideng Pale", subSls: "" },
  { id: "R-0235", petugas: "Rudi Hermawan", desa: "Sesayap Hilir", tgl: "09/05/26", status: "menunggu",     flag: 0, isPrelist: true, sls: "SLS 01 Sesayap Hilir", subSls: "" },
  { id: "R-0236", petugas: "Budi Santoso",  desa: "Tideng Pale", tgl: "11/05/26", status: "menunggu",     flag: 0, isPrelist: true, sls: "SLS 01 Tideng Pale", subSls: "RT 01 A Tideng Pale" },
  { id: "R-0237", petugas: "Siti Rahayu",   desa: "Tideng Pale", tgl: "11/05/26", status: "pml_approved",  flag: 1, isPrelist: false, sls: "SLS 02 Tideng Pale", subSls: "" },
  { id: "R-0238", petugas: "Agus Prasetyo", desa: "Limbu Sedulun", tgl: "12/05/26", status: "approved",  flag: 0, isPrelist: false, sls: "SLS 02 Limbu Sedulun", subSls: "" },
];

let formQsInit = [
  { id: 1, r: "301", label: "Nama Kepala Rumah Tangga",    type: "text",   req: true,  val: null,           skip: null },
  { id: 2, r: "302", label: "Hubungan dengan KRT",         type: "select", req: true,  val: null,           skip: null },
  { id: 3, r: "303", label: "Jenis Kelamin",               type: "radio",  req: true,  val: null,           skip: null },
  { id: 4, r: "304", label: "Umur (tahun)",                type: "number", req: true,  val: "range: 0–120", skip: null },
  { id: 5, r: "305", label: "Status Perkawinan",           type: "radio",  req: true,  val: null,           skip: null },
  { id: 6, r: "306", label: "Pendidikan Tertinggi",        type: "select", req: true,  val: null,           skip: null },
  { id: 7, r: "307", label: "Bekerja seminggu terakhir?",  type: "radio",  req: true,  val: null,           skip: null },
  { id: 8, r: "308", label: "Lapangan Usaha Utama",        type: "text",   req: false, val: null,           skip: "Aktif jika r307 = 1 (Ya)" },
];

let rtList = [
  { id: "RT-001", krt: "Ahmad Subagyo",  alamat: "Jl. Melati No. 12",   status: "selesai",  sync: true  },
  { id: "RT-002", krt: "Slamet Widodo",  alamat: "Jl. Mangga No. 5",    status: "progress", sync: false },
  { id: "RT-003", krt: "Ika Wahyuni",    alamat: "Jl. Rambutan No. 8",  status: "belum",    sync: false },
  { id: "RT-004", krt: "Bambang Susilo", alamat: "Jl. Durian No. 3",    status: "belum",    sync: false },
  { id: "RT-005", krt: "Nurhayati",      alamat: "Jl. Nangka No. 15",   status: "belum",    sync: false },
];

let syncItems = [
  { id: 1, name: "RT-001 (Ahmad Subagyo)", status: "ready", date: "10/05/2026 14:20" },
  { id: 2, name: "RT-003 (Slamet Widodo)", status: "ready", date: "11/05/2026 09:15" },
  { id: 3, name: "RT-005 (Ika Wahyuni)", status: "synced", date: "08/05/2026 16:45" },
  { id: 4, name: "RT-007 (Siti Aminah)", status: "ready", date: "12/05/2026 08:30" },
];

// Helper functions to simulate database query operations
export const getPetugasData = () => JSON.parse(JSON.stringify(petugasData));
export const updatePetugasData = (newData) => {
  petugasData = newData;
  return getPetugasData();
};

export const getDesaData = () => JSON.parse(JSON.stringify(desaData));
export const updateDesaData = (newData) => {
  desaData = newData;
  return getDesaData();
};

export const getChartData = () => JSON.parse(JSON.stringify(chartData));
export const getPieData = () => JSON.parse(JSON.stringify(pieData));

export const getResponsesInit = () => JSON.parse(JSON.stringify(responsesInit));
export const updateResponsesInit = (newData) => {
  responsesInit = newData;
  return getResponsesInit();
};

export const getFormQsInit = () => JSON.parse(JSON.stringify(formQsInit));
export const updateFormQsInit = (newData) => {
  formQsInit = newData;
  return getFormQsInit();
};

export const getRtList = () => JSON.parse(JSON.stringify(rtList));
export const updateRtList = (newData) => {
  rtList = newData;
  return getRtList();
};

export const getSyncItems = () => JSON.parse(JSON.stringify(syncItems));
export const updateSyncItems = (newData) => {
  syncItems = newData;
  return getSyncItems();
};

// Export legacy names for safety if any code still uses them
export const PETUGAS_DATA = getPetugasData();
export const DESA_DATA = getDesaData();
export const CHART_DATA = getChartData();
export const PIE_DATA = getPieData();
export const RESPONSES_INIT = getResponsesInit();
export const FORM_QS_INIT = getFormQsInit();
export const RT_LIST = getRtList();
export const SYNC_ITEMS = getSyncItems();