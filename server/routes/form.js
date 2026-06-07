import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

/**
 * GET /api/form/:kegiatanId
 * Mengambil seluruh blok dan pertanyaan untuk kegiatan tertentu.
 */
router.get('/:kegiatanId', async (req, res) => {
  const { kegiatanId } = req.params;
  try {
    // Ambil semua blok
    const [blocks] = await pool.query(
      'SELECT * FROM form_blok WHERE kegiatan_id = ? ORDER BY sort_order, id',
      [kegiatanId]
    );

    if (blocks.length === 0) {
      return res.json({ success: true, blocks: [], questions: [] });
    }

    const blockIds = blocks.map(b => b.id);
    
    // Ambil semua pertanyaan di blok-blok tersebut
    const [questions] = await pool.query(
      `SELECT * FROM form_question 
       WHERE blok_id IN (?) 
       ORDER BY sort_order, id`,
      [blockIds]
    );

    // Format options JSON string to JS array
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
        options: optParsed
      };
    });

    return res.json({
      success: true,
      blocks,
      questions: formattedQuestions
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
    const [result] = await pool.query(
      'INSERT INTO form_blok (kegiatan_id, kode, title, sort_order) VALUES (?, ?, ?, ?)',
      [kegiatan_id, kode, title, sort_order || 0]
    );

    return res.status(201).json({
      success: true,
      message: 'Blok kuesioner berhasil ditambahkan',
      blok: { id: result.insertId, kegiatan_id, kode, title, sort_order: sort_order || 0 }
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
    await pool.query(
      'UPDATE form_blok SET kode = ?, title = ?, sort_order = ? WHERE id = ?',
      [kode, title, sort_order || 0, id]
    );

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
    await pool.query('DELETE FROM form_blok WHERE id = ?', [id]);
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
    validation, skip_logic, skip_target, sort_order 
  } = req.body;

  if (!blok_id || !label) {
    return res.status(400).json({ success: false, message: 'Blok ID dan Label pertanyaan wajib diisi' });
  }

  try {
    const optionsJson = options ? JSON.stringify(options) : null;
    
    const [result] = await pool.query(
      `INSERT INTO form_question 
       (blok_id, parent_id, label, type, required, options, validation, skip_logic, skip_target, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        blok_id, 
        parent_id || null, 
        label, 
        type || 'text', 
        required ? 1 : 0, 
        optionsJson, 
        validation || null, 
        skip_logic || null, 
        skip_target || null, 
        sort_order || 0
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Pertanyaan berhasil ditambahkan',
      question: {
        id: result.insertId,
        blok_id,
        parent_id: parent_id || null,
        label,
        type: type || 'text',
        required: !!required,
        options: options || null,
        validation: validation || null,
        skip_logic: skip_logic || null,
        skip_target: skip_target || null,
        sort_order: sort_order || 0
      }
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
  const { 
    blok_id, parent_id, label, type, required, options, 
    validation, skip_logic, skip_target, sort_order 
  } = req.body;

  try {
    const optionsJson = options ? JSON.stringify(options) : null;

    await pool.query(
      `UPDATE form_question 
       SET blok_id = ?, parent_id = ?, label = ?, type = ?, required = ?, options = ?, 
           validation = ?, skip_logic = ?, skip_target = ?, sort_order = ?
       WHERE id = ?`,
      [
        blok_id,
        parent_id || null,
        label,
        type || 'text',
        required ? 1 : 0,
        optionsJson,
        validation || null,
        skip_logic || null,
        skip_target || null,
        sort_order || 0,
        id
      ]
    );

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
    await pool.query('DELETE FROM form_question WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Pertanyaan berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting form question:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus pertanyaan' });
  }
});

export default router;
