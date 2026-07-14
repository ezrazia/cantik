import { Router } from 'express';
import prisma from '../config/database.js';

const router = Router();

/**
 * GET /api/dashboard/stats
 * Mengambil ringkasan statistik untuk dashboard admin.
 */
router.get('/stats', async (req, res) => {
  const { kegiatan_id, desa, range, groupBy } = req.query;
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
    let whereClause = {};
    let kegiatanIds = [];
    if (kegiatan_id) {
      kegiatanIds = kegiatan_id.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      if (kegiatanIds.length > 0) {
        whereClause = { kegiatan_id: { in: kegiatanIds } };
      }
    }
    
    // Cari level lokus terdalam dari kegiatan (hanya relevan jika groupBy != 'kegiatan' dan single kegiatan)
    let lokusLevel = 'desa';
    let lObj = null;
    if (kegiatanIds.length === 1 && groupBy !== 'kegiatan') {
      const kegiatanObj = await prisma.kegiatan.findUnique({ where: { id: kegiatanIds[0] } });
      if (kegiatanObj && kegiatanObj.lokus) {
        lObj = kegiatanObj.lokus;
        if (typeof lObj === 'string') {
          try { lObj = JSON.parse(lObj); } catch(e) { lObj = {}; }
        }
        if (lObj.subSls && lObj.subSls.length > 0) lokusLevel = 'sub_sls';
        else if (lObj.sls && lObj.sls.length > 0) lokusLevel = 'sls';
        else if (lObj.desa && lObj.desa.length > 0) lokusLevel = 'desa';
        else if (lObj.kecamatan && lObj.kecamatan.length > 0) lokusLevel = 'kecamatan';
      }
    }

    const kegiatanMap = {};
    const allKegiatan = await prisma.kegiatan.findMany();
    allKegiatan.forEach(k => kegiatanMap[k.id] = k.name);

    const allDocs = await prisma.dokumen.findMany({
      where: whereClause,
      select: {
        kegiatan_id: true,
        review_status: true,
        status: true,
        is_prelist: true,
        kecamatan: true,
        desa: true,
        sls: true,
        sub_sls: true,
        dokumen_jawaban: {
          where: { form_question: { label: 'RT' } },
          select: { value: true }
        }
      }
    });

    // Build known desa/SLS lists from kegiatan lokus for normalization
    let knownDesas = [];
    let knownSlsList = [];
    if (lObj) {
      knownDesas = (lObj.desa || []).map(d => d.toUpperCase());
      knownSlsList = lObj.sls || [];
    }

    /**
     * Normalize desa value against known lokus desas.
     * If d.desa matches a known desa (case-insensitive), use the canonical name.
     * If not and there's only one known desa, assume it belongs there.
     * Otherwise fallback to the raw value or 'Unknown'.
     */
    const toTitleCase = (str) => {
      if (!str) return '';
      return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const normalizeDesa = (rawDesa) => {
      if (!rawDesa) return knownDesas.length === 1 ? (lObj.desa[0]) : 'Unknown';
      const upper = rawDesa.toUpperCase();
      const matchIdx = knownDesas.findIndex(kd => kd === upper);
      if (matchIdx >= 0) return lObj.desa[matchIdx];
      // Single desa in lokus: all documents belong to it
      if (knownDesas.length === 1) return lObj.desa[0];
      return toTitleCase(rawDesa);
    };

    // Filter docs in-memory if a specific village is requested
    let filteredDocs = allDocs;
    if (desa && desa !== 'Semua Desa') {
      const targetDesaUpper = desa.replace(/^Desa\s+/i, '').toUpperCase();
      filteredDocs = allDocs.filter(d => {
        const norm = normalizeDesa(d.desa);
        return norm && norm.toUpperCase() === targetDesaUpper;
      });
    }

    /**
     * Extract clean SLS code from raw sls field.
     * Handles formats like: "01", "02", "SLS 01 Limbu Sedulun", "(*01*)", "00",
     * "RT 001 [DESA]", '["01"]' (JSON array)
     * Returns just the numeric code e.g. "01", "02", "03", "04"
     */
    const cleanSlsCode = (rawSls) => {
      if (!rawSls) return null;
      let sls = rawSls.trim();
      // Handle JSON array format: '["01"]' -> "01"
      if (sls.startsWith('[')) {
        try {
          const arr = JSON.parse(sls);
          sls = Array.isArray(arr) && arr.length > 0 ? String(arr[0]) : sls;
        } catch (e) { /* not JSON, continue */ }
      }
      // Strip prefixes and suffixes
      // "RT 001 [LIMBU SEDULUN]" -> "001"
      // "SLS 01 Limbu Sedulun" -> "01"
      const stripped = sls
        .replace(/^(RT|SLS)\s+/i, '')     // Remove RT/SLS prefix
        .replace(/\s*\[.*\]$/, '')          // Remove [DESA] suffix
        .replace(/\s+.*$/, '')              // Remove trailing desa name
        .trim();
      // Extract digits from formats like "(*01*)" -> "01"
      const digits = stripped.replace(/[^0-9]/g, '');
      return digits ? digits.padStart(2, '0') : null;
    };

    /**
     * Extract clean code from a lokus SLS entry.
     * "RT 001 [LIMBU SEDULUN]" -> "01" (removing leading zeros beyond 2 digits)
     * "SLS 01 Limbu Sedulun" -> "01"
     */
    const extractLokusSlsCode = (entry) => {
      const stripped = entry
        .replace(/^(RT|SLS)\s+/i, '')
        .replace(/\s*\[.*\]$/, '')
        .replace(/\|\|.*$/, '')           // Handle "RT 001||BUONG BARU" format
        .replace(/\s+.*$/, '')
        .trim();
      const digits = stripped.replace(/[^0-9]/g, '');
      return digits ? digits.padStart(2, '0') : null;
    };

    /**
     * Check if an SLS code is valid (exists in the kegiatan lokus config).
     * Compares numerically to handle different zero-padding ("01" matches "001").
     */
    const isValidSls = (code) => {
      if (knownSlsList.length === 0) return true; // no SLS config means accept all
      const codeNum = parseInt(code, 10);
      if (isNaN(codeNum) || codeNum <= 0) return false; // "00" is invalid
      return knownSlsList.some(slsEntry => {
        const entryCode = extractLokusSlsCode(slsEntry);
        return entryCode && parseInt(entryCode, 10) === codeNum;
      });
    };

    let totalDokumen = 0, approved = 0, rejected = 0, pending = 0, draft = 0, tambahan = 0;
    const lokusMap = {};
    const kegiatanProgressMap = {};

    filteredDocs.forEach(d => {
      totalDokumen++;
      const isPending = d.review_status === 'draft' && d.status === 'terkirim';
      const isDraft = d.review_status === 'draft' && (d.status === 'draft' || d.status === 'tersimpan');
      const isTambahan = !d.is_prelist;

      if (d.review_status === 'approved') approved++;
      if (!isTambahan) {
          if (d.review_status === 'rejected') rejected++;
          if (isPending) pending++;
          if (isDraft) draft++;
      }
      if (isTambahan) tambahan++;

      // Normalize desa name using kegiatan lokus
      const normalizedDesa = normalizeDesa(d.desa);
      
      const rtAnswer = d.dokumen_jawaban?.[0]?.value;
      const isSlsEmpty = !d.sls || d.sls === '-' || d.sls === '00' || d.sls === 0 || d.sls === '0000';
      const effectiveSls = isSlsEmpty && (d.sub_sls || rtAnswer) ? (d.sub_sls || rtAnswer) : d.sls;

      let lokusKey;
      if (groupBy === 'kegiatan') {
        lokusKey = kegiatanMap[d.kegiatan_id] || 'Unknown Kegiatan';
      } else {
        if (effectiveSls) {
          const code = cleanSlsCode(effectiveSls);
          if (code && (knownSlsList.length === 0 || isValidSls(code))) {
            lokusKey = `${normalizedDesa} - SLS ${code}`;
          } else {
            lokusKey = normalizedDesa || 'Unknown';
          }
        } else {
          lokusKey = normalizedDesa || 'Unknown';
        }
      }

      const isUnknownOrTidak = groupBy !== 'kegiatan' && lokusKey && (
        lokusKey.toUpperCase().includes('UNKNOWN') || 
        lokusKey.toUpperCase().includes('TIDAK') ||
        lokusKey.toUpperCase() === 'DESA' ||
        lokusKey.toUpperCase().startsWith('DESA -')
      );

      if (!isUnknownOrTidak) {
        if (!lokusMap[lokusKey]) {
          lokusMap[lokusKey] = { name: lokusKey, Selesai: 0, Review: 0, Ditolak: 0, Draft: 0, Tambahan: 0, TambahanApproved: 0, Total: 0 };
        }
        
        lokusMap[lokusKey].Total++;
        if (d.review_status === 'approved') lokusMap[lokusKey].Selesai++;
        if (!isTambahan) {
            if (d.review_status === 'rejected') lokusMap[lokusKey].Ditolak++;
            if (isPending) lokusMap[lokusKey].Review++;
            if (isDraft) lokusMap[lokusKey].Draft++;
        }
        if (isTambahan) {
            lokusMap[lokusKey].Tambahan++;
            if (d.review_status === 'approved') lokusMap[lokusKey].TambahanApproved++;
        }
      }

      const kegName = kegiatanMap[d.kegiatan_id] || 'Unknown Kegiatan';
      if (!kegiatanProgressMap[kegName]) {
        kegiatanProgressMap[kegName] = { name: kegName, Selesai: 0, Review: 0, Ditolak: 0, Draft: 0, Tambahan: 0, TambahanApproved: 0, Total: 0 };
      }
      kegiatanProgressMap[kegName].Total++;
      if (d.review_status === 'approved') kegiatanProgressMap[kegName].Selesai++;
      if (!isTambahan) {
          if (d.review_status === 'rejected') kegiatanProgressMap[kegName].Ditolak++;
          if (isPending) kegiatanProgressMap[kegName].Review++;
          if (isDraft) kegiatanProgressMap[kegName].Draft++;
      }
      if (isTambahan) {
          kegiatanProgressMap[kegName].Tambahan++;
          if (d.review_status === 'approved') kegiatanProgressMap[kegName].TambahanApproved++;
      }
    });

    const totalAssignment = totalDokumen;
    const lokusProgress = Object.values(lokusMap).sort((a, b) => a.name.localeCompare(b.name));
    const kegiatanProgress = Object.values(kegiatanProgressMap).sort((a, b) => {
      const aPct = a.Total > 0 ? (a.Total - a.Draft) / a.Total : 0;
      const bPct = b.Total > 0 ? (b.Total - b.Draft) / b.Total : 0;
      if (bPct !== aPct) return bPct - aPct;
      return a.name.localeCompare(b.name);
    });

    // 5. Data Chart Harian
    let dateFilter = {};
    if (range === '7' || range === '30') {
      const days = parseInt(range, 10);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
      dateFilter = {
        OR: [
          { created_at: { gte: startDate } },
          { updated_at: { gte: startDate } }
        ]
      };
    } else if (!range || range !== 'all') {
      // Default to 7 days if not provided
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      dateFilter = {
        OR: [
          { created_at: { gte: startDate } },
          { updated_at: { gte: startDate } }
        ]
      };
    }

    const documents = await prisma.dokumen.findMany({
      where: {
        ...dateFilter,
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
        is_prelist: true,
        desa: true,
        kegiatan_id: true
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    // Filter documents for daily chart in-memory if a specific village is requested
    let filteredDailyDocs = documents;
    if (desa && desa !== 'Semua Desa') {
      const targetDesaUpper = desa.replace(/^Desa\s+/i, '').toUpperCase();
      filteredDailyDocs = documents.filter(d => {
        const norm = normalizeDesa(d.desa);
        return norm && norm.toUpperCase() === targetDesaUpper;
      });
    }

    // Determine start date for generating continuous dates
    let startDateForChart = new Date();
    startDateForChart.setHours(0, 0, 0, 0);

    if (range === '7' || range === '30') {
      const days = parseInt(range, 10);
      startDateForChart.setDate(startDateForChart.getDate() - days + 1); // include today
    } else {
      // Find the earliest date in filteredDailyDocs
      if (filteredDailyDocs.length > 0) {
        let earliest = filteredDailyDocs.reduce((min, doc) => {
          const dDate = doc.is_prelist ? doc.updated_at : doc.created_at;
          return dDate < min ? dDate : min;
        }, new Date());
        startDateForChart = new Date(earliest);
        startDateForChart.setHours(0, 0, 0, 0);
      } else {
        startDateForChart.setDate(startDateForChart.getDate() - 6); // default to 7 days if no docs
      }
    }

    const endDateForChart = new Date();
    endDateForChart.setHours(0, 0, 0, 0);

    // Group documents by date in memory (database-agnostic)
    const groups = {};
    
    // Pre-fill all dates with 0
    for (let d = new Date(startDateForChart); d <= endDateForChart; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().split('T')[0];
      groups[dStr] = { date: dStr, totalCount: 0, rejected: 0, byKegiatan: {} };
      
      // Initialize all activities with 0
      Object.keys(kegiatanMap).forEach(k => {
        groups[dStr].byKegiatan[kegiatanMap[k]] = 0;
      });
    }

    filteredDailyDocs.forEach(doc => {
      // Use updated_at for prelist documents to reflect when they were actually submitted, 
      // otherwise use created_at (for new tambahan)
      const targetDate = doc.is_prelist ? doc.updated_at : doc.created_at;
      const dateStr = targetDate.toISOString().split('T')[0];
      if (groups[dateStr]) {
        groups[dateStr].totalCount++;
        if (doc.review_status === 'rejected') {
          groups[dateStr].rejected++;
        }
        const kName = kegiatanMap[doc.kegiatan_id] || 'Unknown Kegiatan';
        groups[dateStr].byKegiatan[kName] = (groups[dateStr].byKegiatan[kName] || 0) + 1;
      }
    });

    const chartRows = Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));

    const formattedChartData = chartRows.map(row => {
      const entry = { date: row.date, k: row.totalCount };
      Object.keys(row.byKegiatan).forEach(keg => {
        entry[keg] = row.byKegiatan[keg];
      });
      return entry;
    });

    // 6. Log aktivitas terbaru
    const recentLogs = await prisma.dokumenLog.findMany({
      where: whereClause.kegiatan_id ? {
        dokumen: { kegiatan_id: whereClause.kegiatan_id }
      } : {},
      include: {
        dokumen: {
          select: {
            kode: true,
            desa: true,
            petugas: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 100
    });

    let filteredLogs = recentLogs;
    if (desa && desa !== 'Semua Desa') {
      const targetDesaUpper = desa.replace(/^Desa\s+/i, '').toUpperCase();
      filteredLogs = recentLogs.filter(l => {
        const norm = normalizeDesa(l.dokumen?.desa);
        return norm && norm.toUpperCase() === targetDesaUpper;
      });
    }
    const finalLogs = filteredLogs.slice(0, 5);

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
        lokusProgress,
        kegiatanProgress,
        totalAssignment
      },
      chartData: formattedChartData,
      recentLogs: finalLogs.map(l => ({
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
