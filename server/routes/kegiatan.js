import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { cloneFormAndPrelist } from '../config/syncHelper.js';

const router = Router();

/**
 * GET /api/kegiatan
 * Mengambil semua daftar kegiatan (opsional filter per desa).
 */
router.get('/', async (req, res) => {
  try {
    const { desa } = req.query;

    const rows = await prisma.kegiatan.findMany({
      include: {
        admin: {
          select: {
            username: true,
            plain_password: true
          }
        }
      },
      orderBy: {
        start_date: 'desc',
      },
    });

    let formatted = rows.map(k => {
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
        lokus: lokusParsed || { kecamatan: [], desa: [], sls: [], subSls: [] },
        activity_admin: k.admin?.[0] || null
      };
    });

    // Filter per desa jika parameter desa diberikan (untuk Admin Desa)
    if (desa && String(desa).trim() !== '') {
      const cleanDesa = String(desa).trim().toLowerCase();
      formatted = formatted.filter(k => {
        // Cek field k.desa langsung
        if (k.desa && String(k.desa).trim().toLowerCase() === cleanDesa) return true;
        // Cek nama kegiatan apakah mencantumkan desa
        if (k.name && k.name.toLowerCase().includes(cleanDesa)) return true;
        // Cek array lokus desa
        const lokusDesas = (k.lokus?.desa || []).map(d => String(d).trim().toLowerCase());
        return lokusDesas.some(d => d.includes(cleanDesa) || cleanDesa.includes(d));
      });
    }

    return res.json(formatted);
  } catch (error) {
    console.error('Error fetching kegiatan:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data kegiatan' });
  }
});

/**
 * GET /api/kegiatan/:id
 * Mengambil detail satu kegiatan berdasarkan ID.
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const kegId = parseInt(id, 10);
  if (isNaN(kegId)) {
    return res.status(400).json({ success: false, message: 'ID kegiatan tidak valid' });
  }

  try {
    const keg = await prisma.kegiatan.findUnique({
      where: { id: kegId },
      include: {
        admin: {
          select: { id: true, username: true, nama: true, role: true, desa: true }
        }
      }
    });

    if (!keg) {
      return res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan' });
    }

    let lokusParsed = keg.lokus;
    if (typeof keg.lokus === 'string') {
      try {
        lokusParsed = JSON.parse(keg.lokus);
      } catch (e) {
        lokusParsed = { kecamatan: [], desa: [], sls: [], subSls: [] };
      }
    }

    return res.json({
      success: true,
      data: {
        ...keg,
        lokus: lokusParsed || { kecamatan: [], desa: [], sls: [], subSls: [] },
        activity_admin: keg.admin?.[0] || null
      }
    });
  } catch (error) {
    console.error('Error fetching kegiatan by id:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil detail kegiatan' });
  }
});

/**
 * POST /api/kegiatan
 * Membuat kegiatan baru.
 */
