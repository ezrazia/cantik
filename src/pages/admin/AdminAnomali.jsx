import { useState, useEffect } from "react";
import AdminLayout from "../../components/layouts/AdminLayout";
import { Plus, Sliders, AlertTriangle, List, Search, Edit, Trash2, ChevronDown, CheckSquare, X, Command } from "lucide-react";
import { api } from "../../services/api";

/**
 * Halaman Freeform (Sementara/Mockup)
 * Mengelola aturan anomali dan daftar isian dinamis (dropdown, radio, dll).
 */
export default function AdminAnomali({ onNavigate, selectedProject, onProjectChange, activities, currentUser }) {
  const activeTab = "anomali";
  
  const act = activities.find(a => a.name === selectedProject);
  const selectedActivityId = act ? act.id : "";

  const [formVariables, setFormVariables] = useState([]);
  
  // Modal states
  const [showAnomalyModal, setShowAnomalyModal] = useState(false);
  const [anomalyForm, setAnomalyForm] = useState({ kode: "", logika: "", errorMessage: "" });
  const [varSearch, setVarSearch] = useState("");
  const [showVarDropdown, setShowVarDropdown] = useState(false);
  
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupForm, setGroupForm] = useState({ id: null, groupName: "", jsonInput: "", items: [] });

  const confirmAction = (message, action) => {
    if (window.confirm(message)) {
      action();
    }
  };

  const [anomaliesData, setAnomaliesData] = useState([]);
  const [optionsData, setOptionsData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch data dari backend API
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await api.freeform.getAll(selectedActivityId || undefined);
      if (response.success) {
        const data = response.data;
        setAnomaliesData(data.filter(item => item.type === 'ANOMALI'));
        setOptionsData(data.filter(item => item.type === 'PILIHAN_DINAMIS'));
      }
      
      // Fetch Form variables for anomaly autocomplete
      if (selectedActivityId) {
         try {
            const structRes = await api.form.getStructure(selectedActivityId);
            if (structRes?.success) {
              const rawBlocks = structRes.blocks || [];
              const rawQs = structRes.questions || [];
              
              const blocks = rawBlocks.map(b => ({
                id: b.kode,
                dbId: b.id,
                kode: b.kode,
                title: b.title
              }));

              const qs = rawQs.map(q => {
                 const correspondingBlock = rawBlocks.find(b => b.id === q.blok_id);
                 return {
                    id: q.id,
                    label: q.label,
                    type: q.type,
                    val: q.validation,
                    blokId: correspondingBlock ? correspondingBlock.kode : "",
                    parentId: q.parent_id,
                    sort_order: q.sort_order
                 };
              });
              
              const romanToDecimal = (roman) => {
                const map = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
                let dec = 0;
                const str = roman.toLowerCase();
                for (let i = 0; i < str.length; i++) {
                  const current = map[str[i]];
                  const next = map[str[i + 1]];
                  if (next && current < next) { dec += next - current; i++; } else { dec += current; }
                }
                return dec || 0;
              };
              
              const getQCode = (q, allQs, allBs) => {
                if (q.type === 'note') return "";
                const valStr = q.validation || q.val;
                if (valStr && valStr.trim().startsWith('{')) {
                  try {
                    const parsed = JSON.parse(valStr);
                    if (parsed.custom_code || parsed.customCode) return parsed.custom_code || parsed.customCode;
                  } catch(e) {}
                }
                
                const block = allBs.find(b => b.id === q.blokId || b.kode === q.blokId);
                let blockIdx = 0;
                if (block) {
                  const kodeStr = String(block.kode || block.id || "");
                  const match = kodeStr.match(/^Blok\s+([IVXLCDMivxlcdm]+)/i);
                  if (match) blockIdx = romanToDecimal(match[1]);
                }
                if (!blockIdx) {
                  const standardBlocks = allBs.filter(b => String(b.kode || b.id || "").startsWith("Blok "));
                  blockIdx = standardBlocks.findIndex(b => (b.id === q.blokId || b.kode === q.blokId)) + 1;
                }
                if (blockIdx === 0) return "";
                
                if (q.parentId) {
                  const parent = allQs.find(p => p.id === q.parentId);
                  if (!parent) return "";
                  const pCode = getQCode(parent, allQs, allBs);
                  if (!pCode) return "";
                  const siblings = allQs.filter(s => s.blokId === q.blokId && s.parentId === q.parentId).sort((a,b) => (a.sort_order||0)-(b.sort_order||0));
                  const sibIdx = siblings.findIndex(s => s.id === q.id);
                  if (parent.parentId) {
                    const romans = ["i","ii","iii","iv","v","vi","vii","viii","ix","x"];
                    return `${pCode}.${romans[sibIdx] || (sibIdx+1)}`;
                  }
                  return `${pCode}${String.fromCharCode(97 + (sibIdx>=0?sibIdx:0))}`;
                } else {
                  const mainQs = allQs.filter(s => s.blokId === q.blokId && !s.parentId && s.type !== 'note').sort((a,b) => (a.sort_order||0)-(b.sort_order||0));
                  let startIndex = 1;
                  const firstQ = mainQs[0];
                  if (firstQ) {
                    const fVal = firstQ.validation || firstQ.val;
                    if (fVal && fVal.trim().startsWith('{')) {
                      try {
                        const parsed = JSON.parse(fVal);
                        const cst = parsed.custom_code || parsed.customCode || "";
                        if (parsed.start_zero || parsed.start_from_zero || cst.endsWith("00") || cst==="400" || cst==="R400") startIndex = 0;
                      } catch(e) {}
                    }
                  }
                  const qIdx = mainQs.findIndex(s => s.id === q.id) + startIndex;
                  return `${blockIdx}${qIdx.toString().padStart(2,'0')}`;
                }
              };
              
              const vars = qs.map(q => {
                let code = getQCode(q, qs, blocks);
                if (code) code = `R${code}`;
                return { code, label: q.label };
              }).filter(v => v.code && v.label);
              
              setFormVariables(vars);
            }
         } catch(e) {
            console.error("Gagal mengambil variabel form", e);
         }
      } else {
         setFormVariables([]);
      }
    } catch (error) {
      console.error("Gagal mengambil data freeform", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedActivityId]);

  return (
    <AdminLayout 
      tab="admin-anomali" 
      onNavigate={onNavigate} 
      selectedProject={selectedProject} 
      onProjectChange={onProjectChange} 
      activities={activities}
    >
      <div className="p-4 md:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Sliders className="text-blue-600" />
              Aturan Anomali
            </h1>
            <p className="text-slate-500 mt-1 text-sm">Kelola aturan anomali spesifik untuk kegiatan yang dipilih.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                if (activeTab === "anomali") {
                  if (!selectedActivityId) {
                    alert("Silakan pilih kegiatan terlebih dahulu sebelum menambahkan anomali.");
                    return;
                  }
                  setAnomalyForm({ kode: "", logika: "", errorMessage: "" });
                  setShowAnomalyModal(true);
                } else {
                  setGroupForm({ id: null, groupName: "", jsonInput: "", items: [] });
                  setShowGroupModal(true);
                }
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus size={16} />
              Tambah {activeTab === "anomali" ? "Anomali" : "Kelompok"}
            </button>
          </div>
        </div>



        {/* Content Area */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          
          {/* Anomaly Project Selector Toolbar */}
          {activeTab === "anomali" && (
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row gap-4 md:items-center justify-between">
              <div className="flex-1 max-w-md">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Pilih Kegiatan (Master)</label>
                <div className="relative">
                  
                </div>
              </div>
              
              {selectedActivityId && (
                <div className="relative mt-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Cari rule anomali..." 
                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm w-full md:w-64 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Dynamic Options Toolbar */}
          {activeTab === "dinamis" && (
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Cari nama kelompok..." 
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm w-full md:w-64 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Tables */}
          {activeTab === "anomali" && !selectedActivityId ? (
            <div className="p-12 text-center flex flex-col items-center justify-center bg-white">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="text-slate-300" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">Belum Ada Kegiatan Terpilih</h3>
              <p className="text-slate-500 mt-2 max-w-sm">
                Silakan pilih kegiatan terlebih dahulu di atas untuk melihat atau menambahkan aturan anomali yang spesifik untuk kegiatan tersebut.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                    {activeTab === "anomali" ? (
                      <>
                        <th className="p-4 font-semibold w-1/6">Kode Anomali</th>
                        <th className="p-4 font-semibold w-2/6">Rumus / Logika</th>
                        <th className="p-4 font-semibold w-2/6">Pesan Error</th>
                        <th className="p-4 font-semibold text-center w-24">Aksi</th>
                      </>
                    ) : (
                      <>
                        <th className="p-4 font-semibold w-1/4">Nama Kelompok</th>
                        <th className="p-4 font-semibold w-2/4">Daftar Pilihan (Value : Label)</th>
                        <th className="p-4 font-semibold text-center w-24">Aksi</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeTab === "anomali" ? (
                    anomaliesData.map((item) => {
                      const payload = item.payload || {};
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <span className="inline-flex px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-xs font-bold border border-yellow-200">
                              {item.key_name}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="inline-flex px-3 py-1.5 bg-blue-50/50 text-blue-700 rounded-lg text-sm font-mono border border-blue-100/50">
                              {payload.logika}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-red-600 font-medium">{payload.errorMessage}</span>
                          </td>
                          <td className="p-4 text-right">
                            <button 
                              onClick={() => {
                                setAnomalyForm({
                                  id: item.id,
                                  kode: item.key_name,
                                  logika: payload.logika || "",
                                  errorMessage: payload.errorMessage || ""
                                });
                                setShowAnomalyModal(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-1 cursor-pointer"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => confirmAction("Anda yakin ingin menghapus aturan anomali ini?", async () => {
                                try {
                                  await api.freeform.delete(item.id);
                                  fetchData();
                                } catch(e) {
                                  alert("Gagal menghapus data");
                                }
                              })}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    optionsData.map((item) => {
                      const payload = item.payload || [];
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <span className="text-sm font-bold text-slate-700">{item.key_name}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-2">
                              {payload.map((opt, idx) => (
                                <div key={idx} className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs">
                                  <span className="font-mono text-slate-500 bg-white px-1.5 rounded-md border border-slate-200">{opt.value}</span>
                                  <span className="font-medium text-slate-700">{opt.label}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 text-center w-24">
                            <div className="flex justify-center">
                              <button 
                                onClick={() => {
                                  setGroupForm({
                                    id: item.id,
                                    groupName: item.key_name,
                                    jsonInput: "",
                                    items: payload
                                  });
                                  setShowGroupModal(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-1 cursor-pointer"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                onClick={() => confirmAction("Anda yakin ingin menghapus kelompok pilihan ini?", async () => {
                                  try {
                                    await api.freeform.delete(item.id);
                                    fetchData();
                                  } catch(e) {
                                    alert("Gagal menghapus data");
                                  }
                                })}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Empty State / Pagination (Dummy) */}
          {((activeTab === "anomali" && selectedActivityId) || activeTab === "dinamis") && (
            <div className="p-4 border-t border-slate-100 flex justify-between items-center text-slate-500 text-xs font-medium bg-slate-50">
              <span>Menampilkan {activeTab === "anomali" ? anomaliesData.length : optionsData.length} data.</span>
            </div>
          )}
        </div>
        
      </div>

      {/* MODAL TAMBAH/EDIT ANOMALI */}
      {showAnomalyModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="text-blue-600" size={18} />
                {anomalyForm.id ? "Edit Aturan Anomali" : "Tambah Aturan Anomali Baru"}
              </h3>
              <button onClick={() => setShowAnomalyModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Body Modal */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kode Anomali <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase"
                  placeholder="Misal: A11"
                  value={anomalyForm.kode}
                  onChange={e => setAnomalyForm({...anomalyForm, kode: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Rumus / Logika <span className="text-red-500">*</span></label>
                
                {/* Variabel Helper / Searchable Dropdown */}
                <div className="mb-3 relative">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Command size={14} className="text-slate-400"/> 
                    <span className="text-xs text-slate-500 font-medium">Cari dan sisipkan variabel form:</span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="text" 
                      placeholder="Ketik untuk mencari variabel (misal: R401)..."
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50"
                      value={varSearch}
                      onChange={(e) => {
                        setVarSearch(e.target.value);
                        setShowVarDropdown(true);
                      }}
                      onFocus={() => setShowVarDropdown(true)}
                    />
                    {showVarDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowVarDropdown(false)}></div>
                        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {formVariables.filter(v => 
                            v.code.toLowerCase().includes(varSearch.toLowerCase()) || 
                            v.label.toLowerCase().includes(varSearch.toLowerCase())
                          ).length === 0 ? (
                            <div className="px-4 py-3 text-sm text-slate-500 text-center">Variabel tidak ditemukan</div>
                          ) : (
                            formVariables.filter(v => 
                              v.code.toLowerCase().includes(varSearch.toLowerCase()) || 
                              v.label.toLowerCase().includes(varSearch.toLowerCase())
                            ).map(v => (
                              <button
                                key={v.code}
                                onClick={() => {
                                  const newLogika = anomalyForm.logika ? `${anomalyForm.logika} ${v.code}` : v.code;
                                  setAnomalyForm({...anomalyForm, logika: newLogika});
                                  setShowVarDropdown(false);
                                  setVarSearch("");
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-blue-50 hover:text-blue-700 text-sm flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 border-b border-slate-50 last:border-0 transition-colors"
                              >
                                <span className="font-mono font-semibold text-slate-700">{v.code}</span>
                                <span className="text-slate-500 truncate">{v.label}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <textarea 
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50 text-slate-800 placeholder-slate-400 shadow-inner"
                  placeholder="Ketik logika anomali di sini..."
                  value={anomalyForm.logika}
                  onChange={e => setAnomalyForm({...anomalyForm, logika: e.target.value})}
                />
                
                {/* Panduan Operator Logika */}
                <div className="mt-2 bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                  <p className="text-[11px] font-semibold text-blue-800 mb-1.5 uppercase tracking-wider">Operator yang Didukung:</p>
                  <div className="text-[10px] text-slate-600 mb-2 font-medium">
                    <span className="font-mono bg-white px-1 border border-slate-200 rounded mr-1">=</span> atau <span className="font-mono bg-white px-1 border border-slate-200 rounded mr-1">==</span> (Sama dengan)
                    <span className="font-mono bg-white px-1 border border-slate-200 rounded mx-1">=/</span> atau <span className="font-mono bg-white px-1 border border-slate-200 rounded mr-1">!=</span> (Tidak sama)
                    <span className="font-mono bg-white px-1 border border-slate-200 rounded mx-1">&gt;</span> <span className="font-mono bg-white px-1 border border-slate-200 rounded mr-1">&lt;</span> <span className="font-mono bg-white px-1 border border-slate-200 rounded mr-1">&gt;=</span> <span className="font-mono bg-white px-1 border border-slate-200 rounded mr-1">&lt;=</span> (Perbandingan)
                    <span className="font-mono bg-white px-1 border border-slate-200 rounded mx-1">AND</span> <span className="font-mono bg-white px-1 border border-slate-200 rounded mr-1">OR</span> <span className="font-mono bg-white px-1 border border-slate-200 rounded mx-1">JIKA</span> (Logika)
                  </div>
                  <ul className="text-[11px] text-slate-600 space-y-1.5 list-disc pl-4">
                    <li><span className="font-mono bg-white px-1 py-0.5 rounded border border-slate-100 text-blue-600">R401 = 0</span> : R401 bernilai 0 (Otomatis dibaca == oleh sistem)</li>
                    <li><span className="font-mono bg-white px-1 py-0.5 rounded border border-slate-100 text-blue-600">R101 = 'Petani'</span> : Gunakan <b className="text-red-500">tanda kutip (' ')</b> untuk isian berupa teks</li>
                    <li><span className="font-mono bg-white px-1 py-0.5 rounded border border-slate-100 text-blue-600">R501 &gt; R502</span> : Nilai R501 lebih besar dari R502</li>
                    <li><span className="font-mono bg-white px-1 py-0.5 rounded border border-slate-100 text-blue-600">R401 = 1 AND R402 &lt; 5</span> : R401 sama dengan 1 <b>DAN</b> R402 kurang dari 5</li>
                    <li><span className="font-mono bg-white px-1 py-0.5 rounded border border-slate-100 text-blue-600">R502 &lt; 5 JIKA R401 = 1</span> : <b>JIKA</b> R401 diisi 1, maka R502 akan dicek harus kurang dari 5</li>
                  </ul>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Pesan Error <span className="text-red-500">*</span></label>
                <textarea 
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Pesan yang akan muncul jika aturan ini dilanggar oleh petugas saat mengisi form..."
                  value={anomalyForm.errorMessage}
                  onChange={e => setAnomalyForm({...anomalyForm, errorMessage: e.target.value})}
                />
              </div>

            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowAnomalyModal(false)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button 
                onClick={() => confirmAction("Anda yakin ingin menyimpan aturan anomali ini?", async () => {
                  try {
                    const payload = {
                      logika: anomalyForm.logika,
                      errorMessage: anomalyForm.errorMessage
                    };
                    if (anomalyForm.id) {
                      await api.freeform.update(anomalyForm.id, {
                        kegiatan_id: selectedActivityId,
                        type: 'ANOMALI',
                        key_name: anomalyForm.kode,
                        payload
                      });
                    } else {
                      await api.freeform.create({
                        kegiatan_id: selectedActivityId,
                        type: 'ANOMALI',
                        key_name: anomalyForm.kode,
                        payload
                      });
                    }
                    setShowAnomalyModal(false);
                    fetchData();
                  } catch(e) {
                    alert("Terjadi kesalahan saat menyimpan anomali.");
                  }
                })}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Simpan Aturan
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* MODAL TAMBAH/EDIT KELOMPOK (PILIHAN DINAMIS) */}
      {showGroupModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CheckSquare className="text-blue-600" size={18} />
                {groupForm.id ? "Edit Kelompok Pilihan" : "Tambah Kelompok Pilihan Baru"}
              </h3>
              <button onClick={() => setShowGroupModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Body Modal */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Kelompok <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Misal: Pekerjaan, Status Kepemilikan Rumah..."
                  value={groupForm.groupName}
                  onChange={e => setGroupForm({...groupForm, groupName: e.target.value})}
                />
              </div>

              {/* JSON Input Mode (Hanya untuk Tambah) */}
              {!groupForm.id && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-sm font-semibold text-slate-700">Input JSON Massal (Opsional)</label>
                    <button 
                      onClick={() => {
                        try {
                          const parsed = JSON.parse(groupForm.jsonInput);
                          if (Array.isArray(parsed)) {
                            // Asumsikan array of objects dgn {value, label}
                            const validItems = parsed.filter(item => item.value !== undefined && item.label !== undefined);
                            if (validItems.length > 0) {
                              setGroupForm({...groupForm, items: [...groupForm.items, ...validItems], jsonInput: ""});
                              alert(`${validItems.length} opsi berhasil ditambahkan dari JSON!`);
                            } else {
                              alert("Format JSON tidak sesuai. Pastikan berbentuk array dengan properti 'value' dan 'label'.");
                            }
                          } else if (typeof parsed === "object") {
                             // Jika format key-value biasa {"1": "ASN", "2": "Wiraswasta"}
                             const validItems = Object.entries(parsed).map(([k, v]) => ({ value: k, label: v }));
                             setGroupForm({...groupForm, items: [...groupForm.items, ...validItems], jsonInput: ""});
                             alert(`${validItems.length} opsi berhasil ditambahkan dari JSON!`);
                          }
                        } catch (e) {
                          alert("JSON tidak valid! Periksa kembali sintaksnya.");
                        }
                      }}
                      className="text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded cursor-pointer transition-colors"
                    >
                      Ekstrak & Tambahkan
                    </button>
                  </div>
                  <textarea 
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50 text-slate-800 placeholder-slate-400 shadow-inner"
                    placeholder={`Contoh Format:\n[\n  {"value": "1", "label": "ASN"},\n  {"value": "2", "label": "Wiraswasta"}\n]\nAtau:\n{"1": "ASN", "2": "Wiraswasta"}`}
                    value={groupForm.jsonInput}
                    onChange={e => setGroupForm({...groupForm, jsonInput: e.target.value})}
                  />
                </div>
              )}

              {/* Daftar Pilihan Manual */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-slate-700">Daftar Pilihan (Value & Label)</label>
                  <button 
                    onClick={() => {
                      setGroupForm({
                        ...groupForm,
                        items: [...groupForm.items, { value: "", label: "" }]
                      });
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> Tambah Manual
                  </button>
                </div>
                
                {groupForm.items.length === 0 ? (
                  <div className="text-center p-6 border border-dashed border-slate-300 rounded-xl bg-slate-50">
                    <p className="text-sm text-slate-500">Belum ada pilihan ditambahkan.</p>
                    <p className="text-xs text-slate-400 mt-1">Gunakan input JSON di atas atau tambah manual.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {groupForm.items.map((opt, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input 
                          type="text" 
                          placeholder="Value (misal: 1)" 
                          className="w-1/3 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-mono"
                          value={opt.value}
                          onChange={(e) => {
                            const newItems = [...groupForm.items];
                            newItems[idx].value = e.target.value;
                            setGroupForm({...groupForm, items: newItems});
                          }}
                        />
                        <input 
                          type="text" 
                          placeholder="Label (misal: PNS / ASN)" 
                          className="w-2/3 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                          value={opt.label}
                          onChange={(e) => {
                            const newItems = [...groupForm.items];
                            newItems[idx].label = e.target.value;
                            setGroupForm({...groupForm, items: newItems});
                          }}
                        />
                        <button 
                          onClick={() => {
                            const newItems = groupForm.items.filter((_, i) => i !== idx);
                            setGroupForm({...groupForm, items: newItems});
                          }}
                          className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowGroupModal(false)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button 
                onClick={() => confirmAction("Anda yakin ingin menyimpan kelompok pilihan ini?", async () => {
                  try {
                    if (groupForm.id) {
                      await api.freeform.update(groupForm.id, {
                        kegiatan_id: selectedActivityId || null,
                        type: 'PILIHAN_DINAMIS',
                        key_name: groupForm.groupName,
                        payload: groupForm.items
                      });
                    } else {
                      await api.freeform.create({
                        kegiatan_id: selectedActivityId || null,
                        type: 'PILIHAN_DINAMIS',
                        key_name: groupForm.groupName,
                        payload: groupForm.items
                      });
                    }
                    setShowGroupModal(false);
                    fetchData();
                  } catch (e) {
                    alert("Terjadi kesalahan saat menyimpan pilihan dinamis.");
                  }
                })}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Simpan Kelompok
              </button>
            </div>
            
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
