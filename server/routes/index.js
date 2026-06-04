/**
 * @module server/routes
 * Definisi route utama untuk API backend.
 * Semua endpoint API didaftarkan di sini.
 */

import { Router } from 'express';

const router = Router();

/**
 * GET /api/health
 * Health check endpoint untuk memastikan server berjalan.
 */
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'cantik-server',
  });
});

/**
 * GET /api/petugas
 * Placeholder endpoint untuk data petugas.
 * TODO: Implementasi query ke database.
 */
router.get('/petugas', (_req, res) => {
  res.json({ message: 'Endpoint petugas - belum diimplementasi' });
});

/**
 * GET /api/responses
 * Placeholder endpoint untuk data respons/dokumen.
 * TODO: Implementasi query ke database.
 */
router.get('/responses', (_req, res) => {
  res.json({ message: 'Endpoint responses - belum diimplementasi' });
});

export default router;
