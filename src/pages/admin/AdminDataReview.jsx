import { useState, Fragment, useEffect, useRef, startTransition, useMemo } from "react";
import * as XLSX from 'xlsx';
import AdminLayout from "../../components/layouts/AdminLayout";
import { api } from "../../services/api";
import Badge from "../../components/ui/Badge";
import ConfirmModal from "../../components/ui/ConfirmModal";
import useDropdown from "../../hooks/useDropdown";
import SearchableSelect from "../../components/ui/SearchableSelect";
import {
  Search, Eye, Check, X, AlertTriangle, Filter, Upload,
  Database, FileText, ArrowLeft, ChevronLeft, ChevronRight, CornerDownRight, Edit3, Plus
} from "lucide-react";

const DebouncedInput = ({ value, onChange, delay = 500, forceUppercase = false, allowedPattern, isNumberFormat = false, ...props }) => {
  const [localValue, setLocalValue] = useState(value || "");
  const [isFocused, setIsFocused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  const handleChange = (e) => {
    let newVal = e.target.value;
    if (forceUppercase) newVal = newVal.toUpperCase();
    if (allowedPattern && newVal !== "" && !allowedPattern.test(newVal)) return;

    setLocalValue(newVal);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(newVal);
    }, delay);
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    if (props.onFocus) props.onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (localValue !== (value || "")) {
      onChange(localValue);
    }
    if (props.onBlur) props.onBlur(e);
  };

  const displayValue = useMemo(() => {
    if (!isNumberFormat) return localValue;
    if (isFocused) {
      return localValue.replace(/\./g, ",");
    }
    if (!localValue || localValue === "-" || localValue === "-." || localValue.endsWith(".")) {
      return localValue.replace(/\./g, ",");
    }

    const parts = localValue.toString().split(".");
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const decimalPart = parts.length > 1 ? "," + parts[1] : "";
    return integerPart + decimalPart;
  }, [localValue, isFocused, isNumberFormat]);

  return <input {...props} value={displayValue} onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur} />;
};

const DebouncedTextarea = ({ value, onChange, delay = 500, ...props }) => {
  const [localValue, setLocalValue] = useState(value || "");
  const timerRef = useRef(null);

  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  const handleChange = (e) => {
    const newVal = e.target.value;
    setLocalValue(newVal);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(newVal);
    }, delay);
  };

  const handleBlur = (e) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (localValue !== (value || "")) {
      onChange(localValue);
    }
    if (props.onBlur) props.onBlur(e);
  };

  return <textarea {...props} value={localValue} onChange={handleChange} onBlur={handleBlur} />;
};

const FastRadioGroup = ({ value, onChange, options, name, className, disabled }) => {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (val) => {
    setLocalValue(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(val);
    }, 50);
  };

  return (
    <div className={className}>
      {options?.map(opt => (
        <label key={opt.value} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={String(localValue) === String(opt.value)}
            onChange={() => handleChange(opt.value)}
            disabled={disabled}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
};

const FastSelect = ({ value, onChange, options, className, disabled, placeholder = "Pilih Opsi", children }) => {
  const [localValue, setLocalValue] = useState(value || "");
  const timerRef = useRef(null);

  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    setLocalValue(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(val);
    }, 50);
  };

  return (
    <select value={localValue} onChange={handleChange} className={className} disabled={disabled}>
      <option value="">{placeholder}</option>
      {options ? options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      )) : children}
    </select>
  );
};

/**
 * Custom QCard for viewing and editing questionnaires
 */
