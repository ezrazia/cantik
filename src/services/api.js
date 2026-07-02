/**
 * @module services/api
 * Klien API terpusat untuk berkomunikasi dengan backend Express (MySQL).
 * Menyediakan fungsi-fungsi untuk memanggil route REST API.
 *
 * PWA-aware: API_BASE otomatis menyesuaikan environment.
 * - Development: http://localhost:3001/api
 * - Production: /api (relative, same-origin via reverse proxy)
 */

const API_BASE = '/api';

// Expose API_BASE for syncQueue module
export { API_BASE };

/**
 * Helper untuk melakukan HTTP request dengan handling error standar.
 * Pada production, Workbox Service Worker akan meng-cache GET responses
 * secara otomatis sesuai strategi yang dikonfigurasi di vite.config.js.
 */
async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body !== 'string') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error(`API Request Error (${url}):`, error.message);
    throw error;
  }
}

export const api = {
  // ─── AUTHENTICATION ───────────────────────────────────
  auth: {
    loginAdmin: (username, password) => 
      request('/auth/login/admin', { method: 'POST', body: { username, password } }),
    loginPetugas: (username, password) => 
      request('/auth/login/petugas', { method: 'POST', body: { username, password } }),
  },

  // ─── PETUGAS (CRUD & ASSIGNMENTS) ─────────────────────
  petugas: {
    getAll: () => request('/petugas'),
    create: (data) => request('/petugas', { method: 'POST', body: data }),
    update: (id, data) => request(`/petugas/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/petugas/${id}`, { method: 'DELETE' }),
    assign: (data) => request('/petugas/assign', { method: 'POST', body: data }),
    unassign: (data) => request('/petugas/unassign', { method: 'POST', body: data }),
  },

  // ─── KEGIATAN (CRUD) ──────────────────────────────────
  kegiatan: {
    getAll: () => request('/kegiatan'),
    create: (data) => request('/kegiatan', { method: 'POST', body: data }),
    update: (id, data) => request(`/kegiatan/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/kegiatan/${id}`, { method: 'DELETE' }),
  },

  // ─── WILAYAH (REFERENCES) ─────────────────────────────
  wilayah: {
    getAll: () => request('/wilayah'),
    getKecamatan: () => request('/wilayah/kecamatan'),
    getDesa: (kecamatan) => {
      const q = kecamatan ? `?kecamatan=${encodeURIComponent(kecamatan)}` : '';
      return request(`/wilayah/desa${q}`);
    },
    getSLS: (desa) => {
      const q = desa ? `?desa=${encodeURIComponent(desa)}` : '';
      return request(`/wilayah/sls${q}`);
    },
    getSubSLS: (sls) => {
      const q = sls ? `?sls=${encodeURIComponent(sls)}` : '';
      return request(`/wilayah/sub_sls${q}`);
    },
  },

  // ─── FORM BUILDER (BLOK & QUESTIONS) ──────────────────
  form: {
    getStructure: (kegiatanId) => request(`/form/${kegiatanId}?_t=${Date.now()}`),
    createBlock: (data) => request('/form/blok', { method: 'POST', body: data }),
    updateBlock: (id, data) => request(`/form/blok/${id}`, { method: 'PUT', body: data }),
    deleteBlock: (id) => request(`/form/blok/${id}`, { method: 'DELETE' }),
    createQuestion: (data) => request('/form/question', { method: 'POST', body: data }),
    updateQuestion: (id, data) => request(`/form/question/${id}`, { method: 'PUT', body: data }),
    deleteQuestion: (id) => request(`/form/question/${id}`, { method: 'DELETE' }),
    copy: (source_kegiatan_id, target_kegiatan_id) => request('/form/copy', { method: 'POST', body: { source_kegiatan_id, target_kegiatan_id } }),
  },

  // ─── DOKUMEN (HEADER & ANSWERS) ───────────────────────
  dokumen: {
    getByPetugas: (petugasId) => request(`/dokumen/petugas/${petugasId}`),
    getForReview: (kegiatanId) => request(`/dokumen/review/${kegiatanId}`),
    getDetail: (id) => request(`/dokumen/${id}`),
    save: (data) => request('/dokumen', { method: 'POST', body: data }),
    sync: (petugasId, documents) => request('/dokumen/sync', { method: 'POST', body: { petugas_id: petugasId, documents } }),
    backup: (petugasId, documents) => request('/dokumen/backup', { method: 'POST', body: { petugas_id: petugasId, documents } }),
    review: (id, review_status, notes = '', role = '') => request(`/dokumen/review/${id}`, { method: 'POST', body: { review_status, notes, role } }),
    delete: (id, force = false) => request(`/dokumen/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' }),
    assignMultiple: (dbId, pcls, pmls) => request('/dokumen/assign-multiple', { method: 'POST', body: { dbId, assigned_pcls: pcls, assigned_pmls: pmls } }),
    assignSls: (kegiatanId, sls, pcls, pmls) => request('/dokumen/assign-sls', { method: 'POST', body: { kegiatan_id: kegiatanId, sls, assigned_pcls: pcls, assigned_pmls: pmls } }),
    autoAssignLokus: (kegiatanId) => request('/dokumen/auto-assign-lokus', { method: 'POST', body: { kegiatan_id: kegiatanId } }),
    // Prelist import
    importPrelist: (kegiatanId, mapping, rows) => request('/dokumen/prelist/import', { method: 'POST', body: { kegiatan_id: kegiatanId, mapping, rows } }),
    getPrelistMapping: (kegiatanId) => request(`/dokumen/prelist/mapping/${kegiatanId}`),
  },

  // ─── DESA KEGIATAN STATS ──────────────────────────────
  desa: {
    getStats: (kegiatanId) => request(`/desa/${kegiatanId}`),
    saveTarget: (data) => request('/desa', { method: 'POST', body: data }),
    updateTarget: (id, data) => request(`/desa/${id}`, { method: 'PUT', body: data }),
    deleteTarget: (id) => request(`/desa/${id}`, { method: 'DELETE' }),
  },

  // ─── DASHBOARD STATS ──────────────────────────────────
  dashboard: {
    getStats: (kegiatanId = '') => {
      const q = kegiatanId ? `?kegiatan_id=${encodeURIComponent(kegiatanId)}` : '';
      return request(`/dashboard/stats${q}`);
    },
  },

  // ─── TABULATION (CLEAN DATA) ──────────────────────────
  tabulasi: {
    getData: (kegiatanId) => request(`/tabulasi/${kegiatanId}`),
  },

  // ─── FREEFORM (ANOMALIES & DYNAMIC OPTIONS) ───────────
  freeform: {
    getAll: (kegiatan_id, type) => {
      const params = new URLSearchParams();
      if (kegiatan_id) params.append("kegiatan_id", kegiatan_id);
      if (type) params.append("type", type);
      const query = params.toString();
      return request(`/freeform${query ? '?' + query : ''}`);
    },
    create: (data) => request('/freeform', { method: 'POST', body: data }),
    update: (id, data) => request(`/freeform/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/freeform/${id}`, { method: 'DELETE' }),
  }
};
