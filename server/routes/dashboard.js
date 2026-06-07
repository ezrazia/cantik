import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

/**
 * GET /api/dashboard/stats
 * Mengambil ringkasan statistik untuk dashboard admin.
 */
router.get('/stats', async (req, res) => {
  const { kegiatan_id } = req.query;
  try {
    // 1. Total petugas
    const [[{ totalPetugas }]] = await pool.query('SELECT COUNT(*) as totalPetugas FROM petugas');

    // 2. Total kegiatan
    const [[{ totalKegiatan }]] = await pool.query('SELECT COUNT(*) as totalKegiatan FROM kegiatan');

    // 3. Total wilayah
    const [[{ totalDesa }]] = await pool.query('SELECT COUNT(DISTINCT desa) as totalDesa FROM wilayah');

    // 4. Hitung dokumen per status review (jika kegiatan_id spesifik, filter by kegiatan_id)
    let reviewQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN review_status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN review_status = 'draft' AND status IN ('tersimpan', 'terkirim') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft
      FROM dokumen
    `;
    const reviewParams = [];
    if (kegiatan_id) {
      reviewQuery += ' WHERE kegiatan_id = ?';
      reviewParams.push(kegiatan_id);
    }

    const [[reviewStats]] = await pool.query(reviewQuery, reviewParams);

    // 5. Data Chart Harian (7 hari terakhir)
    let chartQuery = `
      SELECT DATE(created_at) as date, COUNT(*) as count,
             SUM(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM dokumen
    `;
    const chartParams = [];
    if (kegiatan_id) {
      chartQuery += ' WHERE kegiatan_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      chartParams.push(kegiatan_id);
    } else {
      chartQuery += ' WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    }
    chartQuery += ' GROUP BY DATE(created_at) ORDER BY DATE(created_at) ASC';

    const [chartRows] = await pool.query(chartQuery, chartParams);

    // Format chart rows to match frontend day abbreviations
    const daysName = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const formattedChartData = chartRows.map(row => {
      const d = new Date(row.date);
      return {
        h: daysName[d.getDay()],
        k: row.count,
        t: row.rejected || 0
      };
    });

    // 6. Log aktivitas terbaru
    let logQuery = `
      SELECT dl.message, dl.created_at, d.kode as doc_kode, p.name as petugas_name
      FROM dokumen_log dl
      JOIN dokumen d ON dl.dokumen_id = d.id
      JOIN petugas p ON d.petugas_id = p.id
    `;
    const logParams = [];
    if (kegiatan_id) {
      logQuery += ' WHERE d.kegiatan_id = ?';
      logParams.push(kegiatan_id);
    }
    logQuery += ' ORDER BY dl.created_at DESC LIMIT 5';

    const [recentLogs] = await pool.query(logQuery, logParams);

    return res.json({
      success: true,
      summary: {
        totalPetugas,
        totalKegiatan,
        totalDesa,
        totalDokumen: reviewStats.total || 0,
        approved: reviewStats.approved || 0,
        rejected: reviewStats.rejected || 0,
        pending: reviewStats.pending || 0,
        draft: reviewStats.draft || 0
      },
      chartData: formattedChartData,
      recentLogs: recentLogs.map(l => ({
        message: l.message,
        time: l.created_at.toLocaleString('id-ID'),
        petugas: l.petugas_name,
        kode: l.doc_kode
      }))
    });
  } catch (error) {
    console.error('Error generating dashboard stats:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data dashboard' });
  }
});

export default router;