function ReviewQCard({ r, label, subLabel, required, hint, skipInfo, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-3 relative overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Q.{r}</span>
            {required && (
              <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded uppercase">Wajib</span>
            )}
            {skipInfo && (
              <span className="text-[9px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded uppercase">
                {typeof skipInfo === 'string' && skipInfo.trim().startsWith('{') ? "Lompatan" : skipInfo}
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-slate-800 mt-1.5 leading-snug">{label}</h4>
          {subLabel && (
            <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{subLabel}</p>
          )}
          {hint && (
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{hint}</p>
          )}
        </div>
      </div>
      <div className="pt-1.5">
        {children}
      </div>
    </div>
  );
}

/**
 * Halaman Review Data Admin.
 *
 * @param {Object} props
 * @param {(screen: string) => void} props.onNavigate
 * @returns {React.ReactElement}
 */
function MultiSelectDropdown({ idPrefix, selectedNames, allOptions, onChange, placeholder, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (event.target && !event.target.isConnected) {
        return; // Ignore clicks on elements that were unmounted during re-renders
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = (name) => {
    let updated;
    if (selectedNames.includes(name)) {
      updated = selectedNames.filter(n => n !== name);
    } else {
      updated = [...selectedNames, name];
    }
    onChange(updated);
  };

  const displayText = selectedNames.length === 0
    ? placeholder
    : selectedNames.length === 1
      ? selectedNames[0]
      : `${selectedNames.length} Terpilih`;

  return (
    <div className="relative w-full max-w-[140px]" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        title={selectedNames.join(", ")}
        className="text-xs bg-slate-50 hover:bg-slate-100/70 border border-slate-200 focus:border-blue-500 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 cursor-pointer outline-none transition-all w-full flex items-center justify-between gap-1 disabled:opacity-75 disabled:cursor-not-allowed"
      >
        <span className="truncate">{displayText}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-56 bg-white border border-slate-150 rounded-xl shadow-xl z-50 py-1.5 max-h-52 overflow-y-auto" style={{ animation: 'scaleIn 0.15s ease' }}>
          <div className="px-3 py-1 border-b border-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Pilih Petugas (Multi-select)
          </div>
          {allOptions.map((o, idx) => {
            const isChecked = selectedNames.includes(o.name);
            const optId = `${idPrefix || 'opt'}-${idx}-${o.name.replace(/\s+/g, '-').toLowerCase()}`;
            return (
              <div
                key={o.name}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-[11px] font-semibold text-slate-600 transition-all select-none"
              >
                <input
                  type="checkbox"
                  id={optId}
                  checked={isChecked}
                  onChange={() => handleToggle(o.name)}
                  className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 w-3.5 h-3.5 cursor-pointer"
                />
                <label
                  htmlFor={optId}
                  className="truncate cursor-pointer flex-1 py-0.5"
                >
                  {o.name}
                </label>
              </div>
            );
          })}
          {allOptions.length === 0 && (
            <div className="px-3 py-2 text-[10px] text-slate-400 font-medium">Tidak ada petugas</div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminDataReview({ onNavigate, selectedProject, onProjectChange, activities, onApproveDocument, petugas, loading: propLoading, currentUser }) {
  const isKegiatanAdmin = currentUser?.role === 'admin_kegiatan';
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [modal, setModal] = useState(null);
  const [note, setNote] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const isLoading = propLoading || loading;

  // Form structure states
  const [blocks, setBlocks] = useState([]);
  const [questions, setQuestions] = useState([]);

  // Read-only / Edit Questionnaire Viewer States
  const [viewingRecord, setViewingRecord] = useState(null);
  const [viewingBlock, setViewingBlock] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [ans, setAns] = useState({});
  const [confirmModalType, setConfirmModalType] = useState(null); // 'approve' | 'unapprove' | null

  // States for Prelist Upload Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);

  // New mapping states
  const [parsedExcelData, setParsedExcelData] = useState([]);
  const [groupingColumn, setGroupingColumn] = useState("");
  const [columnMapping, setColumnMapping] = useState({});
  const [mappingStep, setMappingStep] = useState(1); // 1: upload, 2: map, 3: preview

  const fileInputRef = useRef(null);

  // States for Assign SLS Modal
  const [isAssignSlsModalOpen, setIsAssignSlsModalOpen] = useState(false);
  const [selectedSls, setSelectedSls] = useState("");
  const [selectedSlsPcls, setSelectedSlsPcls] = useState([]);
  const [selectedSlsPmls, setSelectedSlsPmls] = useState([]);
  const [pclSearch, setPclSearch] = useState("");
  const [pmlSearch, setPmlSearch] = useState("");
  const [isAssigningSls, setIsAssigningSls] = useState(false);

  // Check activity status to decide if prelist is editable
  const activeActivity = activities?.find(a => a.name === selectedProject);
  const status = activeActivity ? activeActivity.status : "draft";

  // Village Stats & Dropdown
  const [desaStats, setDesaStats] = useState([]);
  const activeDesas = activeActivity
    ? (typeof activeActivity.lokus === 'string'
      ? (JSON.parse(activeActivity.lokus)?.desa || [])
      : (activeActivity.lokus?.desa || []))
    : [];
  const villages = ["Semua Desa", ...(desaStats.length > 0 ? desaStats.map(d => `Desa ${d.name}`) : activeDesas.map(d => `Desa ${d}`))];
  const villageDropdown = useDropdown("Semua Desa");

  useEffect(() => {
    if (!activeActivity) return;
    const fetchDesa = async () => {
      try {
        const stats = await api.desa.getStats(activeActivity.id);
        setDesaStats(stats);
      } catch (err) {
        console.error("Gagal mengambil target desa:", err);
      }
    };
    fetchDesa();
  }, [selectedProject, activeActivity]);

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

  const isDraft = activeActivity ? activeActivity.status === "draft" : false;
  const canUploadPrelist = selectedProject && isDraft && !isKegiatanAdmin;

  // Officers list
  const officersList = petugas || [];
  const pcls = officersList.filter(o => !o.projectRoles || !o.projectRoles[selectedProject] || o.projectRoles[selectedProject] === "PCL");
  const pmls = officersList.filter(o => !o.projectRoles || !o.projectRoles[selectedProject] || o.projectRoles[selectedProject] === "PML");

  const uniqueSlsList = useMemo(() => {
    const slsSet = new Set();
    data.forEach(r => {
      if (r.sls) slsSet.add(r.sls);
    });
    return Array.from(slsSet).sort();
  }, [data]);


  const handleAssignSlsSubmit = async () => {
    if (!selectedSls) return;
    setIsAssigningSls(true);
    try {
      await api.dokumen.assignSls(
        activeActivity.id,
        selectedSls,
        selectedSlsPcls,
        selectedSlsPmls
      );

      // Update local state to reflect changes instantly in the UI table
      setData(prev => prev.map(r => {
        if (r.sls === selectedSls) {
          return {
            ...r,
            assigned_pcls: selectedSlsPcls,
            assigned_pmls: selectedSlsPmls,
            petugas: selectedSlsPcls.length > 0 ? selectedSlsPcls[0] : "Belum Ditugaskan",
            pengawas: selectedSlsPmls.length > 0 ? selectedSlsPmls[0] : "Belum Ditugaskan"
          };
        }
        return r;
      }));

      alert(`Berhasil menugaskan petugas untuk SLS ${selectedSls}`);
      setIsAssignSlsModalOpen(false);
      setSelectedSls("");
      setSelectedSlsPcls([]);
      setSelectedSlsPmls([]);
      setPclSearch("");
      setPmlSearch("");
    } catch (err) {
      alert("Gagal menugaskan petugas per SLS: " + err.message);
    } finally {
      setIsAssigningSls(false);
    }
  };

  const fetchReviewDocuments = async () => {
    if (!activeActivity) return;
    setLoading(true);
    try {
      const docs = await api.dokumen.getForReview(activeActivity.id);
      // Map properties to match UI expected keys
      const formatted = docs.map(doc => ({
        ...doc,
        id: doc.kode, // Use kode as UI id display
        dbId: doc.id,  // Save DB primary key as dbId
        status: doc.review_status === 'draft' ? doc.status : doc.review_status,
        petugas: doc.petugas_name,
        isPrelist: !!doc.is_prelist,
        sls: doc.sls,
        subSls: doc.sub_sls,
        nama_krt: doc.krt
      }));
      setData(formatted);
    } catch (err) {
      console.error("Gagal mengambil data review:", err);
    } finally {
      setData(prev => prev);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewDocuments();
  }, [selectedProject, activeActivity]);
  useEffect(() => {
    if (!activeActivity) return;
    const sortBlocksNaturally = (blks) => {
      const romanToDecimal = (roman) => {
        const map = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
        let dec = 0;
        const str = roman.toLowerCase();
        for (let i = 0; i < str.length; i++) {
          const current = map[str[i]];
          const next = map[str[i + 1]];
          if (next && current < next) {
            dec += next - current;
            i++;
          } else {
            dec += current;
          }
        }
        return dec || 0;
      };
      const getBlockSortKey = (block) => {
        const kodeStr = String(block.kode || block.id || "");
        const match = kodeStr.match(/^Blok\s+([IVXLCDMivxlcdm]+)/i);
        if (match) {
          return romanToDecimal(match[1]);
        }
        if (kodeStr.toLowerCase() === "pengantar") {
          return 0;
        }
        return 999;
      };
      return [...(blks || [])].sort((a, b) => {
        const keyA = getBlockSortKey(a);
        const keyB = getBlockSortKey(b);
        if (keyA !== keyB) return keyA - keyB;
        return (a.sort_order || 0) - (b.sort_order || 0);
      });
    };

    const fetchForm = async () => {
      try {
        const res = await api.form.getStructure(activeActivity.id);
        if (res && res.success) {
          const sorted = sortBlocksNaturally(res.blocks);
          setBlocks(sorted);
          const mappedQuestions = (res.questions || []).map(q => {
            if (q.type === 'select') {
              try {
                const parsed = JSON.parse(q.validation || '{}');
                if (parsed.is_search) {
                  return { ...q, type: 'search' };
                }
              } catch (e) { }
            }
            return q;
          });
          setQuestions(mappedQuestions);
          if (sorted.length > 0) {
            setViewingBlock(sorted[0].id);
          }
        }
      } catch (err) {
        console.error("Gagal mengambil struktur kuesioner:", err);
      }
    };
    fetchForm();
  }, [selectedProject, activeActivity]);

  const handleAssignPCLMultiple = async (record, selectedPcls) => {
    try {
      setData(prev => prev.map(r => r.id === record.id ? {
        ...r,
        assigned_pcls: selectedPcls,
        petugas: selectedPcls.length > 0 ? selectedPcls[0] : "Belum Ditugaskan"
      } : r));

      await api.dokumen.assignMultiple(
        record.dbId || record.id,
        selectedPcls,
        record.assigned_pmls || []
      );
    } catch (err) {
      alert("Gagal menyimpan penugasan PCL: " + err.message);
      fetchReviewDocuments();
    }
  };

  const handleAssignPMLMultiple = async (record, selectedPmls) => {
    try {
      setData(prev => prev.map(r => r.id === record.id ? {
        ...r,
        assigned_pmls: selectedPmls,
        pengawas: selectedPmls.length > 0 ? selectedPmls[0] : "Belum Ditugaskan"
      } : r));

      await api.dokumen.assignMultiple(
        record.dbId || record.id,
        record.assigned_pcls || [],
        selectedPmls
      );
    } catch (err) {
      alert("Gagal menyimpan penugasan PML: " + err.message);
      fetchReviewDocuments();
    }
  };

  const projectFilteredData = data;

  const villageData = villageDropdown.selected === "Semua Desa"
    ? projectFilteredData
    : projectFilteredData.filter(r => r.desa === villageDropdown.selected.replace("Desa ", ""));
  const filtered = filter === "all" ? villageData : villageData.filter(r => r.status === filter);
  const count = s => villageData.filter(r => r.status === s).length;

  const filteredSearch = filtered.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (r.id || "").toString().toLowerCase().includes(q) ||
      (r.kode || "").toLowerCase().includes(q) ||
      (r.krt || "").toLowerCase().includes(q) ||
      (r.petugas_name || "").toLowerCase().includes(q) ||
      (r.pengawas || "").toLowerCase().includes(q);
  });

  const sortedFiltered = [...filteredSearch].sort((a, b) => {
    if (a.isPrelist && !b.isPrelist) return -1;
    if (!a.isPrelist && b.isPrelist) return 1;
    const valA = (a.id || a.kode || "").toString();
    const valB = (b.id || b.kode || "").toString();
    if (sortOrder === "desc") {
      return valB.localeCompare(valA);
    } else {
      return valA.localeCompare(valB);
    }
  });

  const handleOpenDetail = async (record) => {
    try {
      const res = await api.dokumen.getDetail(record.dbId || record.id);
      if (res && res.success) {
        setViewingRecord({
          ...res.dokumen,
          id: res.dokumen.kode,
          dbId: res.dokumen.id,
          status: res.dokumen.review_status === 'draft' ? res.dokumen.status : res.dokumen.review_status,
          petugas: res.dokumen.petugas_name
        });
        setAns(res.values); // question_id -> value map
        setIsEditing(false);
      }
    } catch (err) {
      alert("Gagal memuat detail dokumen: " + err.message);
    }
  };

  const approve = async () => {
    try {
      await api.dokumen.review(modal.dbId || modal.id, 'approved');
      await fetchReviewDocuments();
      if (viewingRecord && viewingRecord.id === modal.id) {
        setViewingRecord(prev => ({ ...prev, status: "approved" }));
      }
      if (onApproveDocument) {
        onApproveDocument(modal.desa);
      }
      setModal(null);
    } catch (err) {
      alert("Gagal menyetujui dokumen: " + err.message);
    }
  };

  const reject = async () => {
    try {
      await api.dokumen.review(modal.dbId || modal.id, 'rejected', note);
      await fetchReviewDocuments();
      if (viewingRecord && viewingRecord.id === modal.id) {
        setViewingRecord(prev => ({ ...prev, status: "rejected" }));
      }
      setModal(null);
      setNote("");
    } catch (err) {
      alert("Gagal menolak dokumen: " + err.message);
    }
  };

  // Sidebar Approve Action
  const handleApprove = async () => {
    try {
      await api.dokumen.review(viewingRecord.dbId || viewingRecord.id, 'approved');
      await fetchReviewDocuments();
      setViewingRecord(prev => ({ ...prev, status: "approved" }));
      setIsEditing(false);
      if (onApproveDocument) {
        onApproveDocument(viewingRecord.desa);
      }
      setConfirmModalType(null);
    } catch (err) {
      alert("Gagal menyetujui dokumen: " + err.message);
    }
  };

  // Sidebar Unapprove Action
  const handleUnapprove = async () => {
    try {
      await api.dokumen.review(viewingRecord.dbId || viewingRecord.id, 'rejected', 'Persetujuan dibatalkan oleh PML');
      await fetchReviewDocuments();
      setViewingRecord(prev => ({ ...prev, status: "rejected" }));
      setConfirmModalType(null);
    } catch (err) {
      alert("Gagal membatalkan persetujuan: " + err.message);
    }
  };

  const setVal = (qId, value) => {
    startTransition(() => {
      setAns(prev => ({
        ...prev,
        [qId]: value
      }));
    });
  };

  const getQuestionCode = (q, allQuestions, allBlocks) => {
    if (!q) return "";

    // Support custom code set in validation JSON
    const valStr = q.validation || q.val;
    if (valStr && valStr.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(valStr);
        if (parsed.custom_code || parsed.customCode) {
          return parsed.custom_code || parsed.customCode;
        }
      } catch (e) { }
    }

    const standardBlocks = allBlocks.filter(b => {
      const idStr = String(b.kode || b.id || "");
      return idStr.startsWith("Blok ");
    });
    const blockIdx = standardBlocks.findIndex(b => (b.id === q.blok_id || b.kode === q.blok_id)) + 1;
    if (blockIdx === 0) return "";

    if (q.parent_id) {
      const parent = allQuestions.find(p => p.id === q.parent_id);
      if (!parent) return "";
      const parentCode = getQuestionCode(parent, allQuestions, allBlocks);

      // Sibling sub-questions of same parent
      const siblings = allQuestions.filter(s => s.blok_id === q.blok_id && s.parent_id === q.parent_id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      const sibIdx = siblings.findIndex(s => s.id === q.id);

      // Check if parent has parent_id (depth 2)
      if (parent.parent_id) {
        const romanNumerals = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
        const suffix = romanNumerals[sibIdx] || (sibIdx + 1).toString();
        return `${parentCode}.${suffix}`;
      } else {
        const letter = String.fromCharCode(97 + (sibIdx >= 0 ? sibIdx : 0)); // a, b, c...
        return `${parentCode}${letter}`;
      }
    } else {
      // Index among main questions of the block
      const mainQs = allQuestions.filter(s => s.blok_id === q.blok_id && !s.parent_id && s.type !== 'note').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      let startIndex = 1;
      const firstQ = mainQs[0];
      if (firstQ) {
        const firstValStr = firstQ.validation || firstQ.val;
        if (firstValStr && firstValStr.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(firstValStr);
            const custom = parsed.custom_code || parsed.customCode || "";
            if (parsed.start_zero || parsed.start_from_zero || custom.endsWith("00") || custom === "400" || custom === "R400") {
              startIndex = 0;
            }
          } catch (e) { }
        }
      }

      const qIdx = mainQs.findIndex(s => s.id === q.id) + startIndex;
      const padded = qIdx.toString().padStart(2, '0');
      return `${blockIdx}${padded}`;
    }
  };

  const getManualLoopCount = (q) => {
    if (!q) return null;

    // Check if the question belongs to a loop group
    let loopGroupName = "";
    if (q.validation) {
      try {
        const parsed = JSON.parse(q.validation);
        if (parsed && parsed.loop_group) {
          loopGroupName = parsed.loop_group;
        }
      } catch (e) { }
    }

    if (loopGroupName) {
      const groupQs = questions.filter(x => {
        if (!x.validation) return false;
        try {
          const parsed = JSON.parse(x.validation);
          return parsed && parsed.loop_group === loopGroupName;
        } catch (e) {
          return false;
        }
      });
      const masterQ = groupQs.find(x => {
        if (!x.validation) return false;
        try {
          const parsed = JSON.parse(x.validation);
          return parsed && parsed.is_loop && parsed.loop_type === "manual";
        } catch (e) {
          return false;
        }
      });
      if (masterQ && masterQ.id !== q.id) {
        return getManualLoopCount(masterQ);
      }
    }

    let isLoop = false;
    let loopType = "question";
    if (q.validation && q.validation.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(q.validation);
        isLoop = !!parsed.is_loop;
        loopType = parsed.loop_type || "question";
      } catch (e) { }
    }
    if (isLoop && loopType === "manual") {
      const savedCount = ans[`${q.id}_loop_count`];
      const parsed = savedCount ? parseInt(savedCount, 10) : 1;
      return isNaN(parsed) || parsed < 1 ? 1 : parsed;
    }

    const parentId = q.parent_id || q.parentId;
    if (parentId) {
      const parent = questions.find(p => p.id === parentId);
      if (parent) {
        return getManualLoopCount(parent);
      }
    }

    return null;
  };

  const handleAddManualLoop = (qId) => {
    const currentCount = ans[`${qId}_loop_count`] ? parseInt(ans[`${qId}_loop_count`], 10) : 1;
    const newCount = currentCount + 1;
    setAns(prev => ({
      ...prev,
      [`${qId}_loop_count`]: newCount
    }));
  };

  const handleRemoveManualLoop = (qId, currentCount) => {
    const newCount = Math.max(1, currentCount - 1);
    const updatedValues = { ...ans };
    updatedValues[`${qId}_loop_count`] = newCount;

    // Find all questions that might be children of this question
    const childQs = questions.filter(c => c.parent_id === qId || c.parentId === qId);
    const targetQIds = [qId, ...childQs.map(c => c.id)];

    for (const id of targetQIds) {
      const raw = ans[id];
      if (raw) {
        try {
          let parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            if (parsed.length > newCount) {
              parsed = parsed.slice(0, newCount);
            }
            updatedValues[id] = JSON.stringify(parsed);
          }
        } catch (e) { }
      }
    }

    setAns(updatedValues);
  };

  const getLoopValue = (qId, idx) => {
    const raw = ans[qId];
    if (!raw) return "";
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed[idx] || "";
      } else if (typeof parsed === 'object' && parsed !== null) {
        return parsed[idx] || "";
      }
    } catch (e) { }
    return idx === 0 ? raw : "";
  };

  const handleUpdateLoopValue = (qId, idx, val) => {
    const raw = ans[qId];
    let parsed = [];
    if (raw) {
      try {
        parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          parsed = [raw];
        }
      } catch (e) {
        parsed = [raw];
      }
    }
    parsed[idx] = val;
    startTransition(() => {
      setAns(prev => ({
        ...prev,
        [qId]: JSON.stringify(parsed)
      }));
    });
  };

  // Save changes from Edit Mode
  const handleSaveEdit = async () => {
    try {
      const filteredAns = { ...ans };
      questions.forEach(q => {
        if (q.validation) {
          try {
            const parsed = JSON.parse(q.validation);
            if (parsed && parsed.is_temporary) {
              delete filteredAns[q.id];
              delete filteredAns[`${q.id}_loop_count`];
            }
          } catch (e) { }
        }
      });

      await api.dokumen.save({
        id: viewingRecord.dbId,
        kode: viewingRecord.id,
        kegiatan_id: viewingRecord.kegiatan_id,
        petugas_id: viewingRecord.petugas_id,
        krt: viewingRecord.krt,
        alamat: viewingRecord.alamat,
        kecamatan: viewingRecord.kecamatan,
        desa: viewingRecord.desa,
        sls: viewingRecord.sls,
        sub_sls: viewingRecord.sub_sls,
        status: viewingRecord.status === 'approved' ? 'terkirim' : viewingRecord.status,
        is_prelist: viewingRecord.is_prelist,
        values: filteredAns,
        log_message: "Dokumen diperbarui oleh PML"
      });
      setIsEditing(false);
      await fetchReviewDocuments();
    } catch (err) {
      alert("Gagal menyimpan perubahan kuesioner: " + err.message);
    }
  };

  // Cancel edits
  const handleCancelEdit = () => {
    handleOpenDetail(viewingRecord);
  };

  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,id,petugas,desa,sls,subSls,nama_krt,alamat\nPL-301,,Tideng Pale,SLS 01 Tideng Pale,RT 01 A Tideng Pale,Ahmad Riyadi,Jl. Cempaka No. 5\nPL-302,,Tideng Pale,SLS 01 Tideng Pale,RT 01 B Tideng Pale,Joko Widodo,Jl. Merdeka No. 10\nPL-303,,Tideng Pale Timur,SLS 01 Tideng Pale Timur,RT 01 A Tideng Pale Timur,Siti Aminah,Jl. Mawar No. 3";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_prelist_capi.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelectFile = (file) => {
    if (!file) return;
    setIsUploading(true);

    setUploadedFile({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + " KB",
      rowCount: 0,
      file: file
    });

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const firstSheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (jsonData.length > 0) {
          const headers = jsonData[0].map(h => String(h || "").trim().toLowerCase().replace(/\s+/g, '_'));
          setDetectedColumns(headers.filter(h => h));

          const rows = [];
          for (let i = 1; i < jsonData.length; i++) {
            if (!jsonData[i] || jsonData[i].length === 0 || !jsonData[i].some(cell => cell !== undefined && cell !== null && cell !== '')) continue;
            const rowData = {};
            headers.forEach((h, colIdx) => {
              if (h) {
                rowData[h] = jsonData[i][colIdx] !== undefined ? jsonData[i][colIdx] : "";
              }
            });
            rows.push(rowData);
          }

          setParsedExcelData(rows);
          setPreviewRows(rows.slice(0, 10));
          setUploadedFile(prev => ({ ...prev, rowCount: rows.length }));
        }
      } catch (err) {
        console.error("Error reading file:", err);
        alert("Gagal membaca file Excel/CSV.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      alert("Gagal membaca file.");
      setIsUploading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportPrelist = async () => {
    if (!parsedExcelData || parsedExcelData.length === 0) {
      alert("Tidak ada data untuk diimpor.");
      return;
    }

    setIsUploading(true);
    try {
      // Identify columns
      const kkCol = detectedColumns.find(c => ['no_kk', 'nokk', 'kk', 'id_keluarga', 'nomor_kk'].includes(c.toLowerCase())) || detectedColumns.find(c => c.toLowerCase().includes('kk'));
      const namaCol = detectedColumns.find(c => ['nama_krt', 'krt', 'nama', 'kepala_keluarga'].includes(c.toLowerCase())) || detectedColumns.find(c => c.toLowerCase().includes('nama'));
      const alamatCol = detectedColumns.find(c => c.toLowerCase().includes('alamat'));
      const desaCol = detectedColumns.find(c => c.toLowerCase().includes('desa') || c.toLowerCase().includes('kelurahan'));
      const slsCol = detectedColumns.find(c => c.toLowerCase().includes('sls') || c.toLowerCase().includes('rt'));
      const nikCol = detectedColumns.find(c => ['nik', 'no_nik', 'nomor_nik'].includes(c.toLowerCase())) || detectedColumns.find(c => c.toLowerCase().includes('nik'));

      const groups = {};
      if (kkCol) {
        parsedExcelData.forEach(row => {
          const kkVal = row[kkCol];
          if (!kkVal) return;
          if (!groups[kkVal]) groups[kkVal] = [];
          groups[kkVal].push(row);
        });
      } else {
        parsedExcelData.forEach((row, idx) => {
          groups[`row_${idx}`] = [row];
        });
      }

      const documents = Object.values(groups).map((family, idx) => {
        const head = family[0]; // first row is KRT

        // Helper to safely cast to string
        const safeString = (val) => (val !== undefined && val !== null ? String(val).trim() : "");

        const headNik = nikCol && head[nikCol] ? safeString(head[nikCol]) : `NONIK${idx}`;
        const headRt = slsCol && head[slsCol] ? safeString(head[slsCol]) : `NORT${idx}`;

        return {
          kode: head.id || head.kode || `PL-${headNik}-${headRt}`,
          kegiatan_id: activeActivity?.id,
          krt: namaCol && head[namaCol] ? safeString(head[namaCol]) : "Tanpa Nama",
          alamat: alamatCol ? safeString(head[alamatCol]) : "",
          desa: desaCol ? safeString(head[desaCol]) : "",
          sls: slsCol ? safeString(head[slsCol]) : "",
          sub_sls: safeString(head.sub_sls || head.subsls),
          status: 'draft',
          is_prelist: true,
          values: {} // future: populate family loops if needed
        };
      });

      const defaultPetugas = petugas && petugas.length > 0 ? petugas[0].id : 1;

      // Chunk documents to avoid transaction timeout
      // Reduced to 5 to fit well within Prisma Accelerate 15000ms max timeout
      const chunkSize = 5;
      for (let i = 0; i < documents.length; i += chunkSize) {
        const chunk = documents.slice(i, i + chunkSize);
        await api.dokumen.sync(defaultPetugas, chunk);
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setUploadedFile(null);
        setDetectedColumns([]);
        setPreviewRows([]);
        setParsedExcelData([]);
        setIsSuccess(false);
        fetchReviewDocuments(); // Reload review data after successful import
      }, 1500);
    } catch (err) {
      alert("Gagal mengimpor prelist: " + (err.message || "Timeout transaksi"));
    } finally {
      setIsUploading(false);
    }
  };

  // Questionnaire Viewer content layout
  const renderQuestionnaireViewer = () => {
    const krtName = viewingRecord.krt || viewingRecord.nama_krt || "Kepala Rumah Tangga";

    const BLOCKS = blocks.map(b => ({ id: b.id, l: b.kode, title: b.title }));
    const activeBlockObj = BLOCKS.find(b => b.id === viewingBlock) || BLOCKS[0] || { id: "", l: "", title: "" };

    const blockQuestions = questions.filter(q => q.blok_id === viewingBlock);

    const activityPetugas = (petugas || []).filter(p =>
      p.projects?.includes(selectedProject)
    );
    const pclList = activityPetugas.filter(p =>
      p.projectRoles?.[selectedProject] === "PCL"
    );
    const pmlList = activityPetugas.filter(p =>
      p.projectRoles?.[selectedProject] === "PML"
    );

    return (
      <div className="p-6 lg:p-8 w-full slide-up">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between mb-6 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setViewingRecord(null);
                setViewingBlock(blocks[0]?.id || null);
                setIsEditing(false);
              }}
              className="w-9 h-9 bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer rounded-lg flex items-center justify-center flex-shrink-0 transition-all text-slate-500"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-base font-bold text-slate-900">Review Isian Kuesioner</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge status={viewingRecord.status} />
          </div>
        </div>

        {/* 2-Column Layout: Left Sidebar + Right Questions */}
        <div className="flex flex-col lg:flex-row gap-6 w-full items-start">

          {/* Inner Left Sidebar Container */}
          <div className="w-full lg:w-72 bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm flex flex-col justify-between h-[620px] sticky top-6">

            {/* Top: Document Information */}
            <div className="p-5 border-b border-slate-50 bg-slate-50/50">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Informasi Dokumen</p>
              <div className="mt-4 space-y-2.5 text-xs font-semibold text-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">ID Dokumen</span>
                  <span className="mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{viewingRecord.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Kepala Keluarga</span>
                  <span className="text-slate-800 truncate max-w-[120px]">{krtName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Petugas</span>
                  <span className="text-slate-800 truncate max-w-[120px]">{viewingRecord.petugas}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Desa</span>
                  <span className="text-slate-800">{viewingRecord.desa}</span>
                </div>
              </div>
            </div>

            {/* Middle: Block List */}
            <div className="p-3 space-y-1 flex-1 overflow-y-auto">
              <p className="px-3 py-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider">Daftar Blok</p>
              {BLOCKS.map((b, i) => {
                const isCurrent = viewingBlock === b.id;
                return (
                  <button
                    key={i}
                    onClick={() => setViewingBlock(b.id)}
                    className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold border-0 cursor-pointer transition-all ${isCurrent
                        ? "text-blue-600 bg-blue-50/70 shadow-sm"
                        : "bg-transparent text-slate-500 hover:bg-slate-50"
                      }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${isCurrent ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`} />
                    <div className="text-left flex flex-col min-w-0">
                      <span>{b.l}</span>
                      <span className="text-[10px] text-slate-400 font-normal mt-0.5 leading-normal">{b.title}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom: Stuck to bottom controls */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/30 space-y-2 mt-auto">
              {isKegiatanAdmin ? (
                viewingRecord.status === "approved" ? (
                  <div className="text-[10px] text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 border border-emerald-100/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Dokumen Telah Disetujui
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 bg-slate-50 px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 border border-slate-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    Dokumen Belum Disetujui (Read-Only)
                  </div>
                )
              ) : (
                <>
                  {viewingRecord.status !== "approved" ? (
                    isEditing ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleCancelEdit}
                          className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs cursor-pointer border-0 transition-all text-center"
                        >
                          Batal
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer border-0 transition-all text-center shadow-sm"
                        >
                          Simpan
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="w-full py-2.5 bg-white hover:bg-slate-50 text-blue-600 border border-slate-200 hover:border-slate-300 font-bold rounded-xl text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Edit3 size={13} /> Edit Isian
                      </button>
                    )
                  ) : (
                    <div className="text-[10px] text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 border border-emerald-100/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Dokumen Telah Disetujui
                    </div>
                  )}

                  {/* Approve / Unapprove Actions */}
                  {viewingRecord.status === "approved" ? (
                    <button
                      onClick={() => setConfirmModalType("unapprove")}
                      className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl text-xs cursor-pointer border border-amber-100 transition-all flex items-center justify-center gap-1.5"
                    >
                      <X size={13} /> Batalkan Persetujuan (Unapprove)
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmModalType("approve")}
                      disabled={isEditing}
                      className={`w-full py-2.5 font-bold rounded-xl text-xs cursor-pointer border-0 transition-all flex items-center justify-center gap-1.5 ${isEditing
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        }`}
                    >
                      <Check size={13} /> Setujui Dokumen (Approve)
                    </button>
                  )}
                </>
              )}
            </div>

          </div>

          {/* Right Area: Questionnaire Cards (Dynamic) */}
          <div className="flex-1 w-full bg-white rounded-xl border border-slate-100 p-6 shadow-sm min-h-[620px]">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-50">
              <h3 className="text-sm font-bold text-slate-800">{activeBlockObj.l} – {activeBlockObj.title}</h3>
              <span className="text-[11px] text-blue-600 font-bold">Blok {BLOCKS.findIndex(b => b.id === viewingBlock) + 1} dari {blocks.length}</span>
            </div>

            <div className="space-y-4 max-w-xl pb-10">
              {(() => {
                const resolveLabelText = (labelText, activeInstanceIdx) => {
                  if (!labelText) return "";
                  const placeholderRegex = /\{([a-zA-Z0-9.]+)\}|\$([a-zA-Z0-9.]+)/g;
                  return labelText.replace(placeholderRegex, (match, p1, p2) => {
                    const code = p1 || p2;
                    if (!code) return match;
                    const cleanCode = code.toLowerCase().replace(/^r\.?/, "").replace(/\s/g, "");
                    const targetQ = questions.find(x => {
                      const qCode = getQuestionCode(x, questions, blocks);
                      return qCode && qCode.toLowerCase().replace(/\s/g, "") === cleanCode;
                    });
                    if (!targetQ) return match;
                    const resolvedValues = {};
                    for (const key in ans) {
                      const raw = ans[key];
                      if (typeof raw === 'string' && (raw.startsWith('[') || raw.startsWith('{'))) {
                        try {
                          const parsed = JSON.parse(raw);
                          if (Array.isArray(parsed)) {
                            resolvedValues[key] = parsed[activeInstanceIdx] !== undefined && parsed[activeInstanceIdx] !== null ? parsed[activeInstanceIdx] : "";
                          } else if (typeof parsed === 'object' && parsed !== null) {
                            resolvedValues[key] = parsed[activeInstanceIdx] !== undefined && parsed[activeInstanceIdx] !== null ? parsed[activeInstanceIdx] : "";
                          } else {
                            resolvedValues[key] = raw;
                          }
                        } catch (e) {
                          resolvedValues[key] = raw;
                        }
                      } else {
                        resolvedValues[key] = raw;
                      }
                    }
                    const val = resolvedValues[targetQ.id];
                    return val !== undefined && val !== null && val !== "" ? val : match;
                  });
                };

                const renderInputForQuestion = (q, rawInstances, value, hasOptions, activeInstanceIdx = null) => {
                  const instances = new Proxy(activeInstanceIdx !== null ? [activeInstanceIdx] : rawInstances, {
                    get(target, prop, receiver) {
                      if (prop === 'length') {
                        return rawInstances.length;
                      }
                      return Reflect.get(target, prop, receiver);
                    }
                  });
                  return (
                    <>
                      {isEditing ? (
                        <div className="space-y-4">
                          {instances.map((iIdx) => (
                            <div key={iIdx} className="space-y-1">
                              {instances.length > 1 && <label className="text-[10px] font-bold text-slate-455 block">Isian Ke-{iIdx + 1}</label>}
                              {q.type === 'pcl' ? (
                                <select
                                  value={instances.length > 1 ? getLoopValue(q.id, iIdx) : value}
                                  onChange={e => instances.length > 1 ? handleUpdateLoopValue(q.id, iIdx, e.target.value) : setVal(q.id, e.target.value)}
                                  className="w-full px-4 py-3 text-sm bg-white border border-blue-300 focus:border-blue-500 rounded-xl outline-none font-semibold text-slate-800 cursor-pointer"
                                >
                                  <option value="">-- Pilih PCL --</option>
                                  {pclList.map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                  ))}
                                  {pclList.length === 0 && (petugas || []).map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                  ))}
                                </select>
                              ) : q.type === 'pml' ? (
                                <select
                                  value={instances.length > 1 ? getLoopValue(q.id, iIdx) : value}
                                  onChange={e => instances.length > 1 ? handleUpdateLoopValue(q.id, iIdx, e.target.value) : setVal(q.id, e.target.value)}
                                  className="w-full px-4 py-3 text-sm bg-white border border-blue-300 focus:border-blue-500 rounded-xl outline-none font-semibold text-slate-800 cursor-pointer"
                                >
                                  <option value="">-- Pilih PML --</option>
                                  {pmlList.map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                  ))}
                                  {pmlList.length === 0 && (petugas || []).map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                  ))}
                                </select>
                              ) : q.type === 'search' ? (
                                <SearchableSelect
                                  value={instances.length > 1 ? getLoopValue(q.id, iIdx) : value}
                                  options={q.options || []}
                                  placeholder="Cari dan pilih opsi..."
                                  onChange={val => instances.length > 1 ? handleUpdateLoopValue(q.id, iIdx, val) : setVal(q.id, val)}
                                />
                              ) : q.type === 'select' ? (
                                <FastSelect
                                  value={instances.length > 1 ? getLoopValue(q.id, iIdx) : value}
                                  onChange={val => instances.length > 1 ? handleUpdateLoopValue(q.id, iIdx, val) : setVal(q.id, val)}
                                  options={q.options || []}
                                  className="w-full px-4 py-3 text-sm bg-white border border-blue-300 focus:border-blue-500 rounded-xl outline-none font-semibold text-slate-800"
                                />
                              ) : q.type === 'radio' ? (
                                <FastRadioGroup
                                  className="flex flex-wrap gap-4 py-1.5"
                                  name={`q_${q.id}_${iIdx}`}
                                  value={instances.length > 1 ? getLoopValue(q.id, iIdx) : value}
                                  options={q.options}
                                  onChange={(val) => instances.length > 1 ? handleUpdateLoopValue(q.id, iIdx, val) : setVal(q.id, val)}
                                />
                              ) : q.type === 'number' ? (
                                <DebouncedInput
                                  type="number"
                                  step="any"
                                  value={instances.length > 1 ? getLoopValue(q.id, iIdx) : value}
                                  className="w-full px-4 py-3 text-sm bg-white border border-blue-300 focus:border-blue-500 rounded-xl outline-none font-semibold text-slate-800"
                                />
                              ) : q.type === 'date' ? (
                                <input
                                  type={(() => {
                                    if (q.validation && q.validation.trim().startsWith('{')) {
                                      try {
                                        const parsed = JSON.parse(q.validation);
                                        return parsed.date_type || "date";
                                      } catch (e) { }
                                    }
                                    return "date";
                                  })()}
                                  value={instances.length > 1 ? getLoopValue(q.id, iIdx) : value}
                                  onChange={e => instances.length > 1 ? handleUpdateLoopValue(q.id, iIdx, e.target.value) : setVal(q.id, e.target.value)}
                                  className="w-full px-4 py-3 text-sm bg-white border border-blue-300 focus:border-blue-500 rounded-xl outline-none font-semibold text-slate-800"
                                />
                              ) : q.type === 'textarea' ? (
                                <textarea
                                  value={instances.length > 1 ? getLoopValue(q.id, iIdx) : value}
                                  onChange={e => instances.length > 1 ? handleUpdateLoopValue(q.id, iIdx, e.target.value) : setVal(q.id, e.target.value)}
                                  className="w-full px-4 py-3 text-sm bg-white border border-blue-300 focus:border-blue-500 rounded-xl outline-none font-semibold text-slate-800 min-h-[80px]"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={instances.length > 1 ? getLoopValue(q.id, iIdx) : value}
                                  onChange={e => instances.length > 1 ? handleUpdateLoopValue(q.id, iIdx, e.target.value) : setVal(q.id, e.target.value)}
                                  className="w-full px-4 py-3 text-sm bg-white border border-blue-300 focus:border-blue-500 rounded-xl outline-none font-semibold text-slate-800"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        instances.length > 1 ? (
                          <div className="space-y-2">
                            {instances.map((iIdx) => {
                              const loopVal = getLoopValue(q.id, iIdx);
                              return (
                                <div key={iIdx} className="px-4 py-2.5 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100/50">
                                  <span className="text-[10px] font-bold text-slate-400">Isian Ke-{iIdx + 1}:</span>
                                  <span className="text-xs font-bold text-slate-600">
                                    {hasOptions
                                      ? (q.options.find(opt => String(opt.value) === String(loopVal))?.label || loopVal || '-')
                                      : (loopVal || '-')
                                    }
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="px-4 py-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100/50">
                            <span className="text-xs font-bold text-slate-600">
                              {hasOptions
                                ? (q.options.find(opt => String(opt.value) === String(value))?.label || value || '-')
                                : (value || '-')
                              }
                            </span>
                          </div>
                        )
                      )}
                    </>
                  );
                };

                const renderQuestionRow = (q, depth = 0, forceCard = false, activeInstanceIdx = null) => {
                  const value = ans[q.id] ?? '';
                  const hasOptions = q.options && Array.isArray(q.options);

                  let isLoop = false;
                  let loopType = "question";
                  let loopByQuestionId = null;
                  let subLabel = "";
                  if (q.validation && q.validation.trim().startsWith('{')) {
                    try {
                      const parsed = JSON.parse(q.validation);
                      isLoop = !!parsed.is_loop;
                      loopType = parsed.loop_type || "question";
                      loopByQuestionId = parsed.loop_by_question_id || null;
                      subLabel = parsed.sub_label || "";
                    } catch (e) { }
                  }

                  let loopCount = 1;
                  const manualCount = getManualLoopCount(q);
                  if (manualCount !== null) {
                    loopCount = manualCount;
                  } else if (isLoop && loopByQuestionId) {
                    const triggerValue = ans[loopByQuestionId];
                    const parsedTrigger = parseInt(triggerValue, 10);
                    loopCount = isNaN(parsedTrigger) ? 0 : parsedTrigger;
                    if (loopCount <= 0) return null;
                  }

                  const instances = Array.from({ length: loopCount }, (_, idx) => idx);
                  const childQs = questions.filter(c => c.parent_id === q.id || c.parentId === q.id);
                  const hasChildren = childQs.length > 0;
                  const qCode = getQuestionCode(q, questions, blocks);

                  if (depth === 0 || forceCard) {
                    return (
                      <ReviewQCard
                        key={q.id}
                        r={qCode}
                        label={resolveLabelText(q.label, activeInstanceIdx)}
                        subLabel={subLabel}
                        required={!!q.required}
                        skipInfo={q.skip_logic}
                      >
                        {hasChildren ? (
                          <div className="mt-3 pl-3 border-l-2 border-solid border-slate-100 space-y-4">
                            {childQs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(child => renderQuestionRow(child, depth + 1, false, activeInstanceIdx))}
                          </div>
                        ) : (
                          renderInputForQuestion(q, instances, value, hasOptions, activeInstanceIdx)
                        )}

                        {isLoop && loopType === "manual" && (
                          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-dashed border-slate-100">
                            {isEditing && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleAddManualLoop(q.id)}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 rounded-lg text-xs font-bold transition-all cursor-pointer border-0"
                                >
                                  <Plus size={14} />
                                  Tambah Isian
                                </button>
                                {loopCount > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveManualLoop(q.id, loopCount)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-95 rounded-lg text-xs font-bold transition-all cursor-pointer border-0"
                                  >
                                    <X size={14} />
                                    Hapus Terakhir
                                  </button>
                                )}
                              </>
                            )}
                            <span className="text-xs text-slate-500 font-semibold ml-auto">
                              Total: {loopCount} isian
                            </span>
                          </div>
                        )}
                      </ReviewQCard>
                    );
                  } else {
                    return (
                      <div key={q.id} className="space-y-2 py-2 border-b border-solid border-slate-50 last:border-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Q.{qCode}</span>
                              {q.required && <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded uppercase">Wajib</span>}
                            </div>
                            <h4 className="text-xs font-bold text-slate-700 mt-1">{resolveLabelText(q.label, activeInstanceIdx)}</h4>
                            {subLabel && <p className="text-[11px] text-slate-500 font-medium mt-0.5">{subLabel}</p>}
                          </div>
                        </div>
                        <div className="pl-4 mt-2">
                          {hasChildren ? (
                            <div className="border-l border-solid border-slate-200 pl-3 space-y-3">
                              {childQs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(child => renderQuestionRow(child, depth + 1, false, activeInstanceIdx))}
                            </div>
                          ) : (
                            renderInputForQuestion(q, instances, value, hasOptions, activeInstanceIdx)
                          )}

                          {isLoop && loopType === "manual" && (
                            <div className="flex items-center gap-3 mt-3 pt-2 border-t border-dashed border-slate-100">
                              {isEditing && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleAddManualLoop(q.id)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 rounded-lg text-xs font-bold transition-all cursor-pointer border-0"
                                  >
                                    <Plus size={12} />
                                    Tambah Isian
                                  </button>
                                  {loopCount > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveManualLoop(q.id, loopCount)}
                                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-95 rounded-lg text-xs font-bold transition-all cursor-pointer border-0"
                                    >
                                      <X size={12} />
                                      Hapus Terakhir
                                    </button>
                                  )}
                                </>
                              )}
                              <span className="text-[11px] text-slate-500 font-semibold ml-auto">
                                Total: {loopCount} isian
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                };

                const topLevelQs = blockQuestions.filter(q => !q.parent_id && !q.parentId);
                const renderedGroups = new Set();

                return topLevelQs.flatMap(q => {
                  let loopGroupName = "";
                  if (q.validation) {
                    try {
                      const parsed = JSON.parse(q.validation);
                      if (parsed && parsed.loop_group) {
                        loopGroupName = parsed.loop_group;
                      }
                    } catch (e) { }
                  }

                  if (loopGroupName) {
                    if (renderedGroups.has(loopGroupName)) {
                      return [];
                    }
                    renderedGroups.add(loopGroupName);

                    const groupQs = topLevelQs.filter(x => {
                      if (!x.validation) return false;
                      try {
                        const parsed = JSON.parse(x.validation);
                        return parsed && parsed.loop_group === loopGroupName;
                      } catch (e) {
                        return false;
                      }
                    }).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

                    const masterQ = groupQs.find(x => {
                      if (!x.validation) return false;
                      try {
                        const parsed = JSON.parse(x.validation);
                        return parsed && parsed.is_loop && parsed.loop_type === "manual";
                      } catch (e) {
                        return false;
                      }
                    }) || groupQs[0];

                    const loopCount = getManualLoopCount(masterQ) || 1;
                    const instances = Array.from({ length: loopCount }, (_, idx) => idx);

                    return [
                      <ReviewQCard
                        key={`loop_group_${loopGroupName}`}
                        r={getQuestionCode(masterQ, questions, blocks)}
                        label={masterQ.label}
                        required={false}
                        skipInfo={`Kelompok Looping: ${loopGroupName.toUpperCase()}`}
                      >
                        <div className="space-y-6 mt-4">
                          {instances.map((idx) => (
                            <div key={idx} className="p-5 bg-slate-50/50 rounded-xl border border-solid border-slate-200/50 space-y-4">
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block border-b border-solid border-slate-200 pb-1.5">
                                Isian Ke-{idx + 1}
                              </span>
                              <div className="space-y-4">
                                {groupQs.map(gq => renderQuestionRow(gq, 0, false, idx))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {isEditing && (
                          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-dashed border-slate-100">
                            <button
                              type="button"
                              onClick={() => handleAddManualLoop(masterQ.id)}
                              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 rounded-lg text-xs font-bold transition-all cursor-pointer border-0"
                            >
                              <Plus size={14} />
                              Tambah Isian
                            </button>
                            {loopCount > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveManualLoop(masterQ.id, loopCount)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-95 rounded-lg text-xs font-bold transition-all cursor-pointer border-0"
                              >
                                <X size={14} />
                                Hapus Terakhir
                              </button>
                            )}
                            <span className="text-xs text-slate-500 font-semibold ml-auto">
                              Total: {loopCount} isian
                            </span>
                          </div>
                        )}
                      </ReviewQCard>
                    ];
                  }

                  const childQs = questions.filter(c => c.parent_id === q.id || c.parentId === q.id);
                  const hasChildren = childQs.length > 0;

                  if (hasChildren && (!q.label || q.label.trim() === "")) {
                    return childQs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(child => renderQuestionRow(child, 0, true));
                  }
                  return [renderQuestionRow(q)];
                });
              })()}
            </div>

            {/* Block bottom navigation */}
            <div className="flex gap-3 max-w-xl mt-6">
              <button
                disabled={viewingBlock === blocks[0]?.id}
                onClick={() => {
                  const prevBlock = BLOCKS[BLOCKS.findIndex(b => b.id === viewingBlock) - 1]?.id;
                  if (prevBlock) setViewingBlock(prevBlock);
                }}
                className="px-5 py-3 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs text-slate-500 font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-sm"
              >
                <ChevronLeft size={14} /> Sebelumnya
              </button>
              <button
                disabled={viewingBlock === blocks[blocks.length - 1]?.id}
                onClick={() => {
                  const nextBlock = BLOCKS[BLOCKS.findIndex(b => b.id === viewingBlock) + 1]?.id;
                  if (nextBlock) setViewingBlock(nextBlock);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Blok Berikutnya <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading && !viewingRecord) {
    return (
      <AdminLayout tab="admin-review" onNavigate={onNavigate} selectedProject={selectedProject} onProjectChange={onProjectChange} activities={activities}>
        <div className="p-6 lg:p-8 w-full animate-pulse space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
            <div className="space-y-2">
              <div className="h-7 w-48 bg-slate-200 rounded-lg"></div>
              <div className="h-4 w-32 bg-slate-100 rounded-md"></div>
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-32 bg-slate-200 rounded-xl"></div>
              <div className="h-10 w-48 bg-slate-150 rounded-xl"></div>
            </div>
          </div>

          {/* Tabs Skeleton */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="h-8 w-20 bg-slate-100 rounded-lg"></div>
              ))}
            </div>
            <div className="h-8 w-24 bg-slate-200 rounded-lg"></div>
          </div>

          {/* Table Skeleton */}
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
              <div className="h-4 w-48 bg-slate-200 rounded"></div>
            </div>
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="flex justify-between items-center py-2 border-b border-slate-50">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-6 w-16 bg-slate-100 rounded"></div>
                    <div className="h-4.5 w-40 bg-slate-200 rounded"></div>
                    <div className="h-4 w-24 bg-slate-100 rounded"></div>
                    <div className="h-4 w-28 bg-slate-150 rounded"></div>
                  </div>
                  <div className="h-7 w-20 bg-slate-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout tab="admin-review" onNavigate={onNavigate} selectedProject={selectedProject} onProjectChange={onProjectChange} activities={activities}>
      {viewingRecord ? (
        renderQuestionnaireViewer()
      ) : (
        <div className="p-6 lg:p-8 w-full slide-up">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Review Data</h1>
                {selectedProject && (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-xl text-[10px] font-bold ${statusConfig.text} ${statusConfig.bg} border-slate-100/50 shadow-sm`}>
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusConfig.pulse}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${statusConfig.dot}`}></span>
                    </span>
                    <span className="uppercase tracking-wider font-bold">{statusConfig.label}</span>
                  </div>
                )}
                <div className="relative">
                  <button
                    onClick={villageDropdown.toggle}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border-0 cursor-pointer hover:bg-blue-100 transition-all"
                  >
                    {villageDropdown.selected} <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${villageDropdown.isOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
                  </button>

                  {villageDropdown.isOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={villageDropdown.close} />
                      <div className="absolute left-0 top-full mt-1.5 bg-white rounded-xl shadow-lg z-20 py-1 border border-slate-100 w-56 overflow-hidden" style={{ animation: 'scaleIn 0.15s ease' }}>
                        {villages.map(v => (
                          <button key={v} onClick={() => villageDropdown.select(v)}
                            className={`w-full px-4 py-2.5 text-left text-xs border-0 cursor-pointer transition-all ${villageDropdown.selected === v ? 'bg-blue-50 text-blue-600 font-semibold' : 'bg-white text-slate-500 hover:bg-slate-50 font-medium'
                              }`}>
                            {v}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              <button
                disabled={!canUploadPrelist}
                onClick={() => setIsUploadModalOpen(true)}
                className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-semibold transition-all border-0 ${canUploadPrelist
                    ? "bg-blue-600 hover:bg-blue-700 text-white hover:shadow cursor-pointer hover:scale-[1.01]"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                title={
                  !selectedProject
                    ? "Pilih kegiatan terlebih dahulu"
                    : !isDraft
                      ? "Prelist dikunci karena kegiatan sudah dipublish"
                      : "Unggah prelist keluarga"
                }
              >
                <Upload size={14} />
                <span>Unggah Prelist</span>
              </button>
              {isDraft && (
                <button
                  disabled={!selectedProject || isKegiatanAdmin}
                  onClick={() => setIsAssignSlsModalOpen(true)}
                  className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-semibold transition-all border-0 ${selectedProject && !isKegiatanAdmin
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow cursor-pointer hover:scale-[1.01]"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                  title={
                    !selectedProject
                      ? "Pilih kegiatan terlebih dahulu"
                      : "Tugaskan petugas per SLS"
                  }
                >
                  <Edit3 size={14} />
                  <span>Tugaskan SLS</span>
                </button>
              )}
              <div className="flex-1 lg:w-72 flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                <Search size={16} className="text-slate-400" />
                <input
                  className="text-sm outline-none text-slate-700 placeholder-slate-400 w-full bg-transparent font-medium"
                  placeholder="Cari ID, Nama KRT, atau Petugas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", l: "Semua", c: villageData.length },
                { id: "menunggu", l: "Menunggu", c: count("menunggu") },
                { id: "submitted", l: "Submit", c: count("submitted") },
                { id: "pml_approved", l: "Disetujui PML", c: count("pml_approved") },
                { id: "approved", l: "Approved", c: count("approved") },
              ].map(t => (
                <button key={t.id} onClick={() => setFilter(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border-0 cursor-pointer transition-all ${filter === t.id ? "text-white bg-blue-600" : "bg-white border border-slate-100 text-slate-500 hover:bg-slate-50"
                    }`}>
                  {t.l}
                  <span className={`mono text-[10px] px-1.5 py-0.5 rounded font-semibold ${filter === t.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
                    }`}>{t.c}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 transition-all cursor-pointer"
            >
              <Filter size={13} /> Urutkan {sortOrder === "desc" ? "(Baru-Lama)" : "(Lama-Baru)"}
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 min-w-[950px]">
                <thead>
                  <tr className="bg-slate-50/50">
                    {status === "draft" ? (
                      ["ID", "Kepala Keluarga", "Desa", "SLS", "Sub SLS", "Tipe", "Petugas Pendataan (PCL)", "Pengawas (PML)", "Aksi"].map(h => (
                        <th key={h} className="px-6 py-3.5 text-left text-[11px] text-slate-400 font-bold uppercase tracking-wider">{h}</th>
                      ))
                    ) : (
                      ["ID", "Kepala Keluarga", "Petugas", "Desa", "SLS", "Sub SLS", "Tipe", "Tgl. Kirim", "Warning", "Status", "Aksi"].map(h => (
                        <th key={h} className="px-6 py-3.5 text-left text-[11px] text-slate-400 font-bold uppercase tracking-wider">{h}</th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sortedFiltered.map((r, index) => {
                    const showPrelistHeader = index === 0 && r.isPrelist;
                    const showTambahanHeader = (index === 0 && !r.isPrelist) || (index > 0 && !r.isPrelist && sortedFiltered[index - 1].isPrelist);

                    return (
                      <Fragment key={r.id}>
                        {showPrelistHeader && (
                          <tr className="bg-slate-50/30">
                            <td colSpan={status === "draft" ? 9 : 11} className="px-6 py-2.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase border-t border-b border-slate-100/80">
                              Target Prelist Desa ({sortedFiltered.filter(item => item.isPrelist).length} Keluarga)
                            </td>
                          </tr>
                        )}
                        {showTambahanHeader && (
                          <tr className="bg-indigo-50/10">
                            <td colSpan={status === "draft" ? 9 : 11} className="px-6 py-2.5 text-[10px] font-bold text-indigo-500 tracking-wider uppercase border-t border-b border-indigo-50/30">
                              Temuan Baru / Tambahan Lapangan ({sortedFiltered.filter(item => !item.isPrelist).length} Keluarga)
                            </td>
                          </tr>
                        )}
                        <tr className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-3.5 border-t border-slate-50">
                            <span className="mono text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-1 rounded-md">{r.id}</span>
                          </td>
                          <td className="px-6 py-3.5 border-t border-slate-50 text-sm font-semibold text-slate-700">
                            {r.krt || r.nama_krt || "Kepala Rumah Tangga"}
                          </td>
                          {status === "draft" ? (
                            <>
                              <td className="px-6 py-3.5 border-t border-slate-50 text-xs text-slate-500 font-semibold">{r.desa}</td>
                              <td className="px-6 py-3.5 border-t border-slate-50 text-xs text-slate-500 font-semibold">{r.sls || "—"}</td>
                              <td className="px-6 py-3.5 border-t border-slate-50 text-xs text-slate-500 font-medium">{r.subSls || "—"}</td>
                              <td className="px-6 py-3.5 border-t border-slate-50">
                                {r.isPrelist ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/50">
                                    Prelist
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100/50">
                                    Tambahan
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-3.5 border-t border-slate-50">
                                <div className="flex items-center gap-2">
                                  <MultiSelectDropdown
                                    idPrefix={`pcl-${r.id}`}
                                    selectedNames={r.assigned_pcls || []}
                                    allOptions={pcls}
                                    placeholder="Pilih PCL"
                                    disabled={isKegiatanAdmin}
                                    onChange={(updated) => handleAssignPCLMultiple(r, updated)}
                                  />
                                  {r.assigned_pcls && r.assigned_pcls.length > 0 ? (
                                    <span className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 animate-scale-in">
                                      <Check size={11} strokeWidth={3} />
                                    </span>
                                  ) : (
                                    <span className="w-5 h-5 rounded-full bg-slate-50 border border-slate-100 text-slate-300 flex items-center justify-center flex-shrink-0">
                                      <X size={11} strokeWidth={3} />
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-3.5 border-t border-slate-50">
                                <div className="flex items-center gap-2">
                                  <MultiSelectDropdown
                                    idPrefix={`pml-${r.id}`}
                                    selectedNames={r.assigned_pmls || []}
                                    allOptions={pmls}
                                    placeholder="Pilih PML"
                                    disabled={isKegiatanAdmin}
                                    onChange={(updated) => handleAssignPMLMultiple(r, updated)}
                                  />
                                  {r.assigned_pmls && r.assigned_pmls.length > 0 ? (
                                    <span className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 animate-scale-in">
                                      <Check size={11} strokeWidth={3} />
                                    </span>
                                  ) : (
                                    <span className="w-5 h-5 rounded-full bg-slate-50 border border-slate-100 text-slate-300 flex items-center justify-center flex-shrink-0">
                                      <X size={11} strokeWidth={3} />
                                    </span>
                                  )}
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-6 py-3.5 border-t border-slate-50">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-600">
                                    {r.petugas !== "Belum Ditugaskan" ? r.petugas.split(' ').map(n => n[0]).join('') : "?"}
                                  </div>
                                  <span className="text-sm font-semibold text-slate-700">{r.petugas}</span>
                                </div>
                              </td>
                              <td className="px-6 py-3.5 border-t border-slate-50 text-xs text-slate-500 font-semibold">{r.desa}</td>
                              <td className="px-6 py-3.5 border-t border-slate-50 text-xs text-slate-500 font-semibold">{r.sls || "—"}</td>
                              <td className="px-6 py-3.5 border-t border-slate-50 text-xs text-slate-500 font-medium">{r.subSls || "—"}</td>
                              <td className="px-6 py-3.5 border-t border-slate-50">
                                {r.isPrelist ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/50">
                                    Prelist
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100/50">
                                    Tambahan
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-3.5 border-t border-slate-50 mono text-xs text-slate-400 font-semibold">{new Date(r.updated_at || r.created_at).toLocaleDateString('id-ID')}</td>
                              <td className="px-6 py-3.5 border-t border-slate-50">
                                {r.flag > 0
                                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-600 rounded-md"><AlertTriangle size={11} />{r.flag}</span>
                                  : <span className="text-slate-200">—</span>}
                              </td>
                              <td className="px-6 py-3.5 border-t border-slate-50"><Badge status={r.status} /></td>
                            </>
                          )}
                          <td className="px-6 py-3.5 border-t border-slate-50">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenDetail(r)}
                                className="w-8 h-8 rounded-lg hover:bg-blue-50 flex items-center justify-center border-0 cursor-pointer text-slate-400 hover:text-blue-600 transition-all bg-transparent"
                                title="Lihat Detail Isian Kuesioner"
                              >
                                <Eye size={15} />
                              </button>
                              {status !== "draft" && r.status === "pml_approved" && !isKegiatanAdmin && (
                                <>
                                  <button onClick={() => setModal({ ...r, type: "approve" })}
                                    className="w-8 h-8 rounded-lg hover:bg-emerald-50 flex items-center justify-center border-0 cursor-pointer text-slate-400 hover:text-emerald-600 transition-all bg-transparent"
                                    title="Setujui (Admin)">
                                    <Check size={15} />
                                  </button>
                                  <button onClick={() => setModal({ ...r, type: "reject" })}
                                    className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center border-0 cursor-pointer text-slate-400 hover:text-red-600 transition-all bg-transparent"
                                    title="Tolak (Admin)">
                                    <X size={15} />
                                  </button>
                                </>
                              )}
                              {status === "draft" && !isKegiatanAdmin && (
                                <button
                                  onClick={() => setData(prev => prev.filter(item => item.id !== r.id))}
                                  className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center border-0 cursor-pointer text-slate-400 hover:text-red-500 transition-all bg-transparent"
                                  title="Hapus Data Keluarga"
                                >
                                  <X size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                  {sortedFiltered.length === 0 && (
                    <tr><td colSpan={status === "draft" ? 9 : 11} className="px-6 py-16 text-center">
                      <Search size={24} className="text-slate-200 mx-auto mb-2" />
                      <p className="text-xs text-slate-400 font-medium">Tidak ada dokumen di {villageDropdown.selected}</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          style={{ animation: 'fadeIn 0.2s ease' }}
          onClick={() => { if (!isUploading && !isSuccess) setIsUploadModalOpen(false); }}>
          <div className="bg-white rounded-2xl p-8 w-full shadow-lg max-h-[90vh] overflow-y-auto"
            style={{ maxWidth: 580, animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Unggah Prelist Keluarga</h3>
                  <p className="text-xs text-slate-400">Unggah data baseline keluarga untuk dipetakan</p>
                </div>
              </div>
              <button
                disabled={isUploading || isSuccess}
                onClick={() => setIsUploadModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center border-0 cursor-pointer text-slate-400 hover:text-slate-600 transition-all bg-transparent disabled:opacity-50">
                <X size={18} />
              </button>
            </div>


            {isSuccess ? (
              <div className="py-8 text-center" style={{ animation: 'scaleIn 0.2s ease' }}>
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <Check size={36} />
                </div>
                <h4 className="text-md font-bold text-slate-800 mb-1">Data Berhasil Diimpor!</h4>
                <p className="text-xs text-slate-400">Target Prelist keluarga telah ditambahkan ke sistem.</p>
              </div>
            ) : mappingStep === 1 ? (
              <>
                <div className="space-y-5">
                  <div className="flex items-center justify-between border border-slate-100 bg-slate-50/50 rounded-xl p-3.5">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Butuh template kolom file?</p>
                      <p className="text-[10px] text-slate-400">Gunakan format template standar agar data terbaca otomatis</p>
                    </div>
                    <button
                      onClick={handleDownloadTemplate}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-blue-600 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    >
                      <Upload size={12} className="rotate-180" />
                      Unduh Template
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2">File Prelist (Excel / CSV)</label>
                    <input type="file" ref={fileInputRef} onChange={(e) => { if (e.target.files?.length) handleSelectFile(e.target.files[0]); }} accept=".xlsx,.xls,.csv" className="hidden" />

                    {!uploadedFile ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-blue-50/10 flex flex-col items-center justify-center ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
                      >
                        {isUploading ? (
                          <>
                            <div className="w-8 h-8 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin mb-3" />
                            <p className="text-xs font-medium text-slate-500">Membaca dan memvalidasi file...</p>
                          </>
                        ) : (
                          <>
                            <Upload size={28} className="text-slate-300 mb-2.5" />
                            <p className="text-xs font-semibold text-slate-700 mb-1">
                              Klik untuk pilih file prelist keluarga
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Mendukung format xlsx/csv untuk semua desa sekaligus
                            </p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4" style={{ animation: 'scaleIn 0.15s ease' }}>
                        {/* File details card */}
                        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                              <FileText size={18} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 line-clamp-1">{uploadedFile.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{uploadedFile.size} • Terdeteksi {uploadedFile.rowCount} data keluarga</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setUploadedFile(null);
                              setDetectedColumns([]);
                              setPreviewRows([]);
                            }}
                            className="w-7 h-7 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg flex items-center justify-center border-0 bg-transparent cursor-pointer transition-all"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        {/* Review Kolom Terdeteksi */}
                        <div>
                          <span className="block text-xs font-semibold text-slate-500 mb-2">Kolom Terdeteksi</span>
                          <div className="flex flex-wrap gap-1.5">
                            {detectedColumns.map(c => (
                              <span key={c} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-semibold border border-blue-100/50">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Review Baris Data (Preview Table) */}
                        <div>
                          <span className="block text-xs font-semibold text-slate-500 mb-2">Pratinjau Data (Semua Desa)</span>
                          <div className="border border-slate-100 rounded-xl overflow-hidden text-[11px] bg-slate-50/30 overflow-x-auto">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="bg-slate-50/60 text-slate-400 font-semibold border-b border-slate-100 text-left">
                                  {detectedColumns.map(col => (
                                    <th key={col} className="px-3 py-2 uppercase tracking-wider whitespace-nowrap">{col.replace(/_/g, ' ')}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                                {previewRows.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                    {detectedColumns.map(col => (
                                      <td key={col} className="px-3 py-2 truncate max-w-[150px]">{row[col] || "—"}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-[10px] text-emerald-600 font-semibold mt-2 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-emerald-500" /> Semua baris data memiliki pemetaan desa yang valid.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    disabled={isUploading}
                    onClick={() => {
                      setIsUploadModalOpen(false);
                      setUploadedFile(null);
                      setDetectedColumns([]);
                      setPreviewRows([]);
                    }}
                    className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-medium text-slate-600 cursor-pointer transition-all border-0 disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    disabled={!uploadedFile || isUploading}
                    onClick={() => setMappingStep(2)}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-white border-0 cursor-pointer transition-all hover:shadow active:scale-[0.98]"
                  >
                    Selanjutnya
                  </button>
                </div>
              </>
            ) : mappingStep === 2 ? (
              <div className="space-y-4">
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">{uploadedFile?.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Terdeteksi {uploadedFile?.rowCount} baris data</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                  <label className="block text-xs font-bold text-blue-900 mb-1">Pilih Kolom Master Pengelompokan (Grouping Key)</label>
                  <p className="text-[10px] text-blue-600 mb-3">Kolom ini digunakan untuk menggabungkan baris yang memiliki nilai yang sama menjadi 1 Dokumen Keluarga (Misal: No KK). Jika Anda hanya mendaftar 1 baris per dokumen, pilih ID unik.</p>
                  <SearchableSelect
                    value={groupingColumn}
                    onChange={val => setGroupingColumn(val)}
                    placeholder="Pilih Kolom Excel..."
                    showValueInLabel={false}
                    options={[
                      { value: "", label: "Pilih Kolom Excel..." },
                      ...detectedColumns.map(c => ({ value: c, label: c }))
                    ]}
                  />
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-3 mt-2">Pemetaan Kolom Excel ke Kuesioner</h4>
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                    {[...detectedColumns, '__AUTO_COUNT__'].map(col => {
                      const isAutoCount = col === '__AUTO_COUNT__';
                      return (
                        <div key={col} className="flex flex-col md:flex-row md:items-center gap-2 p-2 border-b border-slate-100 last:border-0">
                          <div className="w-full md:w-1/3">
                            <span className={`text-[11px] font-semibold ${isAutoCount ? 'text-emerald-600' : 'text-slate-700'}`}>
                              {isAutoCount ? '[Otomatis: Jumlah Baris]' : col}
                            </span>
                          </div>
                          <div className="w-full md:w-2/3">
                            <SearchableSelect
                              value={columnMapping[col] || ""}
                              onChange={val => setColumnMapping({ ...columnMapping, [col]: val })}
                              placeholder="Tidak Dipetakan (Abaikan)"
                              showValueInLabel={false}
                              options={[
                                { value: "", label: "Tidak Dipetakan (Abaikan)" },
                                ...questions.slice().sort((a, b) => (a.label || "").localeCompare(b.label || "")).map(q => ({ value: q.id, label: q.label }))
                              ]}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                  <button onClick={() => setMappingStep(1)} className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer transition-all border-0">
                    Kembali
                  </button>
                  <button
                    disabled={!groupingColumn || isUploading}
                    onClick={handleImportPrelist}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl text-xs font-semibold text-white border-0 cursor-pointer transition-all hover:shadow active:scale-[0.98]"
                  >
                    {isUploading ? "Memproses..." : "Impor Data Prelist"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {isAssignSlsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          style={{ animation: 'fadeIn 0.2s ease' }}
          onClick={() => { if (!isAssigningSls) setIsAssignSlsModalOpen(false); }}>
          <div className="bg-white rounded-2xl p-8 w-full shadow-lg max-h-[95vh] overflow-y-auto"
            style={{ maxWidth: 640, animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Tugaskan Petugas Per SLS</h3>
                  <p className="text-xs text-slate-400">Penugasan massal PCL dan PML untuk seluruh keluarga dalam satu SLS</p>
                </div>
              </div>
              <button
                disabled={isAssigningSls}
                onClick={() => setIsAssignSlsModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center border-0 cursor-pointer text-slate-400 hover:text-slate-600 transition-all bg-transparent disabled:opacity-50">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Select SLS */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Pilih Satuan Lingkungan Setempat (SLS)</label>
                <select
                  value={selectedSls}
                  onChange={e => setSelectedSls(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 font-semibold text-slate-700 cursor-pointer outline-none transition-all"
                >
                  <option value="">-- Pilih SLS --</option>
                  {uniqueSlsList.map(sls => (
                    <option key={sls} value={sls}>{sls}</option>
                  ))}
                </select>
                {uniqueSlsList.length === 0 && (
                  <p className="text-[10px] text-amber-500 font-semibold mt-1">
                    * Tidak ada SLS terdeteksi di dokumen kegiatan saat ini. Unggah prelist terlebih dahulu.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* PCL selection */}
                <div className="flex flex-col">
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Pilih Petugas Pendataan (PCL)
                  </label>
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 mb-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/10">
                    <Search size={12} className="text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari PCL..."
                      value={pclSearch}
                      onChange={e => setPclSearch(e.target.value)}
                      className="text-xs outline-none bg-transparent w-full font-semibold text-slate-700"
                    />
                  </div>
                  <div className="border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2.5 bg-white">
                    {filteredPcls.map(p => {
                      const isChecked = selectedSlsPcls.includes(p.name);
                      return (
                        <label key={p.name} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedSlsPcls(prev =>
                                prev.includes(p.name) ? prev.filter(n => n !== p.name) : [...prev, p.name]
                              );
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className="truncate">{p.name}</span>
                        </label>
                      );
                    })}
                    {filteredPcls.length === 0 && (
                      <p className="text-[10px] text-slate-400 text-center py-4">Tidak ada PCL ditemukan</p>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-medium">
                    {selectedSlsPcls.length} PCL terpilih
                  </div>
                </div>

                {/* PML selection */}
                <div className="flex flex-col">
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Pilih Pengawas (PML)
                  </label>
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 mb-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/10">
                    <Search size={12} className="text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari PML..."
                      value={pmlSearch}
                      onChange={e => setPmlSearch(e.target.value)}
                      className="text-xs outline-none bg-transparent w-full font-semibold text-slate-700"
                    />
                  </div>
                  <div className="border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2.5 bg-white">
                    {filteredPmls.map(p => {
                      const isChecked = selectedSlsPmls.includes(p.name);
                      return (
                        <label key={p.name} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedSlsPmls(prev =>
                                prev.includes(p.name) ? prev.filter(n => n !== p.name) : [...prev, p.name]
                              );
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className="truncate">{p.name}</span>
                        </label>
                      );
                    })}
                    {filteredPmls.length === 0 && (
                      <p className="text-[10px] text-slate-400 text-center py-4">Tidak ada PML ditemukan</p>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-medium">
                    {selectedSlsPmls.length} PML terpilih
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8 pt-4 border-t border-slate-100">
              <button
                disabled={isAssigningSls}
                onClick={() => {
                  setIsAssignSlsModalOpen(false);
                  setSelectedSls("");
                  setSelectedSlsPcls([]);
                  setSelectedSlsPmls([]);
                  setPclSearch("");
                  setPmlSearch("");
                }}
                className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-medium text-slate-600 cursor-pointer transition-all border-0 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                disabled={!selectedSls || isAssigningSls}
                onClick={handleAssignSlsSubmit}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-white border-0 cursor-pointer transition-all hover:shadow active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isAssigningSls ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Simpan Penugasan"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve / Unapprove Sidebar Confirm Modal */}
      {confirmModalType && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          style={{ animation: 'fadeIn 0.2s ease' }}
          onClick={() => setConfirmModalType(null)}>
          <div className="bg-white rounded-2xl p-8 w-full shadow-lg max-w-[420px]"
            style={{ animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}
            onClick={e => e.stopPropagation()}>

            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${confirmModalType === "approve" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
              }`}>
              {confirmModalType === "approve" ? <Check size={24} /> : <AlertTriangle size={24} />}
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1.5">
              {confirmModalType === "approve" ? "Setujui Dokumen?" : "Batalkan Persetujuan?"}
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              {confirmModalType === "approve"
                ? `Apakah Anda yakin ingin menyetujui dokumen ${viewingRecord.id} dari ${viewingRecord.petugas}? Dokumen akan disimpan sebagai data valid.`
                : `Apakah Anda yakin ingin membatalkan persetujuan dokumen ${viewingRecord.id}? Status dokumen akan dikembalikan menjadi 'Submitted' dan dapat diedit kembali.`
              }
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModalType(null)}
                className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer transition-all border-0"
              >
                Batal
              </button>
              <button
                onClick={confirmModalType === "approve" ? handleApprove : handleUnapprove}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white border-0 cursor-pointer transition-all ${confirmModalType === "approve" ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                  }`}
              >
                Ya, Yakin
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <ConfirmModal
          type={modal.type}
          documentId={modal.id}
          petugasName={modal.petugas}
          flagCount={modal.flag}
          note={note}
          onNoteChange={e => setNote(e.target.value)}
          onConfirm={modal.type === "approve" ? approve : reject}
          onCancel={() => setModal(null)}
        />
      )}
    </AdminLayout>
  );
}

export default AdminDataReview;