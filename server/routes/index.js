import { Router } from 'express';
import authRoutes from './auth.js';
import petugasRoutes from './petugas.js';
import kegiatanRoutes from './kegiatan.js';
import wilayahRoutes from './wilayah.js';
import formRoutes from './form.js';
import dokumenRoutes from './dokumen.js';
import desaRoutes from './desa.js';
import dashboardRoutes from './dashboard.js';
import tabulasiRoutes from './tabulasi.js';
import uploadRoutes from './upload.js';

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
router.use('/upload', uploadRoutes);

export default router;
