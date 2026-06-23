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

    // 4. Hitung dokumen per status review & Progress per Lokus
    const whereClause = kegiatan_id ? { kegiatan_id: parseInt(kegiatan_id, 10) } : {};
    
    // Cari level lokus terdalam dari kegiatan
    let lokusLevel = 'desa';
    if (kegiatan_id) {
      const kegiatanObj = await prisma.kegiatan.findUnique({ where: { id: parseInt(kegiatan_id, 10) } });
      if (kegiatanObj && kegiatanObj.lokus) {
        let lObj = kegiatanObj.lokus;
        if (typeof lObj === 'string') {
          try { lObj = JSON.parse(lObj); } catch(e) { lObj = {}; }
        }
        if (lObj.subSls && lObj.subSls.length > 0) lokusLevel = 'sub_sls';
        else if (lObj.sls && lObj.sls.length > 0) lokusLevel = 'sls';
        else if (lObj.desa && lObj.desa.length > 0) lokusLevel = 'desa';
        else if (lObj.kecamatan && lObj.kecamatan.length > 0) lokusLevel = 'kecamatan';
      }
    }

    const allDocs = await prisma.dokumen.findMany({
      where: whereClause,
      select: {
        review_status: true,
        status: true,
        is_prelist: true,
        kecamatan: true,
        desa: true,
        sls: true,
        sub_sls: true
      }
    });

    let totalDokumen = 0, approved = 0, rejected = 0, pending = 0, draft = 0, tambahan = 0;
    const lokusMap = {};

    allDocs.forEach(d => {
      totalDokumen++;
      const isPending = d.review_status === 'draft' && ['tersimpan', 'terkirim'].includes(d.status);
      const isDraft = d.review_status === 'draft' && d.status === 'draft' && d.is_prelist;
      const isTambahan = !d.is_prelist;

      if (d.review_status === 'approved') approved++;
      if (d.review_status === 'rejected') rejected++;
      if (isPending) pending++;
      if (isDraft) draft++;
      if (isTambahan) tambahan++;

      let lokusKey = d[lokusLevel] || d.desa || 'Unknown';
      if (lokusLevel === 'sls' && d.sls) {
        lokusKey = `${d.desa} - SLS ${d.sls}`;
      } else if (lokusLevel === 'sub_sls' && d.sub_sls) {
        lokusKey = `${d.desa} - SLS ${d.sls} - Sub ${d.sub_sls}`;
      }
      if (!lokusMap[lokusKey]) {
        lokusMap[lokusKey] = { name: lokusKey, Selesai: 0, Review: 0, Ditolak: 0, Draft: 0, Tambahan: 0, Total: 0 };
      }
      
      lokusMap[lokusKey].Total++;
      if (d.review_status === 'approved') lokusMap[lokusKey].Selesai++;
      if (d.review_status === 'rejected') lokusMap[lokusKey].Ditolak++;
      if (isPending) lokusMap[lokusKey].Review++;
      if (isDraft) lokusMap[lokusKey].Draft++;
      if (isTambahan) lokusMap[lokusKey].Tambahan++;
    });

    const totalAssignment = totalDokumen;
    const lokusProgress = Object.values(lokusMap).sort((a, b) => a.name.localeCompare(b.name));

    // 5. Data Chart Harian (7 hari terakhir)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const documents = await prisma.dokumen.findMany({
      where: {
        created_at: { gte: sevenDaysAgo },
        NOT: {
          AND: [
            { is_prelist: true },
            { status: 'draft' }
          ]
        },
        ...whereClause
      },
      select: {
        created_at: true,
        updated_at: true,
        review_status: true,
        is_prelist: true
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    // Group documents by date in memory (database-agnostic)
    const groups = {};
    documents.forEach(doc => {
      // Use updated_at for prelist documents to reflect when they were actually submitted, 
      // otherwise use created_at (for new tambahan)
      const targetDate = doc.is_prelist ? doc.updated_at : doc.created_at;
      const dateStr = targetDate.toISOString().split('T')[0];
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
        draft,
        tambahan,
        totalAssignment,
        lokusProgress
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
