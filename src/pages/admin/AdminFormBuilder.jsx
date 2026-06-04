import AdminLayout from "../../components/layouts/AdminLayout";
import { FORM_QS_INIT, DESA_DATA } from "../../constants/mockData";
import { useState } from "react";
import { Hash, Eye, Save, Settings, Plus, ChevronDown, List, Type, Trash2, Upload, Database, FileText, X, Check } from "lucide-react";

/**
 * Form Builder Admin — minimalis.
 *
 * @param {Object} props
 * @param {(screen: string) => void} props.onNavigate
 * @returns {React.ReactElement}
 */
function AdminFormBuilder({ onNavigate, selectedProject, onProjectChange, activities }) {
  const [questions, setQuestions] = useState(FORM_QS_INIT);
  const [activeBlok, setActiveBlok] = useState("Blok III");
  const [showAdd, setShowAdd]     = useState(false);
  const [selected, setSelected]   = useState(null);
  const [newQ, setNewQ]           = useState({r:"",label:"",type:"text",req:true});

  // States for Questionnaire Upload Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);

  // Check activity status to decide if builder is editable
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
  const canEdit = selectedProject && isDraft;

  const BLOKS = [
    {id:"Blok I",   title:"Pengenalan Tempat",   n:6 },
    {id:"Blok II",  title:"Keterangan RT",        n:5 },
    {id:"Blok III", title:"Keterangan Anggota",   n:8 },
    {id:"Blok IV",  title:"Keterangan Perumahan", n:10},
    {id:"Blok V",   title:"Keterangan Usaha",     n:7, cond:true},
  ];
  const typeIcon = {text:Type,number:Hash,radio:List,select:ChevronDown};

  const addQ = () => {
    if (!newQ.r || !newQ.label) return;
    setQuestions(p => [...p,{id:Date.now(),...newQ,val:null,skip:null}]);
    setNewQ({r:"",label:"",type:"text",req:true});
    setShowAdd(false);
  };

  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,r_number,label,type,required,validation_rule,skip_logic\n309,Apakah ada anggota keluarga yang disabilitas?,radio,Ya,,310,Jumlah kepemilikan aset kendaraan,number,Tidak,range: 0–99,\n311,Sumber air minum utama,select,Ya,,\n312,Bahan atap terluas,select,Ya,,";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_pertanyaan_capi.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSimulateSelectFile = () => {
    setIsUploading(true);
    setTimeout(() => {
      setUploadedFile({
        name: "kuesioner_tambahan_blok3.xlsx",
        size: "18.4 KB",
        rowCount: 4
      });
      setDetectedColumns(["r_number", "label", "type", "required", "validation_rule", "skip_logic"]);
      setPreviewRows([
        { r: "309", label: "Apakah ada anggota keluarga yang disabilitas?", type: "radio", req: "Ya", val: "", skip: "" },
        { r: "310", label: "Jumlah kepemilikan aset kendaraan", type: "number", req: "Tidak", val: "range: 0–99", skip: "" },
        { r: "311", label: "Sumber air minum utama", type: "select", req: "Ya", val: "", skip: "" },
        { r: "312", label: "Bahan atap terluas", type: "select", req: "Ya", val: "", skip: "" }
      ]);
      setIsUploading(false);
    }, 1200);
  };

  const handleImportQuestions = () => {
    if (!uploadedFile || previewRows.length === 0) return;
    
    const newQList = previewRows.map((row, index) => ({
      id: Date.now() + index,
      r: row.r,
      label: row.label,
      type: row.type,
      req: row.req === "Ya" || row.req === true,
      val: row.val || null,
      skip: row.skip || null
    }));

    setQuestions(prev => [...prev, ...newQList]);
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
    <AdminLayout tab="admin-builder" onNavigate={onNavigate} selectedProject={selectedProject} onProjectChange={onProjectChange} activities={activities}>
      <div className="p-6 lg:p-8 w-full slide-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Form Builder</h1>
                {selectedProject && (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-xl text-[10px] font-bold ${statusConfig.text} ${statusConfig.bg} border-slate-100/50 shadow-sm`}>
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusConfig.pulse}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${statusConfig.dot}`}></span>
                    </span>
                    <span className="uppercase tracking-wider font-bold">{statusConfig.label}</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-400 font-medium">Kelola struktur kuesioner untuk {selectedProject || "Desa Cantik"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-500 cursor-pointer hover:bg-slate-50 transition-all">
              <Eye size={14}/> Preview
            </button>
            <button 
              disabled={!canEdit}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl border-0 transition-all ${
                canEdit 
                  ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-[0.98]" 
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
              title={!canEdit ? "Kuesioner hanya dapat disimpan ketika berstatus Draft" : "Simpan kuesioner"}
            >
              <Save size={14}/> Simpan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Blok list */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-50">
                <h3 className="text-xs font-semibold text-slate-400">Struktur Blok</h3>
              </div>
              {BLOKS.map(b => (
                <button key={b.id} onClick={() => setActiveBlok(b.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left border-0 cursor-pointer transition-all ${
                    activeBlok === b.id ? "bg-blue-50 text-blue-600 font-semibold" : "bg-transparent text-slate-600 hover:bg-slate-50 font-medium"
                  } text-xs`}>
                  <div>
                    <p className={`${activeBlok === b.id ? 'text-blue-600' : 'text-slate-700'} font-semibold text-xs`}>{b.id}</p>
                    <p className={`text-[10px] mt-0.5 ${activeBlok === b.id ? 'text-blue-500' : 'text-slate-400'}`}>{b.title}</p>
                  </div>
                  <span className={`mono text-[10px] px-2 py-0.5 rounded-md font-medium ${
                    activeBlok === b.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-50 text-slate-400'
                  }`}>{b.n}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Center: Questions */}
          <div className="lg:col-span-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">{activeBlok} — Daftar Rincian</h3>
              <div className="flex items-center gap-1.5">
                <button 
                  disabled={!canEdit}
                  onClick={() => setIsUploadModalOpen(true)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border-0 transition-all ${
                    canEdit 
                      ? "text-blue-600 bg-blue-50 hover:bg-blue-100 cursor-pointer" 
                      : "bg-slate-50 text-slate-300 cursor-not-allowed"
                  }`}
                  title={!canEdit ? "Impor dinonaktifkan untuk kegiatan published" : "Impor daftar rincian pertanyaan via Excel/CSV"}
                >
                  <Upload size={13}/>
                  <span>Impor Excel</span>
                </button>
                <button 
                  disabled={!canEdit}
                  onClick={() => setShowAdd(!showAdd)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border-0 transition-all ${
                    canEdit 
                      ? "text-blue-600 bg-blue-50 hover:bg-blue-100 cursor-pointer" 
                      : "bg-slate-50 text-slate-300 cursor-not-allowed"
                  }`}
                  title={!canEdit ? "Tambah dinonaktifkan untuk kegiatan published" : "Tambah rincian secara manual"}
                >
                  <Plus size={13}/>
                  <span>Tambah</span>
                </button>
              </div>
            </div>

            {/* Add form */}
            {showAdd && (
              <div className="bg-white rounded-xl border border-blue-100 p-5 mb-4" style={{ animation: 'slideUp 0.2s ease' }}>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5">No. Rincian</label>
                    <input value={newQ.r} onChange={e => setNewQ({...newQ, r: e.target.value})}
                      className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium text-slate-700" placeholder="309"/>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Tipe</label>
                    <select value={newQ.type} onChange={e => setNewQ({...newQ, type: e.target.value})}
                      className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium text-slate-700 cursor-pointer">
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="radio">Radio</option>
                      <option value="select">Select</option>
                    </select>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Label</label>
                  <input value={newQ.label} onChange={e => setNewQ({...newQ, label: e.target.value})}
                    className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium text-slate-700" placeholder="Nama pertanyaan"/>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-500 cursor-pointer">
                    <input type="checkbox" checked={newQ.req} onChange={e => setNewQ({...newQ, req: e.target.checked})} className="rounded accent-blue-600"/>
                    Wajib diisi
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-xs font-medium text-slate-400 bg-slate-50 rounded-lg border-0 cursor-pointer hover:bg-slate-100 transition-all">Batal</button>
                    <button onClick={addQ} className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg border-0 cursor-pointer hover:bg-blue-700 transition-all">Tambah</button>
                  </div>
                </div>
              </div>
            )}

            {/* Question list */}
            <div className="space-y-2">
              {questions.map((q, i) => {
                const Icon = typeIcon[q.type] || Type;
                const isSelected = selected?.id === q.id;
                return (
                  <button key={q.id} onClick={() => setSelected(isSelected ? null : q)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl text-left border cursor-pointer transition-all ${
                      isSelected ? "border-blue-200 bg-blue-50/50 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200"
                    }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "bg-blue-100 text-blue-600" : "bg-slate-50 text-slate-400"
                    }`}>
                      <Icon size={15}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="mono text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">R.{q.r}</span>
                        {q.req && <span className="w-1 h-1 rounded-full bg-red-400"/>}
                      </div>
                      <p className="text-sm font-medium text-slate-700 truncate mt-0.5">{q.label}</p>
                    </div>
                    {q.skip && (
                      <span className="text-[9px] font-medium text-amber-500 bg-amber-50 px-2 py-0.5 rounded flex-shrink-0">Skip</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Properties */}
          <div className="lg:col-span-4">
            {selected ? (
              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden sticky top-6">
                <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-400">Properti Rincian</h3>
                  <Settings size={14} className="text-slate-300"/>
                </div>
                {!canEdit && (
                  <div className="mx-5 mt-4 px-3.5 py-2.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-xl border border-amber-100/50 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0"/>
                    Properti hanya dapat direview (Mode Read-Only)
                  </div>
                )}
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5">No. Rincian</label>
                    <input value={selected.r} readOnly
                      className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-100 rounded-lg text-slate-500 mono font-medium outline-none"/>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Label</label>
                    <input value={selected.label} readOnly
                      className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-100 rounded-lg text-slate-700 font-medium outline-none"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Tipe Input</label>
                      <div className="px-3 py-2.5 text-xs bg-slate-50 border border-slate-100 rounded-lg text-slate-600 font-medium capitalize">{selected.type}</div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Wajib</label>
                      <div className={`px-3 py-2.5 text-xs border border-slate-100 rounded-lg font-medium ${
                        selected.req ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-400"
                      }`}>{selected.req ? "Ya" : "Tidak"}</div>
                    </div>
                  </div>
                  {selected.val && (
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Validasi</label>
                      <div className="px-3 py-2.5 text-xs bg-amber-50 border border-amber-100 rounded-lg text-amber-700 font-medium">{selected.val}</div>
                    </div>
                  )}
                  {selected.skip && (
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Skip Logic</label>
                      <div className="px-3 py-2.5 text-xs bg-blue-50 border border-blue-100 rounded-lg text-blue-700 font-medium">{selected.skip}</div>
                    </div>
                  )}
                  <button 
                    disabled={!canEdit}
                    className={`w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium rounded-lg border-0 transition-all mt-2 ${
                      canEdit 
                        ? "text-red-500 bg-red-50 hover:bg-red-100 cursor-pointer" 
                        : "bg-slate-50 text-slate-300 cursor-not-allowed"
                    }`}
                    title={!canEdit ? "Tidak dapat menghapus rincian kegiatan published" : "Hapus rincian ini"}
                  >
                    <Trash2 size={13}/> Hapus Rincian
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
                <Settings size={28} className="text-slate-200 mb-3"/>
                <p className="text-sm text-slate-400 font-medium">Pilih rincian untuk melihat propertinya</p>
                <p className="text-xs text-slate-300 mt-1">Klik pada item di daftar rincian</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unggah Pertanyaan Modal */}
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
                  <h3 className="text-lg font-bold text-slate-900">Unggah Rincian Pertanyaan</h3>
                  <p className="text-xs text-slate-400">Impor daftar pertanyaan kuesioner sekaligus via Excel/CSV</p>
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
                <h4 className="text-md font-bold text-slate-800 mb-1">Rincian Pertanyaan Berhasil Diimpor!</h4>
                <p className="text-xs text-slate-400">Pertanyaan baru telah ditambahkan ke {activeBlok}.</p>
              </div>
            ) : (
              <>
                <div className="space-y-5">
                  <div className="flex items-center justify-between border border-slate-100 bg-slate-50/50 rounded-xl p-3.5">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Butuh template kolom pertanyaan?</p>
                      <p className="text-[10px] text-slate-400">Gunakan format template standar agar kolom data terpetakan otomatis</p>
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
                    <label className="block text-xs font-semibold text-slate-500 mb-2">File Kuesioner (Excel / CSV)</label>
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
                              Klik untuk pilih file pertanyaan kuesioner
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Mendukung format xlsx/csv sesuai dengan struktur rincian CAPI BPS
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
                              <p className="text-[10px] text-slate-400 font-medium">{uploadedFile.size} • Terdeteksi {uploadedFile.rowCount} rincian pertanyaan</p>
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
                          <span className="block text-xs font-semibold text-slate-500 mb-2">Pratinjau Pertanyaan (Akan Diimpor ke {activeBlok})</span>
                          <div className="border border-slate-100 rounded-xl overflow-hidden text-[11px] bg-slate-50/30">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="bg-slate-50/60 text-slate-400 font-semibold border-b border-slate-100 text-left">
                                  <th className="px-3 py-2 w-16">No. Rincian</th>
                                  <th className="px-3 py-2">Pertanyaan / Label</th>
                                  <th className="px-3 py-2 w-16">Tipe</th>
                                  <th className="px-3 py-2 w-16">Wajib</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                                {previewRows.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="px-3 py-2 mono font-semibold text-blue-600">R.{row.r}</td>
                                    <td className="px-3 py-2 text-slate-700">{row.label}</td>
                                    <td className="px-3 py-2">
                                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase">
                                        {row.type}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-slate-400">
                                      {row.req}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-[10px] text-emerald-600 font-semibold mt-2 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-emerald-500"/> Validasi format sukses. Struktur rincian kuesioner siap diimpor.
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
                    onClick={handleImportQuestions}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-white border-0 cursor-pointer transition-all hover:shadow active:scale-[0.98]"
                  >
                    Impor Pertanyaan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminFormBuilder;