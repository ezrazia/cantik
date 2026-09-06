import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';

const router = Router();

/**
 * GET /api/admin/desa
 * Mengambil daftar seluruh akun Admin Desa.
 */
router.get('/desa', async (req, res) => {
  try {
    const admins = await prisma.admin.findMany({
      where: {
        role: 'admin_desa'
      },
      select: {
        id: true,
        username: true,
        nama: true,
        desa: true,
        role: true,
        created_at: true,
        updated_at: true
      },
      orderBy: {
        desa: 'asc'
      }
    });

    return res.json({
      success: true,
      data: admins
    });
  } catch (error) {
    console.error('Error fetching admin desa:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data akun desa' });
  }
});

/**
 * POST /api/admin/desa
 * Membuat atau memperbarui akun Admin Desa.
 */
router.post('/desa', async (req, res) => {
  const { username, password, nama, desa } = req.body;

  if (!username || !desa) {
    return res.status(400).json({ success: false, message: 'Username dan Desa wajib diisi' });
  }

  const cleanUsername = String(username).trim().toLowerCase().replace(/\s+/g, '_');
  const cleanPassword = String(password || 'admin123').trim();
  const cleanDesa = String(desa).trim();
  const cleanNama = String(nama || `Admin Desa ${cleanDesa}`).trim();

  try {
    const existing = await prisma.admin.findUnique({
      where: { username: cleanUsername }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: `Username "${cleanUsername}" sudah digunakan` });
    }

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);

    const newAdmin = await prisma.admin.create({
      data: {
        username: cleanUsername,
        password: hashedPassword,
        nama: cleanNama,
        desa: cleanDesa,
        role: 'admin_desa'
      },
      select: {
        id: true,
        username: true,
        nama: true,
        desa: true,
        role: true
      }
    });

    return res.status(201).json({
      success: true,
      message: `Akun Admin Desa ${cleanDesa} berhasil dibuat`,
      data: newAdmin
    });
  } catch (error) {
    console.error('Error creating admin desa:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat akun desa: ' + error.message });
  }
});

/**
 * PUT /api/admin/desa/:id/reset-password
 * Reset password akun Admin Desa.
 */
router.put('/desa/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  const adminId = parseInt(id, 10);

  if (isNaN(adminId)) {
    return res.status(400).json({ success: false, message: 'ID akun tidak valid' });
  }

  const passwordToSet = String(newPassword || 'admin123').trim();

  try {
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Akun admin tidak ditemukan' });
    }

    const hashedPassword = await bcrypt.hash(passwordToSet, 10);

    await prisma.admin.update({
      where: { id: adminId },
      data: { password: hashedPassword }
    });

    return res.json({
      success: true,
      message: `Password akun "${admin.username}" berhasil direset menjadi "${passwordToSet}"`
    });
  } catch (error) {
    console.error('Error resetting password admin desa:', error);
    return res.status(500).json({ success: false, message: 'Gagal mereset password: ' + error.message });
  }
});

/**
 * DELETE /api/admin/desa/:id
 * Menghapus akun Admin Desa.
 */
router.delete('/desa/:id', async (req, res) => {
  const { id } = req.params;
  const adminId = parseInt(id, 10);

  if (isNaN(adminId)) {
    return res.status(400).json({ success: false, message: 'ID akun tidak valid' });
  }

  try {
    await prisma.admin.delete({
      where: { id: adminId }
    });

    return res.json({
      success: true,
      message: 'Akun admin desa berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting admin desa:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus akun: ' + error.message });
  }
});

/**
 * POST /api/admin/desa/seed-all
 * Membuatkan akun default untuk semua desa yang belum memiliki akun admin desa.
 */
router.post('/desa/seed-all', async (req, res) => {
  try {
    const defaultPassword = await bcrypt.hash('admin123', 10);

    // Ambil semua desa unik dari master wilayah
    const distinctDesa = await prisma.wilayah.findMany({
      select: { desa: true },
      distinct: ['desa']
    });

    const existingAdminDesas = await prisma.admin.findMany({
      where: { role: 'admin_desa' },
      select: { desa: true, username: true }
    });

    const existingDesaSet = new Set(existingAdminDesas.map(a => String(a.desa || '').trim().toLowerCase()));

    let createdCount = 0;
    const createdList = [];

    for (const item of distinctDesa) {
      if (!item.desa) continue;
      const desaName = item.desa.trim();
      const desaKey = desaName.toLowerCase();

      if (!existingDesaSet.has(desaKey)) {
        // Buat username ramah format: admin_desa_limbusedulun
        const slug = desaKey.replace(/[^a-z0-9]/g, '');
        const username = `admin_desa_${slug}`;

        // Cek agar username tidak bentrok
        const userExists = await prisma.admin.findUnique({ where: { username } });
        const finalUsername = userExists ? `${username}_1` : username;

        const created = await prisma.admin.create({
          data: {
            username: finalUsername,
            password: defaultPassword,
            nama: `Admin Desa ${desaName}`,
            desa: desaName,
            role: 'admin_desa'
          },
          select: { id: true, username: true, desa: true }
        });

        createdCount++;
        createdList.push(created);
        existingDesaSet.add(desaKey);
      }
    }

    return res.json({
      success: true,
      message: `Berhasil membuat ${createdCount} akun admin desa baru dengan password default "admin123"`,
      createdCount,
      createdList
    });
  } catch (error) {
    console.error('Error seeding admin desas:', error);
    return res.status(500).json({ success: false, message: 'Gagal men-generate akun desa: ' + error.message });
  }
});

export default router;
