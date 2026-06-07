import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

/**
 * GET /api/kegiatan
 * Mengambil semua daftar kegiatan.
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM kegiatan ORDER BY start_date DESC');
    
    // Parse lokus JSON if needed (though mysql2 typically parses it automatically)
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
        lokus: lokusParsed || { kecamatan: [], desa: [], sls: [], subSls: [] }
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
    const lokusJson = lokus ? JSON.stringify(lokus) : JSON.stringify({ kecamatan: [], desa: [], sls: [], subSls: [] });
    
    const [result] = await pool.query(
      `INSERT INTO kegiatan (name, description, progress, color, text_color, bg_color, start_date, status, lokus)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || null,
        progress || 0,
        color || 'bg-blue-600',
        text_color || 'text-blue-600',
        bg_color || 'bg-blue-50',
        start_date || null,
        status || 'draft',
        lokusJson
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Kegiatan berhasil dibuat',
      kegiatanId: result.insertId
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
    const lokusJson = lokus ? JSON.stringify(lokus) : JSON.stringify({ kecamatan: [], desa: [], sls: [], subSls: [] });

    const [result] = await pool.query(
      `UPDATE kegiatan
       SET name = ?, description = ?, progress = ?, color = ?, text_color = ?, bg_color = ?, start_date = ?, status = ?, lokus = ?
       WHERE id = ?`,
      [
        name,
        description || null,
        progress || 0,
        color || 'bg-blue-600',
        text_color || 'text-blue-600',
        bg_color || 'bg-blue-50',
        start_date || null,
        status || 'draft',
        lokusJson,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan' });
    }

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
    const [result] = await pool.query('DELETE FROM kegiatan WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan' });
    }
    return res.json({ success: true, message: 'Kegiatan berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting kegiatan:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus kegiatan' });
  }
});

export default router;
