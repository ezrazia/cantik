import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Check, AlertTriangle, ChevronRight, ChevronLeft, Plus, CheckCircle, Calendar, FileText, Landmark, ShieldCheck, MessageSquare, XCircle, X, Clock, AlertCircle, Info, RefreshCw, MapPin, Trash2 } from "lucide-react";
import QCard from "../../components/ui/QCard";
import Badge from "../../components/ui/Badge";
import PetugasLayout from "../../components/layouts/PetugasLayout";
import useAutoSave from "../../hooks/useAutoSave";
import { api } from "../../services/api";
import SearchableSelect from "../../components/ui/SearchableSelect";

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

  const { saved, markUnsaved } = useAutoSave(1100);

  const isLoading = loading || loadingForm;

  const getLoopValue = (qId, idx) => {
    const raw = ans.values[qId];
    if (!raw) return "";
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed[idx] || "";
      } else if (typeof parsed === 'object' && parsed !== null) {
        return parsed[idx] || "";
      }
    } catch (e) {}
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
    markUnsaved();
  };

  const getManualLoopCount = (q) => {
    if (!q) return null;
    const { isLoop, loopType } = parseValidation(q.validation);
    if (isLoop && loopType === "manual") {
      const savedCount = ans.values[`${q.id}_loop_count`];
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
    const currentCount = ans.values[`${qId}_loop_count`] ? parseInt(ans.values[`${qId}_loop_count`], 10) : 1;
    const newCount = currentCount + 1;
    const newValues = { ...ans.values, [`${qId}_loop_count`]: newCount };
    setAns(p => ({
      ...p,
      values: newValues
    }));
    markUnsaved();
  };

  const handleRemoveManualLoop = (qId, currentCount) => {
    const newCount = Math.max(1, currentCount - 1);
    const updatedValues = { ...ans.values };
    updatedValues[`${qId}_loop_count`] = newCount;
    
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
    markUnsaved();
  };

  const handleValueChange = (q, val, idx = 0, instancesLength = 1) => {
    let newValues = { ...ans.values };
    let headerUpdates = {};

    if (instancesLength > 1) {
      const raw = ans.values[q.id];
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
      if (lowerLabel.includes("kecamatan")) {
        headerUpdates.kecamatan = val;
      } else if (lowerLabel.includes("desa") || lowerLabel.includes("kelurahan")) {
        headerUpdates.desa = val;
      } else if (lowerLabel.includes("sls") || lowerLabel.includes("rt ")) {
        headerUpdates.sls = val;
      } else if (lowerLabel.includes("alamat") || lowerLabel.includes("jalan")) {
        headerUpdates.alamat = val;
      } else if (lowerLabel.includes("kepala") || lowerLabel.includes("krt") || lowerLabel.includes("nama kepala")) {
        headerUpdates.krt = val;
      } else if (lowerLabel.includes("sub sls") || lowerLabel.includes("sub-sls")) {
        headerUpdates.sub_sls = val;
      } else if (lowerLabel.includes("umur") || lowerLabel.includes("usia")) {
        headerUpdates.umur = val;
      } else if (lowerLabel.includes("jenis kelamin") || lowerLabel.includes("gender")) {
        headerUpdates.gender = val;
      } else if (lowerLabel.includes("perkawinan") || lowerLabel.includes("status nikah")) {
        headerUpdates.perkawinan = val;
      } else if (lowerLabel.includes("bekerja")) {
        headerUpdates.bekerja = val;
      }
    }

    const qVal = parseValidation(q.validation);
    if (qVal.isLookupKey && val && idx === 0) {
      const matchingDoc = localPrelist.find(doc => {
        if (selectedRtItem && doc.id === selectedRtItem.id) return false;
        if (doc.kode === ans.kode) return false;
        if (doc.desa !== (headerUpdates.desa || ans.desa) || doc.sls !== (headerUpdates.sls || ans.sls)) return false;

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

    setAns(p => ({
      ...p,
      ...headerUpdates,
      values: newValues
    }));
    markUnsaved();
  };


  const getQuestionCode = (q, allQuestions, allBlocks) => {
    if (!q) return "";
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
      const qIdx = mainQs.findIndex(s => s.id === q.id) + 1;
      const padded = qIdx.toString().padStart(2, '0');
      return `${blockIdx}${padded}`;
    }
  };

  const parseValidation = (str) => {
    if (!str) return { rangeText: "", hintText: "", description: "", isLoop: false, loopByQuestionId: null, subLabel: "" };
    const trimmed = str.trim();
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
        return {
          rangeText,
          hintText: parsed.hint || "",
          description: parsed.description || parsed.hint || "",
          isLoop: !!parsed.is_loop,
          loopType: parsed.loop_type || "question",
          loopByQuestionId: parsed.loop_by_question_id || null,
          defaultVal: parsed.default_val || null,
          isLookupKey: !!parsed.is_lookup_key,
          copyOnKeyMatch: !!parsed.copy_on_key_match,
          subLabel: parsed.sub_label || ""
        };
      } catch (e) {}
    }
    
    if (trimmed.startsWith('range:')) {
      return {
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
      return {
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
    } else if (trimmed.startsWith('gt:')) {
      return {
        rangeText: `Lebih dari: ${trimmed.replace('gt:', '').trim()}`,
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
    }
    
    return {
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
  };

  const validateNumberRule = (val, rule) => {
    if (!rule || val === undefined || val === null || val === '') return true;
    const numVal = Number(val);
    if (isNaN(numVal)) return false;
    const trimmed = rule.trim();

    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.type === 'range') {
          return numVal >= Number(parsed.min) && numVal <= Number(parsed.max);
        } else if (parsed.type === 'min') {
          return numVal >= Number(parsed.min);
        } else if (parsed.type === 'gt') {
          return numVal > Number(parsed.min);
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

  const findQuestionByCode = (codeStr) => {
    if (!codeStr) return null;
    const normalizedCode = codeStr.toLowerCase().replace(/^r\.?/, "").replace(/\s/g, "");
    return questions.find(q => {
      const qCode = getQuestionCode(q, questions, blocks);
      const normalizedQCode = qCode.toLowerCase().replace(/\s/g, "");
      return normalizedQCode === normalizedCode;
    });
  };

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
    const codeRegex = /R[0-9a-zA-Z.]+/g;
    let evalStr = formulaStr;
    const codes = formulaStr.match(codeRegex) || [];
    
    for (const code of codes) {
      const targetQ = findQuestionByCode(code);
      if (targetQ) {
        const val = currentValues[targetQ.id] || "0";
        const valNum = parseFloat(val);
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

  // Auto-calculate formulas in real-time
  useEffect(() => {
    let updated = false;
    const newValues = { ...ans.values };
    
    questions.forEach(q => {
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
            setBlocks(data.blocks || []);
            setQuestions(mapQuestionsType(data.questions || []));
          } catch (e) {
            console.error("Gagal parse cached form structure:", e);
          }
        }
      } else {
        try {
          const res = await api.form.getStructure(selectedActivity.id);
          if (res.success && isMounted) {
            setBlocks(res.blocks || []);
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
              setBlocks(data.blocks || []);
              setQuestions(mapQuestionsType(data.questions || []));
            } catch (err) {
              console.error(err);
            }
          }
        }
      }
      setLoadingForm(false);
    };

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
      } else {
        try {
          const docs = await fetchDocuments();
          if (isMounted) {
            setLocalPrelist(docs.filter(d => d.kegiatan_id === selectedActivity.id));
            localStorage.setItem(`offline_docs_${currentUser.id}`, JSON.stringify(docs));
          }
        } catch (e) {
          console.error("Gagal fetch prelist:", e);
          const cached = localStorage.getItem(`offline_docs_${currentUser.id}`);
          if (cached && isMounted) {
            try {
              const list = JSON.parse(cached);
              setLocalPrelist(list.filter(d => d.kegiatan_id === selectedActivity.id));
            } catch (err) {
              console.error(err);
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

  const isReadOnly = 
    isPml ||
    selectedRtItem?.review_status === "approved" || 
    ((selectedRtItem?.status === "tersimpan" || selectedRtItem?.status === "terkirim") && selectedRtItem?.review_status !== "rejected");

  // Evaluate if a question is visible based on skip logics and parent rules
  const isQuestionVisible = (q) => {
    // Show If Logic evaluation
    const showIfParentId = q.show_if_parent_id || q.showIfParentId;
    const showIfValue = q.show_if_value || q.showIfValue;
    if (showIfParentId) {
      const parentVal = ans.values[showIfParentId];
      if (parentVal === undefined || parentVal === null || parentVal === '') {
        return false;
      }
      
      const triggerOptions = String(showIfValue).split(",").map(x => x.trim()).filter(Boolean);
      let matchesTrigger = false;
      if (typeof parentVal === 'string' && parentVal.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(parentVal);
          matchesTrigger = triggerOptions.some(opt => String(parsed[opt]) === "1");
        } catch (e) {}
      } else {
        matchesTrigger = triggerOptions.includes(String(parentVal));
      }
      
      if (!matchesTrigger) {
        return false;
      }
    }

    if (q.parent_id) {
      const parent = questions.find(p => p.id === q.parent_id);
      if (parent && parent.label && parent.label.trim() !== "") {
        const parentVal = ans.values[q.parent_id];
        if (parentVal === undefined || parentVal === null || parentVal === '') return false;
      }
    }

    // Find all questions that have skip logic targets
    const skippers = questions.filter(quest => quest.skip_target && quest.skip_logic !== undefined && quest.skip_logic !== null);
    
    for (const skipper of skippers) {
      const skipperVal = ans.values[skipper.id];
      const hasValue = skipperVal !== undefined && skipperVal !== null && skipperVal !== '';

      // Check if the answered value matches the trigger condition
      // Supporting single choice and multi-choice (JSON string)
      let matchesTrigger = false;
      if (hasValue) {
        const triggerOptions = String(skipper.skip_logic).split(",").map(x => x.trim()).filter(Boolean);
        if (typeof skipperVal === 'string' && skipperVal.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(skipperVal);
            matchesTrigger = triggerOptions.some(opt => String(parsed[opt]) === "1");
          } catch (e) {}
        } else {
          matchesTrigger = triggerOptions.includes(String(skipperVal));
        }
      }

      if (true) {
        // Find ordered list of all questions in all blocks
        const allOrdered = [];
        blocks.forEach(b => {
          const blockQs = questions.filter(x => x.blok_id === b.id);
          const mainQs = blockQs.filter(x => !x.parent_id);
          mainQs.forEach(parent => {
            allOrdered.push(parent);
            const children = blockQs.filter(x => x.parent_id === parent.id);
            allOrdered.push(...children);
          });
        });

        const skipperIdx = allOrdered.findIndex(x => x.id === skipper.id);
        const targetIdx = allOrdered.findIndex(x => x.id === skipper.skip_target);
        const currentIdx = allOrdered.findIndex(x => x.id === q.id);

        if (skipperIdx !== -1 && targetIdx !== -1 && currentIdx !== -1) {
          // If target is the immediate next question after skipper, it acts as a conditional show
          if (targetIdx === skipperIdx + 1 && q.id === skipper.skip_target) {
            if (!matchesTrigger) {
              return false;
            }
          }

          // If q is in between skipper and skipTarget, hide/skip it when trigger matches
          if (hasValue && matchesTrigger && currentIdx > skipperIdx && currentIdx < targetIdx) {
            return false;
          }
        }
      }
    }

    return true;
  };

  // Status mapping for visual tabs
  const validateBlock = (blockKode) => {
    const block = blocks.find(b => b.kode === blockKode);
    if (!block) return 'empty';
    
    const blockQuestions = questions.filter(q => q.blok_id === block.id);
    let hasEmptyRequired = false;
    let hasValidationError = false;
    let hasFilledAny = false;
    
    for (const q of blockQuestions) {
      if (!isQuestionVisible(q)) continue;
      
      const val = ans.values[q.id];
      if (val !== undefined && val !== null && val !== '') {
        hasFilledAny = true;
        // Range/Min/Max validation if applicable
        if (q.type === 'number' && q.validation) {
          if (!validateNumberRule(val, q.validation)) {
            hasValidationError = true;
          }
        }
      } else if (q.required) {
        hasEmptyRequired = true;
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

      const val = ans.values[q.id];
      const block = blocks.find(b => b.id === q.blok_id);
      const blockName = block ? block.kode : "Form";

      if (val !== undefined && val !== null && val !== '') {
        if (q.type === 'number' && q.validation) {
          const numVal = Number(val);
          if (isNaN(numVal)) {
            errors.push(`[${blockName}] Isian ${q.label} harus berupa angka.`);
          } else {
            let ruleValid = true;
            const rule = q.validation.trim();
            if (rule.startsWith('{')) {
              try {
                const parsed = JSON.parse(rule);
                if (parsed.type === 'range') ruleValid = numVal >= Number(parsed.min) && numVal <= Number(parsed.max);
                else if (parsed.type === 'min') ruleValid = numVal >= Number(parsed.min);
                else if (parsed.type === 'gt') ruleValid = numVal > Number(parsed.min);
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
              errors.push(`[${blockName}] Nilai ${q.label} diluar rentang yang diizinkan.`);
            }
          }
        }
      } else if (q.required) {
        warnings.push(`[${blockName}] Isian wajib ${q.label} masih kosong.`);
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
    if (isOffline) {
      const cached = localStorage.getItem(`offline_docs_${currentUser.id}`);
      if (cached) {
        try {
          const list = JSON.parse(cached);
          docDetail = list.find(d => d.kode === item.kode);
        } catch (e) {
          console.error(e);
        }
      }
    } else {
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

    const finalDoc = docDetail || item;

    setAns({
      kode: finalDoc.kode || "",
      krt: finalDoc.krt || "",
      alamat: finalDoc.alamat || "",
      kecamatan: finalDoc.kecamatan || "",
      desa: finalDoc.desa || "",
      sls: finalDoc.sls || "",
      sub_sls: finalDoc.sub_sls || "",
      is_prelist: !!finalDoc.is_prelist,
      values: finalDoc.values || {}
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
    questions.forEach(q => {
      const { defaultVal } = parseValidation(q.validation);
      if (defaultVal !== null) {
        initialValues[q.id] = defaultVal;
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

    const idx = cachedList.findIndex(d => {
      if (selectedRtItem) {
        if (selectedRtItem.id && d.id === selectedRtItem.id) return true;
        return d.kode === selectedRtItem.kode;
      }
      return d.kode === ans.kode;
    });
    if (idx > -1) {
      cachedList[idx] = localDoc;
    } else {
      cachedList.push(localDoc);
    }

    localStorage.setItem(`offline_docs_${currentUser.id}`, JSON.stringify(cachedList));
    setLocalPrelist(cachedList.filter(d => d.kegiatan_id === selectedActivity.id));
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
      localStorage.setItem(`offline_docs_${currentUser.id}`, JSON.stringify(cachedList));
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
          localStorage.setItem(`offline_docs_${currentUser.id}`, JSON.stringify(docs));
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

    localStorage.setItem(`offline_docs_${currentUser.id}`, JSON.stringify(updatedList));
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

    const idx = cachedList.findIndex(d => {
      if (selectedRtItem) {
        if (selectedRtItem.id && d.id === selectedRtItem.id) return true;
        return d.kode === selectedRtItem.kode;
      }
      return d.kode === ans.kode;
    });
    if (idx > -1) {
      cachedList[idx] = localDoc;
    } else {
      cachedList.push(localDoc);
    }

    localStorage.setItem(`offline_docs_${currentUser.id}`, JSON.stringify(cachedList));
    setLocalPrelist(cachedList.filter(d => d.kegiatan_id === selectedActivity.id));
    setSelectedRtItem(localDoc);
    alert("Progres berhasil disimpan sementara.");
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
        localStorage.setItem(`offline_docs_${currentUser.id}`, JSON.stringify(docs));
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
        localStorage.setItem(`offline_docs_${currentUser.id}`, JSON.stringify(docs));
        setLocalPrelist(docs.filter(d => d.kegiatan_id === selectedActivity.id));
        setView("prelist");
      }
    } catch (e) {
      console.error(e);
      alert("Gagal mereview dokumen secara online.");
    }
  };

  const getActiveIndex = (tabKode) => {
    return blocks.findIndex(b => b.kode === tabKode);
  };

  const handlePrevTab = () => {
    const idx = getActiveIndex(activeTab);
    if (idx > 0) {
      setActiveTab(blocks[idx - 1].kode);
    }
  };

  const handleNextTab = () => {
    const idx = getActiveIndex(activeTab);
    if (idx < blocks.length - 1) {
      setActiveTab(blocks[idx + 1].kode);
    }
  };

  const activeBlockIndex = getActiveIndex(activeTab);
  const isFirstBlock = activeBlockIndex === 0;
  const isLastBlock = activeBlockIndex === blocks.length - 1;

  // Filter questions for the active block
  const activeBlock = blocks.find(b => b.kode === activeTab);
  const activeQuestions = activeBlock ? questions.filter(q => q.blok_id === activeBlock.id) : [];

  if (isLoading) {
    return (
      <PetugasLayout activeTab="questionnaire" onNavigate={onNavigate}>
        <div className="min-h-screen bg-white animate-pulse pb-24">
          <div className="max-w-3xl mx-auto">
            {/* Header Skeleton */}
            <div className="px-6 pt-12 pb-6 border-b border-solid border-slate-100 flex items-center justify-between">
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
    <PetugasLayout activeTab="questionnaire" onNavigate={onNavigate}>
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

      <div className="min-h-screen bg-white slide-up pb-24">
        <div className="max-w-3xl mx-auto">
          
          {/* VIEW 1: SELECT ACTIVITY */}
          {view === "select_activity" && (
            <div className="flex-1 bg-white view-transition">
              <div className="px-6 pt-12 pb-6 border-b border-solid border-slate-100">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pengisian Kuesioner</p>
                <h2 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">Pilih Kegiatan</h2>
                <p className="text-xs text-slate-400 mt-1.5 font-medium leading-relaxed">Pilih salah satu kegiatan aktif untuk mulai mengelola kuesioner.</p>
              </div>
              <div className="p-6 space-y-3">
                {officerActivities.map(act => (
                  <button key={act.name} onClick={() => handleSelectActivity(act)}
                    className="w-full bg-white rounded-2xl p-5 border border-solid border-slate-100 flex flex-col gap-4 text-left cursor-pointer transition-all hover:border-blue-300 hover:shadow-md group relative overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${act.color || 'bg-blue-600'}`} />
                    <div className="flex items-start justify-between w-full">
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors truncate">{act.name}</h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{act.description}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${act.role === 'PML' ? 'bg-purple-50 text-purple-700 border border-solid border-purple-100/50' : 'bg-blue-50 text-blue-700 border border-solid border-blue-100/50'}`}>
                          {act.role === 'PML' ? 'Pengawas (PML)' : 'Pencacah (PCL)'}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
                {officerActivities.length === 0 && (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl py-12 text-center">
                    <p className="text-xs text-slate-400 font-semibold">Belum ditugaskan ke kegiatan survei apapun.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 2: PRELIST */}
          {view === "prelist" && selectedActivity && (
            <div className="flex-1 bg-white view-transition">
              <div className="px-6 pt-12 pb-6 border-b border-solid border-slate-100 flex items-center gap-3">
                <button onClick={() => setView("select_activity")}
                  className="w-9 h-9 bg-slate-50 hover:bg-slate-100 border border-solid border-slate-100 cursor-pointer rounded-lg flex items-center justify-center text-slate-400 transition-all flex-shrink-0">
                  <ArrowLeft size={16} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-slate-400 font-medium truncate">Kegiatan: {selectedActivity.name}</p>
                  <h2 className="text-base font-bold text-slate-900 truncate">Daftar Prelist {selectedActivity.fokus === 'Rumah Tangga' ? 'RT' : (selectedActivity.fokus || 'RT')}</h2>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-400 font-semibold">{localPrelist.length} {selectedActivity.fokus || 'Rumah Tangga'}</span>
                  {!isPml && (
                    <button onClick={handleAddNew}
                      disabled={loadingForm || blocks.length === 0}
                      className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold border-0 cursor-pointer hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      <Plus size={14} /> Tambah Baru
                    </button>
                  )}
                </div>

                {loadingForm ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <RefreshCw className="animate-spin mb-2" size={24} />
                    <p className="text-xs font-semibold">Memuat formulir...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {localPrelist.map((item, i) => (
                      <div key={item.kode} onClick={() => handleEditItem(item)}
                        className="w-full bg-white rounded-xl p-4 border border-solid border-slate-100 flex items-center gap-4 text-left cursor-pointer transition-all hover:border-blue-200 hover:shadow-sm group">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                          item.status === "terkirim" ? "bg-blue-50 text-blue-600" :
                          item.status === "tersimpan" ? "bg-emerald-50 text-emerald-600" :
                          "bg-slate-50 text-slate-400"
                        }`}>{i + 1}</div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                            {item.krt || "Tanpa Nama"} - <span className="text-slate-400 font-mono text-xs">{item.kode}</span>
                          </p>
                          
                          {/* Badges and actions placed below info to avoid layout overflow on mobile */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                            {/* PCL completion status badge */}
                            {!isPml && (
                              <Badge status={item.review_status === "rejected" ? "rejected" : item.status}/>
                            )}
                            
                            {/* PML review status badge */}
                            {isPml && (
                              item.review_status === "approved" ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                  Approved
                                </span>
                              ) : item.review_status === "rejected" ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-rose-500" />
                                  Rejected
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-50 text-slate-650 flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-slate-400" />
                                  Draft
                                </span>
                              )
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLogItem(item);
                              }}
                              className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-solid border-slate-200/60 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all cursor-pointer"
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
                                className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 border border-solid border-rose-200/60 flex items-center justify-center text-rose-500 hover:text-rose-700 transition-all cursor-pointer"
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
                      <div className="bg-slate-50 rounded-xl py-12 text-center border border-dashed border-slate-200">
                        <p className="text-xs text-slate-550 font-semibold">Prelist {selectedActivity.fokus === 'Rumah Tangga' ? 'RT' : (selectedActivity.fokus || 'RT')} Kosong</p>
                        <p className="text-[10px] text-slate-400 mt-1">Klik Tambah Baru untuk mengisi kuesioner baru</p>
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
                    <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all ${
                      saved ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"
                    }`}>
                      <Save size={12}/> {saved ? "Tersimpan" : "Menyimpan..."}
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
                {blocks.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex gap-1.5">
                      {blocks.map((b, i) => {
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
                      <span>Langkah {activeBlockIndex + 1} dari {blocks.length}</span>
                      <span className="text-blue-600 font-semibold">{activeTab} ({activeBlock?.title})</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Block Tab Header Toggles */}
              <div className="flex gap-2 px-6 py-4 overflow-x-auto bg-white border-b border-solid border-slate-50">
                {blocks.map((b) => {
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
                        markUnsaved();
                      }}
                      placeholder={`Contoh: ${selectedActivity.fokus === 'Rumah Tangga' ? 'RT' : (selectedActivity.fokus || 'RT')}-001`} 
                      disabled={isReadOnly || (selectedRtItem && selectedRtItem.status !== 'draft')}
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

                  const renderInputs = (q, instances) => {
                    const isTextType = q.type === 'text';
                    const isNumberType = q.type === 'number';
                    const isTextAreaType = q.type === 'textarea';
                    const isChoiceType = q.type === 'select' || q.type === 'radio';
                    const isLocationType = q.type === 'location';
                    const isDateType = q.type === 'date';
                    const isPclType = q.type === 'pcl';
                    const isPmlType = q.type === 'pml';
                    const isSearchType = q.type === 'search';

                    return (
                      <>
                        {/* Searchable Dropdown */}
                        {isSearchType && (
                          <div className="space-y-3">
                            {instances.map((idx) => (
                              <div key={idx} className="space-y-1">
                                {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400">Isian Ke-{idx + 1}</label>}
                                <SearchableSelect
                                  value={instances.length > 1 ? getLoopValue(q.id, idx) : (ans.values[q.id] || "")}
                                  options={q.options || []}
                                  disabled={isReadOnly}
                                  placeholder="Cari dan pilih opsi..."
                                  onChange={(val) => {
                                    handleValueChange(q, val, idx, instances.length);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        {/* PCL INPUTS (Dropdown) */}
                        {isPclType && (
                          <div className="space-y-3">
                            {instances.map((idx) => (
                              <div key={idx} className="space-y-1">
                                {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400">Isian Ke-{idx + 1}</label>}
                                <select 
                                  value={instances.length > 1 ? getLoopValue(q.id, idx) : (ans.values[q.id] || "")}
                                  disabled={isReadOnly}
                                  onChange={(e) => {
                                    handleValueChange(q, e.target.value, idx, instances.length);
                                  }}
                                  className="w-full px-4 py-3 text-sm bg-white border border-solid border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  <option value="">-- Pilih PCL --</option>
                                  {pclList.map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                  ))}
                                  {pclList.length === 0 && (petugas || []).map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* PML INPUTS (Dropdown) */}
                        {isPmlType && (
                          <div className="space-y-3">
                            {instances.map((idx) => (
                              <div key={idx} className="space-y-1">
                                {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400">Isian Ke-{idx + 1}</label>}
                                <select 
                                  value={instances.length > 1 ? getLoopValue(q.id, idx) : (ans.values[q.id] || "")}
                                  disabled={isReadOnly}
                                  onChange={(e) => {
                                    handleValueChange(q, e.target.value, idx, instances.length);
                                  }}
                                  className="w-full px-4 py-3 text-sm bg-white border border-solid border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  <option value="">-- Pilih PML --</option>
                                  {pmlList.map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                  ))}
                                  {pmlList.length === 0 && (petugas || []).map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 1. TEXT INPUTS */}
                        {isTextType && (
                          <div className="space-y-3">
                            {instances.map((idx) => (
                              <div key={idx} className="space-y-1">
                                {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400">Isian Ke-{idx + 1}</label>}
                                <input 
                                  type="text"
                                  value={instances.length > 1 ? getLoopValue(q.id, idx) : (ans.values[q.id] || "")}
                                  placeholder={`Isi ${q.label}${instances.length > 1 ? ` ke-${idx + 1}` : ""}`}
                                  disabled={isReadOnly}
                                  onChange={(e) => {
                                    handleValueChange(q, e.target.value.toUpperCase(), idx, instances.length);
                                  }}
                                  className="w-full px-4 py-3 text-sm bg-white border border-solid border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                                />
                              </div>
                            ))}
                          </div>
                        )}
 
                        {/* 2. NUMBER INPUTS */}
                        {isNumberType && (() => {
                          const qVal = parseValidation(q.validation);
                          const isFormula = !!qVal.formula;
                          return (
                            <div className="space-y-3">
                              {instances.map((idx) => (
                                <div key={idx} className="space-y-1">
                                  {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400">Isian Ke-{idx + 1}</label>}
                                  <div className="flex items-center gap-3">
                                    <input 
                                      type="number"
                                      step="any"
                                      value={instances.length > 1 ? getLoopValue(q.id, idx) : (ans.values[q.id] || "")}
                                      placeholder={isFormula ? "Kalkulasi otomatis..." : "Contoh: 12"}
                                      disabled={isReadOnly || isFormula}
                                      onChange={(e) => {
                                        handleValueChange(q, e.target.value, idx, instances.length);
                                      }}
                                      className="w-32 px-4 py-3 text-sm bg-white border border-solid border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                                    />
                                    <span className="text-xs text-slate-400 font-medium">
                                      {isFormula ? `Kalkulasi Otomatis (Formula: ${qVal.formula})` : "Satuan Angka"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
 
                        {/* 3. TEXTAREA INPUTS */}
                        {isTextAreaType && (
                          <div className="space-y-3">
                            {instances.map((idx) => (
                              <div key={idx} className="space-y-1">
                                {instances.length > 1 && <label className="text-[10px] font-bold text-slate-400">Isian Ke-{idx + 1}</label>}
                                <textarea
                                  value={instances.length > 1 ? getLoopValue(q.id, idx) : (ans.values[q.id] || "")}
                                  placeholder={`Masukkan detail ${q.label}`}
                                  disabled={isReadOnly}
                                  onChange={(e) => {
                                    handleValueChange(q, e.target.value, idx, instances.length);
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
                                <div className="grid grid-cols-2 gap-2">
                                  {(q.options || []).map((opt) => {
                                    let isSelected = false;
                                    if (q.type === 'select') {
                                      // Multi-select: parse JSON string if exists
                                      let selectedMap = {};
                                      try {
                                        const val = instances.length > 1 ? getLoopValue(q.id, idx) : ans.values[q.id];
                                        selectedMap = JSON.parse(val || "{}");
                                      } catch (e) {}
                                      isSelected = !!selectedMap[opt.value];
                                    } else {
                                      // Radio: single select
                                      const val = instances.length > 1 ? getLoopValue(q.id, idx) : ans.values[q.id];
                                      isSelected = String(val) === String(opt.value);
                                    }

                                    return (
                                      <button 
                                        key={opt.value} 
                                        type="button" 
                                        onClick={() => {
                                          if (isReadOnly) return;
                                          if (q.type === 'select') {
                                            let selectedMap = {};
                                            try {
                                              const val = instances.length > 1 ? getLoopValue(q.id, idx) : ans.values[q.id];
                                              selectedMap = JSON.parse(val || "{}");
                                            } catch (e) {}
                                            selectedMap[opt.value] = selectedMap[opt.value] ? 0 : 1;
                                            const valStr = JSON.stringify(selectedMap);
                                            handleValueChange(q, valStr, idx, instances.length);
                                          } else {
                                            const val = opt.value;
                                            handleValueChange(q, val, idx, instances.length);
                                          }
                                        }}
                                        disabled={isReadOnly}
                                        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border border-solid text-xs font-medium transition-all text-left ${
                                          isSelected 
                                            ? "border-blue-500 bg-blue-50 text-blue-700 font-bold" 
                                            : "border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50/50"
                                        } ${isReadOnly ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
                                      >
                                        <div className={`w-4 h-4 flex-shrink-0 flex items-center justify-center transition-all ${
                                          q.type === 'select'
                                            ? `rounded border-2 ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-200'}`
                                            : `rounded-full border-2 ${isSelected ? 'border-blue-600' : 'border-slate-200'}`
                                        }`}>
                                          {isSelected && (
                                            q.type === 'select'
                                              ? <Check size={10} className="text-white stroke-[3px]" />
                                              : <div className="w-2 h-2 rounded-full bg-blue-600"/>
                                          )}
                                        </div>
                                        {opt.value}. {opt.label}
                                      </button>
                                    );
                                  })}
                                </div>
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
                                      value={instances.length > 1 ? getLoopValue(q.id, idx) : (ans.values[q.id] || "")}
                                      placeholder="Latitude, Longitude (Klik 'Ambil Lokasi')"
                                      readOnly
                                      disabled={isReadOnly}
                                      className="flex-1 px-4 py-3 text-sm bg-slate-50 border border-solid border-slate-200 rounded-xl outline-none transition-all font-medium text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                                    />
                                    <button
                                      type="button"
                                      disabled={isReadOnly}
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
                                  {((instances.length > 1 ? getLoopValue(q.id, idx) : ans.values[q.id]) || "") && (
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
                                      value={instances.length > 1 ? getLoopValue(q.id, idx) : (ans.values[q.id] || "")}
                                      disabled={isReadOnly}
                                      onChange={(e) => {
                                        handleValueChange(q, e.target.value, idx, instances.length);
                                      }}
                                      className="flex-1 px-4 py-3 text-sm bg-white border border-solid border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                                    />
                                    {isAutoNow && !isReadOnly && (
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

                  const renderQuestionRow = (q, depth = 0, forceCard = false) => {
                    if (!isQuestionVisible(q)) return null;

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
                        <div key={q.id} className="bg-amber-50/60 border border-solid border-amber-100 rounded-2xl p-5">
                          <p className="text-sm font-semibold text-amber-900 leading-relaxed break-words">
                            {renderNoteText(labelText, computeAggregation)}
                          </p>
                        </div>
                      );
                    }

                    const childQs = questions.filter(c => c.parent_id === q.id || c.parentId === q.id);
                    const hasChildren = childQs.length > 0;

                    const { rangeText, hintText, description, isLoop, loopType, loopByQuestionId, subLabel } = parseValidation(q.validation);

                    let loopCount = 1;
                    const manualCount = getManualLoopCount(q);
                    if (manualCount !== null) {
                      loopCount = manualCount;
                    } else if (isLoop && loopByQuestionId) {
                      const triggerValue = ans.values[loopByQuestionId];
                      const parsedTrigger = parseInt(triggerValue, 10);
                      loopCount = isNaN(parsedTrigger) ? 0 : parsedTrigger;
                      if (loopCount <= 0) return null;
                    }
                    const instances = Array.from({ length: loopCount }, (_, idx) => idx);

                    const qCode = getQuestionCode(q, questions, blocks);

                    if (depth === 0 || forceCard) {
                      return (
                        <QCard 
                          key={q.id} 
                          r={qCode} 
                          label={q.label} 
                          subLabel={subLabel}
                          required={!!q.required} 
                          description={description}
                        >
                          {hasChildren ? (
                            <div className="mt-3 pl-3 border-l-2 border-solid border-slate-100 space-y-4">
                              {childQs.sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0)).map(child => renderQuestionRow(child, depth + 1))}
                            </div>
                          ) : (
                            renderInputs(q, instances)
                          )}

                          {isLoop && loopType === "manual" && (
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
                              <p className="text-xs font-bold text-slate-700 mt-1">{q.label}</p>
                              {subLabel && <p className="text-[11px] text-slate-500 font-medium mt-0.5">{subLabel}</p>}
                            </div>
                          </div>
                          <div className="pl-4 mt-2">
                            {hasChildren ? (
                              <div className="border-l border-solid border-slate-200 pl-3 space-y-3">
                                {childQs.sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0)).map(child => renderQuestionRow(child, depth + 1))}
                              </div>
                            ) : (
                              renderInputs(q, instances)
                            )}

                            {isLoop && loopType === "manual" && (
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

                  const topLevelQs = activeQuestions.filter(q => !q.parent_id && !q.parentId);
                  return topLevelQs.flatMap(q => {
                    const childQs = questions.filter(c => c.parent_id === q.id || c.parentId === q.id);
                    const hasChildren = childQs.length > 0;
                    
                    if (hasChildren && (!q.label || q.label.trim() === "")) {
                      return childQs.sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0)).map(child => renderQuestionRow(child, 0, true));
                    }
                    return [renderQuestionRow(q)];
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
      
      {/* Floating Save button (only in form view, not read-only, positioned above bottom menu, small size) */}
      {view === "form" && selectedActivity && !isReadOnly && (
        <div className="fixed bottom-24 right-6 z-50 md:right-[calc(50vw-18rem)]">
          <button
            type="button"
            onClick={handleIntermediateSave}
            className="w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all border-0 cursor-pointer"
            title="Simpan Sementara"
          >
            <Save size={18} />
          </button>
        </div>
      )}
    </PetugasLayout>
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