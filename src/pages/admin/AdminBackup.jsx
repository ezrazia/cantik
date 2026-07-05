import { useState, useEffect, useRef } from "react";
import AdminLayout from "../../components/layouts/AdminLayout";
import { useNotification } from "../../components/ui/NotificationContext";
import { api, API_BASE } from "../../services/api";
import { 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  RefreshCw, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  HardDrive,
  Activity,
  XCircle,
  FileCode
} from "lucide-react";

export default function AdminBackup({
  onNavigate,
  selectedProject,
  onProjectChange,
  activities,
  loading: propLoading,
}) {
  const [files, setFiles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const { showToast, showConfirm } = useNotification();
  const isLoading = propLoading || loading || backupLoading || restoreLoading || deleteLoading || uploadLoading;

  // Format bytes to readable size
  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Format date-time
  const formatDate = (isoString) => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Fetch backup history and logs
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.backupDb.getHistory();
      if (res.success) {
        setFiles(res.files || []);
        setLogs(res.logs || []);
      } else {
        showToast(res.message || "Gagal memuat riwayat backup", "error");
      }
    } catch (e) {
      showToast("Gagal memuat riwayat backup: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Trigger Backup creation
  const handleCreateBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await api.backupDb.create();
      if (res.success) {
        showToast(`Backup ${res.filename} berhasil dibuat!`, "success");
        fetchHistory();
        // Trigger download
        handleDownload(res.filename);
      } else {
        showToast(res.message || "Gagal membuat backup", "error");
      }
    } catch (e) {
      showToast("Gagal membuat backup: " + e.message, "error");
    } finally {
      setBackupLoading(false);
    }
  };

  // Trigger Download
  const handleDownload = (filename) => {
    const url = `${API_BASE}/backup/download/${encodeURIComponent(filename)}`;
    // Open in new tab/download directly
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Restore from History File
  const handleRestoreFile = async (filename) => {
    const confirm = await showConfirm(
      `Tindakan ini akan menimpa (OVERWRITE) seluruh isi database saat ini dengan data dari file backup "${filename}".\n\nSemua perubahan data atau dokumen baru yang dibuat setelah tanggal backup tersebut akan HILANG.\n\nApakah Anda yakin ingin melanjutkan pemulihan?`,
      "Konfirmasi Pemulihan Database",
      "error"
    );
    if (!confirm) return;

    setRestoreLoading(true);
    try {
      const res = await api.backupDb.restoreFile(filename);
      if (res.success) {
        showToast("Database berhasil dipulihkan ke kondisi backup!", "success");
        fetchHistory();
      } else {
        showToast(res.message || "Gagal memulihkan database", "error");
      }
    } catch (e) {
      showToast("Gagal memulihkan database: " + e.message, "error");
    } finally {
      setRestoreLoading(false);
    }
  };

  // Trigger Delete Backup File
  const handleDeleteFile = async (filename) => {
    const confirm = await showConfirm(
      `Apakah Anda yakin ingin menghapus file backup "${filename}" dari server secara permanen?`,
      "Hapus File Backup",
      "warning"
    );
    if (!confirm) return;

    setDeleteLoading(true);
    try {
      const res = await api.backupDb.delete(filename);
      if (res.success) {
        showToast("File backup berhasil dihapus", "success");
        fetchHistory();
      } else {
        showToast(res.message || "Gagal menghapus file backup", "error");
      }
    } catch (e) {
      showToast("Gagal menghapus file: " + e.message, "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle Drag & Drop File Zone
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImportSql(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImportSql(e.target.files[0]);
    }
  };

  // Read file and send for Upload Restore
  const handleImportSql = async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.sql')) {
      showToast("Format file tidak valid. Hanya file .sql yang diizinkan.", "error");
      return;
    }

    const confirm = await showConfirm(
      `Tindakan ini akan mengunggah file SQL "${file.name}" dan meng-overwrite seluruh data database Anda.\n\nData database saat ini akan dihapus permanen dan diganti.\n\nApakah Anda yakin ingin mengimpor data SQL ini?`,
      "Konfirmasi Impor & Pulihkan",
      "error"
    );
    if (!confirm) return;

    setUploadLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const sqlContent = e.target.result;
        const res = await api.backupDb.restoreUpload(sqlContent);
        if (res.success) {
          showToast("Database berhasil dipulihkan dari data SQL yang diunggah!", "success");
          fetchHistory();
        } else {
          showToast(res.message || "Gagal memulihkan database", "error");
        }
      } catch (error) {
        showToast("Gagal memulihkan database: " + error.message, "error");
      } finally {
        setUploadLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      showToast("Gagal membaca file SQL", "error");
      setUploadLoading(false);
    };
    reader.readAsText(file);
  };

  const getActionBadgeColor = (action) => {
    switch (action) {
      case 'backup':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'restore':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'delete':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <AdminLayout
      tab="admin-backup"
      onNavigate={onNavigate}
      selectedProject={selectedProject}
      onProjectChange={onProjectChange}
      activities={activities}
    >
      <div className="p-6 lg:p-8 w-full slide-up">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4 pb-5 border-b border-solid border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Database size={24} className="text-blue-600 animate-pulse" />
              Backup & Restore Database
            </h1>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Amankan data Anda dengan melakukan ekspor SQL penuh database, atau pulihkan data dari file cadangan sebelumnya.
            </p>
          </div>
          <div>
            <button
              onClick={fetchHistory}
              disabled={isLoading}
              className="flex items-center gap-2 px-4.5 py-2.5 text-xs font-semibold bg-white border border-solid border-slate-200 hover:border-blue-200 hover:text-blue-600 rounded-xl text-slate-600 cursor-pointer shadow-sm hover:shadow transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Data
            </button>
          </div>
        </div>

        {/* Action Panel Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Create Backup Box */}
          <div className="bg-white rounded-2xl border border-solid border-slate-100 shadow-sm p-6 hover:shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <HardDrive size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Simpan & Ekspor SQL</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                  Membuat backup SQL yang mencakup seluruh skema database (desain form, daftar petugas, alokasi SLS, dokumen terisi, jawaban, dan log). File SQL akan otomatis diunduh dan tersimpan juga di server.
                </p>
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={handleCreateBackup}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer border-0 shadow-sm hover:shadow active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {backupLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Mengekspor & Menyimpan...
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    Buat Backup Database & Unduh SQL
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Import SQL Box */}
          <div 
            className={`bg-white rounded-2xl border-2 border-dashed shadow-sm p-6 transition-all flex flex-col justify-between ${
              dragActive ? "border-blue-500 bg-blue-50/20" : "border-slate-200"
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-4 flex-1">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Upload size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">Impor & Pulihkan dari SQL Luar</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Unggah berkas database SQL (.sql) hasil ekspor aplikasi ini untuk memulihkan seluruh data database ke server.
                </p>
              </div>
              
              {/* Drag and Drop Input Area */}
              <div className="border border-solid border-slate-100 rounded-xl bg-slate-50/50 p-4.5 text-center flex flex-col items-center justify-center min-h-[100px] cursor-pointer hover:bg-slate-50 transition-all relative overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".sql"
                  className="hidden"
                />
                <FileCode size={24} className="text-slate-400 mb-1" />
                <span className="text-[11px] font-bold text-slate-600">
                  {uploadLoading ? "Memproses Impor..." : "Seret file .sql kemari atau klik untuk mencari"}
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">Maksimal 20MB</span>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 bg-rose-50 border border-solid border-rose-200/50 p-3 rounded-xl text-rose-600">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <p className="text-[10px] leading-relaxed font-semibold">
                Peringatan: Pemulihan dari file SQL akan menghapus data di database saat ini. Pastikan Anda sudah membuat cadangan terlebih dahulu.
              </p>
            </div>
          </div>

          {/* Logs panel - Takes 1 col */}
          <div className="bg-white rounded-2xl border border-solid border-slate-100 shadow-sm flex flex-col">
            <div className="px-6 py-4.5 border-b border-solid border-slate-50">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Activity size={16} className="text-blue-500 animate-pulse" />
                Log Aktivitas Backup
              </h3>
            </div>
            
            <div className="flex-1 max-h-[350px] overflow-y-auto p-4 space-y-4">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                  <FileText size={32} className="text-slate-200 mb-1" />
                  <p className="text-[11px] font-semibold text-slate-400">Tidak ada log aktivitas</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="text-xs border border-solid border-slate-100 rounded-xl p-3 bg-slate-50/30 hover:bg-slate-50 transition-all space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border uppercase tracking-wider ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(log.timestamp).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800 leading-snug">{log.message}</p>
                    {log.details && (
                      <p className="text-[10px] text-slate-400 font-medium break-all whitespace-pre-wrap">{log.details}</p>
                    )}
                    <div className="flex items-center gap-1.5">
                      {log.status === "success" ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                          <CheckCircle2 size={10} /> BERHASIL
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600">
                          <XCircle size={10} /> GAGAL
                        </span>
                      )}
                      <span className="text-[9px] text-slate-350">—</span>
                      <span className="text-[9px] text-slate-400 font-medium">
                        {new Date(log.timestamp).toLocaleDateString("id-ID", { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Lower Section: History List Table */}
        <div className="w-full">
          
          <div className="w-full bg-white rounded-2xl border border-solid border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between">
            <div>
              <div className="px-6 py-4.5 border-b border-solid border-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Clock size={16} className="text-blue-500" />
                  Daftar Backup di Server ({files.length})
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Tersimpan di Projek (/server/backups/)
                </span>
              </div>

              {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <Database size={40} className="text-slate-200 mb-2" />
                  <p className="text-xs font-semibold text-slate-500">Belum ada file backup tersimpan</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Gunakan tombol "Buat Backup" di atas untuk memulai</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-separate border-spacing-0 text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        <th className="px-6 py-3 border-b border-solid border-slate-100">Nama Berkas</th>
                        <th className="px-6 py-3 border-b border-solid border-slate-100">Ukuran</th>
                        <th className="px-6 py-3 border-b border-solid border-slate-100">Tanggal Pembuatan</th>
                        <th className="px-6 py-3 border-b border-solid border-slate-100 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-solid divide-slate-100 text-slate-700">
                      {files.map((file) => (
                        <tr key={file.filename} className="hover:bg-slate-55/30 transition-colors">
                          <td className="px-6 py-4 text-xs font-semibold text-slate-850">
                            <div className="flex items-center gap-2">
                              <FileText size={14} className="text-blue-500 shrink-0" />
                              <span className="truncate max-w-[200px]" title={file.filename}>
                                {file.filename}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-500 mono">
                            {formatBytes(file.sizeBytes)}
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-500">
                            {formatDate(file.createdAt)}
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleDownload(file.filename)}
                                disabled={isLoading}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all border-0 bg-transparent cursor-pointer disabled:opacity-50"
                                title="Download SQL"
                              >
                                <Download size={14} />
                              </button>
                              <button
                                onClick={() => handleRestoreFile(file.filename)}
                                disabled={isLoading}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all border-0 bg-transparent cursor-pointer disabled:opacity-50"
                                title="Pulihkan / Restore"
                              >
                                <RefreshCw size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteFile(file.filename)}
                                disabled={isLoading}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all border-0 bg-transparent cursor-pointer disabled:opacity-50"
                                title="Hapus Berkas"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-solid border-slate-100 text-[10px] text-slate-400 font-medium flex gap-2">
              <CheckCircle2 size={12} className="text-blue-500 mt-0.5 shrink-0" />
              <span>
                File cadangan SQL tersimpan secara lokal di folder backend projek. Anda dapat mengunduh berkas tersebut untuk disimpan di penyimpanan sekunder Anda.
              </span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
