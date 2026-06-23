import { useState, useEffect, useRef, useMemo, useCallback, startTransition } from 'react';
import { ArrowLeft, Save, Check, AlertTriangle, ChevronRight, ChevronLeft, Plus, CheckCircle, Calendar, FileText, Landmark, ShieldCheck, MessageSquare, XCircle, X, Clock, AlertCircle, Info, RefreshCw, MapPin, Trash2, ChevronUp } from "lucide-react";
import QCard from "../../components/ui/QCard";
import Badge from "../../components/ui/Badge";
import PetugasLayout from "../../components/layouts/PetugasLayout";
import { api, API_BASE } from "../../services/api";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { offlineDB } from "../../services/offlineStorage";
import SignaturePad from "../../components/ui/SignaturePad";
import { useNotification } from "../../components/ui/NotificationContext";

// Debounce helper
const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);
  return useCallback((...args) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
};

// Debounced Input Components
const DebouncedInput = ({ value, onChange, delay = 500, forceUppercase = false, allowedPattern, isNumberFormat = false, ...props }) => {
  const [localValue, setLocalValue] = useState(value || "");
  const [isFocused, setIsFocused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  const handleChange = (e) => {
    let newVal = e.target.value;
    if (isNumberFormat) {
      // Convert typed comma to dot for internal processing and validation
      newVal = newVal.replace(/,/g, ".");
    }
    
    if (forceUppercase) newVal = newVal.toUpperCase();
    if (allowedPattern && newVal !== "" && newVal !== "-" && !allowedPattern.test(newVal)) return;

    setLocalValue(newVal);
    // REMOVED: Auto-save on typing. Now it ONLY saves on blur.
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    if (props.onFocus) props.onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    // Save to global state only when losing focus
    if (localValue !== (value || "")) {
      onChange(localValue);
    }
    if (props.onBlur) props.onBlur(e);
  };

  const displayValue = useMemo(() => {
    if (!isNumberFormat) return localValue;
    if (isFocused) {
      // While focused, show unformatted number but use comma for decimal
      return localValue.replace(/\./g, ",");
    }
    // On blur, apply full formatting
    if (!localValue || localValue === "-" || localValue === "-." || localValue.endsWith(".")) {
      return localValue.replace(/\./g, ",");
    }
    
    const parts = localValue.toString().split(".");
    // Format integer part with thousands separator (dot)
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
    // REMOVED: Auto-save on typing. Now it ONLY saves on blur.
  };

  const handleBlur = (e) => {
    // Save to global state only when losing focus
    if (localValue !== (value || "")) {
      onChange(localValue);
    }
    if (props.onBlur) props.onBlur(e);
  };

  return <textarea {...props} value={localValue} onChange={handleChange} onBlur={handleBlur} />;
};

const FastRadioGroup = ({ value, onChange, options, name, className }) => {
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
    }, 50); // reduced delay for snappier skip logic
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
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
};

const FastSelect = ({ value, onChange, options, className, placeholder = "Pilih Opsi", children }) => {
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
    <select value={localValue} onChange={handleChange} className={className}>
      <option value="">{placeholder}</option>
      {options ? options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      )) : children}
    </select>
  );
};

