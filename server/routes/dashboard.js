import { Router } from 'express';
import prisma from '../config/database.js';

const router = Router();

/**
 * GET /api/dashboard/stats
 * Mengambil ringkasan statistik untuk dashboard admin.
 */
router.get('/stats', async (req, res) => {
  const { kegiatan_id } = req.query;
  try {
    // 1. Total petugas
    const totalPetugas = await prisma.petugas.count();

    // 2. Total kegiatan
    const totalKegiatan = await prisma.kegiatan.count();

    // 3. Total wilayah
    const distinctDesa = await prisma.wilayah.groupBy({
      by: ['desa'],
    });
    const totalDesa = distinctDesa.length;

    // 4. Hitung dokumen per status review
    const whereClause = kegiatan_id ? { kegiatan_id: parseInt(kegiatan_id, 10) } : {};
    
    const totalDokumen = await prisma.dokumen.count({ where: whereClause });
    const approved = await prisma.dokumen.count({ where: { ...whereClause, review_status: 'approved' } });
    const rejected = await prisma.dokumen.count({ where: { ...whereClause, review_status: 'rejected' } });
    const pending = await prisma.dokumen.count({
      where: {
        ...whereClause,
        review_status: 'draft',
        status: { in: ['tersimpan', 'terkirim'] }
      }
    });
    const draft = await prisma.dokumen.count({ where: { ...whereClause, status: 'draft' } });

    // 5. Data Chart Harian (7 hari terakhir)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const documents = await prisma.dokumen.findMany({
      where: {
        created_at: { gte: sevenDaysAgo },
        ...whereClause
      },
      select: {
        created_at: true,
        review_status: true
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    // Group documents by date in memory (database-agnostic)
    const groups = {};
    documents.forEach(doc => {
      // Get date string in YYYY-MM-DD
      const dateStr = doc.created_at.toISOString().split('T')[0];
      if (!groups[dateStr]) {
        groups[dateStr] = { date: dateStr, count: 0, rejected: 0 };
      }
      groups[dateStr].count++;
      if (doc.review_status === 'rejected') {
        groups[dateStr].rejected++;
      }
    });

    const chartRows = Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));

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
    const recentLogs = await prisma.dokumenLog.findMany({
      where: kegiatan_id ? {
        dokumen: { kegiatan_id: parseInt(kegiatan_id, 10) }
      } : {},
      include: {
        dokumen: {
          select: {
            kode: true,
            petugas: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 5
    });

    return res.json({
      success: true,
      summary: {
        totalPetugas,
        totalKegiatan,
        totalDesa,
        totalDokumen,
        approved,
        rejected,
        pending,
        draft
      },
      chartData: formattedChartData,
      recentLogs: recentLogs.map(l => ({
        message: l.message,
        time: l.created_at.toLocaleString('id-ID'),
        petugas: l.dokumen?.petugas?.name || 'Unknown',
        kode: l.dokumen?.kode || ''
      }))
    });
  } catch (error) {
    console.error('Error generating dashboard stats:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data dashboard' });
  }
});

export default router;
