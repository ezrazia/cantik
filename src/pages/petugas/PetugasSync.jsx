import { useState, useEffect } from 'react';
import { Upload, Download, CheckCircle, Clock, AlertCircle, RefreshCcw, AlertTriangle } from "lucide-react";
import PetugasLayout from "../../components/layouts/PetugasLayout";
import { api } from "../../services/api";
import { offlineDB } from "../../services/offlineStorage";

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
  const [localRtList, setLocalRtList] = useState([]);
  const [syncingAll, setSyncingAll] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null
  });

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

    const isQuestionVisible = (q, activeInstanceIdx = null) => {
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
      
      const { isLoop, loopType, loopByQuestionId } = parseValidation(q.validation);
      let loopCount = 1;
      const manualCount = getManualLoopCount(q);
      if (manualCount !== null) {
        loopCount = manualCount;
      } else if (isLoop && loopByQuestionId) {
        const triggerValue = values[loopByQuestionId];
        const parsedTrigger = parseInt(triggerValue, 10);
        loopCount = isNaN(parsedTrigger) ? 0 : parsedTrigger;
      }

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
      alert("Tidak dapat mengirim data saat offline. Silakan hubungkan internet terlebih dahulu.");
      return;
    }

    setSyncingAll(true);
    const validation = await validateDocument(item);
    setSyncingAll(false);

    if (!validation.isValid) {
      alert(`Gagal mengirim dokumen ${item.kode} karena belum lengkap:\n\n${validation.errors.join('\n')}\n\nSilakan perbaiki isian kuesioner terlebih dahulu.`);
      return;
    }

    askConfirmation(
      "Kirim Dokumen",
      `Apakah Anda yakin ingin mengirim dokumen ${item.krt || 'KRT'} (${item.kode}) ke server BPS?`,
      () => executeSyncItem(item)
    );
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
      } else {
        alert("Gagal sinkronisasi: " + res.message);
      }
    } catch (e) {
      console.error("Sync error:", e);
      alert("Terjadi kesalahan jaringan saat mengirim data.");
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSyncAll = async () => {
    if (antriKirim.length === 0) return;
    if (isOffline) {
      alert("Tidak dapat melakukan sinkronisasi saat offline.");
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
      alert(`Beberapa dokumen memiliki galat/belum lengkap dan tidak dapat dikirim:\n\n${invalidDocs.join('\n')}\n\nSilakan lengkapi/perbaiki kuesioner tersebut terlebih dahulu.`);
      return;
    }

    askConfirmation(
      "Kirim Semua Dokumen",
      `Apakah Anda yakin ingin mengirim semua (${antriKirim.length}) dokumen yang ada di antrean ke server?`,
      executeSyncAll
    );
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
      } else {
        alert("Gagal sinkronisasi massal: " + res.message);
      }
    } catch (e) {
      console.error("Sync all error:", e);
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setSyncingAll(false);
    }
  };

  const handleDownloadData = async () => {
    if (isOffline) {
      alert("Anda sedang offline. Silakan online terlebih dahulu.");
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
      alert("Data berhasil diunduh dari server!");
    } catch (e) {
      console.error("Download error:", e);
      alert("Gagal mengunduh data: " + e.message);
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
            <div className="px-6 pt-12 pb-6 border-b border-solid border-slate-100 flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-3 w-16 bg-slate-200 rounded"></div>
                <div className="h-6 w-32 bg-slate-300 rounded"></div>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-lg"></div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column Skeleton */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map(n => (
                      <div key={n} className="bg-slate-50 p-4 rounded-xl flex flex-col items-center gap-2">
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
          <div className="px-6 pt-12 pb-6 border-b border-solid border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Sinkronisasi</p>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Kirim & Unduh</h2>
              </div>
              <button 
                onClick={handleRefreshServer}
                disabled={isLoading}
                className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border-0 cursor-pointer hover:bg-blue-100 transition-all disabled:opacity-50"
              >
                <RefreshCcw size={18} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-4 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 p-4 rounded-xl text-center">
                    <p className="mono text-xl font-bold text-blue-600">{antriKirim.length}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Antri Kirim</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl text-center">
                    <p className="mono text-xl font-bold text-emerald-600">{terkirim.length}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Terkirim</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl text-center">
                    <p className="mono text-xl font-bold text-red-500">{ditolak.length}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Ditolak</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <button 
                    onClick={handleSyncAll}
                    disabled={antriKirim.length === 0 || syncingAll || isOffline}
                    className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border-0 cursor-pointer transition-all ${
                      antriKirim.length === 0 || syncingAll || isOffline
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
                    }`}
                  >
                    <Upload size={16} /> {syncingAll ? "Mengirim..." : "Kirim Semua Data"}
                  </button>
                  <button 
                    onClick={handleDownloadData}
                    disabled={syncingAll || isOffline}
                    className="w-full py-3.5 bg-white text-slate-600 border border-solid border-slate-200 rounded-xl font-medium text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-all disabled:opacity-50"
                  >
                    <Download size={16} /> Unduh Data Baru
                  </button>
                </div>

                <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-800">Informasi</p>
                    <p className="text-xs text-blue-600 mt-0.5 leading-relaxed font-medium">
                      {isOffline ? "Anda sedang offline. Hubungkan ke internet untuk melakukan sinkronisasi dengan server." : "Koneksi internet aktif. Anda siap melakukan kirim data hasil pencacahan."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="lg:col-span-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">Antrian Dokumen</h3>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">{queueItems.length} Total</span>
                </div>
                <div className="space-y-2">
                  {queueItems.map(item => (
                    <div key={item.kode} className="bg-white p-4 rounded-xl border border-solid border-slate-100 flex items-center gap-4 hover:border-slate-200 transition-all group">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        item.status === 'terkirim' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {item.status === 'terkirim' ? <CheckCircle size={18} /> : <Clock size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{item.kode} ({item.krt || "Nama KRT Kosong"})</p>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">{item.alamat || "Alamat belum diisi"}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {item.status === 'tersimpan' ? (
                          <button 
                            onClick={() => handleSyncItem(item)}
                            disabled={syncingAll || isOffline}
                            className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold border-0 cursor-pointer transition-all disabled:opacity-50"
                          >
                            Kirim
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">Terkirim</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {queueItems.length === 0 && (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl py-12 text-center">
                      <p className="text-xs text-slate-400 font-semibold">Tidak ada dokumen di antrian.</p>
                      <p className="text-[10px] text-slate-400 mt-1">Selesaikan kuesioner terlebih dahulu untuk mengirim data.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generic Double-Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden" style={{ animation: "scaleUp 0.15s ease-out both" }}>
            <style>{`
              @keyframes scaleUp {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
            `}</style>
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
    </PetugasLayout>
  );
}

export default PetugasSync;

