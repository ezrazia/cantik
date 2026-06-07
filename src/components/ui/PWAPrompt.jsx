import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, Download, RefreshCw, CheckCircle, AlertCircle, X, CloudOff, Cloud } from 'lucide-react';
import { onSyncEvent, getPendingCount } from '../../services/syncQueue';

/**
 * PWAPrompt — Komponen notifikasi status PWA.
 * 
 * Menampilkan toast/banner untuk:
 * - Status offline/online
 * - Progress sinkronisasi data
 * - Prompt install PWA (Add to Home Screen)
 * - Update SW baru tersedia
 */
export default function PWAPrompt() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [showOnlineBanner, setShowOnlineBanner] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // { type, data }
  const [pendingCount, setPendingCount] = useState(0);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // ─── Online/Offline detection ──────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineBanner(false);
      setShowOnlineBanner(true);
      setTimeout(() => setShowOnlineBanner(false), 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOnlineBanner(false);
      setShowOfflineBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial state
    if (!navigator.onLine) {
      setShowOfflineBanner(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ─── Sync events ──────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onSyncEvent((event) => {
      setSyncStatus(event);

      if (event.type === 'sync_complete') {
        // Auto-hide after 5 seconds
        setTimeout(() => setSyncStatus(null), 5000);
      }
    });

    // Check pending count periodically
    const checkPending = async () => {
      try {
        const count = await getPendingCount();
        setPendingCount(count);
      } catch {
        // IndexedDB not available
      }
    };
    checkPending();
    const interval = setInterval(checkPending, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // ─── PWA Install prompt ────────────────────────────────
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      
      // Only show if not already installed
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
      
      if (!isInstalled) {
        // Delay showing install banner
        setTimeout(() => setShowInstallBanner(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('✅ PWA installed!');
    }
    setInstallPrompt(null);
    setShowInstallBanner(false);
  }, [installPrompt]);

  return (
    <>
      {/* ─── Offline Banner (persistent) ──────────────── */}
      {showOfflineBanner && (
        <div className="fixed top-0 left-0 right-0 z-[9999] animate-slideDown">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 flex items-center justify-center gap-2 shadow-lg">
            <WifiOff size={15} className="flex-shrink-0" />
            <span className="text-xs font-semibold">
              Mode Offline — Data disimpan di perangkat Anda
            </span>
            {pendingCount > 0 && (
              <span className="bg-white/20 text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">
                {pendingCount} menunggu sync
              </span>
            )}
          </div>
        </div>
      )}

      {/* ─── Online Banner (auto-hide) ────────────────── */}
      {showOnlineBanner && (
        <div className="fixed top-0 left-0 right-0 z-[9999] animate-slideDown">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2.5 flex items-center justify-center gap-2 shadow-lg">
            <Wifi size={15} className="flex-shrink-0" />
            <span className="text-xs font-semibold">
              Kembali Online — Menyinkronkan data...
            </span>
          </div>
        </div>
      )}

      {/* ─── Sync Progress Toast ──────────────────────── */}
      {syncStatus && syncStatus.type === 'sync_progress' && (
        <div className="fixed bottom-20 left-4 right-4 z-[9998] animate-slideUp max-w-sm mx-auto">
          <div className="bg-slate-900 text-white rounded-xl px-4 py-3 shadow-2xl border border-slate-700/50">
            <div className="flex items-center gap-3">
              <RefreshCw size={16} className="animate-spin text-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">
                  Sinkronisasi {syncStatus.data.current}/{syncStatus.data.total}
                </p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {syncStatus.data.description}
                </p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-2 bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${(syncStatus.data.current / syncStatus.data.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Sync Complete Toast ──────────────────────── */}
      {syncStatus && syncStatus.type === 'sync_complete' && (
        <div className="fixed bottom-20 left-4 right-4 z-[9998] animate-slideUp max-w-sm mx-auto">
          <div className={`rounded-xl px-4 py-3 shadow-2xl border flex items-center gap-3 ${
            syncStatus.data.failed > 0
              ? 'bg-amber-900/90 text-amber-100 border-amber-700/50'
              : 'bg-emerald-900/90 text-emerald-100 border-emerald-700/50'
          }`}>
            {syncStatus.data.failed > 0 ? (
              <AlertCircle size={16} className="text-amber-400 flex-shrink-0" />
            ) : (
              <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className="text-xs font-semibold">
                Sinkronisasi selesai: {syncStatus.data.success} berhasil
                {syncStatus.data.failed > 0 && `, ${syncStatus.data.failed} gagal`}
              </p>
            </div>
            <button
              onClick={() => setSyncStatus(null)}
              className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center cursor-pointer border-0 bg-transparent text-current"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* ─── Install Banner ──────────────────────────── */}
      {showInstallBanner && installPrompt && (
        <div className="fixed bottom-20 left-4 right-4 z-[9997] animate-slideUp max-w-sm mx-auto">
          <div className="bg-white rounded-2xl p-4 shadow-2xl border border-slate-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Download size={18} className="text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">Install CANTIK</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Tambahkan ke Home Screen untuk akses cepat & penggunaan offline
                </p>
              </div>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center cursor-pointer border-0 bg-transparent text-slate-400"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowInstallBanner(false)}
                className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg border-0 cursor-pointer hover:bg-slate-200 transition-colors"
              >
                Nanti
              </button>
              <button
                onClick={handleInstall}
                className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-purple-600 rounded-lg border-0 cursor-pointer hover:bg-purple-700 transition-colors shadow-sm"
              >
                Install
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Animations ──────────────────────────────── */}
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideDown {
          animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>
    </>
  );
}
