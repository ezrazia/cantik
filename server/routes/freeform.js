import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/freeform
// Query params: kegiatan_id (optional), type (optional - 'ANOMALI' or 'PILIHAN_DINAMIS')
router.get('/', async (req, res) => {
  try {
    const { kegiatan_id, type } = req.query;
    
    let whereClause = {};
    if (kegiatan_id) {
      whereClause.kegiatan_id = parseInt(kegiatan_id, 10);
    }
    if (type) {
      whereClause.type = type;
    }

    const freeformConfigs = await prisma.freeform.findMany({
      where: whereClause,
      orderBy: { created_at: 'asc' }
    });

    res.json({ success: true, data: freeformConfigs });
  } catch (error) {
    console.error('Error fetching freeform configs:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data konfigurasi freeform.' });
  }
});

// POST /api/freeform
router.post('/', async (req, res) => {
  try {
    const { kegiatan_id, type, key_name, payload } = req.body;

    if (!type || !key_name || !payload) {
      return res.status(400).json({ success: false, message: 'Type, key_name, dan payload wajib diisi.' });
    }

    const newConfig = await prisma.freeform.create({
      data: {
        kegiatan_id: kegiatan_id ? parseInt(kegiatan_id, 10) : null,
        type,
        key_name,
        payload
      }
    });

    res.status(201).json({ success: true, message: 'Data berhasil disimpan.', data: newConfig });
  } catch (error) {
    console.error('Error creating freeform config:', error);
    res.status(500).json({ success: false, message: 'Gagal menyimpan data.' });
  }
});

// PUT /api/freeform/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { kegiatan_id, type, key_name, payload } = req.body;

    const updatedConfig = await prisma.freeform.update({
      where: { id: parseInt(id, 10) },
      data: {
        kegiatan_id: kegiatan_id ? parseInt(kegiatan_id, 10) : null,
        type,
        key_name,
        payload
      }
    });

    res.json({ success: true, message: 'Data berhasil diperbarui.', data: updatedConfig });
  } catch (error) {
    console.error('Error updating freeform config:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui data.' });
  }
});

// DELETE /api/freeform/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.freeform.delete({
      where: { id: parseInt(id, 10) }
    });

    res.json({ success: true, message: 'Data berhasil dihapus.' });
  } catch (error) {
    console.error('Error deleting freeform config:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus data.' });
  }
});

export default router;
