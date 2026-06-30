/**
 * Badge status minimalis dengan dot indicator.
 *
 * @param {Object} props
 * @param {'submitted'|'approved'|'rejected'|'draft'|'selesai'|'progress'|'belum'} props.status
 * @returns {React.ReactElement}
 */
function Badge({ status }) {
  const M = {
    menunggu:     ["bg-amber-50 text-amber-600", "Menunggu"],
    submitted:    ["bg-blue-50 text-blue-600", "Submit"],
    pml_approved: ["bg-purple-50 text-purple-600", "Disetujui PML"],
    approved:     ["bg-emerald-50 text-emerald-600", "Approved"],
    rejected:     ["bg-red-50 text-red-600", "Ditolak"],
    draft:        ["bg-slate-50 text-slate-500", "Draft"],
    tersimpan:    ["bg-emerald-50 text-emerald-600", "Tersimpan"],
    tersimpan_sementara: ["bg-amber-50 text-amber-600", "Simpan Sementara"],
    terkirim:     ["bg-blue-50 text-blue-600", "Terkirim"],
    selesai:      ["bg-emerald-50 text-emerald-600", "Selesai"],
    progress:     ["bg-amber-50 text-amber-600", "Proses"],
    belum:        ["bg-slate-50 text-slate-400", "Belum"],
  };
  const [cls, label] = M[status] || M.draft;
  
  const getDotColor = () => {
    if (cls.includes('blue')) return 'bg-blue-500';
    if (cls.includes('emerald')) return 'bg-emerald-500';
    if (cls.includes('purple')) return 'bg-purple-500';
    if (cls.includes('red')) return 'bg-red-500';
    if (cls.includes('amber')) return 'bg-amber-500';
    return 'bg-slate-400';
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${getDotColor()}`}/>
      {label}
    </span>
  );
}

export default Badge;