const FastChoiceButton = ({ isSelected, onClick, children, disabled, type }) => {
  const [localSelected, setLocalSelected] = useState(isSelected);
  const timerRef = useRef(null);

  useEffect(() => setLocalSelected(isSelected), [isSelected]);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        setLocalSelected(type === 'select' ? !localSelected : true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => onClick(), 50);
      }}
      className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border border-solid text-xs font-medium transition-all text-left ${
        localSelected 
          ? "border-blue-500 bg-blue-50 text-blue-700 font-bold" 
          : "border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50/50"
      } ${disabled ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
    >
      <div className={`w-4 h-4 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
        type === 'select'
          ? `rounded border-2 ${localSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-200'}`
          : `rounded-full border-2 ${localSelected ? 'border-blue-600' : 'border-slate-200'}`
      }`}>
        {localSelected && (
          type === 'select'
            ? <Check size={10} className="text-white stroke-[3px]" />
            : <div className="w-2 h-2 rounded-full bg-blue-600"/>
        )}
      </div>
      {children}
    </button>
  );
};

// Memoized parseValidation cache
const validationCache = new Map();
const getCachedValidation = (validation) => {
  if (!validation) return { rangeText: "", hintText: "", description: "", isLoop: false, loopType: "question", loopByQuestionId: null, defaultVal: null, isLookupKey: false, readOnly: false, parentMode: "label", subLabel: "" };
  if (validationCache.has(validation)) return validationCache.get(validation);

  // Simple parse (inline for speed - complex parsing in parseValidation function)
  const result = { rangeText: "", hintText: "", description: validation, isLoop: false, loopType: "question" };
  validationCache.set(validation, result);
  return result;
};

const checkOptionTrigger = (val, triggerOptions) => {
  if (val === undefined || val === null || val === '') return false;
  const trimmed = typeof val === 'string' ? val.trim() : '';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsedVal = JSON.parse(trimmed);
      if (Array.isArray(parsedVal)) {
        return parsedVal.some(item => triggerOptions.includes(String(item)));
      }
      if (parsedVal && typeof parsedVal === 'object') {
        if ('value' in parsedVal) {
          return triggerOptions.includes(String(parsedVal.value));
        }
        return triggerOptions.some(opt => {
          const optVal = parsedVal[opt];
          return optVal !== undefined && optVal !== null && optVal !== '' && optVal !== 0 && optVal !== '0';
        });
      }
    } catch (e) {}
  }
  return triggerOptions.includes(String(val));
};

const evaluateCondition = (c, values) => {
  const val = values[c.question_id];
  if (c.operator && ['=', '>', '>=', '<', '<='].includes(c.operator)) {
    if (val === undefined || val === null || val === '') return false;
    let actualVal = val;
    if (typeof val === 'string' && val.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(val);
        if (parsed && 'value' in parsed) {
          actualVal = parsed.value;
        }
      } catch (e) {}
    }
    const numericVal = parseFloat(actualVal);
    const targetVal = parseFloat(c.value);
    if (isNaN(numericVal) || isNaN(targetVal)) return false;
    switch (c.operator) {
      case '=': return numericVal === targetVal;
      case '>': return numericVal > targetVal;
      case '>=': return numericVal >= targetVal;
      case '<': return numericVal < targetVal;
      case '<=': return numericVal <= targetVal;
      default: return false;
    }
  }
  const triggerOptions = String(c.value).split(",").map(x => x.trim()).filter(Boolean);
  return checkOptionTrigger(val, triggerOptions);
};

/**
 * Halaman pengisian kuesioner petugas — clean & BPS standard.
 * Menyediakan alur: Pilih Kegiatan -> Daftar Prelist -> Isi/Tambah Kuesioner (Dinamis per Blok)
 *
 * @param {Object} props
 * @param {(screen: string) => void} props.onNavigate
 * @param {Array} props.petugas
 * @param {Array} props.activities
 * @param {Object} props.currentUser
 * @param {boolean} props.isOffline
 * @returns {React.ReactElement}
 */
function PetugasQuestionnaire({ onNavigate, petugas, activities, currentUser, isOffline, loading }) {
  const { showToast } = useNotification();
  // Unified questionnaire state
  const [ans, setAns] = useState({
    kode: "",
    krt: "",
    alamat: "",
    kecamatan: "",
    desa: "",
    sls: "",
    sub_sls: "",
    is_prelist: false,
    values: {} // Object map { [question_id]: value }
  });

  const [view, setView] = useState("select_activity"); // select_activity | prelist | form
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [localPrelist, setLocalPrelist] = useState([]);
  const [localActivities, setLocalActivities] = useState(activities || []);
  const [selectedRtItem, setSelectedRtItem] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  
  // Dynamic form schema states
  const [blocks, setBlocks] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loadingForm, setLoadingForm] = useState(false);

  const [activeTab, setActiveTab] = useState(""); // Block kode (e.g. "Blok I", "Blok II")
  const [selectedLogItem, setSelectedLogItem] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);
  const [rejectionNoteItem, setRejectionNoteItem] = useState(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null
  });

  const isLoading = loading || loadingForm;

  // Optimized Lookup Maps & Memoized Caches to prevent render lag
  const questionCodesMap = useMemo(() => {
    const cache = new Map();
    const getCode = (q) => {
      if (!q) return "";
      const cacheKey = String(q.id);
      if (cache.has(cacheKey)) return cache.get(cacheKey);

      const valStr = q.validation || q.val;
      if (valStr && valStr.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(valStr);
          if (parsed.custom_code || parsed.customCode) {
            const code = String(parsed.custom_code || parsed.customCode);
            cache.set(cacheKey, code);
            return code;
          }
        } catch (e) {}
      }

      const block = blocks.find(b => b.id === q.blok_id || b.kode === q.blok_id);
      let blockIdx = 0;
      if (block) {
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
        const kodeStr = String(block.kode || block.id || "");
        const match = kodeStr.match(/^Blok\s+([IVXLCDMivxlcdm]+)/i);
        if (match) {
          blockIdx = romanToDecimal(match[1]);
        }
      }

      if (!blockIdx) {
        const standardBlocks = blocks.filter(b => {
          const idStr = String(b.kode || b.id || "");
          return idStr.startsWith("Blok ");
        });
        blockIdx = standardBlocks.findIndex(b => (b.id === q.blok_id || b.kode === q.blok_id)) + 1;
      }
      if (blockIdx === 0) {
        cache.set(cacheKey, "");
        return "";
      }
      
      const parentId = q.parent_id || q.parentId;
      if (parentId) {
        const parent = questions.find(p => p.id === parentId);
        if (!parent) {
          cache.set(cacheKey, "");
          return "";
        }
        const parentCode = getCode(parent);
        
        const siblings = questions.filter(s => s.blok_id === q.blok_id && (s.parent_id === parentId || s.parentId === parentId)).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const sibIdx = siblings.findIndex(s => s.id === q.id);
        
        if (parent.parent_id || parent.parentId) {
          const romanNumerals = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
          const suffix = romanNumerals[sibIdx] || (sibIdx + 1).toString();
          const code = `${parentCode}.${suffix}`;
          cache.set(cacheKey, code);
          return code;
        } else {
          const letter = String.fromCharCode(97 + (sibIdx >= 0 ? sibIdx : 0));
          const code = `${parentCode}${letter}`;
          cache.set(cacheKey, code);
          return code;
        }
      } else {
        const mainQs = questions.filter(s => s.blok_id === q.blok_id && !s.parent_id && !s.parentId && s.type !== 'note').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        
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
            } catch (e) {}
          }
        }

        const qIdx = mainQs.findIndex(s => s.id === q.id) + startIndex;
        const padded = qIdx.toString().padStart(2, '0');
        const code = `${blockIdx}${padded}`;
        cache.set(cacheKey, code);
        return code;
      }
    };

    questions.forEach(q => {
      getCode(q);
    });

    return cache;
  }, [questions, blocks]);

  const getQuestionCode = useCallback((q) => {
    if (!q) return "";
    return questionCodesMap.get(String(q.id)) || "";
  }, [questionCodesMap]);

  const questionMapById = useMemo(() => {
    const map = new Map();
    questions.forEach(q => {
      map.set(String(q.id), q);
    });
    return map;
  }, [questions]);

  const questionMapByCode = useMemo(() => {
    const map = new Map();
    questions.forEach(q => {
      const qCode = getQuestionCode(q);
      if (qCode) {
        const normalized = qCode.toLowerCase().replace(/\s/g, "");
        map.set(normalized, q);
      }
    });
    return map;
  }, [questions, getQuestionCode]);

  const findQuestionByCode = useCallback((codeStr) => {
    if (!codeStr) return null;
    const normalizedCode = codeStr.toLowerCase().replace(/^r\.?/, "").replace(/\s/g, "");
    return questionMapByCode.get(normalizedCode) || null;
  }, [questionMapByCode]);

  const blockMap = useMemo(() => {
    const map = new Map();
    blocks.forEach(b => {
      map.set(String(b.id), b);
      map.set(String(b.kode), b);
    });
    return map;
  }, [blocks]);

  const questionsByBlockMap = useMemo(() => {
    const map = new Map();
    questions.forEach(q => {
      const key1 = String(q.blok_id);
      if (!map.has(key1)) map.set(key1, []);
      map.get(key1).push(q);
    });
    return map;
  }, [questions]);

  const loopGroupsMap = useMemo(() => {
    const nameToQs = new Map();
    questions.forEach(q => {
      if (q.validation) {
        try {
          const parsed = JSON.parse(q.validation);
          if (parsed && parsed.loop_group) {
            const groupName = parsed.loop_group;
            if (!nameToQs.has(groupName)) {
              nameToQs.set(groupName, []);
            }
            nameToQs.get(groupName).push(q);
          }
        } catch (e) {}
      }
    });

    const masterMap = new Map();
    const hasManualMap = new Map();
    const manualMasterMap = new Map();

    nameToQs.forEach((groupQs, groupName) => {
      const masterQ = groupQs.find(x => {
        if (!x.validation) return false;
        try {
          const parsed = JSON.parse(x.validation);
          return parsed && parsed.is_loop;
        } catch (e) {
          return false;
        }
      }) || groupQs[0];
      masterMap.set(groupName, masterQ);

      const hasManual = groupQs.some(x => {
        if (!x.validation) return false;
        try {
          const parsed = JSON.parse(x.validation);
          return parsed && parsed.is_loop && parsed.loop_type === "manual";
        } catch (e) {
          return false;
        }
      });
      hasManualMap.set(groupName, hasManual);

      const manualMasterQ = groupQs.find(x => {
        if (!x.validation) return false;
        try {
          const parsed = JSON.parse(x.validation);
          return parsed && parsed.is_loop && parsed.loop_type === "manual";
        } catch (e) {
          return false;
        }
      }) || groupQs[0];
      manualMasterMap.set(groupName, manualMasterQ);
    });

    return {
      groupQs: nameToQs,
      masterQs: masterMap,
      hasManual: hasManualMap,
      manualMasterQs: manualMasterMap
    };
  }, [questions]);

  const allOrderedQuestions = useMemo(() => {
    const allOrdered = [];
    blocks.forEach(b => {
      const blockQs = questionsByBlockMap.get(String(b.id)) || questionsByBlockMap.get(String(b.kode)) || [];
      const mainQs = blockQs.filter(x => !x.parent_id && !x.parentId);
      const addChildrenRecursive = (parentId) => {
        const children = blockQs.filter(x => (x.parent_id === parentId || x.parentId === parentId))
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        children.forEach(child => {
          allOrdered.push(child);
          addChildrenRecursive(child.id);
        });
      };
      mainQs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      mainQs.forEach(parent => {
        allOrdered.push(parent);
        addChildrenRecursive(parent.id);
      });
    });
    return allOrdered;
  }, [blocks, questionsByBlockMap]);

  const questionIndexMap = useMemo(() => {
    const map = new Map();
    allOrderedQuestions.forEach((q, idx) => {
      map.set(String(q.id), idx);
    });
    return map;
  }, [allOrderedQuestions]);

  const allSkippers = useMemo(() => {
    return questions.filter(quest => quest.skip_target && quest.skip_logic !== undefined && quest.skip_logic !== null);
  }, [questions]);

  const activeSkipsMemo = useMemo(() => {
    const activeSkips = [];
    questions.forEach(q => {
      if (!q.skip_target || !q.skip_logic) return;
      let matchesTrigger = false;
      const qVal = ans.values[q.id];
      try {
        const parsed = JSON.parse(q.skip_logic);
        if (parsed && parsed.conditions && parsed.conditions.length > 0) {
          const operator = parsed.operator || "AND";
          const results = parsed.conditions.map(c => evaluateCondition(c, ans.values));
          matchesTrigger = operator === "OR" ? results.some(r => r) : results.every(r => r);
        }
      } catch (e) {
        const triggerOptions = String(q.skip_logic).split(",").map(x => x.trim()).filter(Boolean);
        matchesTrigger = checkOptionTrigger(qVal, triggerOptions);
      }
      if (matchesTrigger) {
        activeSkips.push({
          questionId: q.id,
          questionCode: getQuestionCode(q),
          skipTargetId: q.skip_target
        });
      }
    });
    return activeSkips;
  }, [questions, ans.values, getQuestionCode]);

  const getActiveSkips = useCallback(() => activeSkipsMemo, [activeSkipsMemo]);

  const blocksToHideBySkip = useMemo(() => {
    const blocksToHide = new Set();
    if (activeSkipsMemo.length === 0) return blocksToHide;

    const getBlockOrder = (b) => {
      const kodeStr = String(b.kode || b.id || "");
      const match = kodeStr.match(/^Blok\s+([IVXLCDMivxlcdm]+)/i);
      if (match) {
        const romanToDecimal = (roman) => {
          const map = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
          let dec = 0;
          const str = roman.toLowerCase();
          for (let i = 0; i < str.length; i++) {
            const current = map[str[i]];
            const next = map[str[i + 1]];
            if (next && current < next) { dec += next - current; i++; } else { dec += current; }
          }
          return dec || 0;
        };
        return romanToDecimal(match[1]);
      }
      if (kodeStr.toLowerCase() === "pengantar") return 0;
      return 999;
    };

    const sortedBlocks = [...blocks].sort((a, b) => {
      const orderA = getBlockOrder(a);
      const orderB = getBlockOrder(b);
      return orderA - orderB;
    });

    activeSkipsMemo.forEach(skip => {
      const skipperQ = questionMapById.get(String(skip.questionId));
      if (!skipperQ) return;
      const skipperBlock = blockMap.get(String(skipperQ.blok_id));
      const targetQ = questionMapById.get(String(skip.skipTargetId));
      const targetBlock = targetQ ? blockMap.get(String(targetQ.blok_id)) : null;
      if (!skipperBlock || !targetBlock) return;

      const skipperBlockIdx = sortedBlocks.findIndex(b => b.id === skipperBlock.id || b.kode === skipperBlock.kode);
      const targetBlockIdx = sortedBlocks.findIndex(b => b.id === targetBlock.id || b.kode === targetBlock.kode);
      if (skipperBlockIdx === -1 || targetBlockIdx === -1 || targetBlockIdx <= skipperBlockIdx) return;

      for (let i = skipperBlockIdx + 1; i < targetBlockIdx; i++) {
        blocksToHide.add(sortedBlocks[i].id);
        blocksToHide.add(sortedBlocks[i].kode);
      }
    });

    return blocksToHide;
  }, [blocks, activeSkipsMemo, questionMapById, blockMap]);

  const getBlocksToHideBySkip = useCallback(() => blocksToHideBySkip, [blocksToHideBySkip]);

  const parseValidation = useCallback((str) => {
    if (!str) return { rangeText: "", hintText: "", description: "", isLoop: false, loopByQuestionId: null, subLabel: "" };
    if (validationCache.has(str)) return validationCache.get(str);

    const trimmed = str.trim();
    let result;
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        let rangeText = "";
        if (parsed.type === 'range') {
          rangeText = `Rentang: ${parsed.min} - ${parsed.max}`;
        } else if (parsed.type === 'min') {
          rangeText = `Minimal: ${parsed.min}`;
        } else if (parsed.type === 'gt') {
          rangeText = `Lebih dari: ${parsed.min}`;
        }
        result = {
          rangeText,
          hintText: parsed.hint || "",
          description: parsed.description || parsed.hint || "",
          isLoop: !!parsed.is_loop,
          loopType: parsed.loop_type || (parsed.loop_by_question_id ? "question" : "manual"),
          loopByQuestionId: parsed.loop_by_question_id || null,
          defaultVal: parsed.default_val || null,
          isLookupKey: !!parsed.is_lookup_key,
          copyOnKeyMatch: !!parsed.copy_on_key_match,
          readOnly: !!parsed.read_only,
          parentMode: parsed.parent_mode || "label",
          subLabel: parsed.sub_label || "",
          formula: parsed.formula || ""
        };
      } catch (e) {
        result = { rangeText: "", hintText: "", description: str, isLoop: false, loopByQuestionId: null, subLabel: "" };
      }
    } else if (trimmed.startsWith('range:')) {
      result = {
        rangeText: `Rentang: ${trimmed.replace('range:', '').trim()}`,
        hintText: "",
        description: "",
        isLoop: false,
        loopType: "question",
        loopByQuestionId: null,
        defaultVal: null,
        isLookupKey: false,
        copyOnKeyMatch: false,
        subLabel: ""
      };
    } else if (trimmed.startsWith('min:')) {
      result = {
        rangeText: `Minimal: ${trimmed.replace('min:', '').trim()}`,
        hintText: "",
        description: "",
        isLoop: false,
        loopType: "question",
        loopByQuestionId: null,
        defaultVal: null,
        isLookupKey: false,
        copyOnKeyMatch: false,
        subLabel: ""
      };
    } else {
      result = {
        rangeText: "",
        hintText: "",
        description: str,
        isLoop: false,
        loopType: "question",
        loopByQuestionId: null,
        defaultVal: null,
        isLookupKey: false,
        copyOnKeyMatch: false,
        subLabel: ""
      };
    }

    validationCache.set(str, result);
    return result;
  }, []);

  // Ref untuk mencegah infinite loop di formula evaluation
  const isEvaluatingRef = useRef(false);
  // Track formula questions untuk avoid recalculation
  const formulaQuestionsRef = useRef([]);

  // Debounced localStorage save - hanya save 1 detik setelah user berhenti mengetik
  const debouncedSaveRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────
  // HELPER: Debounced auto-save to localStorage
  // ─────────────────────────────────────────────────────────────────────────
  const debouncedSaveToLocal = useCallback((docData) => {
    if (debouncedSaveRef.current) {
      clearTimeout(debouncedSaveRef.current);
    }
    debouncedSaveRef.current = setTimeout(() => {
      try {
        const storageKey = `offline_docs_${currentUser.id}`;
        const cached = localStorage.getItem(storageKey);
        let cachedList = cached ? JSON.parse(cached) : [];
        const idx = cachedList.findIndex(d => d.kode === docData.kode);
        if (idx > -1) {
          cachedList[idx] = { ...cachedList[idx], ...docData };
        } else {
          cachedList.push(docData);
        }
        localStorage.setItem(storageKey, JSON.stringify(cachedList));
      } catch (e) {
        console.warn('Auto-save failed:', e);
      }
    }, 1000); // 1 detik debounce
  }, [currentUser.id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debouncedSaveRef.current) {
        clearTimeout(debouncedSaveRef.current);
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // HELPER: Safe Document Storage - Hybrid localStorage + IndexedDB
  // Menyimpan dokumen ke IndexedDB sebagai backup jika localStorage penuh
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Simpan dokumen ke IndexedDB dengan fallback ke localStorage
   * Menggunakan 'kode' sebagai keyPath (sesuai schema IndexedDB)
   */
  const saveDokumenToIDB = async (doc) => {
    try {
      if (offlineDB.isAvailable()) {
        await offlineDB.saveDokumen({
          ...doc,
          sync_status: doc.sync !== false ? 'synced' : 'pending'
        });
        return true;
      }
    } catch (e) {
      console.warn('Gagal menyimpan ke IndexedDB:', e);
    }
    return false;
  };

  /**
   * Hapus dokumen dari IndexedDB berdasarkan kode
   */
  const deleteDokumenFromIDB = async (kode) => {
    try {
      if (offlineDB.isAvailable()) {
        await offlineDB.removeDokumen(kode);
        return true;
      }
    } catch (e) {
      console.warn('Gagal menghapus dari IndexedDB:', e);
    }
    return false;
  };

  /**
   * Simpan list dokumen dengan aman - coba localStorage, fallback ke IndexedDB per-dokumen
   * Mengembalikan { success, data, warning }
   */
  const safeSaveDocuments = (cachedList) => {
    const result = { success: true, warning: null };
    const storageKey = `offline_docs_${currentUser.id}`;

    // 1. Coba simpan ke localStorage
    try {
      localStorage.setItem(storageKey, JSON.stringify(cachedList));
    } catch (e) {
      // localStorage penuh atau error
      console.warn('localStorage penuh/error, menyimpan per-dokumen:', e.message);
      result.warning = 'localStorage penuh, data disimpan ke IndexedDB';

      // 2. Fallback: simpan masing-masing dokumen ke IndexedDB
      cachedList.forEach(doc => {
        saveDokumenToIDB(doc);
      });

      // 3. Simpan list ke IndexedDB juga
      try {
        if (offlineDB.isAvailable()) {
          offlineDB.clearStore('dokumen').then(() => {
            cachedList.forEach(doc => saveDokumenToIDB(doc));
          });
        }
      } catch (idbErr) {
        console.error('IndexedDB juga gagal:', idbErr);
        result.success = false;
      }
    }

    return result;
  };

  /**
   * Hapus duplikat dari localStorage berdasarkan kode dokumen.
   * Mempertahankan data dengan timestamp terbaru.
   */
  const deduplicateLocalDocs = (docs) => {
    const codeMap = new Map();
    docs.forEach(doc => {
      if (!doc.kode) return;
      const existing = codeMap.get(doc.kode);
      if (!existing) {
        codeMap.set(doc.kode, doc);
      } else {
        // Simpan yang lebih baru
        const existingTime = new Date(existing.updated_at || existing.created_at || 0).getTime();
        const newTime = new Date(doc.updated_at || doc.created_at || 0).getTime();
        if (newTime > existingTime) {
          codeMap.set(doc.kode, doc);
        }
      }
    });
    return Array.from(codeMap.values());
  };

  /**
   * Recover dokumen dari IndexedDB jika localStorage kosong
   */
  const recoverFromIDB = async (kegiatanId) => {
    try {
      if (!offlineDB.isAvailable()) return null;

      const allDocs = await offlineDB.getAllDokumen();
      const filteredDocs = allDocs.filter(d => d.kegiatan_id === kegiatanId);

      if (filteredDocs.length > 0) {
        // Simpan ke localStorage untuk cache
        const storageKey = `offline_docs_${currentUser.id}`;
        try {
          const existing = localStorage.getItem(storageKey);
          const existingList = existing ? JSON.parse(existing) : [];

          // Merge dengan preferensi data yang lebih baru
          const merged = [...existingList];
          filteredDocs.forEach(idbDoc => {
            const idx = merged.findIndex(d => d.kode === idbDoc.kode);
            if (idx === -1) {
              merged.push(idbDoc);
            } else {
              // Gunakan yang lebih baru
              const existingTime = new Date(merged[idx].updated_at || 0).getTime();
              const idbTime = new Date(idbDoc.updated_at || 0).getTime();
              if (idbTime > existingTime) {
                merged[idx] = idbDoc;
              }
            }
          });

          localStorage.setItem(storageKey, JSON.stringify(merged));
          console.log(`Recovered ${filteredDocs.length} dokumen dari IndexedDB`);
        } catch (e) {
          console.warn('Gagal sync recovery ke localStorage:', e);
        }
        return filteredDocs;
      }
    } catch (e) {
      console.warn('Gagal recover dari IndexedDB:', e);
    }
    return null;
  };

  // ─────────────────────────────────────────────────────────────────────────

  const getLoopValue = (qId, idx) => {
    const raw = ans.values[qId];
    const q = questions.find(x => x.id === qId);
    const isSerialNumber = q && q.type === 'number' && (
      q.label.toLowerCase().includes('no. urut') ||
      q.label.toLowerCase().includes('nomor urut') ||
      q.label.toLowerCase().includes('no urut')
    );

    if (!raw) {
      return isSerialNumber ? String(idx + 1) : "";
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const val = parsed[idx];
        if (isSerialNumber && (val === undefined || val === null || val === '')) {
          return String(idx + 1);
        }
        return val !== undefined && val !== null ? val : (isSerialNumber ? String(idx + 1) : "");
      } else if (typeof parsed === 'object' && parsed !== null) {
        if (parsed.hasOwnProperty('value')) {
          return idx === 0 ? raw : "";
        }
        const val = parsed[idx];
        if (isSerialNumber && (val === undefined || val === null || val === '')) {
          return String(idx + 1);
        }
        return val !== undefined && val !== null ? val : "";
      }
    } catch (e) {}
    // If data is not a valid JSON array but we have multiple instances expected,
    // treat this as a single-value case (idx 0) or empty for idx > 0
    if (isSerialNumber && idx > 0) {
      return String(idx + 1);
    }
    return idx === 0 ? raw : "";
  };

  const handleUpdateLoopValue = (qId, idx, val) => {
    const raw = ans.values[qId];
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
    const newValues = { ...ans.values, [qId]: JSON.stringify(parsed) };
    setAns(p => ({
      ...p,
      values: newValues
    }));
  };

  const getManualLoopCount = useCallback((q) => {
    if (!q) return null;

    let loopGroupName = "";
    if (q.validation) {
      try {
        const parsed = JSON.parse(q.validation);
        if (parsed && parsed.loop_group) {
          loopGroupName = parsed.loop_group;
        }
      } catch (e) {}
    }

    if (loopGroupName) {
      const groupQs = loopGroupsMap.groupQs.get(loopGroupName) || [];
      const hasManual = loopGroupsMap.hasManual.get(loopGroupName);

      if (!hasManual) {
        return null;
      }

      const masterQ = loopGroupsMap.manualMasterQs.get(loopGroupName);

      if (masterQ && masterQ.id !== q.id) {
        return getManualLoopCount(masterQ);
      }

      for (const gq of groupQs) {
        const savedCount = ans.values[`${gq.id}_loop_count`];
        if (savedCount) {
          const parsed = parseInt(savedCount, 10);
          if (!isNaN(parsed) && parsed >= 1) {
            return parsed;
          }
        }
      }

      let maxArrayLength = 1;
      let maxFilledCount = 1;
      for (const gq of groupQs) {
        const raw = ans.values[gq.id];
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              if (parsed.length > maxArrayLength) {
                maxArrayLength = parsed.length;
              }
              const filledCount = parsed.filter(v => v !== undefined && v !== null && v !== "" && v !== 0).length;
              if (filledCount > maxFilledCount) {
                maxFilledCount = filledCount;
              }
            }
          } catch (e) {}
        }
      }
      return Math.max(maxArrayLength, maxFilledCount, 1);
    }

    const { isLoop, loopType } = parseValidation(q.validation);
    if (isLoop && loopType === "manual") {
      const savedCount = ans.values[`${q.id}_loop_count`];
      if (savedCount) {
        const parsed = parseInt(savedCount, 10);
        if (!isNaN(parsed) && parsed >= 1) {
          return parsed;
        }
      }

      const raw = ans.values[q.id];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const filledCount = parsed.filter(v => v !== undefined && v !== null && v !== "" && v !== 0).length;
            if (filledCount > 1) {
              return filledCount;
            }
            if (parsed.length > 1) {
              return parsed.length;
            }
          }
        } catch (e) {}
      }

      return 1;
    }

    const parentId = q.parent_id || q.parentId;
    if (parentId) {
      const parent = questionMapById.get(String(parentId));
      if (parent) {
        return getManualLoopCount(parent);
      }
    }

    return null;
  }, [loopGroupsMap, ans.values, questionMapById, parseValidation]);

  const getQuestionLoopCount = useCallback((q) => {
    if (!q) return 1;

    const parentId = q.parent_id || q.parentId;
    if (parentId) {
      const parent = questionMapById.get(String(parentId));
      if (parent) {
        return getQuestionLoopCount(parent);
      }
    }

    let loopGroupName = "";
    if (q.validation) {
      try {
        const parsed = JSON.parse(q.validation);
        if (parsed && parsed.loop_group) {
          loopGroupName = parsed.loop_group;
        }
      } catch (e) {}
    }

    if (loopGroupName) {
      const masterQ = loopGroupsMap.masterQs.get(loopGroupName);
      if (masterQ && masterQ.id !== q.id) {
        return getQuestionLoopCount(masterQ);
      }
    }

    const { isLoop, loopType, loopByQuestionId } = parseValidation(q.validation);
    if (isLoop) {
      if (loopByQuestionId) {
        const triggerValue = ans.values[loopByQuestionId];
        const parsedTrigger = parseInt(triggerValue, 10);
        if (!isNaN(parsedTrigger) && parsedTrigger > 0) {
          return Math.max(0, parsedTrigger);
        }
        // Fallback for prelist array mapping
        try {
          const val = ans.values[q.id];
          if (typeof val === 'string' && val.startsWith('[')) {
            const arr = JSON.parse(val);
            if (Array.isArray(arr) && arr.length > 0) return arr.length;
          }
        } catch(e) {}
        return 0;
      }
      if (loopType === "manual") {
        const manualCount = getManualLoopCount(q);
        return manualCount !== null ? manualCount : 1;
      }
    }

    return 1;
  }, [questionMapById, loopGroupsMap, ans.values, parseValidation, getManualLoopCount]);

  const handleAddManualLoop = (qId) => {
    const currentCount = ans.values[`${qId}_loop_count`] ? parseInt(ans.values[`${qId}_loop_count`], 10) : 1;
    const newCount = currentCount + 1;
    const newValues = { ...ans.values, [`${qId}_loop_count`]: newCount };

    // Also update _loop_count for all questions in the same loop group
    const q = questions.find(x => x.id === qId);
    if (q) {
      let loopGroupName = "";
      if (q.validation) {
        try {
          const parsed = JSON.parse(q.validation);
          if (parsed && parsed.loop_group) {
            loopGroupName = parsed.loop_group;
          }
        } catch (e) {}
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
        for (const gq of groupQs) {
          newValues[`${gq.id}_loop_count`] = newCount;
          // Initialize the new array slot with default value for serial numbers
          const raw = ans.values[gq.id];
          const isSerialNumber = gq.type === 'number' && (
            gq.label.toLowerCase().includes('no. urut') ||
            gq.label.toLowerCase().includes('nomor urut') ||
            gq.label.toLowerCase().includes('no urut')
          );
          if (isSerialNumber) {
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
            // Ensure array is long enough and initialize with serial number
            while (parsed.length < newCount) {
              parsed.push(String(parsed.length + 1));
            }
            newValues[gq.id] = JSON.stringify(parsed);
          }
        }
      }
    }

    setAns(p => ({
      ...p,
      values: newValues
    }));
  };

  const handleRemoveManualLoop = (qId, currentCount) => {
    const newCount = Math.max(1, currentCount - 1);
    const updatedValues = { ...ans.values };
    updatedValues[`${qId}_loop_count`] = newCount;

    // Also update _loop_count for all questions in the same loop group
    const q = questions.find(x => x.id === qId);
    if (q) {
      let loopGroupName = "";
      if (q.validation) {
        try {
          const parsed = JSON.parse(q.validation);
          if (parsed && parsed.loop_group) {
            loopGroupName = parsed.loop_group;
          }
        } catch (e) {}
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
        for (const gq of groupQs) {
          updatedValues[`${gq.id}_loop_count`] = newCount;
        }
      }
    }

    // Find all questions that might be children of this question
    const childQs = questions.filter(c => c.parent_id === qId || c.parentId === qId);
    const targetQIds = [qId, ...childQs.map(c => c.id)];

    for (const id of targetQIds) {
      const raw = ans.values[id];
      if (raw) {
        try {
          let parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            if (parsed.length > newCount) {
              parsed = parsed.slice(0, newCount);
            }
            updatedValues[id] = JSON.stringify(parsed);
          }
        } catch (e) {}
      }
    }

    setAns(p => ({
      ...p,
      values: updatedValues
    }));
  };

  const handleValueChange = (q, val, idx = 0, instancesLength = 1) => {
    startTransition(() => {
      setAns(prevAns => {
        const newValues = { ...prevAns.values };
        let headerUpdates = {};

      const qValStr = q.val || q.validation;
      let isTargetLoop = false;
      if (qValStr && qValStr.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(qValStr);
          isTargetLoop = !!parsed.is_loop || !!parsed.loop_group;
        } catch (e) {}
      }
      const parentId = q.parent_id || q.parentId;
      if (parentId) {
        const checkParentLoop = (pId) => {
          const parent = questions.find(p => p.id === pId);
          if (!parent) return false;
          const pValStr = parent.val || parent.validation;
          if (pValStr && pValStr.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(pValStr);
              if (parsed.is_loop || parsed.loop_group) return true;
            } catch (e) {}
          }
          const nextParentId = parent.parent_id || parent.parentId;
          return nextParentId ? checkParentLoop(nextParentId) : false;
        };
        if (checkParentLoop(parentId)) {
          isTargetLoop = true;
        }
      }

      if (instancesLength > 1 || isTargetLoop) {
        const raw = prevAns.values[q.id];
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
        newValues[q.id] = JSON.stringify(parsed);
      } else {
        newValues[q.id] = val;

        const lowerLabel = q.label.toLowerCase();
        let extractedText = val;
        const opts = resolveDynamicOptions(q);
        if (opts && opts.length > 0) {
          const matchedOpt = opts.find(o => String(o.value) === String(val));
          if (matchedOpt) {
            extractedText = matchedOpt.label || matchedOpt.text || val;
          }
        }

        if (lowerLabel.includes("kecamatan")) {
          headerUpdates.kecamatan = extractedText;
        } else if (lowerLabel.includes("desa") || lowerLabel.includes("kelurahan")) {
          headerUpdates.desa = extractedText;
        } else if (lowerLabel.includes("sls") || lowerLabel.match(/\brt\b/)) {
          headerUpdates.sls = extractedText;
        } else if (lowerLabel.includes("alamat") || lowerLabel.includes("jalan")) {
          headerUpdates.alamat = extractedText;
        } else if (lowerLabel === "nama kepala rumah tangga" || lowerLabel === "nama krt" || lowerLabel.includes("nama kepala")) {
          headerUpdates.krt = extractedText;
        } else if (lowerLabel.includes("sub sls") || lowerLabel.includes("sub-sls") || lowerLabel.match(/\brw\b/)) {
          headerUpdates.sub_sls = extractedText;
        } else if (lowerLabel.includes("umur") || lowerLabel.includes("usia")) {
          headerUpdates.umur = extractedText;
        } else if (lowerLabel.includes("jenis kelamin") || lowerLabel.includes("gender")) {
          headerUpdates.gender = extractedText;
        } else if (lowerLabel.includes("perkawinan") || lowerLabel.includes("status nikah")) {
          headerUpdates.perkawinan = extractedText;
        } else if (lowerLabel.includes("bekerja")) {
          headerUpdates.bekerja = extractedText;
        }
      }

      const qVal = parseValidation(q.validation);
      if (qVal.isLookupKey && val && idx === 0) {
        const matchingDoc = localPrelist.find(doc => {
          if (selectedRtItem && doc.id === selectedRtItem.id) return false;
          if (doc.kode === prevAns.kode) return false;
          if (doc.desa !== (headerUpdates.desa || prevAns.desa) || doc.sls !== (headerUpdates.sls || prevAns.sls)) return false;

          let docValues = doc.values;
          if (typeof docValues === 'string') {
            try { docValues = JSON.parse(docValues); } catch { docValues = {}; }
          }

          if (docValues && String(docValues[q.id]) === String(val)) {
            return true;
          }
          return false;
        });

        if (matchingDoc) {
          let docValues = matchingDoc.values;
          if (typeof docValues === 'string') {
            try { docValues = JSON.parse(docValues); } catch { docValues = {}; }
          }

          let copyCount = 0;
          questions.forEach(otherQ => {
            const otherQVal = parseValidation(otherQ.validation);
            if (otherQVal.copyOnKeyMatch) {
              const prevVal = docValues[otherQ.id];
              if (prevVal !== undefined && prevVal !== null && prevVal !== "" && !newValues[otherQ.id]) {
                newValues[otherQ.id] = prevVal;
                copyCount++;

                const savedCountKey = `${otherQ.id}_loop_count`;
                if (docValues[savedCountKey] && !newValues[savedCountKey]) {
                  newValues[savedCountKey] = docValues[savedCountKey];
                }
              }
            }
          });

          if (copyCount > 0) {
            setWarningMessage(`Data pencarian "${val}" cocok. ${copyCount} rincian disalin otomatis.`);
            setTimeout(() => setWarningMessage(null), 5000);
          }
        }
      }

      const updatedAns = {
        ...prevAns,
        ...headerUpdates,
        values: newValues
      };

      return updatedAns;
      });
    });
  };


  // getQuestionCode and parseValidation are removed and replaced by optimized cached versions declared above.

  const resolveDynamicOptions = (q) => {
    let qVal = null;
    try {
      qVal = JSON.parse(q.validation || "{}");
    } catch(e) {}
    
    if (qVal && qVal.options_source_question_id) {
      const sourceQId = qVal.options_source_question_id;
      const val = ans.values[sourceQId];
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            return parsed.map((name, idx) => ({
              value: String(idx + 1),
              label: name && name.trim() !== "" ? name : `(Belum ada nama ${idx + 1})`
            }));
          }
        } catch(e) {}
        return [{ value: "1", label: val }];
      }
      return [];
    }
    return q.options || [];
  };

  const validateNumberRule = (val, rule) => {
    if (!rule || val === undefined || val === null || val === '') return true;
    const numVal = Number(val);
    if (isNaN(numVal)) return false;
    const trimmed = rule.trim();

    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.number_type === 'integer' && !Number.isInteger(numVal)) {
          return false;
        }
        if (parsed.type === 'range') {
          return numVal >= Number(parsed.min) && numVal <= Number(parsed.max);
        } else if (parsed.type === 'min') {
          return numVal >= Number(parsed.min);
        } else if (parsed.type === 'gt') {
          return numVal > Number(parsed.min);
        } else if (parsed.type === 'max') {
          return numVal <= Number(parsed.max);
        } else if (parsed.type === 'lt') {
          return numVal < Number(parsed.max);
        }
        return true;
      } catch (e) {}
    }

    if (trimmed.startsWith('range:')) {
      const parts = trimmed.replace('range:', '').trim().split('-');
      const min = Number(parts[0]);
      const max = Number(parts[1]);
      return numVal >= min && numVal <= max;
    } else if (trimmed.startsWith('min:')) {
      const min = Number(trimmed.replace('min:', '').trim());
      return numVal >= min;
    } else if (trimmed.startsWith('gt:')) {
      const min = Number(trimmed.replace('gt:', '').trim());
      return numVal > min;
    }

    return true;
  };

  const isInputError = (q, val) => {
    if (val === undefined || val === null || val === '') return false;
    if (q.type === 'number' && q.validation) {
      return !validateNumberRule(val, q.validation);
    }
    if (q.type === 'text' && q.validation) {
      return !validateTextRule(val, q.validation);
    }
    return false;
  };

  const getInputErrorMsg = (q, val) => {
    if (val === undefined || val === null || val === '') return "";
    
    if (q.type === 'number' && q.validation) {
      const numVal = Number(val);
      if (isNaN(numVal)) return "Harus berupa angka.";
      
      const trimmed = q.validation.trim();
      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.number_type === 'integer' && !Number.isInteger(numVal)) {
            return "Nilai harus berupa bilangan bulat (tidak boleh desimal).";
          }
          if (parsed.type === 'range') {
            if (numVal < Number(parsed.min) || numVal > Number(parsed.max)) {
              return `Rentang nilai yang diperbolehkan: ${parsed.min} sampai ${parsed.max}.`;
            }
          } else if (parsed.type === 'min') {
            if (numVal < Number(parsed.min)) return `Nilai minimal adalah ${parsed.min}.`;
          } else if (parsed.type === 'gt') {
            if (numVal <= Number(parsed.min)) return `Nilai harus lebih besar dari ${parsed.min}.`;
          } else if (parsed.type === 'max') {
            if (numVal > Number(parsed.max)) return `Nilai maksimal adalah ${parsed.max}.`;
          } else if (parsed.type === 'lt') {
            if (numVal >= Number(parsed.max)) return `Nilai harus kurang dari ${parsed.max}.`;
          }
        } catch (e) {}
      } else if (trimmed.startsWith('range:')) {
        const parts = trimmed.replace('range:', '').trim().split('-');
        const min = Number(parts[0]);
        const max = Number(parts[1]);
        if (numVal < min || numVal > max) {
          return `Rentang nilai yang diperbolehkan: ${min} sampai ${max}.`;
        }
      } else if (trimmed.startsWith('min:')) {
        const min = Number(trimmed.replace('min:', '').trim());
        if (numVal < min) return `Nilai minimal adalah ${min}.`;
      } else if (trimmed.startsWith('gt:')) {
        const min = Number(trimmed.replace('gt:', '').trim());
        if (numVal <= min) return `Nilai harus lebih besar dari ${min}.`;
      }
    }
        if (q.type === 'text' && q.validation) {
      const trimmed = q.validation.trim();
      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          const type = parsed.text_validation_type;
          if (type === 'nik' && !/^\d{16}$/.test(val)) {
            return "Format NIK tidak valid (harus tepat 16 digit angka).";
          } else if (type === 'digits_only' && !/^\d+$/.test(val)) {
            return "Hanya diperbolehkan memasukkan angka.";
          } else if (type === 'letters_only' && !/^[a-zA-Z\s]+$/.test(val)) {
            return "Hanya diperbolehkan memasukkan huruf.";
          } else if (type === 'alphanumeric' && !/^[a-zA-Z0-9\s]+$/.test(val)) {
            return "Hanya diperbolehkan memasukkan huruf dan angka.";
          } else if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
            return "Format email tidak valid.";
          }

          if (type && type !== 'none' && type !== 'email') {
            const min = parsed.text_validation_min ? parseInt(parsed.text_validation_min, 10) : 0;
            const max = parsed.text_validation_max ? parseInt(parsed.text_validation_max, 10) : Infinity;
            if (val.length < min || val.length > max) {
              if (min === max) {
                return `Panjang karakter harus tepat ${min} karakter.`;
              }
              return `Panjang karakter harus antara ${min} sampai ${max} karakter.`;
            }
          }
        } catch (e) {}
      }
    }
    
    return "";
  };

  const isPml = selectedActivity?.role === "PML";

  const askConfirmation = (title, message, onConfirm) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(p => ({ ...p, isOpen: false }));
      }
    });
  };

  // findQuestionByCode is removed and replaced by optimized cached version declared above.

  const computeAggregation = (op, scopeOrCode, questionCode) => {
    let scope = "PCL";
    let qCode = scopeOrCode;
    if (questionCode !== undefined) {
      scope = scopeOrCode || "PCL";
      qCode = questionCode;
    }
    const targetQ = findQuestionByCode(qCode);
    if (!targetQ) return "0";

    const currentDocPclId = selectedRtItem ? (selectedRtItem.petugas_id || currentUser.id) : currentUser.id;
    const valuesList = [];

    localPrelist.forEach(doc => {
      const matchesScope = scope.toUpperCase() === "ALL" || Number(doc.petugas_id) === Number(currentDocPclId);
      if (matchesScope) {
        let docVals = doc.values;
        if (typeof docVals === 'string') {
          try { docVals = JSON.parse(docVals); } catch { docVals = {}; }
        }
        if (docVals && docVals[targetQ.id] !== undefined && docVals[targetQ.id] !== "") {
          const num = parseFloat(docVals[targetQ.id]);
          if (!isNaN(num)) {
            valuesList.push(num);
          }
        }
      }
    });

    if (valuesList.length === 0) return "0";

    switch (op.toUpperCase()) {
      case "MAX":
        return String(Math.max(...valuesList));
      case "MIN":
        return String(Math.min(...valuesList));
      case "SUM":
        return String(valuesList.reduce((a, b) => a + b, 0));
      case "AVG":
        const avg = valuesList.reduce((a, b) => a + b, 0) / valuesList.length;
        return String(parseFloat(avg.toFixed(2)));
      case "LAST":
        const reversedList = [...localPrelist].reverse();
        const lastDoc = reversedList.find(doc => {
          const matchesScope = scope.toUpperCase() === "ALL" || Number(doc.petugas_id) === Number(currentDocPclId);
          if (matchesScope) {
            let docVals = doc.values;
            if (typeof docVals === 'string') {
              try { docVals = JSON.parse(docVals); } catch { docVals = {}; }
            }
            return docVals && docVals[targetQ.id] !== undefined && docVals[targetQ.id] !== "";
          }
          return false;
        });
        if (lastDoc) {
          let docVals = lastDoc.values;
          if (typeof docVals === 'string') {
            try { docVals = JSON.parse(docVals); } catch { docVals = {}; }
          }
          return String(docVals[targetQ.id]);
        }
        return "0";
      default:
        return "0";
    }
  };

  const getMaxBuildingNumber = () => {
    return parseInt(computeAggregation("MAX", "PCL", "R108"), 10) || 0;
  };

  const evaluateFormula = (formulaStr, currentValues) => {
    if (!formulaStr) return "";
    let evalStr = formulaStr;
    
    // Helper: extract numeric values from a stored loop-array value or plain value
    const extractNumbers = (raw) => {
      if (raw === undefined || raw === null || raw === "") return [];
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map(x => {
            if (x && typeof x === 'object' && 'value' in x) return parseFloat(x.value);
            if (typeof x === 'string' && x.startsWith('{')) {
              try { const p = JSON.parse(x); if (p && 'value' in p) return parseFloat(p.value); } catch(e){}
            }
            return parseFloat(x);
          }).filter(x => !isNaN(x));
        } else if (parsed && typeof parsed === 'object' && 'value' in parsed) {
          const n = parseFloat(parsed.value);
          return isNaN(n) ? [] : [n];
        } else {
          const n = parseFloat(parsed);
          return isNaN(n) ? [] : [n];
        }
      } catch (e) {
        const n = parseFloat(raw);
        return isNaN(n) ? [] : [n];
      }
    };

    const getLoopValueFromValues = (qId, idx) => {
      const raw = currentValues[qId];
      const targetQ = questions.find(x => x.id === qId);
      const isSerialNumber = targetQ && targetQ.type === 'number' && (
        targetQ.label.toLowerCase().includes('no. urut') ||
        targetQ.label.toLowerCase().includes('nomor urut') ||
        targetQ.label.toLowerCase().includes('no urut')
      );

      if (!raw) {
        return isSerialNumber ? String(idx + 1) : "";
      }
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const val = parsed[idx];
          if (isSerialNumber && (val === undefined || val === null || val === '')) {
            return String(idx + 1);
          }
          return val !== undefined && val !== null ? val : (isSerialNumber ? String(idx + 1) : "");
        } else if (typeof parsed === 'object' && parsed !== null) {
          if (parsed.hasOwnProperty('value')) {
            return idx === 0 ? raw : "";
          }
          const val = parsed[idx];
          if (isSerialNumber && (val === undefined || val === null || val === '')) {
            return String(idx + 1);
          }
          return val !== undefined && val !== null ? val : "";
        }
      } catch (e) {}
      if (isSerialNumber && idx > 0) {
        return String(idx + 1);
      }
      return idx === 0 ? raw : "";
    };

    // 1. Handle aggregation functions on loop/array values: e.g. MAX(R401)
    const funcRegex = /(MAX|MIN|SUM|AVG|COUNT)\((R[0-9a-zA-Z.]+)\)/gi;
    evalStr = evalStr.replace(funcRegex, (match, op, code) => {
      const targetQ = findQuestionByCode(code);
      if (!targetQ) return "0";

      const targetQVal = parseValidation(targetQ.validation);
      const isTargetLoop = targetQVal.isLoop || !!targetQ.parent_id || !!targetQ.parentId || !!targetQVal.loop_group;

      let numbers = [];
      if (isTargetLoop) {
        const loopCount = getQuestionLoopCount(targetQ);
        if (loopCount > 0) {
          for (let idx = 0; idx < loopCount; idx++) {
            const val = getLoopValueFromValues(targetQ.id, idx);
            const num = parseFloat(val);
            if (!isNaN(num)) {
              numbers.push(num);
            }
          }
        }
      } else {
        numbers = extractNumbers(currentValues[targetQ.id]);
      }

      // Second try: if question belongs to a loop group, collect all questions in that group
      if (numbers.length === 0 && targetQ.validation) {
        try {
          const vParsed = JSON.parse(targetQ.validation);
          if (vParsed && vParsed.loop_group) {
            const groupQs = questions.filter(x => {
              if (!x.validation) return false;
              try { const p = JSON.parse(x.validation); return p && p.loop_group === vParsed.loop_group; }
              catch(e) { return false; }
            });
            groupQs.forEach(gq => {
              numbers = numbers.concat(extractNumbers(currentValues[gq.id]));
            });
          }
        } catch(e) {}
      }

      // Third try: look for loop_count key and iterate
      if (numbers.length === 0) {
        const loopCountRaw = currentValues[`${targetQ.id}_loop_count`];
        const loopCount = loopCountRaw ? parseInt(loopCountRaw, 10) : 0;
        if (loopCount > 0) {
          const raw = currentValues[targetQ.id];
          if (raw) {
            try {
              const arr = JSON.parse(raw);
              if (Array.isArray(arr)) {
                numbers = arr.slice(0, loopCount).map(x => parseFloat(x)).filter(x => !isNaN(x));
              }
            } catch(e) {}
          }
        }
      }

      if (numbers.length === 0) return "0";
      switch (op.toUpperCase()) {
        case "MAX": return String(Math.max(...numbers));
        case "MIN": return String(Math.min(...numbers));
        case "SUM": return String(numbers.reduce((a, b) => a + b, 0));
        case "AVG": return String(numbers.reduce((a, b) => a + b, 0) / numbers.length);
        case "COUNT": return String(numbers.length);
        default: return "0";
      }
    });

    const codeRegex = /R[0-9a-zA-Z.]+/g;
    const codes = evalStr.match(codeRegex) || [];
    
    for (const code of codes) {
      const targetQ = findQuestionByCode(code);
      if (targetQ) {
        const val = currentValues[targetQ.id] || "0";
        let valNum = parseFloat(val);
        if (isNaN(valNum)) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
              const numbers = parsed.map(x => {
                if (x && typeof x === 'object' && 'value' in x) {
                  return parseFloat(x.value);
                }
                if (typeof x === 'string' && x.startsWith('{')) {
                  try {
                    const parsedInner = JSON.parse(x);
                    if (parsedInner && 'value' in parsedInner) {
                      return parseFloat(parsedInner.value);
                    }
                  } catch(e){}
                }
                return parseFloat(x);
              }).filter(x => !isNaN(x));
              valNum = numbers.length > 0 ? Math.max(...numbers) : 0;
            } else if (parsed && typeof parsed === 'object' && 'value' in parsed) {
              valNum = parseFloat(parsed.value);
            }
          } catch(e) {
            valNum = 0;
          }
        }
        evalStr = evalStr.replace(new RegExp(code, 'g'), isNaN(valNum) ? "0" : String(valNum));
      } else {
        evalStr = evalStr.replace(new RegExp(code, 'g'), "0");
      }
    }
    
    try {
      const result = new Function(`return (${evalStr})`)();
      return isNaN(result) ? "0" : String(result);
    } catch (e) {
      return "0";
    }
  };

  // Auto-calculate formulas in real-time (with guard to prevent infinite loop)
  useEffect(() => {
    // Only evaluate if there are formula questions
    const formulaQs = questions.filter(q => {
      const qVal = parseValidation(q.validation);
      return qVal && qVal.formula;
    });

    if (formulaQs.length === 0) return;
    if (isEvaluatingRef.current) return;

    isEvaluatingRef.current = true;

    let updated = false;
    const newValues = { ...ans.values };

    formulaQs.forEach(q => {
      const qVal = parseValidation(q.validation);
      if (qVal && qVal.formula) {
        const computedVal = evaluateFormula(qVal.formula, newValues);
        if (newValues[q.id] !== computedVal) {
          newValues[q.id] = computedVal;
          updated = true;
        }
      }
    });

    if (updated) {
      setAns(p => ({
        ...p,
        values: newValues
      }));
    }

    // Reset guard after a tick
    setTimeout(() => { isEvaluatingRef.current = false; }, 0);
  }, [ans.values, questions]);



  const currentPetugas = petugas?.find(p => p.id === currentUser.id) || currentUser;

  useEffect(() => {
    if (isOffline) return;
    const fetchLatestActivities = async () => {
      try {
        const res = await api.kegiatan.getAll();
        if (Array.isArray(res)) {
          setLocalActivities(res);
        }
      } catch (err) {
        console.error("Gagal refresh kegiatan di petugas:", err);
      }
    };
    fetchLatestActivities();
  }, [activities, isOffline]);

  const officerActivities = (currentPetugas.projects || [])
    .map(projName => {
      const act = localActivities?.find(a => a.name === projName);
      if (!act) return null;
      return {
        ...act,
        role: currentPetugas.projectRoles?.[projName] || "PCL"
      };
    })
    .filter(act => act && act.status !== "draft" && act.status !== "selesai");

  const fetchDocuments = async () => {
    if (selectedActivity?.role === "PML") {
      return await api.dokumen.getForReview(selectedActivity.id);
    } else {
      return await api.dokumen.getByPetugas(currentUser.id);
    }
  };

  const getQuestionLoopGroup = (q) => {
    if (!q) return "";
    const parentId = q.parent_id || q.parentId;
    if (parentId) {
      const parent = questions.find(p => p.id === parentId);
      if (parent) {
        return getQuestionLoopGroup(parent);
      }
    }
    if (q.validation) {
      try {
        const parsed = JSON.parse(q.validation);
        if (parsed && parsed.loop_group) {
          return parsed.loop_group;
        }
      } catch (e) {}
    }
    return "";
  };

  const getActiveBlockOrderedQuestions = (currentActiveBlock) => {
    if (!currentActiveBlock) return [];
    const blockQs = questions.filter(q => String(q.blok_id) === String(currentActiveBlock.id) || String(q.blok_id) === String(currentActiveBlock.kode));
    const mainQs = blockQs.filter(x => !x.parent_id && !x.parentId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const ordered = [];
    const addChildrenRecursive = (parentId) => {
      const children = blockQs.filter(x => (x.parent_id === parentId || x.parentId === parentId))
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      children.forEach(child => {
        ordered.push(child);
        addChildrenRecursive(child.id);
      });
    };
    mainQs.forEach(parent => {
      ordered.push(parent);
      addChildrenRecursive(parent.id);
    });
    return ordered;
  };

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

  // Fetch form structure and prelist when activity changes
  useEffect(() => {
    if (!selectedActivity) return;

    let isMounted = true;
    const mapQuestionsType = (qs) => {
      return (qs || []).map(q => {
        if (q.type === 'select') {
          try {
            const parsed = JSON.parse(q.validation || '{}');
            if (parsed.is_search) {
              return { ...q, type: 'search' };
            }
          } catch (e) {}
        }
        return q;
      });
    };

    const loadFormStructure = async () => {
      setLoadingForm(true);
      if (isOffline) {
        const cached = localStorage.getItem(`form_structure_${selectedActivity.id}`);
        if (cached && isMounted) {
          try {
            const data = JSON.parse(cached);
            setBlocks(sortBlocksNaturally(data.blocks || []));
            setQuestions(mapQuestionsType(data.questions || []));
          } catch (e) {
            console.error("Gagal parse cached form structure:", e);
          }
        }
      } else {
        try {
          const res = await api.form.getStructure(selectedActivity.id);
          if (res.success && isMounted) {
            setBlocks(sortBlocksNaturally(res.blocks || []));
            setQuestions(mapQuestionsType(res.questions || []));
            localStorage.setItem(`form_structure_${selectedActivity.id}`, JSON.stringify({
              blocks: res.blocks,
              questions: res.questions
            }));
          }
        } catch (e) {
          console.error("Gagal fetch form structure:", e);
          const cached = localStorage.getItem(`form_structure_${selectedActivity.id}`);
          if (cached && isMounted) {
            try {
              const data = JSON.parse(cached);
              setBlocks(sortBlocksNaturally(data.blocks || []));
              setQuestions(mapQuestionsType(data.questions || []));
            } catch (err) {
              console.error(err);
            }
          }
        }
      }
      setLoadingForm(false);
    };

    loadFormStructure();

    const loadPrelist = async () => {
      if (isOffline) {
        const cached = localStorage.getItem(`offline_docs_${currentUser.id}`);
        if (cached && isMounted) {
          try {
            const list = JSON.parse(cached);
            setLocalPrelist(list.filter(d => d.kegiatan_id === selectedActivity.id));
          } catch (e) {
            console.error("Gagal parse offline_docs:", e);
          }
        }

        // Jika localStorage kosong atau gagal parse, coba recover dari IndexedDB
        if ((!cached || !isMounted) && offlineDB.isAvailable()) {
          const idbDocs = await recoverFromIDB(selectedActivity.id);
          if (idbDocs && isMounted) {
            setLocalPrelist(idbDocs.filter(d => d.kegiatan_id === selectedActivity.id));
          }
        }
      } else {
        try {
          const docs = await fetchDocuments();
          if (isMounted) {
            // PRIORITASKAN DATA LOCAL: Merge API data dengan localStorage/IndexedDB
            // Ini memastikan data yang baru ditambahkan tapi belum sync tidak hilang
            const storageKey = `offline_docs_${currentUser.id}`;
            let localDocs = [];
            try {
              const cached = localStorage.getItem(storageKey);
              if (cached) localDocs = JSON.parse(cached);
            } catch (e) {
              // Jika gagal parse localStorage, coba dari IndexedDB
            }

            // Jika localStorage kosong, coba recover dari IndexedDB
            if (localDocs.length === 0 && offlineDB.isAvailable()) {
              const idbDocs = await offlineDB.getAllDokumen();
              if (idbDocs && idbDocs.length > 0) {
                localDocs = idbDocs;
              }
            }

            // Deduplicate local docs terlebih dahulu
            localDocs = deduplicateLocalDocs(localDocs);

            // Merge: API docs sebagai dasar, tapi timpa dengan local docs yang lebih baru
            const mergedDocs = [...docs];
            localDocs.forEach(localDoc => {
              // Cek duplikat berdasarkan ID ATAU kode
              // Penting: localDoc.id bisa null (belum sync), jadi cek juga berdasarkan kode
              const apiIdx = mergedDocs.findIndex(d =>
                // Match by ID (jika kedua-duanya ada)
                (d.id && localDoc.id && d.id === localDoc.id) ||
                // ATAU match by kode (untuk dokumen yang belum sync)
                (d.kode && d.kode === localDoc.kode)
              );

              const localTime = new Date(localDoc.updated_at || localDoc.created_at || 0).getTime();
              const apiTime = apiIdx >= 0 ? new Date(mergedDocs[apiIdx].updated_at || mergedDocs[apiIdx].created_at || 0).getTime() : 0;

              if (apiIdx >= 0) {
                // Doc ada di API - gunakan yang lebih baru
                if (localTime > apiTime) {
                  mergedDocs[apiIdx] = localDoc;
                } else {
                  // Jika API lebih baru, pastikan data API menimpa local doc
                  mergedDocs[apiIdx] = { ...localDoc, ...mergedDocs[apiIdx] };
                }
              } else {
                // Doc tidak ada di API (belum sync) - tambahkan dari local
                mergedDocs.push(localDoc);
              }
            });

            // Deduplicate hasil merge juga
            const finalDocs = deduplicateLocalDocs(mergedDocs);

            // Filter untuk kegiatan saat ini
            const filteredDocs = finalDocs.filter(d => d.kegiatan_id === selectedActivity.id);
            setLocalPrelist(filteredDocs);

            // Simpan merged data ke localStorage + IndexedDB
            try {
              localStorage.setItem(storageKey, JSON.stringify(finalDocs));
            } catch (e) {
              console.warn('localStorage penuh saat cache prelist:', e.message);
            }
            // Simpan juga ke IndexedDB
            finalDocs.forEach(doc => saveDokumenToIDB(doc));
          }
        } catch (e) {
          console.error("Gagal fetch prelist:", e);

          // Coba dari localStorage terlebih dahulu
          const cached = localStorage.getItem(`offline_docs_${currentUser.id}`);
          if (cached && isMounted) {
            try {
              const list = JSON.parse(cached);
              setLocalPrelist(list.filter(d => d.kegiatan_id === selectedActivity.id));
            } catch (err) {
              console.error(err);
            }
          }

          // Jika localStorage kosong atau gagal, coba recover dari IndexedDB
          if ((!cached || !isMounted) && offlineDB.isAvailable()) {
            const idbDocs = await recoverFromIDB(selectedActivity.id);
            if (idbDocs && isMounted) {
              setLocalPrelist(idbDocs.filter(d => d.kegiatan_id === selectedActivity.id));
            }
          }
        }
      }
    };

    loadFormStructure();
    loadPrelist();

    return () => {
      isMounted = false;
    };
  }, [selectedActivity, isOffline, currentUser.id]);

  useEffect(() => {
    if (!isOffline) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("form_structure_")) {
            localStorage.removeItem(key);
            i--;
          }
        }
      } catch (e) {
        console.warn("Failed to clear stale form structure caches:", e);
      }
    }
  }, [isOffline]);

  const isReadOnly = 
    isPml ||
    selectedRtItem?.review_status === "approved" || 
    ((selectedRtItem?.status === "tersimpan" || selectedRtItem?.status === "terkirim") && selectedRtItem?.review_status !== "rejected");

  const validateTextRule = (val, rule) => {
    if (!rule || val === undefined || val === null || val === '') return true;
    const trimmed = rule.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        const type = parsed.text_validation_type;
        if (!type || type === 'none') return true;

        let patternValid = true;
        if (type === 'nik') {
          patternValid = /^\d{16}$/.test(val);
        } else if (type === 'digits_only') {
          patternValid = /^\d+$/.test(val);
        } else if (type === 'letters_only') {
          patternValid = /^[a-zA-Z\s]+$/.test(val);
        } else if (type === 'alphanumeric') {
          patternValid = /^[a-zA-Z0-9\s]+$/.test(val);
        } else if (type === 'email') {
          patternValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        }

        if (!patternValid) return false;

        // Perform length validation for non-email and non-none validation types
        if (type !== 'email') {
          const min = parsed.text_validation_min ? parseInt(parsed.text_validation_min, 10) : 0;
          const max = parsed.text_validation_max ? parseInt(parsed.text_validation_max, 10) : Infinity;
          const len = val.length;
          if (len < min || len > max) {
            return false;
          }
        }
        return true;
      } catch (e) {}
    }
    return true;
  };

  const getResolvedValuesForIndex = (values, idx) => {
    if (idx === null) return values;
    const resolved = {};
    for (const qId in values) {
      const raw = values[qId];
      if (raw && typeof raw === 'string' && (raw.startsWith('[') || raw.startsWith('{'))) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            resolved[qId] = parsed[idx] !== undefined && parsed[idx] !== null ? parsed[idx] : "";
          } else if (typeof parsed === 'object' && parsed !== null) {
            resolved[qId] = parsed[idx] !== undefined && parsed[idx] !== null ? parsed[idx] : "";
          } else {
            resolved[qId] = raw;
          }
        } catch (e) {
          resolved[qId] = raw;
        }
      } else {
        resolved[qId] = raw;
      }
    }
    return resolved;
  };

  // getActiveSkips and getSkipTargetBlock have been optimized and moved above to avoid render lags.

  const isQuestionVisibleIgnoreBlock = useCallback((q, activeInstanceIdx = null) => {
    const parentId = q.parent_id || q.parentId;
    if (parentId) {
      const parent = questionMapById.get(String(parentId));
      if (parent && !isQuestionVisibleIgnoreBlock(parent, activeInstanceIdx)) {
        return false;
      }
    }

    const resolvedValues = getResolvedValuesForIndex(ans.values, activeInstanceIdx);
    const showIfValue = q.show_if_value || q.showIfValue;
    if (showIfValue) {
      let matchesShowIf = true;
      let isJson = false;
      try {
        const parsed = JSON.parse(showIfValue);
        if (parsed && parsed.conditions) {
          isJson = true;
          const operator = parsed.operator || "AND";
          const results = parsed.conditions.map(c => evaluateCondition(c, resolvedValues));
          matchesShowIf = operator === "OR" ? results.some(r => r) : results.every(r => r);
        }
      } catch (e) {}

      if (isJson) {
        if (!matchesShowIf) {
          return false;
        }
      } else {
        const showIfParentId = q.show_if_parent_id || q.showIfParentId;
        if (showIfParentId) {
          const parentVal = resolvedValues[showIfParentId];
          const triggerOptions = String(showIfValue).split(",").map(x => x.trim()).filter(Boolean);
          if (!checkOptionTrigger(parentVal, triggerOptions)) {
            return false;
          }
        }
      }
    }

    const qBlock = blockMap.get(String(q.blok_id));
    if (qBlock) {
      const blocksToHide = getBlocksToHideBySkip();
      if (blocksToHide.has(qBlock.id) || blocksToHide.has(qBlock.kode)) {
        return false;
      }
    }

    const currentIdx = questionIndexMap.get(String(q.id));

    for (const skipper of allSkippers) {
      let matchesTrigger = false;

      try {
        const parsed = JSON.parse(skipper.skip_logic);
        if (parsed && parsed.conditions && parsed.conditions.length > 0) {
          const operator = parsed.operator || "AND";
          const results = parsed.conditions.map(c => evaluateCondition(c, resolvedValues));
          matchesTrigger = operator === "OR" ? results.some(r => r) : results.every(r => r);
        }
      } catch (e) {
        const skipperVal = resolvedValues[skipper.id];
        const triggerOptions = String(skipper.skip_logic).split(",").map(x => x.trim()).filter(Boolean);
        matchesTrigger = checkOptionTrigger(skipperVal, triggerOptions);
      }

      const skipperIdx = questionIndexMap.get(String(skipper.id));

      let targetQ = questionMapById.get(String(skipper.skip_target));
      if (!targetQ) {
        targetQ = findQuestionByCode(String(skipper.skip_target));
      }

      const targetIdx = targetQ ? questionIndexMap.get(String(targetQ.id)) : -1;

      if (q.id === skipper.id) {
      }
      else if (targetQ && q.id === targetQ.id) {
      }
      else if (matchesTrigger && skipperIdx !== undefined && targetIdx !== -1 && currentIdx !== undefined) {
        if (currentIdx > skipperIdx && currentIdx < targetIdx) {
          return false;
        }
      }
    }

    return true;
  }, [ans.values, questionMapById, questionMapByCode, blockMap, questionIndexMap, allSkippers, findQuestionByCode, checkOptionTrigger, getBlocksToHideBySkip]);

  const isBlockVisible = useCallback((block) => {
    if (!block) return false;
    const blocksToHide = getBlocksToHideBySkip();
    if (blocksToHide.has(block.id) || blocksToHide.has(block.kode)) {
      return false;
    }
    if (block.hide_logic) {
      try {
        const parsed = JSON.parse(block.hide_logic);
        if (parsed && parsed.conditions && parsed.conditions.length > 0) {
          const operator = parsed.operator || "AND";
          const results = parsed.conditions.map(c => evaluateCondition(c, ans.values));
          const met = operator === "OR" ? results.some(r => r) : results.every(r => r);
          if (met) return false;
        }
      } catch (e) {}
    }

    const blockQuestions = [
      ...(questionsByBlockMap.get(String(block.id)) || []),
      ...(block.kode && block.kode !== block.id ? (questionsByBlockMap.get(String(block.kode)) || []) : [])
    ];
    if (blockQuestions.length > 0) {
      const hasAnyVisibleQuestion = blockQuestions.some(q => isQuestionVisibleIgnoreBlock(q));
      if (!hasAnyVisibleQuestion) {
        return false;
      }
    }

    return true;
  }, [getBlocksToHideBySkip, ans.values, questionsByBlockMap, isQuestionVisibleIgnoreBlock]);

  const isQuestionVisible = useCallback((q, activeInstanceIdx = null) => {
    const block = blockMap.get(String(q.blok_id));
    if (block && !isBlockVisible(block)) {
      return false;
    }
    return isQuestionVisibleIgnoreBlock(q, activeInstanceIdx);
  }, [blockMap, isBlockVisible, isQuestionVisibleIgnoreBlock]);

  // Status mapping for visual tabs
  const validateBlock = (blockKode) => {
    const block = blocks.find(b => b.kode === blockKode);
    if (!block) return 'empty';
    
    const blockQuestions = questions.filter(q => q.blok_id === block.id || q.blok_id === block.kode);
    let hasEmptyRequired = false;
    let hasValidationError = false;
    let hasFilledAny = false;
    
    for (const q of blockQuestions) {
      if (!isQuestionVisible(q)) continue;

      // Skip validation if this is a parent question with children and not in original mode
      const childQs = questions.filter(c => c.parent_id === q.id || c.parentId === q.id);
      const qVal = parseValidation(q.validation);
      const parentMode = qVal.parentMode || "label";
      if (childQs.length > 0 && parentMode !== "original") continue;

      const { isLoop, loopByQuestionId } = parseValidation(q.validation);
      let loopCount = 1;
      if (isLoop && loopByQuestionId) {
        const triggerValue = ans.values[loopByQuestionId];
        const parsedTrigger = parseInt(triggerValue, 10);
        loopCount = isNaN(parsedTrigger) ? 0 : parsedTrigger;
        if (loopCount === 0) {
          try {
            const val = ans.values[q.id];
            if (typeof val === 'string' && val.startsWith('[')) {
              const arr = JSON.parse(val);
              if (Array.isArray(arr) && arr.length > 0) loopCount = arr.length;
            }
          } catch(e) {}
        }
      } else {
        const manualCount = getManualLoopCount(q);
        if (manualCount !== null) {
          loopCount = manualCount;
        }
      }

      for (let idx = 0; idx < loopCount; idx++) {
        const val = getLoopValue(q.id, idx);
        let isOtherTextEmpty = false;
        if (val !== undefined && val !== null && val !== '') {
          if (typeof val === 'string' && val.trim().startsWith('{')) {
            try {
              const parsedVal = JSON.parse(val);
              if (parsedVal && typeof parsedVal === 'object') {
                if ('value' in parsedVal) {
                  const selectedOpt = resolveDynamicOptions(q).find(o => String(o.value) === String(parsedVal.value));
                  if (selectedOpt && selectedOpt.is_other && (!parsedVal.text || !parsedVal.text.trim())) {
                    isOtherTextEmpty = true;
                  }
                } else {
                  resolveDynamicOptions(q).forEach(opt => {
                    if (opt.is_other && parsedVal[opt.value] !== undefined && parsedVal[opt.value] !== 0 && parsedVal[opt.value] !== '0') {
                      const txt = parsedVal[opt.value];
                      if (txt === 1 || txt === '1' || (typeof txt === 'string' && !txt.trim())) {
                        isOtherTextEmpty = true;
                      }
                    }
                  });
                }
              }
            } catch (e) {}
          }
        }

        if (val !== undefined && val !== null && val !== '' && !isOtherTextEmpty) {
          hasFilledAny = true;
          if (q.type === 'number' && q.validation) {
            if (!validateNumberRule(val, q.validation)) {
              hasValidationError = true;
            }
          }
          if (q.type === 'text' && q.validation) {
            if (!validateTextRule(val, q.validation)) {
              hasValidationError = true;
            }
          }
        } else if (q.required || isOtherTextEmpty) {
          hasEmptyRequired = true;
        }
      }
    }
    
    // Check main location headers in the first block if label matches Lokasi
    if (blockKode === blocks[0]?.kode) {
      if (!ans.kode || ans.kode.trim() === "") {
        hasEmptyRequired = true;
      }
    }
    
    if (!hasFilledAny && blockKode !== "Blok I" && blockKode !== blocks[0]?.kode) return 'empty';
    if (hasValidationError) return 'error';
    if (hasEmptyRequired) return 'warning';
    return 'safe';
  };

  const getValidationSummary = () => {
    const errors = [];
    const warnings = [];

    // Check first block code
    if (!ans.kode || ans.kode.trim() === "") {
      warnings.push(`[${blocks[0]?.kode || 'Pengantar'}] Kode Dokumen / Nomor Urut belum diisi.`);
    }

    questions.forEach(q => {
      if (!isQuestionVisible(q)) return;

      // If this question has sub-questions, it doesn't render inputs of its own (unless in original input mode), so it cannot be validated/required
      const childQs = questions.filter(c => c.parent_id === q.id || c.parentId === q.id);
      const qVal = parseValidation(q.validation);
      const parentMode = qVal.parentMode || "label";
      if (childQs.length > 0 && parentMode !== "original") return;

      const { isLoop, loopType, loopByQuestionId } = parseValidation(q.validation);
      let loopCount = 1;
      // Priority: loop_by_question_id > manual
      if (isLoop && loopByQuestionId) {
        const triggerValue = ans.values[loopByQuestionId];
        const parsedTrigger = parseInt(triggerValue, 10);
        loopCount = isNaN(parsedTrigger) ? 0 : parsedTrigger;
        if (loopCount === 0) {
          try {
            const val = ans.values[q.id];
            if (typeof val === 'string' && val.startsWith('[')) {
              const arr = JSON.parse(val);
              if (Array.isArray(arr) && arr.length > 0) loopCount = arr.length;
            }
          } catch(e) {}
        }
      } else {
        const manualCount = getManualLoopCount(q);
        if (manualCount !== null) {
          loopCount = manualCount;
        }
      }

      for (let idx = 0; idx < loopCount; idx++) {
        const val = getLoopValue(q.id, idx);
        const block = blocks.find(b => b.id === q.blok_id || b.kode === q.blok_id);
        const blockName = block ? block.kode : "Form";
        const suffix = loopCount > 1 ? ` ke-${idx + 1}` : "";

        let isOtherTextEmpty = false;
        if (val !== undefined && val !== null && val !== '') {
          if (typeof val === 'string' && val.trim().startsWith('{')) {
            try {
              const parsedVal = JSON.parse(val);
              if (parsedVal && typeof parsedVal === 'object') {
                if ('value' in parsedVal) {
                  const selectedOpt = resolveDynamicOptions(q).find(o => String(o.value) === String(parsedVal.value));
                  if (selectedOpt && selectedOpt.is_other && (!parsedVal.text || !parsedVal.text.trim())) {
                    isOtherTextEmpty = true;
                  }
                } else {
                  resolveDynamicOptions(q).forEach(opt => {
                    if (opt.is_other && parsedVal[opt.value] !== undefined && parsedVal[opt.value] !== 0 && parsedVal[opt.value] !== '0') {
                      const txt = parsedVal[opt.value];
                      if (txt === 1 || txt === '1' || (typeof txt === 'string' && !txt.trim())) {
                        isOtherTextEmpty = true;
                      }
                    }
                  });
                }
              }
            } catch (e) {}
          }
        }

        if (val !== undefined && val !== null && val !== '' && !isOtherTextEmpty) {
          if (q.type === 'number' && q.validation) {
            const numVal = Number(val);
            if (isNaN(numVal) || val === '') {
              errors.push(`[${blockName}] Isian ${q.label}${suffix} harus berupa angka.`);
            } else {
              let ruleValid = true;
              let isIntegerError = false;
              const rule = q.validation.trim();
              if (rule.startsWith('{')) {
                try {
                  const parsed = JSON.parse(rule);
                  if (parsed.number_type === 'integer' && !Number.isInteger(numVal)) {
                    ruleValid = false;
                    isIntegerError = true;
                  } else if (parsed.type === 'range') {
                    ruleValid = numVal >= Number(parsed.min) && numVal <= Number(parsed.max);
                  } else if (parsed.type === 'min') {
                    ruleValid = numVal >= Number(parsed.min);
                  } else if (parsed.type === 'gt') {
                    ruleValid = numVal > Number(parsed.min);
                  } else if (parsed.type === 'max') {
                    ruleValid = numVal <= Number(parsed.max);
                  } else if (parsed.type === 'lt') {
                    ruleValid = numVal < Number(parsed.max);
                  }
                } catch (e) {}
              } else if (rule.startsWith('range:')) {
                const parts = rule.replace('range:', '').trim().split('-');
                ruleValid = numVal >= Number(parts[0]) && numVal <= Number(parts[1]);
              } else if (rule.startsWith('min:')) {
                ruleValid = numVal >= Number(rule.replace('min:', '').trim());
              } else if (rule.startsWith('gt:')) {
                ruleValid = numVal > Number(rule.replace('gt:', '').trim());
              }
              if (!ruleValid) {
                if (isIntegerError) {
                  errors.push(`[${blockName}] Nilai ${q.label}${suffix} harus berupa bilangan bulat (tidak boleh desimal).`);
                } else {
                  errors.push(`[${blockName}] Nilai ${q.label}${suffix} diluar rentang yang diizinkan.`);
                }
              }
            }
          }
          if (q.type === 'text' && q.validation) {
            if (!validateTextRule(val, q.validation)) {
              let errorMsg = `[${blockName}] Nilai ${q.label}${suffix} tidak valid.`;
              try {
                const parsed = JSON.parse(q.validation);
                const type = parsed.text_validation_type;
                
                let patternMsg = "";
                if (type === 'nik') {
                  patternMsg = "harus tepat 16 digit angka (Format NIK)";
                } else if (type === 'digits_only') {
                  patternMsg = "harus berupa angka saja";
                } else if (type === 'letters_only') {
                  patternMsg = "harus berupa huruf saja";
                } else if (type === 'alphanumeric') {
                  patternMsg = "harus berupa huruf/angka saja";
                } else if (type === 'email') {
                  patternMsg = "harus berformat e-mail yang valid";
                }

                let lengthMsg = "";
                if (type && type !== 'none' && type !== 'email') {
                  const min = parsed.text_validation_min ? parseInt(parsed.text_validation_min, 10) : 0;
                  const max = parsed.text_validation_max ? parseInt(parsed.text_validation_max, 10) : null;
                  if (min > 0 && max) {
                    if (min === max) {
                      lengthMsg = `harus tepat ${min} karakter`;
                    } else {
                      lengthMsg = `harus berukuran ${min} sampai ${max} karakter`;
                    }
                  } else if (min > 0) {
                    lengthMsg = `minimal ${min} karakter`;
                  } else if (max) {
                    lengthMsg = `maksimal ${max} karakter`;
                  }
                }

                if (patternMsg && lengthMsg) {
                  errorMsg = `[${blockName}] Isian ${q.label}${suffix} ${patternMsg} dan ${lengthMsg}.`;
                } else if (patternMsg) {
                  errorMsg = `[${blockName}] Isian ${q.label}${suffix} ${patternMsg}.`;
                } else if (lengthMsg) {
                  errorMsg = `[${blockName}] Isian ${q.label}${suffix} ${lengthMsg}.`;
                }
              } catch (e) {}
              errors.push(errorMsg);
            }
          }
        } else if (q.required || isOtherTextEmpty) {
          if (isOtherTextEmpty) {
            warnings.push(`[${blockName}] Keterangan opsi Lainnya untuk ${q.label}${suffix} belum diisi.`);
          } else {
            warnings.push(`[${blockName}] Isian wajib ${q.label}${suffix} masih kosong.`);
          }
        }
      }
    });

    return { errors, warnings };
  };

  const handleSelectActivity = (act) => {
    setSelectedActivity(act);
    setView("prelist");
  };

  const handleEditItem = async (item) => {
    const hasBeenSent = item.status === "terkirim" || item.review_status === "approved" || item.review_status === "rejected";
    if (isPml && !hasBeenSent) {
      setWarningMessage("Dokumen ini belum dikirim ke server oleh PCL, sehingga tidak dapat diperiksa oleh PML.");
      return;
    }
    setSelectedRtItem(item);
    
    let docDetail = null;
    let localDraft = null;

    const cached = localStorage.getItem(`offline_docs_${currentUser.id}`);
    if (cached) {
      try {
        const list = JSON.parse(cached);
        // Cek jika ada draft lokal yang belum di-sync
        localDraft = list.find(d => d.kode === item.kode && d.sync === false);
        
        if (isOffline) {
          docDetail = list.find(d => d.kode === item.kode);
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (!isOffline && item.id) {
      try {
        const res = await api.dokumen.getDetail(item.id);
        if (res.success) {
          docDetail = {
            ...res.dokumen,
            values: res.values
          };
        }
      } catch (e) {
        console.error("Gagal load detail kuesioner dari server:", e);
      }
    }

    // Jika ada draft lokal yang belum sinkron, prioritaskan itu. Jika tidak, pakai docDetail dari server/offline, terakhir item
    const finalDoc = localDraft || docDetail || item;

    const updatedValues = { ...(finalDoc.values || {}) };
    questions.forEach(q => {
      if (q.type === 'pcl' && !updatedValues[q.id]) {
        updatedValues[q.id] = currentUser.name;
      } else if (q.type === 'pml' && !updatedValues[q.id]) {
        const docPclId = finalDoc.petugas_id;
        const docPetugas = docPclId ? (petugas || []).find(p => p.id === docPclId) : null;
        updatedValues[q.id] = (docPetugas || currentPetugas).assignments?.[selectedActivity?.name]?.pengawas || "";
      }

      // Auto-fill prelist fields
      if (finalDoc.is_prelist && !updatedValues[q.id]) {
        const lowerLabel = (q.label || "").toLowerCase();
        if (lowerLabel.includes("kecamatan") && finalDoc.kecamatan) {
          updatedValues[q.id] = finalDoc.kecamatan;
        } else if ((lowerLabel.includes("desa") || lowerLabel.includes("kelurahan")) && finalDoc.desa) {
          updatedValues[q.id] = finalDoc.desa;
        } else if ((lowerLabel.includes("sub sls") || lowerLabel.includes("sub-sls") || lowerLabel.match(/\brw\b/)) && finalDoc.sub_sls) {
          updatedValues[q.id] = finalDoc.sub_sls;
        } else if ((lowerLabel.includes("sls") || lowerLabel.match(/\brt\b/)) && finalDoc.sls) {
          updatedValues[q.id] = finalDoc.sls;
        } else if ((lowerLabel.includes("alamat") || lowerLabel.includes("jalan")) && finalDoc.alamat) {
          updatedValues[q.id] = finalDoc.alamat;
        } else if ((lowerLabel.includes("kepala") || lowerLabel.includes("krt") || lowerLabel.includes("nama kepala")) && finalDoc.krt && finalDoc.krt !== "Tanpa Nama") {
          updatedValues[q.id] = finalDoc.krt;
        } else if ((lowerLabel.includes("nama anggota") || lowerLabel.includes("nama art")) && finalDoc.krt && finalDoc.krt !== "Tanpa Nama") {
          let isLoop = false;
          if (q.validation) {
            try {
              const parsed = JSON.parse(q.validation);
              isLoop = !!parsed.is_loop;
            } catch (e) {}
          }
          if (isLoop) {
            updatedValues[q.id] = JSON.stringify([finalDoc.krt]);
          } else {
            updatedValues[q.id] = finalDoc.krt;
          }
        }
      }
    });

    setAns({
      kode: finalDoc.kode || "",
      krt: finalDoc.krt || "",
      alamat: finalDoc.alamat || "",
      kecamatan: finalDoc.kecamatan || "",
      desa: finalDoc.desa || "",
      sls: finalDoc.sls || "",
      sub_sls: finalDoc.sub_sls || "",
      is_prelist: !!finalDoc.is_prelist,
      values: updatedValues
    });

    if (blocks.length > 0) {
      setActiveTab(blocks[0].kode);
    } else {
      setActiveTab("Blok I");
    }
    setView("form");
  };

  const handleAddNew = () => {
    setSelectedRtItem(null);

    // Initial pre-fill location from activity info and petugas defaults
    let defaultKec = "";
    let defaultDesa = currentPetugas.desa || "";
    
    if (selectedActivity.lokus) {
      let lokus = selectedActivity.lokus;
      if (typeof lokus === 'string') {
        try { lokus = JSON.parse(lokus); } catch (e) { lokus = null; }
      }
      if (lokus) {
        defaultKec = lokus.kecamatan?.[0] || "";
        if (!defaultDesa) defaultDesa = lokus.desa?.[0] || "";
      }
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newKode = `NEW-${currentUser.id}-${randomSuffix}`;

    // Fill EAV questions that map to location defaults
    const initialValues = {};
    const processedLoopGroups = new Set();

    questions.forEach(q => {
      const { defaultVal } = parseValidation(q.validation);

      // Initialize _loop_count for manual loop groups
      if (!processedLoopGroups.has(q.id)) {
        const qVal = parseValidation(q.validation);
        if (qVal.isLoop && qVal.loopType === "manual") {
          let loopGroupName = "";
          if (q.validation) {
            try {
              const parsed = JSON.parse(q.validation);
              if (parsed && parsed.loop_group) {
                loopGroupName = parsed.loop_group;
              }
            } catch (e) {}
          }

          if (loopGroupName && !processedLoopGroups.has(loopGroupName)) {
            processedLoopGroups.add(loopGroupName);
            // Initialize _loop_count for all questions in the loop group
            const groupQs = questions.filter(x => {
              if (!x.validation) return false;
              try {
                const parsed = JSON.parse(x.validation);
                return parsed && parsed.loop_group === loopGroupName;
              } catch (e) {
                return false;
              }
            });
            for (const gq of groupQs) {
              initialValues[`${gq.id}_loop_count`] = 1;
            }
          } else if (!loopGroupName) {
            processedLoopGroups.add(q.id);
            initialValues[`${q.id}_loop_count`] = 1;
          }
        }
      }

      if (defaultVal !== null) {
        let resolvedDefaultVal = defaultVal;
        if (typeof resolvedDefaultVal === 'string') {
          // Handle building number legacy tag
          if (resolvedDefaultVal.includes("{{no_bangunan_terakhir}}")) {
            const maxVal = computeAggregation("MAX", "R108");
            resolvedDefaultVal = resolvedDefaultVal.replace(/\{\{no_bangunan_terakhir\}\}/g, maxVal);
          }

          // Handle generic dynamic tags like {{MAXPCLR101}}, {{MAXALLR101}}, {{MAX_PCL_R101}}
          const tagRegex = /\{\{(MAX|MIN|AVG|SUM|LAST)_?(PCL|ALL)?_?([a-zA-Z0-9.]+)\}\}/gi;
          resolvedDefaultVal = resolvedDefaultVal.replace(tagRegex, (match, op, scope, code) => {
            const finalScope = scope || "PCL";
            return computeAggregation(op, finalScope, code);
          });

          // Evaluate mathematical expressions if they result from tag resolution (e.g., "12 + 1")
          if (/^[0-9.+\-*/()\s]+$/.test(resolvedDefaultVal.trim()) && resolvedDefaultVal.trim() !== "") {
            try {
              const evaluated = new Function(`return (${resolvedDefaultVal})`)();
              if (evaluated !== undefined && !isNaN(evaluated)) {
                resolvedDefaultVal = String(evaluated);
              }
            } catch (e) {}
          }
        }
        initialValues[q.id] = resolvedDefaultVal;
      } else {
        const lower = q.label.toLowerCase();
        if (q.type === 'pcl') {
          initialValues[q.id] = currentUser.name;
        } else if (q.type === 'pml') {
          initialValues[q.id] = currentPetugas.assignments?.[selectedActivity?.name]?.pengawas || "";
        } else if (lower.includes("provinsi")) {
          initialValues[q.id] = "Kalimantan Utara";
        } else if (lower.includes("kabupaten") || lower.includes("kota")) {
          initialValues[q.id] = "Tana Tidung";
        } else if (lower.includes("kecamatan")) {
          initialValues[q.id] = defaultKec;
        } else if (lower.includes("desa") || lower.includes("kelurahan")) {
          initialValues[q.id] = defaultDesa;
        }
      }
    });

    setAns({
      kode: newKode,
      krt: "",
      alamat: "",
      kecamatan: defaultKec,
      desa: defaultDesa,
      sls: "",
      sub_sls: "",
      is_prelist: false,
      values: initialValues
    });

    if (blocks.length > 0) {
      setActiveTab(blocks[0].kode);
    } else {
      setActiveTab("Blok I");
    }
    setView("form");
  };

  const handleSave = () => {
    if (isReadOnly) {
      setView("prelist");
      return;
    }

    askConfirmation(
      "Simpan Kuesioner",
      "Apakah Anda yakin ingin menyelesaikan dan menyimpan kuesioner ini? Status akan berubah menjadi Tersimpan.",
      executeSave
    );
  };

  const executeSave = async () => {
    const timestamp = new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) + " " + new Date().toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' });
    let currentLogs = selectedRtItem?.logs || [];
    if (typeof currentLogs === 'string') {
      try { currentLogs = JSON.parse(currentLogs); } catch { currentLogs = []; }
    }
    
    const newLogs = selectedRtItem
      ? [...currentLogs, `${timestamp}: Kuesioner disimpan oleh PCL (Tersimpan)`]
      : [`${timestamp}: Kuesioner dibuat (Draft)`, `${timestamp}: Kuesioner disimpan oleh PCL (Tersimpan)`];

    const payload = {
      id: selectedRtItem?.id,
      kode: ans.kode,
      kegiatan_id: selectedActivity.id,
      petugas_id: currentUser.id,
      krt: ans.krt || "Tanpa Nama",
      alamat: ans.alamat,
      kecamatan: ans.kecamatan,
      desa: ans.desa,
      sls: ans.sls,
      sub_sls: ans.sub_sls,
      status: "tersimpan",
      is_prelist: ans.is_prelist,
      values: ans.values,
      log_message: selectedRtItem ? "Kuesioner diperbarui PCL (Tersimpan)" : "Kuesioner baru disimpan PCL (Tersimpan)"
    };

    const cached = localStorage.getItem(`offline_docs_${currentUser.id}`);
    let cachedList = [];
    if (cached) {
      try { cachedList = JSON.parse(cached); } catch { cachedList = []; }
    }

    const localDoc = {
      ...payload,
      id: selectedRtItem?.id || null,
      review_status: selectedRtItem?.review_status || "draft",
      sync: false,
      logs: newLogs
    };

    // Hapus duplikat berdasarkan kode sebelum mencari index
    const seenKodes = new Set();
    const dedupedList = cachedList.filter(d => {
      if (!d.kode) return true;
      if (seenKodes.has(d.kode)) return false;
      seenKodes.add(d.kode);
      return true;
    });

    const idx = dedupedList.findIndex(d => {
      if (selectedRtItem) {
        if (selectedRtItem.id && d.id === selectedRtItem.id) return true;
        return d.kode === selectedRtItem.kode;
      }
      return d.kode === ans.kode;
    });

    if (idx > -1) {
      dedupedList[idx] = localDoc;
    } else {
      dedupedList.push(localDoc);
    }

    // Simpan dengan hybrid storage (localStorage + IndexedDB backup)
    const saveResult = safeSaveDocuments(dedupedList);
    if (saveResult.warning) {
      console.warn(saveResult.warning);
    }

    // Simpan juga ke IndexedDB secara individual untuk backup
    saveDokumenToIDB(localDoc);

    setLocalPrelist(dedupedList.filter(d => d.kegiatan_id === selectedActivity.id));
    setView("prelist");
  };

  const handleCancelSave = () => {
    if (!selectedRtItem) return;
    askConfirmation(
      "Batal Simpan",
      "Apakah Anda yakin ingin membatalkan simpan dokumen ini? Status akan kembali menjadi Draft.",
      executeCancelSave
    );
  };

  const executeCancelSave = async () => {
    const timestamp = new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) + " " + new Date().toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' });
    let currentLogs = selectedRtItem.logs || [];
    if (typeof currentLogs === 'string') {
      try { currentLogs = JSON.parse(currentLogs); } catch { currentLogs = []; }
    }
    const newLogs = [...currentLogs, `${timestamp}: Kuesioner batal disimpan oleh PCL (Kembali ke Draft)`];

    if (isOffline) {
      const cached = localStorage.getItem(`offline_docs_${currentUser.id}`);
      let cachedList = [];
      if (cached) { try { cachedList = JSON.parse(cached); } catch { cachedList = []; } }

      const updatedLocalDoc = {
        ...selectedRtItem,
        status: "draft",
        logs: newLogs
      };

      const idx = cachedList.findIndex(d => d.kode === selectedRtItem.kode);
      if (idx > -1) {
        cachedList[idx] = updatedLocalDoc;
      }

      // Simpan dengan hybrid storage (localStorage + IndexedDB backup)
      safeSaveDocuments(cachedList);
      saveDokumenToIDB(updatedLocalDoc);

      setSelectedRtItem(updatedLocalDoc);
      setLocalPrelist(cachedList.filter(d => d.kegiatan_id === selectedActivity.id));
    } else {
      try {
        const payload = {
          id: selectedRtItem.id,
          kode: selectedRtItem.kode,
          kegiatan_id: selectedRtItem.kegiatan_id,
          petugas_id: selectedRtItem.petugas_id,
          status: "draft",
          log_message: "Batal simpan dokumen (Kembali ke Draft)"
        };
        const res = await api.dokumen.save(payload);
        if (res.success) {
          const docs = await api.dokumen.getByPetugas(currentUser.id);

          // Simpan dengan hybrid storage (localStorage + IndexedDB backup)
          safeSaveDocuments(docs);
          docs.forEach(doc => saveDokumenToIDB(doc));

          const updatedItem = docs.find(d => d.id === selectedRtItem.id);
          setSelectedRtItem(updatedItem);
          setLocalPrelist(docs.filter(d => d.kegiatan_id === selectedActivity.id));
        }
      } catch (e) {
        console.error(e);
        alert("Terjadi kesalahan jaringan.");
      }
    }
  };

  const handleDeleteDoc = (item) => {
    askConfirmation(
      "Hapus Kuesioner",
      `Apakah Anda yakin ingin menghapus kuesioner untuk ${item.krt || "Tanpa Nama KRT"} (${item.kode})? Tindakan ini tidak dapat dibatalkan.`,
      () => executeDeleteDoc(item)
    );
  };

  const executeDeleteDoc = async (item) => {
    // Hapus dari local storage terlebih dahulu
    const cached = localStorage.getItem(`offline_docs_${currentUser.id}`);
    let cachedList = [];
    if (cached) {
      try {
        cachedList = JSON.parse(cached);
      } catch (e) {
        console.error(e);
      }
    }

    const updatedList = cachedList.filter(d => {
      if (item.id && d.id === item.id) return false;
      return d.kode !== item.kode;
    });

    // Simpan dengan hybrid storage (localStorage + IndexedDB backup)
    safeSaveDocuments(updatedList);

    // Hapus juga dari IndexedDB
    deleteDokumenFromIDB(item.kode);

    setLocalPrelist(updatedList.filter(d => d.kegiatan_id === selectedActivity.id));

    // Jika online dan item memiliki id, hapus juga di database server
    if (!isOffline && item.id) {
      try {
        await api.dokumen.delete(item.id);
      } catch (e) {
        console.error("Gagal menghapus kuesioner di server:", e);
      }
    }
  };

  const handleIntermediateSave = async () => {
    if (!ans.kode || !ans.kode.trim()) {
      alert("Kode Dokumen / Nomor Urut wajib diisi terlebih dahulu sebelum menyimpan.");
      return;
    }

    const timestamp = new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) + " " + new Date().toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' });
    let currentLogs = selectedRtItem?.logs || [];
    if (typeof currentLogs === 'string') {
      try { currentLogs = JSON.parse(currentLogs); } catch { currentLogs = []; }
    }
    
    const newLogs = selectedRtItem
      ? [...currentLogs, `${timestamp}: Kuesioner disimpan sementara (Draft)`]
      : [`${timestamp}: Kuesioner dibuat (Draft)`, `${timestamp}: Kuesioner disimpan sementara (Draft)`];

    const currentStatus = selectedRtItem?.status || "draft";

    const payload = {
      id: selectedRtItem?.id,
      kode: ans.kode,
      kegiatan_id: selectedActivity.id,
      petugas_id: currentUser.id,
      krt: ans.krt || "Tanpa Nama",
      alamat: ans.alamat,
      kecamatan: ans.kecamatan,
      desa: ans.desa,
      sls: ans.sls,
      sub_sls: ans.sub_sls,
      status: currentStatus,
      is_prelist: ans.is_prelist,
      values: ans.values,
      log_message: "Kuesioner disimpan sementara (Draft)"
    };

    const cached = localStorage.getItem(`offline_docs_${currentUser.id}`);
    let cachedList = [];
    if (cached) {
      try { cachedList = JSON.parse(cached); } catch { cachedList = []; }
    }

    const localDoc = {
      ...payload,
      id: selectedRtItem?.id || null,
      review_status: selectedRtItem?.review_status || "draft",
      sync: false,
      logs: newLogs
    };

    // Hapus duplikat berdasarkan kode sebelum mencari index
    const seenKodes = new Set();
    const dedupedList = cachedList.filter(d => {
      if (!d.kode) return true;
      if (seenKodes.has(d.kode)) return false;
      seenKodes.add(d.kode);
      return true;
    });

    const idx = dedupedList.findIndex(d => {
      if (selectedRtItem) {
        if (selectedRtItem.id && d.id === selectedRtItem.id) return true;
        return d.kode === selectedRtItem.kode;
      }
      return d.kode === ans.kode;
    });

    if (idx > -1) {
      dedupedList[idx] = localDoc;
    } else {
      dedupedList.push(localDoc);
    }

    // Simpan dengan hybrid storage (localStorage + IndexedDB backup)
    const saveResult = safeSaveDocuments(dedupedList);
    if (saveResult.warning) {
      console.warn(saveResult.warning);
    }

    // Simpan juga ke IndexedDB secara individual untuk backup
    saveDokumenToIDB(localDoc);

    setLocalPrelist(dedupedList.filter(d => d.kegiatan_id === selectedActivity.id));
    setSelectedRtItem(localDoc);
    showToast("Progres berhasil disimpan sementara.", "success", "Tersimpan");
  };

  const handlePmlApprove = () => {
    if (!selectedRtItem || isOffline) return;
    askConfirmation(
      "Approve Dokumen",
      "Apakah Anda yakin ingin menyetujui dokumen kuesioner ini?",
      executePmlApprove
    );
  };

  const executePmlApprove = async () => {
    try {
      const res = await api.dokumen.review(selectedRtItem.id, 'approved');
      if (res.success) {
        const docs = await fetchDocuments();

        // Simpan dengan hybrid storage (localStorage + IndexedDB backup)
        safeSaveDocuments(docs);
        docs.forEach(doc => saveDokumenToIDB(doc));

        setLocalPrelist(docs.filter(d => d.kegiatan_id === selectedActivity.id));
        setView("prelist");
      }
    } catch (e) {
      console.error(e);
      alert("Gagal mereview dokumen secara online.");
    }
  };

  const handlePmlRejectClick = () => {
    if (!selectedRtItem || isOffline) return;
    setRejectionNote("");
    setRejectionNoteItem(selectedRtItem);
  };

  const submitRejectionWithConfirmation = () => {
    setRejectionNoteItem(null);
    askConfirmation(
      "Reject Dokumen",
      "Apakah Anda yakin ingin menolak dokumen kuesioner ini?",
      executePmlReject
    );
  };

  const executePmlReject = async () => {
    try {
      const res = await api.dokumen.review(selectedRtItem.id, 'rejected', rejectionNote);
      if (res.success) {
        const docs = await fetchDocuments();

        // Simpan dengan hybrid storage (localStorage + IndexedDB backup)
        safeSaveDocuments(docs);
        docs.forEach(doc => saveDokumenToIDB(doc));

        setLocalPrelist(docs.filter(d => d.kegiatan_id === selectedActivity.id));
        setView("prelist");
      }
    } catch (e) {
      console.error(e);
      alert("Gagal mereview dokumen secara online.");
    }
  };

  // Memoize visibleBlocks to prevent expensive recalculation on every render
  const visibleBlocks = useMemo(() => blocks.filter(isBlockVisible), [blocks, isBlockVisible]);

  // ============================================================
  // BEFOREUNLOAD HANDLER - Simpan data saat browser ditutup/refresh
  // Ini penting untuk mencegah kehilangan data saat user menutup tab/browser
  // ============================================================
  useEffect(() => {
    if (!ans.kode || !selectedActivity?.id) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Anda memiliki data yang belum disimpan. Yakin ingin keluar?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [ans.kode, selectedActivity?.id]); // Only trigger on kode/activity change, not every keystroke

  // ============================================================
  // SKIP LOGIC NAVIGATION
  // Handle navigation with skip logic - will be computed dynamically
  // ============================================================

  const getActiveIndex = (tabKode) => {
    return visibleBlocks.findIndex(b => b.kode === tabKode);
  };

  const handlePrevTab = () => {
    const idx = getActiveIndex(activeTab);
    if (idx > 0) {
      setActiveTab(visibleBlocks[idx - 1].kode);
    }
  };

  const handleNextTab = () => {
    const idx = getActiveIndex(activeTab);
    if (idx < visibleBlocks.length - 1) {
      setActiveTab(visibleBlocks[idx + 1].kode);
    }
  };

  const activeBlockIndex = getActiveIndex(activeTab);
  const isFirstBlock = activeBlockIndex === 0;
  const isLastBlock = activeBlockIndex === visibleBlocks.length - 1;

  // Filter questions for the active block
  const activeBlock = visibleBlocks.find(b => b.kode === activeTab);

  // Memoize activeQuestions to avoid re-filtering on every render
  const activeQuestions = useMemo(() => {
    if (!activeBlock) return [];
    return questions.filter(q => String(q.blok_id) === String(activeBlock.id) || String(q.blok_id) === String(activeBlock.kode));
  }, [questions, activeBlock?.id, activeBlock?.kode, visibleBlocks]);

  useEffect(() => {
    if (visibleBlocks.length > 0 && !visibleBlocks.some(b => b.kode === activeTab)) {
      setActiveTab(visibleBlocks[0].kode);
    }
  }, [ans.values, blocks]);

  if (isLoading) {
    return (
      <PetugasLayout activeTab="questionnaire" onNavigate={onNavigate}>
        <div className="min-h-screen bg-white animate-pulse pb-24">
          <div className="max-w-3xl mx-auto">
            {/* Header Skeleton */}
            <div className="relative px-6 pt-12 pb-8 border-b border-solid border-slate-100 overflow-hidden bg-gradient-to-b from-blue-50/40 to-white flex justify-between items-center">
              <div className="space-y-2 flex-1">
                <div className="h-3.5 w-32 bg-slate-200 rounded"></div>
                <div className="h-6 w-48 bg-slate-300 rounded"></div>
                <div className="h-3 w-64 bg-slate-200 rounded"></div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Filter / Top Bar Skeleton */}
              <div className="flex justify-between items-center">
                <div className="h-4 w-28 bg-slate-200 rounded"></div>
                <div className="h-9 w-32 bg-slate-200 rounded-xl"></div>
              </div>

              {/* List Cards Skeleton */}
              <div className="space-y-3">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="bg-white rounded-xl p-5 border border-solid border-slate-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-40 bg-slate-200 rounded"></div>
                      <div className="h-3 w-56 bg-slate-100 rounded"></div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-16 h-6 bg-slate-100 rounded-md"></div>
                      <div className="w-16 h-6 bg-slate-100 rounded-md"></div>
                      <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PetugasLayout>
    );
  }

  return (
    <PetugasLayout activeTab="questionnaire" onNavigate={onNavigate} hideNav={view === "form"}>
      {/* Dynamic Smooth View Transition CSS */}
      <style>{`
        .view-transition {
          animation: fadeInSmooth 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes fadeInSmooth {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className={`min-h-screen bg-white slide-up ${view === "form" ? "pb-2" : "pb-24"}`}>
        <div className="max-w-3xl mx-auto">
          
          {/* VIEW 1: SELECT ACTIVITY */}
          {view === "select_activity" && (
            <div className="flex-1 bg-white view-transition">
              <div className="relative px-6 pt-12 pb-8 border-b border-solid border-slate-100 overflow-hidden bg-gradient-to-b from-blue-50/40 to-white">
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-100/30 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
                <div className="relative z-10">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-semibold">Pengisian Kuesioner</p>
                  <h2 className="text-lg font-extrabold text-slate-900 mt-0.5 tracking-tight font-bold">Pilih Kegiatan</h2>
                  <p className="text-xs text-slate-400 mt-1.5 font-medium leading-relaxed">Pilih salah satu kegiatan aktif untuk mulai mengelola kuesioner.</p>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {officerActivities.map(act => (
                  <button key={act.name} onClick={() => handleSelectActivity(act)}
                    className="w-full bg-white rounded-2xl p-5 border border-solid border-slate-100 flex flex-col gap-4 text-left cursor-pointer transition-all hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/5 group relative overflow-hidden active:scale-[0.99]">
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${act.color || 'bg-blue-600'}`} />
                    <div className="flex items-start justify-between w-full">
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors truncate">{act.name}</h4>
                        <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed font-semibold">{act.description}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {act.role === "PML" ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-solid border-purple-100/50 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                            Pengawas (PML)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-solid border-blue-100/50 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            Pencacah (PCL)
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
                {officerActivities.length === 0 && (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl py-12 text-center">
                    <p className="text-xs text-slate-400 font-bold">Belum ditugaskan ke kegiatan survei apapun.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 2: PRELIST */}
          {view === "prelist" && selectedActivity && (
            <div className="flex-1 bg-white view-transition">
              <div className="relative px-6 pt-12 pb-8 border-b border-solid border-slate-100 overflow-hidden bg-gradient-to-b from-blue-50/40 to-white flex items-center gap-4">
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-100/30 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
                <button onClick={() => setView("select_activity")}
                  className="w-10 h-10 bg-white hover:bg-slate-50 border border-solid border-slate-200/60 hover:border-slate-350 cursor-pointer rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-655 transition-all flex-shrink-0 active:scale-95 shadow-sm relative z-10">
                  <ArrowLeft size={16} />
                </button>
                <div className="flex-1 min-w-0 relative z-10">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-semibold truncate">Kegiatan: {selectedActivity.name}</p>
                  <h2 className="text-lg font-extrabold text-slate-900 mt-0.5 tracking-tight truncate font-bold">Daftar Prelist {selectedActivity.fokus === 'Rumah Tangga' ? 'RT' : (selectedActivity.fokus || 'RT')}</h2>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-400 font-bold">{localPrelist.length} {selectedActivity.fokus || 'Rumah Tangga'}</span>
                  {!isPml && (
                    <button onClick={handleAddNew}
                      disabled={loadingForm || blocks.length === 0}
                      className="px-4 py-2.5 bg-gradient-to-br from-blue-600 to-indigo-650 text-white rounded-xl text-xs font-bold border-0 cursor-pointer hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-sm hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50"
                    >
                      <Plus size={14} /> Tambah Baru
                    </button>
                  )}
                </div>

                {loadingForm ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <RefreshCw className="animate-spin mb-2" size={24} />
                    <p className="text-xs font-bold">Memuat formulir...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {localPrelist.map((item, i) => (
                      <div key={item.kode} onClick={() => handleEditItem(item)}
                        className="w-full bg-white rounded-2xl p-4.5 border border-solid border-slate-100 flex items-center gap-4 text-left cursor-pointer transition-all hover:border-blue-200 hover:shadow-md hover:shadow-blue-500/5 group active:scale-[0.99]">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 border border-solid ${
                          item.status === "terkirim" ? "bg-blue-50 text-blue-600 border-blue-100/50" :
                          item.status === "tersimpan" ? "bg-emerald-50 text-emerald-600 border-emerald-100/50" :
                          "bg-slate-50 text-slate-400 border-slate-200/50"
                        }`}>{i + 1}</div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                            {item.krt || "Tanpa Nama"}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono font-semibold">
                            Kode: {item.kode}
                          </p>
                          
                          {/* Badges and actions placed below info to avoid layout overflow on mobile */}
                          <div className="flex flex-wrap items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                            {/* PCL completion status badge */}
                            {!isPml && (
                              <Badge status={item.review_status === "rejected" ? "rejected" : item.status}/>
                            )}
                            
                            {/* PML review status badge */}
                            {isPml && (
                              item.review_status === "approved" ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-solid border-emerald-100/50 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Approved
                                </span>
                              ) : item.review_status === "rejected" ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-solid border-rose-100/50 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  Rejected
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-solid border-slate-200/50 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  Draft
                                </span>
                              )
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLogItem(item);
                              }}
                              className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-solid border-slate-200/60 hover:border-slate-350 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all cursor-pointer active:scale-90"
                              title="Log Aktivitas"
                            >
                              <MessageSquare size={12} />
                            </button>

                            {!isPml && item.status !== "terkirim" && item.review_status !== "rejected" && item.review_status !== "approved" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDoc(item);
                                }}
                                className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 border border-solid border-rose-200/60 hover:border-rose-350 flex items-center justify-center text-rose-500 hover:text-rose-700 transition-all cursor-pointer active:scale-90"
                                title="Hapus Kuesioner"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {localPrelist.length === 0 && (
                      <div className="bg-slate-50 rounded-2xl py-12 text-center border border-dashed border-slate-200">
                        <p className="text-xs text-slate-550 font-bold">Prelist {selectedActivity.fokus === 'Rumah Tangga' ? 'RT' : (selectedActivity.fokus || 'RT')} Kosong</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-semibold">Klik Tambah Baru untuk mengisi kuesioner baru</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 3: FORM */}
          {view === "form" && selectedActivity && (
            <div className="bg-slate-50 min-h-screen flex flex-col rounded-2xl overflow-hidden mt-4 shadow-sm view-transition">
              
              {/* Status Header Banners */}
              {(() => {
                if (selectedRtItem?.review_status === "approved") {
                  return (
                    <div className="bg-emerald-50 border-b border-solid border-emerald-100 px-6 py-3 flex items-center gap-2.5 text-emerald-800">
                      <ShieldCheck size={16} className="text-emerald-600" />
                      <p className="text-xs font-semibold">Dokumen telah disetujui (Approved) dan tidak dapat diubah kembali.</p>
                    </div>
                  );
                }
                if (selectedRtItem?.review_status === "rejected") {
                  return (
                    <div className="bg-rose-50 border-b border-solid border-rose-100 px-6 py-3 flex items-center gap-2.5 text-rose-800">
                      <XCircle size={16} className="text-rose-600" />
                      <p className="text-xs font-semibold">Dokumen ditolak (Rejected) oleh PML. Silakan perbaiki sesuai catatan pengawas.</p>
                    </div>
                  );
                }
                if (selectedRtItem?.status === "terkirim") {
                  return (
                    <div className="bg-blue-50 border-b border-solid border-blue-100 px-6 py-3 flex items-center gap-2.5 text-blue-800">
                      <CheckCircle size={16} className="text-blue-600" />
                      <p className="text-xs font-semibold">Dokumen telah terkirim (Terkirim) ke server dan bersifat read-only.</p>
                    </div>
                  );
                }
                if (selectedRtItem?.status === "tersimpan") {
                  if (isPml) {
                    return (
                      <div className="bg-amber-50 border-b border-solid border-amber-100 px-6 py-3 flex items-center gap-2.5 text-amber-800">
                        <AlertCircle size={16} className="text-amber-600" />
                        <p className="text-xs font-semibold">Dokumen disimpan oleh PCL tetapi belum dikirim ke server.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="bg-teal-50 border-b border-solid border-teal-100 px-6 py-3 flex items-center gap-2.5 text-teal-800">
                      <Info size={16} className="text-teal-600" />
                      <p className="text-xs font-semibold">Dokumen disimpan (Tersimpan) dan bersifat read-only. Klik "Batal Simpan" di langkah terakhir untuk mengedit.</p>
                    </div>
                  );
                }
                if (isPml) {
                  return (
                    <div className="bg-slate-50 border-b border-solid border-slate-105 px-6 py-3 flex items-center gap-2.5 text-slate-700">
                      <Info size={16} className="text-slate-500" />
                      <p className="text-xs font-semibold">Mode Pemeriksaan Pengawas (PML). Jawaban tidak dapat diubah.</p>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Form header */}
              <div className="bg-white border-b border-solid border-slate-100 px-6 pt-8 pb-5">
                <div className="flex items-center gap-3 mb-5">
                  <button onClick={() => setView("prelist")}
                    className="w-9 h-9 bg-slate-50 hover:bg-slate-100 border border-solid border-slate-100 cursor-pointer rounded-lg flex items-center justify-center flex-shrink-0 transition-all text-slate-400">
                    <ArrowLeft size={16} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-400 font-medium truncate">
                      {selectedRtItem ? `${selectedRtItem.kode} · ${selectedRtItem.krt}` : "Baru · Tambah Kuesioner"}
                    </p>
                    <h2 className="text-base font-bold text-slate-900 truncate">
                      {activeTab} – {activeBlock?.title || "Isi Kuesioner"}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all text-slate-500 bg-slate-50">
                      Form Kuesioner
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSummaryModal(true)}
                      className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-solid border-slate-200/60 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all cursor-pointer"
                      title="Rangkuman Galat"
                    >
                      <Info size={14} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                {visibleBlocks.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex gap-1.5">
                      {visibleBlocks.map((b, i) => {
                        const isCompleted = i < activeBlockIndex;
                        const isCurrent = b.kode === activeTab;
                        return (
                          <div key={b.kode} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                            isCurrent ? "bg-blue-400 animate-pulse" : isCompleted ? "bg-blue-600" : "bg-slate-100"
                          }`}/>
                        );
                      })}
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                      <span>Langkah {activeBlockIndex + 1} dari {visibleBlocks.length}</span>
                      <span className="text-blue-600 font-semibold">{activeTab} ({activeBlock?.title})</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Block Tab Header Toggles */}
              <div className="flex gap-2 px-6 py-4 overflow-x-auto bg-white border-b border-solid border-slate-50">
                {visibleBlocks.map((b) => {
                  const isActive = b.kode === activeTab;
                  const status = validateBlock(b.kode);
                  
                  let tabStyle = "";
                  let icon = null;
                  
                  if (isActive) {
                    tabStyle = "text-white bg-blue-600 border-blue-600";
                  } else {
                    if (status === 'safe') {
                      tabStyle = "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/60";
                      icon = <Check size={12} className="inline mr-1 text-emerald-600 stroke-[3px]" />;
                    } else if (status === 'warning') {
                      tabStyle = "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100/60";
                      icon = <AlertTriangle size={12} className="inline mr-1 text-amber-500 fill-amber-50/20" />;
                    } else if (status === 'error') {
                      tabStyle = "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100/60";
                      icon = <XCircle size={12} className="inline mr-1 text-rose-500 fill-rose-50/20" />;
                    } else {
                      tabStyle = "bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100";
                    }
                  }
                  
                  return (
                    <button key={b.kode} onClick={() => setActiveTab(b.kode)}
                      className={`flex-shrink-0 px-3.5 py-2 rounded-lg text-xs font-semibold border border-solid cursor-pointer transition-all flex items-center ${tabStyle}`}>
                      {icon}
                      {b.kode}
                    </button>
                  );
                })}
              </div>

              {/* Questions Render Panel */}
              <div className="px-6 py-6 space-y-4 flex-1">
                
                {/* Prepend code input at the top of Block I */}
                {isFirstBlock && (
                  <QCard r="kode" label={`Kode Dokumen / Nomor Urut ${selectedActivity.fokus === 'Rumah Tangga' ? 'RT' : (selectedActivity.fokus || 'RT')}`} required hint={`Kode unik identifikasi ${selectedActivity.fokus?.toLowerCase() || 'rumah tangga'}`}>
                    <input 
                      type="text" 
                      value={ans.kode} 
                      onChange={e => {
                        setAns(p => ({ ...p, kode: e.target.value }));
                      }}
                      placeholder={`Contoh: ${selectedActivity.fokus === 'Rumah Tangga' ? 'RT' : (selectedActivity.fokus || 'RT')}-001`} 
                      disabled={true}
                      className="w-full px-4 py-3 text-sm bg-white border border-solid border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                  </QCard>
                )}
                {(() => {
                  const activityPetugas = (petugas || []).filter(p => 
                    p.projects?.includes(selectedActivity?.name)
                  );
                  const pclList = activityPetugas.filter(p => 
                    p.projectRoles?.[selectedActivity?.name] === "PCL"
                  );
                  const pmlList = activityPetugas.filter(p => 
                    p.projectRoles?.[selectedActivity?.name] === "PML"
                  );

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
                      const resolvedValues = getResolvedValuesForIndex(ans.values, activeInstanceIdx);
                      const val = resolvedValues[targetQ.id];
                      return val !== undefined && val !== null && val !== "" ? val : match;
                    });
                  };

                  const renderInputs = (q, rawInstances, activeInstanceIdx = null) => {
                    const instances = activeInstanceIdx !== null ? [activeInstanceIdx] : rawInstances;
                    const isTextType = q.type === 'text';
                    const isNumberType = q.type === 'number';
                    const isTextAreaType = q.type === 'textarea';
                    const isChoiceType = q.type === 'select' || q.type === 'radio';
                    const isLocationType = q.type === 'location';
                    const isDateType = q.type === 'date';
                    const isPclType = q.type === 'pcl';
                    const isPmlType = q.type === 'pml';
                    const isSearchType = q.type === 'search';
                    const isSignatureType = q.type === 'signature';

                    const qVal = parseValidation(q.validation);
                    // isReadOnly comes from outer scope; qVal.readOnly allows per-question override
                    const isReadOnlyQ = isReadOnly || !!qVal.readOnly;
 
                    return (
                      <>
                        {/* Signature Pad */}
                        {isSignatureType && (
                          <div className="space-y-3">
                            {instances.map((idx) => (
                              <div key={idx} className="mt-2">
                                <SignaturePad 
                                  value={getLoopValue(q.id, idx) || ""} 
                                  onChange={(url) => handleValueChange(q, url, idx, instances.length)} 
                                  disabled={isReadOnlyQ}
                                  uploadUrl={`${API_BASE}/upload/signature`}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Searchable Dropdown */}
                        {isSearchType && (
                          <div className="space-y-3">
                            {instances.map((idx) => {
                              const val = getLoopValue(q.id, idx);
                              let isOtherSelected = false;
                              let otherText = "";
                              let otherOpt = null;
                              let selectedVal = "";
                              if (val !== undefined && val !== null && val !== '') {
                                  if (typeof val === 'string' && val.trim().startsWith('{')) {
                                    try {
                                      const parsed = JSON.parse(val);
                                      selectedVal = String(parsed.value);
                                      otherText = parsed.text || "";
                                    } catch (e) {}
                                  } else {
                                    selectedVal = String(val);
                                  }
                              }
                              if (selectedVal) {
                                otherOpt = resolveDynamicOptions(q).find(o => String(o.value) === selectedVal && o.is_other);
                                if (otherOpt) {
                                  isOtherSelected = true;
                                }
                              }

                              return (
                                <div key={idx} className="space-y-1">
                                  {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400">Isian Ke-{idx + 1}</label>}
                                  <SearchableSelect
                                    value={val}
                                    options={resolveDynamicOptions(q)}
                                    disabled={isReadOnlyQ}
                                    placeholder="Cari dan pilih opsi..."
                                    onChange={(selectedVal) => {
                                      const opt = resolveDynamicOptions(q).find(o => String(o.value) === String(selectedVal));
                                      const finalVal = opt && opt.is_other
                                        ? JSON.stringify({ value: selectedVal, text: "" })
                                        : selectedVal;
                                      handleValueChange(q, finalVal, idx, instances.length);
                                    }}
                                  />
                                  {isOtherSelected && otherOpt && (
                                    <div className="space-y-1 mt-2">
                                      <label className="text-[10px] font-bold text-slate-400 uppercase">Keterangan {otherOpt.label}</label>
                                      <input
                                        type="text"
                                        value={otherText}
                                        disabled={isReadOnlyQ}
                                        placeholder="Sebutkan..."
                                        onChange={(e) => {
                                          const newVal = JSON.stringify({ value: otherOpt.value, text: e.target.value });
                                          handleValueChange(q, newVal, idx, instances.length);
                                        }}
                                        className="w-full px-4 py-2.5 text-xs bg-white border border-solid border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800 disabled:bg-slate-50"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {/* PCL INPUTS */}
                        {isPclType && (
                          <div className="space-y-3">
                            {instances.map((idx) => {
                              const val = getLoopValue(q.id, idx);
                              const defaultPcl = val || currentPetugas.name || currentUser.name || "";
                              return (
                                <div key={idx} className="space-y-1">
                                  {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400">Isian Ke-{idx + 1}</label>}
                                  <input 
                                    type="text"
                                    value={defaultPcl}
                                    disabled={true}
                                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-solid border-slate-200 rounded-xl outline-none font-medium text-slate-500 cursor-not-allowed"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* PML INPUTS */}
                        {isPmlType && (
                          <div className="space-y-3">
                            {instances.map((idx) => {
                              const val = getLoopValue(q.id, idx);
                              let defaultPml = val;
                              if (!defaultPml) {
                                const docPclId = selectedRtItem ? selectedRtItem.petugas_id : null;
                                const docPetugas = docPclId ? (petugas || []).find(p => p.id === docPclId) : null;
                                defaultPml = (docPetugas || currentPetugas).assignments?.[selectedActivity?.name]?.pengawas || "";
                              }
                              return (
                                <div key={idx} className="space-y-1">
                                  {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400">Isian Ke-{idx + 1}</label>}
                                  <input 
                                    type="text"
                                    value={defaultPml}
                                    disabled={true}
                                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-solid border-slate-200 rounded-xl outline-none font-medium text-slate-500 cursor-not-allowed"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* 1. TEXT INPUTS */}
                        {isTextType && (
                          <div className="space-y-3">
                            {instances.map((idx) => {
                              const val = getLoopValue(q.id, idx);
                              const errMsg = getInputErrorMsg(q, val);
                              const hasErr = !!errMsg;
                              return (
                                <div key={idx} className="space-y-1">
                                  {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400">Isian Ke-{idx + 1}</label>}
                                  <DebouncedInput 
                                    type="text"
                                    value={val}
                                    forceUppercase={true}
                                    placeholder={`Isi ${q.label}${instances.length > 1 ? ` ke-${idx + 1}` : ""}`}
                                    disabled={isReadOnlyQ}
                                    onChange={(newVal) => {
                                      handleValueChange(q, newVal, idx, instances.length);
                                    }}
                                    className={`w-full px-4 py-3 text-sm bg-white border border-solid rounded-xl outline-none focus:ring-2 transition-all font-medium disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${
                                      hasErr 
                                        ? "border-red-500 text-red-905 focus:border-red-500 focus:ring-red-500/10" 
                                        : "border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-blue-500/10"
                                    }`}
                                  />
                                  {hasErr && (
                                    <p className="text-[10px] text-red-500 font-semibold mt-1">
                                      * {errMsg}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
 
                        {/* 2. NUMBER INPUTS */}
                        {isNumberType && (() => {
                          const qVal = parseValidation(q.validation);
                          const isFormula = !!qVal.formula;
                          return (
                            <div className="space-y-3">
                              {instances.map((idx) => {
                                const val = getLoopValue(q.id, idx);
                                const errMsg = getInputErrorMsg(q, val);
                                const hasErr = !!errMsg;
                                return (
                                  <div key={idx} className="space-y-1">
                                    {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400 block mb-1">Isian Ke-{idx + 1}</label>}
                                    <div className="flex flex-col space-y-1">
                                      <div className="flex items-center gap-2 w-full">
                                        <div className={`flex-1 flex items-center justify-between bg-white border border-solid rounded-xl px-4 py-2.5 focus-within:ring-2 transition-all ${
                                          hasErr 
                                            ? "border-red-500 focus-within:ring-red-500/10" 
                                            : "border-slate-200 focus-within:ring-blue-500/10"
                                        }`}>
                                          <DebouncedInput 
                                            type="text"
                                            value={val}
                                            allowedPattern={/^-?\d*\.?\d*$/}
                                            isNumberFormat={true}
                                            placeholder={isFormula ? "Kalkulasi otomatis..." : "Masukkan angka..."}
                                            disabled={isReadOnlyQ || isFormula}
                                            onChange={(newVal) => {
                                              handleValueChange(q, newVal, idx, instances.length);
                                            }}
                                            className="w-full !border-none !outline-none focus:!ring-0 focus:!outline-none focus:!border-none focus:!shadow-none bg-transparent py-1 text-sm font-semibold text-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-left"
                                          />
                                        </div>
                                        {!isFormula && !isReadOnlyQ && (
                                          <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const currentVal = parseFloat(val) || 0;
                                                const newVal = Math.max(0, currentVal - 1);
                                                handleValueChange(q, String(newVal), idx, instances.length);
                                              }}
                                              className="w-11 h-11 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-90 text-slate-600 flex items-center justify-center border border-solid border-slate-200 cursor-pointer font-bold transition-all text-lg"
                                            >
                                              -
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const currentVal = parseFloat(val) || 0;
                                                const newVal = currentVal + 1;
                                                handleValueChange(q, String(newVal), idx, instances.length);
                                              }}
                                              className="w-11 h-11 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-90 text-slate-600 flex items-center justify-center border border-solid border-slate-200 cursor-pointer font-bold transition-all text-lg"
                                            >
                                              +
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      {hasErr && (
                                        <p className="text-[10px] text-red-500 font-semibold mt-1">
                                          * {errMsg}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
 
                        {/* 3. TEXTAREA INPUTS */}
                        {isTextAreaType && (
                          <div className="space-y-3">
                            {instances.map((idx) => (
                              <div key={idx} className="space-y-1">
                                {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400">Isian Ke-{idx + 1}</label>}
                                <DebouncedTextarea
                                  value={getLoopValue(q.id, idx)}
                                  placeholder={`Masukkan detail ${q.label}`}
                                  disabled={isReadOnlyQ}
                                  onChange={(newVal) => {
                                    handleValueChange(q, newVal, idx, instances.length);
                                  }}
                                  className="w-full h-20 p-3 border border-solid border-slate-200 rounded-xl outline-none focus:border-blue-500 text-xs font-semibold text-slate-800 resize-none disabled:bg-slate-50"
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 4. SELECTION / RADIO INPUTS */}
                        {isChoiceType && (
                          <div className="space-y-4">
                            {instances.map((idx) => (
                              <div key={idx} className="space-y-2">
                                {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400 block mb-1">Isian Ke-{idx + 1}</label>}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {resolveDynamicOptions(q).map((opt) => {
                                    let isSelected = false;
                                    if (q.type === 'select') {
                                      // Multi-select: parse JSON string if exists
                                      let selectedMap = {};
                                      try {
                                        const val = getLoopValue(q.id, idx);
                                        selectedMap = JSON.parse(val || "{}");
                                      } catch (e) {}
                                      isSelected = !!selectedMap[opt.value];
                                    } else {
                                      // Radio: single select
                                      const val = getLoopValue(q.id, idx);
                                      if (val && typeof val === 'string' && val.trim().startsWith('{')) {
                                        try {
                                          const parsed = JSON.parse(val);
                                          isSelected = String(parsed.value) === String(opt.value);
                                        } catch (e) {}
                                      } else {
                                        isSelected = String(val) === String(opt.value);
                                      }
                                    }

                                    return (
                                      <FastChoiceButton 
                                        key={opt.value} 
                                        type={q.type}
                                        isSelected={isSelected}
                                        disabled={isReadOnlyQ}
                                        onClick={() => {
                                          if (isReadOnlyQ) return;
                                          if (q.type === 'select') {
                                            let selectedMap = {};
                                            try {
                                              const val = getLoopValue(q.id, idx);
                                              selectedMap = JSON.parse(val || "{}");
                                            } catch (e) {}
                                            if (selectedMap[opt.value]) {
                                              delete selectedMap[opt.value];
                                            } else {
                                              selectedMap[opt.value] = opt.is_other ? "" : 1;
                                            }
                                            const valStr = JSON.stringify(selectedMap);
                                            handleValueChange(q, valStr, idx, instances.length);
                                          } else {
                                            const val = opt.is_other 
                                              ? JSON.stringify({ value: opt.value, text: "" })
                                              : opt.value;
                                            handleValueChange(q, val, idx, instances.length);
                                          }
                                        }}
                                      >
                                        <span className="flex-1 break-words leading-relaxed whitespace-pre-wrap" style={{ wordBreak: 'break-word' }}>
                                          {opt.value}. {opt.label}
                                        </span>
                                      </FastChoiceButton>
                                    );
                                  })}
                                </div>

                                {/* Text input field for Lainnya */}
                                {(() => {
                                  // Find if any selected option has is_other
                                  const val = getLoopValue(q.id, idx);
                                  
                                  if (q.type === 'select') {
                                    let selectedMap = {};
                                    try {
                                      selectedMap = JSON.parse(val || "{}");
                                    } catch (e) {}
                                    
                                    const otherOpts = resolveDynamicOptions(q).filter(o => o.is_other && selectedMap[o.value] !== undefined);
                                    if (otherOpts.length === 0) return null;
                                    
                                    return (
                                      <div className="space-y-2 mt-2">
                                        {otherOpts.map(opt => (
                                          <div key={opt.value} className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Keterangan {opt.label}</label>
                                            <DebouncedInput
                                              type="text"
                                              value={selectedMap[opt.value] === 1 || selectedMap[opt.value] === '1' ? "" : (selectedMap[opt.value] || "")}
                                              disabled={isReadOnlyQ}
                                              placeholder="Sebutkan..."
                                              onChange={(newVal) => {
                                                selectedMap[opt.value] = newVal;
                                                handleValueChange(q, JSON.stringify(selectedMap), idx, instances.length);
                                              }}
                                              className="w-full px-4 py-2.5 text-xs bg-white border border-solid border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800 disabled:bg-slate-50"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  } else {
                                    // Radio
                                    let isOtherSelected = false;
                                    let otherText = "";
                                    let otherOpt = null;
                                    let selectedVal = "";
                                    
                                    if (val !== undefined && val !== null && val !== '') {
                                      if (typeof val === 'string' && val.trim().startsWith('{')) {
                                        try {
                                          const parsed = JSON.parse(val);
                                          selectedVal = String(parsed.value);
                                          otherText = parsed.text || "";
                                        } catch (e) {}
                                      } else {
                                        selectedVal = String(val);
                                      }
                                    }

                                    if (selectedVal) {
                                      otherOpt = resolveDynamicOptions(q).find(o => String(o.value) === selectedVal && o.is_other);
                                      if (otherOpt) {
                                        isOtherSelected = true;
                                      }
                                    }
                                    
                                    if (!isOtherSelected) return null;
                                    
                                    return (
                                      <div className="space-y-1 mt-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Keterangan {otherOpt.label}</label>
                                        <DebouncedInput
                                          type="text"
                                          value={otherText}
                                          disabled={isReadOnlyQ}
                                          placeholder="Sebutkan..."
                                          onChange={(newVal) => {
                                            const valJSON = JSON.stringify({ value: otherOpt.value, text: newVal });
                                            handleValueChange(q, valJSON, idx, instances.length);
                                          }}
                                          className="w-full px-4 py-2.5 text-xs bg-white border border-solid border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800 disabled:bg-slate-50"
                                        />
                                      </div>
                                    );
                                  }
                                })()}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 5. GEOTAGGING/LOCATION INPUT */}
                        {isLocationType && (
                          <div className="space-y-4">
                            {instances.map((idx) => (
                              <div key={idx} className="space-y-1">
                                {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400">Isian Ke-{idx + 1}</label>}
                                <div className="flex flex-col gap-3">
                                  <div className="flex gap-2">
                                    <input 
                                      type="text"
                                      value={getLoopValue(q.id, idx)}
                                      placeholder="Latitude, Longitude (Klik 'Ambil Lokasi')"
                                      readOnly
                                      disabled={isReadOnlyQ}
                                      className="flex-1 px-4 py-3 text-sm bg-slate-50 border border-solid border-slate-200 rounded-xl outline-none transition-all font-medium text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                                    />
                                    <button
                                      type="button"
                                      disabled={isReadOnlyQ}
                                      onClick={() => {
                                        if (navigator.geolocation) {
                                          navigator.geolocation.getCurrentPosition(
                                            (position) => {
                                              const coords = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
                                              handleValueChange(q, coords, idx, instances.length);
                                            },
                                            (error) => {
                                              console.error("Geotagging error:", error);
                                              alert("Gagal mengambil lokasi: " + error.message);
                                            },
                                            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                                          );
                                        } else {
                                          alert("Browser Anda tidak mendukung layanan Geotagging.");
                                        }
                                      }}
                                      className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold border-0 cursor-pointer transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                                    >
                                      <MapPin size={14} />
                                      <span>Ambil Lokasi</span>
                                    </button>
                                  </div>
                                  {((getLoopValue(q.id, idx)) || "") && (
                                    <p className="text-[10px] text-slate-400 font-medium">
                                      Lokasi terekam pada koordinat di atas.
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
 
                        {/* 6. DATE/TIME INPUTS */}
                        {isDateType && (
                          <div className="space-y-4">
                            {instances.map((idx) => {
                              let dateType = "date";
                              let isAutoNow = false;
                              if (q.validation && q.validation.trim().startsWith('{')) {
                                try {
                                  const parsed = JSON.parse(q.validation);
                                  dateType = parsed.date_type || "date";
                                  isAutoNow = !!parsed.auto_now;
                                } catch (e) {}
                              }
 
                              const handleAutoNowClick = () => {
                                const now = new Date();
                                let valueToSet = "";
                                if (dateType === "date") {
                                  valueToSet = now.toISOString().split("T")[0];
                                } else if (dateType === "datetime-local") {
                                  const tzOffset = now.getTimezoneOffset() * 60000;
                                  const localISOTime = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16);
                                  valueToSet = localISOTime;
                                } else if (dateType === "time") {
                                  const hours = String(now.getHours()).padStart(2, "0");
                                  const minutes = String(now.getMinutes()).padStart(2, "0");
                                  valueToSet = `${hours}:${minutes}`;
                                }
 
                                handleValueChange(q, valueToSet, idx, instances.length);
                              };
 
                              return (
                                <div key={idx} className="space-y-1">
                                  {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400">Isian Ke-{idx + 1}</label>}
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <input 
                                      type={dateType}
                                      value={getLoopValue(q.id, idx)}
                                      disabled={isReadOnlyQ}
                                      onChange={(e) => {
                                        handleValueChange(q, e.target.value, idx, instances.length);
                                      }}
                                      className="flex-1 px-4 py-3 text-sm bg-white border border-solid border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                                    />
                                    {isAutoNow && !isReadOnlyQ && (
                                      <button
                                        type="button"
                                        onClick={handleAutoNowClick}
                                        className="px-4 py-3 bg-blue-55 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-semibold border border-solid border-blue-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                      >
                                        <Clock size={14} />
                                        <span>Waktu Sekarang</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  };

                  const renderQuestionRow = (q, depth = 0, forceCard = false, activeInstanceIdx = null) => {
                    if (!isQuestionVisible(q, activeInstanceIdx)) return null;

                    if (q.type === 'note') {
                      let labelText = q.label || "";
                      const isBuildingNote = labelText.toLowerCase().includes("no bangunan terakhir") ||
                        labelText.toLowerCase().includes("nomor urut bangunan") ||
                        labelText.includes("{{no_bangunan_terakhir}}") ||
                        (() => {
                          const sortedBlockQs = activeQuestions.slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                          const myIdx = sortedBlockQs.findIndex(x => x.id === q.id);
                          const nextQ = myIdx >= 0 && myIdx < sortedBlockQs.length - 1 ? sortedBlockQs[myIdx + 1] : null;
                          return nextQ && nextQ.label && nextQ.label.toLowerCase().includes("nomor urut bangunan");
                        })();

                      const lastBuildingNum = getMaxBuildingNumber();
                      
                      if (isBuildingNote && !labelText.includes("{{no_bangunan_terakhir}}")) {
                        labelText = `No. bangunan terakhir: **{{no_bangunan_terakhir}}**`;
                      }

                      return (
                        <div key={`${q.id}_${activeInstanceIdx !== null ? activeInstanceIdx : '0'}`} className="bg-amber-50/60 border border-solid border-amber-100 rounded-2xl p-5">
                          <p className="text-sm font-semibold text-amber-950 leading-relaxed break-words">
                            {renderNoteText(labelText, computeAggregation)}
                          </p>
                        </div>
                      );
                    }

                    const childQs = questions.filter(c => (c.parent_id === q.id || c.parentId === q.id) && (String(c.blok_id) === String(q.blok_id) || String(c.blok_id) === String(activeBlock.id) || String(c.blok_id) === String(activeBlock.kode)));
                    const hasChildren = childQs.length > 0;

                    const { rangeText, hintText, description, isLoop, loopType, loopByQuestionId, subLabel } = parseValidation(q.validation);

                    const loopCount = getQuestionLoopCount(q);
                    if (loopCount <= 0) return null;
                    const instances = Array.from({ length: loopCount }, (_, idx) => idx);

                    const qCode = getQuestionCode(q, questions, blocks);
                    const qVal = parseValidation(q.validation);
                    const parentMode = qVal.parentMode || "label";

                    if (hasChildren && parentMode === "empty") {
                      return null;
                    }

                    if (depth === 0 || forceCard) {
                      return (
                        <QCard 
                          key={`${q.id}_${activeInstanceIdx !== null ? activeInstanceIdx : '0'}`} 
                          r={qCode} 
                          label={resolveLabelText(q.label, activeInstanceIdx)} 
                          subLabel={q.type === 'number' && subLabel === 'Satuan Angka' ? null : subLabel}
                          required={!!q.required} 
                          description={description}
                        >
                          {parentMode === "original" ? (
                            <div className="mb-4">
                              {renderInputs(q, instances, activeInstanceIdx)}
                            </div>
                          ) : (
                            !hasChildren && renderInputs(q, instances, activeInstanceIdx)
                          )}

                          {isLoop && loopType === "manual" && activeInstanceIdx === null && (
                            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-dashed border-slate-100">
                              {!isReadOnly && (
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
                        </QCard>
                      );
                    } else {
                      return (
                        <div key={q.id} className="space-y-2 py-2 border-b border-solid border-slate-50 last:border-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">R.{qCode}</span>
                                {q.required && <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded uppercase">Wajib</span>}
                              </div>
                              <p className="text-xs font-bold text-slate-700 mt-1">{resolveLabelText(q.label, activeInstanceIdx)}</p>
                              {subLabel && !(q.type === 'number' && subLabel === 'Satuan Angka') && <p className="text-[11px] text-slate-500 font-medium mt-0.5">{subLabel}</p>}
                            </div>
                          </div>
                          <div className="pl-4 mt-2">
                            {hasChildren ? (
                              <div className="space-y-3">
                                {parentMode === "original" && (
                                  <div className="mb-3">
                                    {renderInputs(q, instances, activeInstanceIdx)}
                                  </div>
                                )}
                                <div className="border-l border-solid border-slate-200 pl-3 space-y-3">
                                  {childQs.sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0)).map(child => renderQuestionRow(child, depth + 1, false, activeInstanceIdx))}
                                </div>
                              </div>
                            ) : (
                              renderInputs(q, instances, activeInstanceIdx)
                            )}

                            {isLoop && loopType === "manual" && activeInstanceIdx === null && (
                              <div className="flex items-center gap-3 mt-3 pt-2 border-t border-dashed border-slate-100">
                                {!isReadOnly && (
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

                  const orderedBlockQs = getActiveBlockOrderedQuestions(activeBlock);
                  const renderedGroups = new Set();
                  
                  return orderedBlockQs.flatMap(q => {
                    let groupId = getQuestionLoopGroup(q);
                    let isManual = false;
                    
                    if (!groupId) {
                      const val = parseValidation(q.validation);
                      if (val.isLoop && val.loopByQuestionId) {
                        groupId = `loop_by_${val.loopByQuestionId}`;
                      } else if (val.isLoop && val.loopType === "manual") {
                        groupId = `loop_manual_${q.id}`;
                        isManual = true;
                      }
                    } else {
                      isManual = true;
                    }

                    if (groupId) {
                      if (renderedGroups.has(groupId)) {
                        return [];
                      }
                      renderedGroups.add(groupId);

                      const groupQs = orderedBlockQs.filter(x => {
                        const xGrp = getQuestionLoopGroup(x);
                        if (groupId === xGrp) return true;
                        
                        const xVal = parseValidation(x.validation);
                        if (!xGrp && xVal.isLoop) {
                          if (xVal.loopByQuestionId && `loop_by_${xVal.loopByQuestionId}` === groupId) return true;
                          if (xVal.loopType === "manual" && `loop_manual_${x.id}` === groupId) return true;
                        }
                        return false;
                      });

                      const masterQ = groupQs.find(x => {
                        if (!x.validation) return false;
                        try {
                          const parsed = JSON.parse(x.validation);
                          return parsed && parsed.is_loop;
                        } catch (e) {
                          return false;
                        }
                      }) || groupQs[0];

                      const loopCount = getQuestionLoopCount(masterQ);
                      const instances = Array.from({ length: Math.max(1, loopCount) }, (_, idx) => idx);
                      
                      const groupIsManual = groupQs.some(x => {
                        const v = parseValidation(x.validation);
                        return v.isLoop && v.loopType === "manual";
                      });

                      const resultElements = [];

                      instances.forEach((idx) => {
                        if (instances.length > 1) {
                          resultElements.push(
                            <div key={`loop_header_${groupId}_${idx}`} className="flex items-center gap-2 py-2 border-b border-solid border-slate-200 mt-6 first:mt-0 mb-4">
                              <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                Isian Ke-{idx + 1}
                              </span>
                            </div>
                          );
                        }
                        
                        groupQs.forEach(gq => {
                          const el = renderQuestionRow(gq, 0, true, idx);
                          if (el) {
                            resultElements.push(el);
                          }
                        });
                      });

                      if (groupIsManual && !(isReadOnly || !!parseValidation(masterQ.validation).readOnly)) {
                        resultElements.push(
                          <div key={`loop_controls_${groupId}`} className="flex items-center gap-3 mt-6 p-4 bg-white rounded-xl border border-solid border-slate-200">
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
                        );
                      }

                      return resultElements;
                    }

                    return renderQuestionRow(q, 0, true);
                  });
                })()}

                {/* Bottom navigation buttons */}
                <div className="flex gap-3 pt-6 pb-4">
                  {!isFirstBlock ? (
                    <button type="button" onClick={handlePrevTab}
                      className="px-5 py-3 border border-solid border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs text-slate-500 font-semibold cursor-pointer transition-all flex items-center gap-1.5">
                      <ChevronLeft size={14}/> Sebelumnya
                    </button>
                  ) : (
                    <button type="button" onClick={() => setView("prelist")}
                      className="px-5 py-3 border border-solid border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs text-slate-500 font-semibold cursor-pointer transition-all flex items-center gap-1.5">
                      <ArrowLeft size={14}/> Batal
                    </button>
                  )}

                  {isLastBlock ? (
                    <div className="flex-1 flex gap-2">
                      {isPml ? (
                        selectedRtItem?.review_status === "approved" ? (
                          <button type="button" onClick={() => setView("prelist")}
                            className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl border-0 cursor-pointer hover:bg-blue-700 active:scale-[0.98] transition-all">
                            Kembali ke Prelist
                          </button>
                        ) : (
                          <>
                            <button type="button" onClick={handlePmlRejectClick}
                              className="px-6 py-3 border border-solid border-red-200 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs text-rose-700 font-bold cursor-pointer transition-all flex items-center justify-center gap-1">
                              Reject
                            </button>
                            <button type="button" onClick={handlePmlApprove}
                              className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-emerald-600 text-white text-sm font-semibold rounded-xl border-0 cursor-pointer hover:bg-emerald-700 active:scale-[0.98] transition-all">
                              Approve
                            </button>
                          </>
                        )
                      ) : isReadOnly ? (
                        <>
                          {(selectedRtItem?.status === "tersimpan" && selectedRtItem?.review_status !== "approved") && (
                            <button type="button" onClick={handleCancelSave}
                              className="px-4 py-3 border border-solid border-red-200 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs text-rose-700 font-bold cursor-pointer transition-all flex items-center justify-center gap-1">
                              Batal Simpan
                            </button>
                          )}
                          <button type="button" onClick={() => setView("prelist")}
                            className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl border-0 cursor-pointer hover:bg-blue-700 active:scale-[0.98] transition-all">
                            Kembali ke Prelist
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={handleSave}
                          className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl border-0 cursor-pointer hover:bg-blue-700 active:scale-[0.98] transition-all">
                          <Save size={14}/> Simpan Kuesioner
                        </button>
                      )}
                    </div>
                  ) : (
                    <button type="button" onClick={handleNextTab}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl border-0 cursor-pointer hover:bg-blue-700 active:scale-[0.98] transition-all">
                      Selanjutnya <ChevronRight size={14}/>
                    </button>
                  )}
                </div>

              </div>
            </div>
          )}

        </div>
      </div>

      {/* Activity Log Modal */}
      {selectedLogItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden" style={{ animation: "scaleUp 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <style>{`
              @keyframes scaleUp {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
            `}</style>
            <div className="px-6 py-4 bg-slate-50 border-b border-solid border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Log Aktivitas</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{selectedLogItem.krt} ({selectedLogItem.kode})</p>
              </div>
              <button 
                onClick={() => setSelectedLogItem(null)}
                className="w-8 h-8 rounded-lg bg-white border border-solid border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-650 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="px-6 py-6 max-h-[380px] overflow-y-auto space-y-4">
              {selectedLogItem.logs && selectedLogItem.logs.length > 0 ? (
                <div className="relative pl-6 border-l border-solid border-slate-200 space-y-5">
                  {selectedLogItem.logs.map((log, index) => {
                    const parts = log.split(": ");
                    const time = parts[0] || "";
                    const desc = parts.slice(1).join(": ") || "";
                    
                    let circleColor = "bg-slate-300 ring-slate-100";
                    let textColor = "text-slate-650";
                    
                    if (desc.includes("disetujui") || desc.includes("Approved")) {
                      circleColor = "bg-emerald-500 ring-emerald-100";
                      textColor = "text-emerald-800 font-semibold";
                    } else if (desc.includes("Ditolak") || desc.includes("Rejected")) {
                      circleColor = "bg-rose-500 ring-rose-100";
                      textColor = "text-rose-800 font-medium bg-rose-50 p-2.5 rounded-lg border border-solid border-rose-100 mt-1 block leading-relaxed";
                    } else if (desc.includes("kirim") || desc.includes("Terkirim")) {
                      circleColor = "bg-blue-500 ring-blue-100";
                      textColor = "text-blue-800 font-semibold";
                    } else if (desc.includes("simpan") || desc.includes("Tersimpan")) {
                      circleColor = "bg-teal-500 ring-teal-100";
                      textColor = "text-slate-700";
                    }

                    return (
                      <div key={index} className="relative text-xs leading-normal">
                        {/* Dot indicator */}
                        <div className={`absolute -left-[30px] top-0.5 w-3 h-3 rounded-full ring-4 ${circleColor}`} />
                        
                        <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                          <Clock size={10} /> {time}
                        </div>
                        <div className={`mt-0.5 ${textColor}`}>{desc}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">Belum ada log aktivitas untuk {selectedActivity.fokus?.toLowerCase() || 'rumah tangga'} ini.</p>
              )}
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-solid border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedLogItem(null)}
                className="px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl cursor-pointer border-0 shadow-sm transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Note Popup Modal */}
      {rejectionNoteItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden" style={{ animation: "scaleUp 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <div className="px-6 py-4 bg-slate-50 border-b border-solid border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Catatan Rejection</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{rejectionNoteItem.krt} ({rejectionNoteItem.kode})</p>
              </div>
              <button onClick={() => setRejectionNoteItem(null)} className="w-8 h-8 rounded-lg bg-white border border-solid border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-450 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <label className="text-xs text-slate-500 font-bold block">Berikan catatan kesalahan / pesan kesalahan untuk PCL:</label>
              <textarea 
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                placeholder="Contoh: Keterangan Umur tidak sesuai dengan Status Perkawinan..."
                className="w-full h-24 p-3 border border-solid border-slate-200 rounded-xl outline-none focus:border-blue-500 text-xs font-semibold text-slate-800 resize-none"
              />
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-solid border-slate-100 flex justify-end gap-2">
              <button onClick={() => setRejectionNoteItem(null)} className="px-4 py-2 bg-white border border-solid border-slate-200 hover:bg-slate-50 text-slate-655 font-semibold text-xs rounded-xl cursor-pointer">
                Batal
              </button>
              <button 
                onClick={submitRejectionWithConfirmation}
                disabled={!rejectionNote.trim()}
                className={`px-4.5 py-2 font-semibold text-xs rounded-xl cursor-pointer border-0 shadow-sm transition-all ${
                  rejectionNote.trim() ? "bg-red-600 hover:bg-red-700 text-white" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Summary Modal */}
      {showSummaryModal && (() => {
        const { errors, warnings } = getValidationSummary();
        return (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col" style={{ maxHeight: "80vh", animation: "scaleUp 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
              <div className="px-6 py-4 bg-slate-50 border-b border-solid border-slate-100 flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Rangkuman Kualitas Isian</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{selectedRtItem?.krt || "Baru"} ({ans.kode})</p>
                </div>
                <button 
                  onClick={() => setShowSummaryModal(false)}
                  className="w-8 h-8 rounded-lg bg-white border border-solid border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-650 transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 flex-1 scrollbar-thin">
                {/* Total Stats summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-rose-50/50 border border-solid border-rose-100 p-3 rounded-xl text-center">
                    <span className="mono text-lg font-bold text-rose-600">{errors.length}</span>
                    <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Kesalahan (Galat)</span>
                  </div>
                  <div className="bg-amber-50/50 border border-solid border-amber-100 p-3 rounded-xl text-center">
                    <span className="mono text-lg font-bold text-amber-600">{warnings.length}</span>
                    <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Isian Belum Lengkap</span>
                  </div>
                </div>

                {/* Errors list */}
                {errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                      <AlertCircle size={14} /> Kesalahan Validasi Nilai ({errors.length})
                    </h4>
                    <ul className="space-y-1.5 text-[11px] font-semibold text-rose-600 leading-normal pl-4 list-disc bg-rose-50/30 p-3 rounded-xl border border-solid border-rose-100/50">
                      {errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings list */}
                {warnings.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Isian Wajib Kosong ({warnings.length})
                    </h4>
                    <ul className="space-y-1.5 text-[11px] font-semibold text-amber-600 leading-normal pl-4 list-disc bg-amber-50/30 p-3 rounded-xl border border-solid border-amber-100/50">
                      {warnings.map((warn, idx) => (
                        <li key={idx}>{warn}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {errors.length === 0 && warnings.length === 0 && (
                  <div className="py-8 text-center flex flex-col items-center justify-center">
                    <CheckCircle size={32} className="text-emerald-500 mb-2" />
                    <p className="text-xs font-bold text-slate-700">Kuesioner Sempurna!</p>
                    <p className="text-[10px] text-slate-400 mt-1">Semua isian wajib terisi dan memenuhi aturan validasi.</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-solid border-slate-100 flex justify-end flex-shrink-0">
                <button 
                  onClick={() => setShowSummaryModal(false)}
                  className="px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl cursor-pointer border-0 shadow-sm transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Warning Alert Modal */}
      {warningMessage && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden p-6 text-center space-y-4" style={{ animation: "scaleUp 0.15s ease-out both" }}>
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Akses Dibatasi</h4>
              <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">{warningMessage}</p>
            </div>
            <div className="pt-2">
              <button 
                onClick={() => setWarningMessage(null)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl cursor-pointer border-0 shadow-sm"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic Double-Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden" style={{ animation: "scaleUp 0.15s ease-out both" }}>
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{confirmDialog.title}</h4>
                <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">{confirmDialog.message}</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-solid border-slate-100 flex gap-2 justify-end">
              <button 
                onClick={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
                className="px-4 py-2 bg-white border border-solid border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button 
                onClick={confirmDialog.onConfirm}
                className="px-5.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl cursor-pointer border-0 shadow-sm"
              >
                Yakin
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Floating Action Buttons */}
      {view === "form" && selectedActivity && !showSummaryModal && !selectedLogItem && !rejectionNoteItem && !confirmDialog.isOpen && !warningMessage && (
        <FloatingActions 
          onSave={handleIntermediateSave} 
          isReadOnly={isReadOnly} 
        />
      )}
    </PetugasLayout>
  );
}

// -----------------------------------------------------------------------------
// HELPER COMPONENT: Floating Action Buttons (Scroll to Top & Save)
// -----------------------------------------------------------------------------
function FloatingActions({ onSave, isReadOnly }) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed bottom-28 right-6 z-50 flex flex-col gap-3 md:right-[calc(50vw-18rem)]">
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="w-11 h-11 rounded-full bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 flex items-center justify-center shadow-lg border border-solid border-slate-200 cursor-pointer animate-fade-in transition-all active:scale-95"
          title="Kembali ke Atas"
        >
          <ChevronUp size={20} />
        </button>
      )}
      {!isReadOnly && (
        <button
          type="button"
          onClick={onSave}
          className="w-11 h-11 rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all border-0 cursor-pointer"
          title="Simpan Sementara"
        >
          <Save size={18} />
        </button>
      )}
    </div>
  );
}

function renderNoteText(text, computeAggregation) {
  if (!text) return null;
  let resolvedText = text;

  // Handle building number legacy tag
  if (resolvedText.includes("{{no_bangunan_terakhir}}")) {
    const maxVal = computeAggregation("MAX", "R108");
    resolvedText = resolvedText.replace(/\{\{no_bangunan_terakhir\}\}/g, maxVal);
  }

  // Handle generic dynamic tags like {{MAXPCLR101}}, {{MAXALLR101}}, {{MAX_PCL_R101}}
  const tagRegex = /\{\{(MAX|MIN|AVG|SUM|LAST)_?(PCL|ALL)?_?([a-zA-Z0-9.]+)\}\}/gi;
  resolvedText = resolvedText.replace(tagRegex, (match, op, scope, code) => {
    const finalScope = scope || "PCL";
    return computeAggregation(op, finalScope, code);
  });

  const parts = resolvedText.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (/^\*[^*]+\*$/.test(part)) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export default PetugasQuestionnaire;
