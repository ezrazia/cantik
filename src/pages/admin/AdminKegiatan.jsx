import { useState, useEffect } from "react";
import AdminLayout from "../../components/layouts/AdminLayout";
import { 
  Plus, Search, Edit, Trash2, Calendar, Check, X, AlertTriangle, 
  Users, Briefcase, ChevronRight, UserPlus, UserMinus, Eye, FileText, CheckCircle, ArrowLeft, ShieldAlert, ChevronDown,
  Save
} from "lucide-react";
import { getDesaData } from "../../constants/mockData";

const MOCK_KECAMATAN = ["Sesayap", "Sesayap Hilir", "Tana Lia", "Betayau", "Muruk Rian"];

const MOCK_DESA_HIERARCHY = [
  { name: "Tideng Pale", kecamatan: "Sesayap" },
  { name: "Tideng Pale Timur", kecamatan: "Sesayap" },
  { name: "Limbu Sedulun", kecamatan: "Sesayap" },
  { name: "Gunawan", kecamatan: "Sesayap" },
  { name: "Sesayap Hilir", kecamatan: "Sesayap Hilir" },
  { name: "Seludau", kecamatan: "Sesayap Hilir" },
  { name: "Bebatu", kecamatan: "Sesayap Hilir" },
  { name: "Sepala Dalung", kecamatan: "Sesayap Hilir" },
  { name: "Tanah Merah", kecamatan: "Tana Lia" },
  { name: "Sambungan", kecamatan: "Tana Lia" },
  { name: "Tengku Dacing", kecamatan: "Tana Lia" },
  { name: "Kujau", kecamatan: "Betayau" },
  { name: "Buong Baru", kecamatan: "Betayau" },
  { name: "Betayau", kecamatan: "Betayau" },
  { name: "Rian", kecamatan: "Muruk Rian" },
  { name: "Kapuas", kecamatan: "Muruk Rian" },
  { name: "Belayan", kecamatan: "Muruk Rian" }
];

const MOCK_SLS_HIERARCHY = [];
MOCK_DESA_HIERARCHY.forEach(d => {
  MOCK_SLS_HIERARCHY.push({ name: `SLS 01 ${d.name}`, desa: d.name });
  MOCK_SLS_HIERARCHY.push({ name: `SLS 02 ${d.name}`, desa: d.name });
  MOCK_SLS_HIERARCHY.push({ name: `SLS 03 ${d.name}`, desa: d.name });
});

const MOCK_SUB_SLS_HIERARCHY = [];
MOCK_DESA_HIERARCHY.forEach(d => {
  MOCK_SUB_SLS_HIERARCHY.push({ name: `RT 01 A ${d.name}`, sls: `SLS 01 ${d.name}` });
  MOCK_SUB_SLS_HIERARCHY.push({ name: `RT 01 B ${d.name}`, sls: `SLS 01 ${d.name}` });
});

/**
 * Halaman Manajemen Kegiatan BPS — premium, modern, dan minimalis.
 * Memungkinkan tambah kegiatan baru, edit detail kegiatan, mengubah status publikasi,
 * dan menetapkan petugas lapangan secara massal (multi-select) dengan peran PML/PCL.
 *
 * @param {Object} props
 * @param {(screen: string) => void} props.onNavigate
 * @param {Array} props.activities
 * @param {Function} props.setActivities
 * @param {Array} props.petugas
 * @param {Function} props.setPetugas
 * @returns {React.ReactElement}
 */
