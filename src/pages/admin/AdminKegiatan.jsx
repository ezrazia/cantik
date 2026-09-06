import SelectDropdown from '../../components/ui/SelectDropdown';
import { useState, useEffect } from "react";
import AdminLayout from "../../components/layouts/AdminLayout";
import { 
  Plus, Search, Edit, Trash2, Calendar, Check, X, AlertTriangle, 
  Users, Briefcase, ChevronRight, UserPlus, UserMinus, Eye, FileText, CheckCircle, ArrowLeft, ShieldAlert, ChevronDown,
  Save, Target, Building, MessageSquare, CheckSquare, XCircle, Clock, Key, Copy, MapPin, Layers, Sparkles
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

  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "{}");
    } catch {
      return {};
    }
  });

  const isAdminDesa = currentUser?.role === 'admin_desa';
  const currentDesa = currentUser?.desa || '';
  const [bpsTabFilter, setBpsTabFilter] = useState("semua"); // "semua" | "pengajuan"
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  // States untuk Manajemen Akun Admin Desa (Khusus BPS)
  const [showAdminDesaModal, setShowAdminDesaModal] = useState(false);
  const [adminDesaList, setAdminDesaList] = useState([]);
  const [adminDesaSearch, setAdminDesaSearch] = useState("");
  const [loadingAdminDesa, setLoadingAdminDesa] = useState(false);
  const [resetPassModal, setResetPassModal] = useState({ open: false, admin: null, newPassword: "admin123" });
  const [createAdminDesaModal, setCreateAdminDesaModal] = useState({ open: false, desa: "", username: "", password: "admin123", nama: "" });

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

  // Form states untuk tambah kegiatan BPS
  const [newActivity, setNewActivity] = useState({
    name: "",
    desc: "",
    date: "",
    status: "draft",
    fokus: ""
  });

  // Helper normalisasi nama desa
  const cleanDesa = (d) => String(d || '').toLowerCase().replace(/^desa\s+/, '').trim();

  // Helper penyaring petugas yang bertugas di desa ini
  const isPetugasInDesa = (p) => {
    if (!currentDesa) return true;
    const clean = cleanDesa(currentDesa);
    const pDesa = cleanDesa(p.desa || p.asalDesa);
    if (!pDesa) return false;
    return pDesa === clean || pDesa.includes(clean) || clean.includes(pDesa);
  };
  const desaOfficers = (petugas || []).filter(isPetugasInDesa);

  // Helper untuk mendapatkan daftar SLS/RT yang tersedia di desa ini (dari sumber kegiatan atau master wilayah)
  const getAvailableDesaSls = (sourceKegId) => {
    const slsMap = new Map();
    if (sourceKegId) {
      const src = activities.find(a => a.id === parseInt(sourceKegId, 10));
      if (src && src.lokus && Array.isArray(src.lokus.sls)) {
        src.lokus.sls.forEach(s => {
          if (s) {
            const digits = String(s).replace(/\D/g, '');
            const cleanKey = digits ? `RT ${digits.padStart(2, '0')}` : String(s).trim();
            if (!slsMap.has(cleanKey)) {
              slsMap.set(cleanKey, s);
            }
          }
        });
      }
    }
    if (allWilayah && allWilayah.length > 0) {
      const clean = cleanDesa(currentDesa);
      allWilayah.forEach(w => {
        if (cleanDesa(w.desa) === clean && w.sls) {
          const digits = String(w.sls).replace(/\D/g, '');
          const cleanKey = digits ? `RT ${digits.padStart(2, '0')}` : String(w.sls).trim();
          if (!slsMap.has(cleanKey)) {
            slsMap.set(cleanKey, w.sls);
          }
        }
      });
    }
    if (slsMap.size === 0) {
      ['RT 01', 'RT 02', 'RT 03', 'RT 04'].forEach(rt => slsMap.set(rt, rt));
    }

    return Array.from(slsMap.entries()).map(([cleanKey, original]) => ({
      cleanKey,
      original
    })).sort((a, b) => {
      const numA = parseInt(a.cleanKey.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.cleanKey.replace(/\D/g, '') || '0', 10);
      return numA - numB;
    });
  };

  // Form states untuk pengajuan kegiatan oleh Desa
  const [desaPengajuanForm, setDesaPengajuanForm] = useState({
    name: "",
    desc: "",
    date: "",
    fokus: "Keluarga",
    use_prelist: true,
    source_kegiatan_id: "",
    selected_sls: [],
    default_pml_id: "",
    rt_assignments: {} // { [rtKey]: { pml_id: string, pcl_ids: number[] } }
  });

  // Handler pengubahan PML default umum (otomatis terapkan ke semua RT yang belum punya PML khusus)
  const handleGlobalPmlChange = (newPmlId) => {
    setDesaPengajuanForm(prev => {
      const nextAssignments = { ...prev.rt_assignments };
      (prev.selected_sls || []).forEach(rtKey => {
        const current = nextAssignments[rtKey] || { pcl_ids: [], pml_id: "" };
        nextAssignments[rtKey] = {
          ...current,
          pml_id: newPmlId,
          // Jangan biarkan PML terpilih sekaligus menjadi PCL di RT tersebut
          pcl_ids: (current.pcl_ids || []).filter(id => String(id) !== String(newPmlId))
        };
      });
      return {
        ...prev,
        default_pml_id: newPmlId,
        rt_assignments: nextAssignments
      };
    });
  };

  // Handler pengubahan PML khusus untuk satu RT tertentu
  const handleRtPmlChange = (rtKey, pmlId) => {
    setDesaPengajuanForm(prev => {
      const current = prev.rt_assignments[rtKey] || { pcl_ids: [], pml_id: prev.default_pml_id || "" };
      return {
        ...prev,
        rt_assignments: {
          ...prev.rt_assignments,
          [rtKey]: {
            ...current,
            pml_id: pmlId,
            pcl_ids: (current.pcl_ids || []).filter(id => String(id) !== String(pmlId))
          }
        }
      };
    });
  };

  // Handler toggle PCL untuk RT tertentu
  const handleRtPclToggle = (rtKey, pclId) => {
    setDesaPengajuanForm(prev => {
      const current = prev.rt_assignments[rtKey] || { pcl_ids: [], pml_id: prev.default_pml_id || "" };
      const currentPclIds = current.pcl_ids || [];
      const exists = currentPclIds.includes(pclId);
      const nextPclIds = exists
        ? currentPclIds.filter(id => id !== pclId)
        : [...currentPclIds, pclId];

      return {
        ...prev,
        rt_assignments: {
          ...prev.rt_assignments,
          [rtKey]: {
            ...current,
            pcl_ids: nextPclIds
          }
        }
      };
    });
  };

  // Handler pilih semua PCL yang tersedia untuk satu RT
  const handleSelectAllPclForRt = (rtKey) => {
    setDesaPengajuanForm(prev => {
      const current = prev.rt_assignments[rtKey] || { pcl_ids: [], pml_id: prev.default_pml_id || "" };
      const currentPml = current.pml_id || prev.default_pml_id;
      const allPcls = desaOfficers
        .filter(p => String(p.id) !== String(currentPml))
        .map(p => p.id);

      return {
        ...prev,
        rt_assignments: {
          ...prev.rt_assignments,
          [rtKey]: {
            ...current,
            pcl_ids: allPcls
          }
        }
      };
    });
  };

  // Handler reset PCL untuk satu RT
  const handleClearPclForRt = (rtKey) => {
    setDesaPengajuanForm(prev => {
      const current = prev.rt_assignments[rtKey] || { pcl_ids: [], pml_id: prev.default_pml_id || "" };
      return {
        ...prev,
        rt_assignments: {
          ...prev.rt_assignments,
          [rtKey]: {
            ...current,
            pcl_ids: []
          }
        }
      };
    });
  };

  // Helper cerdas: Terapkan konfigurasi petugas dari satu RT ke semua RT lain yang dipilih
  const handleApplyRtToAll = (sourceRtKey) => {
    setDesaPengajuanForm(prev => {
      const source = prev.rt_assignments[sourceRtKey] || { pcl_ids: [], pml_id: prev.default_pml_id || "" };
      const nextAssignments = { ...prev.rt_assignments };
      (prev.selected_sls || []).forEach(rt => {
        nextAssignments[rt] = {
          pml_id: source.pml_id,
          pcl_ids: [...(source.pcl_ids || [])]
        };
      });
      return {
        ...prev,
        rt_assignments: nextAssignments
      };
    });
  };

  const [rejectModalData, setRejectModalData] = useState({ open: false, activity: null, catatan: "" });
  const [approveModalData, setApproveModalData] = useState({ open: false, activity: null });
  const [copiedUser, setCopiedUser] = useState(null);

  const fetchAdminDesa = async () => {
    setLoadingAdminDesa(true);
    try {
      const res = await api.adminDesa.getAll();
      if (res && res.success) {
        setAdminDesaList(res.data || []);
      }
    } catch (err) {
      console.error("Gagal mengambil daftar admin desa:", err);
    } finally {
      setLoadingAdminDesa(false);
    }
  };

  const handleResetPasswordDesa = async (adminId, newPass) => {
    try {
      const res = await api.adminDesa.resetPassword(adminId, newPass);
      if (res && res.success) {
        alert("Password admin desa berhasil diperbarui!");
        setResetPassModal({ open: false, admin: null, newPassword: "admin123" });
        fetchAdminDesa();
      }
    } catch (err) {
      alert("Gagal reset password: " + err.message);
    }
  };

  // Form states untuk edit kegiatan
  const [editForm, setEditForm] = useState({
    name: "",
    desc: "",
    date: "",
    status: "draft",
    fokus: ""
  });

  // Helper untuk mencocokkan kegiatan dengan desa admin desa secara fleksibel
  const isMatchDesa = (act, desa) => {
    if (!act || !desa) return false;
    const clean = String(desa).trim().toLowerCase();
    if (act.desa && String(act.desa).trim().toLowerCase() === clean) return true;
    if (act.name && act.name.toLowerCase().includes(clean)) return true;
    const lokusDesas = (act.lokus?.desa || []).map(d => String(d).trim().toLowerCase());
    return lokusDesas.some(d => d.includes(clean) || clean.includes(d));
  };

  // Filter & Search Logic untuk kegiatan
  const filteredActivities = activities
    .filter(act => {
      if (isAdminDesa) {
        // Admin Desa HANYA melihat kegiatan miliknya / desanya
        return isMatchDesa(act, currentDesa);
      }
      if (bpsTabFilter === "pengajuan") {
        return act.status === "pengajuan" || act.status === "ditolak";
      }
      return true;
    })
    .filter(act => 
      act.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (act.description || act.desc || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (act.desa || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Sumber kegiatan yang tersedia untuk dijadikan prelist bagi desa
  const prelistSources = activities.filter(a => 
    a.status === "published" || a.status === "selesai" || isMatchDesa(a, currentDesa)
  );

  // Handler pengajuan kegiatan baru oleh Admin Desa dengan penugasan PCL per-RT
  const handlePengajuanDesaSubmit = async (e) => {
    e.preventDefault();
    if (!desaPengajuanForm.name.trim()) {
      alert("Nama kegiatan wajib diisi");
      return;
    }
    if (desaPengajuanForm.use_prelist && !desaPengajuanForm.source_kegiatan_id) {
      alert("Pilih kegiatan sumber prelist terlebih dahulu");
      return;
    }
    if (!desaPengajuanForm.selected_sls || desaPengajuanForm.selected_sls.length === 0) {
      alert("Pilih minimal satu Lokus RT / SLS yang akan disurvei");
      return;
    }

    // Validasi: setiap RT yang dipilih harus memiliki minimal satu PCL
    const unassignedRts = [];
    desaPengajuanForm.selected_sls.forEach(rtKey => {
      const asg = desaPengajuanForm.rt_assignments[rtKey];
      if (!asg || !Array.isArray(asg.pcl_ids) || asg.pcl_ids.length === 0) {
        unassignedRts.push(rtKey);
      }
    });

    if (unassignedRts.length > 0) {
      alert(`Mohon tentukan minimal satu Petugas Pencacah (PCL) untuk RT berikut:\n- ${unassignedRts.join('\n- ')}`);
      return;
    }

    try {
      setIsProcessingApproval(true);

      const finalSlsAssignments = {};
      const allPclIdsSet = new Set();
      const allPmlIdsSet = new Set();

      desaPengajuanForm.selected_sls.forEach(rtKey => {
        const asg = desaPengajuanForm.rt_assignments[rtKey] || { pcl_ids: [], pml_id: desaPengajuanForm.default_pml_id || "" };
        const pmlId = asg.pml_id || desaPengajuanForm.default_pml_id || null;
        const pmlObj = pmlId ? desaOfficers.find(p => String(p.id) === String(pmlId)) : null;
        const pclObjs = (asg.pcl_ids || []).map(id => desaOfficers.find(p => p.id === id)).filter(Boolean);

        if (pmlObj) allPmlIdsSet.add(pmlObj.id);
        (asg.pcl_ids || []).forEach(id => allPclIdsSet.add(id));

        finalSlsAssignments[rtKey] = {
          pml_id: pmlObj ? pmlObj.id : null,
          pml: pmlObj ? (pmlObj.name || pmlObj.username) : null,
          pcl_ids: asg.pcl_ids || [],
          pcls: pclObjs.map(p => p.name || p.username)
        };
      });

      const payload = {
        name: desaPengajuanForm.name.trim(),
        description: desaPengajuanForm.desc.trim(),
        fokus: desaPengajuanForm.fokus || "Keluarga",
        start_date: desaPengajuanForm.date || null,
        desa: currentDesa,
        use_prelist: Boolean(desaPengajuanForm.use_prelist),
        source_kegiatan_id: desaPengajuanForm.use_prelist && desaPengajuanForm.source_kegiatan_id 
          ? parseInt(desaPengajuanForm.source_kegiatan_id, 10) 
          : null,
        selected_sls: desaPengajuanForm.selected_sls,
        selected_pml_id: desaPengajuanForm.default_pml_id ? parseInt(desaPengajuanForm.default_pml_id, 10) : null,
        selected_pcl_ids: Array.from(allPclIdsSet),
        sls_assignments: finalSlsAssignments
      };

      const res = await api.kegiatan.pengajuanDesa(payload);
      if (res && res.success) {
        await refreshData();
        setShowAddModal(false);
        setDesaPengajuanForm({
          name: "",
          desc: "",
          date: "",
          fokus: "Keluarga",
          use_prelist: true,
          source_kegiatan_id: "",
          selected_sls: [],
          default_pml_id: "",
          rt_assignments: {}
        });
        alert("Pengajuan kegiatan berhasil dikirimkan ke Admin BPS! Pembagian PCL per RT telah tersimpan dengan rapi.");
      } else {
        alert(res?.message || "Gagal mengirim pengajuan kegiatan");
      }
    } catch (err) {
      alert("Gagal mengirim pengajuan kegiatan: " + err.message);
    } finally {
      setIsProcessingApproval(false);
    }
  };

  // Handler persetujuan pengajuan oleh BPS (Langsung Memulai / Published + Kloning Prelist)
  const handleApprovePengajuan = async (activity) => {
    try {
      setIsProcessingApproval(true);
      const res = await api.kegiatan.approvePengajuan(activity.id);
      if (res && res.success) {
        await refreshData();
        setApproveModalData({ open: false, activity: null });
        alert(`Kegiatan "${activity.name}" berhasil disetujui dan langsung aktif (Published)! Form kuesioner dan data prelist desa ${activity.desa || ''} telah disalin lengkap.`);
      } else {
        alert(res?.message || "Gagal menyetujui pengajuan kegiatan");
      }
    } catch (err) {
      alert("Gagal menyetujui pengajuan kegiatan: " + err.message);
    } finally {
      setIsProcessingApproval(false);
    }
  };

  // Handler penolakan pengajuan oleh BPS
  const handleRejectPengajuan = async (e) => {
    e.preventDefault();
    if (!rejectModalData.activity) return;

    try {
      setIsProcessingApproval(true);
      const res = await api.kegiatan.rejectPengajuan(rejectModalData.activity.id, rejectModalData.catatan);
      if (res && res.success) {
        await refreshData();
        setRejectModalData({ open: false, activity: null, catatan: "" });
        alert("Pengajuan kegiatan telah ditolak dengan catatan.");
      } else {
        alert(res?.message || "Gagal menolak pengajuan kegiatan");
      }
    } catch (err) {
      alert("Gagal menolak pengajuan kegiatan: " + err.message);
    } finally {
      setIsProcessingApproval(false);
    }
  };

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
  // Helper mapping status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case "published":
        return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100/50">Published (Visible)</span>;
      case "uji_coba":
        return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/50">Uji Coba (Sandbox)</span>;
      case "selesai":
        return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/50">Selesai (Finished)</span>;
      case "pengajuan":
        return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200/50 flex items-center gap-1">Menunggu Persetujuan BPS</span>;
      case "ditolak":
        return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/50 flex items-center gap-1">Ditolak BPS</span>;
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
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {isAdminDesa ? `Manajemen Kegiatan Desa ${currentDesa}` : "Manajemen Kegiatan BPS"}
                </h1>
                <p className="text-xs font-medium text-slate-400 mt-1.5">
                  {isAdminDesa 
                    ? `Ajukan kegiatan baru untuk disetujui BPS, gunakan data survei sebelumnya sebagai prelist, dan pantau kegiatan Desa ${currentDesa}.`
                    : "Rancang kegiatan survei baru, tanggapi pengajuan kegiatan dari desa, dan kelola penugasan petugas lapangan."
                  }
                </p>
              </div>

              <div className="flex items-center gap-3">
                {!isAdminDesa && (
                  <button 
                    onClick={() => {
                      fetchAdminDesa();
                      setShowAdminDesaModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 rounded-xl border border-slate-200 shadow-sm cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <Key size={14} className="text-amber-500" />
                    <span>Daftar Akun Desa</span>
                  </button>
                )}
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-blue-600 text-white rounded-xl border-0 cursor-pointer hover:bg-blue-700 transition-all active:scale-[0.98]"
                >
                  <Plus size={14}/> {isAdminDesa ? "Ajukan Kegiatan Baru" : "Tambah Kegiatan BPS"}
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
                  <p className="text-xs text-slate-400 font-medium">{isAdminDesa ? "Kegiatan Desaku" : "Total Kegiatan"}</p>
                  <p className="mono text-lg font-bold text-slate-900">
                    {isAdminDesa ? activities.filter(a => isMatchDesa(a, currentDesa)).length : activities.length}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
                  <CheckCircle size={18} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Berjalan (Published)</p>
                  <p className="mono text-lg font-bold text-emerald-600">
                    {(isAdminDesa ? activities.filter(a => isMatchDesa(a, currentDesa)) : activities).filter(a => a.status === "published").length}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">
                    {isAdminDesa ? "Menunggu BPS" : "Pengajuan Desa"}
                  </p>
                  <p className="mono text-lg font-bold text-amber-600">
                    {(isAdminDesa ? activities.filter(a => isMatchDesa(a, currentDesa)) : activities).filter(a => a.status === "pengajuan").length}
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
                    {(isAdminDesa ? activities.filter(a => isMatchDesa(a, currentDesa)) : activities).filter(a => a.status === "selesai").length}
                  </p>
                </div>
              </div>
            </div>

            {/* BPS Tabs & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              {!isAdminDesa ? (
                <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-xl">
                  <button
                    onClick={() => setBpsTabFilter("semua")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
                      bpsTabFilter === "semua"
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-800 bg-transparent"
                    }`}
                  >
                    Semua Kegiatan ({activities.length})
                  </button>
                  <button
                    onClick={() => setBpsTabFilter("pengajuan")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
                      bpsTabFilter === "pengajuan"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-800 bg-transparent"
                    }`}
                  >
                    <span>Pengajuan dari Desa</span>
                    {activities.filter(a => a.status === "pengajuan").length > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-black bg-amber-500 text-white rounded-full">
                        {activities.filter(a => a.status === "pengajuan").length}
                      </span>
                    )}
                  </button>
                </div>
              ) : <div />}

              {/* Search Bar */}
              <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all w-full md:w-80">
                <Search size={16} className="text-slate-400"/>
                <input 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="text-sm outline-none text-slate-700 placeholder-slate-400 w-full bg-transparent font-medium" 
                  placeholder={isAdminDesa ? "Cari kegiatan desa..." : "Cari kegiatan atau desa..."}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="bg-transparent border-0 text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X size={14}/>
                  </button>
                )}
              </div>
            </div>

            {/* Grid of Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredActivities.map(act => {
                const actOfficersCount = petugas.filter(p => p.projects && p.projects.includes(act.name)).length;
                const isPengajuan = act.status === "pengajuan";
                const isDitolak = act.status === "ditolak";

                return (
                  <div 
                    key={act.id || act.name}
                    onClick={() => {
                      if (!isPengajuan && !isDitolak) {
                        onProjectChange(act.name); 
                        onNavigate("admin-detail-kegiatan");
                      }
                    }}
                    className={`border border-slate-100 rounded-2xl p-6 bg-white transition-all flex flex-col justify-between min-h-[210px] ${
                      !isPengajuan && !isDitolak 
                        ? "hover:border-blue-300 cursor-pointer hover:shadow-md hover:scale-[1.01]" 
                        : "border-slate-200 shadow-sm"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                        {getStatusBadge(act.status)}
                        
                        {act.desa && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                            <Building size={10}/> {act.desa}
                          </span>
                        )}

                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Users size={11}/> {actOfficersCount} Petugas
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-800 tracking-tight leading-snug">{act.name}</h3>
                      
                      {act.source_kegiatan_id && (
                        <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-100">
                          <CheckSquare size={10} /> Prelist dari Kegiatan #{act.source_kegiatan_id}
                        </div>
                      )}

                      {act.lokus?.sls && Array.isArray(act.lokus.sls) && act.lokus.sls.length > 0 && (
                        <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] font-bold text-blue-700 flex items-center gap-0.5">
                            <MapPin size={10} />
                            <span>Lokus:</span>
                          </span>
                          {act.lokus.sls.map((s, idx) => (
                            <span key={idx} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-slate-400 font-medium leading-relaxed mt-2 mb-3 line-clamp-2">
                        {act.description || act.desc || "Tidak ada deskripsi"}
                      </p>

                      {/* Catatan Revisi jika Ditolak */}
                      {isDitolak && act.catatan_revisi && (
                        <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-[11px] text-rose-700 font-medium">
                          <strong>Catatan BPS:</strong> {act.catatan_revisi}
                        </div>
                      )}

                      {/* Aksi Persetujuan Khusus Admin BPS pada Kegiatan Pengajuan */}
                      {!isAdminDesa && isPengajuan && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={isProcessingApproval}
                            onClick={() => setApproveModalData({ open: true, activity: act })}
                            className="flex-1 py-2 px-3 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 border-0 cursor-pointer transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            <CheckCircle size={13}/> Setujui & Mulai
                          </button>
                          <button
                            type="button"
                            disabled={isProcessingApproval}
                            onClick={() => setRejectModalData({ open: true, activity: act, catatan: "" })}
                            className="py-2 px-3 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 cursor-pointer transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            <XCircle size={13}/> Tolak
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-50 text-[10px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12}/> {act.start_date ? new Date(act.start_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
                      </span>
                      
                      {isPengajuan ? (
                        <span className="text-amber-600 font-bold">
                          {isAdminDesa ? "Menunggu BPS..." : "Perlu Persetujuan"}
                        </span>
                      ) : isDitolak ? (
                        <span className="text-rose-600 font-bold">
                          Ditolak
                        </span>
                      ) : (
                        <span className="text-blue-600 font-semibold flex items-center gap-0.5 hover:translate-x-0.5 transition-transform">
                          Buka Detail <ChevronRight size={13}/>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredActivities.length === 0 && (
                <div className="col-span-full bg-white rounded-2xl border border-slate-100 py-20 text-center">
                  <Briefcase size={32} className="text-slate-200 mx-auto mb-2"/>
                  <p className="text-xs text-slate-400 font-semibold">Kegiatan tidak ditemukan</p>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {isAdminDesa 
                      ? "Gunakan tombol 'Ajukan Kegiatan Baru' untuk mengajukan pendataan di desa Anda."
                      : "Tidak ada kegiatan yang sesuai dengan filter saat ini."
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
      </div>
        
{/* ======================================================== */}
      {/* MODAL: TAMBAH KEGIATAN */}
      {/* ======================================================== */}      {/* ======================================================== */}
      {/* MODAL: TAMBAH KEGIATAN (BPS) ATAU PENGAJUAN (DESA) */}
      {/* ======================================================== */}
      {showAddModal && (() => {
        // Hitung statistik penugasan petugas secara real-time
        const allAssignedPclIds = new Set();
        let hasIncompleteRt = false;
        (desaPengajuanForm.selected_sls || []).forEach(rtKey => {
          const asg = desaPengajuanForm.rt_assignments[rtKey];
          if (!asg || !Array.isArray(asg.pcl_ids) || asg.pcl_ids.length === 0) {
            hasIncompleteRt = true;
          } else {
            asg.pcl_ids.forEach(id => allAssignedPclIds.add(id));
          }
        });
        const allRtsHavePcl = (desaPengajuanForm.selected_sls || []).length > 0 && !hasIncompleteRt;

        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 md:p-6 animate-fade"
            onClick={() => setShowAddModal(false)}
          >
            <div 
              className={`bg-white rounded-2xl sm:rounded-3xl w-full shadow-2xl animate-zoom flex flex-col ${
                isAdminDesa ? "max-h-[94vh] p-4 sm:p-6 md:p-7" : "max-h-[90vh] p-8 overflow-y-auto scrollbar-thin"
              }`}
              style={{ maxWidth: isAdminDesa ? "min(1240px, 98vw)" : 480 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 shrink-0">
                    <Briefcase size={22}/>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">
                        {isAdminDesa ? "Ajukan Kegiatan Desa Baru" : "Tambah Kegiatan BPS Baru"}
                      </h3>
                      {isAdminDesa && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                          Desa {currentDesa}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed line-clamp-1 sm:line-clamp-none">
                      {isAdminDesa
                        ? "Pilih RT yang disurvei dan tentukan pembagian petugas (PCL & PML) per masing-masing RT secara spesifik dalam satu pengajuan."
                        : "Buat kegiatan survei atau pendataan baru untuk memantau pencacahan."
                      }
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer border-0 bg-transparent shrink-0"
                  title="Tutup Modal"
                >
                  <X size={20} />
                </button>
              </div>

              {isAdminDesa ? (
                /* FORM PENGAJUAN OLEH ADMIN DESA (WIDESCREEN RESPONSIVE DENGAN ASSIGNMENT PER-RT) */
                <form onSubmit={handlePengajuanDesaSubmit} className="flex flex-col flex-1 min-h-0 pt-3 sm:pt-4">
                  {/* Scrollable Container */}
                  <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 scrollbar-thin space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
                      
                      {/* ======================================================== */}
                      {/* KOLOM KIRI: PARAMETER & LOKUS RT KEGIATAN */}
                      {/* ======================================================== */}
                      <div className="lg:col-span-5 space-y-4">
                        
                        {/* Card 1: Informasi Kegiatan */}
                        <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                            <FileText size={14} className="text-blue-600" />
                            <span>1. Informasi Umum Kegiatan</span>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Nama Kegiatan <span className="text-rose-500">*</span></label>
                            <input 
                              type="text" 
                              value={desaPengajuanForm.name} 
                              onChange={e => setDesaPengajuanForm({ ...desaPengajuanForm, name: e.target.value })} 
                              required
                              placeholder={`Contoh: Pendataan Potensi Desa ${currentDesa} 2026`} 
                              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-700 placeholder:text-slate-300 transition-all font-medium"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Deskripsi Kegiatan</label>
                            <textarea 
                              value={desaPengajuanForm.desc} 
                              onChange={e => setDesaPengajuanForm({ ...desaPengajuanForm, desc: e.target.value })} 
                              rows={2}
                              placeholder="Jelaskan tujuan pendataan desa ini..." 
                              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-700 placeholder:text-slate-300 transition-all font-medium resize-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Fokus Pendataan</label>
                              <div className="relative">
                                <SelectDropdown variant="form" 
                                  value={desaPengajuanForm.fokus} 
                                  onChange={e => setDesaPengajuanForm({ ...desaPengajuanForm, fokus: e.target.value })}
                                  required
                                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white text-slate-700 font-medium cursor-pointer"
                                >
                                  <option value="Keluarga">Keluarga</option>
                                  <option value="Rumah Tangga">Rumah Tangga</option>
                                  <option value="Tim">Tim</option>
                                  <option value="Individu">Individu</option>
                                  <option value="Perusahaan">Perusahaan</option>
                                </SelectDropdown>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Perkiraan Mulai</label>
                              <input 
                                type="date" 
                                value={desaPengajuanForm.date} 
                                onChange={e => setDesaPengajuanForm({ ...desaPengajuanForm, date: e.target.value })} 
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white text-slate-700 font-medium cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Card 2: Sumber Data & Prelist */}
                        <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/40 space-y-3">
                          <label className="flex items-start gap-2.5 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={desaPengajuanForm.use_prelist}
                              onChange={e => {
                                const checked = e.target.checked;
                                setDesaPengajuanForm(prev => {
                                  const nextSource = checked ? prev.source_kegiatan_id : "";
                                  const avail = getAvailableDesaSls(nextSource);
                                  const initialSls = avail.map(a => a.original || a.cleanKey);
                                  const nextAssignments = { ...prev.rt_assignments };
                                  initialSls.forEach(rt => {
                                    if (!nextAssignments[rt]) {
                                      nextAssignments[rt] = { pml_id: prev.default_pml_id || "", pcl_ids: [] };
                                    }
                                  });
                                  return {
                                    ...prev,
                                    use_prelist: checked,
                                    source_kegiatan_id: nextSource,
                                    selected_sls: initialSls,
                                    rt_assignments: nextAssignments
                                  };
                                });
                              }}
                              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500/20 w-4 h-4 cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-800">Gunakan Data Survei Sebelumnya Sebagai Prelist</span>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                Form kuesioner dan data prelist warga Desa {currentDesa} dari kegiatan survei sebelumnya akan otomatis dikloning ke kegiatan baru.
                              </p>
                            </div>
                          </label>

                          {desaPengajuanForm.use_prelist && (
                            <div className="pt-2.5 border-t border-blue-100/60">
                              <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Pilih Kegiatan Sumber Prelist <span className="text-rose-500">*</span></label>
                              <SelectDropdown variant="form"
                                value={desaPengajuanForm.source_kegiatan_id}
                                onChange={e => {
                                  const newSourceId = e.target.value;
                                  const avail = getAvailableDesaSls(newSourceId);
                                  const initialSls = avail.map(a => a.original || a.cleanKey);
                                  setDesaPengajuanForm(prev => {
                                    const nextAssignments = { ...prev.rt_assignments };
                                    initialSls.forEach(rt => {
                                      if (!nextAssignments[rt]) {
                                        nextAssignments[rt] = { pml_id: prev.default_pml_id || "", pcl_ids: [] };
                                      }
                                    });
                                    return {
                                      ...prev,
                                      source_kegiatan_id: newSourceId,
                                      selected_sls: initialSls,
                                      rt_assignments: nextAssignments
                                    };
                                  });
                                }}
                                required={desaPengajuanForm.use_prelist}
                                className="w-full px-3 py-2 text-xs border border-blue-200 rounded-xl outline-none focus:border-blue-500 bg-white text-slate-700 font-semibold cursor-pointer"
                              >
                                <option value="">-- Pilih Kegiatan Sumber --</option>
                                {prelistSources.map(act => (
                                  <option key={act.id} value={act.id}>
                                    {act.name} ({act.status})
                                  </option>
                                ))}
                              </SelectDropdown>
                            </div>
                          )}
                        </div>

                        {/* Card 3: Lokus RT / SLS yang Disurvei */}
                        <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <MapPin size={14} className="text-blue-600" />
                                <span>2. Pilih Lokus RT yang Disurvei</span>
                              </label>
                              <p className="text-[11px] text-slate-500">
                                Pilih RT yang disurvei. Dokumen prelist di RT yang dipilih akan dikloning.
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const avail = getAvailableDesaSls(desaPengajuanForm.source_kegiatan_id);
                                  const allRts = avail.map(a => a.original || a.cleanKey);
                                  setDesaPengajuanForm(prev => {
                                    const nextAssignments = { ...prev.rt_assignments };
                                    allRts.forEach(rt => {
                                      if (!nextAssignments[rt]) {
                                        nextAssignments[rt] = { pml_id: prev.default_pml_id || "", pcl_ids: [] };
                                      }
                                    });
                                    return {
                                      ...prev,
                                      selected_sls: allRts,
                                      rt_assignments: nextAssignments
                                    };
                                  });
                                }}
                                className="text-[10px] font-semibold px-2 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 border-0 cursor-pointer transition-colors"
                              >
                                Pilih Semua
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDesaPengajuanForm(prev => ({ ...prev, selected_sls: [] }));
                                }}
                                className="text-[10px] font-semibold px-2 py-1 rounded-md bg-slate-200 text-slate-600 hover:bg-slate-300 border-0 cursor-pointer transition-colors"
                              >
                                Reset
                              </button>
                            </div>
                          </div>

                          {/* Chips RT */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                            {getAvailableDesaSls(desaPengajuanForm.source_kegiatan_id).map(slsItem => {
                              const rtKey = slsItem.original || slsItem.cleanKey;
                              const isSelected = (desaPengajuanForm.selected_sls || []).some(s => {
                                const numA = parseInt(String(s).replace(/\D/g, '') || '0', 10);
                                const numB = parseInt(String(slsItem.cleanKey).replace(/\D/g, '') || '0', 10);
                                return numA === numB;
                              });

                              return (
                                <button
                                  key={slsItem.cleanKey}
                                  type="button"
                                  onClick={() => {
                                    setDesaPengajuanForm(prev => {
                                      const current = prev.selected_sls || [];
                                      const exists = current.some(s => {
                                        const numA = parseInt(String(s).replace(/\D/g, '') || '0', 10);
                                        const numB = parseInt(String(slsItem.cleanKey).replace(/\D/g, '') || '0', 10);
                                        return numA === numB;
                                      });
                                      const nextSls = exists
                                        ? current.filter(s => {
                                            const numA = parseInt(String(s).replace(/\D/g, '') || '0', 10);
                                            const numB = parseInt(String(slsItem.cleanKey).replace(/\D/g, '') || '0', 10);
                                            return numA !== numB;
                                          })
                                        : [...current, rtKey];

                                      const nextAssignments = { ...prev.rt_assignments };
                                      if (!exists && !nextAssignments[rtKey]) {
                                        nextAssignments[rtKey] = { pml_id: prev.default_pml_id || "", pcl_ids: [] };
                                      }

                                      return { 
                                        ...prev, 
                                        selected_sls: nextSls,
                                        rt_assignments: nextAssignments 
                                      };
                                    });
                                  }}
                                  className={`p-2.5 rounded-xl text-center border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                                    isSelected
                                      ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs scale-[1.02]"
                                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 font-medium"
                                  }`}
                                >
                                  {isSelected && <Check size={13} strokeWidth={3} className="shrink-0" />}
                                  <span className="text-xs truncate">{slsItem.cleanKey}</span>
                                </button>
                              );
                            })}
                          </div>

                          {(!desaPengajuanForm.selected_sls || desaPengajuanForm.selected_sls.length === 0) ? (
                            <p className="text-[11px] text-rose-500 font-semibold flex items-center gap-1 pt-1">
                              <AlertTriangle size={12} /> Pilih minimal satu RT yang akan disurvei.
                            </p>
                          ) : (
                            <p className="text-[11px] text-blue-700 font-medium flex items-center gap-1 pt-1">
                              <CheckCircle size={12} className="text-blue-600" />
                              <span><strong>{desaPengajuanForm.selected_sls.length} RT dipilih</strong>. Silakan atur penugasan PCL untuk masing-masing RT di sebelah kanan.</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* ======================================================== */}
                      {/* KOLOM KANAN: PENUGASAN PETUGAS PER-RT (THE CORE HIGHLIGHT) */}
                      {/* ======================================================== */}
                      <div className="lg:col-span-7 space-y-4">
                        <div className="p-4 sm:p-5 rounded-2xl border border-indigo-100 bg-indigo-50/30 space-y-4">
                          
                          {/* Header Penugasan */}
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                                <Users size={16} className="text-indigo-600" />
                                <span>3. Atur Penugasan Petugas per Masing-Masing RT</span>
                              </label>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Tentukan PCL yang bertugas di masing-masing RT. Anda bisa mengatur tim yang berbeda untuk tiap RT!
                              </p>
                            </div>
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200/50">
                              {desaOfficers.length} Petugas Desa Tersedia
                            </span>
                          </div>

                          {/* Bar PML Utama (Default untuk semua RT) */}
                          <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-indigo-100/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div>
                              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <ShieldAlert size={14} className="text-indigo-600" />
                                <span>PML Utama (Pengawas Umum)</span>
                              </span>
                              <p className="text-[10px] text-slate-400">
                                Otomatis diterapkan sebagai PML default ke seluruh RT terpilih.
                              </p>
                            </div>
                            <div className="w-full sm:w-64">
                              <SelectDropdown variant="form"
                                value={desaPengajuanForm.default_pml_id}
                                onChange={e => handleGlobalPmlChange(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs border border-indigo-200 rounded-lg outline-none focus:border-indigo-500 bg-white text-slate-700 font-medium cursor-pointer"
                              >
                                <option value="">-- Pilih PML Utama (Opsional) --</option>
                                {desaOfficers.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.username})
                                  </option>
                                ))}
                              </SelectDropdown>
                            </div>
                          </div>

                          {/* Info Helper Konsep Multi-PCL */}
                          <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-800 leading-relaxed flex items-start gap-2">
                            <Sparkles size={15} className="text-blue-600 shrink-0 mt-0.5" />
                            <span>
                              <strong>Fleksibel & Otomatis:</strong> Misal Anda memilih 4 RT sekaligus, Anda bisa menentukan RT 1 dikerjakan oleh PCL A & B, RT 2 oleh PCL C & D, dst. Dokumen warga di RT 1 hanya muncul di akun PCL A & B!
                            </span>
                          </div>

                          {/* Daftar Card Penugasan Tiap RT */}
                          <div className="space-y-3">
                            {(!desaPengajuanForm.selected_sls || desaPengajuanForm.selected_sls.length === 0) ? (
                              <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 bg-white text-center space-y-2">
                                <MapPin size={32} className="text-slate-300 mx-auto" />
                                <p className="text-xs font-bold text-slate-600">Belum Ada RT yang Dipilih</p>
                                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                                  Silakan klik satu atau beberapa tombol RT pada panel nomor 2 di sebelah kiri untuk mulai menentukan petugas PCL per RT.
                                </p>
                              </div>
                            ) : (
                              desaPengajuanForm.selected_sls.map((rtKey, idx) => {
                                const asg = desaPengajuanForm.rt_assignments[rtKey] || { pcl_ids: [], pml_id: desaPengajuanForm.default_pml_id || "" };
                                const currentPmlId = asg.pml_id || desaPengajuanForm.default_pml_id || "";
                                const pclCount = (asg.pcl_ids || []).length;
                                const isComplete = pclCount > 0;

                                // Cari nama ringkas RT
                                const digits = String(rtKey).replace(/\D/g, '');
                                const cleanLabel = digits ? `RT ${digits.padStart(2, '0')}` : rtKey;

                                return (
                                  <div 
                                    key={rtKey} 
                                    className={`bg-white rounded-2xl border transition-all p-3.5 sm:p-4 shadow-2xs space-y-3 ${
                                      isComplete ? "border-slate-200" : "border-amber-300 bg-amber-50/10"
                                    }`}
                                  >
                                    {/* RT Card Header */}
                                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-slate-100">
                                      <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 text-white tracking-wide">
                                          {cleanLabel}
                                        </span>
                                        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                                          ({rtKey})
                                        </span>
                                        {isComplete ? (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                            <Check size={11} strokeWidth={3} /> {pclCount} PCL Ditugaskan
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                            <AlertTriangle size={11} /> Belum Ada PCL
                                          </span>
                                        )}
                                      </div>

                                      {/* Quick Actions untuk RT ini */}
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {desaPengajuanForm.selected_sls.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => handleApplyRtToAll(rtKey)}
                                            className="text-[10px] font-semibold px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60 flex items-center gap-1 cursor-pointer transition-colors"
                                            title="Terapkan konfigurasi petugas RT ini ke seluruh RT terpilih lainnya"
                                          >
                                            <Copy size={11} /> Samakan ke Semua RT
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleSelectAllPclForRt(rtKey)}
                                          className="text-[10px] font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border-0 cursor-pointer transition-colors"
                                        >
                                          Pilih Semua PCL
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleClearPclForRt(rtKey)}
                                          className="text-[10px] font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 border-0 cursor-pointer transition-colors"
                                        >
                                          Reset
                                        </button>
                                      </div>
                                    </div>

                                    {/* RT PML Selection */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                                      <span className="text-[11px] font-bold text-slate-700">
                                        Pengawas (PML) untuk {cleanLabel}:
                                      </span>
                                      <div className="w-full sm:w-56">
                                        <SelectDropdown variant="form"
                                          value={currentPmlId}
                                          onChange={e => handleRtPmlChange(rtKey, e.target.value)}
                                          className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-white text-slate-700 font-medium cursor-pointer"
                                        >
                                          <option value="">-- Gunakan PML Utama --</option>
                                          {desaOfficers.map(p => (
                                            <option key={p.id} value={p.id}>
                                              {p.name} ({p.username})
                                            </option>
                                          ))}
                                        </SelectDropdown>
                                      </div>
                                    </div>

                                    {/* RT PCL Chips Selector */}
                                    <div>
                                      <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-[11px] font-bold text-slate-700">
                                          Pencacah (PCL) {cleanLabel} <span className="text-rose-500">*</span>:
                                        </label>
                                        <span className="text-[10px] text-slate-400">
                                          Klik nama petugas untuk memilih/menghapus
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                        {desaOfficers
                                          .filter(p => String(p.id) !== String(currentPmlId))
                                          .map(p => {
                                            const isSelected = (asg.pcl_ids || []).includes(p.id);
                                            return (
                                              <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => handleRtPclToggle(rtKey, p.id)}
                                                className={`p-2 rounded-xl text-left border flex items-center justify-between cursor-pointer transition-all ${
                                                  isSelected
                                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs scale-[1.01]"
                                                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
                                                }`}
                                              >
                                                <div className="min-w-0 pr-1">
                                                  <p className={`text-xs font-bold truncate ${isSelected ? "text-white" : "text-slate-800"}`}>
                                                    {p.name}
                                                  </p>
                                                  <p className={`text-[10px] truncate ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                                                    @{p.username}
                                                  </p>
                                                </div>
                                                <div className={`w-4 h-4 rounded shrink-0 flex items-center justify-center text-[10px] ${
                                                  isSelected ? "bg-white text-indigo-600 font-bold" : "border border-slate-300"
                                                }`}>
                                                  {isSelected ? <Check size={11} strokeWidth={3} /> : null}
                                                </div>
                                              </button>
                                            );
                                          })}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* ======================================================== */}
                  {/* FOOTER MODAL (STICKY SUMMARY & SUBMIT) */}
                  {/* ======================================================== */}
                  <div className="pt-4 mt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                        📍 {desaPengajuanForm.selected_sls.length} RT Terpilih
                      </span>
                      <span className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                        👥 {allAssignedPclIds.size} PCL Unik Terlibat
                      </span>
                      {allRtsHavePcl ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                          <CheckCircle size={13} className="text-emerald-600" /> Siap Diajukan
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center gap-1">
                          <AlertTriangle size={13} className="text-amber-600" /> Ada RT belum memiliki PCL
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button 
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 cursor-pointer transition-all border-0"
                      >
                        Batal
                      </button>
                      <button 
                        type="submit"
                        disabled={isProcessingApproval || !allRtsHavePcl || desaPengajuanForm.selected_sls.length === 0}
                        className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 border-0 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-500/20"
                      >
                        {isProcessingApproval ? "Mengirim Pengajuan..." : "Kirim Pengajuan Kegiatan"}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                /* FORM TAMBAH KEGIATAN BIASA OLEH ADMIN BPS */
                <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
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
                      <label className="block text-xs font-semibold text-slate-500 mb-2">Status Awal</label>
                      <div className="relative">
                        <SelectDropdown variant="form" 
                          value={newActivity.status} 
                          onChange={e => setNewActivity({ ...newActivity, status: e.target.value })}
                          className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white text-slate-700 transition-all font-medium cursor-pointer appearance-none pr-10"
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
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
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all border-0 shadow-sm"
                    >
                      Simpan Kegiatan
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* MODAL: PERSETUJUAN PENGAJUAN DESA OLEH BPS */}
      {/* ======================================================== */}
      {approveModalData.open && approveModalData.activity && (
        <div className="fixed inset-0 bg-slate-900/35 backdrop-blur-[2px] flex items-center justify-center z-[100] p-6 animate-fade"
          onClick={() => setApproveModalData({ open: false, activity: null })}
        >
          <div className="bg-white rounded-2xl p-8 w-full shadow-xl animate-zoom"
            style={{ maxWidth: 460 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 bg-emerald-50 text-emerald-600">
              <CheckCircle size={24}/>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Setujui & Mulai Kegiatan Desa?
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Anda akan menyetujui pengajuan kegiatan <strong>"{approveModalData.activity.name}"</strong> dari Desa <strong>{approveModalData.activity.desa}</strong>.
            </p>

            <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl text-[11px] text-emerald-800 space-y-2 mb-6">
              <p className="font-bold flex items-center gap-1.5">
                <CheckSquare size={13} /> Yang akan diproses secara otomatis:
              </p>
              
              {approveModalData.activity.lokus?.sls && Array.isArray(approveModalData.activity.lokus.sls) && approveModalData.activity.lokus.sls.length > 0 && (
                <div className="p-2 rounded-lg bg-white/80 border border-emerald-200/80">
                  <span className="font-semibold text-slate-700 block mb-1">Lokus RT / SLS Terpilih oleh Desa:</span>
                  <div className="flex flex-wrap gap-1">
                    {approveModalData.activity.lokus.sls.map((sls, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        {sls}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <ul className="list-disc pl-4 space-y-1">
                <li>Status kegiatan akan langsung aktif (<strong>Published</strong>).</li>
                <li>Lokus wilayah terkunci ke Desa {approveModalData.activity.desa}.</li>
                {approveModalData.activity.source_kegiatan_id ? (
                  <li>
                    Struktur Form Kuesioner dan data prelist <strong>hanya pada RT yang dipilih di atas</strong> akan otomatis dikloning ke kegiatan baru ini dan dibagikan ke akun petugas yang ditugaskan desa.
                  </li>
                ) : (
                  <li>Kegiatan siap digunakan oleh petugas lapangan.</li>
                )}
              </ul>
            </div>

            <div className="flex gap-3">
              <button 
                type="button"
                disabled={isProcessingApproval}
                onClick={() => setApproveModalData({ open: false, activity: null })}
                className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-500 cursor-pointer transition-all border-0"
              >
                Batal
              </button>
              <button 
                type="button"
                disabled={isProcessingApproval}
                onClick={() => handleApprovePengajuan(approveModalData.activity)}
                className="flex-1 py-3 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer transition-all active:scale-[0.98] border-0 disabled:opacity-50"
              >
                {isProcessingApproval ? "Memproses..." : "Ya, Setujui & Mulai"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: TOLAK PENGAJUAN DESA OLEH BPS */}
      {/* ======================================================== */}
      {rejectModalData.open && rejectModalData.activity && (
        <div className="fixed inset-0 bg-slate-900/35 backdrop-blur-[2px] flex items-center justify-center z-[100] p-6 animate-fade"
          onClick={() => setRejectModalData({ open: false, activity: null, catatan: "" })}
        >
          <div className="bg-white rounded-2xl p-8 w-full shadow-xl animate-zoom"
            style={{ maxWidth: 460 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 bg-rose-50 text-rose-600">
              <XCircle size={24}/>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Tolak Pengajuan Kegiatan
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Berikan catatan revisi atau alasan penolakan untuk Desa <strong>{rejectModalData.activity.desa}</strong>:
            </p>

            <form onSubmit={handleRejectPengajuan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Catatan Revisi / Alasan</label>
                <textarea 
                  value={rejectModalData.catatan} 
                  onChange={e => setRejectModalData({ ...rejectModalData, catatan: e.target.value })} 
                  required
                  rows={3}
                  placeholder="Contoh: Jadwal bertabrakan dengan sensus nasional, silakan ajukan bulan depan..." 
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 bg-white text-slate-700 placeholder:text-slate-300 transition-all font-medium resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  disabled={isProcessingApproval}
                  onClick={() => setRejectModalData({ open: false, activity: null, catatan: "" })}
                  className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-500 cursor-pointer transition-all border-0"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isProcessingApproval}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 border-0 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isProcessingApproval ? "Menolak..." : "Tolak Pengajuan"}
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

      {/* ======================================================== */}
      {/* MODAL: DAFTAR KREDENSIAL & AKUN ADMIN DESA */}
      {/* ======================================================== */}
      {showAdminDesaModal && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 lg:p-6 animate-fade"
          onClick={() => setShowAdminDesaModal(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-zoom overflow-hidden border border-slate-100"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Key size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Daftar Akun Admin Desa</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kredensial login bagi perangkat desa untuk mengajukan kegiatan survei mandiri.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAdminDesaModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center border-0 cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Info Notice & Search Bar */}
            <div className="p-6 pb-4 border-b border-slate-100 space-y-4">
              <div className="p-3.5 bg-blue-50/70 border border-blue-100/80 rounded-xl flex items-start gap-3">
                <div className="text-blue-600 mt-0.5"><CheckCircle size={16} /></div>
                <div className="text-xs text-blue-800 leading-relaxed">
                  <span className="font-semibold">Informasi Kredensial:</span> Password standar default untuk seluruh desa yang baru dibuat adalah <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-blue-900 border border-blue-200">admin123</code>. Admin Desa dapat login langsung di halaman awal aplikasi dengan memilih login role <strong>Admin Desa</strong> atau username masing-masing.
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    value={adminDesaSearch}
                    onChange={e => setAdminDesaSearch(e.target.value)}
                    placeholder="Cari desa, kecamatan, atau username..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                  />
                </div>
                <span className="text-xs font-semibold text-slate-500 self-center">
                  Total: {adminDesaList.filter(d => 
                    !adminDesaSearch || 
                    d.desa?.toLowerCase().includes(adminDesaSearch.toLowerCase()) || 
                    d.kecamatan?.toLowerCase().includes(adminDesaSearch.toLowerCase()) || 
                    d.username?.toLowerCase().includes(adminDesaSearch.toLowerCase())
                  ).length} Desa
                </span>
              </div>
            </div>

            {/* Modal Body / Table */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              {loadingAdminDesa ? (
                <div className="py-12 text-center text-xs text-slate-400">Memuat data akun desa...</div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                        <th className="py-3 px-4">Desa / Wilayah</th>
                        <th className="py-3 px-4">Username Login</th>
                        <th className="py-3 px-4">Password Default</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminDesaList
                        .filter(d => 
                          !adminDesaSearch || 
                          d.desa?.toLowerCase().includes(adminDesaSearch.toLowerCase()) || 
                          d.kecamatan?.toLowerCase().includes(adminDesaSearch.toLowerCase()) || 
                          d.username?.toLowerCase().includes(adminDesaSearch.toLowerCase())
                        )
                        .map(admin => {
                          const isCopied = copiedUser === admin.username;
                          return (
                            <tr key={admin.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3.5 px-4 font-semibold text-slate-800">
                                <div className="font-bold text-slate-900">{admin.desa}</div>
                                <div className="text-[11px] text-slate-400 font-normal">Kec. {admin.kecamatan || "-"}</div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <code className="font-mono font-bold text-blue-700 bg-blue-50/80 px-2 py-1 rounded text-[11px] border border-blue-100">
                                    {admin.username}
                                  </code>
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard?.writeText(admin.username);
                                      setCopiedUser(admin.username);
                                      setTimeout(() => setCopiedUser(null), 2000);
                                    }}
                                    title="Salin username"
                                    className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 border-0 cursor-pointer transition-colors"
                                  >
                                    {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                  </button>
                                  {isCopied && <span className="text-[10px] text-emerald-600 font-semibold">Tersalin!</span>}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <code className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                  admin123
                                </code>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Aktif
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button 
                                  onClick={() => setResetPassModal({ open: true, admin, newPassword: "admin123" })}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 hover:border-blue-200 transition-all cursor-pointer"
                                >
                                  Reset Password
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowAdminDesaModal(false)}
                className="px-5 py-2 text-xs font-semibold bg-slate-800 text-white rounded-xl hover:bg-slate-900 border-0 cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: RESET PASSWORD ADMIN DESA */}
      {/* ======================================================== */}
      {resetPassModal.open && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade"
          onClick={() => setResetPassModal({ open: false, admin: null, newPassword: "admin123" })}
        >
          <div 
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-zoom"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Key size={20} />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              Reset Password Admin Desa
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Reset kata sandi untuk akun <strong className="text-slate-800">{resetPassModal.admin?.username}</strong> (Desa {resetPassModal.admin?.desa}).
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Password Baru
                </label>
                <input 
                  type="text"
                  value={resetPassModal.newPassword}
                  onChange={e => setResetPassModal(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Masukkan password baru"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setResetPassModal({ open: false, admin: null, newPassword: "admin123" })}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer transition-colors border-0"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={() => handleResetPasswordDesa(resetPassModal.admin.id, resetPassModal.newPassword)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-semibold text-white cursor-pointer transition-colors border-0"
              >
                Simpan Password
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}

export default AdminKegiatan;
