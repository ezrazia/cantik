import { Router } from 'express';
import prisma from '../config/database.js';

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
    const questions = await prisma.formQuestion.findMany({
      where: {
        form_blok: {
          kegiatan_id: parseInt(kegiatanId, 10),
        },
      },
      select: {
        id: true,
        label: true,
        type: true,
        options: true,
        form_blok: {
          select: {
            kode: true,
            title: true,
            sort_order: true,
          },
        },
        sort_order: true,
      },
      orderBy: [
        { form_blok: { sort_order: 'asc' } },
        { sort_order: 'asc' },
        { id: 'asc' },
      ],
    });

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
      return {
        id: q.id,
        label: q.label,
        type: q.type,
        options: opt,
        blok_kode: q.form_blok?.kode || '',
        blok_title: q.form_blok?.title || '',
      };
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
            option_value: opt.value,
          });
        });
      } else {
        expandedQuestions.push(q);
      }
    });

    // 2. Cek status kegiatan untuk menentukan sumber data tabulasi
    const kegiatan = await prisma.kegiatan.findUnique({
      where: { id: parseInt(kegiatanId, 10) },
      select: { status: true },
    });
    
    const isSelesai = kegiatan && kegiatan.status === 'selesai';

    const docWhere = {
      kegiatan_id: parseInt(kegiatanId, 10),
      ...(isSelesai
        ? { status: { in: ['tersimpan', 'terkirim'] } }
        : { review_status: 'approved' }),
    };

    const documents = await prisma.dokumen.findMany({
      where: docWhere,
      select: {
        id: true,
        kode: true,
        krt: true,
        alamat: true,
        kecamatan: true,
        desa: true,
        sls: true,
        sub_sls: true,
        updated_at: true,
      },
    });

    if (documents.length === 0) {
      return res.json({
        success: true,
        questions: expandedQuestions,
        cleanData: [],
      });
    }

    const docIds = documents.map(d => d.id);

    // 3. Ambil semua jawaban untuk dokumen approved/selesai tersebut
    const answers = await prisma.dokumenJawaban.findMany({
      where: {
        dokumen_id: { in: docIds },
      },
      select: {
        dokumen_id: true,
        question_id: true,
        value: true,
      },
    });

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
        updated_at: doc.updated_at,
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
            } catch {
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
      cleanData,
    });
  } catch (error) {
    console.error('Error generating tabulasi clean data:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat tabulasi data' });
  }
});

export default router;
