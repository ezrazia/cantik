import { User, Bell, Shield, HelpCircle, LogOut, ChevronRight, Globe, Database } from "lucide-react";
import PetugasLayout from "../../components/layouts/PetugasLayout";

/**
 * Halaman pengaturan Petugas — minimalis.
 *
 * @param {Object} props
 * @param {(screen: string) => void} props.onNavigate
 * @returns {React.ReactElement}
 */
function PetugasSettings({ onNavigate }) {
  const sections = [
    {
      title: "Akun",
      items: [
        { icon: User, label: "Profil Saya", desc: "Informasi pribadi & wilayah tugas", color: "text-blue-600", bg: "bg-blue-50" },
        { icon: Shield, label: "Keamanan", desc: "Kata sandi & autentikasi", color: "text-red-500", bg: "bg-red-50" },
      ]
    },
    {
      title: "Aplikasi",
      items: [
        { icon: Bell, label: "Notifikasi", desc: "Atur pengingat & update", color: "text-amber-600", bg: "bg-amber-50" },
        { icon: Database, label: "Penyimpanan", desc: "Hapus cache & data offline", color: "text-emerald-600", bg: "bg-emerald-50" },
        { icon: Globe, label: "Bahasa", desc: "Pilih bahasa aplikasi", color: "text-blue-500", bg: "bg-blue-50" },
      ]
    },
    {
      title: "Lainnya",
      items: [
        { icon: HelpCircle, label: "Bantuan", desc: "Pusat bantuan & FAQ", color: "text-slate-600", bg: "bg-slate-50" },
      ]
    }
  ];

  return (
    <PetugasLayout activeTab="petugas-settings" onNavigate={onNavigate}>
      <div className="min-h-screen bg-white slide-up pb-28">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="px-6 pt-12 pb-6 border-b border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-slate-400 font-medium">Pengaturan</p>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Profil & Preferensi</h2>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                BS
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Budi Santoso</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Petugas Lapangan · ID: 19780412</p>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sections.map((section, idx) => (
                <div key={idx} className={idx === 2 ? 'md:col-span-2 lg:col-span-1' : ''}>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 ml-1">{section.title}</h3>
                  <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                    {section.items.map((item, iIdx) => (
                      <button key={iIdx} className={`w-full flex items-center gap-3 p-4 text-left border-0 bg-transparent cursor-pointer hover:bg-slate-50 transition-all ${iIdx !== section.items.length - 1 ? 'border-b border-slate-50' : ''}`}>
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.bg} ${item.color}`}>
                          <item.icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{item.desc}</p>
                        </div>
                        <ChevronRight size={14} className="text-slate-300" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-center">
              <button onClick={() => onNavigate("login")}
                className="w-full max-w-md flex items-center justify-center gap-2 p-3.5 rounded-xl border border-red-100 bg-red-50 text-red-600 font-semibold text-sm cursor-pointer hover:bg-red-100 transition-all">
                <LogOut size={16} /> Keluar Akun
              </button>
              <p className="text-[10px] text-slate-300 mt-6 font-medium">
                Desa Cantik v2.1.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </PetugasLayout>
  );
}

export default PetugasSettings;
