import { ChevronDown } from 'lucide-react';

/**
 * Komponen dropdown yang dapat digunakan ulang dengan dukungan tema terang dan gelap.
 * Menangani overlay klik-luar dan animasi buka/tutup.
 *
 * @param {Object} props
 * @param {string[]} props.items - Daftar item yang bisa dipilih.
 * @param {string} props.selected - Item yang sedang terpilih.
 * @param {boolean} props.isOpen - Apakah dropdown sedang terbuka.
 * @param {() => void} props.onToggle - Handler toggle buka/tutup.
 * @param {() => void} props.onClose - Handler untuk menutup dropdown.
 * @param {(item: string) => void} props.onSelect - Handler ketika item dipilih.
 * @param {'light'|'dark'} [props.variant='light'] - Varian tema dropdown.
 * @param {string} [props.triggerClassName] - Override className untuk tombol trigger.
 * @param {string} [props.menuClassName] - Override className untuk menu dropdown.
 * @returns {React.ReactElement}
 */
function Dropdown({
  items,
  selected,
  isOpen,
  onToggle,
  onClose,
  onSelect,
  variant = 'light',
  triggerClassName,
  menuClassName,
}) {
  const isDark = variant === 'dark';

  /** Default styles berdasarkan varian */
  const defaultTriggerCls = isDark
    ? 'w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border border-white/5 hover:bg-white/5 group'
    : 'flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-all cursor-pointer bg-indigo-50/50 px-3 py-1.5 rounded-xl border border-indigo-100/50 group';

  const defaultMenuCls = isDark
    ? 'absolute left-0 right-0 top-full mt-3 glass-dark rounded-2xl shadow-2xl z-20 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 border border-white/10'
    : 'absolute left-0 top-full mt-3 glass rounded-2xl shadow-premium z-20 py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-100 w-64';

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={triggerClassName || defaultTriggerCls}
        style={isDark ? { color: 'rgba(255,255,255,.6)', background: 'rgba(255,255,255,0.02)' } : undefined}
      >
        <span className={isDark ? 'truncate' : undefined}>{selected}</span>
        <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}/>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose}/>
          <div className={menuClassName || defaultMenuCls}>
            {items.map(item => (
              <button
                key={item}
                onClick={() => onSelect(item)}
                className={`w-full px-5 py-3 text-left text-${isDark ? 'xs' : '[11px]'} transition-all cursor-pointer border-0 ${
                  selected === item
                    ? (isDark ? 'bg-indigo-600 text-white font-black' : 'bg-indigo-50 text-indigo-700 font-black')
                    : (isDark ? 'bg-transparent text-slate-400 hover:bg-white/5 font-bold' : 'bg-white text-slate-500 hover:bg-slate-50 font-black uppercase tracking-widest')
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Dropdown;
