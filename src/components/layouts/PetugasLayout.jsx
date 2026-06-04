import { Home, FileText, Upload, Settings } from 'lucide-react';

/**
 * Layout wrapper untuk semua halaman modul Petugas.
 * Bottom navigation dengan estetika minimalis dan clean.
 *
 * @param {Object} props
 * @param {string} props.activeTab - Nama screen yang sedang aktif.
 * @param {(screen: string) => void} props.onNavigate - Fungsi navigasi antar screen.
 * @param {React.ReactNode} props.children - Konten halaman.
 * @returns {React.ReactElement}
 */
function PetugasLayout({ activeTab, onNavigate, children }) {
  const NAV_ITEMS = [
    { icon: Home, label: 'Beranda', nav: 'petugas-home' },
    { icon: FileText, label: 'Kuesioner', nav: 'questionnaire' },
    { icon: Upload, label: 'Kirim', nav: 'petugas-sync' },
    { icon: Settings, label: 'Pengaturan', nav: 'petugas-settings' },
  ];

  return (
    <>
      {children}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 px-4 pb-5 pt-2 md:pb-3 md:pt-3">
        <div className="max-w-lg mx-auto w-full flex justify-around items-center">
          {NAV_ITEMS.map(item => {
            const isActive = item.nav === activeTab;
            return (
              <button key={item.label} onClick={() => onNavigate(item.nav)}
                className={`flex flex-col items-center gap-0.5 border-0 bg-transparent cursor-pointer transition-all min-w-[56px] py-1 ${
                  isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                }`}>
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-50' : ''}`}>
                  <item.icon size={20} strokeWidth={isActive ? 2 : 1.5}/>
                </div>
                <span className={`text-[10px] tracking-wide ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default PetugasLayout;
