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
  { id: "RT-001", activityName: "Desa Cantik 2026", petugasName: "Budi Santoso", krt: "Ahmad Subagyo", alamat: "Jl. Melati No. 12", status: "terkirim", sync: true, kecamatan: "Sesayap", desa: "Tideng Pale", sls: "SLS 01 Tideng Pale", gender: "1", umur: "45", perkawinan: "2", bekerja: "1", lapanganUsaha: "Pertanian", reviewStatus: "approved", r302: "1", r201: "1", r202: "80", r203: "1", r204: "1", r401: "1", r402: "1", r403: "1", r501: "1", r502: "1", r503: "2", r504: "1", logs: ["04/06/2026 08:12: Kuesioner dibuat (Draft)", "04/06/2026 09:30: Kuesioner disimpan oleh PCL", "04/06/2026 10:00: Dokumen dikirim ke server (Terkirim)", "04/06/2026 14:15: Dokumen disetujui (Approved) oleh PML (Siti Rahayu)"], lastSentData: { kecamatan: "Sesayap", desa: "Tideng Pale", sls: "SLS 01 Tideng Pale", alamat: "Jl. Melati No. 12", r201: "1", r202: "80", r203: "1", r204: "1", krt: "Ahmad Subagyo", r302: "1", gender: "1", umur: "45", perkawinan: "2", bekerja: "1", lapanganUsaha: "Pertanian", r401: "1", r402: "1", r403: "1", r501: "1", r502: "1", r503: "2", r504: "1" } },
  { id: "RT-002", activityName: "Desa Cantik 2026", petugasName: "Budi Santoso", krt: "Slamet Widodo", alamat: "Jl. Mangga No. 5", status: "tersimpan", sync: false, kecamatan: "Sesayap", desa: "Tideng Pale", sls: "SLS 01 Tideng Pale", gender: "1", umur: "38", perkawinan: "2", bekerja: "1", lapanganUsaha: "Perdagangan", reviewStatus: "draft", r302: "1", r201: "1", r202: "60", r203: "1", r204: "1", r401: "1", r402: "1", r403: "2", r501: "2", r502: "1", r503: "2", r504: "1", logs: ["04/06/2026 11:20: Kuesioner dibuat (Draft)", "04/06/2026 11:45: Kuesioner disimpan oleh PCL (Tersimpan)"] },
  { id: "RT-003", activityName: "Desa Cantik 2026", petugasName: "Budi Santoso", krt: "Ika Wahyuni", alamat: "Jl. Rambutan No. 8", status: "draft", sync: false, kecamatan: "Sesayap", desa: "Tideng Pale", sls: "SLS 01 Tideng Pale", gender: "2", umur: "32", perkawinan: "1", bekerja: "2", lapanganUsaha: "", reviewStatus: "draft", r302: "1", r201: "", r202: "", r203: "", r204: "", r401: "", r402: "", r403: "", r501: "", r502: "", r503: "", r504: "", logs: ["05/06/2026 08:00: Kuesioner dibuat (Draft)"] },
  { id: "RT-004", activityName: "Pendataan PLS 2026", petugasName: "Budi Santoso", krt: "Bambang Susilo", alamat: "Jl. Durian No. 3", status: "draft", sync: false, kecamatan: "Sesayap", desa: "Tideng Pale", sls: "SLS 01 Tideng Pale", gender: "1", umur: "50", perkawinan: "2", bekerja: "1", lapanganUsaha: "Jasa Kebersihan", reviewStatus: "rejected", r302: "1", r201: "1", r202: "100", r203: "1", r204: "1", r401: "1", r402: "2", r403: "1", r501: "1", r502: "1", r503: "1", r504: "1", logs: ["03/06/2026 09:00: Kuesioner dibuat (Draft)", "03/06/2026 10:30: Kuesioner disimpan oleh PCL (Tersimpan)", "03/06/2026 11:00: Dokumen dikirim ke server (Terkirim)", "03/06/2026 15:45: Ditolak (Rejected) oleh PML (Agus Prasetyo): Keterangan Umur tidak sesuai dengan Jenis Dinding Bangunan yang tergolong mewah (Mohon cek ulang Blok II & Blok III)."], lastSentData: { kecamatan: "Sesayap", desa: "Tideng Pale", sls: "SLS 01 Tideng Pale", alamat: "Jl. Durian No. 3", r201: "1", r202: "100", r203: "1", r204: "1", krt: "Bambang Susilo", r302: "1", gender: "1", umur: "50", perkawinan: "2", bekerja: "1", lapanganUsaha: "Jasa Kebersihan", r401: "1", r402: "2", r403: "1", r501: "1", r502: "1", r503: "1", r504: "1" } },
  { id: "RT-005", activityName: "Pendataan PLS 2026", petugasName: "Budi Santoso", krt: "Nurhayati", alamat: "Jl. Nangka No. 15", status: "tersimpan", sync: false, kecamatan: "Sesayap", desa: "Tideng Pale", sls: "SLS 01 Tideng Pale", gender: "2", umur: "28", perkawinan: "3", bekerja: "2", lapanganUsaha: "", reviewStatus: "draft", r302: "1", r201: "1", r202: "45", r203: "1", r204: "1", r401: "1", r402: "1", r403: "1", r501: "1", r502: "1", r503: "2", r504: "1", logs: ["05/06/2026 08:22: Kuesioner dibuat (Draft)", "05/06/2026 08:45: Kuesioner disimpan oleh PCL (Tersimpan)"] },
  { id: "RT-006", activityName: "Pendataan PLS 2026", petugasName: "Budi Santoso", krt: "Sugeng Riyadi", alamat: "Jl. Dahlia No. 10", status: "terkirim", sync: true, kecamatan: "Sesayap", desa: "Tideng Pale", sls: "SLS 01 Tideng Pale", gender: "1", umur: "42", perkawinan: "2", bekerja: "1", lapanganUsaha: "Pertanian", reviewStatus: "draft", r302: "1", r201: "1", r202: "70", r203: "1", r204: "1", r401: "1", r402: "1", r403: "1", r501: "1", r502: "1", r503: "2", r504: "1", logs: ["04/06/2026 14:00: Kuesioner dibuat (Draft)", "04/06/2026 15:30: Kuesioner disimpan oleh PCL (Tersimpan)", "04/06/2026 16:00: Dokumen dikirim ke server (Terkirim)"], lastSentData: { kecamatan: "Sesayap", desa: "Tideng Pale", sls: "SLS 01 Tideng Pale", alamat: "Jl. Dahlia No. 10", r201: "1", r202: "70", r203: "1", r204: "1", krt: "Sugeng Riyadi", r302: "1", gender: "1", umur: "42", perkawinan: "2", bekerja: "1", lapanganUsaha: "Pertanian", r401: "1", r402: "1", r403: "1", r501: "1", r502: "1", r503: "2", r504: "1" } },
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

export const getRtListByActivityAndOfficer = (activityName, petugasName) => {
  return getRtList().filter(rt => rt.activityName === activityName && rt.petugasName === petugasName);
};

export const saveRtItem = (item) => {
  const existing = rtList.find(rt => rt.id === item.id);
  if (existing) {
    rtList = rtList.map(rt => rt.id === item.id ? { ...rt, ...item } : rt);
  } else {
    const nextId = `RT-${String(rtList.length + 1).padStart(3, '0')}`;
    rtList.push({ id: nextId, ...item });
  }
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