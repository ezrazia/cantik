import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Check, AlertTriangle, ChevronRight, ChevronLeft, Plus, CheckCircle, Calendar, FileText, Landmark, ShieldCheck, MessageSquare, XCircle, X, Clock, AlertCircle, Info } from "lucide-react";
import QCard from "../../components/ui/QCard";
import Badge from "../../components/ui/Badge";
import PetugasLayout from "../../components/layouts/PetugasLayout";
import useAutoSave from "../../hooks/useAutoSave";
import { getRtListByActivityAndOfficer, saveRtItem } from "../../constants/mockData";

/**
 * Halaman pengisian kuesioner petugas — clean & BPS standard.
 * Menyediakan alur: Pilih Kegiatan -> Daftar Prelist -> Isi/Tambah Kuesioner (Blok I - V)
 *
 * @param {Object} props
 * @param {(screen: string) => void} props.onNavigate
 * @param {Array} props.petugas
 * @param {Array} props.activities
 * @returns {React.ReactElement}
 */
function PetugasQuestionnaire({ onNavigate, petugas, activities }) {
  const [view, setView] = useState("select_activity"); // select_activity | prelist | form
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [localPrelist, setLocalPrelist] = useState([]);
  const [selectedRtItem, setSelectedRtItem] = useState(null);
  const [activeTab, setActiveTab] = useState("Blok I"); // Blok I | Blok II | Blok III | Blok IV | Blok V
  const [selectedLogItem, setSelectedLogItem] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);
  const [rejectionNoteItem, setRejectionNoteItem] = useState(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null
  });

  const isPml = selectedActivity?.role === "PML";

  const askConfirmation = (title, message, onConfirm) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(p => ({ ...p, isOpen: false }));
      }
    });
  };

  const { saved, markUnsaved } = useAutoSave(1100);
  const [ans, setAns] = useState({
    // Blok I (Lokasi)
    kecamatan: "",
    desa: "",
    sls: "",
    alamat: "",
    
    // Blok II (Perumahan)
    r201: "1", // Status Kepemilikan
    r202: "",  // Luas Lantai
    r203: "1", // Jenis Lantai
    r204: "1", // Jenis Dinding

    // Blok III (Anggota RT)
    r301: "",  // Nama KRT
    r302: "1", // Hubungan
    r303: "1", // Jenis Kelamin
    r304: "",  // Umur
    r305: "1", // Status Perkawinan
    r307: "1", // Bekerja
    r308: "",  // Lapangan Usaha

    // Blok IV (Sosial Ekonomi)
    r401: "1", // Sumber Penerangan
    r402: "1", // Bahan Bakar Masak
    r403: "1", // Sumber Air Minum

    // Blok V (Kepemilikan Aset)
    r501: "1", // Tabungan/Emas
    r502: "1", // Motor
    r503: "2", // Laptop
    r504: "1", // HP Aktif
  });

  // Find current petugas Budi Santoso
  const currentPetugas = petugas?.find(p => p.name === "Budi Santoso") || {
    name: "Budi Santoso",
    desa: "Tideng Pale",
    projects: ["Desa Cantik 2026", "Pendataan PLS 2026"],
    projectRoles: { "Desa Cantik 2026": "PCL", "Pendataan PLS 2026": "PML" }
  };

  // Get activities assigned to Budi Santoso
  const officerActivities = (currentPetugas.projects || []).map(projName => {
    const act = activities?.find(a => a.name === projName) || {
      name: projName,
      desc: "Deskripsi kegiatan survei.",
      progress: 0,
      color: "bg-blue-600",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
      date: new Date().toISOString().split('T')[0]
    };
    return {
      ...act,
      role: currentPetugas.projectRoles?.[projName] || "PCL"
    };
  });

  // Fetch prelist when activity is selected
  useEffect(() => {
    if (selectedActivity) {
      const data = getRtListByActivityAndOfficer(selectedActivity.name, currentPetugas.name);
      setLocalPrelist(data);
    }
  }, [selectedActivity, currentPetugas.name]);

  const isReadOnly = 
    isPml ||
    selectedRtItem?.reviewStatus === "approved" || 
    (selectedRtItem?.status === "tersimpan" && selectedRtItem?.reviewStatus !== "rejected") ||
    selectedRtItem?.status === "terkirim";

  const setVal = (k, v) => {
    if (isReadOnly) return; // block edits if read-only
    setAns(p => ({ ...p, [k]: v }));
    markUnsaved();
  };

  const validateBlock = (block, a) => {
    if (block === "Blok I") {
      if (!a.kecamatan || !a.desa) {
        if (!a.kecamatan && !a.desa) return 'empty';
        return 'error';
      }
      if (!a.sls || !a.alamat) return 'warning';
      return 'safe';
    }
    
    if (block === "Blok II") {
      if (!a.r202) return 'empty';
      const luas = parseFloat(a.r202);
      if (isNaN(luas) || luas <= 0) return 'error';
      if (a.r201 === "1" && a.r204 === "4") return 'warning';
      if (luas < 12 || luas > 500) return 'warning';
      return 'safe';
    }
    
    if (block === "Blok III") {
      if (!a.r301 && !a.r304) return 'empty';
      if (!a.r301 || !a.r304) return 'error';
      
      const age = parseInt(a.r304);
      if (isNaN(age) || age < 0 || age > 120) return 'error';
      
      if (age < 15 && a.r305 !== "1") return 'warning';
      if (age < 15 && a.r307 === "1") return 'warning';
      if (a.r307 === "1" && !a.r308) return 'warning';
      
      return 'safe';
    }
    
    if (block === "Blok IV") {
      if (!a.r401 || !a.r402 || !a.r403) return 'error';
      if (a.r401 === "3" && (a.r402 === "1" || a.r402 === "2")) return 'warning';
      return 'safe';
    }
    
    if (block === "Blok V") {
      if (!a.r501 || !a.r502 || !a.r503 || !a.r504) return 'error';
      return 'safe';
    }
    
    return 'empty';
  };

  const handleSelectActivity = (act) => {
    setSelectedActivity(act);
    setView("prelist");
  };

  const handleEditItem = (item) => {
    const hasBeenSent = item.status === "terkirim" || item.reviewStatus === "approved" || item.reviewStatus === "rejected";
    if (isPml && !hasBeenSent) {
      setWarningMessage("Dokumen ini belum dikirim ke server oleh PCL, sehingga tidak dapat diperiksa oleh PML.");
      return;
    }
    setSelectedRtItem(item);
    
    // load from lastSentData if PML is viewing a document (so they see the sent version instead of offline draft changes)
    const dataSource = (isPml && item.lastSentData) ? item.lastSentData : item;

    setAns({
      kecamatan: dataSource.kecamatan || "",
      desa: dataSource.desa || "",
      sls: dataSource.sls || "",
      alamat: dataSource.alamat || "",
      
      r201: dataSource.r201 || "1",
      r202: dataSource.r202 || "",
      r203: dataSource.r203 || "1",
      r204: dataSource.r204 || "1",

      r301: dataSource.krt || "",
      r302: dataSource.r302 || "1",
      r303: dataSource.gender || "1",
      r304: dataSource.umur || "",
      r305: dataSource.perkawinan || "1",
      r307: dataSource.bekerja || "1",
      r308: dataSource.lapanganUsaha || "",

      r401: dataSource.r401 || "1",
      r402: dataSource.r402 || "1",
      r403: dataSource.r403 || "1",

      r501: dataSource.r501 || "1",
      r502: dataSource.r502 || "1",
      r503: dataSource.r503 || "2",
      r504: dataSource.r504 || "1",
    });
    setActiveTab("Blok I");
    setView("form");
  };

  const handleAddNew = () => {
    setSelectedRtItem(null);
    setAns({
      kecamatan: "",
      desa: currentPetugas.desa || "",
      sls: "",
      alamat: "",
      
      r201: "1",
      r202: "",
      r203: "1",
      r204: "1",

      r301: "",
      r302: "1",
      r303: "1",
      r304: "",
      r305: "1",
      r307: "1",
      r308: "",

      r401: "1",
      r402: "1",
      r403: "1",

      r501: "1",
      r502: "1",
      r503: "2",
      r504: "1",
    });
    setActiveTab("Blok I");
    setView("form");
  };

  const handleSave = () => {
    if (isReadOnly) {
      setView("prelist");
      return;
    }
    askConfirmation(
      "Simpan Kuesioner",
      "Apakah Anda yakin ingin menyelesaikan dan menyimpan kuesioner ini? Status akan berubah menjadi Tersimpan.",
      executeSave
    );
  };

  const executeSave = () => {
    const timestamp = new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) + " " + new Date().toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' });
    let newLogs = [];
    if (selectedRtItem) {
      newLogs = [...(selectedRtItem.logs || []), `${timestamp}: Kuesioner disimpan oleh PCL (Tersimpan)`];
    } else {
      newLogs = [
        `${timestamp}: Kuesioner dibuat (Draft)`,
        `${timestamp}: Kuesioner disimpan oleh PCL (Tersimpan)`
      ];
    }

    const itemToSave = {
      id: selectedRtItem?.id,
      activityName: selectedActivity.name,
      petugasName: currentPetugas.name,
      krt: ans.r301 || "Tanpa Nama",
      alamat: ans.alamat,
      status: "tersimpan",
      sync: false,
      kecamatan: ans.kecamatan,
      desa: ans.desa,
      sls: ans.sls,
      r201: ans.r201,
      r202: ans.r202,
      r203: ans.r203,
      r204: ans.r204,
      r302: ans.r302,
      gender: ans.r303,
      umur: ans.r304,
      perkawinan: ans.r305,
      bekerja: ans.r307,
      lapanganUsaha: ans.r308,
      r401: ans.r401,
      r402: ans.r402,
      r403: ans.r403,
      r501: ans.r501,
      r502: ans.r502,
      r503: ans.r503,
      r504: ans.r504,
      reviewStatus: selectedRtItem?.reviewStatus || "draft",
      logs: newLogs
    };

    saveRtItem(itemToSave);

    // Refresh prelist
    const updated = getRtListByActivityAndOfficer(selectedActivity.name, currentPetugas.name);
    setLocalPrelist(updated);

    setView("prelist");
  };

  const handleCancelSave = () => {
    if (!selectedRtItem) return;
    askConfirmation(
      "Batal Simpan",
      "Apakah Anda yakin ingin membatalkan simpan dokumen ini? Status akan kembali menjadi Draft.",
      executeCancelSave
    );
  };

  const executeCancelSave = () => {
    const timestamp = new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) + " " + new Date().toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' });
    const newLogs = [...(selectedRtItem.logs || []), `${timestamp}: Kuesioner batal disimpan oleh PCL (Kembali ke Draft)`];

    const updatedItem = {
      ...selectedRtItem,
      status: "draft",
      logs: newLogs
    };

    saveRtItem(updatedItem);

    // Refresh state
    setSelectedRtItem(updatedItem);
    const updated = getRtListByActivityAndOfficer(selectedActivity.name, currentPetugas.name);
    setLocalPrelist(updated);
  };

  const handlePmlApprove = () => {
    if (!selectedRtItem) return;
    askConfirmation(
      "Approve Dokumen",
      "Apakah Anda yakin ingin menyetujui dokumen kuesioner ini?",
      executePmlApprove
    );
  };

  const executePmlApprove = () => {
    const timestamp = new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) + " " + new Date().toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' });
    const newLogs = [...(selectedRtItem.logs || []), `${timestamp}: Dokumen disetujui (Approved) oleh PML (${currentPetugas.name})`];

    const updatedItem = {
      ...selectedRtItem,
      reviewStatus: "approved",
      logs: newLogs
    };

    saveRtItem(updatedItem);
    
    const updated = getRtListByActivityAndOfficer(selectedActivity.name, currentPetugas.name);
    setLocalPrelist(updated);
    setView("prelist");
  };

  const handlePmlRejectClick = () => {
    if (!selectedRtItem) return;
    setRejectionNote("");
    setRejectionNoteItem(selectedRtItem);
  };

  const submitRejectionWithConfirmation = () => {
    setRejectionNoteItem(null);
    askConfirmation(
      "Reject Dokumen",
      "Apakah Anda yakin ingin menolak dokumen kuesioner ini?",
      executePmlReject
    );
  };

  const executePmlReject = () => {
    const timestamp = new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) + " " + new Date().toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' });
    const newLogs = [...(selectedRtItem.logs || []), `${timestamp}: Ditolak (Rejected) oleh PML (${currentPetugas.name}): ${rejectionNote}`];

    const updatedItem = {
      ...selectedRtItem,
      status: "draft",
      reviewStatus: "rejected",
      logs: newLogs
    };

    saveRtItem(updatedItem);
    
    const updated = getRtListByActivityAndOfficer(selectedActivity.name, currentPetugas.name);
    setLocalPrelist(updated);
    setView("prelist");
  };

  const skipped = ans.r307 === "2";

  const getActiveIndex = (tab) => {
    if (tab === "Blok I") return 0;
    if (tab === "Blok II") return 1;
    if (tab === "Blok III") return 2;
    if (tab === "Blok IV") return 3;
    return 4; // Blok V
  };

  const getBlockLabel = (tab) => {
    if (tab === "Blok I") return "Keterangan Tempat Tinggal";
    if (tab === "Blok II") return "Keterangan Perumahan";
    if (tab === "Blok III") return "Keterangan Anggota RT";
    if (tab === "Blok IV") return "Keterangan Sosial Ekonomi";
    return "Keterangan Kepemilikan Aset";
  };

  const handlePrevTab = () => {
    const idx = getActiveIndex(activeTab);
    if (idx > 0) {
      const prevTabs = ["Blok I", "Blok II", "Blok III", "Blok IV", "Blok V"];
      setActiveTab(prevTabs[idx - 1]);
    }
  };

  const handleNextTab = () => {
    const idx = getActiveIndex(activeTab);
    if (idx < 4) {
      const nextTabs = ["Blok I", "Blok II", "Blok III", "Blok IV", "Blok V"];
      setActiveTab(nextTabs[idx + 1]);
    }
  };

  const BLOCKS = [
    { l: "Blok I", done: !!(ans.kecamatan && ans.desa) },
    { l: "Blok II", done: !!(ans.r202) },
    { l: "Blok III", done: !!(ans.r301 && ans.r304) },
    { l: "Blok IV", done: true },
    { l: "Blok V", done: true, cond: true },
  ];

  return (
    <PetugasLayout activeTab="questionnaire" onNavigate={onNavigate}>
      {/* Dynamic Smooth View Transition CSS */}
      <style>{`
        .view-transition {
          animation: fadeInSmooth 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes fadeInSmooth {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="min-h-screen bg-white slide-up pb-24">
        <div className="max-w-3xl mx-auto">
          
          {/* VIEW 1: SELECT ACTIVITY */}
          {view === "select_activity" && (
            <div className="flex-1 bg-white view-transition">
              <div className="px-6 pt-12 pb-6 border-b border-slate-100">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pengisian Kuesioner</p>
                <h2 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">Pilih Kegiatan</h2>
                <p className="text-xs text-slate-400 mt-1.5 font-medium leading-relaxed">Pilih salah satu kegiatan aktif untuk mulai mengelola kuesioner.</p>
              </div>
              <div className="p-6 space-y-3">
                {officerActivities.map(act => (
                  <button key={act.name} onClick={() => handleSelectActivity(act)}
                    className="w-full bg-white rounded-2xl p-5 border border-slate-100 flex flex-col gap-4 text-left cursor-pointer transition-all hover:border-blue-300 hover:shadow-md group relative overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${act.color || 'bg-blue-600'}`} />
                    <div className="flex items-start justify-between w-full">
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors truncate">{act.name}</h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{act.desc}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${act.role === 'PML' ? 'bg-purple-50 text-purple-700 border border-purple-100/50' : 'bg-blue-50 text-blue-700 border border-blue-100/50'}`}>
                          {act.role === 'PML' ? 'Pengawas (PML)' : 'Pencacah (PCL)'}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 2: PRELIST */}
          {view === "prelist" && selectedActivity && (
            <div className="flex-1 bg-white view-transition">
              <div className="px-6 pt-12 pb-6 border-b border-slate-100 flex items-center gap-3">
                <button onClick={() => setView("select_activity")}
                  className="w-9 h-9 bg-slate-50 hover:bg-slate-100 border border-slate-100 cursor-pointer rounded-lg flex items-center justify-center text-slate-400 transition-all flex-shrink-0">
                  <ArrowLeft size={16} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-slate-400 font-medium truncate">Kegiatan: {selectedActivity.name}</p>
                  <h2 className="text-base font-bold text-slate-900 truncate">Daftar Prelist RT</h2>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-400 font-semibold">{localPrelist.length} Rumah Tangga</span>
                  {!isPml && (
                    <button onClick={handleAddNew}
                      className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold border-0 cursor-pointer hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-sm">
                      <Plus size={14} /> Tambah Baru
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {localPrelist.map((item, i) => (
                    <button key={item.id} onClick={() => handleEditItem(item)}
                      className="w-full bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-4 text-left cursor-pointer transition-all hover:border-blue-200 hover:shadow-sm group">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                        item.status === "terkirim" ? "bg-blue-50 text-blue-600" :
                        item.status === "tersimpan" ? "bg-emerald-50 text-emerald-600" :
                        "bg-slate-50 text-slate-400"
                      }`}>{i + 1}</div>
                      
                      <div className="flex-1 min-w-0">
                        {/* Only display KRT name as requested */}
                        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{item.krt}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {/* Status Badge 1: Completion Status */}
                        <Badge status={item.reviewStatus === "rejected" ? "draft" : item.status}/>
                        
                        {/* Status Badge 2: Review Status (no black outlines) */}
                        {item.reviewStatus === "approved" ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-emerald-500" />
                            Approved
                          </span>
                        ) : item.reviewStatus === "rejected" ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-rose-500" />
                            Rejected
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-slate-400" />
                            Draft
                          </span>
                        )}

                        {/* Activity Log Trigger Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLogItem(item);
                          }}
                          className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all cursor-pointer flex-shrink-0"
                          title="Log Aktivitas"
                        >
                          <MessageSquare size={14} />
                        </button>
                      </div>
                    </button>
                  ))}
                  {localPrelist.length === 0 && (
                    <div className="bg-slate-50 rounded-xl py-12 text-center border border-dashed border-slate-200">
                      <p className="text-xs text-slate-500 font-semibold">Prelist Kosong</p>
                      <p className="text-[10px] text-slate-400 mt-1">Klik Tambah Baru untuk mengisi kuesioner baru</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: FORM */}
          {view === "form" && selectedActivity && (
            <div className="bg-slate-50 min-h-screen flex flex-col rounded-2xl overflow-hidden mt-4 shadow-sm view-transition">
              
              {/* Contextual Form Banner */}
              {(() => {
                if (selectedRtItem?.reviewStatus === "approved") {
                  return (
                    <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-3 flex items-center gap-2.5 text-emerald-800">
                      <ShieldCheck size={16} className="text-emerald-600" />
                      <p className="text-xs font-semibold">Dokumen telah disetujui (Approved) dan tidak dapat diubah kembali.</p>
                    </div>
                  );
                }
                if (selectedRtItem?.reviewStatus === "rejected") {
                  return (
                    <div className="bg-rose-50 border-b border-rose-100 px-6 py-3 flex items-center gap-2.5 text-rose-800">
                      <XCircle size={16} className="text-rose-600" />
                      <p className="text-xs font-semibold">Dokumen ditolak (Rejected) oleh PML. Silakan perbaiki sesuai catatan pengawas.</p>
                    </div>
                  );
                }
                if (selectedRtItem?.status === "terkirim") {
                  return (
                    <div className="bg-blue-50 border-b border-blue-100 px-6 py-3 flex items-center gap-2.5 text-blue-800">
                      <CheckCircle size={16} className="text-blue-600" />
                      <p className="text-xs font-semibold">Dokumen telah terkirim (Terkirim) ke server dan bersifat read-only.</p>
                    </div>
                  );
                }
                if (selectedRtItem?.status === "tersimpan") {
                  if (isPml) {
                    return (
                      <div className="bg-amber-50 border-b border-amber-100 px-6 py-3 flex items-center gap-2.5 text-amber-800">
                        <AlertCircle size={16} className="text-amber-600" />
                        <p className="text-xs font-semibold">Dokumen disimpan oleh PCL tetapi belum dikirim ke server.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="bg-teal-50 border-b border-teal-100 px-6 py-3 flex items-center gap-2.5 text-teal-800">
                      <Info size={16} className="text-teal-600" />
                      <p className="text-xs font-semibold">Dokumen disimpan (Tersimpan) dan bersifat read-only. Klik "Batal Simpan" di langkah terakhir untuk mengedit.</p>
                    </div>
                  );
                }
                if (isPml) {
                  return (
                    <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 flex items-center gap-2.5 text-slate-700">
                      <Info size={16} className="text-slate-500" />
                      <p className="text-xs font-semibold">Mode Pemeriksaan Pengawas (PML). Jawaban tidak dapat diubah.</p>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Header */}
              <div className="bg-white border-b border-slate-100 px-6 pt-8 pb-5">
                <div className="flex items-center gap-3 mb-5">
                  <button onClick={() => setView("prelist")}
                    className="w-9 h-9 bg-slate-50 hover:bg-slate-100 border border-slate-100 cursor-pointer rounded-lg flex items-center justify-center flex-shrink-0 transition-all text-slate-400">
                    <ArrowLeft size={16} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-400 font-medium truncate">
                      {selectedRtItem ? `${selectedRtItem.id} · ${selectedRtItem.krt}` : "Baru · Tambah Kuesioner"}
                    </p>
                    <h2 className="text-base font-bold text-slate-900 truncate">
                      {activeTab} – {getBlockLabel(activeTab)}
                    </h2>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg flex-shrink-0 transition-all ${
                    saved ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"
                  }`}>
                    <Save size={12}/> {saved ? "Tersimpan" : "Menyimpan..."}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex gap-1.5">
                    {BLOCKS.map((b, i) => {
                      const isCompleted = i < getActiveIndex(activeTab);
                      const isCurrent = b.l === activeTab;
                      return (
                        <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                          isCurrent ? "bg-blue-400 animate-pulse" : isCompleted ? "bg-blue-600" : "bg-slate-100"
                        }`}/>
                      );
                    })}
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                    <span>Langkah {getActiveIndex(activeTab) + 1} dari 5</span>
                    <span className="text-blue-600 font-semibold">{activeTab} ({getBlockLabel(activeTab)})</span>
                  </div>
                </div>
              </div>

              {/* Block tabs */}
              <div className="flex gap-2 px-6 py-4 overflow-x-auto bg-white border-b border-slate-50">
                {BLOCKS.map((b, i) => {
                  const isActive = b.l === activeTab;
                  const status = validateBlock(b.l, ans);
                  
                  let tabStyle = "";
                  let icon = null;
                  
                  if (isActive) {
                    tabStyle = "text-white bg-blue-600 border-blue-600";
                  } else {
                    if (status === 'safe') {
                      tabStyle = "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/60";
                      icon = <Check size={12} className="inline mr-1 text-emerald-600 stroke-[3px]" />;
                    } else if (status === 'warning') {
                      tabStyle = "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100/60";
                      icon = <AlertTriangle size={12} className="inline mr-1 text-amber-500 fill-amber-50/20" />;
                    } else if (status === 'error') {
                      tabStyle = "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100/60";
                      icon = <XCircle size={12} className="inline mr-1 text-rose-500 fill-rose-50/20" />;
                    } else {
                      tabStyle = "bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100";
                    }
                  }
                  
                  return (
                    <button key={i} onClick={() => setActiveTab(b.l)}
                      className={`flex-shrink-0 px-3.5 py-2 rounded-lg text-xs font-semibold border cursor-pointer transition-all flex items-center ${tabStyle}`}>
                      {icon}
                      {b.l}{b.cond && <span className="ml-1 opacity-50">*</span>}
                    </button>
                  );
                })}
              </div>

              {/* Questions Container */}
              <div className="px-6 py-6 space-y-4 flex-1">
                
                {/* BLOK I: Lokasi */}
                {activeTab === "Blok I" && (
                  <>
                    <QCard r="101" label="Provinsi" required>
                      <input value="Kalimantan Utara" disabled
                        className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-medium text-slate-500 cursor-not-allowed"/>
                    </QCard>

                    <QCard r="102" label="Kabupaten / Kota" required>
                      <input value="Tana Tidung" disabled
                        className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-medium text-slate-500 cursor-not-allowed"/>
                    </QCard>

                    <QCard r="103" label="Kecamatan" required>
                      <input value={ans.kecamatan} onChange={e => setVal("kecamatan", e.target.value)}
                        placeholder="Contoh: Sesayap" disabled={isReadOnly}
                        className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"/>
                    </QCard>

                    <QCard r="104" label="Desa / Kelurahan" required>
                      <input value={ans.desa} onChange={e => setVal("desa", e.target.value)}
                        placeholder="Contoh: Tideng Pale" disabled={isReadOnly}
                        className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"/>
                    </QCard>

                    <QCard r="105" label="Satuan Lingkungan Setempat (SLS) / RT">
                      <input value={ans.sls} onChange={e => setVal("sls", e.target.value)}
                        placeholder="Contoh: SLS 01 Tideng Pale" disabled={isReadOnly}
                        className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"/>
                    </QCard>

                    <QCard r="106" label="Alamat / Jalan">
                      <input value={ans.alamat} onChange={e => setVal("alamat", e.target.value)}
                        placeholder="Contoh: Jl. Melati No. 12" disabled={isReadOnly}
                        className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"/>
                    </QCard>
                  </>
                )}

                {/* BLOK II: Perumahan */}
                {activeTab === "Blok II" && (
                  <>
                    <QCard r="201" label="Status Kepemilikan Bangunan Tempat Tinggal" required>
                      <div className="grid grid-cols-2 gap-2">
                        {[["1", "Milik Sendiri"], ["2", "Kontrak/Sewa"], ["3", "Bebas Sewa"], ["4", "Lainnya"]].map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setVal("r201", v)} disabled={isReadOnly}
                            className={`py-3 px-4 text-xs rounded-xl border font-medium transition-all text-left ${
                              ans.r201 === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                            } ${isReadOnly ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}>{v}. {l}</button>
                        ))}
                      </div>
                    </QCard>

                    <QCard r="202" label="Luas Lantai Bangunan (m²)" required>
                      <div className="flex items-center gap-3">
                        <input type="number" value={ans.r202} onChange={e => setVal("r202", e.target.value)}
                          placeholder="Luas lantai" disabled={isReadOnly}
                          className="w-32 px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"/>
                        <span className="text-xs text-slate-400 font-medium">Meter Persegi</span>
                      </div>
                    </QCard>

                    <QCard r="203" label="Jenis Lantai Terluas" required>
                      <div className="grid grid-cols-2 gap-2">
                        {[["1", "Keramik/Ubin"], ["2", "Semen/Plester"], ["3", "Kayu/Papan"], ["4", "Tanah"]].map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setVal("r203", v)} disabled={isReadOnly}
                            className={`py-3 px-4 text-xs rounded-xl border font-medium transition-all text-left ${
                              ans.r203 === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                            } ${isReadOnly ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}>{v}. {l}</button>
                        ))}
                      </div>
                    </QCard>

                    <QCard r="204" label="Jenis Dinding Terluas" required>
                      <div className="grid grid-cols-2 gap-2">
                        {[["1", "Tembok"], ["2", "Semi Tembok"], ["3", "Kayu/Papan"], ["4", "Bambu/Lainnya"]].map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setVal("r204", v)} disabled={isReadOnly}
                            className={`py-3 px-4 text-xs rounded-xl border font-medium transition-all text-left ${
                              ans.r204 === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                            } ${isReadOnly ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}>{v}. {l}</button>
                        ))}
                      </div>
                    </QCard>
                  </>
                )}

                {/* BLOK III: Anggota RT */}
                {activeTab === "Blok III" && (
                  <>
                    <QCard r="301" label="Nama Kepala Rumah Tangga" required>
                      <input value={ans.r301} onChange={e => setVal("r301", e.target.value)}
                        placeholder="Contoh: Ahmad Subagyo" disabled={isReadOnly}
                        className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"/>
                    </QCard>

                    <QCard r="302" label="Hubungan dengan KRT" required>
                      <div className="grid grid-cols-2 gap-2">
                        {[["1", "Kepala Keluarga"], ["2", "Istri"], ["3", "Anak"], ["4", "Lainnya"]].map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setVal("r302", v)} disabled={isReadOnly}
                            className={`py-3 px-4 text-xs rounded-xl border font-medium transition-all text-left ${
                              ans.r302 === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                            } ${isReadOnly ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}>{v}. {l}</button>
                        ))}
                      </div>
                    </QCard>

                    <QCard r="303" label="Jenis Kelamin" required>
                      <div className="grid grid-cols-2 gap-2">
                        {[["1", "Laki-laki"], ["2", "Perempuan"]].map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setVal("r303", v)} disabled={isReadOnly}
                            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-medium transition-all ${
                              ans.r303 === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                            } ${isReadOnly ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}>
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${ans.r303 === v ? "border-blue-600" : "border-slate-200"}`}>
                              {ans.r303 === v && <div className="w-2 h-2 rounded-full bg-blue-600"/>}
                            </div>
                            {v}. {l}
                          </button>
                        ))}
                      </div>
                    </QCard>

                    <QCard r="304" label="Umur (tahun)" required hint="Nilai valid: 0 – 120 tahun">
                      <div className="flex items-center gap-3">
                        <input type="number" value={ans.r304} min={0} max={120}
                          onChange={e => setVal("r304", e.target.value)} disabled={isReadOnly}
                          className="mono w-28 px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"/>
                        <span className="text-xs text-slate-400 font-medium">Tahun</span>
                      </div>
                      {ans.r304 && (parseInt(ans.r304) < 0 || parseInt(ans.r304) > 120) && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                          <AlertTriangle size={13} className="flex-shrink-0"/> Nilai di luar rentang (0–120)
                        </div>
                      )}
                    </QCard>

                    <QCard r="305" label="Status Perkawinan" required>
                      <div className="grid grid-cols-2 gap-2">
                        {[["1", "Belum Kawin"], ["2", "Kawin"], ["3", "Cerai Hidup"], ["4", "Cerai Mati"]].map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setVal("r305", v)} disabled={isReadOnly}
                            className={`py-3 px-4 text-xs rounded-xl border font-medium transition-all text-left ${
                              ans.r305 === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                            } ${isReadOnly ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}>{v}. {l}</button>
                        ))}
                      </div>
                    </QCard>

                    <QCard r="307" label="Bekerja seminggu yang lalu?" required>
                      <div className="grid grid-cols-2 gap-2">
                        {[["1", "Ya"], ["2", "Tidak"]].map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setVal("r307", v)} disabled={isReadOnly}
                            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-medium transition-all ${
                              ans.r307 === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                            } ${isReadOnly ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}>
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${ans.r307 === v ? "border-blue-600" : "border-slate-200"}`}>
                              {ans.r307 === v && <div className="w-2 h-2 rounded-full bg-blue-600"/>}
                            </div>
                            {v}. {l}
                          </button>
                        ))}
                      </div>
                    </QCard>

                    <div style={{ opacity: skipped ? 0.4 : 1, transition: "opacity .3s ease" }}>
                      <QCard r="308" label="Lapangan Usaha Utama"
                        skipInfo={skipped ? "Dilewati otomatis" : "Aktif jika Ya"}>
                        <input value={ans.r308} disabled={skipped || isReadOnly} onChange={e => setVal("r308", e.target.value)}
                          className={`w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${skipped ? "cursor-not-allowed opacity-50" : ""}`}
                          placeholder={skipped ? "Dilewati" : "Contoh: Pertanian, Perdagangan..."}/>
                      </QCard>
                    </div>

                    {/* Consistency warning */}
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                      <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5"/>
                      <div>
                        <p className="text-xs font-semibold text-amber-800">Peringatan Konsistensi</p>
                        <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
                          {ans.r304 && ans.r305 ? `Umur ${ans.r304} tahun dengan status ${
                            ans.r305 === "1" ? "Belum Kawin" : ans.r305 === "2" ? "Kawin" : "Cerai"
                          } sudah sesuai.` : "Mohon isi Umur dan Status Perkawinan."}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* BLOK IV: Sosial Ekonomi */}
                {activeTab === "Blok IV" && (
                  <>
                    <QCard r="401" label="Sumber Penerangan Utama" required>
                      <div className="grid grid-cols-2 gap-2">
                        {[["1", "Listrik PLN"], ["2", "Listrik non-PLN"], ["3", "Bukan Listrik"]].map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setVal("r401", v)} disabled={isReadOnly}
                            className={`py-3 px-4 text-xs rounded-xl border font-medium transition-all text-left ${
                              ans.r401 === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                            } ${isReadOnly ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}>{v}. {l}</button>
                        ))}
                      </div>
                    </QCard>

                    <QCard r="402" label="Bahan Bakar Utama Memasak" required>
                      <div className="grid grid-cols-2 gap-2">
                        {[["1", "Gas LPG 3kg"], ["2", "Gas LPG >3kg"], ["3", "Minyak Tanah"], ["4", "Kayu Bakar"]].map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setVal("r402", v)} disabled={isReadOnly}
                            className={`py-3 px-4 text-xs rounded-xl border font-medium transition-all text-left ${
                              ans.r402 === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                            } ${isReadOnly ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}>{v}. {l}</button>
                        ))}
                      </div>
                    </QCard>

                    <QCard r="403" label="Sumber Air Minum Utama" required>
                      <div className="grid grid-cols-2 gap-2">
                        {[["1", "Isi Ulang/Kemasan"], ["2", "Leding/PAM"], ["3", "Sumur Terlindungi"], ["4", "Air Hujan/Sungai"]].map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setVal("r403", v)} disabled={isReadOnly}
                            className={`py-3 px-4 text-xs rounded-xl border font-medium transition-all text-left ${
                              ans.r403 === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                            } ${isReadOnly ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}>{v}. {l}</button>
                        ))}
                      </div>
                    </QCard>
                  </>
                )}

                {/* BLOK V: Kepemilikan Aset */}
                {activeTab === "Blok V" && (
                  <>
                    <QCard r="501" label="Apakah rumah tangga memiliki tabungan/perhiasan emas?" required>
                      <div className="grid grid-cols-2 gap-2">
                        {[["1", "Ya"], ["2", "Tidak"]].map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setVal("r501", v)} disabled={isReadOnly}
                            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-medium transition-all ${
                              ans.r501 === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                            } ${isReadOnly ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}>
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${ans.r501 === v ? "border-blue-600" : "border-slate-200"}`}>
                              {ans.r501 === v && <div className="w-2 h-2 rounded-full bg-blue-600"/>}
                            </div>
                            {v}. {l}
                          </button>
                        ))}
                      </div>
                    </QCard>

                    <QCard r="502" label="Apakah memiliki sepeda motor aktif?" required>
                      <div className="grid grid-cols-2 gap-2">
                        {[["1", "Ya"], ["2", "Tidak"]].map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setVal("r502", v)} disabled={isReadOnly}
                            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-medium transition-all ${
                              ans.r502 === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                            } ${isReadOnly ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}>
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${ans.r502 === v ? "border-blue-600" : "border-slate-200"}`}>
                              {ans.r502 === v && <div className="w-2 h-2 rounded-full bg-blue-600"/>}
                            </div>
                            {v}. {l}
                          </button>
                        ))}
                      </div>
                    </QCard>

                    <QCard r="503" label="Apakah memiliki komputer / laptop yang masih berfungsi?" required>
                      <div className="grid grid-cols-2 gap-2">
                        {[["1", "Ya"], ["2", "Tidak"]].map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setVal("r503", v)} disabled={isReadOnly}
                            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-medium transition-all ${
                              ans.r503 === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                            } ${isReadOnly ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}>
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${ans.r503 === v ? "border-blue-600" : "border-slate-200"}`}>
                              {ans.r503 === v && <div className="w-2 h-2 rounded-full bg-blue-600"/>}
                            </div>
                            {v}. {l}
                          </button>
                        ))}
                      </div>
                    </QCard>

                    <QCard r="504" label="Apakah memiliki HP/smartphone aktif dalam rumah tangga?" required>
                      <div className="grid grid-cols-2 gap-2">
                        {[["1", "Ya"], ["2", "Tidak"]].map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setVal("r504", v)} disabled={isReadOnly}
                            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-medium transition-all ${
                              ans.r504 === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                            } ${isReadOnly ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}>
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${ans.r504 === v ? "border-blue-600" : "border-slate-200"}`}>
                              {ans.r504 === v && <div className="w-2 h-2 rounded-full bg-blue-600"/>}
                            </div>
                            {v}. {l}
                          </button>
                        ))}
                      </div>
                    </QCard>
                  </>
                )}

                {/* Inline Action Buttons (Decreased vertical padding) */}
                <div className="flex gap-3 pt-6 pb-4">
                  {activeTab !== "Blok I" ? (
                    <button type="button" onClick={handlePrevTab}
                      className="px-5 py-3 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs text-slate-500 font-semibold cursor-pointer transition-all flex items-center gap-1.5">
                      <ChevronLeft size={14}/> Sebelumnya
                    </button>
                  ) : (
                    <button type="button" onClick={() => setView("prelist")}
                      className="px-5 py-3 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs text-slate-500 font-semibold cursor-pointer transition-all flex items-center gap-1.5">
                      <ArrowLeft size={14}/> Batal
                    </button>
                  )}

                  {activeTab === "Blok V" ? (
                    <div className="flex-1 flex gap-2">
                      {isPml ? (
                        selectedRtItem?.reviewStatus === "approved" ? (
                          <button type="button" onClick={() => setView("prelist")}
                            className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl border-0 cursor-pointer hover:bg-blue-700 active:scale-[0.98] transition-all">
                            Kembali ke Prelist
                          </button>
                        ) : (
                          <>
                            <button type="button" onClick={handlePmlRejectClick}
                              className="px-6 py-3 border border-red-200 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs text-rose-700 font-bold cursor-pointer transition-all flex items-center justify-center gap-1">
                              Reject
                            </button>
                            <button type="button" onClick={handlePmlApprove}
                              className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-emerald-600 text-white text-sm font-semibold rounded-xl border-0 cursor-pointer hover:bg-emerald-700 active:scale-[0.98] transition-all">
                              Approve
                            </button>
                          </>
                        )
                      ) : isReadOnly ? (
                        <>
                          {(selectedRtItem?.status === "tersimpan" && selectedRtItem?.reviewStatus !== "approved") && (
                            <button type="button" onClick={handleCancelSave}
                              className="px-4 py-3 border border-red-200 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs text-rose-700 font-bold cursor-pointer transition-all flex items-center justify-center gap-1">
                              Batal Simpan
                            </button>
                          )}
                          <button type="button" onClick={() => setView("prelist")}
                            className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl border-0 cursor-pointer hover:bg-blue-700 active:scale-[0.98] transition-all">
                            Kembali ke Prelist
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={handleSave}
                          className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl border-0 cursor-pointer hover:bg-blue-700 active:scale-[0.98] transition-all">
                          <Save size={14}/> Simpan Kuesioner
                        </button>
                      )}
                    </div>
                  ) : (
                    <button type="button" onClick={handleNextTab}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl border-0 cursor-pointer hover:bg-blue-700 active:scale-[0.98] transition-all">
                      Selanjutnya <ChevronRight size={14}/>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Activity Log Modal */}
      {selectedLogItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden" style={{ animation: "scaleUp 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <style>{`
              @keyframes scaleUp {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
            `}</style>
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Log Aktivitas</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{selectedLogItem.krt} ({selectedLogItem.id})</p>
              </div>
              <button 
                onClick={() => setSelectedLogItem(null)}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="px-6 py-6 max-h-[380px] overflow-y-auto space-y-4">
              {selectedLogItem.logs && selectedLogItem.logs.length > 0 ? (
                <div className="relative pl-6 border-l border-slate-200 space-y-5">
                  {selectedLogItem.logs.map((log, index) => {
                    const parts = log.split(": ");
                    const time = parts[0] || "";
                    const desc = parts.slice(1).join(": ") || "";
                    
                    let circleColor = "bg-slate-300 ring-slate-100";
                    let textColor = "text-slate-600";
                    
                    if (desc.includes("disetujui") || desc.includes("Approved")) {
                      circleColor = "bg-emerald-500 ring-emerald-100";
                      textColor = "text-emerald-800 font-semibold";
                    } else if (desc.includes("Ditolak") || desc.includes("Rejected")) {
                      circleColor = "bg-rose-500 ring-rose-105";
                      textColor = "text-rose-800 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-100 mt-1 block leading-relaxed";
                    } else if (desc.includes("kirim") || desc.includes("Terkirim")) {
                      circleColor = "bg-blue-500 ring-blue-100";
                      textColor = "text-blue-800 font-semibold";
                    } else if (desc.includes("simpan") || desc.includes("Tersimpan")) {
                      circleColor = "bg-teal-500 ring-teal-100";
                      textColor = "text-slate-700";
                    }

                    return (
                      <div key={index} className="relative text-xs leading-normal">
                        {/* Dot indicator */}
                        <div className={`absolute -left-[30px] top-0.5 w-3 h-3 rounded-full ring-4 ${circleColor}`} />
                        
                        <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                          <Clock size={10} /> {time}
                        </div>
                        <div className={`mt-0.5 ${textColor}`}>{desc}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">Belum ada log aktivitas untuk keluarga ini.</p>
              )}
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedLogItem(null)}
                className="px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl cursor-pointer border-0 shadow-sm transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Note Popup Modal */}
      {rejectionNoteItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden" style={{ animation: "scaleUp 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Catatan Rejection</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{rejectionNoteItem.krt} ({rejectionNoteItem.id})</p>
              </div>
              <button onClick={() => setRejectionNoteItem(null)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <label className="text-xs text-slate-500 font-bold block">Berikan catatan kesalahan / pesan kesalahan untuk PCL:</label>
              <textarea 
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                placeholder="Contoh: Keterangan Umur tidak sesuai dengan Status Perkawinan..."
                className="w-full h-24 p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-xs font-semibold text-slate-800 resize-none"
              />
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setRejectionNoteItem(null)} className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl cursor-pointer">
                Batal
              </button>
              <button 
                onClick={submitRejectionWithConfirmation}
                disabled={!rejectionNote.trim()}
                className={`px-4.5 py-2 font-semibold text-xs rounded-xl cursor-pointer border-0 shadow-sm transition-all ${
                  rejectionNote.trim() ? "bg-red-600 hover:bg-red-700 text-white" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Alert Modal */}
      {warningMessage && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden p-6 text-center space-y-4" style={{ animation: "scaleUp 0.15s ease-out both" }}>
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Akses Dibatasi</h4>
              <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">{warningMessage}</p>
            </div>
            <div className="pt-2">
              <button 
                onClick={() => setWarningMessage(null)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl cursor-pointer border-0 shadow-sm"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic Double-Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden" style={{ animation: "scaleUp 0.15s ease-out both" }}>
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{confirmDialog.title}</h4>
                <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">{confirmDialog.message}</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
              <button 
                onClick={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button 
                onClick={confirmDialog.onConfirm}
                className="px-5.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl cursor-pointer border-0 shadow-sm"
              >
                Yakin
              </button>
            </div>
          </div>
        </div>
      )}
    </PetugasLayout>
  );
}

export default PetugasQuestionnaire;