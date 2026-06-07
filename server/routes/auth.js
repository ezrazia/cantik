import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';

const router = Router();

/**
 * POST /api/auth/login/admin
 * Login untuk Administrator.
 */
router.post('/login/admin', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM admin WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    return res.json({
      success: true,
      user: {
        id: admin.id,
        username: admin.username,
        nama: admin.nama,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Error during admin login:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
  }
});

/**
 * POST /api/auth/login/petugas
 * Login untuk Petugas Lapangan.
 */
router.post('/login/petugas', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM petugas WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    const petugas = rows[0];
    const isMatch = await bcrypt.compare(password, petugas.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    return res.json({
      success: true,
      user: {
        id: petugas.id,
        username: petugas.username,
        name: petugas.name,
        nik: petugas.nik,
        phone: petugas.phone,
        desa: petugas.desa,
        target: petugas.target,
        selesai: petugas.selesai,
        status: petugas.status,
        role: 'petugas'
      }
    });
  } catch (error) {
    console.error('Error during petugas login:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
  }
});

export default router;
