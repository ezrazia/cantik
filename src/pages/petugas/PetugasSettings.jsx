import { useState } from "react";
import { 
  User, Bell, Shield, HelpCircle, LogOut, ChevronRight, Globe, 
  MessageSquare, ExternalLink, AlertTriangle, CheckCircle, Info, ArrowLeft, X 
} from "lucide-react";
import PetugasLayout from "../../components/layouts/PetugasLayout";

/**
 * Halaman pengaturan Petugas — premium, minimalis, dan fungsional.
 * Menggunakan sistem sub-halaman inline untuk menjaga alur navigasi yang bersih.
 *
 * @param {Object} props
 * @param {(screen: string) => void} props.onNavigate
 * @param {Object} props.currentUser
 * @returns {React.ReactElement}
 */
function PetugasSettings({ onNavigate, currentUser }) {
  const [activeSubPage, setActiveSubPage] = useState(null); // 'profile' | 'security' | 'notifications' | 'language' | 'help' | null
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Notification Preferences States (tersimpan di localStorage jika ingin persistent)
  const [notifDaily, setNotifDaily] = useState(() => {
    const saved = localStorage.getItem("pref_notif_daily");
    return saved !== null ? saved === "true" : true;
  });
  const [notifNewTask, setNotifNewTask] = useState(() => {
    const saved = localStorage.getItem("pref_notif_new_task");
    return saved !== null ? saved === "true" : true;
  });
  const [notifPmlMessage, setNotifPmlMessage] = useState(() => {
    const saved = localStorage.getItem("pref_notif_pml");
    return saved !== null ? saved === "true" : true;
  });
  const [notifSync, setNotifSync] = useState(() => {
    const saved = localStorage.getItem("pref_notif_sync");
    return saved !== null ? saved === "true" : true;
  });

  const handleToggle = (key, value, setter) => {
    setter(value);
    localStorage.setItem(key, String(value));
  };

  const getInitials = (name) => {
    if (!name) return "??";
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return words[0].slice(0, 2).toUpperCase();
  };

  const sections = [
    {
      title: "Akun",
      items: [
        { key: "profile", icon: User, label: "Profil Saya", desc: "Informasi pribadi & wilayah tugas", color: "text-blue-600", bg: "bg-blue-50" },
        { key: "security", icon: Shield, label: "Keamanan", desc: "Kata sandi & autentikasi", color: "text-red-500", bg: "bg-red-50" },
      ]
    },
    {
      title: "Aplikasi",
      items: [
        { key: "notifications", icon: Bell, label: "Notifikasi", desc: "Atur pengingat & update", color: "text-amber-600", bg: "bg-amber-50" },
        { key: "language", icon: Globe, label: "Bahasa", desc: "Pilih bahasa aplikasi", color: "text-blue-500", bg: "bg-blue-50" },
      ]
    },
    {
      title: "Lainnya",
      items: [
        { key: "help", icon: HelpCircle, label: "Bantuan", desc: "Pusat bantuan & FAQ", color: "text-slate-600", bg: "bg-slate-50" },
      ]
    }
  ];

  // ─── RENDERING SUB PAGES ──────────────────────────────
  if (activeSubPage) {
    return (
      <PetugasLayout activeTab="petugas-settings" onNavigate={onNavigate}>
        <div className="min-h-screen bg-white slide-up pb-28">
          <div className="max-w-3xl mx-auto">
            {/* Subpage Header */}
            <div className="relative px-6 pt-12 pb-8 border-b border-solid border-slate-100 bg-gradient-to-b from-blue-50/30 to-white overflow-hidden flex items-center gap-4">
              <div className="absolute top-0 right-0 w-36 h-36 bg-blue-100/20 rounded-full blur-2xl pointer-events-none -mr-12 -mt-12" />
              <button 
                onClick={() => setActiveSubPage(null)}
                className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 border border-solid border-slate-200/60 hover:border-slate-300 flex items-center justify-center text-slate-500 hover:text-slate-700 cursor-pointer transition-all active:scale-95 shadow-sm relative z-10"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="relative z-10">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pengaturan</p>
                <h2 className="text-lg font-extrabold text-slate-900 mt-0.5 tracking-tight">
                  {activeSubPage === "profile" && "Profil Saya"}
                  {activeSubPage === "security" && "Keamanan"}
                  {activeSubPage === "notifications" && "Notifikasi & Pengingat"}
                  {activeSubPage === "language" && "Bahasa Aplikasi"}
                  {activeSubPage === "help" && "Pusat Bantuan"}
                </h2>
              </div>
            </div>

            {/* Subpage Body */}
            <div className="p-6">
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                
                {/* 1. PROFILE SUBPAGE */}
                {activeSubPage === "profile" && (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center pb-6 border-b border-slate-100">
                      <div className="w-20 h-20 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold mb-3 shadow-inner">
                        {getInitials(currentUser?.name)}
                      </div>
                      <span className="text-base font-bold text-slate-800">{currentUser?.name || "Budi Santoso"}</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-0.5 rounded-full font-bold mt-2 uppercase tracking-wide">Aktif</span>
                    </div>

                    <div className="space-y-4 text-xs font-medium">
                      <div className="flex justify-between py-2.5 border-b border-slate-50">
                        <span className="text-slate-400">Username</span>
                        <span className="text-slate-800 font-bold">{currentUser?.username || "-"}</span>
                      </div>
                      <div className="flex justify-between py-2.5 border-b border-slate-50">
                        <span className="text-slate-400">NIK (Nomor Induk Kependudukan)</span>
                        <span className="text-slate-800 font-bold">{currentUser?.nik || "-"}</span>
                      </div>
                      <div className="flex justify-between py-2.5 border-b border-slate-50">
                        <span className="text-slate-400">Nomor Telepon</span>
                        <span className="text-slate-800 font-bold">{currentUser?.phone || "-"}</span>
                      </div>
                      <div className="flex justify-between py-2.5 border-b border-slate-50">
                        <span className="text-slate-400">Asal Wilayah / Desa</span>
                        <span className="text-slate-800 font-bold">{currentUser?.desa || "-"}</span>
                      </div>
                      <div className="flex flex-col py-2.5 space-y-2">
                        <span className="text-slate-400">Kegiatan Ditugaskan</span>
                        <span className="text-slate-800 font-bold bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 leading-relaxed text-[11px]">
                          {currentUser?.projects && currentUser.projects.length > 0 
                            ? currentUser.projects.join(", ") 
                            : "Tidak ada kegiatan yang aktif"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. SECURITY SUBPAGE */}
                {activeSubPage === "security" && (
                  <div className="space-y-6">
                    <div className="space-y-4 text-xs font-medium pb-6 border-b border-slate-100">
                      <div className="flex justify-between py-2.5 border-b border-slate-50">
                        <span className="text-slate-400">Username Akun</span>
                        <span className="text-slate-800 font-bold">{currentUser?.username || "-"}</span>
                      </div>
                      <div className="flex justify-between py-2.5 border-b border-slate-50">
                        <span className="text-slate-400">Kata Sandi (Password)</span>
                        <span className="text-slate-800 font-bold tracking-widest">••••••••</span>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-start gap-3.5 text-amber-800">
                      <Info size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-amber-900">Kebijakan Perubahan Kata Sandi</p>
                        <p className="text-[11px] leading-relaxed text-amber-700/90 mt-1.5">
                          Demi menjaga kerahasiaan & integritas data kuesioner BPS, kata sandi saat ini tidak dapat diubah secara mandiri dari aplikasi petugas. 
                          Silakan hubungi <strong>PML (Pengawas Lapangan)</strong> atau <strong>Admin BPS</strong> di kantor kabupaten untuk melakukan pengaturan ulang sandi Anda.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. NOTIFICATIONS SUBPAGE */}
                {activeSubPage === "notifications" && (
                  <div className="space-y-6">
                    {/* Toggles Group */}
                    <div className="space-y-3 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 text-xs font-medium">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Preferensi Notifikasi</h4>
                      
                      <div className="flex items-center justify-between py-2 border-b border-solid border-slate-100/50">
                        <span className="text-slate-700 font-semibold">Pengingat Harian (Cacah Lapangan)</span>
                        <button 
                          type="button"
                          onClick={() => handleToggle("pref_notif_daily", !notifDaily, setNotifDaily)}
                          className={`w-9 h-5 rounded-full transition-colors relative border-0 cursor-pointer ${notifDaily ? 'bg-blue-600' : 'bg-slate-200'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${notifDaily ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between py-2 border-b border-solid border-slate-100/50">
                        <span className="text-slate-700 font-semibold">Notifikasi Tugas Baru</span>
                        <button 
                          type="button"
                          onClick={() => handleToggle("pref_notif_new_task", !notifNewTask, setNotifNewTask)}
                          className={`w-9 h-5 rounded-full transition-colors relative border-0 cursor-pointer ${notifNewTask ? 'bg-blue-600' : 'bg-slate-200'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${notifNewTask ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between py-2 border-b border-solid border-slate-100/50">
                        <span className="text-slate-700 font-semibold">Pesan & Catatan Pemeriksaan PML</span>
                        <button 
                          type="button"
                          onClick={() => handleToggle("pref_notif_pml", !notifPmlMessage, setNotifPmlMessage)}
                          className={`w-9 h-5 rounded-full transition-colors relative border-0 cursor-pointer ${notifPmlMessage ? 'bg-blue-600' : 'bg-slate-200'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${notifPmlMessage ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <span className="text-slate-700 font-semibold">Konfirmasi Sinkronisasi Sukses</span>
                        <button 
                          type="button"
                          onClick={() => handleToggle("pref_notif_sync", !notifSync, setNotifSync)}
                          className={`w-9 h-5 rounded-full transition-colors relative border-0 cursor-pointer ${notifSync ? 'bg-blue-600' : 'bg-slate-200'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${notifSync ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </div>

                    {/* Notification History Log */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Riwayat Notifikasi Terbaru</h4>
                      
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        <div className="p-4 bg-blue-50/40 border border-blue-50 rounded-2xl flex items-start gap-3">
                          <CheckCircle size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-bold text-slate-800 text-xs">Unggahan Berhasil</p>
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                              12 kuesioner SLS RT 001 Sebawang telah terkirim dan tersinkronisasi ke server.
                            </p>
                          </div>
                        </div>

                        <div className="p-4 bg-amber-50/40 border border-amber-50 rounded-2xl flex items-start gap-3">
                          <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-bold text-slate-800 text-xs">Pesan Pemeriksaan PML</p>
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                              "KRT Ahmad Riyadi harap dikonfirmasi ulang alamatnya karena ada kesalahan digit."
                            </p>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-3">
                          <Info size={16} className="text-slate-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-bold text-slate-800 text-xs">Tugas Kegiatan Baru</p>
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                              Anda ditugaskan ke SLS RT 003 Sebawang untuk Kegiatan Desa Cantik 2026.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. LANGUAGE SUBPAGE */}
                {activeSubPage === "language" && (
                  <div className="space-y-5">
                    <div className="p-4.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">🇮🇩</span>
                        <span className="font-bold text-slate-800">Bahasa Indonesia</span>
                      </div>
                      <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-0.5 rounded-full font-extrabold uppercase">Aktif</span>
                    </div>

                    <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3.5 text-red-800">
                      <Info size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-red-900">Bahasa Lain Belum Tersedia</p>
                        <p className="text-[11px] leading-relaxed text-red-700/90 mt-1.5">
                          Mohon maaf untuk bahasa lain belum tersedia. Saat ini aplikasi Desa Cantik hanya mendukung antarmuka dalam Bahasa Indonesia.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. HELP SUBPAGE */}
                {activeSubPage === "help" && (
                  <div className="space-y-5">
                    {/* Help Contacts */}
                    <div className="space-y-3">
                      <a 
                        href="https://wa.me/6282256772460?text=Halo%20BPS%20Tana%20Tidung,%20saya%20petugas%20lapangan%20ingin%20bertanya%20mengenai..."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-between p-4 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 rounded-2xl border border-emerald-100 transition-all cursor-pointer text-left no-underline group active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-3.5">
                          <MessageSquare size={18} className="text-emerald-600" />
                          <div>
                            <p className="font-bold text-emerald-950 text-xs">WhatsApp BPS Tana Tidung</p>
                            <p className="text-[10px] text-emerald-600/90 mt-0.5 font-medium">Hubungi pelayanan cepat di 0822-5677-2460</p>
                          </div>
                        </div>
                        <ExternalLink size={14} className="text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                      </a>

                      <a 
                        href="https://tanatidungkab.bps.go.id"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100/80 text-blue-700 rounded-2xl border border-blue-100 transition-all cursor-pointer text-left no-underline group active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-3.5">
                          <Globe size={18} className="text-blue-600" />
                          <div>
                            <p className="font-bold text-blue-950 text-xs">Website BPS Kabupaten Tana Tidung</p>
                            <p className="text-[10px] text-blue-600/90 mt-0.5 font-medium">Informasi resmi & publikasi statistik daerah</p>
                          </div>
                        </div>
                        <ExternalLink size={14} className="text-blue-600 transition-transform group-hover:translate-x-0.5" />
                      </a>
                    </div>

                    {/* FAQ Items */}
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pertanyaan Umum (FAQ)</h4>
                      
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs font-medium">
                        <p className="font-bold text-slate-800">Q: Bagaimana cara kirim data offline?</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                          Data kuesioner akan otomatis disimpan di cache perangkat Anda. Saat Anda terhubung kembali ke internet, silakan kunjungi menu <strong>Kirim & Unduh</strong> lalu ketuk <strong>Kirim Semua Data</strong>.
                        </p>
                      </div>

                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs font-medium">
                        <p className="font-bold text-slate-800">Q: Apa yang dilakukan jika NIK atau Nomer Telp salah?</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                          Silakan hubungi PML (Pengawas Lapangan) atau hubungi langsung admin BPS Tana Tidung melalui nomor WhatsApp di atas untuk memperbarui profil Anda.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </PetugasLayout>
    );
  }

  // ─── RENDERING MAIN SETTINGS MENU ─────────────────────
  return (
    <PetugasLayout activeTab="petugas-settings" onNavigate={onNavigate}>
      <style>{`
        @keyframes scaleUp {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.15s ease-out both;
        }
      `}</style>

      <div className="min-h-screen bg-white slide-up pb-28">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="relative px-6 pt-12 pb-8 border-b border-solid border-slate-100 overflow-hidden bg-gradient-to-b from-blue-50/40 to-white">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-100/30 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
            <div className="flex items-center justify-between relative z-10 mb-6">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-semibold">Pengaturan</p>
                <h2 className="text-lg font-extrabold text-slate-900 mt-0.5 tracking-tight">Profil & Preferensi</h2>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-650 flex items-center justify-center text-white text-base font-bold shadow-md shadow-blue-500/20">
                {getInitials(currentUser?.name || "Budi Santoso")}
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-base font-extrabold text-slate-900">{currentUser?.name || "Budi Santoso"}</h3>
              <p className="text-xs text-slate-400 mt-1.5 font-medium flex items-center gap-1.5">
                <User size={13} className="text-blue-500" />
                <span>Petugas Lapangan · {currentUser?.nik ? `NIK: ${currentUser.nik}` : `ID: ${currentUser?.id || "19780412"}`}</span>
              </p>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sections.map((section, idx) => (
                <div key={idx} className={idx === 2 ? 'md:col-span-2 lg:col-span-1' : ''}>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3.5 ml-1">{section.title}</h3>
                  <div className="bg-white rounded-2xl border border-solid border-slate-100 overflow-hidden shadow-sm">
                    {section.items.map((item, iIdx) => (
                      <button 
                        key={iIdx} 
                        onClick={() => setActiveSubPage(item.key)}
                        className={`group w-full flex items-center gap-3.5 p-4 text-left border-0 bg-transparent cursor-pointer hover:bg-slate-50/50 transition-all ${iIdx !== section.items.length - 1 ? 'border-b border-solid border-slate-50' : ''}`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${item.bg} ${item.color}`}>
                          <item.icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{item.label}</p>
                          <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">{item.desc}</p>
                        </div>
                        <ChevronRight size={13} className="text-slate-300 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 flex flex-col items-center">
              <button 
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full max-w-md flex items-center justify-center gap-2 p-3.5 rounded-xl border border-solid border-red-100 bg-red-50 text-red-600 hover:bg-red-100 active:scale-[0.99] font-bold text-xs cursor-pointer shadow-sm transition-all"
              >
                <LogOut size={14} /> Keluar Akun
              </button>
              <p className="text-[9px] text-slate-300 mt-8 font-semibold uppercase tracking-wider">
                Desa Cantik v2.1.0
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================== */}
      {/* DOUBLE CONFIRMATION MODAL: LOGOUT */}
      {/* ============================================== */}
      {showLogoutConfirm && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div 
            className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden"
            style={{ animation: "scaleUp 0.15s ease-out both" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Keluar dari Akun?</h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
                  Apakah Anda yakin ingin keluar dari akun petugas lapangan Anda? Pastikan seluruh kuesioner yang telah selesai sudah disinkronisasi ke server.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onNavigate("logout");
                }}
                className="px-5.5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl cursor-pointer border-0 shadow-sm transition-all"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </PetugasLayout>
  );
}

export default PetugasSettings;
