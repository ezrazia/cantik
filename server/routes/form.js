import { Router } from 'express';
import prisma from '../config/database.js';

const router = Router();

/**
 * GET /api/form/:kegiatanId
 * Mengambil seluruh blok dan pertanyaan untuk kegiatan tertentu.
 */
router.get('/:kegiatanId', async (req, res) => {
  const { kegiatanId } = req.params;
  try {
    // Ambil semua blok
    const blocks = await prisma.formBlok.findMany({
      where: {
        kegiatan_id: parseInt(kegiatanId, 10),
      },
      orderBy: [
        { sort_order: 'asc' },
        { id: 'asc' },
      ],
    });

    if (blocks.length === 0) {
      return res.json({ success: true, blocks: [], questions: [] });
    }

    const blockIds = blocks.map(b => b.id);

    // Ambil semua pertanyaan di blok-blok tersebut
    const questions = await prisma.formQuestion.findMany({
      where: {
        blok_id: { in: blockIds },
      },
      orderBy: [
        { sort_order: 'asc' },
        { id: 'asc' },
      ],
    });

    // Format options JSON string to JS array (Prisma handles parsing automatically, but let's make sure it is ready)
    const formattedQuestions = questions.map(q => {
      let optParsed = q.options;
      if (typeof optParsed === 'string') {
        try {
          optParsed = JSON.parse(optParsed);
        } catch {
          optParsed = null;
        }
      }
      return {
        ...q,
        options: optParsed,
      };
    });

    return res.json({
      success: true,
      blocks,
      questions: formattedQuestions,
    });
  } catch (error) {
    console.error('Error fetching form structure:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil struktur kuesioner' });
  }
});

/**
 * POST /api/form/blok
 * Membuat blok kuesioner baru.
 */
router.post('/blok', async (req, res) => {
  const { kegiatan_id, kode, title, sort_order } = req.body;
  if (!kegiatan_id || !kode || !title) {
    return res.status(400).json({ success: false, message: 'Kegiatan ID, Kode Blok, dan Judul wajib diisi' });
  }

  try {
    const result = await prisma.formBlok.create({
      data: {
        kegiatan_id: parseInt(kegiatan_id, 10),
        kode,
        title,
        sort_order: sort_order || 0,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Blok kuesioner berhasil ditambahkan',
      blok: result,
    });
  } catch (error) {
    console.error('Error creating form block:', error);
    return res.status(500).json({ success: false, message: 'Gagal menambahkan blok kuesioner' });
  }
});

/**
 * PUT /api/form/blok/:id
 * Mengupdate blok kuesioner.
 */
router.put('/blok/:id', async (req, res) => {
  const { id } = req.params;
  const { kode, title, sort_order } = req.body;

  try {
    await prisma.formBlok.update({
      where: {
        id: parseInt(id, 10),
      },
      data: {
        kode,
        title,
        sort_order: sort_order || 0,
      },
    });

    return res.json({ success: true, message: 'Blok kuesioner berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating form block:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui blok kuesioner' });
  }
});

/**
 * DELETE /api/form/blok/:id
 * Menghapus blok kuesioner beserta semua pertanyaannya.
 */
router.delete('/blok/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.formBlok.delete({
      where: {
        id: parseInt(id, 10),
      },
    });
    return res.json({ success: true, message: 'Blok kuesioner berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting form block:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus blok kuesioner' });
  }
});

/**
 * POST /api/form/question
 * Menambah pertanyaan baru ke blok.
 */
router.post('/question', async (req, res) => {
  const {
    blok_id, parent_id, label, type, required, options,
    validation, skip_logic, skip_target, show_if_parent_id, show_if_value, sort_order
  } = req.body;

  if (!blok_id || !label) {
    return res.status(400).json({ success: false, message: 'Blok ID dan Label pertanyaan wajib diisi' });
  }

  try {
    const result = await prisma.formQuestion.create({
      data: {
        blok_id: parseInt(blok_id, 10),
        parent_id: parent_id ? parseInt(parent_id, 10) : null,
        label,
        type: type || 'text',
        required: required ? true : false,
        options: options || null,
        validation: validation || null,
        skip_logic: skip_logic || null,
        skip_target: skip_target ? parseInt(skip_target, 10) : null,
        show_if_parent_id: show_if_parent_id ? parseInt(show_if_parent_id, 10) : null,
        show_if_value: show_if_value || null,
        sort_order: sort_order || 0,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Pertanyaan berhasil ditambahkan',
      question: result,
    });
  } catch (error) {
    console.error('Error creating form question:', error);
    return res.status(500).json({ success: false, message: 'Gagal menambahkan pertanyaan' });
  }
});

/**
 * PUT /api/form/question/:id
 * Mengupdate pertanyaan.
 */
router.put('/question/:id', async (req, res) => {
  const { id } = req.params;
  console.log('PUT /question id:', id, 'body:', req.body);
  const {
    blok_id, parent_id, label, type, required, options,
    validation, skip_logic, skip_target, show_if_parent_id, show_if_value, sort_order
  } = req.body;

  try {
    await prisma.formQuestion.update({
      where: {
        id: parseInt(id, 10),
      },
      data: {
        blok_id: parseInt(blok_id, 10),
        parent_id: parent_id ? parseInt(parent_id, 10) : null,
        label,
        type: type || 'text',
        required: required ? true : false,
        options: options || null,
        validation: validation || null,
        skip_logic: skip_logic || null,
        skip_target: skip_target ? parseInt(skip_target, 10) : null,
        show_if_parent_id: show_if_parent_id ? parseInt(show_if_parent_id, 10) : null,
        show_if_value: show_if_value || null,
        sort_order: sort_order || 0,
      },
    });

    return res.json({ success: true, message: 'Pertanyaan berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating form question:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui pertanyaan' });
  }
});

/**
 * DELETE /api/form/question/:id
 * Menghapus pertanyaan.
 */
router.delete('/question/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.formQuestion.delete({
      where: {
        id: parseInt(id, 10),
      },
    });
    return res.json({ success: true, message: 'Pertanyaan berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting form question:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus pertanyaan' });
  }
});

export default router;
