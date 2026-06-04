import { useState, useEffect } from 'react';
import { Upload, Download, CheckCircle, Clock, AlertCircle, RefreshCcw, AlertTriangle } from "lucide-react";
import PetugasLayout from "../../components/layouts/PetugasLayout";
import { getRtList, saveRtItem } from "../../constants/mockData";

/**
 * Halaman sinkronisasi Petugas — minimalis & interactive.
 *
 * @param {Object} props
 * @param {(screen: string) => void} props.onNavigate
 * @returns {React.ReactElement}
 */
function PetugasSync({ onNavigate }) {
  const [localRtList, setLocalRtList] = useState([]);
  const [syncingAll, setSyncingAll] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null
  });

  const refreshList = () => {
    const list = getRtList().filter(rt => rt.petugasName === "Budi Santoso");
    setLocalRtList(list);
  };

  useEffect(() => {
    refreshList();
  }, []);

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

  const antriKirim = localRtList.filter(rt => rt.status === "tersimpan");
  const terkirim = localRtList.filter(rt => rt.status === "terkirim");
  const ditolak = localRtList.filter(rt => rt.reviewStatus === "rejected" && rt.status === "draft");

  // Show both in queue: ready to send (tersimpan) and synced (terkirim)
  const queueItems = localRtList.filter(rt => rt.status === "tersimpan" || rt.status === "terkirim");

  const handleSyncItem = (item) => {
    askConfirmation(
      "Kirim Dokumen",
      `Apakah Anda yakin ingin mengirim dokumen ${item.krt} (${item.id}) ke server?`,
      () => executeSyncItem(item)
    );
  };

  const executeSyncItem = (item) => {
    const timestamp = new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) + " " + new Date().toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' });
    const existingLogs = item.logs || [];
    const newLogs = [...existingLogs, `${timestamp}: Dokumen dikirim ke server (Terkirim)`];

    const updatedItem = {
      ...item,
      status: "terkirim",
      reviewStatus: item.reviewStatus === "rejected" ? "draft" : (item.reviewStatus || "draft"), // clear rejection to draft on sync
      logs: newLogs,
      lastSentData: {
        kecamatan: item.kecamatan,
        desa: item.desa,
        sls: item.sls,
        alamat: item.alamat,
        r201: item.r201,
        r202: item.r202,
        r203: item.r203,
        r204: item.r204,
        krt: item.krt,
        r302: item.r302,
        gender: item.gender,
        umur: item.umur,
        perkawinan: item.perkawinan,
        bekerja: item.bekerja,
        lapanganUsaha: item.lapanganUsaha,
        r401: item.r401,
        r402: item.r402,
        r403: item.r403,
        r501: item.r501,
        r502: item.r502,
        r503: item.r503,
        r504: item.r504,
      }
    };

    saveRtItem(updatedItem);
    refreshList();
  };

  const handleSyncAll = () => {
    if (antriKirim.length === 0) return;
    askConfirmation(
      "Kirim Semua Dokumen",
      "Apakah Anda yakin ingin mengirim semua dokumen yang ada di antrean ke server?",
      executeSyncAll
    );
  };

  const executeSyncAll = () => {
    setSyncingAll(true);
    setTimeout(() => {
      antriKirim.forEach(item => {
        const timestamp = new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) + " " + new Date().toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' });
        const existingLogs = item.logs || [];
        const newLogs = [...existingLogs, `${timestamp}: Dokumen dikirim ke server (Terkirim)`];

        const updatedItem = {
          ...item,
          status: "terkirim",
          reviewStatus: item.reviewStatus === "rejected" ? "draft" : (item.reviewStatus || "draft"),
          logs: newLogs,
          lastSentData: {
            kecamatan: item.kecamatan,
            desa: item.desa,
            sls: item.sls,
            alamat: item.alamat,
            r201: item.r201,
            r202: item.r202,
            r203: item.r203,
            r204: item.r204,
            krt: item.krt,
            r302: item.r302,
            gender: item.gender,
            umur: item.umur,
            perkawinan: item.perkawinan,
            bekerja: item.bekerja,
            lapanganUsaha: item.lapanganUsaha,
            r401: item.r401,
            r402: item.r402,
            r403: item.r403,
            r501: item.r501,
            r502: item.r502,
            r503: item.r503,
            r504: item.r504,
          }
        };
        saveRtItem(updatedItem);
      });
      refreshList();
      setSyncingAll(false);
    }, 800);
  };

  return (
    <PetugasLayout activeTab="petugas-sync" onNavigate={onNavigate}>
      <div className="min-h-screen bg-white slide-up pb-28">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="px-6 pt-12 pb-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Sinkronisasi</p>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Kirim & Unduh</h2>
              </div>
              <button onClick={refreshList}
                className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border-0 cursor-pointer hover:bg-blue-100 transition-all">
                <RefreshCcw size={18} className={syncingAll ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-4 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 p-4 rounded-xl text-center">
                    <p className="mono text-xl font-bold text-blue-600">{antriKirim.length}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Antri Kirim</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl text-center">
                    <p className="mono text-xl font-bold text-emerald-600">{terkirim.length}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Terkirim</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl text-center">
                    <p className="mono text-xl font-bold text-red-500">{ditolak.length}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Ditolak</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <button 
                    onClick={handleSyncAll}
                    disabled={antriKirim.length === 0 || syncingAll}
                    className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border-0 cursor-pointer transition-all ${
                      antriKirim.length === 0 || syncingAll
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
                    }`}
                  >
                    <Upload size={16} /> {syncingAll ? "Mengirim..." : "Kirim Semua Data"}
                  </button>
                  <button className="w-full py-3.5 bg-white text-slate-600 border border-slate-200 rounded-xl font-medium text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-all">
                    <Download size={16} /> Unduh Data Baru
                  </button>
                </div>

                <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-800">Informasi</p>
                    <p className="text-xs text-blue-600 mt-0.5 leading-relaxed font-medium">
                      Pastikan terhubung internet stabil sebelum mengirim data ke server BPS.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="lg:col-span-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">Antrian Dokumen</h3>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">{queueItems.length} Total</span>
                </div>
                <div className="space-y-2">
                  {queueItems.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center gap-4 hover:border-slate-200 transition-all group">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        item.status === 'terkirim' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {item.status === 'terkirim' ? <CheckCircle size={18} /> : <Clock size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{item.id} ({item.krt})</p>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">{item.alamat || "Alamat belum diisi"}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {item.status === 'tersimpan' ? (
                          <button 
                            onClick={() => handleSyncItem(item)}
                            className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold border-0 cursor-pointer transition-all"
                          >
                            Kirim
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">Terkirim</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {queueItems.length === 0 && (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl py-12 text-center">
                      <p className="text-xs text-slate-400 font-semibold">Tidak ada dokumen di antrian.</p>
                      <p className="text-[10px] text-slate-400 mt-1">Selesaikan kuesioner terlebih dahulu untuk mengirim data.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generic Double-Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden" style={{ animation: "scaleUp 0.15s ease-out both" }}>
            <style>{`
              @keyframes scaleUp {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
            `}</style>
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

export default PetugasSync;
