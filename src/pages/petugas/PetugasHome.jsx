import { WifiOff, Wifi, Bell, MapPin, FileText, Upload, Download, ChevronRight, CheckCircle, AlertCircle } from "lucide-react";
import Badge from "../../components/ui/Badge";
import PetugasLayout from "../../components/layouts/PetugasLayout";
import { getRtList } from "../../constants/mockData";

/**
 * Halaman beranda Petugas — minimalis dan clean.
 *
 * @param {Object} props
 * @param {(screen: string) => void} props.onNavigate
 * @param {boolean} props.isOffline
 * @param {(value: boolean) => void} props.setIsOffline
 * @returns {React.ReactElement}
 */
function PetugasHome({ onNavigate, isOffline, setIsOffline }) {
  return (
    <PetugasLayout activeTab="petugas-home" onNavigate={onNavigate}>
      <div className="min-h-screen bg-white slide-up pb-24">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="px-6 pt-12 pb-6 border-b border-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Selamat datang,</p>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight">Budi Santoso</h2>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <MapPin size={12} className="text-blue-500"/>
                  <span className="text-xs text-slate-400 font-medium">Desa Tideng Pale · SLS 01 Tideng Pale</span>
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
                <button className="w-9 h-9 bg-slate-50 hover:bg-slate-100 text-slate-400 transition-all border-0 cursor-pointer rounded-lg flex items-center justify-center">
                  <Bell size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Offline banner */}
            {isOffline && (
              <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3" style={{ animation: 'slideUp 0.3s ease' }}>
                <WifiOff size={16} className="text-amber-500 flex-shrink-0 mt-0.5"/>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Mode Offline Aktif</p>
                  <p className="text-xs text-amber-600 mt-0.5">Data tersimpan otomatis di perangkat.</p>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-8">
              {[
                { l: "Target", v: "15", c: "text-slate-900" },
                { l: "Selesai", v: "8", c: "text-emerald-600" },
                { l: "Kirim", v: "2", c: "text-blue-600" },
                { l: "Ditolak", v: "1", c: "text-red-500" },
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
                className="bg-white rounded-xl p-5 border border-slate-100 text-left cursor-pointer transition-all hover:border-blue-200 hover:shadow-sm group">
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
                <p className="text-xs mt-0.5 text-blue-200">2 dokumen antri kirim</p>
              </button>

              <button className="bg-white rounded-xl p-5 border border-slate-100 text-left cursor-pointer transition-all hover:border-slate-200 hover:shadow-sm group">
                <div className="flex items-start justify-between w-full">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                    <Download size={18} className="text-slate-500"/>
                  </div>
                  <ChevronRight size={16} className="text-slate-200 group-hover:text-slate-400 transition-colors mt-1"/>
                </div>
                <div className="mt-3">
                  <p className="text-sm font-semibold text-slate-800">Unduh Kuesioner</p>
                  <p className="text-xs text-slate-400 mt-0.5">v2.1.0 · 09/05/26</p>
                </div>
              </button>
            </div>

            {/* RT list */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900">Daftar Rumah Tangga</h3>
                <button className="text-xs text-blue-600 font-medium border-0 bg-transparent cursor-pointer hover:underline">Lihat semua</button>
              </div>
              <div className="space-y-2">
                {getRtList().map((rt, i) => (
                  <button key={rt.id} onClick={() => rt.status !== "belum" && onNavigate("questionnaire")}
                    className="w-full bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-4 text-left cursor-pointer transition-all hover:border-slate-200 hover:shadow-sm group">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                      rt.status === "selesai" ? "bg-emerald-50 text-emerald-600" :
                      rt.status === "progress" ? "bg-amber-50 text-amber-600" :
                      "bg-slate-50 text-slate-300"
                    }`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{rt.krt}</p>
                      <p className="text-xs text-slate-400 truncate">{rt.alamat}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge status={rt.status}/>
                      {rt.sync && (
                        <span className="text-[10px] text-emerald-500 flex items-center gap-1 font-medium">
                          <CheckCircle size={10}/> Tersinkron
                        </span>
                      )}
                      {rt.status === "rejected" && (
                        <span className="text-[10px] text-red-500 flex items-center gap-1 font-medium">
                          <AlertCircle size={10}/> Ditolak
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PetugasLayout>
  );
}

export default PetugasHome;