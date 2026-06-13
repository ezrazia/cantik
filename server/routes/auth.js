import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';

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
    const admin = await prisma.admin.findUnique({
      where: { username }
    });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }
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
        role: admin.role,
        kegiatan_id: admin.kegiatan_id
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
    const petugas = await prisma.petugas.findUnique({
      where: { username },
      include: {
        petugas_kegiatan: {
          include: {
            kegiatan: {
              select: { name: true },
            },
          },
        },
        dokumen: {
          select: {
            kegiatan_id: true,
            status: true,
          },
        },
      },
    });

    if (!petugas) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }
    const isMatch = await bcrypt.compare(password, petugas.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    const projects = petugas.petugas_kegiatan.map(pk => pk.kegiatan?.name || '');
    const projectRoles = {};
    const slsAssignments = {};

    petugas.petugas_kegiatan.forEach(pk => {
      const kName = pk.kegiatan?.name || '';
      projectRoles[kName] = pk.role;

      const docsForKegiatan = petugas.dokumen.filter(d => d.kegiatan_id === pk.kegiatan_id);
      const target = docsForKegiatan.length;
      const selesai = docsForKegiatan.filter(d => ['tersimpan', 'terkirim'].includes(d.status)).length;
      const draft = docsForKegiatan.filter(d => d.status === 'draft').length;

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
      };
    });

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
        role: 'petugas',
        projects,
        projectRoles,
        assignments: slsAssignments,
      }
    });
  } catch (error) {
    console.error('Error during petugas login:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
  }
});

export default router;
