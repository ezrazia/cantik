import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';

const router = Router();

/**
 * GET /api/kegiatan
 * Mengambil semua daftar kegiatan.
 */
router.get('/', async (req, res) => {
  try {
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

    const formatted = rows.map(k => {
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

    return res.json(formatted);
  } catch (error) {
    console.error('Error fetching kegiatan:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data kegiatan' });
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

    const updatedKegiatan = await prisma.kegiatan.update({
      where: {
        id: parseInt(id, 10),
      },
      data: updateData,
    });

    if (updatedKegiatan.status === 'published') {
      const existingAdmin = await prisma.admin.findFirst({
        where: { kegiatan_id: updatedKegiatan.id, role: 'admin_kegiatan' }
      });

      if (!existingAdmin) {
        const slugName = updatedKegiatan.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        let finalUsername = `admin_${slugName}`;

        const existingUser = await prisma.admin.findUnique({
          where: { username: finalUsername }
        });
        if (existingUser) {
          finalUsername = `admin_${slugName}_${updatedKegiatan.id}`;
        }

        // Generate secure random password
        const crypto = await import('crypto');
        const rawPassword = crypto.randomBytes(8).toString('hex');

        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        await prisma.admin.create({
          data: {
            username: finalUsername,
            password: hashedPassword,
            // NOTE: plain_password should be stored encrypted in production
            // For now, store with prefix to indicate it's a generated temp password
            plain_password: `TEMP_${rawPassword}`,
            nama: `Admin ${updatedKegiatan.name}`,
            role: 'admin_kegiatan',
            kegiatan_id: updatedKegiatan.id
          }
        });
      }
    }

    return res.json({ success: true, message: 'Kegiatan berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating kegiatan:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui kegiatan' });
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
