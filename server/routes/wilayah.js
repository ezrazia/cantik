import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

/**
 * GET /api/wilayah
 * Mengambil seluruh daftar wilayah (kecamatan, desa, sls, sub_sls).
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM wilayah ORDER BY kecamatan, desa, sls, sub_sls');
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
    const [rows] = await pool.query('SELECT DISTINCT kecamatan FROM wilayah ORDER BY kecamatan');
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
    let query = 'SELECT DISTINCT desa, kecamatan FROM wilayah';
    const params = [];
    
    if (kecamatan) {
      query += ' WHERE kecamatan = ?';
      params.push(kecamatan);
    }
    query += ' ORDER BY desa';
    
    const [rows] = await pool.query(query, params);
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
    let query = 'SELECT DISTINCT sls, desa FROM wilayah WHERE sls IS NOT NULL';
    const params = [];
    
    if (desa) {
      query += ' AND desa = ?';
      params.push(desa);
    }
    query += ' ORDER BY sls';
    
    const [rows] = await pool.query(query, params);
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
    let query = 'SELECT DISTINCT sub_sls, sls FROM wilayah WHERE sub_sls IS NOT NULL';
    const params = [];
    
    if (sls) {
      query += ' AND sls = ?';
      params.push(sls);
    }
    query += ' ORDER BY sub_sls';
    
    const [rows] = await pool.query(query, params);
    return res.json(rows);
  } catch (error) {
    console.error('Error fetching Sub SLS:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data Sub SLS' });
  }
});

export default router;
