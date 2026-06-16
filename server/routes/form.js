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
      // Debug: Log questions with loop settings
      if (q.validation && q.validation.includes('is_loop')) {
        console.log('[GET /form/:kegiatanId] Loop question:', { id: q.id, validation: q.validation });
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
  const { kegiatan_id, kode, title, sort_order, hide_logic } = req.body;
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
        hide_logic: hide_logic || null,
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
  const { kode, title, sort_order, hide_logic } = req.body;

  try {
    await prisma.formBlok.update({
      where: {
        id: parseInt(id, 10),
      },
      data: {
        kode,
        title,
        sort_order: sort_order || 0,
        hide_logic: hide_logic !== undefined ? hide_logic : null,
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

  console.log('[form.js] POST /question received:', {
    blok_id, parent_id, label: label?.substring(0, 50),
    type, required, sort_order
  });

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

    console.log('[form.js] Question created successfully:', { id: result.id, parent_id: result.parent_id, label: result.label?.substring(0, 50) });

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
  console.log('PUT /question id:', id);
  const {
    blok_id, parent_id, label, type, required, options,
    validation, skip_logic, skip_target, show_if_parent_id, show_if_value, sort_order
  } = req.body;

  // Debug: Log validation content to ensure loop data is preserved
  console.log('[PUT /question] validation:', validation);
  console.log('[PUT /question] validation length:', validation ? validation.length : 0);

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

/**
 * POST /api/form/copy
 * Menyalin kuesioner (blok, pertanyaan, validasi, skip logic, dll) dari satu kegiatan ke kegiatan lain.
 */
router.post('/copy', async (req, res) => {
  const { source_kegiatan_id, target_kegiatan_id } = req.body;
  
  if (!source_kegiatan_id || !target_kegiatan_id) {
    return res.status(400).json({ success: false, message: 'Source Kegiatan ID dan Target Kegiatan ID wajib diisi' });
  }

  const srcId = parseInt(source_kegiatan_id, 10);
  const tgtId = parseInt(target_kegiatan_id, 10);

  if (srcId === tgtId) {
    return res.status(400).json({ success: false, message: 'Kegiatan asal dan tujuan tidak boleh sama' });
  }

  try {
    // 1. Validasi kegiatan target tidak boleh sudah memiliki dokumen entri data dari petugas
    const docCount = await prisma.dokumen.count({
      where: { kegiatan_id: tgtId }
    });

    if (docCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Gagal menyalin: Kegiatan target sudah memiliki dokumen entri data dari petugas. Struktur kuesioner tidak dapat diubah.' 
      });
    }

    // 2. Ambil semua blok kegiatan sumber
    const sourceBlocks = await prisma.formBlok.findMany({
      where: { kegiatan_id: srcId },
      orderBy: { sort_order: 'asc' }
    });

    if (sourceBlocks.length === 0) {
      return res.status(400).json({ success: false, message: 'Kegiatan asal tidak memiliki kuesioner untuk disalin' });
    }

    // 3. Clear existing blocks on target (onDelete: Cascade will automatically delete questions)
    await prisma.formBlok.deleteMany({
      where: { kegiatan_id: tgtId }
    });

    // 4. Salin blok dan buat mapping ID blok
    const blockIdMap = {}; // { oldBlockId: newBlockId }
    for (const sb of sourceBlocks) {
      const newBlock = await prisma.formBlok.create({
        data: {
          kegiatan_id: tgtId,
          kode: sb.kode,
          title: sb.title,
          sort_order: sb.sort_order,
          hide_logic: sb.hide_logic
        }
      });
      blockIdMap[sb.id] = newBlock.id;
    }

    // 5. Ambil semua pertanyaan dari blok sumber
    const sourceQuestions = await prisma.formQuestion.findMany({
      where: {
        blok_id: { in: sourceBlocks.map(b => b.id) }
      },
      orderBy: { sort_order: 'asc' }
    });

    // 6. Buat pertanyaan baru tanpa relasi (parent_id, show_if_parent_id, skip_target)
    const questionIdMap = {}; // { oldQuestionId: newQuestionId }
    for (const sq of sourceQuestions) {
      const newBlockId = blockIdMap[sq.blok_id];
      const newQ = await prisma.formQuestion.create({
        data: {
          blok_id: newBlockId,
          label: sq.label,
          type: sq.type,
          required: sq.required,
          options: sq.options,
          validation: sq.validation,
          sort_order: sq.sort_order
        }
      });
      questionIdMap[sq.id] = newQ.id;
    }

    // Helper to update question IDs in JSON strings
    const updateJsonIds = (jsonStr, idMap) => {
      if (!jsonStr) return null;
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed && Array.isArray(parsed.conditions)) {
          parsed.conditions = parsed.conditions.map(cond => {
            if (cond.question_id && idMap[cond.question_id]) {
              return { ...cond, question_id: idMap[cond.question_id] };
            }
            return cond;
          });
          return JSON.stringify(parsed);
        }
      } catch (e) {}
      return jsonStr;
    };

    // 7. Update relasi dan aturan logika pada pertanyaan baru
    for (const sq of sourceQuestions) {
      const newQId = questionIdMap[sq.id];
      const updates = {};

      if (sq.parent_id && questionIdMap[sq.parent_id]) {
        updates.parent_id = questionIdMap[sq.parent_id];
      }
      if (sq.show_if_parent_id && questionIdMap[sq.show_if_parent_id]) {
        updates.show_if_parent_id = questionIdMap[sq.show_if_parent_id];
      }
      if (sq.skip_target && questionIdMap[sq.skip_target]) {
        updates.skip_target = questionIdMap[sq.skip_target];
      }

      // Update skip_logic & show_if_value JSON strings
      if (sq.skip_logic) {
        updates.skip_logic = updateJsonIds(sq.skip_logic, questionIdMap);
      }
      if (sq.show_if_value) {
        updates.show_if_value = updateJsonIds(sq.show_if_value, questionIdMap);
      }

      if (Object.keys(updates).length > 0) {
        await prisma.formQuestion.update({
          where: { id: newQId },
          data: updates
        });
      }
    }

    // 8. Update hide_logic pada blok baru
    for (const sb of sourceBlocks) {
      const newBlockId = blockIdMap[sb.id];
      if (sb.hide_logic) {
        const newHideLogic = updateJsonIds(sb.hide_logic, questionIdMap);
        await prisma.formBlok.update({
          where: { id: newBlockId },
          data: { hide_logic: newHideLogic }
        });
      }
    }

    return res.json({ 
      success: true, 
      message: 'Kuesioner berhasil diduplikasi dari kegiatan sumber ke kegiatan ini' 
    });

  } catch (error) {
    console.error('Error duplicating form:', error);
    return res.status(500).json({ success: false, message: 'Gagal menduplikasi kuesioner' });
  }
});

export default router;
