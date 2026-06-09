import { useState, useEffect } from "react";
import { WifiOff, Wifi, Bell, MapPin, FileText, Upload, Download, ChevronRight, CheckCircle, AlertCircle, Calendar, RefreshCw } from "lucide-react";
import PetugasLayout from "../../components/layouts/PetugasLayout";
import { api } from "../../services/api";

/**
 * Halaman beranda Petugas — minimalis dan clean.
 *
 * @param {Object} props
 * @param {(screen: string) => void} props.onNavigate
 * @param {boolean} props.isOffline
 * @param {(value: boolean) => void} props.setIsOffline
 * @param {Array} props.petugas
 * @param {Array} props.activities
 * @param {Object} props.currentUser
 * @returns {React.ReactElement}
 */
function PetugasHome({ onNavigate, isOffline, setIsOffline, petugas, activities, currentUser }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadTime, setDownloadTime] = useState(localStorage.getItem(`last_download_${currentUser.id}`) || null);

  const currentPetugas = petugas?.find(p => p.id === currentUser.id) || currentUser;

  const handleDownloadOfflineData = async () => {
    if (isOffline) {
      alert("Anda sedang dalam mode offline. Silakan aktifkan mode online untuk mengunduh kuesioner.");
      return;
    }
    setIsDownloading(true);
    try {
      // 1. Download documents (prelist)
      const docs = await api.dokumen.getByPetugas(currentUser.id);
      setDocuments(docs);
      localStorage.setItem(`offline_docs_${currentUser.id}`, JSON.stringify(docs));

      // 2. Download form structures for all assigned activities
      if (officerActivities && officerActivities.length > 0) {
        for (const act of officerActivities) {
          const res = await api.form.getStructure(act.id);
          if (res && res.success) {
            localStorage.setItem(`form_structure_${act.id}`, JSON.stringify({
              blocks: res.blocks,
              questions: res.questions
            }));
          }
        }
      }

      // 3. Save download time stamp
      const now = new Date();
      const timeStr = now.toLocaleDateString("id-ID", { day: 'numeric', month: 'short' }) + " " + now.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
      localStorage.setItem(`last_download_${currentUser.id}`, timeStr);
      setDownloadTime(timeStr);

      alert("Kuesioner dan data prelist berhasil diunduh. Anda sekarang dapat mengisi kuesioner secara offline.");
    } catch (err) {
      console.error("Gagal mengunduh kuesioner offline:", err);
      alert("Gagal mengunduh data offline: " + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const loadDocs = async () => {
    if (isOffline) {
      // Load from localStorage
      const cached = localStorage.getItem(`offline_docs_${currentUser.id}`);
      if (cached) {
        try {
          setDocuments(JSON.parse(cached));
        } catch (e) {
          console.error("Gagal parse cached offline docs:", e);
        }
      }
    } else {
      setLoading(true);
      try {
        const docs = await api.dokumen.getByPetugas(currentUser.id);
        setDocuments(docs);
        // Sync cache
        localStorage.setItem(`offline_docs_${currentUser.id}`, JSON.stringify(docs));
      } catch (err) {
        console.error("Gagal load dokumen dari server:", err);
        // Fallback to cache if request fails
        const cached = localStorage.getItem(`offline_docs_${currentUser.id}`);
        if (cached) {
          try {
            setDocuments(JSON.parse(cached));
          } catch (e) {
            console.error("Gagal parse cached offline docs:", e);
          }
        }
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadDocs();
  }, [currentUser.id, isOffline]);

  const officerActivities = (currentPetugas.projects || [])
    .map(projName => {
      const act = activities?.find(a => a.name === projName);
      if (!act) return null;
      return {
        ...act,
        role: currentPetugas.projectRoles?.[projName] || "PCL"
      };
    })
    .filter(act => act && act.status !== "draft" && act.status !== "selesai");

  // Calculate live statistics
  const targetCount = documents.length;
  const selesaiCount = documents.filter(d => d.review_status === 'approved').length;
  const kirimCount = documents.filter(d => d.status === 'terkirim' && d.review_status !== 'rejected').length;
  const ditolakCount = documents.filter(d => d.review_status === 'rejected').length;
  const antriKirimCount = documents.filter(d => d.status === 'tersimpan').length;

  return (
    <PetugasLayout activeTab="petugas-home" onNavigate={onNavigate}>
      <div className="min-h-screen bg-white slide-up pb-24">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="px-6 pt-12 pb-6 border-b border-solid border-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Selamat datang,</p>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight">{currentPetugas.name || currentPetugas.username}</h2>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <MapPin size={12} className="text-blue-500"/>
                  <span className="text-xs text-slate-400 font-medium">Desa {currentPetugas.desa || "Belum Ditentukan"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsOffline(!isOffline)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border-0 cursor-pointer transition-all ${
                    isOffline ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"
                  }`}>
                  {isOffline ? <WifiOff size={14}/> : <Wifi size={14}/>}
                  <span className="hidden sm:inline">{isOffline ? "Offline" : "Online"}</span>
                </button>
                <button 
                  onClick={loadDocs}
                  className="w-9 h-9 bg-slate-50 hover:bg-slate-100 text-slate-400 transition-all border-0 cursor-pointer rounded-lg flex items-center justify-center"
                >
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Offline banner */}
            {isOffline && (
              <div className="mb-6 px-4 py-3 bg-amber-50 border border-solid border-amber-100 rounded-xl flex items-start gap-3" style={{ animation: 'slideUp 0.3s ease' }}>
                <WifiOff size={16} className="text-amber-500 flex-shrink-0 mt-0.5"/>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Mode Offline Aktif</p>
                  <p className="text-xs text-amber-600 mt-0.5">Data tersimpan otomatis di perangkat dan siap disinkronisasi.</p>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-8">
              {[
                { l: "Target", v: targetCount, c: "text-slate-900" },
                { l: "Selesai", v: selesaiCount, c: "text-emerald-600" },
                { l: "Kirim", v: kirimCount, c: "text-blue-600" },
                { l: "Ditolak", v: ditolakCount, c: "text-red-500" },
              ].map(s => (
                <div key={s.l} className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className={`mono text-2xl font-bold ${s.c}`}>{s.v}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{s.l}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
              <button onClick={() => onNavigate("questionnaire")}
                className="bg-white rounded-xl p-5 border border-solid border-slate-100 text-left cursor-pointer transition-all hover:border-blue-200 hover:shadow-sm group">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                  <FileText size={20} className="text-blue-600"/>
                </div>
                <p className="text-sm font-semibold text-slate-800">Isi Kuesioner</p>
                <p className="text-xs text-slate-400 mt-0.5">Lanjutkan atau buat baru</p>
              </button>
              
              <button onClick={() => onNavigate("petugas-sync")}
                className="bg-blue-600 rounded-xl p-5 text-left cursor-pointer border-0 transition-all hover:bg-blue-700 group active:scale-[0.98]">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-white/15">
                  <Upload size={20} color="white"/>
                </div>
                <p className="text-sm font-semibold text-white">Sinkronisasi</p>
                <p className="text-xs mt-0.5 text-blue-200">{antriKirimCount} dokumen antri kirim</p>
              </button>

              <button 
                onClick={handleDownloadOfflineData}
                disabled={isDownloading}
                className="bg-white rounded-xl p-5 border border-solid border-slate-100 text-left cursor-pointer transition-all hover:border-slate-200 hover:shadow-sm group disabled:opacity-75 disabled:cursor-not-allowed">
                <div className="flex items-start justify-between w-full">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                    {isDownloading ? (
                      <RefreshCw size={18} className="text-blue-600 animate-spin" />
                    ) : (
                      <Download size={18} className="text-slate-500"/>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-slate-200 group-hover:text-slate-400 transition-colors mt-1"/>
                </div>
                <div className="mt-3">
                  <p className="text-sm font-semibold text-slate-800">Unduh Kuesioner</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isDownloading ? "Mengunduh data..." : downloadTime ? `Terunduh: ${downloadTime}` : "Belum diunduh untuk offline"}
                  </p>
                </div>
              </button>
            </div>

            {/* Kegiatan Berlangsung */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900">Kegiatan Berlangsung</h3>
                <button className="text-xs text-blue-600 font-medium border-0 bg-transparent cursor-pointer hover:underline">Lihat semua</button>
              </div>
              <div className="space-y-3">
                {officerActivities.map((act) => (
                  <button key={act.name} onClick={() => onNavigate("questionnaire")}
                    className="w-full bg-white rounded-2xl p-5 border border-solid border-slate-100 flex flex-col gap-4 text-left cursor-pointer transition-all hover:border-blue-300 hover:shadow-md group relative overflow-hidden">
                    
                    {/* Border accent indicator */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${act.color || 'bg-blue-600'}`} />

                    <div className="flex items-start justify-between w-full">
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors truncate">
                          {act.name}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 font-medium line-clamp-2 leading-relaxed">
                          {act.description}
                        </p>
                      </div>
                      
                      {/* Role Badge */}
                      <div className="flex-shrink-0">
                        {act.role === "PML" ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-solid border-purple-100/50 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                            Pengawas (PML)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-solid border-blue-100/50 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            Pencacah (PCL)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar and details */}
                    <div className="flex flex-col gap-2 pt-3 border-t border-solid border-slate-50">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          Mulai: {act.start_date ? new Date(act.start_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
                        </span>
                        <span className="font-bold text-slate-700">{act.progress}% Selesai</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${act.color || 'bg-blue-600'}`}
                          style={{ width: `${act.progress}%` }}
                        />
                      </div>
                    </div>
                  </button>
                ))}
                {officerActivities.length === 0 && (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl py-12 text-center">
                    <p className="text-xs text-slate-400 font-semibold">Belum ditugaskan ke kegiatan survei apapun.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PetugasLayout>
  );
}

export default PetugasHome;