router.post('/', async (req, res) => {
  const { name, description, progress, color, text_color, bg_color, start_date, status, lokus, fokus } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Nama kegiatan wajib diisi' });
  }

  try {
    const result = await prisma.kegiatan.create({
      data: {
        name,
        description: description || null,
        progress: progress || 0,
        color: color || 'bg-blue-600',
        text_color: text_color || 'text-blue-600',
        bg_color: bg_color || 'bg-blue-50',
        start_date: start_date ? new Date(start_date) : null,
        status: status || 'draft',
        lokus: lokus || { kecamatan: [], desa: [], sls: [], subSls: [] },
        fokus: fokus || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Kegiatan berhasil dibuat',
      kegiatanId: result.id,
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
  const { name, description, progress, color, text_color, bg_color, start_date, status, lokus, fokus } = req.body;

  if (name !== undefined && (!name || name.trim() === '')) {
    return res.status(400).json({ success: false, message: 'Nama kegiatan wajib diisi' });
  }

  try {
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (progress !== undefined) updateData.progress = progress;
    if (color !== undefined) updateData.color = color;
    if (text_color !== undefined) updateData.text_color = text_color;
    if (bg_color !== undefined) updateData.bg_color = bg_color;
    if (start_date !== undefined) updateData.start_date = start_date ? new Date(start_date) : null;
    if (status !== undefined) updateData.status = status;
    if (lokus !== undefined) updateData.lokus = lokus;
    if (fokus !== undefined) updateData.fokus = fokus;
    if (req.body.catatan_revisi !== undefined) updateData.catatan_revisi = req.body.catatan_revisi;
    if (req.body.source_kegiatan_id !== undefined) updateData.source_kegiatan_id = req.body.source_kegiatan_id ? parseInt(req.body.source_kegiatan_id, 10) : null;

    const updatedKegiatan = await prisma.kegiatan.update({
      where: {
        id: parseInt(id, 10),
      },
      data: updateData,
    });

    return res.json({ success: true, message: 'Kegiatan berhasil diperbarui', data: updatedKegiatan });
  } catch (error) {
    console.error('Error updating kegiatan:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui kegiatan' });
  }
});

/**
 * POST /api/kegiatan/pengajuan-desa
 * Diajukan oleh Admin Desa. Status otomatis "pengajuan" (menunggu persetujuan BPS).
 */
router.post('/pengajuan-desa', async (req, res) => {
  const { 
    name, 
    description, 
    desa, 
    kecamatan, 
    source_kegiatan_id, 
    start_date,
    selected_sls,
    selected_pml_id,
    selected_pcl_ids,
    sls_assignments
  } = req.body;

  if (!name || !desa) {
    return res.status(400).json({ success: false, message: 'Nama kegiatan dan desa wajib diisi' });
  }

  try {
    const sId = source_kegiatan_id ? parseInt(source_kegiatan_id, 10) : null;

    // Jika ada kegiatan sumber, cari lokusnya untuk menyelaraskan kecamatan jika kosong
    let finalKec = kecamatan || '';
    if (!finalKec && sId) {
      const src = await prisma.kegiatan.findUnique({ where: { id: sId }, select: { lokus: true } });
      if (src && src.lokus) {
        const lObj = typeof src.lokus === 'string' ? JSON.parse(src.lokus) : src.lokus;
        finalKec = lObj.kecamatan?.[0] || 'Sesayap';
      }
    }

    // Normalisasi SLS yang dipilih oleh desa
    const slsList = Array.isArray(selected_sls) 
      ? selected_sls.map(s => String(s).trim()).filter(Boolean) 
      : [];

    // 1. Kumpulkan semua ID PML dan PCL yang terlibat (dari global maupun dari per-RT sls_assignments)
    const allPclIds = new Set();
    const allPmlIds = new Set();

    if (selected_pml_id) {
      const pId = parseInt(selected_pml_id, 10);
      if (!isNaN(pId)) allPmlIds.add(pId);
    }
    if (Array.isArray(selected_pcl_ids)) {
      selected_pcl_ids.forEach(id => {
        const pId = parseInt(id, 10);
        if (!isNaN(pId)) allPclIds.add(pId);
      });
    }

    if (sls_assignments && typeof sls_assignments === 'object') {
      Object.values(sls_assignments).forEach(asg => {
        if (asg && asg.pml_id) {
          const pId = parseInt(asg.pml_id, 10);
          if (!isNaN(pId)) allPmlIds.add(pId);
        }
        if (asg && Array.isArray(asg.pcl_ids)) {
          asg.pcl_ids.forEach(id => {
            const pId = parseInt(id, 10);
            if (!isNaN(pId)) allPclIds.add(pId);
          });
        }
      });
    }

    const allInvolvedIds = Array.from(new Set([...allPclIds, ...allPmlIds]));
    const officers = allInvolvedIds.length > 0 
      ? await prisma.petugas.findMany({
          where: { id: { in: allInvolvedIds } },
          select: { id: true, name: true, username: true }
        })
      : [];
    const officerMap = new Map(officers.map(o => [o.id, o]));

    const defaultPmlObj = selected_pml_id ? officerMap.get(parseInt(selected_pml_id, 10)) : null;

    // 2. Bangun pemetaan sls_assignments lengkap untuk prelist_mapping per masing-masing SLS
    let finalAssignments = (sls_assignments && typeof sls_assignments === 'object') 
      ? { ...sls_assignments } 
      : {};

    for (const slsName of slsList) {
      if (!finalAssignments[slsName]) {
        finalAssignments[slsName] = {
          pcls: Array.from(allPclIds).map(id => officerMap.get(id)?.name || officerMap.get(id)?.username).filter(Boolean),
          pcl_ids: Array.from(allPclIds),
          pml: defaultPmlObj ? (defaultPmlObj.name || defaultPmlObj.username) : null,
          pml_id: defaultPmlObj ? defaultPmlObj.id : null
        };
      } else {
        const asg = finalAssignments[slsName];
        if (Array.isArray(asg.pcl_ids) && (!asg.pcls || asg.pcls.length === 0)) {
          asg.pcls = asg.pcl_ids.map(id => officerMap.get(parseInt(id, 10))?.name || officerMap.get(parseInt(id, 10))?.username).filter(Boolean);
        }
        if (asg.pml_id && !asg.pml) {
          const pmlObj = officerMap.get(parseInt(asg.pml_id, 10));
          asg.pml = pmlObj ? (pmlObj.name || pmlObj.username) : null;
        }
      }
    }

    const newKegiatan = await prisma.kegiatan.create({
      data: {
        name,
        description: description || `Kegiatan survei diajukan oleh Desa ${desa}`,
        progress: 0,
        color: 'bg-indigo-600',
        text_color: 'text-indigo-600',
        bg_color: 'bg-indigo-50',
        start_date: start_date ? new Date(start_date) : new Date(),
        status: 'pengajuan',
        desa: String(desa).trim(),
        source_kegiatan_id: sId,
        lokus: {
          kecamatan: finalKec ? [finalKec] : ['Sesayap'],
          desa: [String(desa).trim()],
          sls: slsList,
          subSls: []
        },
        prelist_mapping: {
          use_prelist: Boolean(sId),
          source_kegiatan_id: sId,
          selected_sls: slsList,
          sls_assignments: finalAssignments
        }
      }
    });

    // 3. Petakan SLS spesifik untuk masing-masing petugas (PML & PCL)
    const pmlSlsMap = new Map(); // pmlId -> Set(slsNames)
    const pclSlsMap = new Map(); // pclId -> Set(slsNames)
    const pclPengawasMap = new Map(); // pclId -> pmlName

    for (const slsName of slsList) {
      const asg = finalAssignments[slsName];
      if (!asg) continue;

      if (asg.pml_id) {
        const pId = parseInt(asg.pml_id, 10);
        if (!pmlSlsMap.has(pId)) pmlSlsMap.set(pId, new Set());
        pmlSlsMap.get(pId).add(slsName);
      }

      if (Array.isArray(asg.pcl_ids)) {
        asg.pcl_ids.forEach(id => {
          const pId = parseInt(id, 10);
          if (!pclSlsMap.has(pId)) pclSlsMap.set(pId, new Set());
          pclSlsMap.get(pId).add(slsName);
          if (asg.pml && !pclPengawasMap.has(pId)) {
            pclPengawasMap.set(pId, asg.pml);
          }
        });
      }
    }

    // Buat relasi awal petugas_kegiatan untuk PML dengan SLS yang ditugaskan
    for (const [pmlId, slsSet] of pmlSlsMap.entries()) {
      await prisma.petugasKegiatan.create({
        data: {
          petugas_id: pmlId,
          kegiatan_id: newKegiatan.id,
          role: 'PML',
          sls_assignments: Array.from(slsSet),
          pengawas: null
        }
      });
    }

    // Buat relasi awal petugas_kegiatan untuk PCL dengan SLS spesifik RT masing-masing
    for (const [pclId, slsSet] of pclSlsMap.entries()) {
      await prisma.petugasKegiatan.create({
        data: {
          petugas_id: pclId,
          kegiatan_id: newKegiatan.id,
          role: 'PCL',
          sls_assignments: Array.from(slsSet),
          pengawas: pclPengawasMap.get(pclId) || (defaultPmlObj ? (defaultPmlObj.name || defaultPmlObj.username) : null)
        }
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Pengajuan kegiatan berhasil dikirim ke BPS',
      kegiatanId: newKegiatan.id,
      data: newKegiatan
    });
  } catch (error) {
    console.error('Error submitting kegiatan from desa:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengajukan kegiatan: ' + error.message });
  }
});

/**
 * POST /api/kegiatan/:id/approve-pengajuan
 * Disetujui oleh Admin BPS.
 * Status langsung berubah menjadi 'published' (langsung dimulai).
 * Jika ada source_kegiatan_id, seluruh form blok, pertanyaan, dan dokumen prelist beserta isiannya otomatis dikloning!
 */
router.post('/:id/approve-pengajuan', async (req, res) => {
  const { id } = req.params;
  const kegId = parseInt(id, 10);

  if (isNaN(kegId)) {
    return res.status(400).json({ success: false, message: 'ID kegiatan tidak valid' });
  }

  try {
    const keg = await prisma.kegiatan.findUnique({ where: { id: kegId } });
    if (!keg) {
      return res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan' });
    }

    let clonedInfo = null;

    // 1. Kloning form dan prelist jika ada source_kegiatan_id
    if (keg.source_kegiatan_id) {
      clonedInfo = await cloneFormAndPrelist(prisma, keg.source_kegiatan_id, keg.id, keg.desa);
    }

    // 2. Ubah status menjadi published (langsung dimulai)
    await prisma.kegiatan.update({
      where: { id: kegId },
      data: {
        status: 'published',
        catatan_revisi: null
      }
    });

    return res.json({
      success: true,
      message: 'Pengajuan kegiatan berhasil disetujui dan langsung dimulai (Published)',
      clonedInfo
    });
  } catch (error) {
    console.error('Error approving kegiatan:', error);
    return res.status(500).json({ success: false, message: 'Gagal menyetujui kegiatan: ' + error.message });
  }
});

/**
 * POST /api/kegiatan/:id/reject-pengajuan
 * Ditolak / diminta revisi oleh Admin BPS dengan catatan.
 */
router.post('/:id/reject-pengajuan', async (req, res) => {
  const { id } = req.params;
  const { catatan_revisi } = req.body;
  const kegId = parseInt(id, 10);

  if (isNaN(kegId)) {
    return res.status(400).json({ success: false, message: 'ID kegiatan tidak valid' });
  }

  try {
    const keg = await prisma.kegiatan.findUnique({ where: { id: kegId } });
    if (!keg) {
      return res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan' });
    }

    const updated = await prisma.kegiatan.update({
      where: { id: kegId },
      data: {
        status: 'ditolak',
        catatan_revisi: catatan_revisi || 'Pengajuan kegiatan memerlukan perbaikan dari desa'
      }
    });

    return res.json({
      success: true,
      message: 'Pengajuan kegiatan telah dikembalikan ke desa dengan catatan perbaikan',
      data: updated
    });
  } catch (error) {
    console.error('Error rejecting kegiatan:', error);
    return res.status(500).json({ success: false, message: 'Gagal menolak kegiatan: ' + error.message });
  }
});

/**
 * DELETE /api/kegiatan/:id
 * Menghapus kegiatan.
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.kegiatan.delete({
      where: {
        id: parseInt(id, 10),
      },
    });
    return res.json({ success: true, message: 'Kegiatan berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting kegiatan:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus kegiatan' });
  }
});

export default router;
