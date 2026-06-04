import { useState } from "react";
import AdminLayout from "../../components/layouts/AdminLayout";
import { getPetugasData, getDesaData } from "../../constants/mockData";
import { 
  Users, Briefcase, MapPin, Clock, ArrowRight, Layers, Eye, Activity, CheckCircle, Smartphone, User, AlertTriangle
} from "lucide-react";

/**
 * Halaman Beranda Admin BPS — premium, modern, dan minimalis.
 * Menyediakan dashboard selamat datang, statistik ringkas, proyek aktif,
 * dan tautan navigasi cepat.
 *
 * @param {Object} props
 * @param {(screen: string) => void} props.onNavigate
 * @returns {React.ReactElement}
 */
function AdminBeranda({ onNavigate, selectedProject, onProjectChange, petugas, activities }) {
  // Calculate dynamic officers count for each activity
  const activeActivities = activities.map(act => {
    const count = petugas.filter(p => p.projects && p.projects.includes(act.name)).length;
    return {
      ...act,
      officers: count
    };
  });

  // Quick navigation items
  const quickLinks = [
    {
      title: "Review Data Pencacahan",
      desc: "Validasi dan approve dokumen hasil pencacahan petugas di lapangan.",
      icon: Eye,
      screen: "admin-review",
      color: "text-emerald-600",
      bg: "bg-emerald-50 hover:bg-emerald-100/70"
    },
    {
      title: "Rancang Form Kuesioner",
      desc: "Gunakan Form Builder seret-dan-lepas untuk membuat kuesioner baru.",
      icon: Layers,
      screen: "admin-builder",
      color: "text-blue-600",
      bg: "bg-blue-50 hover:bg-blue-100/70"
    },
    {
      title: "Monitoring Real-time",
      desc: "Pantau diagram kiriman harian, status dokumen, dan progress per desa.",
      icon: Activity,
      screen: "admin-dash",
      color: "text-purple-600",
      bg: "bg-purple-50 hover:bg-purple-100/70"
    }
  ];

  return (
    <AdminLayout tab="admin-beranda" onNavigate={onNavigate} selectedProject={selectedProject} onProjectChange={onProjectChange} activities={activities}>
      <style>{`
        .welcome-gradient {
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #7c3aed 100%);
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .kegiatan-scroll-container {
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding-bottom: 4px;
        }
        .kegiatan-scroll-container::-webkit-scrollbar {
          height: 3px;
          background: transparent;
          display: none;
        }
        .kegiatan-scroll-container:hover::-webkit-scrollbar {
          display: block;
          height: 3px;
        }
        .kegiatan-scroll-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 9999px;
        }
      `}</style>

      <div className="p-6 lg:p-8 w-full animate-fade-in-up">
        {/* Welcome Banner Card */}
        <div className="welcome-gradient rounded-2xl p-6 md:p-8 text-white shadow-md relative overflow-hidden mb-8">
          <div className="absolute right-0 bottom-0 top-0 opacity-10 flex items-center justify-center pointer-events-none">
            <Activity className="w-80 h-80 stroke-[1.5px]" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <span className="px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm">
              Sistem Informasi CAPI BPS
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-3 mb-2">
              Hai Admin BPS, Selamat Datang Kembali! 👋
            </h2>
            <p className="text-white/80 text-xs md:text-sm leading-relaxed mb-6">
              Akses cepat panel pemantauan pencacahan, rancang kuesioner digital terbaru, dan awasi aktivitas tim petugas BPS di lapangan secara real-time.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button 
                onClick={() => onNavigate("admin-kegiatan")}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-900 font-bold rounded-xl text-xs border-0 cursor-pointer hover:bg-slate-50 transition-all active:scale-[0.98]"
              >
                Kelola Kegiatan <ArrowRight size={13} />
              </button>
              <button 
                onClick={() => onNavigate("admin-master-petugas")}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 text-white font-semibold rounded-xl text-xs border border-white/20 cursor-pointer hover:bg-white/15 transition-all backdrop-blur-sm"
              >
                Kelola Database Petugas
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1: Total Kegiatan (Swapped) */}
          <div className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600">
              <Briefcase size={18} />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase">Total Kegiatan</p>
              <p className="mono text-xl font-bold text-slate-900">{activeActivities.length}</p>
            </div>
          </div>

          {/* Card 2: Total Petugas (Swapped) */}
          <div className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase">Total Petugas</p>
              <p className="mono text-xl font-bold text-slate-900">{petugas.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase">Petugas Aktif</p>
              <p className="mono text-xl font-bold text-slate-900">
                {petugas.filter(p => p.status === "active").length}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
              <MapPin size={18} />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase">Wilayah Desa</p>
              <p className="mono text-xl font-bold text-slate-900">{getDesaData().length}</p>
            </div>
          </div>
        </div>

        {/* Mid Row: Active Activities & Quick Access */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-start">
          
          {/* Active Activities list */}
          <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <div className="w-1 h-5 bg-blue-600 rounded-full"/>
                Kegiatan BPS Aktif Saat Ini
              </h3>
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                Nasional & Sektoral
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeActivities.map(act => (
                <div key={act.name} className="border border-slate-50 hover:border-slate-200 bg-white rounded-xl p-4.5 transition-all shadow-inner flex flex-col justify-between min-h-[160px]">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${act.bgColor || "bg-blue-50"} ${act.textColor || "text-blue-600"}`}>
                        {act.officers > 0 ? `${act.officers} Petugas` : "Menunggu Petugas"}
                      </span>
                      {act.progress > 0 && (
                        <span className="text-[10px] font-bold text-slate-500">{act.progress}% Selesai</span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 tracking-tight">{act.name}</h4>
                    <p className="text-[11.5px] text-slate-400 leading-relaxed font-medium mt-1 mb-4">{act.desc}</p>
                  </div>

                  <div>
                    {act.progress > 0 ? (
                      <div className="space-y-3">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${act.color || "bg-blue-600"}`} style={{ width: `${act.progress}%` }}/>
                        </div>
                        <button 
                          onClick={() => {
                            onProjectChange(act.name);
                            onNavigate("admin-dash");
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 transition-all border-0 text-[10.5px] font-bold text-slate-600 cursor-pointer"
                        >
                          Buka Monitoring <ArrowRight size={11} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          onProjectChange(act.name);
                          onNavigate("admin-users");
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 transition-all border-0 text-[10.5px] font-bold cursor-pointer"
                      >
                        <Users size={11} /> Tugaskan Petugas
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links panels */}
          <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2">
              <div className="w-1 h-5 bg-purple-600 rounded-full"/>
              Akses Cepat Panel
            </h3>
            
            <div className="space-y-3.5">
              {quickLinks.map(link => (
                <button
                  key={link.title}
                  onClick={() => onNavigate(link.screen)}
                  className={`w-full text-left p-4 rounded-xl border border-slate-50 transition-all cursor-pointer flex gap-4 ${link.bg}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white shadow-sm ${link.color}`}>
                    <link.icon size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{link.title}</h4>
                    <p className="text-[11px] text-slate-400 leading-normal font-medium mt-0.5">{link.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row: Active Officers Status - Synchronized with Master Petugas */}
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <div className="w-1 h-5 bg-amber-500 rounded-full"/>
              Aktivitas Terkini Petugas BPS (Master Petugas)
            </h3>
            <button 
              onClick={() => onNavigate("admin-master-petugas")}
              className="text-[10px] font-bold text-blue-600 bg-transparent border-0 cursor-pointer hover:underline"
            >
              Lihat Semua Petugas
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 min-w-[700px]">
              <thead>
                <tr className="bg-slate-50/20">
                  {["Nama", "Username", "ID", "Asal Desa", "Nomor Telepon", "Kegiatan"].map(h => (
                    <th key={h} className="px-6 py-3.5 text-left text-[11px] text-slate-400 font-semibold tracking-wider uppercase border-b border-slate-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {petugas.map((p, idx) => {
                  return (
                    <tr key={p.name} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5 border-t border-slate-50 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                            {p.name.split(' ').map(n=>n[0]).join('')}
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-slate-700">{p.name}</span>
                            <span className="block text-[10px] text-slate-400 font-medium">Petugas BPS</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 border-t border-slate-50 mono text-xs text-slate-600 font-semibold whitespace-nowrap">
                        @{p.username || p.name.toLowerCase().replace(/\s+/g, ".")}
                      </td>
                      <td className="px-6 py-3.5 border-t border-slate-50 mono text-xs text-slate-500 whitespace-nowrap">
                        {p.id}
                      </td>
                      <td className="px-6 py-3.5 border-t border-slate-50 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-600 text-xs font-semibold whitespace-nowrap">
                          <MapPin size={12} className="text-slate-400" />
                          <span>{p.asalDesa || `Desa ${p.desa}`}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 border-t border-slate-50 mono text-xs text-slate-600 font-semibold whitespace-nowrap">
                        {p.phone}
                      </td>
                      <td className="px-6 py-3.5 border-t border-slate-50 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 max-w-[220px] whitespace-nowrap kegiatan-scroll-container" style={{ display: 'flex', flexWrap: 'nowrap' }}>
                          {p.projects && p.projects.map(proj => {
                            const role = p.projectRoles?.[proj] || "PCL";
                            const badgeStyle = role === "PML" 
                              ? "bg-purple-50 text-purple-600 border border-purple-100/30" 
                              : "bg-blue-50 text-blue-600 border border-blue-100/30";
                            return (
                              <span key={proj} className={`text-[9px] font-bold px-2 py-0.5 rounded-lg inline-block whitespace-nowrap flex-shrink-0 ${badgeStyle}`}>
                                {proj} ({role})
                              </span>
                            );
                          })}
                          {(!p.projects || p.projects.length === 0) && (
                            <span className="text-[10px] font-medium text-slate-400 italic">Belum ada kegiatan</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminBeranda;
