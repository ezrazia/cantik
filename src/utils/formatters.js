/**
 * @module utils/formatters
 * Kumpulan fungsi pembantu untuk formatting data di seluruh aplikasi.
 */

/**
 * Mengambil inisial dari nama lengkap (huruf pertama setiap kata).
 *
 * @param {string} fullName - Nama lengkap, misal "Budi Santoso".
 * @returns {string} Inisial, misal "BS".
 *
 * @example
 * getInitials("Budi Santoso"); // "BS"
 * getInitials("Siti Rahayu");  // "SR"
 */
export function getInitials(fullName) {
  if (!fullName) return '';
  return fullName
    .split(' ')
    .map(word => word[0])
    .join('');
}

/**
 * Menghitung dan membulatkan persentase.
 *
 * @param {number} value - Nilai saat ini.
 * @param {number} total - Nilai total/target.
 * @returns {number} Persentase yang dibulatkan, misal 70.
 *
 * @example
 * formatPercentage(21, 30); // 70
 */
export function formatPercentage(value, total) {
  if (!total || total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Menghitung sisa persentase (100 - pct).
 *
 * @param {number} pct - Persentase saat ini.
 * @returns {number} Sisa persentase.
 */
export function remainingPercentage(pct) {
  return 100 - pct;
}
