import { useState, useCallback } from 'react';

/**
 * Custom hook untuk mengelola state dropdown (buka/tutup dan pemilihan item).
 *
 * @param {string} initialValue - Nilai awal yang dipilih pada dropdown.
 * @returns {{ isOpen: boolean, selected: string, toggle: () => void, close: () => void, select: (value: string) => void }}
 *
 * @example
 * const { isOpen, selected, toggle, close, select } = useDropdown("Semua Desa");
 */
export default function useDropdown(initialValue = '') {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(initialValue);

  /** Toggles the dropdown open/closed state. */
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  /** Closes the dropdown. */
  const close = useCallback(() => setIsOpen(false), []);

  /**
   * Selects a value and closes the dropdown.
   * @param {string} value - The value to select.
   */
  const select = useCallback((value) => {
    setSelected(value);
    setIsOpen(false);
  }, []);

  return { isOpen, selected, toggle, close, select };
}
