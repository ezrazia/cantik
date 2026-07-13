import { useState, useEffect } from "react";
import { WifiOff, Wifi, Bell, MapPin, FileText, Upload, Download, ChevronRight, CheckCircle, AlertCircle, Calendar, RefreshCw, Smartphone, Database, Save, Send, AlertTriangle, ChevronLeft } from "lucide-react";
import PetugasLayout from "../../components/layouts/PetugasLayout";
import { api } from "../../services/api";
import { offlineDB } from "../../services/offlineStorage";
import { useNotification } from "../../components/ui/NotificationContext";

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

/**
 * Halaman beranda Petugas — minimalis dan clean.
 *
 * @param {Object} props
 * @param {(screen: string) => void} props.onNavigate
 * @param {boolean} props.isOffline
 * @param {(value: boolean) => void} props.setIsOffline
 * @param {Array} props.petugas
 * @param {Array} props.activities
 * @param {Object} props.currentUser
 * @returns {React.ReactElement}
 */
function PetugasHome({ onNavigate, isOffline, setIsOffline, petugas, activities, currentUser, loading }) {
  const { showToast, showAlert } = useNotification();
  const [documents, setDocuments] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadTime, setDownloadTime] = useState(localStorage.getItem(`last_download_${currentUser.id}`) || null);

  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);

  const notes = [
    {
      icon: <Smartphone className="text-blue-600" size={18} />,
      text: "Pastikan Aplikasi CANTIK sudah diinstall di beranda handphone, baik Android maupun iOS."
    },
    {
      icon: <Database className="text-indigo-600" size={18} />,
      text: "Jangan clear cache browser agar data tidak hilang."
    },
    {
      icon: <RefreshCw className="text-emerald-600" size={18} />,
      text: "Pastikan untuk unduh kuesioner terbaru dan refresh di tombol yang disediakan untuk mendapatkan yang terbaru."
    },
    {
      icon: <Save className="text-amber-600" size={18} />,
      text: "Pastikan untuk simpan sementara agar data tidak hilang."
    },
    {
      icon: <Send className="text-violet-600" size={18} />,
      text: "Langsung kirim kuesioner jawaban di menu Kirim agar langsung terkirim ke server."
    },
    {
      icon: <AlertTriangle className="text-rose-600" size={18} />,
      text: "Perhatikan warning dan error saat pengisian kuesioner."
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentNoteIndex((prev) => (prev === notes.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [notes.length]);

  const isLoading = loading || localLoading;

  const currentPetugas = petugas?.find(p => p.id === currentUser.id) || currentUser;

  const handleDownloadOfflineData = async () => {
    if (isOffline) {
      showToast("Anda sedang dalam mode offline. Silakan aktifkan mode online untuk mengunduh kuesioner.", "warning");
      return;
    }

    // Cek update aplikasi PWA terlebih dahulu sebelum mengunduh data offline
    if (window.__checkForAppUpdates) {
      const updating = await window.__checkForAppUpdates(false);
      if (updating) return;
    }

    setIsDownloading(true);
    try {
      // 1. Download documents (prelist) with deduplication
      const docs = await api.dokumen.getByPetugas(currentUser.id);
      let dedupedDocs = deduplicateDocs(docs);

      // Pertahankan draft lokal agar tidak tertimpa oleh versi server
      const storageKey = `offline_docs_${currentUser.id}`;
      let localDocs = [];
      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) localDocs = JSON.parse(cached);
      } catch (e) {
        console.error("Gagal mem-parsing draft lokal:", e);
      }

      if (localDocs.length === 0 && offlineDB.isAvailable()) {
        try {
          const idbDocs = await offlineDB.getAllDokumen();
          if (idbDocs && idbDocs.length > 0) localDocs = idbDocs;
        } catch (e) { }
      }

      localDocs.forEach(localDoc => {
        const apiIdx = dedupedDocs.findIndex(d =>
          (d.id && localDoc.id && d.id === localDoc.id) ||
          (d.kode && d.kode === localDoc.kode)
        );

        if (apiIdx >= 0) {
          const apiDoc = dedupedDocs[apiIdx];
          if (localDoc.kode && apiDoc.kode && localDoc.kode !== apiDoc.kode) {
            if (offlineDB.isAvailable()) {
              offlineDB.removeDokumen(localDoc.kode).catch(e => 
                console.warn("Gagal hapus dokumen lama di IndexedDB saat download:", e)
              );
            }
          }
          const localValues = localDoc.values || {};
          const apiValues = apiDoc.values || {};

          const mergedValues = { ...apiValues };
          Object.keys(localValues).forEach(k => {
            const val = localValues[k];
            if (val !== undefined && val !== null && val !== '') {
              mergedValues[k] = val;
            }
          });

          const localTime = new Date(localDoc.updated_at || localDoc.created_at || 0).getTime();
          const apiTime = new Date(apiDoc.updated_at || apiDoc.created_at || 0).getTime();
          if (localTime > apiTime && localDoc.sync === false) {
            dedupedDocs[apiIdx] = {
              ...apiDoc,
              ...localDoc,
              values: mergedValues
            };
          } else {
            dedupedDocs[apiIdx] = {
              ...localDoc,
              ...apiDoc,
              values: mergedValues,
              sync: (apiDoc.status === 'terkirim' || apiDoc.review_status === 'approved') ? true : (localDoc.sync === false ? false : apiDoc.sync)
            };
          }
        } else if (localDoc.sync === false) {
          dedupedDocs.push(localDoc);
        }
      });

      dedupedDocs = deduplicateDocs(dedupedDocs);

      setDocuments(dedupedDocs);
      localStorage.setItem(`offline_docs_${currentUser.id}`, JSON.stringify(dedupedDocs));

      // Simpan dokumen ke IndexedDB
      if (offlineDB.isAvailable()) {
        for (const doc of dedupedDocs) {
          await offlineDB.saveDokumen({
            ...doc,
            sync_status: doc.sync_status || (doc.sync !== false ? 'synced' : 'pending')
          });
        }
      }

      // 2. Download form structures for all assigned activities
      if (officerActivities && officerActivities.length > 0) {
        for (const act of officerActivities) {
          const res = await api.form.getStructure(act.id);
          if (res && res.success) {
            localStorage.setItem(`form_structure_${act.id}`, JSON.stringify({
              blocks: res.blocks,
              questions: res.questions
            }));
            // Simpan struktur formulir ke IndexedDB
            if (offlineDB.isAvailable()) {
              await offlineDB.saveFormStructure(act.id, res.blocks, res.questions);
            }
          }
        }
      }

      // 3. Save download time stamp
      const now = new Date();
      const timeStr = now.toLocaleDateString("id-ID", { day: 'numeric', month: 'short' }) + " " + now.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
      localStorage.setItem(`last_download_${currentUser.id}`, timeStr);
      setDownloadTime(timeStr);

      showAlert(
        "Kuesioner dan seluruh data prelist telah berhasil disimpan ke perangkat Anda secara luring (offline). Anda kini dapat mulai melakukan pencacahan di lapangan meskipun tanpa koneksi internet.",
        "Unduhan Selesai",
        "success"
      );
    } catch (err) {
      console.error("Gagal mengunduh kuesioner offline:", err);
      showAlert("Terjadi kesalahan saat mengunduh data: " + err.message, "Gagal Mengunduh", "error");
    } finally {
      setIsDownloading(false);
    }
  };

  const loadDocs = async () => {
    if (isOffline) {
      // Load dari localStorage dengan fallback ke IndexedDB
      const cached = localStorage.getItem(`offline_docs_${currentUser.id}`);
      let localDocs = [];
      if (cached) {
        try {
          localDocs = JSON.parse(cached);
        } catch (e) {
          console.error("Gagal parse cached offline docs:", e);
        }
      }

      if (localDocs.length === 0 && offlineDB.isAvailable()) {
        try {
          const idbDocs = await offlineDB.getAllDokumen();
          if (idbDocs && idbDocs.length > 0) {
            localDocs = idbDocs;
          }
        } catch (idbErr) {
          console.error("Gagal load dari IndexedDB:", idbErr);
        }
      }
      setDocuments(deduplicateDocs(localDocs));
    } else {
      setLocalLoading(true);
      try {
        let docs = await api.dokumen.getByPetugas(currentUser.id);
        
        // Also fetch PML review docs for activities where user is PML
        const activitiesForPml = (currentPetugas?.projects || []).map(projName => {
          const act = activities?.find(a => a.name === projName);
          return act ? { ...act, role: currentPetugas.projectRoles?.[projName] || "PCL" } : null;
        }).filter(act => act && act.status !== "draft" && act.status !== "selesai" && act.role === "PML");

        for (const act of activitiesForPml) {
          const reviewDocs = await api.dokumen.getForReview(act.id, currentUser.id);
          // merge without duplicates
          const existingIds = new Set(docs.map(d => d.id));
          const existingKodes = new Set(docs.map(d => d.kode));
          
          reviewDocs.forEach(rd => {
            if (!existingIds.has(rd.id) && !existingKodes.has(rd.kode)) {
              docs.push(rd);
            }
          });
        }

        // Merge with local unsynced docs to prevent data loss
        const storageKey = `offline_docs_${currentUser.id}`;
        let localDocs = [];
        try {
          const cached = localStorage.getItem(storageKey);
          if (cached) localDocs = JSON.parse(cached);
        } catch (e) { }

        if (localDocs.length === 0 && offlineDB.isAvailable()) {
          try {
            const idbDocs = await offlineDB.getAllDokumen();
            if (idbDocs && idbDocs.length > 0) localDocs = idbDocs;
          } catch (e) { }
        }

        const mergedDocs = [...docs];
        localDocs.forEach(localDoc => {
          const apiIdx = mergedDocs.findIndex(d =>
            (d.id && localDoc.id && d.id === localDoc.id) ||
            (d.kode && d.kode === localDoc.kode)
          );

          if (apiIdx >= 0) {
            const apiDoc = mergedDocs[apiIdx];
            if (localDoc.kode && apiDoc.kode && localDoc.kode !== apiDoc.kode) {
              if (offlineDB.isAvailable()) {
                offlineDB.removeDokumen(localDoc.kode).catch(e => 
                  console.warn("Gagal hapus dokumen lama di IndexedDB saat loadDocs:", e)
                );
              }
            }
            const localValues = localDoc.values || {};
            const apiValues = apiDoc.values || {};

            const mergedValues = { ...apiValues };
            Object.keys(localValues).forEach(k => {
              const val = localValues[k];
              if (val !== undefined && val !== null && val !== '') {
                mergedValues[k] = val;
              }
            });

            const localTime = new Date(localDoc.updated_at || localDoc.created_at || 0).getTime();
            const apiTime = new Date(apiDoc.updated_at || apiDoc.created_at || 0).getTime();
            if (localTime > apiTime && localDoc.sync === false) {
              mergedDocs[apiIdx] = {
                ...apiDoc,
                ...localDoc,
                values: mergedValues
              };
            } else {
              mergedDocs[apiIdx] = {
                ...localDoc,
                ...apiDoc,
                values: mergedValues,
                sync: (apiDoc.status === 'terkirim' || apiDoc.review_status === 'approved') ? true : (localDoc.sync === false ? false : apiDoc.sync)
              };
            }
          } else if (localDoc.sync === false) {
            mergedDocs.push(localDoc);
          }
        });

        const dedupedDocs = deduplicateDocs(mergedDocs);
        setDocuments(dedupedDocs);
        // Sync cache ke localStorage dan IndexedDB
        localStorage.setItem(storageKey, JSON.stringify(dedupedDocs));
        if (offlineDB.isAvailable()) {
          for (const doc of dedupedDocs) {
            await offlineDB.saveDokumen({
              ...doc,
              sync_status: doc.sync_status || (doc.sync !== false ? 'synced' : 'pending')
            });
          }
        }
      } catch (err) {
        console.error("Gagal load dokumen dari server:", err);
        // Fallback to cache if request fails
        const cached = localStorage.getItem(`offline_docs_${currentUser.id}`);
        let localDocs = [];
        if (cached) {
          try {
            localDocs = JSON.parse(cached);
          } catch (e) {
            console.error("Gagal parse cached offline docs:", e);
          }
        }
        if (localDocs.length === 0 && offlineDB.isAvailable()) {
          try {
            const idbDocs = await offlineDB.getAllDokumen();
            if (idbDocs && idbDocs.length > 0) {
              localDocs = idbDocs;
            }
          } catch (idbErr) {
            console.error("Gagal load dari IndexedDB:", idbErr);
          }
        }
        setDocuments(deduplicateDocs(localDocs));
      } finally {
        setLocalLoading(false);
      }
    }
  };

  useEffect(() => {
    loadDocs();
  }, [currentUser.id, isOffline]);

  const officerActivities = (currentPetugas.projects || [])
    .map(projName => {
      const act = activities?.find(a => a.name === projName);
      if (!act) return null;
      return {
        ...act,
        role: currentPetugas.projectRoles?.[projName] || "PCL"
      };
    })
    .filter(act => act && act.status !== "draft" && act.status !== "selesai");

  // Calculate live statistics
  const targetCount = documents.length;
  const selesaiCount = documents.filter(d => d.review_status === 'approved').length;
  const kirimCount = documents.filter(d => d.status === 'terkirim' && d.review_status !== 'approved' && d.review_status !== 'rejected').length;
  const ditolakCount = documents.filter(d => d.review_status === 'rejected').length;
  const antriKirimCount = documents.filter(d => d.status === 'tersimpan').length;

  if (isLoading) {
    return (
      <PetugasLayout activeTab="petugas-home" onNavigate={onNavigate}>
        <div className="min-h-screen bg-white animate-pulse pb-24">
          <div className="max-w-3xl mx-auto">
            {/* Header Skeleton */}
            <div
              className="px-6 pb-6 border-b border-solid border-slate-100 flex justify-between items-start"
              style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 0.75rem, 3rem)" }}
            >
              <div className="space-y-2">
                <div className="h-3 w-24 bg-slate-200 rounded"></div>
                <div className="h-6 w-48 bg-slate-300 rounded"></div>
                <div className="h-3.5 w-32 bg-slate-200 rounded"></div>
              </div>
              <div className="flex gap-2">
                <div className="w-16 h-8 bg-slate-200 rounded-lg"></div>
                <div className="w-9 h-9 bg-slate-200 rounded-lg"></div>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Stats Skeleton */}
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="bg-slate-100 rounded-xl p-4 flex flex-col items-center gap-2">
                    <div className="h-8 w-12 bg-slate-200 rounded"></div>
                    <div className="h-3 w-10 bg-slate-200 rounded"></div>
                  </div>
                ))}
              </div>

              {/* Actions Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[1, 2, 3].map(n => (
                  <div key={n} className="border border-slate-100 bg-white rounded-xl p-5 h-32 flex flex-col justify-between">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg"></div>
                    <div className="space-y-1.5 mt-4">
                      <div className="h-4 w-24 bg-slate-200 rounded"></div>
                      <div className="h-3 w-32 bg-slate-100 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Kegiatan Skeleton */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="h-5 w-36 bg-slate-300 rounded"></div>
                  <div className="h-3.5 w-16 bg-slate-200 rounded"></div>
                </div>
                <div className="space-y-3">
                  {[1, 2].map(n => (
                    <div key={n} className="bg-white rounded-2xl p-5 border border-slate-100 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1 pr-4">
                          <div className="h-4 w-48 bg-slate-200 rounded"></div>
                          <div className="h-3 w-full bg-slate-100 rounded"></div>
                        </div>
                        <div className="w-20 h-6 bg-slate-200 rounded-full"></div>
                      </div>
                      <div className="pt-3 border-t border-solid border-slate-50 flex justify-between items-center gap-2">
                        <div className="h-3 w-28 bg-slate-100 rounded"></div>
                        <div className="flex gap-1.5 flex-wrap">
                          <div className="h-5 w-10 bg-slate-100 rounded"></div>
                          <div className="h-5 w-12 bg-slate-100 rounded"></div>
                          <div className="h-5 w-12 bg-slate-100 rounded"></div>
                          <div className="h-5 w-10 bg-slate-100 rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </PetugasLayout>
    );
  }

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <PetugasLayout activeTab="petugas-home" onNavigate={onNavigate}>
      <div className="min-h-screen bg-white slide-up pb-24">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div
            className="relative px-6 pb-8 border-b border-solid border-slate-100 overflow-hidden bg-gradient-to-b from-blue-50/40 to-white"
            style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 0.75rem, 3rem)" }}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-100/30 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-base font-bold shadow-md shadow-blue-500/20">
                  {getInitials(currentPetugas.name || currentPetugas.username)}
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Desa Cantik Portal</p>
                  <h2 className="text-lg font-extrabold text-slate-900 mt-0.5 tracking-tight">{currentPetugas.name || currentPetugas.username}</h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin size={11} className="text-blue-500" />
                    <span className="text-[11px] text-slate-500 font-semibold">Desa {currentPetugas.desa || "Belum Ditentukan"}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-solid transition-all ${isOffline
                      ? "bg-rose-50 text-rose-600 border-rose-100/50"
                      : "bg-emerald-50 text-emerald-700 border-emerald-100/50"
                    }`}>
                  {isOffline ? <WifiOff size={12} /> : <Wifi size={12} />}
                  <span className="hidden sm:inline">{isOffline ? "Offline" : "Online"}</span>
                </div>
                <button
                  onClick={async () => {
                    if (!isOffline && window.__checkForAppUpdates) {
                      const updating = await window.__checkForAppUpdates(false);
                      if (updating) return;
                    }
                    loadDocs();
                  }}
                  className="w-9 h-9 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-400 hover:text-slate-650 transition-all border border-solid border-slate-200/50 cursor-pointer rounded-xl flex items-center justify-center"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Offline banner */}
            {isOffline && (
              <div className="mb-6 px-4 py-3 bg-amber-50 border border-solid border-amber-100 rounded-xl flex items-start gap-3" style={{ animation: 'slideUp 0.3s ease' }}>
                <WifiOff size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Mode Offline Aktif</p>
                  <p className="text-xs text-amber-600 mt-0.5">Data tersimpan otomatis di perangkat dan siap disinkronisasi.</p>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3.5 mb-8">
              {[
                {
                  l: "Target",
                  v: targetCount,
                  bg: "bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-100/70",
                  c: "text-blue-700"
                },
                {
                  l: "Selesai",
                  v: selesaiCount,
                  bg: "bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-100/70",
                  c: "text-emerald-700"
                },
                {
                  l: "Kirim",
                  v: kirimCount,
                  bg: "bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-100/70",
                  c: "text-indigo-700"
                },
                {
                  l: "Ditolak",
                  v: ditolakCount,
                  bg: "bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-rose-100/70",
                  c: "text-rose-700"
                },
              ].map(s => (
                <div key={s.l} className={`rounded-2xl p-4 border border-solid ${s.bg} text-center shadow-sm relative overflow-hidden transition-all duration-300 hover:scale-[1.02]`}>
                  <p className={`mono text-2xl font-extrabold tracking-tight ${s.c}`}>{s.v}</p>
                  <p className={`text-[10px] font-bold ${s.c} uppercase mt-1 tracking-wider`}>{s.l}</p>
                </div>
              ))}
            </div>

            {/* Note Carousel */}
            <div className="bg-gradient-to-r from-amber-50/65 to-yellow-50/70 border border-solid border-amber-200/50 rounded-2xl p-4 mb-8 relative overflow-hidden transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/15 rounded-full blur-2xl pointer-events-none -mr-8 -mt-8" />
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white shadow-sm border border-solid border-amber-100 text-amber-600">
                    {notes[currentNoteIndex].icon}
                  </span>
                  <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">💡 Petunjuk Penting</span>
                </div>
                {/* Navigation arrows */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentNoteIndex((prev) => (prev === 0 ? notes.length - 1 : prev - 1))}
                    className="w-6 h-6 rounded-lg bg-white hover:bg-slate-50 active:scale-95 border border-solid border-slate-200/50 text-slate-400 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <button
                    onClick={() => setCurrentNoteIndex((prev) => (prev === notes.length - 1 ? 0 : prev + 1))}
                    className="w-6 h-6 rounded-lg bg-white hover:bg-slate-50 active:scale-95 border border-solid border-slate-200/50 text-slate-400 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>

              {/* Note Content */}
              <div className="min-h-[44px] flex items-center px-1 overflow-hidden">
                <p
                  key={currentNoteIndex}
                  className="text-sm font-semibold text-slate-750 leading-relaxed fade-in"
                >
                  {notes[currentNoteIndex].text}
                </p>
              </div>

              {/* Progress Dots */}
              <div className="flex items-center gap-1.5 mt-3 px-1">
                {notes.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentNoteIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer p-0 border-0 ${currentNoteIndex === idx ? "w-4.5 bg-amber-500" : "w-1.5 bg-amber-200"
                      }`}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 mb-10">
              <button onClick={() => onNavigate("questionnaire")}
                className="bg-white rounded-2xl p-5 border border-solid border-slate-100 text-left cursor-pointer transition-all hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/5 group flex flex-col justify-between min-h-[140px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none -mr-6 -mt-6" />
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                  <FileText size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors">Isi Kuesioner</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-semibold">Mulai mengisi dokumen baru atau edit draf yang tersimpan</p>
                </div>
              </button>

              <button onClick={() => onNavigate("petugas-sync")}
                className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-left cursor-pointer border-0 transition-all hover:shadow-lg hover:shadow-blue-600/25 group active:scale-[0.98] flex flex-col justify-between min-h-[140px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-6 -mt-6" />
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-white/15 group-hover:bg-white/20 transition-colors">
                  <Upload size={18} color="white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white tracking-tight">Sinkronisasi Data</p>
                  <p className="text-[11px] mt-1 text-blue-100/90 font-medium">
                    {antriKirimCount > 0 ? `${antriKirimCount} dokumen menunggu dikirim` : "Semua data lokal telah terkirim"}
                  </p>
                </div>
              </button>

              <button
                onClick={handleDownloadOfflineData}
                disabled={isDownloading}
                className="bg-white rounded-2xl p-5 border border-solid border-slate-100 text-left cursor-pointer transition-all hover:border-slate-300 hover:shadow-md group disabled:opacity-75 disabled:cursor-not-allowed flex flex-col justify-between min-h-[140px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-full blur-2xl pointer-events-none -mr-6 -mt-6" />
                <div className="flex items-start justify-between w-full">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                    {isDownloading ? (
                      <RefreshCw size={16} className="text-blue-600 animate-spin" />
                    ) : (
                      <Download size={16} className="text-slate-500" />
                    )}
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors mt-1" />
                </div>
                <div className="mt-3">
                  <p className="text-sm font-bold text-slate-800 tracking-tight">Unduh Kuesioner</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-semibold">
                    {isDownloading ? "Sedang memproses..." : downloadTime ? `Diupdate: ${downloadTime}` : "Unduh referensi prelist offline"}
                  </p>
                </div>
              </button>
            </div>

            {/* Kegiatan Berlangsung */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900">Kegiatan Berlangsung</h3>
                <button className="text-xs text-blue-600 font-medium border-0 bg-transparent cursor-pointer hover:underline">Lihat semua</button>
              </div>
              <div className="space-y-3">
                {officerActivities.map((act) => (
                  <button key={act.name} onClick={() => onNavigate("questionnaire")}
                    className="w-full bg-white rounded-2xl p-5 border border-solid border-slate-100 flex flex-col gap-4 text-left cursor-pointer transition-all hover:border-blue-300 hover:shadow-md group relative overflow-hidden">

                    {/* Border accent indicator */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${act.color || 'bg-blue-600'}`} />

                    <div className="flex items-start justify-between w-full">
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors truncate">
                          {act.name}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 font-medium line-clamp-2 leading-relaxed">
                          {act.description}
                        </p>
                      </div>

                      {/* Role Badge */}
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

                    {/* Document stats details */}
                    {(() => {
                      const actDocs = documents.filter(d => d.kegiatan_id === act.id);
                      const approvedCount = actDocs.filter(d => d.review_status === 'approved').length;
                      const rejectedCount = actDocs.filter(d => d.review_status === 'rejected').length;
                      const terkirimCount = actDocs.filter(d => d.status === 'terkirim' && d.review_status !== 'approved' && d.review_status !== 'rejected').length;
                      const draftCount = actDocs.filter(d => d.status !== 'terkirim' && d.review_status !== 'approved' && d.review_status !== 'rejected').length;

                      return (
                        <div className="flex flex-col gap-2.5 pt-3 border-t border-solid border-slate-50">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2.5 text-xs">
                            <span className="text-slate-400 font-medium flex items-center gap-1.5">
                              <Calendar size={13} className="text-slate-400" />
                              Mulai: {act.start_date ? new Date(act.start_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
                            </span>
                            <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                              <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-solid border-slate-200/50">Draft: {draftCount}</span>
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-solid border-blue-100/50">Terkirim: {terkirimCount}</span>
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-solid border-emerald-100/50">Approve: {approvedCount}</span>
                              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-solid border-rose-100/50">Reject: {rejectedCount}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </button>
                ))}
                {officerActivities.length === 0 && (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl py-12 text-center">
                    <p className="text-xs text-slate-400 font-semibold">Belum ditugaskan ke kegiatan survei apapun.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PetugasLayout>
  );
}

export default PetugasHome;
