import { BarChart2, Eye, Layers, Users, Database, LogOut, ChevronDown, Menu, X, Home, Briefcase, Table, Sliders, Globe, AlertTriangle, FileText } from "lucide-react";
import { useState, useEffect } from "react";

/**
 * Layout wrapper untuk halaman Admin dengan sidebar navigasi minimalis.
 *
 * @param {Object} props
 * @param {string} props.tab - ID tab aktif.
 * @param {(screen: string) => void} props.onNavigate - Fungsi navigasi.
 * @param {React.ReactNode} props.children - Konten halaman.
 * @returns {React.ReactElement}
 */
function AdminLayout({ tab, onNavigate, selectedProject: propSelectedProject, onProjectChange, activities, children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [localSelectedProject, setLocalSelectedProject] = useState("Desa Cantik 2026");
  
  const selectedProject = propSelectedProject !== undefined ? propSelectedProject : localSelectedProject;
  const setSelectedProject = onProjectChange !== undefined ? onProjectChange : setLocalSelectedProject;

  const [isProjDropdownOpen, setIsProjDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [currentUser] = useState(() => {
    const saved = localStorage.getItem("currentUser");
    return saved ? JSON.parse(saved) : null;
  });

  const isKegiatanAdmin = currentUser?.role === 'admin_kegiatan';

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

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isKegiatanAdmin) {
      const allowedTabs = ["admin-dash", "admin-review", "admin-users"];
      if (!allowedTabs.includes(tab)) {
        onNavigate("admin-dash");
      }
    } else {
      if (!selectedProject && tab !== "admin-beranda" && tab !== "admin-kegiatan" && tab !== "admin-master-petugas" && tab !== "admin-freeform" && tab !== "admin-backup") {
        onNavigate("admin-beranda");
      }
    }
  }, [selectedProject, tab, onNavigate, isKegiatanAdmin]);

  const projects = activities ? activities.map(a => a.name) : ["Desa Cantik 2026", "Survei Ekonomi 2026", "Pendataan PLS 2026"];
  
  const navItems = [
    { id:"admin-dash",    icon: BarChart2, label:"Dashboard" },
      { id:"admin-detail-kegiatan", icon: FileText, label:"Detail Kegiatan" },
    { id:"admin-review",  icon: Eye,       label:"Review Data" },
    ...(!isKegiatanAdmin ? [{ id:"admin-builder", icon: Layers,    label:"Form Builder" }] : []),
      ...(!isKegiatanAdmin ? [{ id:"admin-anomali", icon: AlertTriangle, label:"Anomali" }] : []),
    { id:"admin-users",   icon: Users,     label:"Petugas Kegiatan" },
    ...(!isKegiatanAdmin ? [{ id:"admin-tabulasi",icon: Table,     label:"Tabulasi" }] : []),
  ];

  const sidebarWidth = isSidebarOpen ? "w-64" : "w-[72px]";

  const SidebarContent = () => (
    <div className="h-full flex flex-col bg-slate-900 text-white">
      {/* Logo */}
      <div className={`px-5 pt-7 pb-5 ${!isSidebarOpen && !isMobile ? 'px-4' : ''}`}>
        {isSidebarOpen || isMobile ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Database size={16} className="text-white"/>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">CANTIK</h1>
              <p className="text-[10px] text-slate-400 font-medium">Badan Pusat Statistik</p>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
            <Database size={18} className="text-white"/>
          </div>
        )}
      </div>

      {/* Beranda (Home) - Positioned above Master Petugas */}
      {!isKegiatanAdmin && (
        <div className="px-3 mb-2">
          <button key="admin-beranda"
            onClick={() => { onNavigate("admin-beranda"); if (isMobile) setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm border-0 cursor-pointer transition-all ${
              tab === "admin-beranda"
                ? "bg-blue-600 text-white font-semibold shadow-sm"
                : "bg-transparent text-slate-400 hover:bg-white/5 hover:text-white font-medium"
            } ${!isSidebarOpen && !isMobile ? 'justify-center' : ''}`}
            title="Beranda">
            <Home size={18} strokeWidth={tab === "admin-beranda" ? 2 : 1.5}/>
            {(isSidebarOpen || isMobile) && <span>Beranda</span>}
          </button>
        </div>
      )}

      {/* Kegiatan (Activities) - Positioned under Beranda and above Master Petugas */}
      {!isKegiatanAdmin && (
        <div className="px-3 mb-2">
          <button key="admin-kegiatan"
            onClick={() => { onNavigate("admin-kegiatan"); if (isMobile) setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm border-0 cursor-pointer transition-all ${
              tab === "admin-kegiatan"
                ? "bg-blue-600 text-white font-semibold shadow-sm"
                : "bg-transparent text-slate-400 hover:bg-white/5 hover:text-white font-medium"
            } ${!isSidebarOpen && !isMobile ? 'justify-center' : ''}`}
            title="Master Kegiatan">
            <Briefcase size={18} strokeWidth={tab === "admin-kegiatan" ? 2 : 1.5}/>
            {(isSidebarOpen || isMobile) && <span>Master Kegiatan</span>}
          </button>
        </div>
      )}

      {/* Master Petugas (Overall List) - Positioned above Project Selector */}
      {!isKegiatanAdmin && (
        <div className="px-3 mb-2">
          <button key="admin-master-petugas"
            onClick={() => { onNavigate("admin-master-petugas"); if (isMobile) setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm border-0 cursor-pointer transition-all ${
              tab === "admin-master-petugas"
                ? "bg-blue-600 text-white font-semibold shadow-sm"
                : "bg-transparent text-slate-400 hover:bg-white/5 hover:text-white font-medium"
            } ${!isSidebarOpen && !isMobile ? 'justify-center' : ''}`}
            title="Master Petugas">
            <Users size={18} strokeWidth={tab === "admin-master-petugas" ? 2 : 1.5}/>
            {(isSidebarOpen || isMobile) && <span>Master Petugas</span>}
          </button>
        </div>
      )}

      {/* Freeform (Dynamic Options & Anomalies) */}
      {!isKegiatanAdmin && (
        <div className="px-3 mb-2">
          <button key="admin-freeform"
            onClick={() => { onNavigate("admin-freeform"); if (isMobile) setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm border-0 cursor-pointer transition-all ${
              tab === "admin-freeform"
                ? "bg-blue-600 text-white font-semibold shadow-sm"
                : "bg-transparent text-slate-400 hover:bg-white/5 hover:text-white font-medium"
            } ${!isSidebarOpen && !isMobile ? 'justify-center' : ''}`}
            title="Global">
            <Globe size={18} strokeWidth={tab === "admin-freeform" ? 2 : 1.5}/>
            {(isSidebarOpen || isMobile) && <span>Global</span>}
          </button>
        </div>
      )}

      {/* Backup & Restore */}
      {!isKegiatanAdmin && (
        <div className="px-3 mb-4">
          <button key="admin-backup"
            onClick={() => { onNavigate("admin-backup"); if (isMobile) setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm border-0 cursor-pointer transition-all ${
              tab === "admin-backup"
                ? "bg-blue-600 text-white font-semibold shadow-sm"
                : "bg-transparent text-slate-400 hover:bg-white/5 hover:text-white font-medium"
            } ${!isSidebarOpen && !isMobile ? 'justify-center' : ''}`}
            title="Backup & Restore">
            <Database size={18} strokeWidth={tab === "admin-backup" ? 2 : 1.5}/>
            {(isSidebarOpen || isMobile) && <span>Backup & Restore</span>}
          </button>
        </div>
      )}

      {/* Project selector */}
      {(isSidebarOpen || isMobile) && (
        <div className="px-4 mb-4 relative">
          {isKegiatanAdmin ? (
            <div className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border border-white/10 text-slate-400 bg-white/5 cursor-not-allowed select-none">
              <span className="truncate">{selectedProject || "Pilih Kegiatan"}</span>
            </div>
          ) : (
            <>
              <button onClick={() => setIsProjDropdownOpen(!isProjDropdownOpen)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border border-white/10 hover:bg-white/5 text-slate-300 bg-transparent cursor-pointer">
                <span className="truncate">{selectedProject || "Pilih Kegiatan"}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isProjDropdownOpen ? 'rotate-180' : ''} text-slate-500`}/>
              </button>
              {isProjDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsProjDropdownOpen(false)}/>
                  <div className="absolute left-4 right-4 top-full mt-1 bg-slate-800 rounded-xl shadow-lg z-20 py-1 border border-white/10 overflow-hidden">
                    <button onClick={() => { setSelectedProject(""); setIsProjDropdownOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left text-xs border-0 cursor-pointer transition-all ${
                        selectedProject === "" ? 'bg-blue-600 text-white font-semibold' : 'bg-transparent text-slate-400 hover:bg-white/5 font-medium'
                      }`}>
                      Pilih Kegiatan
                    </button>
                    {projects.map(p => (
                      <button key={p} onClick={() => { setSelectedProject(p); setIsProjDropdownOpen(false); }}
                        className={`w-full px-4 py-2.5 text-left text-xs border-0 cursor-pointer transition-all ${
                          selectedProject === p ? 'bg-blue-600 text-white font-semibold' : 'bg-transparent text-slate-400 hover:bg-white/5 font-medium'
                        }`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Nav Items - Hidden if selectedProject is empty */}
      {selectedProject ? (
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(item => {
            const isActive = item.id === tab;
            return (
              <button key={item.id}
                onClick={() => { onNavigate(item.id); if (isMobile) setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm border-0 cursor-pointer transition-all ${
                  isActive
                    ? "bg-blue-600 text-white font-semibold shadow-sm"
                    : "bg-transparent text-slate-400 hover:bg-white/5 hover:text-white font-medium"
                } ${!isSidebarOpen && !isMobile ? 'justify-center' : ''}`}
                title={item.label}>
                <item.icon size={18} strokeWidth={isActive ? 2 : 1.5}/>
                {(isSidebarOpen || isMobile) && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      ) : (
        <div className="flex-1" />
      )}

      {/* Profile / Logout */}
      <div className={`p-4 border-t border-white/5 ${!isSidebarOpen && !isMobile ? 'px-3' : ''}`}>
        {(isSidebarOpen || isMobile) ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 flex items-center justify-center text-xs font-bold text-blue-400">
              {currentUser?.nama ? currentUser.nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'AD'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{currentUser?.nama || "Administrator"}</p>
              <p className="text-[11px] text-slate-500">{isKegiatanAdmin ? "Admin Kegiatan" : "Koordinator"}</p>
            </div>
            <button onClick={() => setShowLogoutConfirm(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/5 transition-all border-0 bg-transparent cursor-pointer">
              <LogOut size={16}/>
            </button>
          </div>
        ) : (
          <button onClick={() => setShowLogoutConfirm(true)}
            className="w-10 h-10 mx-auto flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/5 transition-all border-0 bg-transparent cursor-pointer"
            title="Logout">
            <LogOut size={18}/>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className={`${sidebarWidth} flex-shrink-0 transition-all duration-300 ease-out relative`}>
          <div className={`fixed top-0 left-0 ${sidebarWidth} h-full transition-all duration-300`}>
            <SidebarContent/>
          </div>
        </aside>
      )}

      {/* Mobile header & drawer */}
      {isMobile && (
        <>
          <div className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Database size={14} className="text-white"/>
              </div>
              <span className="text-sm font-bold text-slate-900">CAPI Admin</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-600 bg-transparent border-0 cursor-pointer hover:bg-slate-50 transition-all">
              {isMobileMenuOpen ? <X size={20}/> : <Menu size={20}/>}
            </button>
          </div>
          {isMobileMenuOpen && (
            <>
              <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setIsMobileMenuOpen(false)}/>
              <div className="fixed left-0 top-0 bottom-0 w-72 z-50" style={{ animation: 'slideRight 0.25s ease' }}>
                <SidebarContent/>
              </div>
            </>
          )}
        </>
      )}

      {/* Main content */}
      <main className={`flex-1 min-w-0 ${isMobile ? 'pt-14' : ''}`}>
        {/* Desktop toggle */}
        {!isMobile && (
          <div className="p-4 pb-0">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 bg-white border border-slate-100 cursor-pointer transition-all hover:shadow-sm">
              <Menu size={16}/>
            </button>
          </div>
        )}
        {children}
      </main>

      {showLogoutConfirm && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div 
            className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden"
            style={{ animation: "scaleUp 0.15s ease-out both" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <LogOut size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Keluar dari Akun?</h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
                  Apakah Anda yakin ingin keluar dari akun administrator/koordinator Anda?
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
                  onNavigate("login");
                }}
                className="px-5.5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl cursor-pointer border-0 shadow-sm transition-all"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminLayout;