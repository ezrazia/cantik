import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

/**
 * GET /api/desa/:kegiatanId
 * Mengambil statistik target dan realisasi per desa untuk kegiatan tertentu.
 */
router.get('/:kegiatanId', async (req, res) => {
  const { kegiatanId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT id, kegiatan_id, desa as name, target, selesai, color 
       FROM desa_kegiatan 
       WHERE kegiatan_id = ?
       ORDER BY desa`,
      [kegiatanId]
    );
    return res.json(rows);
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
    await pool.query(
      `INSERT INTO desa_kegiatan (kegiatan_id, desa, target, color)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         target = VALUES(target),
         color = VALUES(color)`,
      [kegiatan_id, desa, target || 0, color || '#2563eb']
    );

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
    await pool.query(
      'UPDATE desa_kegiatan SET target = ?, selesai = ?, color = ? WHERE id = ?',
      [target || 0, selesai || 0, color || '#2563eb', id]
    );
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
    await pool.query('DELETE FROM desa_kegiatan WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Data target desa berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting desa target:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus target desa' });
  }
});

export default router;
