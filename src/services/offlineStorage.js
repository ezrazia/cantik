/**
 * @module services/offlineStorage
 * Utility untuk menyimpan data secara offline menggunakan IndexedDB.
 * 
 * Digunakan untuk:
 * - Menyimpan struktur formulir (blocks + questions) per kegiatan
 * - Menyimpan data wilayah referensi
 * - Menyimpan dokumen draft yang belum tersync
 * - Menyimpan antrian POST requests yang gagal saat offline
 */

const DB_NAME = 'cantik_offline_db';
const DB_VERSION = 1;

// Store names
const STORES = {
  FORM_STRUCTURE: 'form_structure',    // Kuesioner structure per kegiatan
  WILAYAH: 'wilayah',                  // Reference data wilayah
  DOKUMEN: 'dokumen',                  // Saved questionnaire responses
  SYNC_QUEUE: 'sync_queue',            // Pending POST/PUT requests
  KEGIATAN: 'kegiatan',               // Activities cache
  PETUGAS: 'petugas',                  // Officers cache  
  META: 'meta',                        // Last sync timestamps, etc.
};

/**
 * Buka koneksi IndexedDB. Membuat stores jika belum ada.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Form structure store: keyed by kegiatan_id
      if (!db.objectStoreNames.contains(STORES.FORM_STRUCTURE)) {
        db.createObjectStore(STORES.FORM_STRUCTURE, { keyPath: 'kegiatan_id' });
      }

      // Wilayah store: keyed by type (kecamatan, desa, sls, sub_sls)
      if (!db.objectStoreNames.contains(STORES.WILAYAH)) {
        db.createObjectStore(STORES.WILAYAH, { keyPath: 'key' });
      }

      // Dokumen store: keyed by kode
      if (!db.objectStoreNames.contains(STORES.DOKUMEN)) {
        const dokStore = db.createObjectStore(STORES.DOKUMEN, { keyPath: 'kode' });
        dokStore.createIndex('kegiatan_id', 'kegiatan_id', { unique: false });
        dokStore.createIndex('petugas_id', 'petugas_id', { unique: false });
        dokStore.createIndex('sync_status', 'sync_status', { unique: false });
      }

      // Sync queue: auto-increment key
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('status', 'status', { unique: false });
        syncStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Kegiatan cache
      if (!db.objectStoreNames.contains(STORES.KEGIATAN)) {
        db.createObjectStore(STORES.KEGIATAN, { keyPath: 'id' });
      }

      // Petugas cache
      if (!db.objectStoreNames.contains(STORES.PETUGAS)) {
        db.createObjectStore(STORES.PETUGAS, { keyPath: 'id' });
      }

      // Meta store for timestamps
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic: simpan satu item ke store.
 */
async function put(storeName, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Generic: ambil satu item dari store by key.
 */
async function get(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Generic: ambil semua item dari store.
 */
async function getAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Generic: hapus satu item dari store by key.
 */
async function remove(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Generic: hapus semua items dari store.
 */
async function clearStore(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Get items by index value.
 */
async function getByIndex(storeName, indexName, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const req = index.getAll(value);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

// ═══════════════════════════════════════════════════════════
// High-level API untuk komponen React
// ═══════════════════════════════════════════════════════════

export const offlineDB = {
  // ─── Form Structure ────────────────────────────────────
  /**
   * Simpan struktur formulir (blocks + questions) untuk kegiatan tertentu.
   */
  saveFormStructure: (kegiatanId, blocks, questions) =>
    put(STORES.FORM_STRUCTURE, {
      kegiatan_id: kegiatanId,
      blocks,
      questions,
      updated_at: Date.now(),
    }),

  /**
   * Ambil struktur formulir dari cache offline.
   */
  getFormStructure: (kegiatanId) => get(STORES.FORM_STRUCTURE, kegiatanId),

  // ─── Wilayah ───────────────────────────────────────────
  /**
   * Simpan data wilayah (kecamatan, desa, sls, sub_sls).
   */
  saveWilayah: (key, data) =>
    put(STORES.WILAYAH, { key, data, updated_at: Date.now() }),

  getWilayah: (key) => get(STORES.WILAYAH, key),

  // ─── Dokumen ───────────────────────────────────────────
  /**
   * Simpan dokumen kuesioner (draft/tersimpan).
   */
  saveDokumen: (doc) =>
    put(STORES.DOKUMEN, {
      ...doc,
      sync_status: doc.sync_status || 'pending',
      updated_at: Date.now(),
    }),

  getDokumen: (kode) => get(STORES.DOKUMEN, kode),

  getDokumenByKegiatan: (kegiatanId) =>
    getByIndex(STORES.DOKUMEN, 'kegiatan_id', kegiatanId),

  getDokumenByPetugas: (petugasId) =>
    getByIndex(STORES.DOKUMEN, 'petugas_id', petugasId),

  getPendingDokumen: () =>
    getByIndex(STORES.DOKUMEN, 'sync_status', 'pending'),

  removeDokumen: (kode) => remove(STORES.DOKUMEN, kode),

  getAllDokumen: () => getAll(STORES.DOKUMEN),

  // ─── Sync Queue ────────────────────────────────────────
  /**
   * Tambahkan request ke antrian sync (untuk POST/PUT yang gagal offline).
   */
  addToSyncQueue: (entry) =>
    put(STORES.SYNC_QUEUE, {
      ...entry,
      status: 'pending',
      created_at: Date.now(),
      retry_count: 0,
    }),

  getSyncQueue: () => getAll(STORES.SYNC_QUEUE),

  getPendingSyncItems: () =>
    getByIndex(STORES.SYNC_QUEUE, 'status', 'pending'),

  removeSyncItem: (id) => remove(STORES.SYNC_QUEUE, id),

  clearSyncQueue: () => clearStore(STORES.SYNC_QUEUE),

  // ─── Kegiatan Cache ────────────────────────────────────
  saveKegiatan: (kegiatan) => put(STORES.KEGIATAN, kegiatan),
  saveAllKegiatan: async (list) => {
    for (const item of list) {
      await put(STORES.KEGIATAN, item);
    }
  },
  getAllKegiatan: () => getAll(STORES.KEGIATAN),

  // ─── Petugas Cache ─────────────────────────────────────
  savePetugas: (petugas) => put(STORES.PETUGAS, petugas),
  saveAllPetugas: async (list) => {
    for (const item of list) {
      await put(STORES.PETUGAS, item);
    }
  },
  getAllPetugas: () => getAll(STORES.PETUGAS),

  // ─── Meta ──────────────────────────────────────────────
  setMeta: (key, value) => put(STORES.META, { key, value, updated_at: Date.now() }),
  getMeta: (key) => get(STORES.META, key),

  // ─── Utilities ─────────────────────────────────────────
  /**
   * Cek apakah IndexedDB tersedia di browser ini.
   */
  isAvailable: () => {
    try {
      return !!window.indexedDB;
    } catch {
      return false;
    }
  },

  /**
   * Hapus semua data offline (reset).
   */
  clearAll: async () => {
    for (const storeName of Object.values(STORES)) {
      await clearStore(storeName);
    }
  },
};

export default offlineDB;
