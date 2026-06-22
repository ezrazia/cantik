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
          let realVal = val;
          let labelVal = val;

          if (val && typeof val === 'string' && val.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(val);
              realVal = parsed.value;
              labelVal = parsed.text;
              if (!labelVal) {
                const matchedOpt = q.options && Array.isArray(q.options) && q.options.find(opt => String(opt.value) === String(realVal));
                labelVal = matchedOpt ? matchedOpt.label : realVal;
              }
            } catch (e) {}
          } else if (q.options && Array.isArray(q.options)) {
            const matchedOpt = q.options.find(opt => String(opt.value) === String(val));
            if (matchedOpt) {
              labelVal = matchedOpt.label;
            }
          }

          row[`q${q.id}`] = realVal;
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

import * as xlsx from 'xlsx';

/**
 * GET /api/tabulasi/:kegiatanId/export-excel
 * Export Raw Data ke format XLSX dengan Relational Sheets (Master & Detail)
 */
router.get('/:kegiatanId/export-excel', async (req, res) => {
  const { kegiatanId } = req.params;
  try {
    const kegiatan = await prisma.kegiatan.findUnique({
      where: { id: parseInt(kegiatanId, 10) },
    });
    if (!kegiatan) return res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan' });

    const questions = await prisma.formQuestion.findMany({
      where: { form_blok: { kegiatan_id: parseInt(kegiatanId, 10) } },
      include: { form_blok: true },
      orderBy: [
        { form_blok: { sort_order: 'asc' } },
        { sort_order: 'asc' },
        { id: 'asc' },
      ],
    });

    const isSelesai = kegiatan.status === 'selesai';
    const documents = await prisma.dokumen.findMany({
      where: {
        kegiatan_id: parseInt(kegiatanId, 10),
        ...(isSelesai ? { status: { in: ['tersimpan', 'terkirim'] } } : { review_status: 'approved' }),
      },
      orderBy: { created_at: 'asc' }
    });

    if (documents.length === 0) {
      return res.status(404).json({ success: false, message: 'Belum ada data bersih (approved) untuk diexport' });
    }

    const docIds = documents.map(d => d.id);
    const answers = await prisma.dokumenJawaban.findMany({
      where: { dokumen_id: { in: docIds } },
    });

    const answersMap = {};
    answers.forEach(ans => {
      if (!answersMap[ans.dokumen_id]) answersMap[ans.dokumen_id] = {};
      answersMap[ans.dokumen_id][ans.question_id] = ans.value;
    });

    const getParsedValue = (q, val) => {
      if (val === undefined || val === null || val === '') return '';
      if (typeof val === 'string' && val.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(val);
          return parsed.text || parsed.value || val;
        } catch (e) {}
      }
      let options = q.options;
      if (typeof options === 'string') {
        try { options = JSON.parse(options); } catch (e) { options = null; }
      }
      if (options && Array.isArray(options)) {
        const matched = options.find(o => String(o.value) === String(val));
        if (matched) return matched.label;
      }
      return val;
    };

    const masterQuestions = [];
    const loopQuestionsByBlock = {};

    questions.forEach(q => {
      let isLoop = false;
      try {
         const valObj = JSON.parse(q.validation || '{}');
         if (valObj.isLoop) isLoop = true;
      } catch(e) {}

      if (isLoop) {
        // Safe sheet name (max 31 chars, no invalid chars)
        let blockName = `${q.form_blok.kode} - ${q.form_blok.title}`.replace(/[\\\/\?\*\[\]]/g, '').trim();
        if (blockName.length > 31) blockName = blockName.substring(0, 31).trim();
        if (!loopQuestionsByBlock[blockName]) loopQuestionsByBlock[blockName] = [];
        loopQuestionsByBlock[blockName].push(q);
      } else {
        masterQuestions.push(q);
      }
    });

    const masterData = [];
    const loopDataByBlock = {};
    Object.keys(loopQuestionsByBlock).forEach(k => loopDataByBlock[k] = []);

    documents.forEach((doc, idx) => {
      const masterRow = {
        'No': idx + 1,
        'ID_Dokumen': doc.kode || doc.id,
        'Kecamatan': doc.kecamatan,
        'Desa': doc.desa,
        'SLS': doc.sls,
        'Sub_SLS': doc.sub_sls,
        'Nama_KRT': doc.krt,
      };

      masterQuestions.forEach(q => {
         const val = answersMap[doc.id]?.[q.id] ?? '';
         masterRow[`${q.id} - ${q.label}`] = getParsedValue(q, val);
      });
      masterData.push(masterRow);

      Object.keys(loopQuestionsByBlock).forEach(blockName => {
         const lQuestions = loopQuestionsByBlock[blockName];
         let maxIter = 0;
         const docAnswersForBlock = {};
         
         lQuestions.forEach(q => {
            const rawVal = answersMap[doc.id]?.[q.id];
            let arr = [];
            if (rawVal) {
              try {
                arr = JSON.parse(rawVal);
                if (!Array.isArray(arr)) arr = [rawVal];
              } catch(e) {
                arr = [rawVal];
              }
            }
            docAnswersForBlock[q.id] = arr;
            if (arr.length > maxIter) maxIter = arr.length;
         });

         for (let i = 0; i < maxIter; i++) {
            const loopRow = {
              'ID_Dokumen': doc.kode || doc.id,
              'Isian_Ke': i + 1,
            };
            lQuestions.forEach(q => {
               const val = docAnswersForBlock[q.id][i] ?? '';
               loopRow[`${q.id} - ${q.label}`] = getParsedValue(q, val);
            });
            loopDataByBlock[blockName].push(loopRow);
         }
      });
    });

    const wb = xlsx.utils.book_new();

    const metadata = [
      { Parameter: 'Kegiatan', Value: kegiatan.nama },
      { Parameter: 'Tahun', Value: kegiatan.tahun },
      { Parameter: 'Status', Value: kegiatan.status },
      { Parameter: 'Total Dokumen Bersih', Value: documents.length },
      { Parameter: 'Tanggal Export', Value: new Date().toLocaleString('id-ID') },
    ];
    const wsMeta = xlsx.utils.json_to_sheet(metadata);
    // Custom column width for metadata
    wsMeta['!cols'] = [{ wch: 25 }, { wch: 50 }];
    xlsx.utils.book_append_sheet(wb, wsMeta, 'Metadata');

    const wsMaster = xlsx.utils.json_to_sheet(masterData);
    xlsx.utils.book_append_sheet(wb, wsMaster, 'Data_Master');

    Object.keys(loopDataByBlock).forEach(blockName => {
       let data = loopDataByBlock[blockName];
       if (data.length === 0) data = [{ 'ID_Dokumen': '', 'Isian_Ke': '' }];
       const wsLoop = xlsx.utils.json_to_sheet(data);
       xlsx.utils.book_append_sheet(wb, wsLoop, blockName);
    });

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const safeFileName = kegiatan.nama.replace(/[^a-zA-Z0-9]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="Export_${safeFileName}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buf);

  } catch(error) {
    console.error("Export Error:", error);
    return res.status(500).json({ success: false, message: 'Gagal melakukan export excel' });
  }
});

export default router;
