import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { syncDokumenFromPetugasKegiatan } from '../config/syncHelper.js';

const router = Router();

/**
 * GET /api/petugas
 * Mengambil daftar semua petugas lapangan.
 */
router.get('/', async (req, res) => {
  try {
    const allDocs = await prisma.dokumen.findMany({
      select: {
        kegiatan_id: true,
        status: true,
        petugas_id: true,
        assigned_pcls: true,
        assigned_pmls: true,
        review_status: true,
        is_prelist: true
      }
    });

    const rows = await prisma.petugas.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        petugas_kegiatan: {
          include: {
            kegiatan: {
              select: { name: true },
            },
          },
        },
      },
    });

    // Gabungkan data kegiatan ke petugas
    const petugasWithActivities = rows.map(p => {
      const projects = p.petugas_kegiatan.map(pk => pk.kegiatan?.name || '');
      const projectRoles = {};
      const slsAssignments = {};

      p.petugas_kegiatan.forEach(pk => {
        const kName = pk.kegiatan?.name || '';
        projectRoles[kName] = pk.role;

        // Hitung statistik target/selesai dokumen petugas untuk kegiatan ini
        const docsForKegiatan = allDocs.filter(d => 
          d.kegiatan_id === pk.kegiatan_id && 
          (d.petugas_id === p.id || 
           (Array.isArray(d.assigned_pcls) && (d.assigned_pcls.includes(p.username) || d.assigned_pcls.includes(p.name))) ||
           (Array.isArray(d.assigned_pmls) && (d.assigned_pmls.includes(p.username) || d.assigned_pmls.includes(p.name))))
        );
        const target = docsForKegiatan.length;
        const selesai = docsForKegiatan.filter(d => d.review_status === 'approved').length;
        const draft = docsForKegiatan.filter(d => d.review_status === 'draft' && (d.status === 'draft' || d.status === 'tersimpan')).length;
        const pending = docsForKegiatan.filter(d => d.review_status === 'draft' && d.status === 'terkirim').length;
        const rejected = docsForKegiatan.filter(d => d.review_status === 'rejected').length;
        const approved = docsForKegiatan.filter(d => d.review_status === 'approved').length;
        const tambahan = docsForKegiatan.filter(d => d.is_prelist === false).length;

        let parsedSls = [];
        if (pk.sls_assignments) {
          if (typeof pk.sls_assignments === 'string') {
            try {
              parsedSls = JSON.parse(pk.sls_assignments);
            } catch {
              parsedSls = [];
            }
          } else if (Array.isArray(pk.sls_assignments)) {
            parsedSls = pk.sls_assignments;
          }
        }

        slsAssignments[kName] = {
          sls: parsedSls,
          pengawas: pk.pengawas || null,
          target,
          selesai,
          draft,
          pending,
          rejected,
          approved,
          tambahan,
        };
      });

      // Hapus data relasi agar format response bersih sesuai original
      const { petugas_kegiatan, ...petugasData } = p;

      return {
        ...petugasData,
        projects,
        projectRoles,
        assignments: slsAssignments,
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

    const result = await prisma.petugas.create({
      data: {
        username,
        password: hashedPassword,
        name,
        nik: nik || null,
        phone: phone || null,
        desa: desa || null,
        status: status || 'active',
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Petugas berhasil ditambahkan',
      petugasId: result.id,
    });
  } catch (error) {
    console.error('Error creating petugas:', error);
    if (error.code === 'P2002') {
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
    const existing = await prisma.petugas.findUnique({
      where: { id: parseInt(id, 10) },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Petugas tidak ditemukan' });
    }

    const updateData = {
      username,
      name,
      nik: nik || null,
      phone: phone || null,
      desa: desa || null,
      status: status || 'active',
      target: target || 0,
      selesai: selesai || 0,
    };

    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await prisma.petugas.update({
      where: {
        id: parseInt(id, 10),
      },
      data: updateData,
    });

    return res.json({ success: true, message: 'Data petugas berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating petugas:', error);
    if (error.code === 'P2002') {
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
    await prisma.petugas.delete({
      where: {
        id: parseInt(id, 10),
      },
    });
    return res.json({ success: true, message: 'Petugas berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting petugas:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Petugas tidak ditemukan' });
    }
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
    const kegId = parseInt(kegiatan_id, 10);
    await prisma.petugasKegiatan.upsert({
      where: {
        uk_petugas_kegiatan: {
          petugas_id: parseInt(petugas_id, 10),
          kegiatan_id: kegId,
        },
      },
      update: {
        role: role || 'PCL',
        sls_assignments: sls_assignments || null,
        pengawas: pengawas || null,
      },
      create: {
        petugas_id: parseInt(petugas_id, 10),
        kegiatan_id: kegId,
        role: role || 'PCL',
        sls_assignments: sls_assignments || null,
        pengawas: pengawas || null,
      },
    });

    // Sync to Dokumen
    await syncDokumenFromPetugasKegiatan(kegId);

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
    const kegId = parseInt(kegiatan_id, 10);
    await prisma.petugasKegiatan.delete({
      where: {
        uk_petugas_kegiatan: {
          petugas_id: parseInt(petugas_id, 10),
          kegiatan_id: kegId,
        },
      },
    });

    // Sync to Dokumen
    await syncDokumenFromPetugasKegiatan(kegId);

    return res.json({ success: true, message: 'Penugasan petugas berhasil dihapus' });
  } catch (error) {
    console.error('Error unassigning petugas:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus penugasan petugas' });
  }
});

export default router;
