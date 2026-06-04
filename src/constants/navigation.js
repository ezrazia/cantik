/**
 * @module constants/navigation
 * Konstanta untuk nama screen dan konfigurasi navigasi aplikasi.
 */

/**
 * Enum nama-nama screen yang tersedia di aplikasi.
 * Digunakan sebagai referensi konsisten di seluruh komponen.
 * @readonly
 * @enum {string}
 */
export const SCREENS = {
  LOGIN: 'login',
  PETUGAS_HOME: 'petugas-home',
  QUESTIONNAIRE: 'questionnaire',
  PETUGAS_SYNC: 'petugas-sync',
  PETUGAS_SETTINGS: 'petugas-settings',
  ADMIN_DASH: 'admin-dash',
  ADMIN_REVIEW: 'admin-review',
  ADMIN_BUILDER: 'admin-builder',
};

/**
 * Konfigurasi item-item bottom navigation untuk modul Petugas.
 * Properti `nav` merujuk ke nilai di SCREENS.
 * @type {Array<{nav: string, label: string}>}
 */
export const PETUGAS_NAV_ITEMS = [
  { nav: SCREENS.PETUGAS_HOME, label: 'Beranda' },
  { nav: SCREENS.QUESTIONNAIRE, label: 'Kuesioner' },
  { nav: SCREENS.PETUGAS_SYNC, label: 'Kirim' },
  { nav: SCREENS.PETUGAS_SETTINGS, label: 'Pengaturan' },
];

/**
 * Daftar nama proyek yang tersedia di sidebar admin.
 * @type {string[]}
 */
export const ADMIN_PROJECTS = [
  'Desa Cantik 2026',
  'Survei Ekonomi 2026',
  'Pendataan PLS 2026',
];
