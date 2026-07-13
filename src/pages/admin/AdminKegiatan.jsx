import SelectDropdown from '../../components/ui/SelectDropdown';
import { useState, useEffect } from "react";
import AdminLayout from "../../components/layouts/AdminLayout";
import { 
  Plus, Search, Edit, Trash2, Calendar, Check, X, AlertTriangle, 
  Users, Briefcase, ChevronRight, UserPlus, UserMinus, Eye, FileText, CheckCircle, ArrowLeft, ShieldAlert, ChevronDown,
  Save, Target
} from "lucide-react";
import { api } from "../../services/api";

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
function AdminKegiatan({ onNavigate, selectedProject, onProjectChange, activities, setActivities, petugas, setPetugas, refreshData, loading }) {
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
  const [allWilayah, setAllWilayah] = useState([]);

  // States for publish validation
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const fetchWilayah = async () => {
      try {
        const list = await api.wilayah.getAll();
        setAllWilayah(list);
      } catch (err) {
        console.error("Gagal mengambil data wilayah:", err);
      }
    };
    fetchWilayah();
  }, []);

  const dbKecamatan = allWilayah.length > 0 
    ? Array.from(new Set(allWilayah.map(w => w.kecamatan))).sort()
    : MOCK_KECAMATAN;

  const dbDesaHierarchy = allWilayah.length > 0
    ? Array.from(new Set(allWilayah.map(w => w.desa)))
        .map(desaName => {
          const matched = allWilayah.find(w => w.desa === desaName);
          return { name: desaName, kecamatan: matched ? matched.kecamatan : "" };
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    : MOCK_DESA_HIERARCHY;

  const dbSlsHierarchy = allWilayah.length > 0
    ? (() => {
        const unique = [];
        const seen = new Set();
        allWilayah
          .filter(w => w.sls)
          .forEach(w => {
            const key = `${w.sls} [${w.desa}]`;
            if (!seen.has(key)) {
              seen.add(key);
              unique.push({ name: key, sls: w.sls, desa: w.desa });
            }
          });
        return unique.sort((a, b) => a.name.localeCompare(b.name));
      })()
    : MOCK_SLS_HIERARCHY;

  const dbSubSlsHierarchy = allWilayah.length > 0
    ? (() => {
        const unique = [];
        const seen = new Set();
        allWilayah
          .filter(w => w.sub_sls)
          .forEach(w => {
            const key = `${w.sub_sls} [${w.sls} - ${w.desa}]`;
            if (!seen.has(key)) {
              seen.add(key);
              unique.push({ name: key, subSls: w.sub_sls, sls: `${w.sls} [${w.desa}]`, desa: w.desa });
            }
          });
        return unique.sort((a, b) => a.name.localeCompare(b.name));
      })()
    : MOCK_SUB_SLS_HIERARCHY;

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
      const allowedDesas = dbDesaHierarchy.filter(d => nextValues.includes(d.kecamatan)).map(d => d.name);
      nextLokus.desa = (currentLokus.desa || []).filter(d => allowedDesas.includes(d));
    }
    if (type === "desa" || type === "kecamatan") {
      const allowedSls = dbSlsHierarchy.filter(s => nextLokus.desa.includes(s.desa)).map(s => s.name);
      nextLokus.sls = (currentLokus.sls || []).filter(s => allowedSls.includes(s));
    }
    if (type === "sls" || type === "desa" || type === "kecamatan") {
      const allowedSub = dbSubSlsHierarchy.filter(sub => nextLokus.sls.includes(sub.sls)).map(sub => sub.name);
      nextLokus.subSls = (currentLokus.subSls || []).filter(sub => allowedSub.includes(sub));
    }

    setTempLokus(nextLokus);
  };

  const handleBulkLokusChange = (type, action) => {
    if (selectedActivity.status !== "draft") return;
    const currentLokus = tempLokus || { kecamatan: [], desa: [], sls: [], subSls: [] };
    
    let nextValues = [...(currentLokus[type] || [])];
    
    // Determine the items that are eligible to be selected/deselected
    let targetItems = [];
    if (type === "kecamatan") {
      targetItems = dbKecamatan;
    } else if (type === "desa") {
      targetItems = dbDesaHierarchy.filter(d => (currentLokus.kecamatan || []).includes(d.kecamatan)).map(d => d.name);
    } else if (type === "sls") {
      targetItems = dbSlsHierarchy.filter(s => (currentLokus.desa || []).includes(s.desa)).map(s => s.name);
    } else if (type === "subSls") {
      targetItems = dbSubSlsHierarchy.filter(sub => (currentLokus.sls || []).includes(sub.sls)).map(sub => sub.name);
    }
    
    if (action === "select_all") {
      // Add all targetItems to nextValues if not already present
      targetItems.forEach(item => {
        if (!nextValues.includes(item)) {
          nextValues.push(item);
        }
      });
    } else if (action === "deselect_all") {
      // Remove all targetItems from nextValues
      nextValues = nextValues.filter(v => !targetItems.includes(v));
    }
    
    let nextLokus = { ...currentLokus, [type]: nextValues };
    
    // Cascade constraints down:
    const activeKec = nextLokus.kecamatan || [];
    const allowedDesas = dbDesaHierarchy.filter(d => activeKec.includes(d.kecamatan)).map(d => d.name);
    nextLokus.desa = (nextLokus.desa || []).filter(d => allowedDesas.includes(d));
    
    const activeDesas = nextLokus.desa || [];
    const allowedSls = dbSlsHierarchy.filter(s => activeDesas.includes(s.desa)).map(s => s.name);
    nextLokus.sls = (nextLokus.sls || []).filter(s => allowedSls.includes(s));
    
    const activeSls = nextLokus.sls || [];
    const allowedSub = dbSubSlsHierarchy.filter(sub => activeSls.includes(sub.sls)).map(sub => sub.name);
    nextLokus.subSls = (nextLokus.subSls || []).filter(sub => allowedSub.includes(sub));
    
    setTempLokus(nextLokus);
  };

  const handleSaveLokusClick = () => {
    triggerConfirm(
      "save_lokus",
      { activityName: selectedActivity.name },
      async () => {
        try {
          const res = await api.kegiatan.update(selectedActivity.id, {
            lokus: tempLokus
          });
          if (res && res.success) {
            await refreshData();
            setSelectedActivity(prev => ({ ...prev, lokus: tempLokus }));
          }
        } catch (err) {
          alert("Gagal menyimpan Lokus: " + err.message);
        }
      }
    );
  };

  // Form states untuk tambah kegiatan
  const [newActivity, setNewActivity] = useState({
    name: "",
    desc: "",
    date: "",
    status: "draft",
    fokus: ""
  });

  // Form states untuk edit kegiatan
  const [editForm, setEditForm] = useState({
    name: "",
    desc: "",
    date: "",
    status: "draft",
    fokus: ""
  });

  // Filter & Search Logic untuk kegiatan
  const filteredActivities = activities.filter(act => 
    act.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (act.description || act.desc || "").toLowerCase().includes(searchQuery.toLowerCase())
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
      async () => {
        try {
          const colors = ["bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-amber-600", "bg-rose-600", "bg-indigo-600"];
          const color = colors[activities.length % colors.length];
          const textColor = color.replace("bg-", "text-");
          const bgColor = color.replace("bg-", "bg-") + "/10";

          const payload = {
            name: newActivity.name.trim(),
            description: newActivity.desc.trim(),
            progress: 0,
            color,
            text_color: textColor,
            bg_color: bgColor,
            start_date: newActivity.date || null,
            status: newActivity.status,
            lokus: { kecamatan: [], desa: [], sls: [], subSls: [] },
            fokus: newActivity.fokus || null
          };

          const res = await api.kegiatan.create(payload);
          if (res && res.success) {
            await refreshData();
            setNewActivity({ name: "", desc: "", date: "", status: "draft", fokus: "" });
            setShowAddModal(false);
          }
        } catch (err) {
          alert("Gagal menambahkan kegiatan: " + err.message);
        }
      }
    );
  };

  // 2. Aksi Edit Kegiatan
  const handleEditOpen = () => {
    setEditForm({
      name: selectedActivity.name,
      desc: selectedActivity.description || "",
      date: selectedActivity.start_date ? selectedActivity.start_date.split('T')[0] : "",
      status: selectedActivity.status,
      fokus: selectedActivity.fokus || ""
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
      async () => {
        try {
          const payload = {
            name: editForm.name.trim(),
            description: editForm.desc.trim(),
            start_date: editForm.date || null,
            status: editForm.status,
            fokus: editForm.fokus || null
          };
          
          const res = await api.kegiatan.update(selectedActivity.id, payload);
          if (res && res.success) {
            // Jika status berubah dari uji_coba ke published, hapus penugasan dummy di backend
            if (isTransitioningFromUjiCobaToPublished) {
              const assigned = petugas.filter(p => p.projects?.includes(selectedActivity.name));
              for (const p of assigned) {
                await api.petugas.unassign({ petugas_id: p.id, kegiatan_id: selectedActivity.id });
              }
            }
            
            await refreshData();
            
            setSelectedActivity(prev => ({
              ...prev,
              name: editForm.name.trim(),
              description: editForm.desc.trim(),
              start_date: editForm.date,
              status: editForm.status,
              fokus: editForm.fokus
            }));
            
            setShowEditModal(false);
          }
        } catch (err) {
          alert("Gagal memperbarui kegiatan: " + err.message);
        }
      }
    );
  };

  // 3. Aksi Hapus Kegiatan
  const handleDeleteActivity = () => {
    triggerConfirm(
      "delete_activity",
      selectedActivity,
      async () => {
        try {
          const res = await api.kegiatan.delete(selectedActivity.id);
          if (res && res.success) {
            await refreshData();
            setSelectedActivity(null);
          }
        } catch (err) {
          alert("Gagal menghapus kegiatan: " + err.message);
        }
      }
    );
  };

  // 4. Aksi Tugaskan Petugas (Assign massal)
  const handleAssignOfficersSubmit = () => {
    if (selectedOfficerNames.length === 0) return;

    triggerConfirm(
      "assign_officers_bulk",
      { count: selectedOfficerNames.length, activityName: selectedActivity.name },
      async () => {
        try {
          for (const officerName of selectedOfficerNames) {
            const p = petugas.find(o => o.name === officerName);
            if (p) {
              const role = officerRolesMap[officerName] || "PCL";
              await api.petugas.assign({
                petugas_id: p.id,
                kegiatan_id: selectedActivity.id,
                role,
                sls_assignments: p.assignments?.[selectedActivity.name]?.sls || [],
                pengawas: p.assignments?.[selectedActivity.name]?.pengawas || ''
              });
            }
          }
          await refreshData();
          
          setSelectedOfficerNames([]);
          setOfficerRolesMap({});
          setShowAssignModal(false);
          setAssignSearch("");
        } catch (err) {
          alert("Gagal menugaskan petugas: " + err.message);
        }
      }
    );
  };

  // 5. Aksi Cabut Petugas (Unassign)
  const handleUnassignOfficer = (officerName) => {
    triggerConfirm(
      "unassign_officer",
      { officerName, activityName: selectedActivity.name },
      async () => {
        try {
          const p = petugas.find(o => o.name === officerName);
          if (p) {
            await api.petugas.unassign({
              petugas_id: p.id,
              kegiatan_id: selectedActivity.id
            });
            await refreshData();
          }
        } catch (err) {
          alert("Gagal membatalkan penugasan: " + err.message);
        }
      }
    );
  };

  // 6. Aksi Publish Kegiatan (dengan validasi lengkap)
  const handlePublishClick = async () => {
    if (!selectedActivity) return;
    setIsValidating(true);
    setValidationErrors([]);
    
    try {
      const errors = [];
      
      // 1. Cek Form Builder tidak kosong
      const formRes = await api.form.getStructure(selectedActivity.id);
      if (!formRes || !formRes.success || !formRes.blocks || formRes.blocks.length === 0 || !formRes.questions || formRes.questions.length === 0) {
        errors.push("Kuesioner (Form Builder) masih kosong. Pastikan sudah membuat minimal satu blok dan satu pertanyaan.");
      }

      // Cari petugas yang terdaftar di kegiatan saat ini
      const assigned = petugas.filter(p => p.projects && p.projects.includes(selectedActivity.name));

      // 2. Cek wilayah penugasan PCL berdasarkan tingkat detail lokus terdalam yang dipilih
      const lokus = selectedActivity.lokus || { kecamatan: [], desa: [], sls: [], subSls: [] };
      const pcls = assigned.filter(p => p.projectRoles?.[selectedActivity.name] === "PCL");
      
      const assignedLocations = new Set();
      pcls.forEach(p => {
        const slsList = p.assignments?.[selectedActivity.name]?.sls || [];
        slsList.forEach(s => assignedLocations.add(s));
      });

      const normalizeSlsCode = (sls) => {
        if (!sls) return '';
        const match = sls.toLowerCase().match(/\d+/);
        if (match) {
          return parseInt(match[0], 10).toString();
        }
        return sls.toLowerCase().trim();
      };

      const assignedClean = Array.from(assignedLocations).map(loc => {
        const isLegacy = loc.includes('||');
        const cleanFirst = isLegacy ? loc.split('||')[0] : loc.split(' [')[0];
        const cleanDesa = isLegacy ? loc.split('||')[1] : loc.split(' [')[1]?.replace(']', '')?.split(' - ').pop();
        return {
          sls: normalizeSlsCode(cleanFirst),
          desa: cleanDesa ? cleanDesa.trim().toLowerCase() : ""
        };
      });

      if (lokus.subSls && lokus.subSls.length > 0) {
        lokus.subSls.forEach(sub => {
          const isLegacy = sub.includes('||');
          const cleanFirst = isLegacy ? sub.split('||')[0] : sub.split(' [')[0];
          const cleanDesa = isLegacy ? sub.split('||')[1] : sub.split(' [')[1]?.replace(']', '')?.split(' - ').pop();
          const subCode = normalizeSlsCode(cleanFirst);
          const subDesa = cleanDesa ? cleanDesa.trim().toLowerCase() : "";

          const isAssigned = assignedClean.some(a => 
            a.sls === subCode && 
            (!subDesa || !a.desa || a.desa === subDesa)
          );
          if (!isAssigned) {
            errors.push(`Sub-SLS "${sub}" belum ditugaskan ke PCL manapun.`);
          }
        });
      } else if (lokus.sls && lokus.sls.length > 0) {
        lokus.sls.forEach(s => {
          const isLegacy = s.includes('||');
          const cleanFirst = isLegacy ? s.split('||')[0] : s.split(' [')[0];
          const cleanDesa = isLegacy ? s.split('||')[1] : s.split(' [')[1]?.replace(']', '');
          const sCode = normalizeSlsCode(cleanFirst);
          const sDesa = cleanDesa ? cleanDesa.trim().toLowerCase() : "";

          const isAssigned = assignedClean.some(a => 
            a.sls === sCode && 
            (!sDesa || !a.desa || a.desa === sDesa)
          );
          if (!isAssigned) {
            errors.push(`SLS "${s}" belum ditugaskan ke PCL manapun.`);
          }
        });
      } else if (lokus.desa && lokus.desa.length > 0) {
        lokus.desa.forEach(d => {
          const dNorm = d.trim().toLowerCase();
          const isAssigned = assignedClean.some(a => a.desa === dNorm || a.sls === dNorm);
          if (!isAssigned) {
            errors.push(`Desa "${d}" belum ditugaskan ke PCL manapun.`);
          }
        });
      } else if (lokus.kecamatan && lokus.kecamatan.length > 0) {
        // Simple fallback
        lokus.kecamatan.forEach(k => {
          if (!assignedLocations.has(k)) {
            errors.push(`Kecamatan "${k}" belum ditugaskan ke PCL manapun.`);
          }
        });
      } else {
        errors.push("Lokus Kegiatan belum dipilih. Silakan pilih dan simpan Lokus Kegiatan terlebih dahulu.");
      }

      // 3. Cek "tiap PCL sudah mendapat PML"
      pcls.forEach(p => {
        const pengawas = p.assignments?.[selectedActivity.name]?.pengawas;
        if (!pengawas || pengawas.trim() === "") {
          errors.push(`PCL "${p.name}" belum memiliki Pengawas (PML).`);
        }
      });

      // 0. Cek Fokus Pendataan wajib terisi
      if (!selectedActivity.fokus || selectedActivity.fokus.trim() === "") {
        errors.push("Fokus Pendataan wajib dipilih sebelum mempublikasikan kegiatan.");
      }

      if (errors.length > 0) {
        setValidationErrors(errors);
        setShowValidationModal(true);
      } else {
        const isFromUjiCoba = selectedActivity.status === "uji_coba";
        triggerConfirm(
          isFromUjiCoba ? "transition_warning" : "publish_activity",
          { name: selectedActivity.name },
          async () => {
            try {
              const payload = {
                status: "published"
              };
              const res = await api.kegiatan.update(selectedActivity.id, payload);
              if (res && res.success) {
                if (isFromUjiCoba) {
                  const assigned = petugas.filter(p => p.projects?.includes(selectedActivity.name));
                  for (const p of assigned) {
                    await api.petugas.unassign({ petugas_id: p.id, kegiatan_id: selectedActivity.id });
                  }
                }
                await refreshData();
                setSelectedActivity(prev => ({ ...prev, status: "published" }));
              }
            } catch (err) {
              alert("Gagal mempublikasikan kegiatan: " + err.message);
            }
          }
        );
      }
    } catch (err) {
      alert("Error saat validasi: " + err.message);
    } finally {
      setIsValidating(false);
    }
  };

  // 7. Aksi Selesaikan Kegiatan (Destructive lock)
  const handleFinishClick = () => {
    if (!selectedActivity) return;

    triggerConfirm(
      "finish_activity",
      { name: selectedActivity.name },
      async () => {
        try {
          const payload = {
            status: "selesai"
          };
          const res = await api.kegiatan.update(selectedActivity.id, payload);
          if (res && res.success) {
            await refreshData();
            setSelectedActivity(prev => ({ ...prev, status: "selesai" }));
          }
        } catch (err) {
          alert("Gagal menyelesaikan kegiatan: " + err.message);
        }
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

  if (loading) {
    return (
      <AdminLayout tab="admin-kegiatan" onNavigate={onNavigate} selectedProject={selectedProject} onProjectChange={onProjectChange} activities={activities}>
        <div className="p-6 lg:p-8 w-full animate-pulse space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="space-y-2">
              <div className="h-7 w-48 bg-slate-200 rounded-lg"></div>
              <div className="h-4 w-64 bg-slate-100 rounded-md"></div>
            </div>
            <div className="h-10 w-32 bg-slate-200 rounded-xl"></div>
          </div>

          {/* Quick Stats Grid Skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-slate-100"></div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-16 bg-slate-100 rounded"></div>
                  <div className="h-5 w-12 bg-slate-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Search bar skeleton */}
          <div className="h-10 w-64 bg-slate-100 rounded-xl mb-6"></div>

          {/* Grid of Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(n => (
              <div key={n} className="border border-slate-100 rounded-2xl p-6 bg-white space-y-4 shadow-sm h-48 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="h-5 w-24 bg-slate-200 rounded-full"></div>
                    <div className="h-3.5 w-16 bg-slate-100 rounded"></div>
                  </div>
                  <div className="h-4.5 w-3/4 bg-slate-200 rounded"></div>
                  <div className="h-3 w-full bg-slate-100 rounded"></div>
                </div>
                <div className="h-5 w-32 bg-slate-100 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

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
                    onClick={() => { onProjectChange(act.name); onNavigate("admin-detail-kegiatan"); }}
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
                        {act.description || act.desc}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-50 text-[10px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12}/> {act.start_date ? new Date(act.start_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
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

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Fokus Pendataan</label>
                <div className="relative">
                  <SelectDropdown variant="form" 
                    value={newActivity.fokus} 
                    onChange={e => setNewActivity({ ...newActivity, fokus: e.target.value })}
                    required
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white text-slate-700 transition-all font-medium cursor-pointer appearance-none pr-10"
                  >
                    <option value="">-- Pilih Fokus Pendataan --</option>
                    <option value="Keluarga">Keluarga</option>
                    <option value="Rumah Tangga">Rumah Tangga</option>
                    <option value="Tim">Tim</option>
                    <option value="Individu">Individu</option>
                    <option value="Perusahaan">Perusahaan</option>
                  </SelectDropdown>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <ChevronDown size={16} />
                  </div>
                </div>
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
                    <SelectDropdown variant="form" 
                      value={newActivity.status} 
                      onChange={e => setNewActivity({ ...newActivity, status: e.target.value })}
                      className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white text-slate-700 transition-all font-medium cursor-pointer appearance-none pr-10"
                    >
                      <option value="draft">Draft (Hidden)</option>
                      <option value="uji_coba">Uji Coba (Sandbox)</option>
                      <option value="published">Published (Visible)</option>
                      <option value="selesai">Selesai (Finished)</option>
                    </SelectDropdown>
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

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Fokus Pendataan</label>
                <div className="relative">
                  <SelectDropdown variant="form" 
                    value={editForm.fokus} 
                    onChange={e => setEditForm({ ...editForm, fokus: e.target.value })}
                    required
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white text-slate-700 transition-all font-medium cursor-pointer appearance-none pr-10"
                  >
                    <option value="">-- Pilih Fokus Pendataan --</option>
                    <option value="Keluarga">Keluarga</option>
                    <option value="Rumah Tangga">Rumah Tangga</option>
                    <option value="Tim">Tim</option>
                    <option value="Individu">Individu</option>
                    <option value="Perusahaan">Perusahaan</option>
                  </SelectDropdown>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <ChevronDown size={16} />
                  </div>
                </div>
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
                    <SelectDropdown variant="form" 
                      value={editForm.status} 
                      onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white text-slate-700 transition-all font-medium cursor-pointer appearance-none pr-10"
                    >
                      <option value="draft">Draft (Hidden)</option>
                      <option value="uji_coba">Uji Coba (Sandbox)</option>
                      <option value="published">Published (Visible)</option>
                      <option value="selesai">Selesai (Finished)</option>
                    </SelectDropdown>
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
                            <SelectDropdown variant="form"
                              value={activeRole}
                              onChange={(e) => handleOfficerRoleChangeInModal(p.name, e.target.value)}
                              className="appearance-none text-[10px] font-bold pl-3 pr-7 py-1.5 bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50/50 rounded-xl text-slate-750 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold"
                            >
                              <option value="PCL">PCL (Pendata)</option>
                              <option value="PML">PML (Pengawas)</option>
                            </SelectDropdown>
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

            {showConfirmModal.type === "publish_activity" && (
              <div>
                <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                  Anda akan mempublikasikan kegiatan <strong>{showConfirmModal.data.name}</strong>.
                </p>
                <div className="p-3 bg-blue-50 text-blue-700 text-[11px] font-medium rounded-xl border border-blue-100 mb-6 leading-relaxed">
                  ℹ️ Info: Status kegiatan akan berubah menjadi <strong>Published</strong>. Lokus wilayah tugas tidak akan bisa diubah lagi.
                </div>
              </div>
            )}

            {showConfirmModal.type === "finish_activity" && (
              <div>
                <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                  Apakah Anda yakin ingin menyelesaikan kegiatan <strong>{showConfirmModal.data.name}</strong>?
                </p>
                <div className="p-3 bg-red-50 text-red-700 text-[11px] font-bold rounded-xl border border-red-100 mb-6 leading-relaxed">
                  ⚠️ PENTING: Tindakan ini permanen! Setelah diselesaikan, seluruh data kegiatan (Lokus & Petugas) tidak akan bisa diedit atau diubah lagi.
                </div>
              </div>
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
                  showConfirmModal.type === "delete_activity" || showConfirmModal.type === "unassign_officer" || showConfirmModal.type === "transition_warning" || showConfirmModal.type === "finish_activity"
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
      {/* ======================================================== */}
      {/* MODAL: DETAIL ERROR VALIDASI PUBLISH */}
      {/* ======================================================== */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade"
          onClick={() => setShowValidationModal(false)}
        >
          <div className="bg-white rounded-2xl p-8 w-full shadow-lg animate-zoom"
            style={{ maxWidth: 500 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-red-50 text-red-600">
              <ShieldAlert size={24}/>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Gagal Mempublikasikan Kegiatan
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Ada beberapa kondisi yang belum terpenuhi sebelum kegiatan ini dipublikasikan:
            </p>

            <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 max-h-[240px] overflow-y-auto scrollbar-thin mb-6">
              <ul className="list-disc pl-4 space-y-2 text-[11px] font-semibold text-red-700 leading-relaxed">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>

            <button 
              onClick={() => setShowValidationModal(false)}
              className="w-full py-3 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-all border-0 cursor-pointer"
            >
              Tutup & Lengkapi
            </button>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}

export default AdminKegiatan;
