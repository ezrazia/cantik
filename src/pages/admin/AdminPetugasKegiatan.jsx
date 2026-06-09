import { useState, useEffect } from "react";
import AdminLayout from "../../components/layouts/AdminLayout";
import { api } from "../../services/api";
import useDropdown from "../../hooks/useDropdown";
import { 
  Search, Plus, UserPlus, Users, CheckCircle, Clock, AlertTriangle, 
  RefreshCw, ChevronDown, Check, X, Edit, Trash2, Smartphone, 
  MapPin, Target, Send, Eye, Award, EyeOff, ArrowUpDown, SlidersHorizontal,
  User, Fingerprint, Phone, Briefcase
} from "lucide-react";

/**
 * Halaman Manajemen Petugas Lapangan Admin — premium, modern, dan minimalis.
 * Memungkinkan pemantauan real-time aktivitas petugas, progress pencacahan, 
 * detail data per petugas, serta operasi CRUD sederhana.
 *
 * @param {Object} props
 * @param {(screen: string) => void} props.onNavigate
 * @returns {React.ReactElement}
 */
function AdminPetugasKegiatan({ onNavigate, selectedProject, onProjectChange, petugas, setPetugas, activities, refreshData }) {
  const isGlobal = false;
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
  const [assignedDesa, setAssignedDesa] = useState("Tideng Pale");
  const [target, setTarget] = useState(15);
  const [selesai, setSelesai] = useState(0);
  const [status, setStatus] = useState("active");

  const [dbDesa, setDbDesa] = useState([]);
  const [allWilayah, setAllWilayah] = useState([]);

  // States untuk Tambah Petugas (Assign Kegiatan) di view local (isGlobal === false)
  const [modalSearch, setModalSearch] = useState("");
  const [selectedModalOfficerIds, setSelectedModalOfficerIds] = useState([]); // Array of IDs
  const [modalOfficerRoles, setModalOfficerRoles] = useState({}); // { [id]: "PCL" | "PML" }

  // States untuk edit wilayah di detail sidebar & main table (isGlobal === false)
  const [selectedDesaCode, setSelectedDesaCode] = useState("");
  const [selectedSlsCode, setSelectedSlsCode] = useState("");
  const [selectedSubSlsCode, setSelectedSubSlsCode] = useState("");
  const [rowSelections, setRowSelections] = useState({}); // { [officerId]: { desa, sls, subSls } }

  useEffect(() => {
    const loadWilayah = async () => {
      try {
        const list = await api.wilayah.getAll();
        setAllWilayah(list);
        
        const uniqueDesas = Array.from(new Set(list.map(w => w.desa))).map(d => {
          const matched = list.find(w => w.desa === d);
          return { name: `Desa ${d}`, kecamatan: matched ? matched.kecamatan : "" };
        });
        setDbDesa(uniqueDesas);
        if (uniqueDesas.length > 0) {
          setAssignedDesa(uniqueDesas[0].name.replace("Desa ", ""));
        }
      } catch (err) {
        console.error("Gagal mengambil data wilayah:", err);
      }
    };
    loadWilayah();
  }, []);

  useEffect(() => {
    if (selectedPetugas && selectedProject && !isGlobal) {
      const assignedSlsList = selectedPetugas.assignments?.[selectedProject]?.sls || [];
      const assignedName = assignedSlsList[0] || "";
      
      if (assignedName) {
        const matchedSub = allWilayah.find(w => w.sub_sls === assignedName);
        if (matchedSub) {
          setSelectedDesaCode(matchedSub.desa);
          setSelectedSlsCode(matchedSub.sls);
          setSelectedSubSlsCode(matchedSub.sub_sls);
          return;
        }
        
        const matchedSls = allWilayah.find(w => w.sls === assignedName);
        if (matchedSls) {
          setSelectedDesaCode(matchedSls.desa);
          setSelectedSlsCode(matchedSls.sls);
          setSelectedSubSlsCode("");
          return;
        }
      }
      setSelectedDesaCode("");
      setSelectedSlsCode("");
      setSelectedSubSlsCode("");
    }
  }, [selectedPetugas, selectedProject, allWilayah, isGlobal]);

  useEffect(() => {
    setRowSelections({});
  }, [selectedProject]);

  useEffect(() => {
    if (!isGlobal && petugas && selectedProject && allWilayah.length > 0) {
      setRowSelections(prev => {
        const nextSelections = { ...prev };
        petugas.forEach(p => {
          const assignedSlsList = p.assignments?.[selectedProject]?.sls || [];
          const assignedName = assignedSlsList[0] || "";
          if (assignedName) {
            const matchedSub = allWilayah.find(w => w.sub_sls === assignedName);
            if (matchedSub) {
              nextSelections[p.id] = {
                desa: matchedSub.desa,
                sls: matchedSub.sls,
                subSls: matchedSub.sub_sls
              };
              return;
            }
            const matchedSls = allWilayah.find(w => w.sls === assignedName);
            if (matchedSls) {
              const hasSubSls = allWilayah.some(w => w.sls === assignedName && w.sub_sls);
              nextSelections[p.id] = {
                desa: matchedSls.desa,
                sls: matchedSls.sls,
                subSls: hasSubSls ? "" : "0"
              };
              return;
            }
          } else {
            if (!nextSelections[p.id]) {
              nextSelections[p.id] = {
                desa: "",
                sls: "",
                subSls: ""
              };
            }
          }
        });
        return nextSelections;
      });
    }
  }, [petugas, selectedProject, allWilayah, isGlobal]);

  const dbSubSlsHierarchy = allWilayah
    .filter(w => w.sub_sls)
    .map(w => ({ name: w.sub_sls, sls: w.sls }));

  const dbSlsHierarchy = allWilayah
    .filter(w => w.sls)
    .map(w => ({ name: w.sls, desa: w.desa }));

  // Dropdown for village filter (contextual view)
  const villageDropdown = useDropdown("Semua Desa");
  const villages = ["Semua Desa", ...dbDesa.map(d => d.name)];

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
  const [visibleColsLocal, setVisibleColsLocal] = useState(["Nama", "Petugas", "Lokus", "Progress Pencacahan", "Sync Terakhir", "Status", "Aksi"]);
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

  const unassignedOfficers = petugas.filter(p => !p.projects || !p.projects.includes(selectedProject));

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
  const handleAddPetugas = async () => {
    if (!name.trim()) return;

    const finalUsername = usernameInput.trim() || name.toLowerCase().replace(/\s+/g, ".");
    const finalNik = nikInput.trim() || null;
    const finalPhone = phoneInput.trim() || null;

    try {
      const payload = {
        username: finalUsername,
        name: name.trim(),
        nik: finalNik,
        phone: finalPhone,
        desa: assignedDesa,
        status: 'active'
      };
      
      const res = await api.petugas.create(payload);
      if (res && res.success) {
        // Jika tidak global, tugaskan langsung ke kegiatan terpilih
        if (!isGlobal && activeActivity) {
          await api.petugas.assign({
            petugas_id: res.petugasId,
            kegiatan_id: activeActivity.id,
            role: 'PCL',
            sls_assignments: [],
            pengawas: ''
          });
        }
        
        await refreshData();
        
        // Reset Form
        setName("");
        setNikInput("");
        setPhoneInput("");
        setUsernameInput("");
        if (dbDesa.length > 0) {
          setAssignedDesa(dbDesa[0].name.replace("Desa ", ""));
        }
        setShowAddModal(false);
        setShowAddConfirm(false);
      }
    } catch (err) {
      alert("Gagal menambahkan petugas: " + err.message);
    }
  };

  // Handler Hapus Petugas
  const handleDeletePetugas = async (nameToDelete) => {
    const targetPetugas = petugas.find(p => p.name === nameToDelete);
    if (!targetPetugas) return;
    
    try {
      if (isGlobal) {
        // Hapus permanen dari database master
        const res = await api.petugas.delete(targetPetugas.id);
        if (res && res.success) {
          await refreshData();
          if (selectedPetugas && selectedPetugas.id === targetPetugas.id) {
            setSelectedPetugas(null);
          }
        }
      } else {
        // Hanya keluarkan dari kegiatan aktif (unassign)
        const act = activities?.find(a => a.name === selectedProject);
        if (!act) return;
        const res = await api.petugas.unassign({
          petugas_id: targetPetugas.id,
          kegiatan_id: act.id
        });
        if (res && res.success) {
          await refreshData();
          if (selectedPetugas && selectedPetugas.id === targetPetugas.id) {
            setSelectedPetugas(null);
          }
        }
      }
    } catch (err) {
      alert(`Gagal ${isGlobal ? 'menghapus' : 'mengeluarkan'} petugas: ` + err.message);
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
  const handleConfirmAssignment = async () => {
    if (!selectedPetugas) return;
    
    try {
      const currentProjects = selectedPetugas.projects || [];
      
      const toAssign = tempProjects.filter(p => !currentProjects.includes(p));
      const toUnassign = currentProjects.filter(p => !tempProjects.includes(p));
      
      for (const projName of toAssign) {
        const act = activities.find(a => a.name === projName);
        if (act) {
          await api.petugas.assign({
            petugas_id: selectedPetugas.id,
            kegiatan_id: act.id,
            role: selectedPetugas.projectRoles?.[projName] || 'PCL',
            sls_assignments: selectedPetugas.assignments?.[projName]?.sls || [],
            pengawas: selectedPetugas.assignments?.[projName]?.pengawas || ''
          });
        }
      }
      
      for (const projName of toUnassign) {
        const act = activities.find(a => a.name === projName);
        if (act) {
          await api.petugas.unassign({
            petugas_id: selectedPetugas.id,
            kegiatan_id: act.id
          });
        }
      }
      
      await refreshData();
      
      // Update selectedPetugas state locally to reflect the changes
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
    } catch (err) {
      alert("Gagal memperbarui penugasan kegiatan: " + err.message);
    }
  };

  const handleRoleChange = async (newRole) => {
    if (!selectedPetugas || !activeActivity) return;
    
    try {
      const currentAss = selectedPetugas.assignments?.[selectedProject] || {};
      const payload = {
        petugas_id: selectedPetugas.id,
        kegiatan_id: activeActivity.id,
        role: newRole,
        sls_assignments: currentAss.sls || [],
        pengawas: currentAss.pengawas || ''
      };
      
      const res = await api.petugas.assign(payload);
      if (res && res.success) {
        await refreshData();
        setSelectedPetugas(prev => {
          const nextRoles = { ...(prev.projectRoles || {}), [selectedProject]: newRole };
          return { ...prev, projectRoles: nextRoles };
        });
      }
    } catch (err) {
      alert("Gagal mengubah role petugas: " + err.message);
    }
  };

  const handleAssignmentChange = async (type, value) => {
    if (!selectedPetugas || !activeActivity) return;
    
    try {
      const currentAss = selectedPetugas.assignments?.[selectedProject] || { sls: [], pengawas: "" };
      let nextSls = [...(currentAss.sls || [])];
      let nextPengawas = currentAss.pengawas || "";
      
      if (type === "sls") {
        const isChecked = nextSls.includes(value);
        nextSls = isChecked ? nextSls.filter(s => s !== value) : [...nextSls, value];
      } else if (type === "pengawas") {
        nextPengawas = value;
      }
      
      const payload = {
        petugas_id: selectedPetugas.id,
        kegiatan_id: activeActivity.id,
        role: selectedPetugas.projectRoles?.[selectedProject] || 'PCL',
        sls_assignments: nextSls,
        pengawas: nextPengawas
      };
      
      const res = await api.petugas.assign(payload);
      if (res && res.success) {
        await refreshData();
        
        setSelectedPetugas(prev => {
          const currentAssignments = prev.assignments || {};
          const nextAssignment = {
            sls: nextSls,
            pengawas: nextPengawas
          };
          return {
            ...prev,
            assignments: {
              ...currentAssignments,
              [selectedProject]: nextAssignment
            }
          };
        });
      }
    } catch (err) {
      alert("Gagal memperbarui penugasan wilayah: " + err.message);
    }
  };

  // handlePmlSupervisionChange removed — replaced by handlePmlPclAdd / handlePmlPclRemove above

  const handleLocationDropdownChange = async (desaVal, slsVal, subSlsVal) => {
    setSelectedDesaCode(desaVal);
    setSelectedSlsCode(slsVal);
    setSelectedSubSlsCode(subSlsVal);

    if (!selectedPetugas || !activeActivity) return;

    try {
      const finalVal = subSlsVal || slsVal;
      const currentAss = selectedPetugas.assignments?.[selectedProject] || {};
      const payload = {
        petugas_id: selectedPetugas.id,
        kegiatan_id: activeActivity.id,
        role: selectedPetugas.projectRoles?.[selectedProject] || 'PCL',
        sls_assignments: finalVal ? [finalVal] : [],
        pengawas: currentAss.pengawas || ''
      };
      const res = await api.petugas.assign(payload);
      if (res && res.success) {
        await refreshData();
        setSelectedPetugas(prev => {
          const currentAssignments = prev.assignments || {};
          return {
            ...prev,
            assignments: {
              ...currentAssignments,
              [selectedProject]: {
                sls: finalVal ? [finalVal] : [],
                pengawas: currentAss.pengawas || ''
              }
            }
          };
        });
      }
    } catch (err) {
      alert("Gagal memperbarui wilayah tugas: " + err.message);
    }
  };

  /** Returns ALL PCLs supervised by this PML in the current project */
  const getSupervisedPcls = (pmlName) => {
    return petugas.filter(p => 
      p.projects?.includes(selectedProject) && 
      p.projectRoles?.[selectedProject] === "PCL" && 
      p.assignments?.[selectedProject]?.pengawas === pmlName
    );
  };

  /** Add a PCL to PML's supervision (set pengawas on that PCL's record) */
  const handlePmlPclAdd = async (pmlName, pclId) => {
    if (!pclId || !activeActivity) return;
    const pcl = petugas.find(p => p.id === parseInt(pclId));
    if (!pcl) return;
    try {
      const currentAss = pcl.assignments?.[selectedProject] || {};
      await api.petugas.assign({
        petugas_id: pcl.id,
        kegiatan_id: activeActivity.id,
        role: 'PCL',
        sls_assignments: currentAss.sls || [],
        pengawas: pmlName
      });
      await refreshData();
    } catch (err) {
      alert('Gagal menambahkan PCL ke pengawasan: ' + err.message);
    }
  };

  /** Remove a PCL from PML's supervision (clear pengawas on that PCL's record) */
  const handlePmlPclRemove = async (pclId) => {
    if (!pclId || !activeActivity) return;
    const pcl = petugas.find(p => p.id === parseInt(pclId));
    if (!pcl) return;
    try {
      const currentAss = pcl.assignments?.[selectedProject] || {};
      await api.petugas.assign({
        petugas_id: pcl.id,
        kegiatan_id: activeActivity.id,
        role: 'PCL',
        sls_assignments: currentAss.sls || [],
        pengawas: ''
      });
      await refreshData();
    } catch (err) {
      alert('Gagal menghapus PCL dari pengawasan: ' + err.message);
    }
  };

  const handleInlineLocationSave = async (officerId, locationValue) => {
    const p = petugas.find(x => x.id === officerId);
    if (!p || !activeActivity) return;
    try {
      const currentAss = p.assignments?.[selectedProject] || {};
      const payload = {
        petugas_id: officerId,
        kegiatan_id: activeActivity.id,
        role: p.projectRoles?.[selectedProject] || 'PCL',
        sls_assignments: locationValue ? [locationValue] : [],
        pengawas: currentAss.pengawas || ''
      };
      const res = await api.petugas.assign(payload);
      if (res && res.success) {
        await refreshData();
      }
    } catch (err) {
      alert("Gagal memperbarui wilayah tugas: " + err.message);
    }
  };

  const handleRowDesaChange = (officerId, desaVal) => {
    setRowSelections(prev => ({
      ...prev,
      [officerId]: { desa: desaVal, sls: "", subSls: "" }
    }));
    handleInlineLocationSave(officerId, "");
  };

  const handleRowSlsChange = (officerId, slsVal) => {
    const hasSubSls = allWilayah.some(w => w.sls === slsVal && w.sub_sls);
    setRowSelections(prev => {
      const updated = {
        ...prev,
        [officerId]: { ...prev[officerId], sls: slsVal, subSls: hasSubSls ? "" : "0" }
      };
      if (!hasSubSls) {
        handleInlineLocationSave(officerId, slsVal);
      } else {
        handleInlineLocationSave(officerId, "");
      }
      return updated;
    });
  };

  const handleRowSubSlsChange = (officerId, subSlsVal) => {
    setRowSelections(prev => {
      const updated = {
        ...prev,
        [officerId]: { ...prev[officerId], subSls: subSlsVal }
      };
      const finalValue = (subSlsVal === "0") ? updated[officerId].sls : (subSlsVal || updated[officerId].sls);
      handleInlineLocationSave(officerId, finalValue);
      return updated;
    });
  };

  const handleLocalAssignSubmit = async (e) => {
    e.preventDefault();
    if (selectedModalOfficerIds.length === 0 || !activeActivity) return;

    try {
      for (const id of selectedModalOfficerIds) {
        const role = modalOfficerRoles[id] || "PCL";
        const payload = {
          petugas_id: parseInt(id),
          kegiatan_id: activeActivity.id,
          role: role,
          sls_assignments: [],
          pengawas: ""
        };
        await api.petugas.assign(payload);
      }
      await refreshData();
      setShowAddModal(false);
      setSelectedModalOfficerIds([]);
      setModalOfficerRoles({});
      setModalSearch("");
    } catch (err) {
      alert("Gagal menugaskan petugas: " + err.message);
    }
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
                  <p className="mono text-xl font-bold text-amber-600">{dbDesa.length}</p>
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
                      ["Nama", "Petugas", "Lokus", "Progress Pencacahan", "Sync Terakhir", "Status", "Aksi"].map(col => {
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
                        : ["Nama", "Petugas", "Lokus", "Progress Pencacahan", "Sync Terakhir", "Status", "Aksi"]
                            .filter(h => visibleColsLocal.includes(h))
                            .filter(h => projectStatus !== 'draft' || !["Progress Pencacahan", "Sync Terakhir", "Status"].includes(h))
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
                      const activityAss = p.assignments?.[selectedProject] || {};
                      const targetVal = isGlobal ? p.target : (activityAss.target || 0);
                      const selesaiVal = isGlobal ? p.selesai : (activityAss.selesai || 0);
                      const pct = targetVal > 0 ? Math.round((selesaiVal / targetVal) * 100) : 0;
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
                              {visibleColsLocal.includes("Petugas") && (
                                <td className="px-6 py-4 border-t border-slate-100 whitespace-nowrap">
                                  {(projectStatus === "draft" || projectStatus === "uji_coba") ? (
                                    <select
                                      value={p.projectRoles?.[selectedProject] || "PCL"}
                                      onChange={async (e) => {
                                        const newRole = e.target.value;
                                        try {
                                          const currentAss = p.assignments?.[selectedProject] || {};
                                          const payload = {
                                            petugas_id: p.id,
                                            kegiatan_id: activeActivity.id,
                                            role: newRole,
                                            sls_assignments: newRole === "PML" ? [] : (currentAss.sls || []),
                                            pengawas: newRole === "PML" ? "" : (currentAss.pengawas || "")
                                          };
                                          const res = await api.petugas.assign(payload);
                                          if (res && res.success) {
                                            await refreshData();
                                          }
                                        } catch (err) {
                                          alert("Gagal mengubah role petugas: " + err.message);
                                        }
                                      }}
                                      className="px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white text-slate-700 font-semibold cursor-pointer"
                                    >
                                      <option value="PCL">PCL</option>
                                      <option value="PML">PML</option>
                                    </select>
                                  ) : (
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg inline-block whitespace-nowrap ${
                                      (p.projectRoles?.[selectedProject] || "PCL") === "PML" 
                                        ? "bg-purple-50 text-purple-600 border border-purple-100/30" 
                                        : "bg-blue-50 text-blue-600 border border-blue-100/30"
                                    }`}>
                                      {p.projectRoles?.[selectedProject] || "PCL"}
                                    </span>
                                  )}
                                </td>
                              )}
                              
                              {visibleColsLocal.includes("Lokus") && (
                                <td className="px-6 py-4 border-t border-slate-100 whitespace-nowrap">
                                  {(() => {
                                    const role = p.projectRoles?.[selectedProject] || "PCL";
                                    if (role === "PCL") {
                                      if (projectStatus === "draft" || projectStatus === "uji_coba") {
                                        const selections = rowSelections[p.id] || { desa: "", sls: "", subSls: "" };
                                        return (
                                          <div className="flex flex-col sm:flex-row gap-1">
                                            {/* Desa Dropdown */}
                                            <select
                                              value={selections.desa || ""}
                                              onChange={e => handleRowDesaChange(p.id, e.target.value)}
                                              className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 font-medium cursor-pointer max-w-[120px]"
                                            >
                                              <option value="">-- Desa --</option>
                                              {(activeActivity?.lokus?.desa || []).map(desaName => (
                                                <option key={desaName} value={desaName}>{desaName}</option>
                                              ))}
                                            </select>

                                            {/* SLS Dropdown */}
                                            <select
                                              value={selections.sls || ""}
                                              onChange={e => handleRowSlsChange(p.id, e.target.value)}
                                              disabled={!selections.desa}
                                              className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed max-w-[120px]"
                                            >
                                              <option value="">-- SLS --</option>
                                              {(activeActivity?.lokus?.sls || [])
                                                .filter(slsName => {
                                                  const matched = dbSlsHierarchy.find(s => s.name === slsName);
                                                  return matched && matched.desa === selections.desa;
                                                })
                                                .map(slsName => (
                                                  <option key={slsName} value={slsName}>{slsName.replace(` ${selections.desa}`, "")}</option>
                                                ))}
                                            </select>

                                            {/* Sub SLS Dropdown */}
                                            <select
                                              value={selections.subSls || ""}
                                              onChange={e => handleRowSubSlsChange(p.id, e.target.value)}
                                              disabled={!selections.sls}
                                              className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed max-w-[120px]"
                                            >
                                              <option value="">-- Sub SLS --</option>
                                              {(() => {
                                                const filteredList = (activeActivity?.lokus?.subSls || [])
                                                  .filter(subName => {
                                                    const matched = dbSubSlsHierarchy.find(sub => sub.name === subName);
                                                    return matched && matched.sls === selections.sls;
                                                  });
                                                if (filteredList.length > 0) {
                                                  return filteredList.map(subName => (
                                                    <option key={subName} value={subName}>{subName}</option>
                                                  ));
                                                } else if (selections.sls) {
                                                  return <option value="0">0</option>;
                                                }
                                                return null;
                                              })()}
                                            </select>
                                          </div>
                                        );
                                      } else {
                                        return (
                                          <div className="flex items-center gap-1 text-slate-600 text-xs font-medium">
                                            <MapPin size={12} className="text-slate-400" />
                                            <span>{p.assignments?.[selectedProject]?.sls?.[0] || "Belum ditentukan"}</span>
                                          </div>
                                        );
                                      }
                                    } else {
                                      // Role is PML — multi-PCL supervision
                                      const supervisedPcls = getSupervisedPcls(p.name);
                                      const availablePcls = petugas.filter(x =>
                                        x.projects?.includes(selectedProject) &&
                                        x.projectRoles?.[selectedProject] === "PCL" &&
                                        !(x.assignments?.[selectedProject]?.pengawas === p.name)
                                      );
                                      if (projectStatus === "draft" || projectStatus === "uji_coba") {
                                        return (
                                          <div className="flex flex-wrap items-center gap-1 max-w-[260px]">
                                            {/* Chips for supervised PCLs */}
                                            {supervisedPcls.map(pcl => (
                                              <span key={pcl.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-100 rounded-full">
                                                {pcl.name.split(' ')[0]}
                                                <button
                                                  onClick={() => handlePmlPclRemove(pcl.id)}
                                                  className="w-3 h-3 rounded-full bg-purple-200 hover:bg-red-200 hover:text-red-600 flex items-center justify-center border-0 cursor-pointer text-purple-500 transition-colors"
                                                  title={`Hapus ${pcl.name} dari pengawasan`}
                                                >
                                                  <X size={8}/>
                                                </button>
                                              </span>
                                            ))}
                                            {/* Add PCL dropdown */}
                                            {availablePcls.length > 0 && (
                                              <select
                                                value=""
                                                onChange={e => { if (e.target.value) handlePmlPclAdd(p.name, e.target.value); }}
                                                className="px-1.5 py-0.5 text-[10px] border border-dashed border-slate-300 rounded-full bg-white text-slate-500 font-semibold cursor-pointer hover:border-purple-400 hover:text-purple-600 transition-colors"
                                                title="Tambah PCL yang diawasi"
                                              >
                                                <option value="">+ PCL</option>
                                                {availablePcls.map(x => (
                                                  <option key={x.id} value={x.id}>{x.name}</option>
                                                ))}
                                              </select>
                                            )}
                                            {supervisedPcls.length === 0 && availablePcls.length === 0 && (
                                              <span className="text-[10px] text-slate-400 italic">Belum ada PCL</span>
                                            )}
                                          </div>
                                        );
                                      } else {
                                        return (
                                          <div className="flex flex-wrap gap-1">
                                            {supervisedPcls.length > 0 ? supervisedPcls.map(pcl => (
                                              <span key={pcl.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-600 border border-purple-100/40 rounded-full">
                                                <Users size={9}/> {pcl.name.split(' ')[0]}
                                              </span>
                                            )) : (
                                              <span className="text-[10px] text-slate-400">Tidak ada PCL</span>
                                            )}
                                          </div>
                                        );
                                      }
                                    }
                                  })()}
                                </td>
                              )}
                              {visibleColsLocal.includes("Progress Pencacahan") && projectStatus !== "draft" && (
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
                                    <span className="mono text-xs text-slate-600 font-bold whitespace-nowrap">{selesaiVal}/{targetVal}</span>
                                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">({pct}%)</span>
                                  </div>
                                </td>
                              )}
                              {visibleColsLocal.includes("Sync Terakhir") && projectStatus !== "draft" && (
                                <td className="px-6 py-4 border-t border-slate-100 mono text-xs text-slate-500 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                                    <Smartphone size={12} className="text-slate-400"/>
                                    <span>{p.sync}</span>
                                  </div>
                                </td>
                              )}
                              {visibleColsLocal.includes("Status") && projectStatus !== "draft" && (
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
                        
                        {(projectStatus === "draft" || projectStatus === "uji_coba") ? (
                          <>
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

                            {/* If role is PCL: Desa, SLS, Sub-SLS dropdowns, plus PML dropdown */}
                            {(selectedPetugas.projectRoles?.[selectedProject] || "PCL") === "PCL" && (
                              <>
                                {/* Pengawas (PML) Dropdown */}
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

                                {/* Desa Dropdown */}
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Desa Tugas</label>
                                  <select
                                    value={selectedDesaCode}
                                    onChange={e => handleLocationDropdownChange(e.target.value, "", "")}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white text-slate-700 transition-all font-semibold cursor-pointer"
                                  >
                                    <option value="">-- Pilih Desa --</option>
                                    {(activeActivity?.lokus?.desa || []).map(desaName => (
                                      <option key={desaName} value={desaName}>{desaName}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* SLS Dropdown */}
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">SLS Tugas</label>
                                  <select
                                    value={selectedSlsCode}
                                    onChange={e => handleLocationDropdownChange(selectedDesaCode, e.target.value, "")}
                                    disabled={!selectedDesaCode}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white text-slate-700 transition-all font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <option value="">-- Pilih SLS --</option>
                                    {(activeActivity?.lokus?.sls || [])
                                      .filter(slsName => {
                                        const matched = dbSlsHierarchy.find(s => s.name === slsName);
                                        return matched && matched.desa === selectedDesaCode;
                                      })
                                      .map(slsName => (
                                        <option key={slsName} value={slsName}>{slsName.replace(` ${selectedDesaCode}`, "")}</option>
                                      ))}
                                  </select>
                                </div>

                                {/* Sub-SLS Dropdown */}
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Sub SLS Tugas</label>
                                  <select
                                    value={selectedSubSlsCode}
                                    onChange={e => handleLocationDropdownChange(selectedDesaCode, selectedSlsCode, e.target.value)}
                                    disabled={!selectedSlsCode}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white text-slate-700 transition-all font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <option value="">-- Pilih Sub SLS (Opsional) --</option>
                                    {(activeActivity?.lokus?.subSls || [])
                                      .filter(subName => {
                                        const matched = dbSubSlsHierarchy.find(sub => sub.name === subName);
                                        return matched && matched.sls === selectedSlsCode;
                                      })
                                      .map(subName => (
                                        <option key={subName} value={subName}>{subName}</option>
                                      ))}
                                  </select>
                                </div>
                              </>
                            )}

            {/* If role is PML: multi-PCL chip selector in sidebar */}
                            {(selectedPetugas.projectRoles?.[selectedProject] || "PCL") === "PML" && (
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">PCL yang Diawasi</label>
                                <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 min-h-[40px]">
                                  {getSupervisedPcls(selectedPetugas.name).map(pcl => (
                                    <span key={pcl.id} className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-100 rounded-full">
                                      {pcl.name.split(' ').slice(0,2).join(' ')}
                                      <button
                                        onClick={() => handlePmlPclRemove(pcl.id)}
                                        className="w-3.5 h-3.5 rounded-full bg-purple-200 hover:bg-red-200 hover:text-red-600 flex items-center justify-center border-0 cursor-pointer text-purple-500 transition-colors flex-shrink-0"
                                        title={`Hapus ${pcl.name}`}
                                      >
                                        <X size={8}/>
                                      </button>
                                    </span>
                                  ))}
                                  {/* Add PCL dropdown */}
                                  {petugas.filter(x =>
                                    x.projects?.includes(selectedProject) &&
                                    x.projectRoles?.[selectedProject] === "PCL" &&
                                    x.assignments?.[selectedProject]?.pengawas !== selectedPetugas.name
                                  ).length > 0 && (
                                    <select
                                      value=""
                                      onChange={e => { if (e.target.value) handlePmlPclAdd(selectedPetugas.name, e.target.value); }}
                                      className="px-2 py-0.5 text-[10px] border border-dashed border-slate-300 rounded-full bg-white text-slate-500 font-semibold cursor-pointer hover:border-purple-400 hover:text-purple-600 transition-colors"
                                    >
                                      <option value="">+ Tambah PCL</option>
                                      {petugas
                                        .filter(x =>
                                          x.projects?.includes(selectedProject) &&
                                          x.projectRoles?.[selectedProject] === "PCL" &&
                                          x.assignments?.[selectedProject]?.pengawas !== selectedPetugas.name
                                        )
                                        .map(x => (
                                          <option key={x.id} value={x.id}>{x.name}</option>
                                        ))}
                                    </select>
                                  )}
                                  {getSupervisedPcls(selectedPetugas.name).length === 0 && (
                                    <span className="text-[10px] text-slate-400 italic self-center">Belum ada PCL — pilih dari dropdown</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                                    ) : (
                              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-600 font-medium">
                              <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Peran</p>
                                <span className="font-semibold text-slate-700">
                                  {selectedPetugas.projectRoles?.[selectedProject] === "PML" ? "PML (Pengawas)" : "PCL (Pendata)"}
                                </span>
                              </div>
                              
                              {(selectedPetugas.projectRoles?.[selectedProject] || "PCL") === "PCL" ? (
                                <>
                                  <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Wilayah Tugas</p>
                                    <span className="font-semibold text-slate-700">
                                      {selectedPetugas.assignments?.[selectedProject]?.sls?.[0] || "-"}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Pengawas (PML)</p>
                                    <span className="font-semibold text-slate-700">
                                      {selectedPetugas.assignments?.[selectedProject]?.pengawas || "Belum ada pengawas"}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">PCL yang Diawasi</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {getSupervisedPcls(selectedPetugas.name).length > 0
                                      ? getSupervisedPcls(selectedPetugas.name).map(pcl => (
                                          <span key={pcl.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-600 border border-purple-100/40 rounded-full">
                                            <Users size={9}/> {pcl.name.split(' ').slice(0,2).join(' ')}
                                          </span>
                                        ))
                                      : <span className="font-semibold text-slate-400 italic">Belum ada PCL yang diawasi</span>
                                    }
                                  </div>
                                </div>
                              )}
                            </div>
                        )}
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
                      <Trash2 size={13}/> {isGlobal ? "Hapus Petugas Permanen" : "Keluarkan dari Kegiatan"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Petugas Modal */}
      {showAddModal && isGlobal && (
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
                    {dbDesa.map(d => {
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

      {/* Add Petugas Modal (Local view - Assignment style) */}
      {showAddModal && !isGlobal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-custom-fade"
          onClick={() => {
            setShowAddModal(false);
            setSelectedModalOfficerIds([]);
            setModalOfficerRoles({});
            setModalSearch("");
          }}
        >
          <div className="bg-white rounded-2xl p-8 w-full shadow-lg animate-spring-zoom"
            style={{ maxWidth: 480 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-blue-50">
              <UserPlus size={24} className="text-blue-600"/>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-1">
              Tugaskan Petugas ke Kegiatan
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Pilih petugas dari database master dan atur peran tugasnya.
            </p>

            <form onSubmit={handleLocalAssignSubmit} className="space-y-4">
              {/* Fitur Search Petugas */}
              <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-100 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                <Search size={14} className="text-slate-400"/>
                <input 
                  value={modalSearch}
                  onChange={e => setModalSearch(e.target.value)}
                  className="text-xs outline-none text-slate-700 placeholder-slate-400 w-full bg-transparent font-semibold" 
                  placeholder="Cari nama petugas..."
                />
                {modalSearch && (
                  <button type="button" onClick={() => setModalSearch("")} className="bg-transparent border-0 text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X size={12}/>
                  </button>
                )}
              </div>

              {/* List Petugas */}
              <div className="space-y-2 mb-6 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin">
                {unassignedOfficers
                  .filter(p => p.name.toLowerCase().includes(modalSearch.toLowerCase()))
                  .map(p => {
                    const isChecked = selectedModalOfficerIds.includes(p.id);
                    const role = modalOfficerRoles[p.id] || "PCL";
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                          isChecked 
                            ? 'border-blue-200 bg-blue-50/20' 
                            : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                setSelectedModalOfficerIds(prev => prev.filter(id => id !== p.id));
                              } else {
                                setSelectedModalOfficerIds(prev => [...prev, p.id]);
                              }
                            }}
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                              isChecked ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white'
                            }`}
                          >
                            {isChecked && <Check size={12} strokeWidth={3}/>}
                          </button>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{p.name}</p>
                            <p className="text-[10px] text-slate-400">Desa {p.desa}</p>
                          </div>
                        </div>
                        
                        <div>
                          <select
                            value={role}
                            onChange={e => {
                              const newRole = e.target.value;
                              setModalOfficerRoles(prev => ({ ...prev, [p.id]: newRole }));
                            }}
                            className="px-2 py-1 text-[11px] border border-slate-200 rounded-lg bg-white text-slate-700 font-semibold cursor-pointer focus:border-blue-500 outline-none"
                          >
                            <option value="PCL">PCL</option>
                            <option value="PML">PML</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                {unassignedOfficers.filter(p => p.name.toLowerCase().includes(modalSearch.toLowerCase())).length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs font-medium">
                    Tidak ada petugas master yang ditemukan
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedModalOfficerIds([]);
                    setModalOfficerRoles({});
                    setModalSearch("");
                  }}
                  className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-semibold text-slate-600 cursor-pointer transition-all border-0"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={selectedModalOfficerIds.length === 0}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 border-0 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Tugaskan ({selectedModalOfficerIds.length})
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
              {isGlobal ? "Hapus Petugas Permanen" : "Keluarkan dari Kegiatan"}
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {isGlobal ? (
                <>Anda yakin ingin menghapus petugas <strong>{selectedPetugas.name}</strong> secara permanen dari sistem? Seluruh riwayat dan penugasan petugas ini akan ikut terhapus.</>
              ) : (
                <>Anda yakin ingin mengeluarkan petugas <strong>{selectedPetugas.name}</strong> dari kegiatan <strong>"{selectedProject}"</strong>?</>
              )}
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
                {isGlobal ? "Ya, Hapus Permanen" : "Ya, Keluarkan"}
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

export default AdminPetugasKegiatan;
