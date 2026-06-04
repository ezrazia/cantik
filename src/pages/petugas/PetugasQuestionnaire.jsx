import { useState } from 'react';
import { ArrowLeft, Save, Check, AlertTriangle, ChevronRight, ChevronLeft } from "lucide-react";
import QCard from "../../components/ui/QCard";
import useAutoSave from "../../hooks/useAutoSave";

/**
 * Halaman pengisian kuesioner — clean & focused.
 *
 * @param {Object} props
 * @param {(screen: string) => void} props.onNavigate
 * @returns {React.ReactElement}
 */
function PetugasQuestionnaire({ onNavigate }) {
  const { saved, markUnsaved } = useAutoSave(1100);
  const [ans, setAns] = useState({
    r301: "Ahmad Subagyo", r303: "1", r304: "45",
    r305: "2", r307: "1", r308: "Pertanian",
  });

  const set = (k, v) => {
    setAns(p => ({ ...p, [k]: v }));
    markUnsaved();
  };

  const skipped = ans.r307 === "2";

  const BLOCKS = [
    { l: "Blok I", done: true }, { l: "Blok II", done: true },
    { l: "Blok III", active: true }, { l: "Blok IV" }, { l: "Blok V", cond: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50 slide-up">
      <div className="max-w-xl mx-auto min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 px-6 pt-12 pb-5">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => onNavigate("petugas-home")}
              className="w-9 h-9 bg-slate-50 hover:bg-slate-100 border border-slate-100 cursor-pointer rounded-lg flex items-center justify-center flex-shrink-0 transition-all text-slate-400">
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 font-medium">RT-002 · Ahmad Subagyo</p>
              <h2 className="text-base font-bold text-slate-900 truncate">Blok III – Keterangan Anggota RT</h2>
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg flex-shrink-0 transition-all ${
              saved ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"
            }`}>
              <Save size={12}/> {saved ? "Tersimpan" : "Menyimpan..."}
            </div>
          </div>
          
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex gap-1.5">
              {BLOCKS.map((b, i) => (
                <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                  b.done ? "bg-blue-600" : b.active ? "bg-blue-200" : "bg-slate-100"
                }`}/>
              ))}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-400 font-medium">Langkah 3 dari 5</span>
              <span className="text-[11px] text-blue-600 font-medium">8 Rincian</span>
            </div>
          </div>
        </div>

        {/* Block tabs */}
        <div className="flex gap-2 px-6 py-4 overflow-x-auto bg-white border-b border-slate-50">
          {BLOCKS.map((b, i) => (
            <button key={i}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-semibold border-0 cursor-pointer transition-all ${
                b.active ? "text-white bg-blue-600" :
                b.done   ? "bg-emerald-50 text-emerald-600" :
                "bg-slate-50 text-slate-400 hover:bg-slate-100"
              }`}>
              {b.done && !b.active && <Check size={11} className="inline mr-1"/>}
              {b.l}{b.cond && <span className="ml-1 opacity-50">*</span>}
            </button>
          ))}
        </div>

        {/* Questions */}
        <div className="px-6 pb-28 space-y-4 flex-1 pt-5">
          <QCard r="301" label="Nama Kepala Rumah Tangga" required>
            <input value={ans.r301} onChange={e => set("r301", e.target.value)}
              className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800"/>
          </QCard>

          <QCard r="303" label="Jenis Kelamin" required>
            <div className="grid grid-cols-2 gap-2">
              {[["1", "Laki-laki"], ["2", "Perempuan"]].map(([v, l]) => (
                <button key={v} onClick={() => set("r303", v)}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs cursor-pointer transition-all font-medium ${
                    ans.r303 === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                  }`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${ans.r303 === v ? "border-blue-600" : "border-slate-200"}`}>
                    {ans.r303 === v && <div className="w-2 h-2 rounded-full bg-blue-600"/>}
                  </div>
                  {v}. {l}
                </button>
              ))}
            </div>
          </QCard>

          <QCard r="304" label="Umur (tahun)" required hint="Nilai valid: 0 – 120 tahun">
            <div className="flex items-center gap-3">
              <input type="number" value={ans.r304} min={0} max={120}
                onChange={e => set("r304", e.target.value)}
                className="mono w-28 px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-slate-800"/>
              <span className="text-xs text-slate-400 font-medium">Tahun</span>
            </div>
            {ans.r304 && (parseInt(ans.r304) < 0 || parseInt(ans.r304) > 120) && (
              <div className="flex items-center gap-2 mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <AlertTriangle size={13} className="flex-shrink-0"/> Nilai di luar rentang (0–120)
              </div>
            )}
          </QCard>

          <QCard r="305" label="Status Perkawinan" required>
            <div className="grid grid-cols-2 gap-2">
              {[["1", "Belum Kawin"], ["2", "Kawin"], ["3", "Cerai Hidup"], ["4", "Cerai Mati"]].map(([v, l]) => (
                <button key={v} onClick={() => set("r305", v)}
                  className={`py-3 px-4 text-xs rounded-xl border cursor-pointer font-medium transition-all text-left ${
                    ans.r305 === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                  }`}>{v}. {l}</button>
              ))}
            </div>
          </QCard>

          <QCard r="307" label="Bekerja seminggu yang lalu?" required>
            <div className="grid grid-cols-2 gap-2">
              {[["1", "Ya"], ["2", "Tidak"]].map(([v, l]) => (
                <button key={v} onClick={() => set("r307", v)}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs cursor-pointer transition-all font-medium ${
                    ans.r307 === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                  }`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${ans.r307 === v ? "border-blue-600" : "border-slate-200"}`}>
                    {ans.r307 === v && <div className="w-2 h-2 rounded-full bg-blue-600"/>}
                  </div>
                  {v}. {l}
                </button>
              ))}
            </div>
          </QCard>

          <div style={{ opacity: skipped ? 0.4 : 1, transition: "opacity .3s ease" }}>
            <QCard r="308" label="Lapangan Usaha Utama"
              skipInfo={skipped ? "Dilewati otomatis" : "Aktif jika Ya"}>
              <input value={ans.r308} disabled={skipped} onChange={e => set("r308", e.target.value)}
                className={`w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-medium text-slate-800 ${skipped ? "cursor-not-allowed opacity-50" : ""}`}
                placeholder={skipped ? "Dilewati" : "Contoh: Pertanian, Perdagangan..."}/>
            </QCard>
          </div>

          {/* Consistency warning */}
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5"/>
            <div>
              <p className="text-xs font-semibold text-amber-800">Peringatan Konsistensi</p>
              <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">Umur 45 tahun dengan status Kawin sudah sesuai.</p>
            </div>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 px-6 py-4">
          <div className="max-w-xl mx-auto flex gap-3">
            <button onClick={() => onNavigate("petugas-home")}
              className="px-5 py-3 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs text-slate-500 font-medium cursor-pointer transition-all flex items-center gap-1.5">
              <ChevronLeft size={14}/> Sebelumnya
            </button>
            <button className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl border-0 cursor-pointer hover:bg-blue-700 active:scale-[0.98] transition-all">
              Blok Berikutnya <ChevronRight size={14}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PetugasQuestionnaire;