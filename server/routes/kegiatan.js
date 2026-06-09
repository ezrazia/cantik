import { Router } from 'express';
import prisma from '../config/database.js';

const router = Router();

/**
 * GET /api/kegiatan
 * Mengambil semua daftar kegiatan.
 */
router.get('/', async (req, res) => {
  try {
    const rows = await prisma.kegiatan.findMany({
      orderBy: {
        start_date: 'desc',
      },
    });

    const formatted = rows.map(k => {
      let lokusParsed = k.lokus;
      if (typeof lokusParsed === 'string') {
        try {
          lokusParsed = JSON.parse(lokusParsed);
        } catch {
          lokusParsed = { kecamatan: [], desa: [], sls: [], subSls: [] };
        }
      }
      return {
        ...k,
        lokus: lokusParsed || { kecamatan: [], desa: [], sls: [], subSls: [] },
      };
    });

    return res.json(formatted);
  } catch (error) {
    console.error('Error fetching kegiatan:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data kegiatan' });
  }
});

/**
 * POST /api/kegiatan
 * Membuat kegiatan baru.
 */
router.post('/', async (req, res) => {
  const { name, description, progress, color, text_color, bg_color, start_date, status, lokus } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Nama kegiatan wajib diisi' });
  }

  try {
    const result = await prisma.kegiatan.create({
      data: {
        name,
        description: description || null,
        progress: progress || 0,
        color: color || 'bg-blue-600',
        text_color: text_color || 'text-blue-600',
        bg_color: bg_color || 'bg-blue-50',
        start_date: start_date ? new Date(start_date) : null,
        status: status || 'draft',
        lokus: lokus || { kecamatan: [], desa: [], sls: [], subSls: [] },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Kegiatan berhasil dibuat',
      kegiatanId: result.id,
    });
  } catch (error) {
    console.error('Error creating kegiatan:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat kegiatan baru' });
  }
});

/**
 * PUT /api/kegiatan/:id
 * Mengupdate data kegiatan.
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, progress, color, text_color, bg_color, start_date, status, lokus } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Nama kegiatan wajib diisi' });
  }

  try {
    await prisma.kegiatan.update({
      where: {
        id: parseInt(id, 10),
      },
      data: {
        name,
        description: description || null,
        progress: progress || 0,
        color: color || 'bg-blue-600',
        text_color: text_color || 'text-blue-600',
        bg_color: bg_color || 'bg-blue-50',
        start_date: start_date ? new Date(start_date) : null,
        status: status || 'draft',
        lokus: lokus || { kecamatan: [], desa: [], sls: [], subSls: [] },
      },
    });

    return res.json({ success: true, message: 'Kegiatan berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating kegiatan:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui kegiatan' });
  }
});

/**
 * DELETE /api/kegiatan/:id
 * Menghapus kegiatan.
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.kegiatan.delete({
      where: {
        id: parseInt(id, 10),
      },
    });
    return res.json({ success: true, message: 'Kegiatan berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting kegiatan:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus kegiatan' });
  }
});

export default router;
