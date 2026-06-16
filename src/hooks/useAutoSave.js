import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook untuk simulasi auto-save dengan timer.
 * Mengembalikan status `saved` dan fungsi `markUnsaved` yang secara otomatis
 * mengembalikan status ke "tersimpan" setelah delay tertentu.
 *
 * @param {number} [delay=1100] - Waktu delay (ms) sebelum status kembali ke "tersimpan".
 * @returns {{ saved: boolean, markUnsaved: () => void }}
 *
 * @example
 * const { saved, markUnsaved } = useAutoSave(1100);
 * // Panggil markUnsaved() setiap kali user mengubah data
 */
export default function useAutoSave(delay = 1100) {
  const [saved, setSaved] = useState(true);
  const timerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Cleanup timer saat component unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  /**
   * Menandai data sebagai "belum tersimpan", lalu otomatis
   * kembali ke "tersimpan" setelah delay.
   */
  const markUnsaved = useCallback(() => {
    setSaved(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // Hanya update state jika component masih mounted
      if (isMountedRef.current) {
        setSaved(true);
      }
    }, delay);
  }, [delay]);

  return { saved, markUnsaved };
}
