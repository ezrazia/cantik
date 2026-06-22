import { useState, useEffect } from 'react';
import { Upload, Download, CheckCircle, Clock, AlertCircle, RefreshCcw, AlertTriangle } from "lucide-react";
import PetugasLayout from "../../components/layouts/PetugasLayout";
import { api } from "../../services/api";
import { offlineDB } from "../../services/offlineStorage";
import { useNotification } from "../../components/ui/NotificationContext";

const checkOptionTrigger = (val, triggerOptions) => {
  if (val === undefined || val === null || val === '') return false;
  if (typeof val === 'string' && val.trim().startsWith('{')) {
    try {
      const parsedVal = JSON.parse(val);
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
    const numericVal = parseFloat(val);
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
function PetugasSync({ onNavigate, currentUser, isOffline, loading }) {
  const { showToast, showAlert, showConfirm } = useNotification();
  const [localRtList, setLocalRtList] = useState([]);
  const [syncingAll, setSyncingAll] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);


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
      const docs = await api.dokumen.getByPetugas(currentUser.id);

      // Deduplicate sebelum menyimpan
      const dedupedDocs = deduplicateDocs(docs);

      // Hybrid storage: simpan ke localStorage + IndexedDB
      try {
        localStorage.setItem(`offline_docs_${currentUser.id}`, JSON.stringify(dedupedDocs));
      } catch (e) {
        console.warn('localStorage penuh saat refresh:', e.message);
      }
      // Simpan juga ke IndexedDB
      dedupedDocs.forEach(doc => {
        try {
          offlineDB.saveDokumen({ ...doc, sync_status: 'synced' });
        } catch (idbErr) {
          console.warn('Gagal simpan ke IndexedDB:', idbErr);
        }
      });

      setLocalRtList(dedupedDocs);
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
    
    const errors = [];
    const values = item.values || {};

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

    const getQuestionLoopCount = (q) => {
      if (!q) return 1;

      // 1. Parent relationship
      const parentId = q.parent_id || q.parentId;
      if (parentId) {
        const parent = questions.find(p => p.id === parentId);
        if (parent) {
          return getQuestionLoopCount(parent);
        }
      }

      // 2. Loop Group relationship
      const loopGroupName = getQuestionLoopGroup(q);
      if (loopGroupName) {
        const groupQs = questions.filter(x => getQuestionLoopGroup(x) === loopGroupName);
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
      const { isLoop, loopType, loopByQuestionId } = parseValidation(q.validation);
      if (isLoop) {
        if (loopByQuestionId) {
          const triggerValue = values[loopByQuestionId];
          const parsedTrigger = parseInt(triggerValue, 10);
          return isNaN(parsedTrigger) ? 0 : Math.max(0, parsedTrigger);
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
          return parsed[idx] || "";
        } else if (typeof parsed === 'object' && parsed !== null) {
          return parsed[idx] || "";
        }
      } catch (e) {}
      return idx === 0 ? raw : "";
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

    const isQuestionVisibleIgnoreBlock = (q, activeInstanceIdx = null) => {
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

      // Parent value check is bypassed because parents with sub-questions do not render inputs of their own.
      // Conditional visibility is handled properly by show_if rules.
      
      const skippers = questions.filter(quest => quest.skip_target && quest.skip_logic !== undefined && quest.skip_logic !== null);
      for (const skipper of skippers) {
        let matchesTrigger = false;
        let isJson = false;

        try {
          const parsed = JSON.parse(skipper.skip_logic);
          if (parsed && parsed.conditions) {
            isJson = true;
            const operator = parsed.operator || "AND";
            const results = parsed.conditions.map(c => evaluateCondition(c, resolvedValues));
            matchesTrigger = operator === "OR" ? results.some(r => r) : results.every(r => r);
          }
        } catch (e) {}

        if (!isJson) {
          const skipperVal = resolvedValues[skipper.id];
          const hasValue = skipperVal !== undefined && skipperVal !== null && skipperVal !== '';
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
        }
        
        if (matchesTrigger) {
          const allOrdered = [];
          blocks.forEach(b => {
            const blockQs = questions.filter(x => x.blok_id === b.id);
            const mainQs = blockQs.filter(x => !x.parent_id);
            const addChildrenRecursive = (parentId) => {
              const children = blockQs.filter(x => x.parent_id === parentId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
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

          const skipperIdx = allOrdered.findIndex(x => x.id === skipper.id);
          const targetIdx = allOrdered.findIndex(x => x.id === skipper.skip_target);
          const currentIdx = allOrdered.findIndex(x => x.id === q.id);

          if (skipperIdx !== -1 && targetIdx !== -1 && currentIdx !== -1) {
            if (targetIdx === skipperIdx + 1 && q.id === skipper.skip_target) {
              if (!matchesTrigger) return false;
            }
            if (currentIdx > skipperIdx && currentIdx < targetIdx) {
              return false;
            }
          }
        }
      }
      return true;
    };

    const getSkipTargetBlock = (skipTargetId) => {
      const targetQ = questions.find(q => q.id === skipTargetId);
      if (!targetQ) return null;
      const targetBlock = blocks.find(b => b.id === targetQ.blok_id || b.kode === targetQ.blok_id);
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
        const skipperQ = questions.find(q => q.id === skip.questionId);
        if (!skipperQ) return;
        const skipperBlock = blocks.find(b => b.id === skipperQ.blok_id || b.kode === skipperQ.blok_id);
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

    const isBlockVisible = (block) => {
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
            const results = parsed.conditions.map(c => evaluateCondition(c, values));
            const met = operator === "OR" ? results.some(r => r) : results.every(r => r);
            if (met) return false;
          }
        } catch (e) {}
      }

      // Check if all questions in this block are hidden by logic.
      const blockQuestions = questions.filter(q => q.blok_id === block.id || q.blok_id === block.kode);
      if (blockQuestions.length > 0) {
        const hasAnyVisibleQuestion = blockQuestions.some(q => isQuestionVisibleIgnoreBlock(q));
        if (!hasAnyVisibleQuestion) {
          return false;
        }
      }

      return true;
    };

    const isQuestionVisible = (q, activeInstanceIdx = null) => {
      const block = blocks.find(b => b.id === q.blok_id || b.kode === q.blok_id);
      if (block && !isBlockVisible(block)) {
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

      for (let idx = 0; idx < loopCount; idx++) {
        // Evaluate visibility relative to the loop index/instance!
        if (!isQuestionVisible(q, (loopCount > 1 || manualCount !== null) ? idx : null)) continue;
        const val = loopCount > 1 ? getLoopValue(q.id, idx) : values[q.id];
        const block = blocks.find(b => b.id === q.blok_id);
        const blockName = block ? block.kode : "Form";
        const suffix = loopCount > 1 ? ` ke-${idx + 1}` : "";

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
          }
        } else if (q.required) {
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
    if (!valuesObj) return {};
    const filtered = { ...valuesObj };
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
        // Fetch fresh state from server
        const freshDocs = await api.dokumen.getByPetugas(currentUser.id);

        // Deduplicate sebelum menyimpan
        const dedupedFresh = deduplicateDocs(freshDocs);

        // Hybrid storage: simpan ke localStorage + IndexedDB
        try {
          localStorage.setItem(`offline_docs_${currentUser.id}`, JSON.stringify(dedupedFresh));
        } catch (e) {
          console.warn('localStorage penuh saat sync:', e.message);
        }
        // Simpan juga ke IndexedDB
        dedupedFresh.forEach(doc => {
          try {
            offlineDB.saveDokumen({ ...doc, sync_status: 'synced' });
          } catch (idbErr) {
            console.warn('Gagal simpan ke IndexedDB:', idbErr);
          }
        });

        setLocalRtList(dedupedFresh);
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
        // Fetch fresh state from server
        const freshDocs = await api.dokumen.getByPetugas(currentUser.id);

        // Deduplicate sebelum menyimpan
        const dedupedFresh = deduplicateDocs(freshDocs);

        // Hybrid storage: simpan ke localStorage + IndexedDB
        try {
          localStorage.setItem(`offline_docs_${currentUser.id}`, JSON.stringify(dedupedFresh));
        } catch (e) {
          console.warn('localStorage penuh saat sync all:', e.message);
        }
        // Simpan juga ke IndexedDB
        dedupedFresh.forEach(doc => {
          try {
            offlineDB.saveDokumen({ ...doc, sync_status: 'synced' });
          } catch (idbErr) {
            console.warn('Gagal simpan ke IndexedDB:', idbErr);
          }
        });

        setLocalRtList(dedupedFresh);
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
    setSyncingAll(true);
    try {
      const docs = await api.dokumen.getByPetugas(currentUser.id);

      // Hybrid storage: simpan ke localStorage + IndexedDB
      try {
        localStorage.setItem(`offline_docs_${currentUser.id}`, JSON.stringify(docs));
      } catch (e) {
        console.warn('localStorage penuh saat download:', e.message);
      }
      // Simpan juga ke IndexedDB
      docs.forEach(doc => {
        try {
          offlineDB.saveDokumen({ ...doc, sync_status: 'synced' });
        } catch (idbErr) {
          console.warn('Gagal simpan ke IndexedDB:', idbErr);
        }
      });

      setLocalRtList(docs);
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
            <div className="relative px-6 pt-12 pb-8 border-b border-solid border-slate-100 overflow-hidden bg-gradient-to-b from-blue-50/40 to-white flex justify-between items-center">
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
          <div className="relative px-6 pt-12 pb-8 border-b border-solid border-slate-100 overflow-hidden bg-gradient-to-b from-blue-50/40 to-white">
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

