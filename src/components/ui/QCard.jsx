import { useState } from "react";
import { ToggleLeft, ChevronDown, ChevronUp, Eye, FastForward } from "lucide-react";

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
function QCard({ r, label, subLabel, required, readOnly, hint, skipInfo, showIfInfo, description, inlineLabel, className = "bg-white border-slate-100", children }) {
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const isSkipped = skipInfo && skipInfo.startsWith("Dilewati");
  const hasBottomContent = !!children || !!description;

  return (
    <div className={`rounded-2xl border ${inlineLabel && !hasBottomContent && !subLabel ? 'px-6 py-4 flex flex-col justify-center' : 'p-6'} shadow-sm transition-all ${className}`}>
      {inlineLabel ? (
        <div className={hasBottomContent || subLabel ? "mb-2" : "m-0"}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
              <span className="mono text-xs font-bold text-blue-600 shrink-0">R.{r}</span>
              <p className="text-sm font-semibold text-slate-800 leading-snug">{label}</p>

              {showIfInfo && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-semibold">
                  <Eye size={12} className="text-emerald-500" />
                  <span>Tampil jika: {showIfInfo}</span>
                </div>
              )}

              {skipInfo && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-[10px] font-semibold">
                  <FastForward size={12} className="text-amber-500" />
                  <span>Skip logic: {skipInfo}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {readOnly && (
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Read Only</span>
              )}
              {required && (
                <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider">WAJIB</span>
              )}
            </div>
          </div>
          {subLabel && <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">{subLabel}</p>}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="mono text-xs font-bold text-blue-600">R.{r}</span>
              
              {showIfInfo && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-semibold">
                  <Eye size={12} className="text-emerald-500" />
                  <span>Tampil jika: {showIfInfo}</span>
                </div>
              )}

              {skipInfo && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-[10px] font-semibold">
                  <FastForward size={12} className="text-amber-500" />
                  <span>Skip logic: {skipInfo}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {readOnly && (
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Read Only</span>
              )}
              {required && (
                <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider">WAJIB</span>
              )}
            </div>
          </div>
          <div className="mb-4">
            <p className="text-sm font-semibold text-slate-800 leading-snug">{label}</p>
            {subLabel && <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{subLabel}</p>}
          </div>
        </>
      )}

      {children}

      {description && (
        <div className="mt-3.5 border-t border-solid border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setIsDescExpanded(!isDescExpanded)}
            className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-750 transition-all cursor-pointer bg-transparent border-0 p-0 outline-none mb-1.5"
          >
            <span>Keterangan {isDescExpanded ? "(klik untuk menutup)" : "(klik untuk membuka)"}</span>
            {isDescExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {isDescExpanded && (
            <p className="text-xs text-slate-600 mt-1 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 font-medium leading-relaxed whitespace-pre-line animate-fade-in">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default QCard;