import { WifiOff, Database, X } from "lucide-react";
import { useState } from "react";
import { api } from "../../services/api";
import tutorialVideo from "../../assets/tutorial.mp4";

/**
 * Halaman login minimalis untuk autentikasi pengguna.
 *
 * @param {Object} props
 * @param {(user: Object) => void} props.onLogin
 * @returns {React.ReactElement}
 */
function LoginScreen({ onLogin }) {
  const [role, setRole] = useState("petugas");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    setError("");
    setUsername("");
    setPassword("");
  };

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Username dan password wajib diisi");
      return;
    }
    setError("");
    setLoading(true);
    try {
      let res;
      if (role === "admin") {
        res = await api.auth.loginAdmin(username, password);
      } else {
        res = await api.auth.loginPetugas(username, password);
      }
      if (res && res.success) {
        onLogin(res.user);
      } else {
        setError(res.message || "Login gagal. Silakan coba lagi.");
      }
    } catch (err) {
      setError(err.message || "Koneksi ke server gagal. Pastikan backend aktif.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 slide-up overflow-x-hidden relative">
      {/* Panduan Button */}
      <button 
        type="button"
        onClick={() => setShowModal(true)}
        className="absolute top-6 right-6 text-slate-400 hover:text-slate-500 underline text-sm font-semibold cursor-pointer transition-colors border-0 bg-transparent z-20"
      >
        Video Panduan
      </button>

      {/* Subtle background accent */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50 rounded-full blur-[120px] opacity-60 -translate-y-1/2 translate-x-1/2 pointer-events-none"/>
      
      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Database size={22} className="text-white"/>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CANTIK</h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">Badan Pusat Statistik</p>
        </div>

        {/* Role toggle */}
        <div className="bg-slate-50 rounded-xl p-1 flex mb-8">
          {[["petugas", "Petugas"], ["admin", "Admin"]].map(([v, l]) => (
            <button key={v} onClick={() => handleRoleChange(v)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-0 cursor-pointer transition-all ${
                role === v ? "bg-white text-blue-600 shadow-sm" : "bg-transparent text-slate-400 hover:text-slate-600"
              }`}>
              {l}
            </button>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 text-red-600 text-xs font-semibold px-4 py-3 rounded-xl mb-6 border border-red-100">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">Username</label>
              <input value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Masukkan Username"
                className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">Kata Sandi</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Masukkan Kata Sandi"
                className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800"/>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-center gap-2.5 bg-blue-50 rounded-xl px-4 py-3 mb-6">
            <WifiOff size={14} className="text-blue-500 flex-shrink-0"/>
            <p className="text-xs text-blue-600 font-medium leading-relaxed">Dapat berjalan offline di lapangan.</p>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold border-0 cursor-pointer transition-all shadow-sm active:scale-[0.98] disabled:bg-blue-400">
            {loading ? "Menghubungkan..." : `Masuk sebagai ${role === "admin" ? "Administrator" : "Petugas Lapangan"}`}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-300 mt-8 font-medium">
          Desa Cantik v2.1.0
        </p>
      </div>

      {/* Modal Video Panduan */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300">
          <div 
            className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 max-w-3xl w-full relative flex flex-col animate-scale-in"
            style={{ animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">Panduan Penggunaan Aplikasi</h3>
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors border-0 cursor-pointer bg-transparent flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>
            {/* Video Player */}
            <div className="relative aspect-video w-full bg-black">
              <video 
                src={tutorialVideo} 
                controls 
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginScreen;