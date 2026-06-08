import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

/**
 * GET /api/tabulasi/:kegiatanId
 * Mengambil data bersih (clean data) yang sudah dipivot dinamis
 * untuk tabulasi kegiatan tertentu.
 */
router.get('/:kegiatanId', async (req, res) => {
  const { kegiatanId } = req.params;
  try {
    // 1. Ambil semua pertanyaan untuk kegiatan ini
    const [questions] = await pool.query(
      `SELECT q.id, q.label, q.type, q.options, b.kode as blok_kode, b.title as blok_title
       FROM form_question q
       JOIN form_blok b ON q.blok_id = b.id
       WHERE b.kegiatan_id = ?
       ORDER BY b.sort_order, q.sort_order, q.id`,
      [kegiatanId]
    );

    // Parse options JSON
    const questionsWithParsedOptions = questions.map(q => {
      let opt = q.options;
      if (typeof opt === 'string') {
        try {
          opt = JSON.parse(opt);
        } catch {
          opt = null;
        }
      }
      return { ...q, options: opt };
    });

    // Expand select type questions
    const expandedQuestions = [];
    questionsWithParsedOptions.forEach(q => {
      if (q.type === 'select' && q.options && Array.isArray(q.options)) {
        q.options.forEach(opt => {
          expandedQuestions.push({
            id: `${q.id}_${opt.value}`,
            label: `${q.label} - ${opt.label}`,
            type: 'radio',
            options: [
              { value: '1', label: 'Ya' },
              { value: '0', label: 'Tidak' }
            ],
            blok_kode: q.blok_kode,
            blok_title: q.blok_title,
            is_virtual: true,
            parent_select_id: q.id,
            option_value: opt.value
          });
        });
      } else {
        expandedQuestions.push(q);
      }
    });

    // 2. Cek status kegiatan untuk menentukan sumber data tabulasi
    const [kegiatanRows] = await pool.query(
      'SELECT status FROM kegiatan WHERE id = ?',
      [kegiatanId]
    );
    const isSelesai = kegiatanRows.length > 0 && kegiatanRows[0].status === 'selesai';

    let docQuery = `
      SELECT id, kode, krt, alamat, kecamatan, desa, sls, sub_sls, updated_at
      FROM dokumen
      WHERE kegiatan_id = ?
    `;
    const docParams = [kegiatanId];

    if (isSelesai) {
      // Jika kegiatan sudah selesai, ambil semua data respon (tersimpan/terkirim) langsung
      docQuery += ` AND status IN ('tersimpan', 'terkirim')`;
    } else {
      // Jika masih berjalan (published), ambil yang sudah disetujui (approved)
      docQuery += ` AND review_status = 'approved'`;
    }

    const [documents] = await pool.query(docQuery, docParams);

    if (documents.length === 0) {
      return res.json({
        success: true,
        questions: expandedQuestions,
        cleanData: []
      });
    }

    const docIds = documents.map(d => d.id);

    // 3. Ambil semua jawaban untuk dokumen approved tersebut
    const [answers] = await pool.query(
      `SELECT dokumen_id, question_id, value 
       FROM dokumen_jawaban 
       WHERE dokumen_id IN (?)`,
      [docIds]
    );

    // Map jawaban by dokumen_id and question_id
    const answersMap = {};
    answers.forEach(ans => {
      if (!answersMap[ans.dokumen_id]) {
        answersMap[ans.dokumen_id] = {};
      }
      answersMap[ans.dokumen_id][ans.question_id] = ans.value;
    });

    // 4. Pivot data
    const cleanData = documents.map(doc => {
      const row = {
        id: doc.id,
        kode: doc.kode,
        krt: doc.krt,
        alamat: doc.alamat,
        kecamatan: doc.kecamatan,
        desa: doc.desa,
        sls: doc.sls,
        sub_sls: doc.sub_sls,
        updated_at: doc.updated_at
      };

      // Tambahkan jawaban untuk setiap pertanyaan
      expandedQuestions.forEach(q => {
        if (q.is_virtual) {
          const parentVal = answersMap[doc.id]?.[q.parent_select_id] ?? '';
          let isChecked = '0';
          if (parentVal) {
            try {
              const parsed = JSON.parse(parentVal);
              isChecked = parsed[q.option_value] ? '1' : '0';
            } catch (e) {
              if (String(parentVal) === String(q.option_value)) {
                isChecked = '1';
              }
            }
          }
          row[`q${q.id}`] = isChecked;
          row[`q${q.id}_label`] = isChecked === '1' ? 'Ya' : 'Tidak';
        } else {
          const val = answersMap[doc.id]?.[q.id] ?? '';
          row[`q${q.id}`] = val;

          let labelVal = val;
          if (q.options && Array.isArray(q.options)) {
            const matchedOpt = q.options.find(opt => String(opt.value) === String(val));
            if (matchedOpt) {
              labelVal = matchedOpt.label;
            }
          }
          row[`q${q.id}_label`] = labelVal;
        }
      });

      return row;
    });

    return res.json({
      success: true,
      questions: expandedQuestions,
      cleanData
    });
  } catch (error) {
    console.error('Error generating tabulasi clean data:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat tabulasi data' });
  }
});

export default router;
