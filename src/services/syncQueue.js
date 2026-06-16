/**
 * @module services/syncQueue
 * Background Sync Queue — mengelola antrian request POST/PUT yang gagal saat offline.
 * 
 * Saat petugas mengisi kuesioner offline, data disimpan lokal.
 * Ketika koneksi kembali, antrian ini akan memproses request satu per satu
 * secara berurutan dan melaporkan progress.
 */

import { offlineDB } from './offlineStorage';

// Event listeners for sync status
const listeners = new Set();

/**
 * Notify semua listeners tentang perubahan status sync.
 */
function notifyListeners(event) {
  listeners.forEach(fn => {
    try { fn(event); } catch (e) { console.error('Sync listener error:', e); }
  });
}

/**
 * Subscribe ke sync events.
 * @param {Function} callback - (event: { type, data }) => void
 * @returns {Function} unsubscribe function
 */
export function onSyncEvent(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Tambahkan POST/PUT request ke antrian sync.
 * @param {string} url - API endpoint path (e.g. '/dokumen')
 * @param {string} method - HTTP method ('POST' atau 'PUT')
 * @param {Object} body - Request body
 * @param {string} description - Deskripsi untuk UI (e.g. 'Simpan kuesioner RT-001')
 */
export async function addToQueue(url, method, body, description = '') {
  await offlineDB.addToSyncQueue({
    url,
    method,
    body,
    description,
    status: 'pending',
    created_at: Date.now(),
    retry_count: 0,
  });

  notifyListeners({
    type: 'queued',
    data: { url, method, description },
  });
}

/**
 * Ambil jumlah item pending di antrian.
 * @returns {Promise<number>}
 */
export async function getPendingCount() {
  const items = await offlineDB.getPendingSyncItems();
  return items.length;
}

/**
 * Ambil semua item di antrian.
 * @returns {Promise<Array>}
 */
export async function getQueueItems() {
  return offlineDB.getSyncQueue();
}

/**
 * Proses antrian sync — jalankan semua pending requests secara berurutan.
 * Dipanggil saat kembali online.
 * 
 * @param {string} apiBase - Base URL API (e.g. 'http://localhost:5174/api')
 * @returns {Promise<{ success: number, failed: number, total: number }>}
 */
export async function processQueue(apiBase) {
  const items = await offlineDB.getPendingSyncItems();
  
  if (items.length === 0) {
    return { success: 0, failed: 0, total: 0 };
  }

  notifyListeners({
    type: 'sync_start',
    data: { total: items.length },
  });

  let success = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    notifyListeners({
      type: 'sync_progress',
      data: {
        current: i + 1,
        total: items.length,
        description: item.description,
      },
    });

    try {
      const url = `${apiBase}${item.url}`;
      const response = await fetch(url, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.body),
      });

      if (response.ok) {
        // Berhasil — hapus dari antrian
        await offlineDB.removeSyncItem(item.id);
        success++;
        
        notifyListeners({
          type: 'sync_item_success',
          data: { description: item.description, index: i + 1 },
        });
      } else {
        // Server error — tandai gagal tapi jangan hapus
        failed++;
        notifyListeners({
          type: 'sync_item_failed',
          data: {
            description: item.description,
            error: `HTTP ${response.status}`,
            index: i + 1,
          },
        });
      }
    } catch (err) {
      // Network error — kemungkinan masih offline
      failed++;
      notifyListeners({
        type: 'sync_item_failed',
        data: {
          description: item.description,
          error: err.message,
          index: i + 1,
        },
      });
      
      // Jika network error, stop processing (mungkin masih offline)
      if (!navigator.onLine) {
        notifyListeners({
          type: 'sync_interrupted',
          data: { reason: 'Koneksi terputus kembali' },
        });
        break;
      }
    }
  }

  notifyListeners({
    type: 'sync_complete',
    data: { success, failed, total: items.length },
  });

  return { success, failed, total: items.length };
}

/**
 * Inisialisasi auto-sync listener.
 * Otomatis menjalankan processQueue saat browser kembali online.
 * 
 * @param {string} apiBase - Base URL API
 * @returns {Function} cleanup function
 */
export function initAutoSync(apiBase) {
  const handleOnline = async () => {
    console.log('🌐 Kembali online — memulai sinkronisasi...');
    notifyListeners({ type: 'online' });
    
    // Tunggu sebentar untuk memastikan koneksi stabil
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (navigator.onLine) {
      await processQueue(apiBase);
    }
  };

  const handleOffline = () => {
    console.log('📴 Koneksi terputus — mode offline aktif');
    notifyListeners({ type: 'offline' });
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Cek saat init apakah ada antrian yang perlu diproses
  if (navigator.onLine) {
    getPendingCount().then(count => {
      if (count > 0) {
        console.log(`📋 ${count} item menunggu sinkronisasi...`);
        processQueue(apiBase);
      }
    });
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

export default {
  addToQueue,
  getPendingCount,
  getQueueItems,
  processQueue,
  initAutoSync,
  onSyncEvent,
};
