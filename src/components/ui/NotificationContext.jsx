import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { CheckCircle2, AlertCircle, XCircle, Info, X } from "lucide-react";

const NotificationContext = createContext(null);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [alertDialog, setAlertDialog] = useState(null); // { title, message, type, resolve }
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, type, resolve }

  // 1. Toast Implementation
  const showToast = useCallback((message, type = "success", title = null) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type, title }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 2. Alert Replacement Implementation (Promise-based)
  const showAlert = useCallback((message, title = "Informasi", type = "info") => {
    return new Promise((resolve) => {
      setAlertDialog({ title, message, type, resolve });
    });
  }, []);

  const handleAlertClose = () => {
    if (alertDialog) {
      alertDialog.resolve(true);
      setAlertDialog(null);
    }
  };

  // 3. Confirm Replacement Implementation (Promise-based)
  const showConfirm = useCallback((message, title = "Konfirmasi", type = "warning") => {
    return new Promise((resolve) => {
      setConfirmDialog({ title, message, type, resolve });
    });
  }, []);

  const handleConfirmAction = (value) => {
    if (confirmDialog) {
      confirmDialog.resolve(value);
      setConfirmDialog(null);
    }
  };

  return (
    <NotificationContext.Provider value={{ showToast, showAlert, showConfirm }}>
      {children}

      {/* Floating Toasts Container */}
      <div 
        className="fixed right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none"
        style={{ top: "max(env(safe-area-inset-top, 0px) + 0.5rem, 1rem)" }}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>

      {/* Custom Alert Modal */}
      {alertDialog && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-fade-in" onClick={handleAlertClose}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all animate-scale-up p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${
                alertDialog.type === "success" ? "bg-emerald-50 text-emerald-600" :
                alertDialog.type === "error" ? "bg-rose-50 text-rose-600" :
                alertDialog.type === "warning" ? "bg-amber-50 text-amber-600" :
                "bg-blue-50 text-blue-600"
              }`}>
                {alertDialog.type === "success" && <CheckCircle2 size={24} />}
                {alertDialog.type === "error" && <XCircle size={24} />}
                {alertDialog.type === "warning" && <AlertCircle size={24} />}
                {alertDialog.type === "info" && <Info size={24} />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-800 leading-snug">{alertDialog.title}</h3>
                <div className="mt-2 max-h-[50vh] overflow-y-auto pr-2">
                  <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed break-words">{alertDialog.message}</p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleAlertClose}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-[0.98] cursor-pointer border-0"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-fade-in" onClick={() => handleConfirmAction(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all animate-scale-up p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${
                confirmDialog.type === "error" ? "bg-rose-50 text-rose-600" :
                confirmDialog.type === "success" ? "bg-emerald-50 text-emerald-600" :
                "bg-amber-50 text-amber-600"
              }`}>
                {confirmDialog.type === "error" && <XCircle size={24} />}
                {confirmDialog.type === "success" && <CheckCircle2 size={24} />}
                {confirmDialog.type === "warning" && <AlertCircle size={24} />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-800 leading-snug">{confirmDialog.title}</h3>
                <div className="mt-2 max-h-[50vh] overflow-y-auto pr-2">
                  <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed break-words">{confirmDialog.message}</p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => handleConfirmAction(false)}
                className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer border-0"
              >
                Batal
              </button>
              <button
                onClick={() => handleConfirmAction(true)}
                className={`px-5 py-2.5 text-white rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-[0.98] cursor-pointer border-0 ${
                  confirmDialog.type === "error" ? "bg-rose-600 hover:bg-rose-700" :
                  confirmDialog.type === "success" ? "bg-emerald-600 hover:bg-emerald-700" :
                  "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

function ToastItem({ toast, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const typeConfig = {
    success: {
      bg: "bg-white border-emerald-100",
      text: "text-slate-800",
      icon: <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />,
    },
    error: {
      bg: "bg-white border-rose-100",
      text: "text-slate-800",
      icon: <XCircle className="text-rose-500 flex-shrink-0" size={20} />,
    },
    warning: {
      bg: "bg-white border-amber-100",
      text: "text-slate-800",
      icon: <AlertCircle className="text-amber-500 flex-shrink-0" size={20} />,
    },
    info: {
      bg: "bg-white border-blue-100",
      text: "text-slate-800",
      icon: <Info className="text-blue-500 flex-shrink-0" size={20} />,
    },
  };

  const config = typeConfig[toast.type] || typeConfig.info;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg cursor-pointer select-none pointer-events-auto transition-all duration-300 transform translate-y-0 opacity-100 animate-slide-in-right ${config.bg}`}
      onClick={onClose}
    >
      {config.icon}
      <div className="flex-1">
        {toast.title && <h4 className="text-sm font-bold text-slate-800 leading-tight mb-0.5">{toast.title}</h4>}
        <p className="text-xs text-slate-600 leading-normal">{toast.message}</p>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg hover:bg-slate-50 transition-all cursor-pointer border-0 bg-transparent">
        <X size={14} />
      </button>
    </div>
  );
}
