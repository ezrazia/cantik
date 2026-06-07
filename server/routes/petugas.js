import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';

const router = Router();

/**
 * GET /api/petugas
 * Mengambil daftar semua petugas lapangan.
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, username, name, nik, phone, desa, target, selesai, last_sync, status, created_at, updated_at
      FROM petugas
      ORDER BY name ASC
    `);
    
    // Ambil data kegiatan untuk setiap petugas
    const [pkRows] = await pool.query(`
      SELECT pk.petugas_id, pk.kegiatan_id, k.name as kegiatan_name, pk.role, pk.sls_assignments, pk.pengawas
      FROM petugas_kegiatan pk
      JOIN kegiatan k ON pk.kegiatan_id = k.id
    `);

    // Ambil statistik kuesioner/dokumen per petugas per kegiatan
    const [docStats] = await pool.query(`
      SELECT petugas_id, kegiatan_id, COUNT(*) as target, SUM(CASE WHEN status IN ('tersimpan', 'terkirim') THEN 1 ELSE 0 END) as selesai
      FROM dokumen
      GROUP BY petugas_id, kegiatan_id
    `);

    // Gabungkan data kegiatan ke petugas
    const petugasWithActivities = rows.map(p => {
      const assignments = pkRows.filter(pk => pk.petugas_id === p.id);
      
      const projects = assignments.map(a => a.kegiatan_name);
      const projectRoles = {};
      const slsAssignments = {};

      assignments.forEach(a => {
        projectRoles[a.kegiatan_name] = a.role;
        const stats = docStats.find(ds => ds.petugas_id === p.id && ds.kegiatan_id === a.kegiatan_id);
        let parsedSls = [];
        if (a.sls_assignments) {
          if (typeof a.sls_assignments === 'string') {
            try {
              parsedSls = JSON.parse(a.sls_assignments);
            } catch (err) {
              parsedSls = [];
            }
          } else if (Array.isArray(a.sls_assignments)) {
            parsedSls = a.sls_assignments;
          }
        }
        slsAssignments[a.kegiatan_name] = {
          sls: parsedSls,
          pengawas: a.pengawas || null,
          target: stats ? stats.target : 0,
          selesai: stats ? stats.selesai : 0
        };
      });

      return {
        ...p,
        projects,
        projectRoles,
        assignments: slsAssignments
      };
    });

    return res.json(petugasWithActivities);
  } catch (error) {
    console.error('Error fetching petugas:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data petugas' });
  }
});

/**
 * POST /api/petugas
 * Menambah petugas lapangan baru.
 */
router.post('/', async (req, res) => {
  const { username, password, name, nik, phone, desa, status } = req.body;
  if (!username || !name) {
    return res.status(400).json({ success: false, message: 'Username dan Nama wajib diisi' });
  }

  try {
    const defaultPassword = password || 'petugas123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const [result] = await pool.query(
      `INSERT INTO petugas (username, password, name, nik, phone, desa, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, hashedPassword, name, nik || null, phone || null, desa || null, status || 'active']
    );

    return res.status(201).json({
      success: true,
      message: 'Petugas berhasil ditambahkan',
      petugasId: result.insertId
    });
  } catch (error) {
    console.error('Error creating petugas:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Username sudah digunakan' });
    }
    return res.status(500).json({ success: false, message: 'Gagal menambahkan petugas' });
  }
});

/**
 * PUT /api/petugas/:id
 * Mengupdate data petugas lapangan.
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { username, password, name, nik, phone, desa, status, target, selesai } = req.body;

  try {
    // Cek apakah petugas ada
    const [existing] = await pool.query('SELECT * FROM petugas WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Petugas tidak ditemukan' });
    }

    let query = `
      UPDATE petugas
      SET username = ?, name = ?, nik = ?, phone = ?, desa = ?, status = ?, target = ?, selesai = ?
    `;
    const params = [username, name, nik || null, phone || null, desa || null, status || 'active', target || 0, selesai || 0];

    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += `, password = ?`;
      params.push(hashedPassword);
    }

    query += ` WHERE id = ?`;
    params.push(id);

    await pool.query(query, params);

    return res.json({ success: true, message: 'Data petugas berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating petugas:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Username sudah digunakan' });
    }
    return res.status(500).json({ success: false, message: 'Gagal memperbarui data petugas' });
  }
});

/**
 * DELETE /api/petugas/:id
 * Menghapus petugas lapangan.
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM petugas WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Petugas tidak ditemukan' });
    }
    return res.json({ success: true, message: 'Petugas berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting petugas:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus petugas' });
  }
});

/**
 * POST /api/petugas/assign
 * Menugaskan petugas ke kegiatan tertentu (atau mengupdate tugasnya).
 */
router.post('/assign', async (req, res) => {
  const { petugas_id, kegiatan_id, role, sls_assignments, pengawas } = req.body;
  if (!petugas_id || !kegiatan_id) {
    return res.status(400).json({ success: false, message: 'Petugas ID dan Kegiatan ID wajib diisi' });
  }

  try {
    const slsJson = sls_assignments ? JSON.stringify(sls_assignments) : null;
    await pool.query(
      `INSERT INTO petugas_kegiatan (petugas_id, kegiatan_id, role, sls_assignments, pengawas)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         role = VALUES(role),
         sls_assignments = VALUES(sls_assignments),
         pengawas = VALUES(pengawas)`,
      [petugas_id, kegiatan_id, role || 'PCL', slsJson, pengawas || null]
    );

    return res.json({ success: true, message: 'Penugasan petugas berhasil diperbarui' });
  } catch (error) {
    console.error('Error assigning petugas:', error);
    return res.status(500).json({ success: false, message: 'Gagal menugaskan petugas' });
  }
});

/**
 * POST /api/petugas/unassign
 * Membatalkan penugasan petugas dari kegiatan tertentu.
 */
router.post('/unassign', async (req, res) => {
  const { petugas_id, kegiatan_id } = req.body;
  if (!petugas_id || !kegiatan_id) {
    return res.status(400).json({ success: false, message: 'Petugas ID dan Kegiatan ID wajib diisi' });
  }

  try {
    await pool.query(
      'DELETE FROM petugas_kegiatan WHERE petugas_id = ? AND kegiatan_id = ?',
      [petugas_id, kegiatan_id]
    );
    return res.json({ success: true, message: 'Penugasan petugas berhasil dihapus' });
  } catch (error) {
    console.error('Error unassigning petugas:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus penugasan petugas' });
  }
});

export default router;
