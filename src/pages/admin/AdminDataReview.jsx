import { useState, Fragment } from "react";
import AdminLayout from "../../components/layouts/AdminLayout";
import { RESPONSES_INIT, DESA_DATA } from "../../constants/mockData";
import Badge from "../../components/ui/Badge";
import ConfirmModal from "../../components/ui/ConfirmModal";
import useDropdown from "../../hooks/useDropdown";
import { Search, Eye, Check, X, AlertTriangle, Filter, Upload, Database, FileText } from "lucide-react";

/**
 * Halaman Review Data Admin — minimalis.
 *
 * @param {Object} props
 * @param {(screen: string) => void} props.onNavigate
 * @returns {React.ReactElement}
 */
function AdminDataReview({ onNavigate, selectedProject, onProjectChange, activities, onApproveDocument }) {
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(null);
  const [note, setNote] = useState("");
  const [data, setData] = useState(RESPONSES_INIT);

  // States for Prelist Upload Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);

  // Check activity status to decide if prelist is editable
  const activeActivity = activities?.find(a => a.name === selectedProject);
  const status = activeActivity ? activeActivity.status : "draft";

  const getStatusConfig = () => {
    switch (status) {
      case "published":
        return { dot: "bg-emerald-500", pulse: "bg-emerald-400", text: "text-emerald-600", bg: "bg-emerald-50", label: "Published" };
      case "selesai":
        return { dot: "bg-red-500", pulse: "bg-red-400", text: "text-red-600", bg: "bg-red-50", label: "Selesai" };
      case "uji_coba":
        return { dot: "bg-blue-500", pulse: "bg-blue-400", text: "text-blue-600", bg: "bg-blue-50", label: "Uji Coba" };
      case "draft":
      default:
        return { dot: "bg-amber-500", pulse: "bg-amber-400", text: "text-amber-600", bg: "bg-amber-50", label: "Draft" };
    }
  };

  const statusConfig = getStatusConfig();

  const isDraft = activeActivity ? activeActivity.status === "draft" : false;
  const canUploadPrelist = selectedProject && isDraft;

  const villages = ["Semua Desa", ...DESA_DATA.map(d => d.name)];
  const villageDropdown = useDropdown("Semua Desa");

  const villageData = villageDropdown.selected === "Semua Desa"
    ? data
    : data.filter(r => r.desa === villageDropdown.selected.replace("Desa ", ""));
  const filtered = filter === "all" ? villageData : villageData.filter(r => r.status === filter);
  const count = s => villageData.filter(r => r.status === s).length;

  // Grouping & Sorting: Prelist entries first, then Tambahan
  const sortedFiltered = [...filtered].sort((a, b) => {
    if (a.isPrelist && !b.isPrelist) return -1;
    if (!a.isPrelist && b.isPrelist) return 1;
    return b.id.localeCompare(a.id);
  });

  const approve = () => {
    setData(p => p.map(r => r.id === modal.id ? { ...r, status: "approved", flag: 0 } : r));
    if (onApproveDocument) {
      onApproveDocument(modal.desa);
    }
    setModal(null);
  };

  const reject = () => {
    setData(p => p.map(r => r.id === modal.id ? { ...r, status: "rejected" } : r));
    setModal(null); setNote("");
  };

  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,id,petugas,desa,nama_krt,alamat,warning_flags\nPL-101,,Harapan Jaya,Ahmad Riyadi,Jl. Cempaka No. 5,0\nPL-102,,Maju Bersama,Joko Widodo,Jl. Merdeka No. 10,0\nPL-103,,Sejahtera,Siti Aminah,Jl. Mawar No. 3,0";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_prelist_capi.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSimulateSelectFile = () => {
    setIsUploading(true);
    setTimeout(() => {
      setUploadedFile({
        name: "prelist_semua_desa_2026.xlsx",
        size: "38.2 KB",
        rowCount: 5
      });
      setDetectedColumns(["id", "petugas", "desa", "nama_krt", "alamat", "warning_flags"]);
      setPreviewRows([
        { id: "PL-301", petugas: "Belum Ditugaskan", desa: "Harapan Jaya", nama_krt: "Keluarga Slamet Riyadi", alamat: "Jl. Cempaka No. 5" },
        { id: "PL-302", petugas: "Belum Ditugaskan", desa: "Maju Bersama", nama_krt: "Keluarga Joko Wahyono", alamat: "Jl. Merdeka No. 10" },
        { id: "PL-303", petugas: "Belum Ditugaskan", desa: "Sejahtera", nama_krt: "Keluarga Sri Wahyuni", alamat: "Jl. Mawar No. 3" },
        { id: "PL-304", petugas: "Belum Ditugaskan", desa: "Harapan Jaya", nama_krt: "Keluarga Mulyono", alamat: "Jl. Dahlia No. 15" },
        { id: "PL-305", petugas: "Belum Ditugaskan", desa: "Maju Bersama", nama_krt: "Keluarga Bambang Hermawan", alamat: "Jl. Melati No. 8" }
      ]);
      setIsUploading(false);
    }, 1200);
  };

  const handleImportPrelist = () => {
    if (!uploadedFile || previewRows.length === 0) return;
    
    const randomOffset = Math.floor(Math.random() * 1000);
    const newItems = previewRows.map((row, index) => ({
      id: `PL-${301 + index + randomOffset}`,
      petugas: row.petugas,
      desa: row.desa,
      tgl: "—",
      status: "menunggu",
      flag: 0,
      isPrelist: true
    }));

    setData(prev => [...prev, ...newItems]);
    setIsSuccess(true);
    
    setTimeout(() => {
      setIsUploadModalOpen(false);
      setUploadedFile(null);
      setDetectedColumns([]);
      setPreviewRows([]);
      setIsSuccess(false);
    }, 1500);
  };

  return (
    <AdminLayout tab="admin-review" onNavigate={onNavigate} selectedProject={selectedProject} onProjectChange={onProjectChange} activities={activities}>
      <div className="p-6 lg:p-8 w-full slide-up">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Review Data</h1>
              {selectedProject && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-xl text-[10px] font-bold ${statusConfig.text} ${statusConfig.bg} border-slate-100/50 shadow-sm`}>
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusConfig.pulse}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${statusConfig.dot}`}></span>
                  </span>
                  <span className="uppercase tracking-wider font-bold">{statusConfig.label}</span>
                </div>
              )}
              <div className="relative">
                <button 
                  onClick={villageDropdown.toggle}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border-0 cursor-pointer hover:bg-blue-100 transition-all"
                >
                  {villageDropdown.selected} <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${villageDropdown.isOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
                </button>
                
                {villageDropdown.isOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={villageDropdown.close}/>
                    <div className="absolute left-0 top-full mt-1.5 bg-white rounded-xl shadow-lg z-20 py-1 border border-slate-100 w-56" style={{ animation: 'scaleIn 0.15s ease' }}>
                      {villages.map(v => (
                        <button key={v} onClick={() => villageDropdown.select(v)}
                          className={`w-full px-4 py-2.5 text-left text-xs border-0 cursor-pointer transition-all ${
                            villageDropdown.selected === v ? 'bg-blue-50 text-blue-600 font-semibold' : 'bg-white text-slate-500 hover:bg-slate-50 font-medium'
                          }`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button 
              disabled={!canUploadPrelist}
              onClick={() => setIsUploadModalOpen(true)}
              className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-semibold transition-all border-0 ${
                canUploadPrelist 
                  ? "bg-blue-600 hover:bg-blue-700 text-white hover:shadow cursor-pointer hover:scale-[1.01]" 
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
              title={
                !selectedProject 
                  ? "Pilih kegiatan terlebih dahulu" 
                  : !isDraft 
                    ? "Prelist dikunci karena kegiatan sudah dipublish" 
                    : "Unggah prelist keluarga"
              }
            >
              <Upload size={14}/>
              <span>Unggah Prelist</span>
            </button>
            <div className="flex-1 lg:w-72 flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
              <Search size={16} className="text-slate-400"/>
              <input className="text-sm outline-none text-slate-700 placeholder-slate-400 w-full bg-transparent font-medium" placeholder="Cari ID atau nama..."/>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", l: "Semua", c: villageData.length },
              { id: "menunggu", l: "Menunggu", c: count("menunggu") },
              { id: "submitted", l: "Submit", c: count("submitted") },
              { id: "pml_approved", l: "Disetujui PML", c: count("pml_approved") },
              { id: "approved", l: "Approved", c: count("approved") },
            ].map(t => (
              <button key={t.id} onClick={() => setFilter(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border-0 cursor-pointer transition-all ${
                  filter === t.id ? "text-white bg-blue-600" : "bg-white border border-slate-100 text-slate-500 hover:bg-slate-50"
                }`}>
                {t.l}
                <span className={`mono text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                  filter === t.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
                }`}>{t.c}</span>
              </button>
            ))}
          </div>
          
          <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 transition-all cursor-pointer">
            <Filter size={13}/> Urutkan
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 min-w-[950px]">
              <thead>
                <tr className="bg-slate-50/50">
                  {["ID", "Petugas", "Desa", "Tipe", "Tgl. Kirim", "Warning", "Status", "Aksi"].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-[11px] text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedFiltered.map((r, index) => {
                  const showPrelistHeader = index === 0 && r.isPrelist;
                  const showTambahanHeader = (index === 0 && !r.isPrelist) || (index > 0 && !r.isPrelist && sortedFiltered[index - 1].isPrelist);

                  return (
                    <Fragment key={r.id}>
                      {showPrelistHeader && (
                        <tr className="bg-slate-50/30">
                          <td colSpan={8} className="px-6 py-2.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase border-t border-b border-slate-100/80">
                            Target Prelist Desa ({sortedFiltered.filter(item => item.isPrelist).length} Keluarga)
                          </td>
                        </tr>
                      )}
                      {showTambahanHeader && (
                        <tr className="bg-indigo-50/10">
                          <td colSpan={8} className="px-6 py-2.5 text-[10px] font-bold text-indigo-500 tracking-wider uppercase border-t border-b border-indigo-50/30">
                            Temuan Baru / Tambahan Lapangan ({sortedFiltered.filter(item => !item.isPrelist).length} Keluarga)
                          </td>
                        </tr>
                      )}
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3.5 border-t border-slate-50">
                          <span className="mono text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-1 rounded-md">{r.id}</span>
                        </td>
                        <td className="px-6 py-3.5 border-t border-slate-50">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-[10px] font-semibold text-blue-600">
                              {r.petugas !== "Belum Ditugaskan" ? r.petugas.split(' ').map(n=>n[0]).join('') : "?"}
                            </div>
                            <span className="text-sm font-medium text-slate-700">{r.petugas}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 border-t border-slate-50 text-xs text-slate-500">{r.desa}</td>
                        <td className="px-6 py-3.5 border-t border-slate-50">
                          {r.isPrelist ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/50">
                              Prelist
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100/50">
                              Tambahan
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 border-t border-slate-50 mono text-xs text-slate-400">{r.tgl}</td>
                        <td className="px-6 py-3.5 border-t border-slate-50">
                          {r.flag > 0
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-600 rounded-md"><AlertTriangle size={11}/>{r.flag}</span>
                            : <span className="text-slate-200">—</span>}
                        </td>
                        <td className="px-6 py-3.5 border-t border-slate-50"><Badge status={r.status}/></td>
                        <td className="px-6 py-3.5 border-t border-slate-50">
                          <div className="flex items-center gap-1.5">
                            <button className="w-8 h-8 rounded-lg hover:bg-blue-50 flex items-center justify-center border-0 cursor-pointer text-slate-400 hover:text-blue-600 transition-all bg-transparent">
                              <Eye size={15}/>
                            </button>
                            {r.status === "pml_approved" && (
                              <>
                                <button onClick={() => setModal({ ...r, type: "approve" })}
                                  className="w-8 h-8 rounded-lg hover:bg-emerald-50 flex items-center justify-center border-0 cursor-pointer text-slate-400 hover:text-emerald-600 transition-all bg-transparent"
                                  title="Setujui (Admin)">
                                  <Check size={15}/>
                                </button>
                                <button onClick={() => setModal({ ...r, type: "reject" })}
                                  className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center border-0 cursor-pointer text-slate-400 hover:text-red-600 transition-all bg-transparent"
                                  title="Tolak (Admin)">
                                  <X size={15}/>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
                {sortedFiltered.length === 0 && (
                  <tr><td colSpan={8} className="px-6 py-16 text-center">
                    <Search size={24} className="text-slate-200 mx-auto mb-2"/>
                    <p className="text-xs text-slate-400 font-medium">Tidak ada dokumen di {villageDropdown.selected}</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          style={{ animation: 'fadeIn 0.2s ease' }}
          onClick={() => { if (!isUploading && !isSuccess) setIsUploadModalOpen(false); }}>
          <div className="bg-white rounded-2xl p-8 w-full shadow-lg"
            style={{ maxWidth: 580, animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}
            onClick={e => e.stopPropagation()}>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Database size={20}/>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Unggah Prelist Keluarga</h3>
                  <p className="text-xs text-slate-400">Unggah data baseline keluarga untuk dipetakan</p>
                </div>
              </div>
              <button 
                disabled={isUploading || isSuccess}
                onClick={() => setIsUploadModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center border-0 cursor-pointer text-slate-400 hover:text-slate-600 transition-all bg-transparent disabled:opacity-50">
                <X size={18}/>
              </button>
            </div>

            {isSuccess ? (
              <div className="py-8 text-center" style={{ animation: 'scaleIn 0.2s ease' }}>
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <Check size={36}/>
                </div>
                <h4 className="text-md font-bold text-slate-800 mb-1">Data Berhasil Diimpor!</h4>
                <p className="text-xs text-slate-400">Target Prelist keluarga telah ditambahkan ke sistem.</p>
              </div>
            ) : (
              <>
                <div className="space-y-5">
                  <div className="flex items-center justify-between border border-slate-100 bg-slate-50/50 rounded-xl p-3.5">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Butuh template kolom file?</p>
                      <p className="text-[10px] text-slate-400">Gunakan format template standar agar data terbaca otomatis</p>
                    </div>
                    <button 
                      onClick={handleDownloadTemplate}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-blue-600 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    >
                      <Upload size={12} className="rotate-180"/>
                      Unduh Template
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2">File Prelist (Excel / CSV)</label>
                    {!uploadedFile ? (
                      <div 
                        onClick={handleSimulateSelectFile}
                        className={`border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-blue-50/10 flex flex-col items-center justify-center ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
                      >
                        {isUploading ? (
                          <>
                            <div className="w-8 h-8 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin mb-3"/>
                            <p className="text-xs font-medium text-slate-500">Membaca dan memvalidasi file...</p>
                          </>
                        ) : (
                          <>
                            <Upload size={28} className="text-slate-300 mb-2.5" />
                            <p className="text-xs font-semibold text-slate-700 mb-1">
                              Klik untuk pilih file prelist keluarga
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Mendukung format xlsx/csv untuk semua desa sekaligus
                            </p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4" style={{ animation: 'scaleIn 0.15s ease' }}>
                        {/* File details card */}
                        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                              <FileText size={18}/>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 line-clamp-1">{uploadedFile.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{uploadedFile.size} • Terdeteksi {uploadedFile.rowCount} data keluarga</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              setUploadedFile(null);
                              setDetectedColumns([]);
                              setPreviewRows([]);
                            }}
                            className="w-7 h-7 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg flex items-center justify-center border-0 bg-transparent cursor-pointer transition-all"
                          >
                            <X size={14}/>
                          </button>
                        </div>

                        {/* Review Kolom Terdeteksi */}
                        <div>
                          <span className="block text-xs font-semibold text-slate-500 mb-2">Kolom Terdeteksi</span>
                          <div className="flex flex-wrap gap-1.5">
                            {detectedColumns.map(c => (
                              <span key={c} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-semibold border border-blue-100/50">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Review Baris Data (Preview Table) */}
                        <div>
                          <span className="block text-xs font-semibold text-slate-500 mb-2">Pratinjau Data (Semua Desa)</span>
                          <div className="border border-slate-100 rounded-xl overflow-hidden text-[11px] bg-slate-50/30">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="bg-slate-50/60 text-slate-400 font-semibold border-b border-slate-100 text-left">
                                  <th className="px-3 py-2">ID</th>
                                  <th className="px-3 py-2">Nama KRT</th>
                                  <th className="px-3 py-2">Desa</th>
                                  <th className="px-3 py-2">Alamat</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                                {previewRows.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="px-3 py-2 mono font-semibold">{row.id}</td>
                                    <td className="px-3 py-2 text-slate-700">{row.nama_krt}</td>
                                    <td className="px-3 py-2">
                                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase">
                                        {row.desa}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-slate-400 truncate max-w-[150px]">{row.alamat}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-[10px] text-emerald-600 font-semibold mt-2 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-emerald-500"/> Semua baris data memiliki pemetaan desa yang valid.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    disabled={isUploading}
                    onClick={() => {
                      setIsUploadModalOpen(false);
                      setUploadedFile(null);
                      setDetectedColumns([]);
                      setPreviewRows([]);
                    }}
                    className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-medium text-slate-600 cursor-pointer transition-all border-0 disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button 
                    disabled={!uploadedFile || isUploading}
                    onClick={handleImportPrelist}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-white border-0 cursor-pointer transition-all hover:shadow active:scale-[0.98]"
                  >
                    Impor Data
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {modal && (
        <ConfirmModal
          type={modal.type}
          documentId={modal.id}
          petugasName={modal.petugas}
          flagCount={modal.flag}
          note={note}
          onNoteChange={e => setNote(e.target.value)}
          onConfirm={modal.type === "approve" ? approve : reject}
          onCancel={() => setModal(null)}
        />
      )}
    </AdminLayout>
  );
}

export default AdminDataReview;