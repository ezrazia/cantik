import { Router } from 'express';
import prisma from '../config/database.js';

const router = Router();

/**
 * GET /api/wilayah
 * Mengambil seluruh daftar wilayah (kecamatan, desa, sls, sub_sls).
 */
router.get('/', async (req, res) => {
  try {
    const rows = await prisma.wilayah.findMany({
      orderBy: [
        { kecamatan: 'asc' },
        { desa: 'asc' },
        { sls: 'asc' },
        { sub_sls: 'asc' },
      ],
    });
    return res.json(rows);
  } catch (error) {
    console.error('Error fetching wilayah:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data wilayah' });
  }
});

/**
 * GET /api/wilayah/kecamatan
 * Mengambil daftar kecamatan unik.
 */
router.get('/kecamatan', async (req, res) => {
  try {
    const rows = await prisma.wilayah.findMany({
      select: { kecamatan: true },
      distinct: ['kecamatan'],
      orderBy: { kecamatan: 'asc' },
    });
    return res.json(rows.map(r => r.kecamatan));
  } catch (error) {
    console.error('Error fetching kecamatan:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data kecamatan' });
  }
});

/**
 * GET /api/wilayah/desa
 * Mengambil daftar desa. Opsional filter berdasarkan kecamatan.
 */
router.get('/desa', async (req, res) => {
  const { kecamatan } = req.query;
  try {
    const rows = await prisma.wilayah.findMany({
      where: kecamatan ? { kecamatan } : {},
      select: {
        desa: true,
        kecamatan: true,
      },
      distinct: ['desa'],
      orderBy: { desa: 'asc' },
    });
    return res.json(rows);
  } catch (error) {
    console.error('Error fetching desa:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data desa' });
  }
});

/**
 * GET /api/wilayah/sls
 * Mengambil daftar SLS. Opsional filter berdasarkan desa.
 */
router.get('/sls', async (req, res) => {
  const { desa } = req.query;
  try {
    const rows = await prisma.wilayah.findMany({
      where: {
        sls: { not: null },
        ...(desa ? { desa } : {}),
      },
      select: {
        sls: true,
        desa: true,
      },
      distinct: ['sls'],
      orderBy: { sls: 'asc' },
    });
    return res.json(rows);
  } catch (error) {
    console.error('Error fetching SLS:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data SLS' });
  }
});

/**
 * GET /api/wilayah/sub_sls
 * Mengambil daftar Sub SLS. Opsional filter berdasarkan SLS.
 */
router.get('/sub_sls', async (req, res) => {
  const { sls } = req.query;
  try {
    const rows = await prisma.wilayah.findMany({
      where: {
        sub_sls: { not: null },
        ...(sls ? { sls } : {}),
      },
      select: {
        sub_sls: true,
        sls: true,
      },
      distinct: ['sub_sls'],
      orderBy: { sub_sls: 'asc' },
    });
    return res.json(rows);
  } catch (error) {
    console.error('Error fetching Sub SLS:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data Sub SLS' });
  }
});

export default router;
