import { useState, useEffect } from 'react';
import { Upload, Download, CheckCircle, Clock, AlertCircle, RefreshCcw, AlertTriangle } from "lucide-react";
import PetugasLayout from "../../components/layouts/PetugasLayout";
import { api } from "../../services/api";
import { offlineDB } from "../../services/offlineStorage";
import { useNotification } from "../../components/ui/NotificationContext";

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
    if (typeof val === 'string' && (val.trim().startsWith('{') || val.trim().startsWith('['))) {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) {
          actualVal = parsed[0];
        } else if (parsed && 'value' in parsed) {
          actualVal = parsed.value;
        }
      } catch (e) { }
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
 * Halaman sinkronisasi Petugas — minimalis & interactive.
 *
 * @param {Object} props
 * @param {(screen: string) => void} props.onNavigate
 * @param {Object} props.currentUser
 * @param {boolean} props.isOffline
 * @returns {React.ReactElement}
 */
function PetugasSync({ onNavigate, currentUser, isOffline, loading, activities, petugas }) {
  const { showToast, showAlert, showConfirm } = useNotification();
  const [localRtList, setLocalRtList] = useState([]);
  const [syncingAll, setSyncingAll] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);

  const currentPetugas = petugas?.find(p => p.id === currentUser.id) || currentUser;

  const saveSingleDocLocally = async (updatedDoc) => {
    const storageKey = `offline_docs_${currentUser.id}`;
    let cachedList = [];
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) cachedList = JSON.parse(cached);
    } catch (e) {
      cachedList = [];
    }
    
    const idx = cachedList.findIndex(d => {
      if (updatedDoc.id && d.id === updatedDoc.id) return true;
      return d.kode === updatedDoc.kode;
    });
    
    if (idx > -1) {
      cachedList[idx] = updatedDoc;
    } else {
      cachedList.push(updatedDoc);
    }
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(cachedList));
    } catch (e) {
      console.warn("localStorage penuh saat update single doc:", e);
    }
    
    if (offlineDB.isAvailable()) {
      try {
        await offlineDB.saveDokumen({
          ...updatedDoc,
          sync_status: updatedDoc.sync_status || (updatedDoc.sync !== false ? 'synced' : 'pending')
        });
      } catch (err) {
        console.warn("Gagal simpan ke IndexedDB:", err);
      }
    }
    
    setLocalRtList(cachedList);
  };

  const autoFillAndEvaluateFormulas = (item, questions, blocks) => {
    let values = {};
    if (item.values) {
      try {
        values = typeof item.values === 'string' ? JSON.parse(item.values) : item.values;
      } catch (e) {
        values = {};
      }
    }
    if (!values) values = {};
    
    let isChanged = false;
    const updatedValues = { ...values };

    const parseValidation = (str) => {
      if (!str) return {};
      const trimmed = str.trim();
      if (trimmed.startsWith('{')) {
        try {
          return JSON.parse(trimmed);
        } catch (e) {}
      }
      return {};
    };

    const getManualLoopCount = (q) => {
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
        const groupQs = questions.filter(x => {
          if (x.blok_id !== q.blok_id) return false;
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

      const qVal = parseValidation(q.validation);
      if (qVal.is_loop && qVal.loop_type === "manual") {
        const savedCount = updatedValues[`${q.id}_loop_count`];
        if (savedCount !== undefined && savedCount !== null && savedCount !== '') {
          return parseInt(savedCount, 10);
        }
        return 1;
      }
      if (q.parent_id) {
        const parent = questions.find(x => x.id === q.parent_id);
        if (parent) {
          return getManualLoopCount(parent);
        }
      }
      return null;
    };

    const getQuestionLoopGroup = (q) => {
      if (!q) return "";
      if (q.validation) {
        try {
          const parsed = JSON.parse(q.validation);
          if (parsed && parsed.loop_group) {
            return parsed.loop_group;
          }
        } catch (e) {}
      }
      const parentId = q.parent_id || q.parentId;
      if (parentId) {
        const parent = questions.find(p => p.id === parentId);
        if (parent) {
          return getQuestionLoopGroup(parent);
        }
      }
      return "";
    };

    const getQuestionLoopCount = (q) => {
      if (!q) return 1;

      const loopGroupName = getQuestionLoopGroup(q);
      const qVal = parseValidation(q.validation);
      const isLoopQ = qVal.is_loop || !!loopGroupName;

      if (!isLoopQ) {
        const parentId = q.parent_id || q.parentId;
        if (parentId) {
          const parent = questions.find(p => p.id === parentId);
          if (parent) {
            return getQuestionLoopCount(parent);
          }
        }
      }

      if (loopGroupName) {
        const groupQs = questions.filter(x => x.blok_id === q.blok_id && getQuestionLoopGroup(x) === loopGroupName);
        const masterQ = groupQs.find(x => {
          if (!x.validation) return false;
          try {
            const parsed = JSON.parse(x.validation);
            return parsed && parsed.is_loop;
          } catch (e) {
            return false;
          }
        }) || groupQs[0];

        if (masterQ && masterQ.id !== q.id) {
          return getQuestionLoopCount(masterQ);
        }
      }

      if (qVal.is_loop) {
        if (qVal.loop_by_question_id) {
          let triggerValue = updatedValues[qVal.loop_by_question_id];
          if (typeof triggerValue === 'string' && triggerValue.trim().startsWith('[')) {
            try {
              const arr = JSON.parse(triggerValue);
              if (Array.isArray(arr)) triggerValue = arr[0];
            } catch(e) {}
          }
          const parsedTrigger = parseInt(triggerValue, 10);
          if (!isNaN(parsedTrigger) && parsedTrigger > 0) {
            return Math.max(0, parsedTrigger);
          }
          // Fallback for prelist array mapping
          try {
            const val = updatedValues[q.id];
            if (typeof val === 'string' && val.startsWith('[')) {
              const arr = JSON.parse(val);
              if (Array.isArray(arr) && arr.length > 0) return arr.length;
            }
          } catch (e) { }
          return 0;
        }
        if (qVal.loop_type === "manual") {
          const manualCount = getManualLoopCount(q);
          return manualCount !== null ? manualCount : 1;
        }
      }

      return 1;
    };

    const getLoopValueFromValues = (qId, idx) => {
      const raw = updatedValues[qId];
      if (!raw) return "";
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed[idx] !== undefined && parsed[idx] !== null ? String(parsed[idx]) : "";
        } else if (typeof parsed === 'object' && parsed !== null) {
          return parsed[idx] !== undefined && parsed[idx] !== null ? String(parsed[idx]) : "";
        }
      } catch (e) {}
      return idx === 0 ? String(raw) : "";
    };

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

    const questionCodesMap = new Map();
    const getCode = (q) => {
      const cacheKey = String(q.id);
      if (questionCodesMap.has(cacheKey)) return questionCodesMap.get(cacheKey);

      const block = blocks.find(b => b.id === q.blok_id || b.kode === q.blok_id);
      let blockIdx = 0;
      if (block) {
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
        questionCodesMap.set(cacheKey, "");
        return "";
      }
      
      const parentId = q.parent_id || q.parentId;
      if (parentId) {
        const parent = questions.find(p => p.id === parentId);
        if (!parent) {
          questionCodesMap.set(cacheKey, "");
          return "";
        }
        const parentCode = getCode(parent);
        
        const siblings = questions.filter(s => s.blok_id === q.blok_id && (s.parent_id === parentId || s.parentId === parentId)).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const sibIdx = siblings.findIndex(s => s.id === q.id);
        
        if (parent.parent_id || parent.parentId) {
          const romanNumerals = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
          const suffix = romanNumerals[sibIdx] || (sibIdx + 1).toString();
          const code = `${parentCode}.${suffix}`;
          questionCodesMap.set(cacheKey, code);
          return code;
        } else {
          const letter = String.fromCharCode(97 + (sibIdx >= 0 ? sibIdx : 0));
          const code = `${parentCode}${letter}`;
          questionCodesMap.set(cacheKey, code);
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
        questionCodesMap.set(cacheKey, code);
        return code;
      }
    };

    questions.forEach(q => {
      getCode(q);
    });

    const getQuestionCode = (q) => {
      if (!q) return "";
      return questionCodesMap.get(String(q.id)) || "";
    };

    const questionMapByCode = new Map();
    questions.forEach(q => {
      const qCode = getQuestionCode(q);
      if (qCode) {
        const normalized = qCode.toLowerCase().replace(/^r\.?/, "").replace(/\s/g, "");
        questionMapByCode.set(normalized, q);
      }
    });

    const findQuestionByCode = (codeStr) => {
      if (!codeStr) return null;
      const normalizedCode = codeStr.toLowerCase().replace(/^r\.?/, "").replace(/\s/g, "");
      return questionMapByCode.get(normalizedCode) || null;
    };

    const isQuestionInLoop = (q) => {
      if (!q) return false;
      const parentId = q.parent_id || q.parentId;
      if (parentId) {
        const parent = questions.find(p => String(p.id) === String(parentId));
        if (parent && isQuestionInLoop(parent)) {
          return true;
        }
      }
      if (q.validation) {
        try {
          const parsed = JSON.parse(q.validation);
          if (parsed) {
            if (parsed.is_loop || parsed.isLoop || parsed.loop_group || parsed.loop_by_question_id || parsed.loopByQuestionId) {
              return true;
            }
          }
        } catch (e) {}
      }
      return false;
    };

    const evaluateFormula = (formulaStr, currentValues, idx = null) => {
      if (!formulaStr) return "0";
      let evalStr = formulaStr.trim();

      // Helper: extract numeric values from a stored loop-array value or plain value
      const extractNumbers = (raw) => {
        if (raw === undefined || raw === null || raw === "") return [];
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed.map(x => {
              if (x && typeof x === 'object' && 'value' in x) return parseFloat(x.value);
              if (typeof x === 'string' && x.startsWith('{')) {
                try { const p = JSON.parse(x); if (p && 'value' in p) return parseFloat(p.value); } catch (e) { }
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

      const getLoopValueFromValuesLocal = (qId, idx) => {
        const raw = currentValues[qId];
        const targetQ = questions.find(x => x.id === qId);
        const isSerialNumber = targetQ && targetQ.type === 'number' && (
          targetQ.label.toLowerCase().includes('no. urut') ||
          targetQ.label.toLowerCase().includes('nomor urut') ||
          targetQ.label.toLowerCase().includes('no urut')
        ) && isQuestionInLoop(targetQ);

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
        } catch (e) { }
        if (isSerialNumber && idx > 0) {
          return String(idx + 1);
        }
        return idx === 0 ? raw : "";
      };

      // 1. Handle AGE function (e.g. AGE(R410))
      const ageRegex = /AGE\((R[0-9a-zA-Z.]+)\)/gi;
      evalStr = evalStr.replace(ageRegex, (match, code) => {
        const targetQ = findQuestionByCode(code);
        if (!targetQ) return "0";

        let birthDateStr = "";
        if (idx !== null) {
          birthDateStr = getLoopValueFromValuesLocal(targetQ.id, idx);
        } else {
          birthDateStr = currentValues[targetQ.id] || "";
        }

        if (!birthDateStr) return "0";

        // Clean value if it is wrapped in an object or array (defensive)
        if (birthDateStr.trim().startsWith('{') || birthDateStr.trim().startsWith('[')) {
          try {
            const parsed = JSON.parse(birthDateStr);
            if (Array.isArray(parsed)) {
              birthDateStr = parsed[0] || "";
            } else if (parsed && parsed.value) {
              birthDateStr = parsed.value;
            }
          } catch (e) { }
        }

        const birthDate = new Date(birthDateStr);
        if (isNaN(birthDate.getTime())) return "0";
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return String(age >= 0 ? age : 0);
      });

      // 2. Handle aggregation functions on loop/array values: e.g. MAX(R401)
      const funcRegex = /(MAX|MIN|SUM|AVG|COUNT)\((R[0-9a-zA-Z.]+)\)/gi;
      evalStr = evalStr.replace(funcRegex, (match, op, code) => {
        const targetQ = findQuestionByCode(code);
        if (!targetQ) return "0";

        const targetQVal = parseValidation(targetQ.validation);
        const isTargetLoop = targetQVal.isLoop || targetQVal.is_loop || !!targetQ.parent_id || !!targetQ.parentId || !!targetQVal.loop_group;

        let numbers = [];
        if (isTargetLoop) {
          const loopCount = getQuestionLoopCount(targetQ);
          if (loopCount > 0) {
            for (let i = 0; i < loopCount; i++) {
              const val = getLoopValueFromValuesLocal(targetQ.id, i);
              const num = parseFloat(val);
              if (!isNaN(num)) {
                numbers.push(num);
              }
            }
          }
        } else {
          numbers = extractNumbers(currentValues[targetQ.id]);
        }

        if (numbers.length === 0 && targetQ.validation) {
          try {
            const vParsed = JSON.parse(targetQ.validation);
            if (vParsed && vParsed.loop_group) {
              const groupQs = questions.filter(x => {
                if (!x.validation) return false;
                try { const p = JSON.parse(x.validation); return p && p.loop_group === vParsed.loop_group; }
                catch (e) { return false; }
              });
              groupQs.forEach(gq => {
                numbers = numbers.concat(extractNumbers(currentValues[gq.id]));
              });
            }
          } catch (e) { }
        }

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
              } catch (e) { }
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
          let val = "";
          if (idx !== null) {
            val = getLoopValueFromValuesLocal(targetQ.id, idx);
          } else {
            val = currentValues[targetQ.id] || "0";
          }
          let valNum = parseFloat(val);
          if (isNaN(valNum)) {
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) {
                const numbers = parsed.map(x => {
                  if (x && typeof x === 'object' && 'value' in x) return parseFloat(x.value);
                  if (typeof x === 'string' && x.startsWith('{')) {
                    try { const p = JSON.parse(x); if (p && 'value' in p) return parseFloat(p.value); } catch (e) { }
                  }
                  return parseFloat(x);
                }).filter(x => !isNaN(x));
                valNum = numbers.length > 0 ? Math.max(...numbers) : 0;
              } else if (parsed && typeof parsed === 'object' && 'value' in parsed) {
                valNum = parseFloat(parsed.value);
              }
            } catch (e) {
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

    const resolveDynamicOptions = (q) => {
      let qVal = null;
      try { qVal = JSON.parse(q.validation || "{}"); } catch(e) {}
      
      if (qVal && qVal.options_source_question_id) {
        const sourceVal = updatedValues[qVal.options_source_question_id];
        if (sourceVal && typeof sourceVal === 'string' && sourceVal.startsWith('[')) {
          try {
            const arr = JSON.parse(sourceVal);
            if (Array.isArray(arr)) {
              return arr.map((item, idx) => ({
                value: String(idx + 1).padStart(3, '0'),
                label: String(item)
              }));
            }
          } catch(e) {}
        }
      }
      
      let opts = q.options;
      if (typeof opts === 'string') {
        try { opts = JSON.parse(opts); } catch(e) { opts = []; }
      }
      return Array.isArray(opts) ? opts : [];
    };

    const selectedActivity = (activities || []).find(a => a.id === item.kegiatan_id);
    const docPclId = item.petugas_id;
    const docPetugas = docPclId ? (petugas || []).find(p => p.id === docPclId) : null;
    const currentPetugas = docPetugas || currentUser;

    questions.forEach(q => {
      const lowerLabel = (q.label || "").toLowerCase();
      let matchedText = "";
      let defaultVal = null;
      if (q.validation) {
        try {
          const parsed = JSON.parse(q.validation);
          defaultVal = parsed.default_val || parsed.defaultVal || null;
        } catch(e) {}
      }

      const qVal = parseValidation(q.validation);
      const isLoop = qVal.is_loop || !!q.parent_id || !!q.parentId || !!qVal.loop_group;
      const loopCount = getQuestionLoopCount(q);

      for (let idx = 0; idx < loopCount; idx++) {
        let currentVal = isLoop ? getLoopValueFromValues(q.id, idx) : updatedValues[q.id];

        if (currentVal === undefined || currentVal === null || currentVal === '') {
          if (q.type === 'pcl' || lowerLabel.includes("nama pcl") || lowerLabel.includes("nama pencacah")) {
            matchedText = currentPetugas.name || currentUser.name || "";
          } 
          else if (q.type === 'pml' || lowerLabel.includes("nama pml") || lowerLabel.includes("nama pengawas")) {
            matchedText = (docPetugas || currentPetugas).assignments?.[selectedActivity?.name]?.pengawas || "";
          } 
          else if (lowerLabel.includes("provinsi")) {
            matchedText = defaultVal || "Kalimantan Utara";
          } else if (lowerLabel.includes("kabupaten") || lowerLabel.includes("kota")) {
            matchedText = defaultVal || "Tana Tidung";
          } else if (lowerLabel.includes("kecamatan") && item.kecamatan) {
            matchedText = item.kecamatan;
          } else if ((lowerLabel.includes("desa") || lowerLabel.includes("kelurahan")) && item.desa) {
            matchedText = item.desa;
          } else if ((lowerLabel.includes("sub sls") || lowerLabel.includes("sub-sls") || lowerLabel.match(/\brw\b/)) && item.sub_sls) {
            matchedText = item.sub_sls;
          } else if ((lowerLabel.includes("sls") || lowerLabel.match(/\brt\b/)) && item.sls) {
            matchedText = item.sls;
          } else if ((lowerLabel.includes("alamat") || lowerLabel.includes("jalan")) && item.alamat) {
            matchedText = item.alamat;
          } else if ((lowerLabel.includes("kepala") || lowerLabel.includes("krt") || lowerLabel.includes("nama kepala")) && item.krt && item.krt !== "Tanpa Nama") {
            matchedText = item.krt;
          } else if (defaultVal !== null) {
            matchedText = defaultVal;
          }

          if (matchedText && q.type !== 'note') {
            let finalVal = matchedText;
            if (q.type === 'select' || q.type === 'search') {
              const opts = resolveDynamicOptions(q);
              const match = opts.find(o => 
                String(o.value).toLowerCase() === String(matchedText).toLowerCase() ||
                String(o.label).toLowerCase() === String(matchedText).toLowerCase()
              );
              finalVal = match ? match.value : matchedText;
            }

            if (isLoop) {
              let arr = [];
              try { arr = JSON.parse(updatedValues[q.id]); } catch(e) { arr = []; }
              if (!Array.isArray(arr)) arr = [];
              arr[idx] = finalVal;
              updatedValues[q.id] = JSON.stringify(arr);
            } else {
              updatedValues[q.id] = finalVal;
            }
            isChanged = true;
          }
        }
      }
    });

    const formulaQs = questions.filter(q => {
      const qVal = parseValidation(q.validation);
      return qVal && qVal.formula;
    });

    formulaQs.forEach(q => {
      const qVal = parseValidation(q.validation);
      if (qVal && qVal.formula) {
        const isLoop = qVal.is_loop || !!q.parent_id || !!q.parentId || !!qVal.loop_group;
        const loopCount = getQuestionLoopCount(q);

        if (isLoop) {
          const computedArray = [];
          for (let idx = 0; idx < loopCount; idx++) {
            computedArray.push(evaluateFormula(qVal.formula, updatedValues, idx));
          }
          const computedStr = JSON.stringify(computedArray);
          if (updatedValues[q.id] !== computedStr) {
            updatedValues[q.id] = computedStr;
            isChanged = true;
          }
        } else {
          const computedVal = evaluateFormula(qVal.formula, updatedValues);
          if (updatedValues[q.id] !== computedVal) {
            updatedValues[q.id] = computedVal;
            isChanged = true;
          }
        }
      }
    });

    return { updatedValues, isChanged };
  };

  const officerActivities = ((currentPetugas && currentPetugas.projects) || [])
    .map(projName => {
      const act = activities?.find(a => a.name === projName);
      if (!act) return null;
      return act;
    })
    .filter(act => act && act.status !== "draft" && act.status !== "selesai");

  const downloadFormStructures = async () => {
    if (isOffline) return;
    if (officerActivities && officerActivities.length > 0) {
      for (const act of officerActivities) {
        try {
          const res = await api.form.getStructure(act.id);
          if (res && res.success) {
            localStorage.setItem(`form_structure_${act.id}`, JSON.stringify({
              blocks: res.blocks,
              questions: res.questions
            }));
            if (offlineDB.isAvailable()) {
              await offlineDB.saveFormStructure(act.id, res.blocks, res.questions);
            }
          }
        } catch (e) {
          console.error(`Gagal mengunduh struktur form untuk kegiatan ${act.name}:`, e);
        }
      }
    }
  };

  const mergeDocument = (apiDoc, localDoc) => {
    if (!localDoc) return apiDoc;
    if (!apiDoc) return localDoc;

    let apiVals = apiDoc.values || {};
    let localVals = localDoc.values || {};
    
    if (typeof apiVals === 'string') {
      try { apiVals = JSON.parse(apiVals); } catch(e) { apiVals = {}; }
    }
    if (typeof localVals === 'string') {
      try { localVals = JSON.parse(localVals); } catch(e) { localVals = {}; }
    }

    const mergedValues = { ...apiVals, ...localVals };
    const hasLocalUnsynced = localDoc.sync === false;
    const serverHasPriority = apiDoc.status === 'terkirim' || 
                              apiDoc.review_status === 'approved' || 
                              apiDoc.review_status === 'rejected';

    let mergedDoc = { ...localDoc, ...apiDoc };

    if (hasLocalUnsynced && !serverHasPriority) {
      mergedDoc = {
        ...apiDoc,
        ...localDoc,
        krt: localDoc.krt || apiDoc.krt,
        alamat: localDoc.alamat || apiDoc.alamat,
        kecamatan: localDoc.kecamatan || apiDoc.kecamatan,
        desa: localDoc.desa || apiDoc.desa,
        sls: localDoc.sls || apiDoc.sls,
        sub_sls: localDoc.sub_sls || apiDoc.sub_sls,
        status: localDoc.status || apiDoc.status,
        review_status: localDoc.review_status || apiDoc.review_status,
      };
    } else if (serverHasPriority) {
      mergedDoc = {
        ...localDoc,
        ...apiDoc,
        status: apiDoc.status,
        review_status: apiDoc.review_status,
      };
    } else {
      const localTime = new Date(localDoc.updated_at || localDoc.created_at || 0).getTime();
      const apiTime = new Date(apiDoc.updated_at || apiDoc.created_at || 0).getTime();
      if (localTime > apiTime) {
        mergedDoc = { ...apiDoc, ...localDoc };
      } else {
        mergedDoc = { ...localDoc, ...apiDoc };
      }
    }

    mergedDoc.values = mergedValues;
    mergedDoc.sync = (apiDoc.status === 'terkirim' || apiDoc.review_status === 'approved') 
      ? true 
      : (localDoc.sync === false ? false : apiDoc.sync);

    return mergedDoc;
  };

  const mergeServerWithLocalDocs = (serverDocs, localDocs) => {
    const merged = [...serverDocs];
    localDocs.forEach(localDoc => {
      const apiIdx = merged.findIndex(d => 
        (d.id && localDoc.id && d.id === localDoc.id) || 
        (d.kode && d.kode === localDoc.kode)
      );

      if (apiIdx >= 0) {
        const apiDoc = merged[apiIdx];
        if (localDoc.kode && apiDoc.kode && localDoc.kode !== apiDoc.kode) {
          if (offlineDB.isAvailable()) {
            offlineDB.removeDokumen(localDoc.kode).catch(e => 
              console.warn("Gagal hapus dokumen lama di IndexedDB saat merge:", e)
            );
          }
        }
        merged[apiIdx] = mergeDocument(apiDoc, localDoc);
      } else {
        merged.push(localDoc);
      }
    });
    return deduplicateDocs(merged);
  };

  const getLocalDocs = async () => {
    let localDocs = [];
    const cached = localStorage.getItem(`offline_docs_${currentUser.id}`);
    if (cached) {
      try {
        localDocs = JSON.parse(cached);
      } catch (e) {}
    }
    if (localDocs.length === 0 && offlineDB.isAvailable()) {
      try {
        const idbDocs = await offlineDB.getAllDokumen();
        if (idbDocs && idbDocs.length > 0) {
          localDocs = idbDocs;
        }
      } catch (e) {}
    }
    return deduplicateDocs(localDocs);
  };


  /**
   * Hapus duplikat dari dokumen berdasarkan kode dokumen.
   * Mempertahankan data dengan timestamp terbaru.
   */
  const deduplicateDocs = (docs) => {
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

  const refreshList = () => {
    const cached = localStorage.getItem(`offline_docs_${currentUser.id}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Deduplicate sebelum set state
        setLocalRtList(deduplicateDocs(parsed));
      } catch (e) {
        console.error("Gagal parse cached offline docs:", e);
        // Fallback ke IndexedDB jika localStorage gagal
        recoverFromIDB();
      }
    } else {
      // Jika localStorage kosong, coba recover dari IndexedDB
      recoverFromIDB();
    }
  };

  /**
   * Recover dokumen dari IndexedDB jika localStorage kosong
   */
  const recoverFromIDB = async () => {
    if (!offlineDB.isAvailable()) {
      setLocalRtList([]);
      return;
    }

    try {
      const allDocs = await offlineDB.getAllDokumen();
      const userDocs = allDocs.filter(d => d.petugas_id === currentUser.id);

      if (userDocs.length > 0) {
        // Deduplicate sebelum menyimpan
        const dedupedDocs = deduplicateDocs(userDocs);

        // Sync ke localStorage untuk konsistensi
        try {
          localStorage.setItem(`offline_docs_${currentUser.id}`, JSON.stringify(dedupedDocs));
        } catch (e) {
          console.warn('Gagal sync recovery ke localStorage:', e);
        }
        setLocalRtList(dedupedDocs);
        console.log(`Recovered ${dedupedDocs.length} dokumen dari IndexedDB`);
      } else {
        setLocalRtList([]);
      }
    } catch (e) {
      console.warn('Gagal recover dari IndexedDB:', e);
      setLocalRtList([]);
    }
  };

  const handleRefreshServer = async () => {
    if (isOffline) {
      refreshList();
      return;
    }
    setFetchingData(true);
    try {
      // 1. Download latest form structures
      await downloadFormStructures();

      // 2. Fetch and merge documents
      const docs = await api.dokumen.getByPetugas(currentUser.id);
      const dedupedDocs = deduplicateDocs(docs);
      const localDocs = await getLocalDocs();
      const finalDocs = mergeServerWithLocalDocs(dedupedDocs, localDocs);

      // Hybrid storage: simpan ke localStorage + IndexedDB
      try {
        localStorage.setItem(`offline_docs_${currentUser.id}`, JSON.stringify(finalDocs));
      } catch (e) {
        console.warn('localStorage penuh saat refresh:', e.message);
      }
      // Simpan juga ke IndexedDB
      for (const doc of finalDocs) {
        try {
          await offlineDB.saveDokumen({
            ...doc,
            sync_status: doc.sync_status || (doc.sync !== false ? 'synced' : 'pending')
          });
        } catch (idbErr) {
          console.warn('Gagal simpan ke IndexedDB:', idbErr);
        }
      }

      setLocalRtList(finalDocs);
    } catch (e) {
      console.error("Gagal refresh data dari server:", e);
      // Fallback ke localStorage atau IndexedDB
      refreshList();
    } finally {
      setFetchingData(false);
    }
  };

  useEffect(() => {
    refreshList();
  }, [currentUser.id]);



  const antriKirim = localRtList.filter(rt => rt.status === "tersimpan");
  const terkirim = localRtList.filter(rt => rt.status === "terkirim" && rt.review_status !== "rejected");
  const ditolak = localRtList.filter(rt => rt.review_status === "rejected");

  // Show both in queue: ready to send (tersimpan) and synced (terkirim)
  const queueItems = localRtList.filter(rt => rt.status === "tersimpan" || rt.status === "terkirim");

  const validateDocument = async (item) => {
    let blocks = [];
    let questions = [];
    
    const cached = localStorage.getItem(`form_structure_${item.kegiatan_id}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        blocks = parsed.blocks || [];
        questions = parsed.questions || [];
      } catch (e) {}
    }
    
    if (blocks.length === 0 || questions.length === 0) {
      try {
        const res = await api.form.getStructure(item.kegiatan_id);
        if (res.success) {
          blocks = res.blocks || [];
          questions = res.questions || [];
          localStorage.setItem(`form_structure_${item.kegiatan_id}`, JSON.stringify({ blocks, questions }));
        }
      } catch (e) {
        console.error("Gagal load form structure untuk validasi kirim:", e);
      }
    }
    
    if (blocks.length === 0 || questions.length === 0) {
      return { isValid: true, errors: [] };
    }
    
    // Auto-fill and evaluate formulas BEFORE validation!
    const { updatedValues, isChanged } = autoFillAndEvaluateFormulas(item, questions, blocks);
    if (isChanged) {
      item.values = updatedValues;
      await saveSingleDocLocally(item);
    }

    const errors = [];
    let values = item.values || {};
    if (typeof values === 'string') {
      try {
        values = JSON.parse(values);
      } catch (e) {
        values = {};
      }
    }



    const evaluateFormulaLocal = (formulaStr, currentValues, idx = null) => {
      if (!formulaStr) return "0";
      let evalStr = formulaStr.trim();

      const extractNumbers = (raw) => {
        if (raw === undefined || raw === null || raw === "") return [];
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed.map(x => {
              if (x && typeof x === 'object' && 'value' in x) return parseFloat(x.value);
              if (typeof x === 'string' && x.startsWith('{')) {
                try { const p = JSON.parse(x); if (p && 'value' in p) return parseFloat(p.value); } catch (e) { }
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

      const getLoopValueFromValuesLocal = (qId, idx) => {
        const raw = currentValues[qId];
        const targetQ = questions.find(x => x.id === qId);
        const isSerialNumber = targetQ && targetQ.type === 'number' && (
          targetQ.label.toLowerCase().includes('no. urut') ||
          targetQ.label.toLowerCase().includes('nomor urut') ||
          targetQ.label.toLowerCase().includes('no urut')
        ) && isQuestionInLoop(targetQ);

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
        } catch (e) { }
        if (isSerialNumber && idx > 0) {
          return String(idx + 1);
        }
        return idx === 0 ? raw : "";
      };

      // AGE function (e.g. AGE(R410))
      const ageRegex = /AGE\((R[0-9a-zA-Z.]+)\)/gi;
      evalStr = evalStr.replace(ageRegex, (match, code) => {
        const targetQ = findQuestionByCode(code);
        if (!targetQ) return "0";

        let birthDateStr = "";
        if (idx !== null) {
          birthDateStr = getLoopValueFromValuesLocal(targetQ.id, idx);
        } else {
          birthDateStr = currentValues[targetQ.id] || "";
        }

        if (!birthDateStr) return "0";

        if (birthDateStr.trim().startsWith('{') || birthDateStr.trim().startsWith('[')) {
          try {
            const parsed = JSON.parse(birthDateStr);
            if (Array.isArray(parsed)) {
              birthDateStr = parsed[0] || "";
            } else if (parsed && parsed.value) {
              birthDateStr = parsed.value;
            }
          } catch (e) { }
        }

        const birthDate = new Date(birthDateStr);
        if (isNaN(birthDate.getTime())) return "0";
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return String(age >= 0 ? age : 0);
      });

      // Aggregation functions on loop/array values: e.g. MAX(R401)
      const funcRegex = /(MAX|MIN|SUM|AVG|COUNT)\((R[0-9a-zA-Z.]+)\)/gi;
      evalStr = evalStr.replace(funcRegex, (match, op, code) => {
        const targetQ = findQuestionByCode(code);
        if (!targetQ) return "0";

        const targetQVal = parseValidation(targetQ.validation);
        const isTargetLoop = targetQVal.isLoop || targetQVal.is_loop || !!targetQ.parent_id || !!targetQ.parentId || !!targetQVal.loop_group;

        let numbers = [];
        if (isTargetLoop) {
          const loopCount = getQuestionLoopCount(targetQ);
          if (loopCount > 0) {
            for (let i = 0; i < loopCount; i++) {
              const val = getLoopValueFromValuesLocal(targetQ.id, i);
              const num = parseFloat(val);
              if (!isNaN(num)) {
                numbers.push(num);
              }
            }
          }
        } else {
          numbers = extractNumbers(currentValues[targetQ.id]);
        }

        if (numbers.length === 0 && targetQ.validation) {
          try {
            const vParsed = JSON.parse(targetQ.validation);
            if (vParsed && vParsed.loop_group) {
              const groupQs = questions.filter(x => {
                if (!x.validation) return false;
                try { const p = JSON.parse(x.validation); return p && p.loop_group === vParsed.loop_group; }
                catch (e) { return false; }
              });
              groupQs.forEach(gq => {
                numbers = numbers.concat(extractNumbers(currentValues[gq.id]));
              });
            }
          } catch (e) { }
        }

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
              } catch (e) { }
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
          let val = "";
          if (idx !== null) {
            val = getLoopValueFromValuesLocal(targetQ.id, idx);
          } else {
            val = currentValues[targetQ.id] || "0";
          }
          let valNum = parseFloat(val);
          if (isNaN(valNum)) {
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) {
                const numbers = parsed.map(x => {
                  if (x && typeof x === 'object' && 'value' in x) return parseFloat(x.value);
                  if (typeof x === 'string' && x.startsWith('{')) {
                    try { const p = JSON.parse(x); if (p && 'value' in p) return parseFloat(p.value); } catch (e) { }
                  }
                  return parseFloat(x);
                }).filter(x => !isNaN(x));
                valNum = numbers.length > 0 ? Math.max(...numbers) : 0;
              } else if (parsed && typeof parsed === 'object' && 'value' in parsed) {
                valNum = parseFloat(parsed.value);
              }
            } catch (e) {
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

    const selectedActivity = (activities || []).find(a => a.id === item.kegiatan_id);
    const isPml = selectedActivity?.role === "PML";

    const isQuestionRequiredForRole = (q, isPmlUser) => {
      if (!q.required) return false;
      if (q.type === 'note') return false;

      // If user is PCL, PML-specific questions are not required
      if (!isPmlUser) {
        const lowerLabel = (q.label || "").toLowerCase();
        if (
          q.type === 'pml' ||
          lowerLabel.includes("pml") ||
          lowerLabel.includes("pengawas") ||
          lowerLabel.includes("pemeriksa")
        ) {
          return false;
        }
      }

      return true;
    };

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

    const questionCodesMap = new Map();
    const getCode = (q) => {
      const cacheKey = String(q.id);
      if (questionCodesMap.has(cacheKey)) return questionCodesMap.get(cacheKey);

      const block = blocks.find(b => b.id === q.blok_id || b.kode === q.blok_id);
      let blockIdx = 0;
      if (block) {
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
        questionCodesMap.set(cacheKey, "");
        return "";
      }
      
      const parentId = q.parent_id || q.parentId;
      if (parentId) {
        const parent = questions.find(p => p.id === parentId);
        if (!parent) {
          questionCodesMap.set(cacheKey, "");
          return "";
        }
        const parentCode = getCode(parent);
        
        const siblings = questions.filter(s => s.blok_id === q.blok_id && (s.parent_id === parentId || s.parentId === parentId)).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const sibIdx = siblings.findIndex(s => s.id === q.id);
        
        if (parent.parent_id || parent.parentId) {
          const romanNumerals = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
          const suffix = romanNumerals[sibIdx] || (sibIdx + 1).toString();
          const code = `${parentCode}.${suffix}`;
          questionCodesMap.set(cacheKey, code);
          return code;
        } else {
          const letter = String.fromCharCode(97 + (sibIdx >= 0 ? sibIdx : 0));
          const code = `${parentCode}${letter}`;
          questionCodesMap.set(cacheKey, code);
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
        questionCodesMap.set(cacheKey, code);
        return code;
      }
    };

    questions.forEach(q => {
      getCode(q);
    });

    const getQuestionCode = (q) => {
      if (!q) return "";
      return questionCodesMap.get(String(q.id)) || "";
    };

    const questionMapByCode = new Map();
    questions.forEach(q => {
      const qCode = getQuestionCode(q);
      if (qCode) {
        const normalized = qCode.toLowerCase().replace(/^r\.?/, "").replace(/\s/g, "");
        questionMapByCode.set(normalized, q);
      }
    });

    const findQuestionByCode = (codeStr) => {
      if (!codeStr) return null;
      const normalizedCode = codeStr.toLowerCase().replace(/^r\.?/, "").replace(/\s/g, "");
      return questionMapByCode.get(normalizedCode) || null;
    };

    const parseValidation = (str) => {
      if (!str) return { isLoop: false, loopByQuestionId: null };
      const trimmed = str.trim();
      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          return {
            isLoop: !!parsed.is_loop,
            loopType: parsed.loop_type || "question",
            loopByQuestionId: parsed.loop_by_question_id || null,
          };
        } catch (e) {}
      }
      return { isLoop: false, loopByQuestionId: null };
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
        } catch (e) {}
      }
      
      if (loopGroupName) {
        const groupQs = questions.filter(x => {
          if (x.blok_id !== q.blok_id) return false;
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

      const { isLoop, loopType } = parseValidation(q.validation);
      if (isLoop && loopType === "manual") {
        const savedCount = values[`${q.id}_loop_count`];
        if (savedCount !== undefined && savedCount !== null && savedCount !== '') {
          return parseInt(savedCount, 10);
        }
        return 1;
      }
      if (q.parent_id) {
        const parent = questions.find(x => x.id === q.parent_id);
        if (parent) {
          return getManualLoopCount(parent);
        }
      }
      return null;
    };

    const getQuestionLoopGroup = (q) => {
      if (!q) return "";
      if (q.validation) {
        try {
          const parsed = JSON.parse(q.validation);
          if (parsed && parsed.loop_group) {
            return parsed.loop_group;
          }
        } catch (e) {}
      }
      const parentId = q.parent_id || q.parentId;
      if (parentId) {
        const parent = questions.find(p => p.id === parentId);
        if (parent) {
          return getQuestionLoopGroup(parent);
        }
      }
      return "";
    };

    const getQuestionLoopCount = (q) => {
      if (!q) return 1;

      // Check if it is a loop question (directly or loop group)
      const loopGroupName = getQuestionLoopGroup(q);
      const { isLoop, loopType, loopByQuestionId } = parseValidation(q.validation);
      const isLoopQ = isLoop || !!loopGroupName;

      if (!isLoopQ) {
        // 1. Parent relationship
        const parentId = q.parent_id || q.parentId;
        if (parentId) {
          const parent = questions.find(p => p.id === parentId);
          if (parent) {
            return getQuestionLoopCount(parent);
          }
        }
      }

      // 2. Loop Group relationship
      if (loopGroupName) {
        const groupQs = questions.filter(x => x.blok_id === q.blok_id && getQuestionLoopGroup(x) === loopGroupName);
        // Find the master loop question in the group
        const masterQ = groupQs.find(x => {
          if (!x.validation) return false;
          try {
            const parsed = JSON.parse(x.validation);
            return parsed && parsed.is_loop;
          } catch (e) {
            return false;
          }
        }) || groupQs[0];

        if (masterQ && masterQ.id !== q.id) {
          return getQuestionLoopCount(masterQ);
        }
      }

      // 3. Direct loop configuration
      if (isLoop) {
        if (loopByQuestionId) {
          let triggerValue = values[loopByQuestionId];
          if (typeof triggerValue === 'string' && triggerValue.trim().startsWith('[')) {
            try {
              const arr = JSON.parse(triggerValue);
              if (Array.isArray(arr)) triggerValue = arr[0];
            } catch(e) {}
          }
          const parsedTrigger = parseInt(triggerValue, 10);
          if (!isNaN(parsedTrigger) && parsedTrigger > 0) {
            return Math.max(0, parsedTrigger);
          }
          // Fallback for prelist array mapping
          try {
            const val = values[q.id];
            if (typeof val === 'string' && val.startsWith('[')) {
              const arr = JSON.parse(val);
              if (Array.isArray(arr) && arr.length > 0) return arr.length;
            }
          } catch (e) { }
          return 0;
        }
        if (loopType === "manual") {
          const manualCount = getManualLoopCount(q);
          return manualCount !== null ? manualCount : 1;
        }
      }

      return 1;
    };

    const getLoopValue = (qId, idx) => {
      const raw = values[qId];
      if (!raw) return "";
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed[idx] !== undefined && parsed[idx] !== null ? String(parsed[idx]) : "";
        } else if (typeof parsed === 'object' && parsed !== null) {
          // Handle {"value":"..."} wrapper objects — treat as single non-loop value
          if ('value' in parsed) {
            return idx === 0 ? raw : "";
          }
          return parsed[idx] !== undefined && parsed[idx] !== null ? String(parsed[idx]) : "";
        }
      } catch (e) {}
      return idx === 0 ? raw : "";
    };

    // Helper: extract the actual primitive value from a potentially wrapped value
    // e.g. '{"value":"3"}' → '3', '["a","b"]' with idx→specific element, plain '5' → '5'
    const extractActualValue = (rawVal, isLoop, loopCount, idx) => {
      if (rawVal === undefined || rawVal === null) return rawVal;
      if (typeof rawVal !== 'string') return rawVal;
      
      // Loop array extraction
      if (isLoop || loopCount > 1 || rawVal.startsWith('[')) {
        return getLoopValue(rawVal === values[0] ? null : null, idx); // will be called via qId above
      }
      
      // Object wrapper extraction for non-loop values: {"value":"3"}
      const trimmed = rawVal.trim();
      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === 'object' && 'value' in parsed) {
            return parsed.value !== undefined && parsed.value !== null ? String(parsed.value) : "";
          }
        } catch (e) {}
      }
      
      return rawVal;
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
              if ('value' in parsed) {
                resolved[qId] = parsed.value !== undefined && parsed.value !== null ? parsed.value : "";
              } else {
                resolved[qId] = parsed[idx] !== undefined && parsed[idx] !== null ? parsed[idx] : "";
              }
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

    // Pre-build allOrdered question list ONCE (cached for all visibility checks)
    const cachedAllOrdered = [];
    blocks.forEach(b => {
      const blockQs = questions.filter(x => String(x.blok_id) === String(b.id) || String(x.blok_id) === String(b.kode));
      const mainQs = blockQs.filter(x => !x.parent_id && !x.parentId);
      const addChildrenRecursive = (parentId) => {
        const children = blockQs.filter(x => (x.parent_id === parentId || x.parentId === parentId)).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        children.forEach(child => {
          cachedAllOrdered.push(child);
          addChildrenRecursive(child.id);
        });
      };
      mainQs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      mainQs.forEach(parent => {
        cachedAllOrdered.push(parent);
        addChildrenRecursive(parent.id);
      });
    });

    // Pre-build question index map for fast lookups
    const cachedQuestionIndexMap = new Map();
    cachedAllOrdered.forEach((q, idx) => {
      cachedQuestionIndexMap.set(String(q.id), idx);
    });

    // Pre-build skippers list ONCE
    const cachedSkippers = questions.filter(quest => quest.skip_target && quest.skip_logic !== undefined && quest.skip_logic !== null);

    const isQuestionVisibleIgnoreBlock = (q, activeInstanceIdx = null) => {
      const parentId = q.parent_id || q.parentId;
      if (parentId) {
        const parent = questions.find(p => String(p.id) === String(parentId));
        if (parent && !isQuestionVisibleIgnoreBlock(parent, activeInstanceIdx)) {
          return false;
        }
      }

      const resolvedValues = getResolvedValuesForIndex(values, activeInstanceIdx);
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
          if (!matchesShowIf) return false;
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

      // Use pre-built cachedAllOrdered and cachedSkippers instead of rebuilding each call
      const currentIdx = cachedQuestionIndexMap.get(String(q.id));

      for (const skipper of cachedSkippers) {
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
        
        if (matchesTrigger) {
          const skipperIdx = cachedQuestionIndexMap.get(String(skipper.id));
          let targetQ = questions.find(x => String(x.id) === String(skipper.skip_target));
          if (!targetQ) {
            targetQ = findQuestionByCode(String(skipper.skip_target));
          }
          const targetIdx = targetQ ? cachedQuestionIndexMap.get(String(targetQ.id)) : -1;

          if (skipperIdx !== undefined && targetIdx !== undefined && targetIdx !== -1 && currentIdx !== undefined) {
            if (currentIdx > skipperIdx && currentIdx < targetIdx) {
              return false;
            }
          }
        }
      }
      return true;
    };

    const getSkipTargetBlock = (skipTargetId) => {
      let targetQ = questions.find(q => String(q.id) === String(skipTargetId));
      if (!targetQ) {
        targetQ = findQuestionByCode(String(skipTargetId));
      }
      if (!targetQ) return null;
      const targetBlock = blocks.find(b => String(b.id) === String(targetQ.blok_id) || String(b.kode) === String(targetQ.blok_id));
      return targetBlock;
    };

    const getActiveSkips = () => {
      const activeSkips = [];
      questions.forEach(q => {
        if (!q.skip_target || !q.skip_logic) return;
        let matchesTrigger = false;
        const qVal = values[q.id];
        try {
          const parsed = JSON.parse(q.skip_logic);
          if (parsed && parsed.conditions && parsed.conditions.length > 0) {
            const operator = parsed.operator || "AND";
            const results = parsed.conditions.map(c => evaluateCondition(c, values));
            matchesTrigger = operator === "OR" ? results.some(r => r) : results.every(r => r);
          }
        } catch (e) {
          const triggerOptions = String(q.skip_logic).split(",").map(x => x.trim()).filter(Boolean);
          matchesTrigger = checkOptionTrigger(qVal, triggerOptions);
        }
        if (matchesTrigger) {
          activeSkips.push({
            questionId: q.id,
            skipTargetId: q.skip_target
          });
        }
      });
      return activeSkips;
    };

    const getBlocksToHideBySkip = () => {
      const activeSkips = getActiveSkips();
      const blocksToHide = new Set();
      if (activeSkips.length === 0) return blocksToHide;

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

      activeSkips.forEach(skip => {
        const skipperQ = questions.find(q => String(q.id) === String(skip.questionId));
        if (!skipperQ) return;
        const skipperBlock = blocks.find(b => String(b.id) === String(skipperQ.blok_id) || String(b.kode) === String(skipperQ.blok_id));
        const targetBlock = getSkipTargetBlock(skip.skipTargetId);
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
    };

    // Pre-compute blocksToHide ONCE instead of per-call
    const cachedBlocksToHide = getBlocksToHideBySkip();

    const isBlockVisible = (block) => {
      if (!block) return false;
      if (cachedBlocksToHide.has(block.id) || cachedBlocksToHide.has(block.kode)) {
        return false;
      }
      if (block.hide_logic) {
        try {
          const parsed = JSON.parse(block.hide_logic);
          if (parsed && parsed.conditions && parsed.conditions.length > 0) {
            const operator = parsed.operator || "AND";
            const results = parsed.conditions.map(c => evaluateCondition(c, values));
            const met = operator === "OR" ? results.some(r => r) : results.every(r => r);
            if (met) return false;
          }
        } catch (e) {}
      }

      // Check if all questions in this block are hidden by logic.
      const blockQuestions = questions.filter(q => String(q.blok_id) === String(block.id) || String(q.blok_id) === String(block.kode));
      if (blockQuestions.length > 0) {
        const hasAnyVisibleQuestion = blockQuestions.some(q => isQuestionVisibleIgnoreBlock(q));
        if (!hasAnyVisibleQuestion) {
          return false;
        }
      }

      return true;
    };

    const isQuestionVisible = (q, activeInstanceIdx = null) => {
      const block = blocks.find(b => String(b.id) === String(q.blok_id) || String(b.kode) === String(q.blok_id));
      if (block && !isBlockVisible(block)) {
        return false;
      }
      // Also check if the question's block is being skipped
      if (block && (cachedBlocksToHide.has(block.id) || cachedBlocksToHide.has(block.kode))) {
        return false;
      }
      return isQuestionVisibleIgnoreBlock(q, activeInstanceIdx);
    };
    
    if (!item.kode || item.kode.trim() === "") {
      errors.push(`[${blocks[0]?.kode || 'Pengantar'}] Kode Dokumen / Nomor Urut belum diisi.`);
    }
    
    questions.forEach(q => {
      // If this question has sub-questions, it doesn't render inputs of its own (unless in original input mode), so it cannot be validated/required
      const childQs = questions.filter(c => c.parent_id === q.id || c.parentId === q.id);
      let parentMode = "label";
      if (q.validation && q.validation.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(q.validation);
          parentMode = parsed.parent_mode || "label";
        } catch(e) {}
      }
      if (childQs.length > 0 && parentMode !== "original") return;
      
      const loopCount = getQuestionLoopCount(q);
      const manualCount = getManualLoopCount(q);
      const qParsedVal = parseValidation(q.validation);
      const qIsLoop = qParsedVal.isLoop || !!q.parent_id || !!q.parentId || (q.validation && (q.validation.includes('loop_group') || q.validation.includes('is_loop')));

      for (let idx = 0; idx < loopCount; idx++) {
        // Evaluate visibility relative to the loop index/instance!
        if (!isQuestionVisible(q, (loopCount > 1 || manualCount !== null) ? idx : null)) continue;
        const rawVal = values[q.id];
        let val;
        if (qIsLoop || loopCount > 1 || (typeof rawVal === 'string' && rawVal.startsWith('['))) {
          // Loop value: extract from array
          val = getLoopValue(q.id, idx);
        } else if (typeof rawVal === 'string' && rawVal.trim().startsWith('{')) {
          // Non-loop JSON object value: extract actual value from {"value":"..."} wrapper
          try {
            const parsed = JSON.parse(rawVal.trim());
            if (parsed && typeof parsed === 'object' && 'value' in parsed) {
              val = parsed.value !== undefined && parsed.value !== null ? String(parsed.value) : "";
            } else {
              val = rawVal;
            }
          } catch (e) {
            val = rawVal;
          }
        } else {
          val = rawVal;
        }
        const block = blocks.find(b => String(b.id) === String(q.blok_id) || String(b.kode) === String(q.blok_id));
        const blockName = block ? block.kode : "Form";
        const suffix = loopCount > 1 ? ` ke-${idx + 1}` : "";

        // Check custom validation formulas
        if (q.validation && q.validation.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(q.validation);
            if (parsed && parsed.custom_validation_formula) {
              const formula = parsed.custom_validation_formula;
              const codeRegex = /R[0-9a-zA-Z.]+/g;
              const codes = formula.match(codeRegex) || [];
              
              let allFilled = true;
              for (const code of codes) {
                const targetQ = findQuestionByCode(code);
                if (targetQ) {
                  const targetRawVal = values[targetQ.id];
                  let targetVal;
                  if (qIsLoop || loopCount > 1 || (typeof targetRawVal === 'string' && targetRawVal.startsWith('['))) {
                    targetVal = getLoopValue(targetQ.id, idx);
                  } else if (typeof targetRawVal === 'string' && targetRawVal.trim().startsWith('{')) {
                    try {
                      const tParsed = JSON.parse(targetRawVal.trim());
                      if (tParsed && typeof tParsed === 'object' && 'value' in tParsed) {
                        targetVal = tParsed.value !== undefined && tParsed.value !== null ? String(tParsed.value) : "";
                      } else {
                        targetVal = targetRawVal;
                      }
                    } catch (e) {
                      targetVal = targetRawVal;
                    }
                  } else {
                    targetVal = targetRawVal;
                  }
                  if (targetVal === undefined || targetVal === null || targetVal === "") {
                    allFilled = false;
                    break;
                  }
                } else {
                  allFilled = false;
                  break;
                }
              }
              
              if (allFilled) {
                const result = evaluateFormulaLocal(formula, values, idx);
                if (result === "false" || result === "0") {
                  errors.push(`[${blockName}] ${parsed.custom_validation_message || `Peringatan konsistensi ${formula} tidak terpenuhi.`}`);
                }
              }
            }
          } catch (e) {}
        }

        if (val !== undefined && val !== null && val !== '') {
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
          } else if (q.type === 'text' && q.validation) {
            const trimmed = q.validation.trim();
            if (trimmed.startsWith('{')) {
              try {
                const parsed = JSON.parse(trimmed);
                const type = parsed.text_validation_type;
                if (type && type !== 'none') {
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

                  if (!patternValid) {
                    let patternMsg = "format tidak valid";
                    if (type === 'nik') patternMsg = "harus tepat 16 digit angka (Format NIK)";
                    else if (type === 'digits_only') patternMsg = "harus berupa angka saja";
                    else if (type === 'letters_only') patternMsg = "harus berupa huruf saja";
                    else if (type === 'alphanumeric') patternMsg = "harus berupa huruf/angka saja";
                    else if (type === 'email') patternMsg = "harus berformat email valid";
                    errors.push(`[${blockName}] Isian ${q.label}${suffix} ${patternMsg}.`);
                  } else if (type !== 'email') {
                    if (parsed.text_validation_or_lengths) {
                      const allowedLengths = parsed.text_validation_or_lengths.split(',').map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x));
                      if (allowedLengths.length > 0 && !allowedLengths.includes(val.length)) {
                        errors.push(`[${blockName}] Isian ${q.label}${suffix} harus memiliki panjang ${allowedLengths.join(' atau ')} karakter.`);
                      }
                    } else {
                      const min = parsed.text_validation_min ? parseInt(parsed.text_validation_min, 10) : 0;
                      const max = parsed.text_validation_max ? parseInt(parsed.text_validation_max, 10) : Infinity;
                      if (val.length < min || val.length > max) {
                        if (min === max) {
                          errors.push(`[${blockName}] Isian ${q.label}${suffix} harus tepat ${min} karakter.`);
                        } else {
                          errors.push(`[${blockName}] Isian ${q.label}${suffix} harus berukuran ${min} sampai ${max} karakter.`);
                        }
                      }
                    }
                  }
                }
              } catch(e) {}
            }
          }
        } else if (isQuestionRequiredForRole(q, isPml)) {
          errors.push(`[${blockName}] Isian wajib ${q.label}${suffix} masih kosong.`);
        }
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handleSyncItem = async (item) => {
    if (isOffline) {
      showToast("Tidak dapat mengirim data saat offline. Silakan hubungkan internet terlebih dahulu.", "warning");
      return;
    }

    setSyncingAll(true);
    const validation = await validateDocument(item);
    setSyncingAll(false);

    if (!validation.isValid) {
      showAlert(
        `Gagal mengirim dokumen ${item.kode} karena belum lengkap:\n\n${validation.errors.join('\n')}\n\nSilakan perbaiki isian kuesioner terlebih dahulu.`,
        "Dokumen Belum Lengkap",
        "error"
      );
      return;
    }

    const confirmed = await showConfirm(
      `Apakah Anda yakin ingin mengirim dokumen ${item.krt || 'KRT'} (${item.kode}) ke server BPS?`,
      "Kirim Dokumen",
      "warning"
    );
    if (confirmed) {
      executeSyncItem(item);
    }
  };

  const filterTemporaryValues = (kegiatanId, valuesObj) => {
    let parsedValues = valuesObj;
    if (typeof parsedValues === 'string') {
      try {
        parsedValues = JSON.parse(parsedValues);
      } catch (e) {
        parsedValues = {};
      }
    }
    if (!parsedValues) return {};
    const filtered = { ...parsedValues };
    const cached = localStorage.getItem(`form_structure_${kegiatanId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const questions = parsed.questions || [];
        questions.forEach(q => {
          if (q.validation) {
            try {
              const parsedVal = JSON.parse(q.validation);
              if (parsedVal && parsedVal.is_temporary) {
                delete filtered[q.id];
                delete filtered[`${q.id}_loop_count`];
              }
            } catch (e) {}
          }
        });
      } catch (e) {}
    }
    return filtered;
  };

  const executeSyncItem = async (item) => {
    setSyncingAll(true);
    try {
      // Create payload in format expected by backend sync
      const payloadDoc = {
        id: item.id,
        kode: item.kode,
        kegiatan_id: item.kegiatan_id,
        krt: item.krt,
        alamat: item.alamat,
        kecamatan: item.kecamatan,
        desa: item.desa,
        sls: item.sls,
        sub_sls: item.sub_sls,
        status: "terkirim",
        is_prelist: item.is_prelist,
        values: filterTemporaryValues(item.kegiatan_id, item.values || {})
      };

      const res = await api.dokumen.sync(currentUser.id, [payloadDoc]);
      if (res.success) {
        // 1. Download latest form structures
        await downloadFormStructures();

        // 2. Fetch fresh state and merge with local docs
        const freshDocs = await api.dokumen.getByPetugas(currentUser.id);
        const dedupedFresh = deduplicateDocs(freshDocs);
        const localDocs = await getLocalDocs();
        
        if (res.syncResults && Array.isArray(res.syncResults)) {
          res.syncResults.forEach(r => {
            const idx = localDocs.findIndex(d => d.kode === r.tempKode);
            if (idx > -1) {
              const oldKode = localDocs[idx].kode;
              localDocs[idx].id = r.id;
              localDocs[idx].kode = r.kode;
              localDocs[idx].sync = true;
              if (oldKode && oldKode !== r.kode && offlineDB.isAvailable()) {
                offlineDB.removeDokumen(oldKode).catch(e => 
                  console.warn("Gagal hapus dokumen lama di IndexedDB saat sync:", e)
                );
              }
            }
          });
        }
        
        const finalDocs = mergeServerWithLocalDocs(dedupedFresh, localDocs);

        // Hybrid storage: simpan ke localStorage + IndexedDB
        try {
          localStorage.setItem(`offline_docs_${currentUser.id}`, JSON.stringify(finalDocs));
        } catch (e) {
          console.warn('localStorage penuh saat sync:', e.message);
        }
        // Simpan juga ke IndexedDB
        for (const doc of finalDocs) {
          try {
            await offlineDB.saveDokumen({
              ...doc,
              sync_status: doc.sync_status || (doc.sync !== false ? 'synced' : 'pending')
            });
          } catch (idbErr) {
            console.warn('Gagal simpan ke IndexedDB:', idbErr);
          }
        }

        setLocalRtList(finalDocs);
        showToast("Dokumen berhasil disinkronisasi!", "success");
      } else {
        showAlert("Gagal sinkronisasi: " + res.message, "Gagal Sinkronisasi", "error");
      }
    } catch (e) {
      console.error("Sync error:", e);
      showAlert("Terjadi kesalahan jaringan saat mengirim data.", "Kesalahan Jaringan", "error");
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSyncAll = async () => {
    if (antriKirim.length === 0) return;
    if (isOffline) {
      showToast("Tidak dapat melakukan sinkronisasi saat offline.", "warning");
      return;
    }

    setSyncingAll(true);
    const invalidDocs = [];
    for (const item of antriKirim) {
      const validation = await validateDocument(item);
      if (!validation.isValid) {
        invalidDocs.push(`- ${item.kode} (${item.krt || 'Tanpa Nama'}): ${validation.errors.length} Galat`);
      }
    }
    setSyncingAll(false);

    if (invalidDocs.length > 0) {
      showAlert(
        `Beberapa dokumen memiliki galat/belum lengkap dan tidak dapat dikirim:\n\n${invalidDocs.join('\n')}\n\nSilakan lengkapi/perbaiki kuesioner tersebut terlebih dahulu.`,
        "Validasi Gagal",
        "error"
      );
      return;
    }

    const confirmed = await showConfirm(
      `Apakah Anda yakin ingin mengirim semua (${antriKirim.length}) dokumen yang ada di antrean ke server?`,
      "Kirim Semua Dokumen",
      "warning"
    );
    if (confirmed) {
      executeSyncAll();
    }
  };

  const executeSyncAll = async () => {
    setSyncingAll(true);
    try {
      const payloadDocs = antriKirim.map(item => ({
        id: item.id,
        kode: item.kode,
        kegiatan_id: item.kegiatan_id,
        krt: item.krt,
        alamat: item.alamat,
        kecamatan: item.kecamatan,
        desa: item.desa,
        sls: item.sls,
        sub_sls: item.sub_sls,
        status: "terkirim",
        is_prelist: item.is_prelist,
        values: filterTemporaryValues(item.kegiatan_id, item.values || {})
      }));

      const res = await api.dokumen.sync(currentUser.id, payloadDocs);
      if (res.success) {
        // 1. Download latest form structures
        await downloadFormStructures();

        // 2. Fetch fresh state and merge with local docs
        const freshDocs = await api.dokumen.getByPetugas(currentUser.id);
        const dedupedFresh = deduplicateDocs(freshDocs);
        const localDocs = await getLocalDocs();
        
        if (res.syncResults && Array.isArray(res.syncResults)) {
          res.syncResults.forEach(r => {
            const idx = localDocs.findIndex(d => d.kode === r.tempKode);
            if (idx > -1) {
              const oldKode = localDocs[idx].kode;
              localDocs[idx].id = r.id;
              localDocs[idx].kode = r.kode;
              localDocs[idx].sync = true;
              if (oldKode && oldKode !== r.kode && offlineDB.isAvailable()) {
                offlineDB.removeDokumen(oldKode).catch(e => 
                  console.warn("Gagal hapus dokumen lama di IndexedDB saat sync all:", e)
                );
              }
            }
          });
        }
        
        const finalDocs = mergeServerWithLocalDocs(dedupedFresh, localDocs);

        // Hybrid storage: simpan ke localStorage + IndexedDB
        try {
          localStorage.setItem(`offline_docs_${currentUser.id}`, JSON.stringify(finalDocs));
        } catch (e) {
          console.warn('localStorage penuh saat sync all:', e.message);
        }
        // Simpan juga ke IndexedDB
        for (const doc of finalDocs) {
          try {
            await offlineDB.saveDokumen({
              ...doc,
              sync_status: doc.sync_status || (doc.sync !== false ? 'synced' : 'pending')
            });
          } catch (idbErr) {
            console.warn('Gagal simpan ke IndexedDB:', idbErr);
          }
        }

        setLocalRtList(finalDocs);
        showToast(`Berhasil menyinkronkan ${antriKirim.length} dokumen!`, "success");
      } else {
        showAlert("Gagal sinkronisasi massal: " + res.message, "Gagal Sinkronisasi", "error");
      }
    } catch (e) {
      console.error("Sync all error:", e);
      showAlert("Terjadi kesalahan jaringan.", "Kesalahan Koneksi", "error");
    } finally {
      setSyncingAll(false);
    }
  };

  const handleDownloadData = async () => {
    if (isOffline) {
      showToast("Anda sedang offline. Silakan online terlebih dahulu.", "warning");
      return;
    }

    // Cek update aplikasi PWA terlebih dahulu sebelum mengunduh data baru
    if (window.__checkForAppUpdates) {
      const updating = await window.__checkForAppUpdates(false);
      if (updating) return;
    }

    setSyncingAll(true);
    try {
      // 1. Download latest form structures
      await downloadFormStructures();

      // 2. Fetch fresh documents and merge with local ones
      const docs = await api.dokumen.getByPetugas(currentUser.id);
      const dedupedDocs = deduplicateDocs(docs);
      const localDocs = await getLocalDocs();
      const finalDocs = mergeServerWithLocalDocs(dedupedDocs, localDocs);

      // Hybrid storage: simpan ke localStorage + IndexedDB
      try {
        localStorage.setItem(`offline_docs_${currentUser.id}`, JSON.stringify(finalDocs));
      } catch (e) {
        console.warn('localStorage penuh saat download:', e.message);
      }
      // Simpan juga ke IndexedDB
      for (const doc of finalDocs) {
        try {
          await offlineDB.saveDokumen({
            ...doc,
            sync_status: doc.sync_status || (doc.sync !== false ? 'synced' : 'pending')
          });
        } catch (idbErr) {
          console.warn('Gagal simpan ke IndexedDB:', idbErr);
        }
      }

      setLocalRtList(finalDocs);
      showToast("Data berhasil diunduh dari server!", "success");
    } catch (e) {
      console.error("Download error:", e);
      showAlert("Gagal mengunduh data: " + e.message, "Gagal Unduh", "error");
    } finally {
      setSyncingAll(false);
    }
  };

  const isLoading = loading || syncingAll || fetchingData;

  if (isLoading) {
    return (
      <PetugasLayout activeTab="petugas-sync" onNavigate={onNavigate}>
        <div className="min-h-screen bg-white animate-pulse pb-28">
          <div className="max-w-3xl mx-auto">
            {/* Header Skeleton */}
            <div 
              className="relative px-6 pb-8 border-b border-solid border-slate-100 overflow-hidden bg-gradient-to-b from-blue-50/40 to-white flex justify-between items-center"
              style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 0.75rem, 3rem)" }}
            >
              <div className="space-y-2">
                <div className="h-3 w-16 bg-slate-200 rounded"></div>
                <div className="h-6 w-32 bg-slate-350 rounded"></div>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-xl"></div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column Skeleton */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map(n => (
                      <div key={n} className="bg-slate-50 p-4 rounded-2xl flex flex-col items-center gap-2">
                        <div className="h-6 w-8 bg-slate-200 rounded"></div>
                        <div className="h-2.5 w-12 bg-slate-200 rounded"></div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="h-11 bg-slate-200 rounded-xl"></div>
                    <div className="h-11 bg-slate-100 rounded-xl"></div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                    <div className="h-3 w-16 bg-slate-200 rounded"></div>
                    <div className="h-3 w-full bg-slate-100 rounded"></div>
                  </div>
                </div>

                {/* Right Column Skeleton */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-28 bg-slate-200 rounded"></div>
                    <div className="h-6 w-16 bg-slate-100 rounded-lg"></div>
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3].map(n => (
                      <div key={n} className="bg-white p-4 rounded-xl border border-solid border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-48 bg-slate-200 rounded"></div>
                          <div className="h-3 w-56 bg-slate-100 rounded"></div>
                        </div>
                        <div className="w-12 h-8 bg-slate-100 rounded-lg flex-shrink-0"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PetugasLayout>
    );
  }

  return (
    <PetugasLayout activeTab="petugas-sync" onNavigate={onNavigate}>
      <div className="min-h-screen bg-white slide-up pb-28">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div 
            className="relative px-6 pb-8 border-b border-solid border-slate-100 overflow-hidden bg-gradient-to-b from-blue-50/40 to-white"
            style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 0.75rem, 3rem)" }}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-100/30 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-semibold">Sinkronisasi</p>
                <h2 className="text-lg font-extrabold text-slate-900 mt-0.5 tracking-tight">Kirim & Unduh</h2>
              </div>
              <button 
                onClick={handleRefreshServer}
                disabled={isLoading}
                className="w-10 h-10 bg-white hover:bg-slate-50 border border-solid border-slate-200/60 text-slate-500 hover:text-blue-600 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-sm disabled:opacity-50"
              >
                <RefreshCcw size={16} className={isLoading ? "animate-spin text-blue-600" : ""} />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-4 space-y-4">
                <div className="grid grid-cols-3 lg:grid-cols-1 gap-2.5 lg:gap-3">
                  <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-solid border-amber-100/70 rounded-2xl p-4 lg:py-3 lg:px-4.5 flex flex-col lg:flex-row lg:items-center lg:justify-between text-center lg:text-left shadow-sm relative overflow-hidden transition-all duration-300 hover:scale-[1.02]">
                    <p className="mono text-2xl lg:text-xl font-extrabold tracking-tight text-amber-700 order-1 lg:order-2">{antriKirim.length}</p>
                    <p className="text-[10px] lg:text-xs font-bold text-amber-600 uppercase mt-1 lg:mt-0 tracking-wider order-2 lg:order-1">Antri Kirim</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-solid border-emerald-100/70 rounded-2xl p-4 lg:py-3 lg:px-4.5 flex flex-col lg:flex-row lg:items-center lg:justify-between text-center lg:text-left shadow-sm relative overflow-hidden transition-all duration-300 hover:scale-[1.02]">
                    <p className="mono text-2xl lg:text-xl font-extrabold tracking-tight text-emerald-700 order-1 lg:order-2">{terkirim.length}</p>
                    <p className="text-[10px] lg:text-xs font-bold text-emerald-600 uppercase mt-1 lg:mt-0 tracking-wider order-2 lg:order-1">Terkirim</p>
                  </div>
                  <div className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border border-solid border-rose-100/70 rounded-2xl p-4 lg:py-3 lg:px-4.5 flex flex-col lg:flex-row lg:items-center lg:justify-between text-center lg:text-left shadow-sm relative overflow-hidden transition-all duration-300 hover:scale-[1.02]">
                    <p className="mono text-2xl lg:text-xl font-extrabold tracking-tight text-rose-700 order-1 lg:order-2">{ditolak.length}</p>
                    <p className="text-[10px] lg:text-xs font-bold text-rose-600 uppercase mt-1 lg:mt-0 tracking-wider order-2 lg:order-1">Ditolak</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={handleSyncAll}
                    disabled={antriKirim.length === 0 || syncingAll || isOffline}
                    className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border-0 cursor-pointer shadow-sm transition-all active:scale-[0.99] ${
                      antriKirim.length === 0 || syncingAll || isOffline
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-gradient-to-br from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white hover:shadow-lg hover:shadow-blue-500/20"
                    }`}
                  >
                    <Upload size={14} /> {syncingAll ? "Mengirim..." : "Kirim Semua Data"}
                  </button>
                  <button 
                    onClick={handleDownloadData}
                    disabled={syncingAll || isOffline}
                    className="w-full py-3.5 bg-white text-slate-600 border border-solid border-slate-200 hover:border-slate-350 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-all disabled:opacity-50 active:scale-[0.99]"
                  >
                    <Download size={14} /> Unduh Data Baru
                  </button>
                </div>

                <div className="bg-blue-50/50 border border-solid border-blue-100/70 rounded-2xl p-4.5 flex items-start gap-3">
                  <AlertCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-blue-800">Informasi</p>
                    <p className="text-[11px] text-blue-600/90 mt-1 leading-relaxed font-semibold">
                      {isOffline ? "Anda sedang offline. Hubungkan ke internet untuk melakukan sinkronisasi dengan server." : "Koneksi internet aktif. Anda siap melakukan kirim data hasil pencacahan."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="lg:col-span-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">Antrian Dokumen</h3>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-solid border-blue-100/50 px-2.5 py-1 rounded-lg">{queueItems.length} Total</span>
                </div>
                <div className="space-y-3">
                  {queueItems.map(item => (
                    <div key={item.kode} className="bg-white p-4.5 rounded-2xl border border-solid border-slate-100 flex items-center gap-4 hover:border-blue-200 hover:shadow-md hover:shadow-blue-500/5 transition-all group">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        item.status === 'terkirim' ? 'bg-emerald-50 text-emerald-600 border border-solid border-emerald-100/50' : 'bg-amber-50 text-amber-600 border border-solid border-amber-100/50'
                      }`}>
                        {item.status === 'terkirim' ? <CheckCircle size={16} /> : <Clock size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{item.kode} ({item.krt || "Nama KRT Kosong"})</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-semibold">{item.alamat || "Alamat belum diisi"}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {item.status === 'tersimpan' ? (
                          <button 
                            onClick={() => handleSyncItem(item)}
                            disabled={syncingAll || isOffline}
                            className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold border border-solid border-blue-100/50 cursor-pointer transition-all disabled:opacity-50 active:scale-95"
                          >
                            Kirim
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-solid border-emerald-100/50 px-3 py-1.5 rounded-lg">Terkirim</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {queueItems.length === 0 && (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl py-12 text-center">
                      <p className="text-xs text-slate-400 font-bold">Tidak ada dokumen di antrian.</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold">Selesaikan kuesioner terlebih dahulu untuk mengirim data.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </PetugasLayout>
  );
}

export default PetugasSync;

