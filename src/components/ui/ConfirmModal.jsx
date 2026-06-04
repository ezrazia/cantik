import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

/**
 * Modal dialog konfirmasi minimalis untuk approve/reject dokumen.
 *
 * @param {Object} props
 * @param {'approve'|'reject'} props.type
 * @param {string} props.documentId
 * @param {string} props.petugasName
 * @param {number} [props.flagCount=0]
 * @param {string} props.note
 * @param {(e: React.ChangeEvent<HTMLTextAreaElement>) => void} props.onNoteChange
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onCancel
 * @returns {React.ReactElement}
 */
function ConfirmModal({ type, documentId, petugasName, flagCount = 0, note, onNoteChange, onConfirm, onCancel }) {
  const isApprove = type === 'approve';

  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-6"
      style={{ animation: 'fadeIn 0.2s ease' }}
      onClick={onCancel}>
      <div className="bg-white rounded-2xl p-8 w-full shadow-lg"
        style={{ maxWidth: 440, animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={e => e.stopPropagation()}>
        
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${isApprove ? "bg-emerald-50" : "bg-red-50"}`}>
          {isApprove
            ? <CheckCircle size={24} className="text-emerald-600"/>
            : <XCircle size={24} className="text-red-600"/>}
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-1.5">
          {isApprove ? "Setujui Dokumen?" : "Tolak Dokumen?"}
        </h3>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Dokumen <span className="mono font-semibold text-slate-700">{documentId}</span> dari {petugasName} akan {isApprove ? "disimpan sebagai data valid" : "dikembalikan untuk diperbaiki"}.
        </p>

        {!isApprove && (
          <div className="mb-6">
            <label className="block text-xs font-medium text-slate-500 mb-2">Catatan Revisi</label>
            <textarea value={note} onChange={onNoteChange} rows={3}
              className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white resize-none text-slate-700 placeholder:text-slate-300 transition-all"
              placeholder="Jelaskan apa yang perlu diperbaiki..."/>
          </div>
        )}

        {isApprove && flagCount > 0 && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-6">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5"/>
            <p className="text-xs text-amber-700 leading-relaxed">
              Dokumen memiliki <strong>{flagCount} peringatan validasi</strong>. Pastikan sudah diperiksa.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-medium text-slate-600 cursor-pointer transition-all border-0">
            Batal
          </button>
          <button onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white border-0 cursor-pointer transition-all hover:opacity-90 active:scale-[0.98] ${
              isApprove ? 'bg-emerald-600' : 'bg-red-600'
            }`}>
            {isApprove ? "Setujui" : "Tolak Data"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
