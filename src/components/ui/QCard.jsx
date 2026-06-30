import { useState } from "react";
import { ToggleLeft, ChevronDown, ChevronUp } from "lucide-react";

/**
 * Card pertanyaan kuesioner minimalis.
 *
 * @param {Object} props
 * @param {string} props.r - Nomor rincian.
 * @param {string} props.label - Label pertanyaan.
 * @param {string} [props.subLabel] - Label/sub-deskripsi pertanyaan tambahan.
 * @param {boolean} [props.required] - Apakah wajib.
 * @param {string} [props.hint] - Teks petunjuk.
 * @param {string} [props.skipInfo] - Info skip logic.
 * @param {React.ReactNode} props.children - Input elements.
 * @returns {React.ReactElement}
 */
function QCard({ r, label, subLabel, required, hint, skipInfo, description, className = "bg-white border-slate-100", children }) {
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const isSkipped = skipInfo && skipInfo.startsWith("Dilewati");
  return (
    <div className={`rounded-2xl border p-6 shadow-sm transition-all ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="mono text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">R.{r}</span>
        {required && (
          <span className="text-[10px] text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded-md">Wajib</span>
        )}
      </div>
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-800 leading-snug">{label}</p>
        {subLabel && <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{subLabel}</p>}
        {hint && <p className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md mt-1.5 font-semibold inline-block">{hint}</p>}
      </div>
      {skipInfo && (
        <div className={`flex items-center gap-2 text-[11px] mb-3 px-3 py-2 rounded-lg ${isSkipped ? "bg-slate-50 text-slate-400" : "bg-blue-50 text-blue-600"
          }`}>
          <ToggleLeft size={14} /> {skipInfo}
        </div>
      )}

      {children}

      {description && (
        <div className="mt-3.5 border-t border-solid border-slate-50 pt-3">
          <button
            type="button"
            onClick={() => setIsDescExpanded(!isDescExpanded)}
            className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-750 transition-all cursor-pointer bg-transparent border-0 p-0 outline-none"
          >
            <span>Keterangan {isDescExpanded ? "(klik untuk menutup)" : "(klik untuk lihat lebih banyak)"}</span>
            {isDescExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {isDescExpanded && (
            <p className="text-xs text-slate-500 mt-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100 font-medium leading-relaxed whitespace-pre-line animate-fade-in">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default QCard;