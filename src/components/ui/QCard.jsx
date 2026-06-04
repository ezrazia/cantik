import { ToggleLeft } from "lucide-react";

/**
 * Card pertanyaan kuesioner minimalis.
 *
 * @param {Object} props
 * @param {string} props.r - Nomor rincian.
 * @param {string} props.label - Label pertanyaan.
 * @param {boolean} [props.required] - Apakah wajib.
 * @param {string} [props.hint] - Teks petunjuk.
 * @param {string} [props.skipInfo] - Info skip logic.
 * @param {React.ReactNode} props.children - Input elements.
 * @returns {React.ReactElement}
 */
function QCard({ r, label, required, hint, skipInfo, children }) {
  const isSkipped = skipInfo && skipInfo.startsWith("Dilewati");
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <span className="mono text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mt-0.5">R.{r}</span>
          <div>
            <p className="text-sm font-semibold text-slate-800 leading-snug">{label}</p>
            {hint && <p className="text-xs text-slate-400 mt-1 font-normal">{hint}</p>}
          </div>
        </div>
        {required
          ? <span className="text-[10px] text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded-md">Wajib</span>
          : <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-md">Opsional</span>}
      </div>
      {skipInfo && (
        <div className={`flex items-center gap-2 text-[11px] mb-3 px-3 py-2 rounded-lg ${
          isSkipped ? "bg-slate-50 text-slate-400" : "bg-blue-50 text-blue-600"
        }`}>
          <ToggleLeft size={14}/> {skipInfo}
        </div>
      )}
      {children}
    </div>
  );
}

export default QCard;