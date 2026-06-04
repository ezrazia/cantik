import { WifiOff, Database } from "lucide-react";
import { useState } from "react";

/**
 * Halaman login minimalis untuk autentikasi pengguna.
 *
 * @param {Object} props
 * @param {(role: 'petugas'|'admin') => void} props.onLogin
 * @returns {React.ReactElement}
 */
function LoginScreen({ onLogin }) {
  const [role, setRole] = useState("petugas");
  const [username, setUsername] = useState("197804122005011001");
  const [password, setPassword] = useState("••••••••");

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 slide-up">
      {/* Subtle background accent */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-50 rounded-full blur-[120px] opacity-60 -translate-y-1/2 translate-x-1/2 pointer-events-none"/>
      
      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Database size={22} className="text-white"/>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CAPI</h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">Badan Pusat Statistik</p>
        </div>

        {/* Role toggle */}
        <div className="bg-slate-50 rounded-xl p-1 flex mb-8">
          {[["petugas", "Petugas"], ["admin", "Admin"]].map(([v, l]) => (
            <button key={v} onClick={() => setRole(v)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-0 cursor-pointer transition-all ${
                role === v ? "bg-white text-blue-600 shadow-sm" : "bg-transparent text-slate-400 hover:text-slate-600"
              }`}>
              {l}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">NIP / Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">Kata Sandi</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800"/>
          </div>
        </div>

        {/* Info */}
        <div className="flex items-center gap-2.5 bg-blue-50 rounded-xl px-4 py-3 mb-6">
          <WifiOff size={14} className="text-blue-500 flex-shrink-0"/>
          <p className="text-xs text-blue-600 font-medium leading-relaxed">Dapat berjalan offline di lapangan.</p>
        </div>

        {/* Submit */}
        <button onClick={() => onLogin(role)}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold border-0 cursor-pointer transition-all shadow-sm active:scale-[0.98]">
          Masuk sebagai {role === "admin" ? "Administrator" : "Petugas Lapangan"}
        </button>

        <p className="text-center text-[11px] text-slate-300 mt-8 font-medium">
          Desa Cantik v2.1.0
        </p>
      </div>
    </div>
  );
}

export default LoginScreen;