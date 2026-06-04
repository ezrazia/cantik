import { Upload, Download, CheckCircle, Clock, AlertCircle, RefreshCcw } from "lucide-react";
import PetugasLayout from "../../components/layouts/PetugasLayout";
import { SYNC_ITEMS } from "../../constants/mockData";

/**
 * Halaman sinkronisasi Petugas — minimalis.
 *
 * @param {Object} props
 * @param {(screen: string) => void} props.onNavigate
 * @returns {React.ReactElement}
 */
function PetugasSync({ onNavigate }) {
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
              <button className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border-0 cursor-pointer hover:bg-blue-100 transition-all">
                <RefreshCcw size={18} />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-5 rounded-xl text-center">
                    <p className="mono text-2xl font-bold text-blue-600">3</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Antri Kirim</p>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-xl text-center">
                    <p className="mono text-2xl font-bold text-emerald-600">15</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Terkirim</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <button className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border-0 cursor-pointer hover:bg-blue-700 active:scale-[0.98] transition-all">
                    <Upload size={16} /> Kirim Semua Data
                  </button>
                  <button className="w-full py-3.5 bg-white text-slate-600 border border-slate-200 rounded-xl font-medium text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-all">
                    <Download size={16} /> Unduh Data Baru
                  </button>
                </div>

                <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-800">Informasi</p>
                    <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
                      Pastikan terhubung internet stabil sebelum mengirim data.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="lg:col-span-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">Antrian Dokumen</h3>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">4 Total</span>
                </div>
                <div className="space-y-2">
                  {SYNC_ITEMS.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center gap-4 hover:border-slate-200 transition-all group">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        item.status === 'synced' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {item.status === 'synced' ? <CheckCircle size={18} /> : <Clock size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.date}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {item.status === 'ready' ? (
                          <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold border-0 cursor-pointer hover:bg-blue-600 hover:text-white transition-all">
                            Kirim
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-lg">Berhasil</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PetugasLayout>
  );
}

export default PetugasSync;