function AdminKegiatan({ onNavigate, selectedProject, onProjectChange, activities, setActivities, petugas, setPetugas }) {
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(null); // { type, data, action }

  // State multi-select penugasan petugas
  const [selectedOfficerNames, setSelectedOfficerNames] = useState([]); // Array of names
  const [officerRolesMap, setOfficerRolesMap] = useState({}); // { [officerName]: "PML" | "PCL" }

  const [tempLokus, setTempLokus] = useState(null);

  useEffect(() => {
    if (selectedActivity) {
      setTempLokus(selectedActivity.lokus || { kecamatan: [], desa: [], sls: [], subSls: [] });
    } else {
      setTempLokus(null);
    }
  }, [selectedActivity]);

  const handleLokusChange = (type, value) => {
    if (selectedActivity.status !== "draft") return;
    const currentLokus = tempLokus || { kecamatan: [], desa: [], sls: [], subSls: [] };
    let nextValues = [];
    if (currentLokus[type] && currentLokus[type].includes(value)) {
      nextValues = currentLokus[type].filter(v => v !== value);
    } else {
      nextValues = [...(currentLokus[type] || []), value];
    }

    let nextLokus = { ...currentLokus, [type]: nextValues };
    if (type === "kecamatan") {
      const allowedDesas = MOCK_DESA_HIERARCHY.filter(d => nextValues.includes(d.kecamatan)).map(d => d.name);
      nextLokus.desa = (currentLokus.desa || []).filter(d => allowedDesas.includes(d));
    }
    if (type === "desa" || type === "kecamatan") {
      const allowedSls = MOCK_SLS_HIERARCHY.filter(s => nextLokus.desa.includes(s.desa)).map(s => s.name);
      nextLokus.sls = (currentLokus.sls || []).filter(s => allowedSls.includes(s));
    }
    if (type === "sls" || type === "desa" || type === "kecamatan") {
      const allowedSub = MOCK_SUB_SLS_HIERARCHY.filter(sub => nextLokus.sls.includes(sub.sls)).map(sub => sub.name);
      nextLokus.subSls = (currentLokus.subSls || []).filter(sub => allowedSub.includes(sub));
    }

    setTempLokus(nextLokus);
  };

  const handleSaveLokusClick = () => {
    triggerConfirm(
      "save_lokus",
      { activityName: selectedActivity.name },
      () => {
        setActivities(prev => prev.map(a => a.name === selectedActivity.name ? { ...a, lokus: tempLokus } : a));
        setSelectedActivity(prev => ({ ...prev, lokus: tempLokus }));
      }
    );
  };

  // Form states untuk tambah kegiatan
  const [newActivity, setNewActivity] = useState({
    name: "",
    desc: "",
    date: "",
    status: "draft"
  });

  // Form states untuk edit kegiatan
  const [editForm, setEditForm] = useState({
    name: "",
    desc: "",
    date: "",
    status: "draft"
  });

  // Filter & Search Logic untuk kegiatan
  const filteredActivities = activities.filter(act => 
    act.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    act.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Cari petugas yang di-assign ke kegiatan saat ini
  const assignedOfficers = selectedActivity
    ? petugas.filter(p => p.projects && p.projects.includes(selectedActivity.name))
    : [];

  // Cari petugas yang BELUM di-assign ke kegiatan saat ini
  const unassignedOfficers = selectedActivity
    ? petugas.filter(p => !p.projects || !p.projects.includes(selectedActivity.name))
    : [];

  const [assignSearch, setAssignSearch] = useState("");

  // Handler membuka konfirmasi
  const triggerConfirm = (type, data, action) => {
    setShowConfirmModal({ type, data, action });
  };

  // Toggle selection petugas di modal
  const handleToggleOfficerSelect = (officerName) => {
    if (selectedOfficerNames.includes(officerName)) {
      setSelectedOfficerNames(selectedOfficerNames.filter(name => name !== officerName));
      // Hapus dari roles map
      const updatedRoles = { ...officerRolesMap };
      delete updatedRoles[officerName];
      setOfficerRolesMap(updatedRoles);
    } else {
      setSelectedOfficerNames([...selectedOfficerNames, officerName]);
      // Set default role ke PCL
      setOfficerRolesMap({ ...officerRolesMap, [officerName]: "PCL" });
    }
  };

  // Mengubah peran petugas dalam modal seleksi
  const handleOfficerRoleChangeInModal = (officerName, role) => {
    setOfficerRolesMap({ ...officerRolesMap, [officerName]: role });
  };

  // 1. Aksi Tambah Kegiatan
  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newActivity.name.trim()) return;

    triggerConfirm(
      "add_activity",
      newActivity,
      () => {
        const colors = ["bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-amber-600", "bg-rose-600", "bg-indigo-600"];
        const color = colors[activities.length % colors.length];
        const textColor = color.replace("bg-", "text-");
        const bgColor = color.replace("bg-", "bg-") + "/10"; // custom transparency background

        const activityToAdd = {
          name: newActivity.name.trim(),
          desc: newActivity.desc.trim(),
          progress: 0,
          color,
          textColor,
          bgColor,
          date: newActivity.date,
          status: newActivity.status
        };

        setActivities(prev => [...prev, activityToAdd]);
        setNewActivity({ name: "", desc: "", date: "", status: "draft" });
        setShowAddModal(false);
      }
    );
  };

  // 2. Aksi Edit Kegiatan
  const handleEditOpen = () => {
    setEditForm({
      name: selectedActivity.name,
      desc: selectedActivity.desc,
      date: selectedActivity.date || "",
      status: selectedActivity.status
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) return;

    const isTransitioningFromUjiCobaToPublished = 
      selectedActivity.status === "uji_coba" && editForm.status === "published";

    triggerConfirm(
      isTransitioningFromUjiCobaToPublished ? "transition_warning" : "edit_activity",
      editForm,
      () => {
        const oldName = selectedActivity.name;
        const newName = editForm.name.trim();

        // Update kegiatan
        setActivities(prev => prev.map(act => 
          act.name === oldName 
            ? { ...act, name: newName, desc: editForm.desc.trim(), date: editForm.date, status: editForm.status }
            : act
        ));

        // Update project name and clean if transition
        setPetugas(prev => prev.map(p => {
          let nextProjects = p.projects || [];
          let nextRoles = { ...(p.projectRoles || {}) };

          if (isTransitioningFromUjiCobaToPublished) {
            // Hapus penugasan dummy entirely
            nextProjects = nextProjects.filter(proj => proj !== oldName);
            delete nextRoles[oldName];
          } else if (oldName !== newName) {
            // Rename assignment
            nextProjects = nextProjects.map(proj => proj === oldName ? newName : proj);
            if (nextRoles[oldName]) {
              nextRoles[newName] = nextRoles[oldName];
              delete nextRoles[oldName];
            }
          }

          return { ...p, projects: nextProjects, projectRoles: nextRoles };
        }));

        setSelectedActivity(prev => ({
          ...prev,
          name: newName,
          desc: editForm.desc.trim(),
          date: editForm.date,
          status: editForm.status
        }));
        
        setShowEditModal(false);
      }
    );
  };

  // 3. Aksi Hapus Kegiatan
  const handleDeleteActivity = () => {
    triggerConfirm(
      "delete_activity",
      selectedActivity,
      () => {
        const nameToDelete = selectedActivity.name;
        // Hapus kegiatan
        setActivities(prev => prev.filter(act => act.name !== nameToDelete));

        // Cabut penugasan dari semua petugas
        setPetugas(prev => prev.map(p => ({
          ...p,
          projects: p.projects ? p.projects.filter(proj => proj !== nameToDelete) : [],
          projectRoles: p.projectRoles ? (() => {
            const r = { ...p.projectRoles };
            delete r[nameToDelete];
            return r;
          })() : {}
        })));

        setSelectedActivity(null);
      }
    );
  };

  // 4. Aksi Tugaskan Petugas (Assign massal)
  const handleAssignOfficersSubmit = () => {
    if (selectedOfficerNames.length === 0) return;

    triggerConfirm(
      "assign_officers_bulk",
      { count: selectedOfficerNames.length, activityName: selectedActivity.name },
      () => {
        setPetugas(prev => prev.map(p => {
          if (selectedOfficerNames.includes(p.name)) {
            const role = officerRolesMap[p.name] || "PCL";
            const currentProjects = p.projects || [];
            const nextProjects = currentProjects.includes(selectedActivity.name)
              ? currentProjects
              : [...currentProjects, selectedActivity.name];
            
            const nextRoles = {
              ...(p.projectRoles || {}),
              [selectedActivity.name]: role
            };

            return { ...p, projects: nextProjects, projectRoles: nextRoles };
          }
          return p;
        }));

        // Reset states
        setSelectedOfficerNames([]);
        setOfficerRolesMap({});
        setShowAssignModal(false);
        setAssignSearch("");
      }
    );
  };

  // 5. Aksi Cabut Petugas (Unassign)
  const handleUnassignOfficer = (officerName) => {
    triggerConfirm(
      "unassign_officer",
      { officerName, activityName: selectedActivity.name },
      () => {
        setPetugas(prev => prev.map(p => {
          if (p.name === officerName) {
            const nextProjects = (p.projects || []).filter(proj => proj !== selectedActivity.name);
            const nextRoles = { ...(p.projectRoles || {}) };
            delete nextRoles[selectedActivity.name];
            return { ...p, projects: nextProjects, projectRoles: nextRoles };
          }
          return p;
        }));
      }
    );
  };

  // Helper mapping status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case "published":
        return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100/50">Published (Visible)</span>;
      case "uji_coba":
        return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/50">Uji Coba (Sandbox)</span>;
      case "selesai":
        return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/50">Selesai (Finished)</span>;
      case "draft":
      default:
        return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200/50">Draft (Hidden)</span>;
    }
  };

  return (
    <AdminLayout tab="admin-kegiatan" onNavigate={onNavigate} selectedProject={selectedProject} onProjectChange={onProjectChange} activities={activities}>
      <style>{`
        /* Animations */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade {
          animation: fadeIn 0.25s ease-out both;
        }
        .animate-slide {
          animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .animate-zoom {
          animation: zoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 9999px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      <div className="p-6 lg:p-8 w-full animate-slide">
        
        {/* ======================================================== */}
        {/* CONDITIONAL VIEW: 1. LIST OF ALL ACTIVITIES */}
        {/* ======================================================== */}
        {!selectedActivity ? (
          <div className="animate-fade">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manajemen Kegiatan BPS</h1>
                <p className="text-xs font-medium text-slate-400 mt-1.5">
                  Rancang kegiatan survei baru, kelola status publikasi untuk petugas lapangan, dan tetapkan petugas.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-blue-600 text-white rounded-xl border-0 cursor-pointer hover:bg-blue-700 transition-all active:scale-[0.98]"
                >
                  <Plus size={14}/> Tambah Kegiatan
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600">
                  <Briefcase size={18} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Total Kegiatan</p>
                  <p className="mono text-lg font-bold text-slate-900">{activities.length}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
                  <CheckCircle size={18} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Published (Visible)</p>
                  <p className="mono text-lg font-bold text-emerald-600">
                    {activities.filter(a => a.status === "published").length}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Uji Coba (Sandbox)</p>
                  <p className="mono text-lg font-bold text-amber-600">
                    {activities.filter(a => a.status === "uji_coba").length}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
                  <CheckCircle size={18} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Selesai (Finished)</p>
                  <p className="mono text-lg font-bold text-blue-600">
                    {activities.filter(a => a.status === "selesai").length}
                  </p>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all mb-6 w-full md:w-80">
              <Search size={16} className="text-slate-400"/>
              <input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="text-sm outline-none text-slate-700 placeholder-slate-400 w-full bg-transparent font-medium" 
                placeholder="Cari kegiatan..."
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="bg-transparent border-0 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={14}/>
                </button>
              )}
            </div>

            {/* Grid of Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredActivities.map(act => {
                const actOfficersCount = petugas.filter(p => p.projects && p.projects.includes(act.name)).length;
                return (
                  <div 
                    key={act.name}
                    onClick={() => { setSelectedActivity(act); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="border border-slate-100 hover:border-blue-300 rounded-2xl p-6 bg-white transition-all cursor-pointer flex flex-col justify-between min-h-[190px] hover:shadow-md hover:scale-[1.01]"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        {getStatusBadge(act.status)}
                        
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Users size={11}/> {actOfficersCount} Petugas
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 tracking-tight leading-snug">{act.name}</h3>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed mt-2 mb-4 line-clamp-2">
                        {act.desc}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-50 text-[10px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12}/> {act.date ? new Date(act.date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
                      </span>
                      <span className="text-blue-600 font-semibold flex items-center gap-0.5 hover:translate-x-0.5 transition-transform">
                        Buka Detail <ChevronRight size={13}/>
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredActivities.length === 0 && (
                <div className="col-span-full bg-white rounded-2xl border border-slate-100 py-20 text-center">
                  <Briefcase size={32} className="text-slate-200 mx-auto mb-2"/>
                  <p className="text-xs text-slate-400 font-semibold">Kegiatan tidak ditemukan</p>
                  <p className="text-[11px] text-slate-300 mt-0.5">Silakan tambahkan kegiatan baru menggunakan tombol di kanan atas</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          
          // ========================================================
          // CONDITIONAL VIEW: 2. SINGLE SELECTED ACTIVITY DETAILS
          // ========================================================
          <div className="animate-slide">
            {/* Navigation back */}
            <button 
              onClick={() => { setSelectedActivity(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="flex items-center gap-2 mb-6 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl cursor-pointer transition-all shadow-sm"
            >
              <ArrowLeft size={14}/> Kembali ke Daftar Kegiatan
            </button>

            {/* Detail Header Banner */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {getStatusBadge(selectedActivity.status)}
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                    <Calendar size={11}/> Mulai: {selectedActivity.date ? new Date(selectedActivity.date).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                  </span>
                </div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-snug">{selectedActivity.name}</h1>
              </div>

              {/* Top Quick Actions */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleEditOpen}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl border-0 cursor-pointer transition-all"
                >
                  <Edit size={13}/> Edit Info & Status
                </button>
                <button 
                  onClick={handleDeleteActivity}
                  className="w-10 h-9.5 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl border border-red-100 cursor-pointer transition-all bg-transparent"
                  title="Hapus Kegiatan"
                >
                  <Trash2 size={15}/>
                </button>
              </div>
            </div>

            {/* TRIAL / UJI COBA WARNING BANNER */}
            {selectedActivity.status === "uji_coba" && (
              <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 mb-6 flex items-start gap-3 text-amber-800 animate-slide">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5"/>
                <div>
                  <h4 className="text-xs font-bold">Mode Uji Coba (Sandbox) Aktif</h4>
                  <p className="text-[11px] font-medium leading-relaxed text-amber-700/90 mt-0.5">
                    Kegiatan ini sedang dalam tahap uji coba internal. Semua petugas yang Anda tugaskan di bawah ini berstatus <strong>Petugas Dummy</strong>. 
                    Ketika Anda mempublikasikan kegiatan ini (mengubah status ke <strong>Published</strong>), semua data penugasan petugas dummy ini akan otomatis dibersihkan.
                  </p>
                </div>
              </div>
            )}

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
              
              {/* Left Column: Description & Details */}
              <div className="lg:col-span-2 space-y-6 w-full">
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Deskripsi & Ruang Lingkup</h3>
                  <div className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                    {selectedActivity.desc}
                  </div>
                </div>

                {/* Lokus Kegiatan Card */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      Lokus Kegiatan
                    </h3>
                    <div className="flex items-center gap-2">
                      {selectedActivity.status === "draft" && (
                        <button
                          onClick={handleSaveLokusClick}
                          className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold border-0 cursor-pointer hover:bg-blue-700 transition-all active:scale-[0.98] shadow-sm flex items-center gap-1.5"
                        >
                          <Save size={12}/> Simpan Lokus
                        </button>
                      )}
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full font-bold">
                        Kalimantan Utara / Tana Tidung
                      </span>
                    </div>
                  </div>

                  {/* Read-Only Auto-filled Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Provinsi</label>
                      <input 
                        type="text" 
                        value="Kalimantan Utara" 
                        disabled 
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-150 rounded-xl text-slate-500 font-semibold cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Kabupaten</label>
                      <input 
                        type="text" 
                        value="Tana Tidung" 
                        disabled 
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-150 rounded-xl text-slate-500 font-semibold cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Hierarchy selection columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-3">
                    {/* Kecamatan */}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase mb-2">Kecamatan</span>
                      <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/20 max-h-[180px] overflow-y-auto space-y-2 scrollbar-thin text-[11px]">
                        {MOCK_KECAMATAN.map(kec => {
                          const isChecked = (tempLokus?.kecamatan || []).includes(kec);
                          const isDraft = selectedActivity.status === "draft";
                          return (
                            <label key={kec} className={`flex items-center gap-2 py-0.5 font-medium ${
                              isDraft ? "cursor-pointer hover:text-slate-800 text-slate-600" : "cursor-not-allowed text-slate-400"
                            }`}>
                              <input 
                                type="checkbox" 
                                checked={isChecked} 
                                disabled={!isDraft}
                                onChange={() => handleLokusChange("kecamatan", kec)}
                                className="rounded text-blue-600 focus:ring-blue-500/20 w-3.5 h-3.5 cursor-pointer disabled:opacity-50"
                              />
                              <span className="truncate">{kec}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Desa */}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase mb-2">Desa</span>
                      <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/20 max-h-[180px] overflow-y-auto space-y-2 scrollbar-thin text-[11px]">
                        {(tempLokus?.kecamatan || []).length > 0 ? (
                          MOCK_DESA_HIERARCHY
                            .filter(d => (tempLokus?.kecamatan || []).includes(d.kecamatan))
                            .map(d => {
                              const isChecked = (tempLokus?.desa || []).includes(d.name);
                              const isDraft = selectedActivity.status === "draft";
                              return (
                                <label key={d.name} className={`flex items-center gap-2 py-0.5 font-medium ${
                                  isDraft ? "cursor-pointer hover:text-slate-800 text-slate-600" : "cursor-not-allowed text-slate-400"
                                }`}>
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked} 
                                    disabled={!isDraft}
                                    onChange={() => handleLokusChange("desa", d.name)}
                                    className="rounded text-blue-600 focus:ring-blue-500/20 w-3.5 h-3.5 cursor-pointer disabled:opacity-50"
                                  />
                                  <span className="truncate">{d.name}</span>
                                </label>
                              );
                            })
                        ) : (
                          <span className="text-[10px] text-slate-350 italic block py-2">Pilih Kecamatan dahulu</span>
                        )}
                      </div>
                    </div>

                    {/* SLS */}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase mb-2">SLS</span>
                      <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/20 max-h-[180px] overflow-y-auto space-y-2 scrollbar-thin text-[11px]">
                        {(tempLokus?.desa || []).length > 0 ? (
                          MOCK_SLS_HIERARCHY
                            .filter(s => (tempLokus?.desa || []).includes(s.desa))
                            .map(s => {
                              const isChecked = (tempLokus?.sls || []).includes(s.name);
                              const isDraft = selectedActivity.status === "draft";
                              return (
                                <label key={s.name} className={`flex items-center gap-2 py-0.5 font-medium ${
                                  isDraft ? "cursor-pointer hover:text-slate-800 text-slate-600" : "cursor-not-allowed text-slate-400"
                                }`}>
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked} 
                                    disabled={!isDraft}
                                    onChange={() => handleLokusChange("sls", s.name)}
                                    className="rounded text-blue-600 focus:ring-blue-500/20 w-3.5 h-3.5 cursor-pointer disabled:opacity-50"
                                  />
                                  <span className="truncate">{s.name.replace(` ${s.desa}`, '')}</span>
                                </label>
                              );
                            })
                        ) : (
                          <span className="text-[10px] text-slate-350 italic block py-2">Pilih Desa dahulu</span>
                        )}
                      </div>
                    </div>

                    {/* Sub SLS */}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase mb-2">Sub SLS</span>
                      <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/20 max-h-[180px] overflow-y-auto space-y-2 scrollbar-thin text-[11px]">
                        {(tempLokus?.sls || []).length > 0 ? (
                          (() => {
                            const subOptions = MOCK_SUB_SLS_HIERARCHY.filter(sub => (tempLokus?.sls || []).includes(sub.sls));
                            const isDraft = selectedActivity.status === "draft";
                            if (subOptions.length > 0) {
                              return subOptions.map(sub => {
                                const isChecked = (tempLokus?.subSls || []).includes(sub.name);
                                return (
                                  <label key={sub.name} className={`flex items-center gap-2 py-0.5 font-medium ${
                                    isDraft ? "cursor-pointer hover:text-slate-800 text-slate-600" : "cursor-not-allowed text-slate-400"
                                  }`}>
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked} 
                                      disabled={!isDraft}
                                      onChange={() => handleLokusChange("subSls", sub.name)}
                                      className="rounded text-blue-600 focus:ring-blue-500/20 w-3.5 h-3.5 cursor-pointer disabled:opacity-50"
                                    />
                                    <span className="truncate">{sub.name.split(' RT')[0]}</span>
                                  </label>
                                );
                              });
                            } else {
                              return <span className="text-[10px] text-slate-350 italic block py-2">Tidak ada Sub SLS</span>;
                            }
                          })()
                        ) : (
                          <span className="text-[10px] text-slate-350 italic block py-2">Pilih SLS dahulu</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional metadata card */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Progress Lapangan</span>
                    <span className="text-lg font-bold text-slate-800 block mt-1">{selectedActivity.progress || 0}% Selesai</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">PML (Pengawas)</span>
                    <span className="text-lg font-bold text-purple-600 block mt-1">
                      {assignedOfficers.filter(p => p.projectRoles?.[selectedActivity.name] === "PML").length} Orang
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">PCL (Pendata)</span>
                    <span className="text-lg font-bold text-blue-600 block mt-1">
                      {assignedOfficers.filter(p => p.projectRoles?.[selectedActivity.name] === "PCL").length} Orang
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Petugas</span>
                    <span className="text-lg font-bold text-slate-800 block mt-1">{assignedOfficers.length} Orang</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Assigned Officers */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm w-full">
                <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Users size={14}/> Petugas Lapangan ({assignedOfficers.length})
                    </h3>
                  </div>

                  {selectedActivity.status !== "selesai" && (
                    <button 
                      onClick={() => {
                        onNavigate("admin-users");
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 rounded-xl border-0 cursor-pointer transition-all"
                    >
                      <UserPlus size={13}/> Tambah Petugas
                    </button>
                  )}
                </div>

                {/* List of Officers */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
                  {assignedOfficers.map(p => {
                    const role = p.projectRoles?.[selectedActivity.name] || "PCL";
                    return (
                      <div key={p.name} className="flex items-center justify-between p-3.5 border border-slate-100 hover:border-slate-200 bg-white rounded-xl transition-all shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {p.name.split(' ').map(n=>n[0]).join('')}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-slate-800 truncate block max-w-[120px] md:max-w-none">{p.name}</span>
                              
                              {/* Dummy Badge */}
                              {selectedActivity.status === "uji_coba" && (
                                <span className="text-[8px] font-bold px-1.5 py-0.2 bg-red-50 text-red-500 rounded border border-red-100">Dummy</span>
                              )}
                            </div>
                            <span className="block text-[10px] text-slate-400 font-medium mt-0.5">Desa {p.desa}</span>
                          </div>
                        </div>

                        {/* Role & Actions */}
                        <div className="flex items-center gap-2.5">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-lg border uppercase ${
                            role === "PML" 
                              ? "bg-purple-50 text-purple-600 border-purple-100" 
                              : "bg-blue-50 text-blue-600 border-blue-100"
                          }`}>
                            {role === "PML" ? "PML (Pengawas)" : "PCL (Pendata)"}
                          </span>

                          {selectedActivity.status !== "selesai" && (
                            <button 
                              onClick={() => handleUnassignOfficer(p.name)}
                              className="w-7 h-7 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center border-0 cursor-pointer transition-all bg-transparent"
                              title="Cabut Penugasan"
                            >
                              <UserMinus size={13}/>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {assignedOfficers.length === 0 && (
                    <div className="py-12 text-center bg-slate-50/30 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-medium italic">
                      Belum ada petugas ditugaskan ke kegiatan ini. Silakan klik "Tugaskan Massal" untuk mulai.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* MODAL: TAMBAH KEGIATAN */}
      {/* ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade"
          onClick={() => setShowAddModal(false)}
        >
          <div className="bg-white rounded-2xl p-8 w-full shadow-lg animate-zoom"
            style={{ maxWidth: 460 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-blue-50 text-blue-600">
              <Briefcase size={24}/>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-1">
              Tambah Kegiatan BPS Baru
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Buat kegiatan survei atau pendataan baru untuk memantau pencacahan.
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Nama Kegiatan</label>
                <input 
                  type="text" 
                  value={newActivity.name} 
                  onChange={e => setNewActivity({ ...newActivity, name: e.target.value })} 
                  required
                  placeholder="Contoh: Survei Angkatan Kerja Nasional 2026" 
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-700 placeholder:text-slate-300 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Deskripsi Kegiatan</label>
                <textarea 
                  value={newActivity.desc} 
                  onChange={e => setNewActivity({ ...newActivity, desc: e.target.value })} 
                  required
                  rows={3}
                  placeholder="Jelaskan tujuan dan ruang lingkup kegiatan pendataan ini..." 
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-700 placeholder:text-slate-300 transition-all font-medium resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Tanggal Pelaksanaan</label>
                  <input 
                    type="date" 
                    value={newActivity.date} 
                    onChange={e => setNewActivity({ ...newActivity, date: e.target.value })} 
                    required
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-700 transition-all font-medium cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Status Publikasi</label>
                  <div className="relative">
                    <select 
                      value={newActivity.status} 
                      onChange={e => setNewActivity({ ...newActivity, status: e.target.value })}
                      className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white text-slate-700 transition-all font-medium cursor-pointer appearance-none pr-10"
                    >
                      <option value="draft">Draft (Hidden)</option>
                      <option value="uji_coba">Uji Coba (Sandbox)</option>
                      <option value="published">Published (Visible)</option>
                      <option value="selesai">Selesai (Finished)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-semibold text-slate-600 cursor-pointer transition-all border-0"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 border-0 cursor-pointer transition-all active:scale-[0.98]"
                >
                  Buat Kegiatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT KEGIATAN */}
      {/* ======================================================== */}
      {showEditModal && selectedActivity && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade"
          onClick={() => setShowEditModal(false)}
        >
          <div className="bg-white rounded-2xl p-8 w-full shadow-lg animate-zoom"
            style={{ maxWidth: 460 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-blue-50 text-blue-600">
              <Edit size={24}/>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-1">
              Edit Kegiatan
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Perbarui rincian informasi dan status publikasi kegiatan BPS.
            </p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Nama Kegiatan</label>
                <input 
                  type="text" 
                  value={editForm.name} 
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                  required
                  placeholder="Contoh: Survei Angkatan Kerja Nasional 2026" 
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-700 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Deskripsi Kegiatan</label>
                <textarea 
                  value={editForm.desc} 
                  onChange={e => setEditForm({ ...editForm, desc: e.target.value })} 
                  required
                  rows={3}
                  placeholder="Jelaskan tujuan dan ruang lingkup..." 
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-700 transition-all font-medium resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Tanggal Pelaksanaan</label>
                  <input 
                    type="date" 
                    value={editForm.date} 
                    onChange={e => setEditForm({ ...editForm, date: e.target.value })} 
                    required
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-700 transition-all font-medium cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Status Publikasi</label>
                  <div className="relative">
                    <select 
                      value={editForm.status} 
                      onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white text-slate-700 transition-all font-medium cursor-pointer appearance-none pr-10"
                    >
                      <option value="draft">Draft (Hidden)</option>
                      <option value="uji_coba">Uji Coba (Sandbox)</option>
                      <option value="published">Published (Visible)</option>
                      <option value="selesai">Selesai (Finished)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-semibold text-slate-600 cursor-pointer transition-all border-0"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 border-0 cursor-pointer transition-all active:scale-[0.98]"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: TUGASKAN PETUGAS MASSAL (MULTI-SELECT) */}
      {/* ======================================================== */}
      {showAssignModal && selectedActivity && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade"
          onClick={() => setShowAssignModal(false)}
        >
          <div className="bg-white rounded-2xl p-8 w-full shadow-lg animate-zoom flex flex-col"
            style={{ maxWidth: 520, maxHeight: "90vh" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-blue-50 text-blue-600 flex-shrink-0">
              <UserPlus size={24}/>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1 flex-shrink-0">
              Tugaskan Petugas Massal
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed flex-shrink-0">
              Pilih satu atau lebih petugas BPS serta tentukan peran mereka sebagai <strong>PML (Pengawas)</strong> atau <strong>PCL (Pendata)</strong>.
            </p>

            {/* Search filter petugas */}
            <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-100 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/10 transition-all mb-4 flex-shrink-0">
              <Search size={14} className="text-slate-400"/>
              <input 
                value={assignSearch}
                onChange={e => setAssignSearch(e.target.value)}
                className="text-xs outline-none text-slate-700 placeholder-slate-400 w-full bg-transparent font-semibold" 
                placeholder="Cari nama petugas..."
              />
              {assignSearch && (
                <button type="button" onClick={() => setAssignSearch("")} className="bg-transparent border-0 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={12}/>
                </button>
              )}
            </div>

            {/* Checklist of Officers */}
            <div className="space-y-2.5 overflow-y-auto pr-1 mb-6 scrollbar-thin flex-1 min-h-[150px]">
              {unassignedOfficers
                .filter(p => p.name.toLowerCase().includes(assignSearch.toLowerCase()))
                .map(p => {
                  const isChecked = selectedOfficerNames.includes(p.name);
                  const activeRole = officerRolesMap[p.name] || "PCL";
                  return (
                    <div 
                      key={p.name}
                      onClick={() => handleToggleOfficerSelect(p.name)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isChecked 
                          ? "border-blue-200 bg-blue-50/20" 
                          : "border-slate-100 bg-slate-50/40 hover:bg-slate-50"
                      }`}
                    >
                      {/* Checkbox & Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => {}} // handled by parent div onClick
                          className="rounded text-blue-600 focus:ring-blue-500/20 w-4 h-4 cursor-pointer flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Desa {p.desa}</p>
                        </div>
                      </div>

                      {/* Role Selector dropdown */}
                      {isChecked && (
                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <span className="text-[10px] text-slate-400 font-bold">Peran:</span>
                          <div className="relative">
                            <select
                              value={activeRole}
                              onChange={(e) => handleOfficerRoleChangeInModal(p.name, e.target.value)}
                              className="appearance-none text-[10px] font-bold pl-3 pr-7 py-1.5 bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50/50 rounded-xl text-slate-750 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold"
                            >
                              <option value="PCL">PCL (Pendata)</option>
                              <option value="PML">PML (Pengawas)</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
                              <ChevronDown size={11} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

              {unassignedOfficers.filter(p => p.name.toLowerCase().includes(assignSearch.toLowerCase())).length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs font-medium italic">
                  Tidak ada petugas baru yang dapat ditugaskan
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-3 flex-shrink-0 pt-2 border-t border-slate-100">
              <button 
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-500 cursor-pointer transition-all border-0"
              >
                Batal
              </button>
              <button 
                type="button"
                disabled={selectedOfficerNames.length === 0}
                onClick={handleAssignOfficersSubmit}
                className="flex-1 py-3 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed border-0 cursor-pointer transition-all active:scale-[0.98]"
              >
                Tugaskan {selectedOfficerNames.length} Petugas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CONFIRMATION OVERLAY MODALS */}
      {/* ======================================================== */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/35 backdrop-blur-[2px] flex items-center justify-center z-[100] p-6 animate-fade"
          onClick={() => setShowConfirmModal(null)}
        >
          <div className="bg-white rounded-2xl p-8 w-full shadow-xl animate-zoom"
            style={{ maxWidth: 410 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 bg-amber-50 text-amber-600">
              <AlertTriangle size={22}/>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Apakah Anda yakin?
            </h3>
            
            {/* Descriptions based on confirmation type */}
            {showConfirmModal.type === "add_activity" && (
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Anda akan membuat kegiatan baru <strong>{showConfirmModal.data.name}</strong> dengan status <strong>{showConfirmModal.data.status}</strong>.
              </p>
            )}

            {showConfirmModal.type === "edit_activity" && (
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Anda akan menyimpan perubahan informasi kegiatan <strong>{showConfirmModal.data.name}</strong>.
              </p>
            )}

            {showConfirmModal.type === "save_lokus" && (
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Anda akan menyimpan konfigurasi Lokus Wilayah Tugas untuk kegiatan <strong>{showConfirmModal.data.activityName}</strong>.
              </p>
            )}

            {showConfirmModal.type === "transition_warning" && (
              <div>
                <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                  Anda akan mengubah status kegiatan <strong>{showConfirmModal.data.name}</strong> dari <strong>Uji Coba</strong> ke <strong>Published</strong>.
                </p>
                <div className="p-3 bg-red-50 text-red-700 text-[11px] font-bold rounded-xl border border-red-100 mb-6 leading-relaxed">
                  ⚠️ PENTING: Tindakan ini akan secara permanen menghapus semua penugasan petugas dummy dari kegiatan ini. Pastikan Anda telah menyelesaikan simulasi.
                </div>
              </div>
            )}

            {showConfirmModal.type === "delete_activity" && (
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Tindakan ini permanen! Anda akan menghapus kegiatan <strong>{showConfirmModal.data.name}</strong> serta mencabut penugasan seluruh petugas yang terlibat.
              </p>
            )}

            {showConfirmModal.type === "assign_officers_bulk" && (
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Anda akan menugaskan secara massal sebanyak <strong>{showConfirmModal.data.count} petugas</strong> ke kegiatan <strong>{showConfirmModal.data.activityName}</strong>.
              </p>
            )}

            {showConfirmModal.type === "unassign_officer" && (
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Anda akan mencabut penugasan <strong>{showConfirmModal.data.officerName}</strong> dari kegiatan <strong>{showConfirmModal.data.activityName}</strong>.
              </p>
            )}

            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setShowConfirmModal(null)}
                className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-500 cursor-pointer transition-all border-0"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={() => {
                  showConfirmModal.action();
                  setShowConfirmModal(null);
                }}
                className={`flex-1 py-3 rounded-xl text-xs font-semibold text-white cursor-pointer transition-all active:scale-[0.98] border-0 ${
                  showConfirmModal.type === "delete_activity" || showConfirmModal.type === "unassign_officer" || showConfirmModal.type === "transition_warning"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                Ya, Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}

export default AdminKegiatan;
