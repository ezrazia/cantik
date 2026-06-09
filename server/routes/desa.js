import { Router } from 'express';
import prisma from '../config/database.js';

const router = Router();

/**
 * GET /api/desa/:kegiatanId
 * Mengambil statistik target dan realisasi per desa untuk kegiatan tertentu.
 */
router.get('/:kegiatanId', async (req, res) => {
  const { kegiatanId } = req.params;
  try {
    const rows = await prisma.desaKegiatan.findMany({
      where: {
        kegiatan_id: parseInt(kegiatanId, 10),
      },
      select: {
        id: true,
        kegiatan_id: true,
        desa: true,
        target: true,
        selesai: true,
        color: true,
      },
      orderBy: {
        desa: 'asc',
      },
    });

    const formatted = rows.map(r => ({
      id: r.id,
      kegiatan_id: r.kegiatan_id,
      name: r.desa,
      target: r.target,
      selesai: r.selesai,
      color: r.color,
    }));

    return res.json(formatted);
  } catch (error) {
    console.error('Error fetching desa stats:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data statistik desa' });
  }
});

/**
 * POST /api/desa
 * Menambahkan atau mengupdate target desa untuk kegiatan.
 */
router.post('/', async (req, res) => {
  const { kegiatan_id, desa, target, color } = req.body;
  if (!kegiatan_id || !desa) {
    return res.status(400).json({ success: false, message: 'Kegiatan ID dan Nama Desa wajib diisi' });
  }

  try {
    await prisma.desaKegiatan.upsert({
      where: {
        uk_desa_kegiatan: {
          kegiatan_id: parseInt(kegiatan_id, 10),
          desa: desa,
        },
      },
      update: {
        target: target || 0,
        color: color || '#2563eb',
      },
      create: {
        kegiatan_id: parseInt(kegiatan_id, 10),
        desa: desa,
        target: target || 0,
        color: color || '#2563eb',
      },
    });

    return res.json({ success: true, message: 'Data target desa berhasil diperbarui' });
  } catch (error) {
    console.error('Error saving desa target:', error);
    return res.status(500).json({ success: false, message: 'Gagal menyimpan target desa' });
  }
});

/**
 * PUT /api/desa/:id
 * Mengupdate data target/selesai desa berdasarkan ID.
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { target, selesai, color } = req.body;
  try {
    await prisma.desaKegiatan.update({
      where: {
        id: parseInt(id, 10),
      },
      data: {
        target: target || 0,
        selesai: selesai || 0,
        color: color || '#2563eb',
      },
    });
    return res.json({ success: true, message: 'Data target desa berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating desa target:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui target desa' });
  }
});

/**
 * DELETE /api/desa/:id
 * Menghapus data target desa dari kegiatan.
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.desaKegiatan.delete({
      where: {
        id: parseInt(id, 10),
      },
    });
    return res.json({ success: true, message: 'Data target desa berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting desa target:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus target desa' });
  }
});

export default router;
