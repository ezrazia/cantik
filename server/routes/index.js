import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './auth.js';
import petugasRoutes from './petugas.js';
import kegiatanRoutes from './kegiatan.js';
import wilayahRoutes from './wilayah.js';
import formRoutes from './form.js';
import dokumenRoutes from './dokumen.js';
import desaRoutes from './desa.js';
import dashboardRoutes from './dashboard.js';
import tabulasiRoutes from './tabulasi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

router.get('/video-panduan', (req, res) => {
  const videoPath = path.join(__dirname, '../../src/assets/tutorial.mp4');
  res.sendFile(videoPath, (err) => {
    if (err) {
      console.error('Error streaming video:', err);
      if (!res.headersSent) {
        res.status(err.status || 500).end();
      }
    }
  });
});

// Daftarkan sub-routes
router.use('/auth', authRoutes);
router.use('/petugas', petugasRoutes);
router.use('/kegiatan', kegiatanRoutes);
router.use('/wilayah', wilayahRoutes);
router.use('/form', formRoutes);
router.use('/dokumen', dokumenRoutes);
router.use('/desa', desaRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/tabulasi', tabulasiRoutes);

export default router;
