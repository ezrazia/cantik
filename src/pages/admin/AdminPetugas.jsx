import { useState } from "react";
import AdminLayout from "../../components/layouts/AdminLayout";
import { getPetugasData, getDesaData } from "../../constants/mockData";
import useDropdown from "../../hooks/useDropdown";
import { 
  Search, Plus, UserPlus, Users, CheckCircle, Clock, AlertTriangle, 
  RefreshCw, ChevronDown, Check, X, Edit, Trash2, Smartphone, 
  MapPin, Target, Send, Eye, Award, EyeOff, ArrowUpDown, SlidersHorizontal,
  User, Fingerprint, Phone, Briefcase
} from "lucide-react";

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
 * Halaman Manajemen Petugas Lapangan Admin — premium, modern, dan minimalis.
 * Memungkinkan pemantauan real-time aktivitas petugas, progress pencacahan, 
 * detail data per petugas, serta operasi CRUD sederhana.
 *
 * @param {Object} props
 * @param {(screen: string) => void} props.onNavigate
 * @returns {React.ReactElement}
 */
function AdminPetugas({ onNavigate, isGlobal = false, selectedProject, onProjectChange, petugas, setPetugas, activities }) {
  const activeActivity = activities?.find(a => a.name === selectedProject);
  const projectStatus = activeActivity ? activeActivity.status : "draft";

  const getStatusConfig = () => {
    switch (projectStatus) {
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

  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPetugas, setSelectedPetugas] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [tempProjects, setTempProjects] = useState([]);
  const [isConfirmingAssign, setIsConfirmingAssign] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [assignSearchQuery, setAssignSearchQuery] = useState("");
  const [nikInput, setNikInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  
  // State form petugas baru
  const [name, setName] = useState("");
  const [assignedDesa, setAssignedDesa] = useState(() => getDesaData()[0].name.replace("Desa ", ""));
  const [target, setTarget] = useState(15);
  const [selesai, setSelesai] = useState(0);
  const [status, setStatus] = useState("active");

  // Dropdown for village filter (contextual view)
  const villageDropdown = useDropdown("Semua Desa");
  const villages = ["Semua Desa", ...getDesaData().map(d => d.name)];

  // Dropdown for activities/projects filter (global view)
  const allProjects = activities ? activities.map(a => a.name) : [
    "Desa Cantik 2026", 
    "Survei Ekonomi 2026", 
    "Pendataan PLS 2026",
    "Survei Demografi 2026",
    "Pendataan Pertanian 2026",
    "Survei Sosial Ekonomi Nasional 2026"
  ];
  const availableProjects = ["Semua Kegiatan", ...allProjects];
  const projectFilterDropdown = useDropdown("Semua Kegiatan");

  // Column Visibility States
  const [visibleColsGlobal, setVisibleColsGlobal] = useState(["Nama", "Username", "ID", "Asal Desa", "Nomor Telepon", "Kegiatan", "Status", "Aksi"]);
  const [visibleColsLocal, setVisibleColsLocal] = useState(["Nama", "Wilayah Tugas", "Progress Pencacahan", "Sync Terakhir", "Status", "Aksi"]);
  const colDropdown = useDropdown("Kolom");

  // Sorting States
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc"); // "asc" | "desc"

  // Helper visibility toggles
  const toggleColGlobal = (col) => {
    if (visibleColsGlobal.includes(col)) {
      if (col === "Nama" || col === "Aksi") return;
      setVisibleColsGlobal(visibleColsGlobal.filter(c => c !== col));
    } else {
      setVisibleColsGlobal([...visibleColsGlobal, col]);
    }
  };

  const toggleColLocal = (col) => {
    if (visibleColsLocal.includes(col)) {
      if (col === "Nama" || col === "Aksi") return;
      setVisibleColsLocal(visibleColsLocal.filter(c => c !== col));
    } else {
      setVisibleColsLocal([...visibleColsLocal, col]);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const activeProjectNames = (activities || [])
    .filter(act => act.status !== "selesai")
    .map(act => act.name);

  // Get current active officers data based on global/local state
  const activeProjectOfficers = isGlobal 
    ? (projectFilterDropdown.selected === "Semua Kegiatan"
        ? petugas
        : petugas.filter(p => p.projects && p.projects.includes(projectFilterDropdown.selected))
      )
    : petugas.filter(p => p.projects && p.projects.includes(selectedProject));

  // Filter & Search Logic
  const filteredByVillage = (isGlobal || villageDropdown.selected === "Semua Desa")
    ? activeProjectOfficers
    : activeProjectOfficers.filter(p => p.desa === villageDropdown.selected.replace("Desa ", ""));

  // Status Filter (Only applies to contextual/local view)
  const filteredByStatus = isGlobal
    ? filteredByVillage
    : (filter === "all"
        ? filteredByVillage
        : (filter === "active"
            ? filteredByVillage.filter(p => p.status === "active" || p.status === "warning")
            : filteredByVillage.filter(p => p.status === filter)
          )
      );

  // Search filter
  const searchedData = filteredByStatus.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.desa.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.username && p.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.id && p.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Sorting logic
  const filteredAndSearched = [...searchedData].sort((a, b) => {
    if (!sortField) return 0;
    
    let aVal = a[sortField];
    let bVal = b[sortField];

    // Specific field transformations for correct alphabetical/numeric sorting
    if (sortField === "Nama") {
      aVal = a.name;
      bVal = b.name;
    } else if (sortField === "Username") {
      aVal = a.username || "";
      bVal = b.username || "";
    } else if (sortField === "ID") {
      aVal = a.id || "";
      bVal = b.id || "";
    } else if (sortField === "Asal Desa") {
      aVal = a.asalDesa || "";
      bVal = b.asalDesa || "";
    } else if (sortField === "Nomor Telepon") {
      aVal = a.phone || "";
      bVal = b.phone || "";
    } else if (sortField === "Kegiatan") {
      aVal = (a.projects || []).join(", ");
      bVal = (b.projects || []).join(", ");
    } else if (sortField === "Wilayah Tugas") {
      aVal = a.desa || "";
      bVal = b.desa || "";
    } else if (sortField === "Progress Pencacahan") {
      aVal = a.target > 0 ? (a.selesai / a.target) : 0;
      bVal = b.target > 0 ? (b.selesai / b.target) : 0;
    } else if (sortField === "Sync Terakhir") {
      aVal = a.sync || "";
      bVal = b.sync || "";
    } else if (sortField === "Status") {
      if (isGlobal) {
        aVal = (a.projects && a.projects.some(proj => activeProjectNames.includes(proj))) ? 1 : 0;
        bVal = (b.projects && b.projects.some(proj => activeProjectNames.includes(proj))) ? 1 : 0;
      } else {
        aVal = a.status || "";
        bVal = b.status || "";
      }
    }

    if (typeof aVal === "string") {
      return sortDirection === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    } else {
      return sortDirection === "asc"
        ? aVal - bVal
        : bVal - aVal;
    }
  });

  // Menghitung statistik berdasarkan data terfilter desa

  const totalPetugas = filteredByVillage.length;
  const globalAktifCount = filteredByVillage.filter(p => p.projects && p.projects.some(proj => activeProjectNames.includes(proj))).length;
  const globalTidakAktifCount = totalPetugas - globalAktifCount;
  const selesaiCount = filteredByVillage.filter(p => p.status === "done").length;
  const progresCount = totalPetugas - selesaiCount;
  
  // Total Target dan Selesai untuk progress kumulatif
  const totalTargetDesa = filteredByVillage.reduce((acc, curr) => acc + curr.target, 0);
  const totalSelesaiDesa = filteredByVillage.reduce((acc, curr) => acc + curr.selesai, 0);
  const progressKumulatif = totalTargetDesa > 0 ? Math.round((totalSelesaiDesa / totalTargetDesa) * 100) : 0;

  // Handler Refresh Data simulasi
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  // Handler Buka Konfirmasi Tambah Petugas
  const handleOpenAddConfirm = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setShowAddConfirm(true);
  };

  // Handler Tambah Petugas
  const handleAddPetugas = () => {
    if (!name.trim()) return;

    const idx = petugas.length;
    const finalUsername = usernameInput.trim() || name.toLowerCase().replace(/\s+/g, ".");
    const id = `32710${idx + 1}0${idx + 1}`;
    const finalNik = nikInput.trim() || `327101010101000${idx + 1}`;
    const finalPhone = phoneInput.trim() || "0812-3456-7890";
    const asalDesa = `Desa ${assignedDesa}`;

    const newOfficer = {
      name,
      desa: assignedDesa,
      target: 15,
      selesai: 0,
      sync: "Baru saja",
      status: "active",
      id,
      username: finalUsername,
      nik: finalNik,
      phone: finalPhone,
      asalDesa,
      projects: isGlobal ? ["Desa Cantik 2026"] : [selectedProject]
    };

    setPetugas(prev => [newOfficer, ...prev]);
    
    // Reset Form
    setName("");
    setNikInput("");
    setPhoneInput("");
    setUsernameInput("");
    setAssignedDesa(getDesaData()[0].name.replace("Desa ", ""));
    setShowAddModal(false);
    setShowAddConfirm(false);
  };

  // Handler Hapus Petugas
  const handleDeletePetugas = (nameToDelete) => {
    setPetugas(prev => prev.filter(p => p.name !== nameToDelete));
    if (selectedPetugas && selectedPetugas.name === nameToDelete) {
      setSelectedPetugas(null);
    }
  };

  // Handler Buka Modal Assign Kegiatan
  const handleOpenAssignModal = () => {
    setTempProjects(selectedPetugas?.projects || []);
    setAssignSearchQuery("");
    setIsConfirmingAssign(false);
    setShowAssignModal(true);
  };

  // Handler Toggle Kegiatan di Modal Assign
  const handleToggleProject = (proj) => {
    if (tempProjects.includes(proj)) {
      setTempProjects(tempProjects.filter(p => p !== proj));
    } else {
      setTempProjects([...tempProjects, proj]);
    }
  };

  // Handler Konfirmasi Assignment Kegiatan
  const handleConfirmAssignment = () => {
    setPetugas(prev => prev.map(p => {
      if (p.name === selectedPetugas.name) {
        const nextRoles = { ...(p.projectRoles || {}) };
        tempProjects.forEach(proj => {
          if (!nextRoles[proj]) {
            nextRoles[proj] = "PCL"; // default role
          }
        });
        Object.keys(nextRoles).forEach(proj => {
          if (!tempProjects.includes(proj)) {
            delete nextRoles[proj];
          }
        });
        return { ...p, projects: tempProjects, projectRoles: nextRoles };
      }
      return p;
    }));
    setSelectedPetugas(prev => {
      const nextRoles = { ...(prev.projectRoles || {}) };
      tempProjects.forEach(proj => {
        if (!nextRoles[proj]) nextRoles[proj] = "PCL";
      });
      Object.keys(nextRoles).forEach(proj => {
        if (!tempProjects.includes(proj)) delete nextRoles[proj];
      });
      return { ...prev, projects: tempProjects, projectRoles: nextRoles };
    });
    setShowAssignModal(false);
  };

  const handleRoleChange = (newRole) => {
    setPetugas(prev => prev.map(p => {
      if (p.name === selectedPetugas.name) {
        const nextRoles = { ...(p.projectRoles || {}), [selectedProject]: newRole };
        return { ...p, projectRoles: nextRoles };
      }
      return p;
    }));
    setSelectedPetugas(prev => {
      const nextRoles = { ...(prev.projectRoles || {}), [selectedProject]: newRole };
      return { ...prev, projectRoles: nextRoles };
    });
  };

  const handleAssignmentChange = (type, value) => {
    setPetugas(prev => prev.map(p => {
      if (p.name === selectedPetugas.name) {
        const currentAssignments = p.assignments || {};
        const projectAssignment = currentAssignments[selectedProject] || { sls: [], pengawas: "" };
        
        let nextAssignment = { ...projectAssignment };
        if (type === "sls") {
          const isChecked = projectAssignment.sls?.includes(value);
          nextAssignment.sls = isChecked 
            ? projectAssignment.sls.filter(s => s !== value)
            : [...(projectAssignment.sls || []), value];
        } else if (type === "pengawas") {
          nextAssignment.pengawas = value;
        }
        
        return {
          ...p,
          assignments: {
            ...currentAssignments,
            [selectedProject]: nextAssignment
          }
        };
      }
      return p;
    }));
    
    setSelectedPetugas(prev => {
      const currentAssignments = prev.assignments || {};
      const projectAssignment = currentAssignments[selectedProject] || { sls: [], pengawas: "" };
      
      let nextAssignment = { ...projectAssignment };
      if (type === "sls") {
        const isChecked = projectAssignment.sls?.includes(value);
        nextAssignment.sls = isChecked 
          ? projectAssignment.sls.filter(s => s !== value)
          : [...(projectAssignment.sls || []), value];
      } else if (type === "pengawas") {
        nextAssignment.pengawas = value;
      }
      
      return {
        ...prev,
        assignments: {
          ...currentAssignments,
          [selectedProject]: nextAssignment
        }
      };
    });
  };

  // Count helper untuk badges status di tab
  const getTabCount = (statusId) => {
    if (statusId === "all") return filteredByVillage.length;
    if (statusId === "active") return filteredByVillage.filter(p => p.status === "active" || p.status === "warning").length;
    return filteredByVillage.filter(p => p.status === statusId).length;
  };

  return (
    <AdminLayout tab={isGlobal ? "admin-master-petugas" : "admin-users"} onNavigate={onNavigate} selectedProject={selectedProject} onProjectChange={onProjectChange} activities={activities}>
      <style>{`
        .kegiatan-scroll-container {
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding-bottom: 4px;
          transition: all 0.2s ease-in-out;
        }
        .kegiatan-scroll-container::-webkit-scrollbar {
          height: 3px;
          background: transparent;
          display: none;
        }
        .kegiatan-scroll-container:hover {
          scrollbar-width: thin;
        }
        .kegiatan-scroll-container:hover::-webkit-scrollbar {
          display: block;
          height: 3px;
        }
        .kegiatan-scroll-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 9999px;
        }
        .kegiatan-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
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
        .scrollbar-thin {
          scrollbar-width: thin;
        }

        /* ─── Custom Modal Animations ─── */
        @keyframes customFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes springZoomIn {
          0% { opacity: 0; transform: scale(0.92) translateY(8px); }
          50% { transform: scale(1.01) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes slideInFromRight {
          from { transform: translateX(16px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInFromLeft {
          from { transform: translateX(-16px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-custom-fade {
          animation: customFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .animate-spring-zoom {
          animation: springZoomIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .animate-slide-right {
          animation: slideInFromRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .animate-slide-left {
          animation: slideInFromLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* ─── Sidebar Slide-in & Resize Animations ─── */
        @keyframes slideInSidebarDesktop {
          from { transform: translateX(32px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInSidebarMobile {
          from { transform: translateY(32px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-sidebar-enter {
          animation: slideInSidebarMobile 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @media (min-width: 1024px) {
          .animate-sidebar-enter {
            animation: slideInSidebarDesktop 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
          }
        }
        .transition-width {
          transition: max-width 0.4s cubic-bezier(0.16, 1, 0.3, 1), width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
      <div className="p-6 lg:p-8 w-full slide-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {isGlobal ? "Master Database Petugas" : `Petugas Lapangan`}
              </h1>
              {!isGlobal && selectedProject && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-xl text-[10px] font-bold ${statusConfig.text} ${statusConfig.bg} border-slate-100/50 shadow-sm`}>
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusConfig.pulse}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${statusConfig.dot}`}></span>
                  </span>
                  <span className="uppercase tracking-wider font-bold">{statusConfig.label}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-medium text-slate-400">
                {isGlobal ? "Daftar Seluruh Petugas BPS" : `Daftar Petugas BPS aktif untuk kegiatan ${selectedProject}`}
              </span>
              {!isGlobal && (
                <>
                  <span className="text-slate-200">·</span>
                  <div className="relative">
                    <button 
                      onClick={villageDropdown.toggle}
                      className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-all cursor-pointer bg-blue-50 px-3 py-1.5 rounded-lg border-0"
                    >
                      {villageDropdown.selected} <ChevronDown size={12} className={`transition-transform duration-200 ${villageDropdown.isOpen ? 'rotate-180' : ''}`}/>
                    </button>
                    
                    {villageDropdown.isOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={villageDropdown.close}/>
                        <div className="absolute left-0 top-full mt-1.5 bg-white rounded-xl shadow-lg z-20 py-1 border border-slate-100 w-56" style={{ animation: 'scaleIn 0.15s ease' }}>
                          {villages.map(v => (
                            <button
                              key={v}
                              onClick={() => villageDropdown.select(v)}
                              className={`w-full px-4 py-2.5 text-left text-xs border-0 cursor-pointer transition-all ${
                                villageDropdown.selected === v ? 'bg-blue-50 text-blue-600 font-semibold' : 'bg-white text-slate-500 hover:bg-slate-50 font-medium'
                              }`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium bg-white border border-slate-200 hover:border-blue-200 hover:text-blue-600 rounded-xl text-slate-500 cursor-pointer transition-all"
            >
              <RefreshCw size={14} className={`${isRefreshing ? 'animate-spin' : ''}`}/> Refresh
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-blue-600 text-white rounded-xl border-0 cursor-pointer hover:bg-blue-700 transition-all active:scale-[0.98]"
            >
              <UserPlus size={14}/> Tambah Petugas
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {/* Card 1: Total Petugas */}
          <div className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50">
              <Users size={18} className="text-blue-600"/>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Petugas</p>
              <p className="mono text-xl font-bold text-slate-900">{totalPetugas}</p>
            </div>
          </div>

          {isGlobal ? (
            <>
              {/* Card 2: Petugas Aktif (Global) */}
              <div className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-50">
                  <Clock size={18} className="text-emerald-600"/>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Petugas Aktif</p>
                  <p className="mono text-xl font-bold text-emerald-600">{globalAktifCount}</p>
                </div>
              </div>

              {/* Card 3: Petugas Tidak Aktif (Global) */}
              <div className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100">
                  <Clock size={18} className="text-slate-400"/>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Petugas Tidak Aktif</p>
                  <p className="mono text-xl font-bold text-slate-500">{globalTidakAktifCount}</p>
                </div>
              </div>

              {/* Card 4: Jumlah Kegiatan (Global) */}
              <div className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50">
                  <Briefcase size={18} className="text-purple-600"/>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Jumlah Kegiatan</p>
                  <p className="mono text-xl font-bold text-purple-600">{allProjects.length}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Card 2: Petugas Progres (Local) */}
              <div className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50">
                  <Clock size={18} className="text-blue-600"/>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Petugas Progres</p>
                  <p className="mono text-xl font-bold text-blue-600">{progresCount}</p>
                </div>
              </div>

              {/* Card 3: Jumlah Kegiatan (Local) */}
              <div className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50">
                  <Briefcase size={18} className="text-purple-600"/>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Jumlah Kegiatan</p>
                  <p className="mono text-xl font-bold text-purple-600">{allProjects.length}</p>
                </div>
              </div>

              {/* Card 4: Jumlah Desa (Local) */}
              <div className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50">
                  <MapPin size={18} className="text-amber-600"/>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Jumlah Desa</p>
                  <p className="mono text-xl font-bold text-amber-600">{getDesaData().length}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Search & Tabs Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
          {/* Kegiatan Dropdown or Status Tabs Filter */}
          {isGlobal ? (
            <div className="relative">
              <button 
                onClick={projectFilterDropdown.toggle}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white shadow-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap"
              >
                <span>Kegiatan: <span className="text-blue-600 font-bold ml-1">{projectFilterDropdown.selected}</span></span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${projectFilterDropdown.isOpen ? 'rotate-180' : ''}`}/>
              </button>
              
              {projectFilterDropdown.isOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={projectFilterDropdown.close}/>
                  <div className="absolute left-0 top-full mt-1.5 bg-white rounded-xl shadow-lg z-20 py-1 border border-slate-100 w-64" style={{ animation: 'scaleIn 0.15s ease' }}>
                    {availableProjects.map(proj => (
                      <button
                        key={proj}
                        onClick={() => projectFilterDropdown.select(proj)}
                        className={`w-full px-4 py-2.5 text-left text-xs border-0 cursor-pointer transition-all flex items-center justify-between ${
                          projectFilterDropdown.selected === proj ? 'bg-blue-50/50 text-blue-600 font-semibold' : 'bg-white text-slate-500 hover:bg-slate-50 font-medium'
                        }`}
                      >
                        <span>{proj}</span>
                        {projectFilterDropdown.selected === proj && <Check size={12} className="text-blue-600"/>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", l: "Semua" },
                { id: "active", l: "Progres" },
                { id: "done", l: "Selesai" },
              ].map(t => (
                <button 
                  key={t.id} 
                  onClick={() => setFilter(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border-0 cursor-pointer transition-all ${
                    filter === t.id ? "text-white bg-blue-600" : "bg-white border border-slate-100 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {t.l}
                  <span className={`mono text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    filter === t.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
                  }`}>
                    {getTabCount(t.id)}
                  </span>
                </button>
              ))}
            </div>
          )}
          
          {/* Search bar & Column Config */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Column Visibility Dropdown Button */}
            <div className="relative">
              <button 
                onClick={colDropdown.toggle}
                className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer text-slate-600 hover:text-slate-800 text-xs font-semibold"
                title="Tampilkan/Sembunyikan Kolom"
              >
                <SlidersHorizontal size={14} className="text-slate-400"/>
                <span>Kolom</span>
                <ChevronDown size={12} className={`text-slate-400 transition-transform duration-200 ${colDropdown.isOpen ? 'rotate-180' : ''}`}/>
              </button>
              
              {colDropdown.isOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={colDropdown.close}/>
                  <div className="absolute right-0 top-full mt-1.5 bg-white rounded-xl shadow-lg z-20 py-2 border border-slate-100 w-52" style={{ animation: 'scaleIn 0.15s ease' }}>
                    <p className="px-4 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 mb-1">Tampilkan Kolom</p>
                    {isGlobal ? (
                      ["Nama", "Username", "ID", "Asal Desa", "Nomor Telepon", "Kegiatan", "Status", "Aksi"].map(col => {
                        const isVisible = visibleColsGlobal.includes(col);
                        const isPrimary = col === "Nama" || col === "Aksi";
                        return (
                          <button
                            key={col}
                            onClick={() => !isPrimary && toggleColGlobal(col)}
                            disabled={isPrimary}
                            className={`w-full px-4 py-2 text-left text-xs border-0 transition-all flex items-center gap-2.5 font-medium ${
                              isPrimary ? 'opacity-50 cursor-not-allowed text-slate-400' : 'cursor-pointer text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <input 
                              type="checkbox" 
                              checked={isVisible} 
                              readOnly 
                              disabled={isPrimary}
                              className="rounded text-blue-600 focus:ring-blue-500/20 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>{col}</span>
                          </button>
                        );
                      })
                    ) : (
                      ["Nama", "Wilayah Tugas", "Progress Pencacahan", "Sync Terakhir", "Status", "Aksi"].map(col => {
                        const isVisible = visibleColsLocal.includes(col);
                        const isPrimary = col === "Nama" || col === "Aksi";
                        return (
                          <button
                            key={col}
                            onClick={() => !isPrimary && toggleColLocal(col)}
                            disabled={isPrimary}
                            className={`w-full px-4 py-2 text-left text-xs border-0 transition-all flex items-center gap-2.5 font-medium ${
                              isPrimary ? 'opacity-50 cursor-not-allowed text-slate-400' : 'cursor-pointer text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <input 
                              type="checkbox" 
                              checked={isVisible} 
                              readOnly 
                              disabled={isPrimary}
                              className="rounded text-blue-600 focus:ring-blue-500/20 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>{col}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Search input field */}
            <div className="flex-1 md:w-72 flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
              <Search size={16} className="text-slate-400"/>
              <input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="text-sm outline-none text-slate-700 placeholder-slate-400 w-full bg-transparent font-medium" 
                placeholder="Cari petugas..."
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="bg-transparent border-0 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={14}/>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Layout Flex */}
        <div className="flex flex-col lg:flex-row gap-6 w-full items-start">
          {/* Left / Main Table */}
          <div className={`transition-width w-full ${selectedPetugas ? "lg:max-w-[calc(100%-384px)]" : "lg:max-w-full"}`}>
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-0 min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50/50">
                      {isGlobal 
                        ? ["Nama", "Username", "ID", "Asal Desa", "Nomor Telepon", "Kegiatan", "Status", "Aksi"]
                            .filter(h => visibleColsGlobal.includes(h))
                            .map(h => (
                              <th 
                                key={h} 
                                className="px-6 py-3.5 text-left text-[11px] text-slate-400 font-semibold tracking-wider uppercase group"
                              >
                                <div className="flex items-center gap-1.5">
                                  <button 
                                    onClick={() => h !== "Aksi" && handleSort(h)}
                                    className={`hover:text-blue-600 transition-colors flex items-center gap-1 font-semibold uppercase bg-transparent border-0 cursor-pointer text-[11px] text-slate-400 ${h !== "Aksi" ? 'cursor-pointer' : 'cursor-default'}`}
                                  >
                                    <span>{h}</span>
                                    {h !== "Aksi" && (
                                      sortField === h ? (
                                        <ChevronDown size={11} className={`text-blue-600 transition-transform ${sortDirection === "desc" ? "rotate-180" : ""}`}/>
                                      ) : (
                                        <ArrowUpDown size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400"/>
                                      )
                                    )}
                                  </button>
                                  {h !== "Nama" && h !== "Aksi" && (
                                    <button 
                                      onClick={() => toggleColGlobal(h)}
                                      className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity bg-transparent border-0 cursor-pointer text-slate-400"
                                      title={`Sembunyikan kolom ${h}`}
                                    >
                                      <EyeOff size={11}/>
                                    </button>
                                  )}
                                </div>
                              </th>
                            ))
                        : ["Nama", "Wilayah Tugas", "Progress Pencacahan", "Sync Terakhir", "Status", "Aksi"]
                            .filter(h => visibleColsLocal.includes(h))
                            .map(h => (
                              <th 
                                key={h} 
                                className="px-6 py-3.5 text-left text-[11px] text-slate-400 font-semibold tracking-wider uppercase group"
                              >
                                <div className="flex items-center gap-1.5">
                                  <button 
                                    onClick={() => h !== "Aksi" && handleSort(h)}
                                    className={`hover:text-blue-600 transition-colors flex items-center gap-1 font-semibold uppercase bg-transparent border-0 cursor-pointer text-[11px] text-slate-400 ${h !== "Aksi" ? 'cursor-pointer' : 'cursor-default'}`}
                                  >
                                    <span>{h}</span>
                                    {h !== "Aksi" && (
                                      sortField === h ? (
                                        <ChevronDown size={11} className={`text-blue-600 transition-transform ${sortDirection === "desc" ? "rotate-180" : ""}`}/>
                                      ) : (
                                        <ArrowUpDown size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400"/>
                                      )
                                    )}
                                  </button>
                                  {h !== "Nama" && h !== "Aksi" && (
                                    <button 
                                      onClick={() => toggleColLocal(h)}
                                      className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity bg-transparent border-0 cursor-pointer text-slate-400"
                                      title={`Sembunyikan kolom ${h}`}
                                    >
                                      <EyeOff size={11}/>
                                    </button>
                                  )}
                                </div>
                              </th>
                            ))
                      }
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSearched.map((p, idx) => {
                      const pct = p.target > 0 ? Math.round((p.selesai / p.target) * 100) : 0;
                      const isSelected = selectedPetugas?.name === p.name;
                      const isPetugasAktifGlobal = p.projects && p.projects.some(proj => activeProjectNames.includes(proj));
                      return (
                        <tr 
                          key={p.name} 
                          className={`hover:bg-slate-50/50 transition-colors ${
                            isSelected ? "bg-blue-50/20" : ""
                          }`}
                        >
                          {/* Nama Column */}
                          {((isGlobal && visibleColsGlobal.includes("Nama")) || (!isGlobal && visibleColsLocal.includes("Nama"))) && (
                            <td className="px-6 py-4 border-t border-slate-100 whitespace-nowrap">
                              <div className="flex items-center gap-3 whitespace-nowrap">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                                  {p.name.split(' ').map(n=>n[0]).join('')}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 whitespace-nowrap truncate max-w-[150px]">{p.name}</p>
                                  <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Petugas BPS</p>
                                </div>
                              </div>
                            </td>
                          )}

                          {isGlobal ? (
                            <>
                              {visibleColsGlobal.includes("Username") && (
                                <td className="px-6 py-4 border-t border-slate-100 mono text-xs text-slate-600 font-semibold whitespace-nowrap">
                                  @{p.username || p.name.toLowerCase().replace(/\s+/g, ".")}
                                </td>
                              )}
                              {visibleColsGlobal.includes("ID") && (
                                <td className="px-6 py-4 border-t border-slate-100 mono text-xs text-slate-500 whitespace-nowrap">
                                  {p.id || `32710${idx + 1}0${idx + 1}`}
                                </td>
                              )}
                              {visibleColsGlobal.includes("Asal Desa") && (
                                <td className="px-6 py-4 border-t border-slate-100 whitespace-nowrap">
                                  <div className="flex items-center gap-1 text-slate-600 text-xs font-semibold whitespace-nowrap">
                                    <MapPin size={12} className="text-slate-400" />
                                    <span>{p.asalDesa || `Desa ${p.desa}`}</span>
                                  </div>
                                </td>
                              )}
                              {visibleColsGlobal.includes("Nomor Telepon") && (
                                <td className="px-6 py-4 border-t border-slate-100 mono text-xs text-slate-600 font-semibold whitespace-nowrap">
                                  {p.phone || "0812-7890-1234"}
                                </td>
                              )}
                              {visibleColsGlobal.includes("Kegiatan") && (
                                <td className="px-6 py-4 border-t border-slate-100 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5 max-w-[200px] whitespace-nowrap kegiatan-scroll-container" style={{ display: 'flex', flexWrap: 'nowrap' }}>
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
                              )}
                              {visibleColsGlobal.includes("Status") && (
                                <td className="px-6 py-4 border-t border-slate-100 whitespace-nowrap">
                                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap ${
                                    isPetugasAktifGlobal ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-500"
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                      isPetugasAktifGlobal ? "bg-blue-500" : "bg-slate-400"
                                    }`} />
                                    {isPetugasAktifGlobal ? "Aktif" : "Tidak Aktif"}
                                  </span>
                                </td>
                              )}
                            </>
                          ) : (
                            <>
                              {visibleColsLocal.includes("Wilayah Tugas") && (
                                <td className="px-6 py-4 border-t border-slate-100 whitespace-nowrap">
                                  <div className="flex items-center gap-1 text-slate-600 text-xs whitespace-nowrap">
                                    <MapPin size={12} className="text-slate-400" />
                                    <span className="font-medium">Desa {p.desa}</span>
                                  </div>
                                </td>
                              )}
                              {visibleColsLocal.includes("Progress Pencacahan") && (
                                <td className="px-6 py-4 border-t border-slate-100 whitespace-nowrap">
                                  <div className="flex items-center gap-3 whitespace-nowrap">
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[120px] flex-shrink-0">
                                      <div 
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          p.status === 'done' ? 'bg-emerald-500' : 'bg-blue-600'
                                        }`} 
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <span className="mono text-xs text-slate-600 font-bold whitespace-nowrap">{p.selesai}/{p.target}</span>
                                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">({pct}%)</span>
                                  </div>
                                </td>
                              )}
                              {visibleColsLocal.includes("Sync Terakhir") && (
                                <td className="px-6 py-4 border-t border-slate-100 mono text-xs text-slate-500 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                                    <Smartphone size={12} className="text-slate-400"/>
                                    <span>{p.sync}</span>
                                  </div>
                                </td>
                              )}
                              {visibleColsLocal.includes("Status") && (
                                <td className="px-6 py-4 border-t border-slate-100 whitespace-nowrap">
                                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap ${
                                    p.status === "done" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                      p.status === "done" ? "bg-emerald-500" : "bg-blue-500"
                                    }`} />
                                    {p.status === "done" ? "Selesai" : "Progres"}
                                  </span>
                                </td>
                              )}
                            </>
                          )}

                          {/* Aksi Column */}
                          {((isGlobal && visibleColsGlobal.includes("Aksi")) || (!isGlobal && visibleColsLocal.includes("Aksi"))) && (
                            <td className="px-6 py-4 border-t border-slate-100 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => setSelectedPetugas(isSelected ? null : p)}
                                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center border-0 cursor-pointer text-slate-400 hover:text-slate-600 transition-all bg-transparent"
                                  title="Lihat Detail"
                                >
                                  <Eye size={15}/>
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {filteredAndSearched.length === 0 && (
                      <tr>
                        <td colSpan={isGlobal ? visibleColsGlobal.length : visibleColsLocal.length} className="px-6 py-16 text-center">
                          <Users size={24} className="text-slate-200 mx-auto mb-2"/>
                          <p className="text-xs text-slate-400 font-semibold">Petugas tidak ditemukan</p>
                          <p className="text-[11px] text-slate-300 mt-0.5">Coba gunakan kata kunci pencarian atau filter yang lain</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Detail Sidebar */}
          {selectedPetugas && (
            <div className="w-full lg:w-[360px] flex-shrink-0 sticky top-6 self-start animate-sidebar-enter">
              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                {/* Panel Header */}
                <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Award size={14} className="text-blue-600"/>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Detail Petugas</span>
                  </div>
                  <button 
                    onClick={() => setSelectedPetugas(null)}
                    className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center border-0 cursor-pointer text-slate-400 hover:text-slate-600 bg-transparent transition-all"
                  >
                    <X size={14}/>
                  </button>
                </div>

                {/* Panel Content */}
                <div className="p-6">
                  {/* Profil Avatar Card */}
                  <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 text-xl font-bold flex items-center justify-center shadow-inner mb-3">
                      {selectedPetugas.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <h4 className="text-md font-bold text-slate-800">{selectedPetugas.name}</h4>
                    <p className="text-xs text-slate-400 font-medium">Petugas Badan Pusat Statistik</p>
                    
                    {/* Status Badge */}
                    {isGlobal ? (() => {
                      const isPetugasAktifGlobal = selectedPetugas.projects && selectedPetugas.projects.some(proj => activeProjectNames.includes(proj));
                      return (
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full mt-2.5 inline-flex items-center gap-1.5 ${
                          isPetugasAktifGlobal ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-500"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isPetugasAktifGlobal ? "bg-blue-500" : "bg-slate-400"
                          }`} />
                          {isPetugasAktifGlobal ? "Aktif" : "Tidak Aktif"}
                        </span>
                      );
                    })() : (
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full mt-2.5 inline-flex items-center gap-1.5 ${
                        selectedPetugas.status === "done" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          selectedPetugas.status === "done" ? "bg-emerald-500" : "bg-blue-500"
                        }`} />
                        {selectedPetugas.status === "done" ? "Selesai" : "Progres"}
                      </span>
                    )}
                  </div>

                  {/* Rincian Petugas (Clean List) */}
                  <div className="py-6 space-y-4 border-b border-slate-100">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                        <User size={15}/>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">USERNAME</p>
                        <p className="text-xs font-semibold text-slate-700 mt-0.5">@{selectedPetugas.username || selectedPetugas.name.toLowerCase().replace(/\s+/g, ".")}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                        <Award size={15}/>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">ID PETUGAS</p>
                        <p className="text-xs font-semibold text-slate-700 mt-0.5">{selectedPetugas.id}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                        <Fingerprint size={15}/>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">NIK</p>
                        <p className="text-xs font-semibold text-slate-700 mt-0.5">{selectedPetugas.nik}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                        <MapPin size={15}/>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">ASAL DESA</p>
                        <p className="text-xs font-semibold text-slate-700 mt-0.5">{selectedPetugas.asalDesa || `Desa ${selectedPetugas.desa}`}</p>
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-3 w-full">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                          <Phone size={15}/>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">NOMOR TELEPON</p>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5">{selectedPetugas.phone}</p>
                        </div>
                      </div>
                      <a 
                        href={`https://wa.me/${selectedPetugas.phone.replace(/[^0-9]/g, "").replace(/^0/, "62")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl cursor-pointer transition-all border-0 decoration-none self-center"
                        title="Hubungi via WhatsApp"
                      >
                        <Send size={11} className="stroke-[3px]" /> WhatsApp
                      </a>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                        <Briefcase size={15}/>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">KEGIATAN</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {selectedPetugas.projects && selectedPetugas.projects.map(proj => {
                            const role = selectedPetugas.projectRoles?.[proj] || "PCL";
                            const badgeStyle = role === "PML" 
                              ? "bg-purple-50 text-purple-600 hover:bg-purple-100 hover:text-purple-700" 
                              : "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700";
                            return (
                              <button 
                                key={proj}
                                onClick={() => alert(`Deskripsi untuk kegiatan "${proj}" sedang dalam pengembangan.`)}
                                className={`text-[9px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer border-0 inline-block whitespace-nowrap ${badgeStyle}`}
                                title={`Lihat deskripsi kegiatan ${proj}`}
                              >
                                {proj} ({role})
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {!isGlobal && (
                      <div className="border-t border-slate-100 pt-4 mt-4 space-y-4">
                        <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Konfigurasi Penugasan ({selectedProject})</p>
                        
                        {/* Peran Petugas */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Peran Petugas</label>
                          <select
                            value={selectedPetugas.projectRoles?.[selectedProject] || "PCL"}
                            onChange={e => handleRoleChange(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white text-slate-700 transition-all font-semibold cursor-pointer"
                          >
                            <option value="PCL">PCL (Pendata)</option>
                            <option value="PML">PML (Pengawas/Pemeriksa)</option>
                          </select>
                        </div>

                        {/* Pengawas PML Dropdown (Hanya jika peran adalah PCL) */}
                        {(selectedPetugas.projectRoles?.[selectedProject] || "PCL") === "PCL" && (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Pengawas (PML)</label>
                            <select
                              value={selectedPetugas.assignments?.[selectedProject]?.pengawas || ""}
                              onChange={e => handleAssignmentChange("pengawas", e.target.value)}
                              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white text-slate-700 transition-all font-semibold cursor-pointer"
                            >
                              <option value="">-- Pilih Pengawas --</option>
                              {petugas
                                .filter(p => p.projects?.includes(selectedProject) && p.projectRoles?.[selectedProject] === "PML" && p.name !== selectedPetugas.name)
                                .map(p => (
                                  <option key={p.name} value={p.name}>{p.name}</option>
                                ))
                              }
                            </select>
                          </div>
                        )}

                        {/* Wilayah Tugas SLS/Sub-SLS */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Wilayah Tugas (SLS / Sub-SLS)</label>
                          {(() => {
                            const lokus = activeActivity?.lokus || { kecamatan: [], desa: [], sls: [], subSls: [] };
                            const selectedSls = lokus.sls || [];
                            const selectedSubSls = lokus.subSls || [];
                            
                            if (selectedSls.length === 0) {
                              return <p className="text-xs text-slate-400 italic">Belum ada wilayah tugas (Lokus) yang dipilih pada kegiatan ini.</p>;
                            }

                            return (
                              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 border border-slate-100 rounded-lg p-2.5 bg-slate-50/50 scrollbar-thin">
                                {selectedSls.map(slsName => {
                                  const isSlsChecked = selectedPetugas.assignments?.[selectedProject]?.sls?.includes(slsName);
                                  // Find subSls that belong to this sls and are also in activeActivity lokus
                                  const subSlsList = MOCK_SUB_SLS_HIERARCHY.filter(sub => sub.sls === slsName && selectedSubSls.includes(sub.name));

                                  return (
                                    <div key={slsName} className="space-y-1.5">
                                      <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                                        <input 
                                          type="checkbox"
                                          checked={!!isSlsChecked}
                                          onChange={() => handleAssignmentChange("sls", slsName)}
                                          className="rounded text-blue-600 focus:ring-blue-500/20 w-3.5 h-3.5 cursor-pointer"
                                        />
                                        <span>{slsName}</span>
                                      </label>
                                      
                                      {subSlsList.length > 0 && (
                                        <div className="pl-5 space-y-1 border-l border-slate-200/60 ml-1.5">
                                          {subSlsList.map(sub => {
                                            const isSubChecked = selectedPetugas.assignments?.[selectedProject]?.sls?.includes(sub.name);
                                            return (
                                              <label key={sub.name} className="flex items-center gap-2 text-[11px] text-slate-500 font-medium cursor-pointer">
                                                <input 
                                                  type="checkbox"
                                                  checked={!!isSubChecked}
                                                  onChange={() => handleAssignmentChange("sls", sub.name)}
                                                  className="rounded text-blue-600 focus:ring-blue-500/20 w-3 h-3 cursor-pointer"
                                                />
                                                <span>{sub.name}</span>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-4">
                    <button 
                      onClick={handleOpenAssignModal}
                      className="w-full flex items-center justify-center gap-2 py-3 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl border-0 cursor-pointer transition-all"
                    >
                      <Plus size={13}/> Assign Petugas
                    </button>
                    
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 text-xs font-semibold text-red-500 bg-transparent hover:bg-red-50 rounded-xl border-0 cursor-pointer transition-all mt-1"
                    >
                      <Trash2 size={13}/> Hapus Petugas dari Tim
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Petugas Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          style={{ animation: 'fadeIn 0.25s ease' }}
          onClick={() => setShowAddModal(false)}
        >
          <div className="bg-white rounded-2xl p-8 w-full shadow-lg"
            style={{ maxWidth: 460, animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}
            onClick={e => e.stopPropagation()}
          >
            
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-blue-50">
              <UserPlus size={24} className="text-blue-600"/>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-1">
              Tambah Petugas Baru
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Daftarkan petugas BPS baru.
            </p>

            <form onSubmit={handleOpenAddConfirm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Nama Lengkap</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required
                  placeholder="Contoh: Andi Wijaya" 
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-700 placeholder:text-slate-300 transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">NIK</label>
                  <input 
                    type="text" 
                    value={nikInput} 
                    onChange={e => setNikInput(e.target.value)} 
                    required
                    maxLength={16}
                    placeholder="16 digit NIK" 
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-700 placeholder:text-slate-300 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">No. Telp (WhatsApp)</label>
                  <input 
                    type="text" 
                    value={phoneInput} 
                    onChange={e => setPhoneInput(e.target.value)} 
                    required
                    placeholder="Contoh: 0812-3456-7890" 
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-700 placeholder:text-slate-300 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Username</label>
                  <input 
                    type="text" 
                    value={usernameInput} 
                    onChange={e => setUsernameInput(e.target.value)} 
                    required
                    placeholder="Contoh: andi.wijaya" 
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-700 placeholder:text-slate-300 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Asal Desa</label>
                  <select 
                    value={assignedDesa} 
                    onChange={e => setAssignedDesa(e.target.value)}
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white text-slate-700 transition-all font-medium cursor-pointer"
                  >
                    {getDesaData().map(d => {
                       const simpleName = d.name.replace("Desa ", "");
                       return (
                         <option key={simpleName} value={simpleName}>
                           {simpleName}
                         </option>
                       );
                    })}
                  </select>
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
                  Daftarkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Petugas Modal */}
      {showAssignModal && selectedPetugas && (
        <div className="fixed inset-0 bg-slate-900/35 backdrop-blur-[4px] flex items-center justify-center z-50 p-6 animate-custom-fade"
          onClick={() => setShowAssignModal(false)}
        >
          <div className="bg-white rounded-2xl p-8 w-full shadow-xl animate-spring-zoom"
            style={{ maxWidth: 460 }}
            onClick={e => e.stopPropagation()}
          >
            {!isConfirmingAssign ? (
              <div key="select-step" className="animate-slide-left">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 bg-blue-50 text-blue-600">
                  <Briefcase size={22} />
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  Assign Kegiatan Petugas
                </h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Tentukan kegiatan survei atau pendataan BPS yang ditugaskan kepada <strong>{selectedPetugas.name}</strong>.
                </p>

                {/* Fitur Search Kegiatan */}
                <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-100 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/10 transition-all mb-4">
                  <Search size={14} className="text-slate-400"/>
                  <input 
                    value={assignSearchQuery}
                    onChange={e => setAssignSearchQuery(e.target.value)}
                    className="text-xs outline-none text-slate-700 placeholder-slate-400 w-full bg-transparent font-semibold" 
                    placeholder="Cari kegiatan..."
                  />
                  {assignSearchQuery && (
                    <button type="button" onClick={() => setAssignSearchQuery("")} className="bg-transparent border-0 text-slate-400 hover:text-slate-600 cursor-pointer">
                      <X size={12}/>
                    </button>
                  )}
                </div>

                {/* List Kegiatan (Max 4 teratas, sisanya scroll) */}
                <div className="space-y-2 mb-6 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                  {allProjects
                    .filter(proj => proj.toLowerCase().includes(assignSearchQuery.toLowerCase()))
                    .map(proj => {
                      const isAssigned = tempProjects.includes(proj);
                      return (
                        <button
                          key={proj}
                          type="button"
                          onClick={() => handleToggleProject(proj)}
                          className={`w-full px-4 py-3 rounded-xl border text-left text-xs font-semibold cursor-pointer transition-all flex items-center justify-between ${
                            isAssigned 
                              ? 'border-blue-200 bg-blue-50/40 text-blue-700' 
                              : 'border-slate-100 bg-slate-50/50 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <span>{proj}</span>
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${
                            isAssigned ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white'
                          }`}>
                            {isAssigned && <Check size={12} strokeWidth={3}/>}
                          </div>
                        </button>
                      );
                    })}
                  {allProjects.filter(proj => proj.toLowerCase().includes(assignSearchQuery.toLowerCase())).length === 0 && (
                    <div className="py-8 text-center text-slate-400 text-xs font-medium">
                      Kegiatan tidak ditemukan
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-500 cursor-pointer transition-all border-0"
                  >
                    Batal
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsConfirmingAssign(true)}
                    className="flex-1 py-3 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 border-0 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    Konfirmasi
                  </button>
                </div>
              </div>
            ) : (
              <div key="confirm-step" className="animate-slide-right">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 bg-amber-50 text-amber-600">
                  <AlertTriangle size={22} />
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  Apakah Anda Yakin?
                </h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Anda akan mengubah daftar penugasan kegiatan untuk petugas <strong>{selectedPetugas.name}</strong> menjadi:
                </p>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6">
                  {tempProjects.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {tempProjects.map(proj => (
                        <span key={proj} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                          {proj}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium italic">Tidak ada kegiatan (petugas akan dibebastugaskan)</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsConfirmingAssign(false)}
                    className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-500 cursor-pointer transition-all border-0"
                  >
                    Kembali
                  </button>
                  <button 
                    type="button"
                    onClick={handleConfirmAssignment}
                    className="flex-1 py-3 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 border-0 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    Ya, Konfirmasi
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedPetugas && (
        <div className="fixed inset-0 bg-slate-900/35 backdrop-blur-[4px] flex items-center justify-center z-50 p-6 animate-custom-fade"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div className="bg-white rounded-2xl p-8 w-full shadow-xl animate-spring-zoom"
            style={{ maxWidth: 400 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 bg-red-50 text-red-600">
              <AlertTriangle size={22} />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Apakah Anda yakin?
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Anda yakin ingin menghapus petugas <strong>{selectedPetugas.name}</strong> dari tim ini?
            </p>

            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-500 cursor-pointer transition-all border-0"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={() => {
                  handleDeletePetugas(selectedPetugas.name);
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 py-3 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 border-0 cursor-pointer transition-all active:scale-[0.98]"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Officer Confirmation Modal */}
      {showAddConfirm && (
        <div className="fixed inset-0 bg-slate-900/35 backdrop-blur-[4px] flex items-center justify-center z-[60] p-6 animate-custom-fade"
          onClick={() => setShowAddConfirm(false)}
        >
          <div className="bg-white rounded-2xl p-8 w-full shadow-xl animate-spring-zoom"
            style={{ maxWidth: 400 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 bg-blue-50 text-blue-600">
              <AlertTriangle size={22} />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Apakah Anda yakin?
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Anda akan mendaftarkan petugas BPS baru dengan data berikut:
            </p>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6 space-y-2 text-xs text-slate-600">
              <p><strong>Nama:</strong> {name}</p>
              <p><strong>NIK:</strong> {nikInput || "-"}</p>
              <p><strong>No. Telp (WhatsApp):</strong> {phoneInput || "-"}</p>
              <p><strong>Username:</strong> @{usernameInput || name.toLowerCase().replace(/\s+/g, ".")}</p>
              <p><strong>Asal Desa:</strong> Desa {assignedDesa}</p>
            </div>

            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setShowAddConfirm(false)}
                className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-500 cursor-pointer transition-all border-0"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={handleAddPetugas}
                className="flex-1 py-3 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 border-0 cursor-pointer transition-all active:scale-[0.98]"
              >
                Ya, Daftarkan
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminPetugas;
