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
    
    const allowAll = kegiatan && ['selesai', 'published'].includes(kegiatan.status);

    const docWhere = {
      kegiatan_id: parseInt(kegiatanId, 10),
      ...(allowAll
        ? { status: { in: ['tersimpan', 'terkirim'] } }
        : { review_status: 'approved' }),
    };

    const documents = await prisma.dokumen.findMany({
      where: docWhere,
      select: {
        id: true,
        kode: true,
        no_kk: true,
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

    // 3. Ambil semua jawaban secara bertahap (chunk) untuk menghindari limit payload 5MB Prisma Accelerate
    let answers = [];
    const CHUNK_SIZE = 50;
    for (let i = 0; i < docIds.length; i += CHUNK_SIZE) {
      const chunkIds = docIds.slice(i, i + CHUNK_SIZE);
      const chunkAnswers = await prisma.dokumenJawaban.findMany({
        where: { dokumen_id: { in: chunkIds } },
        select: {
          dokumen_id: true,
          question_id: true,
          value: true,
        },
      });
      answers = answers.concat(chunkAnswers);
    }

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

    let allBlocks = await prisma.formBlok.findMany({
      where: { kegiatan_id: parseInt(kegiatanId, 10) },
      orderBy: { sort_order: 'asc' }
    });

    const sortBlocksNaturally = (blks) => {
      const romanToDecimal = (roman) => {
        const map = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
        let dec = 0;
        const str = roman.toLowerCase();
        for (let i = 0; i < str.length; i++) {
          const current = map[str[i]];
          const next = map[str[i + 1]];
          if (next && current < next) {
            dec += next - current;
            i++;
          } else {
            dec += current;
          }
        }
        return dec || 0;
      };
      const getBlockSortKey = (block) => {
        const kodeStr = String(block.kode || block.id || "");
        const match = kodeStr.match(/^Blok\s+([IVXLCDMivxlcdm]+)/i);
        if (match) {
          return romanToDecimal(match[1]);
        }
        if (kodeStr.toLowerCase() === "pengantar") {
          return 0;
        }
        return 999;
      };
      return [...(blks || [])].sort((a, b) => {
        const keyA = getBlockSortKey(a);
        const keyB = getBlockSortKey(b);
        if (keyA !== keyB) return keyA - keyB;
        return (a.sort_order || 0) - (b.sort_order || 0);
      });
    };

    allBlocks = sortBlocksNaturally(allBlocks);

    const getQuestionCode = (q, allQuestions, allBlocks) => {
        if (!q) return '';
        const valStr = q.validation || q.val;
        if (valStr && valStr.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(valStr);
            if (parsed.custom_code || parsed.customCode) {
              return parsed.custom_code || parsed.customCode;
            }
          } catch (e) {}
        }
        const block = allBlocks.find(b => b.id === q.blok_id || b.kode === q.blok_id);
        let blockIdx = 0;
        if (block) {
          const romanToDecimal = (roman) => {
            const map = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
            let dec = 0;
            const str = roman.toLowerCase();
            for (let i = 0; i < str.length; i++) {
              const current = map[str[i]];
              const next = map[str[i + 1]];
              if (next && current < next) { dec += next - current; i++; }
              else { dec += current; }
            }
            return dec || 0;
          };
          const kodeStr = String(block.kode || block.id || '');
          const match = kodeStr.match(/^Blok\s+([IVXLCDMivxlcdm]+)/i);
          if (match) { blockIdx = romanToDecimal(match[1]); }
        }
        if (!blockIdx) {
          const standardBlocks = allBlocks.filter(b => String(b.kode || b.id || '').startsWith('Blok '));
          blockIdx = standardBlocks.findIndex(b => (b.id === q.blok_id || b.kode === q.blok_id)) + 1;
        }
        if (blockIdx === 0) return '';
        
        if (q.parent_id) {
          const parent = allQuestions.find(p => p.id === q.parent_id);
          if (!parent) return '';
          const parentCode = getQuestionCode(parent, allQuestions, allBlocks);
          const siblings = allQuestions.filter(s => s.blok_id === q.blok_id && s.parent_id === q.parent_id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
          const sibIdx = siblings.findIndex(s => s.id === q.id);
          if (parent.parent_id) {
            const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
            const suffix = romanNumerals[sibIdx] || (sibIdx + 1).toString();
            return parentCode + '_' + suffix;
          } else {
            const letter = String.fromCharCode(97 + (sibIdx >= 0 ? sibIdx : 0));
            return parentCode + '_' + letter;
          }
        } else {
          const mainQs = allQuestions.filter(s => s.blok_id === q.blok_id && !s.parent_id && s.type !== 'note').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
          let startIndex = 1;
          const firstQ = mainQs[0];
          if (firstQ) {
            const firstValStr = firstQ.validation || firstQ.val;
            if (firstValStr && firstValStr.trim().startsWith('{')) {
              try {
                const parsed = JSON.parse(firstValStr);
                const custom = parsed.custom_code || parsed.customCode || '';
                if (parsed.start_zero || parsed.start_from_zero || custom.endsWith('00') || custom === '400' || custom === 'R400') {
                  startIndex = 0;
                }
              } catch (e) {}
            }
          }
          const qIdx = mainQs.findIndex(s => s.id === q.id) + startIndex;
          const padded = qIdx.toString().padStart(2, '0');
          return blockIdx.toString() + padded;
        }
    };

    const allowAll = ['selesai', 'published'].includes(kegiatan.status);
    const documents = await prisma.dokumen.findMany({
      where: {
        kegiatan_id: parseInt(kegiatanId, 10),
        ...(allowAll ? { status: { in: ['tersimpan', 'terkirim'] } } : { review_status: 'approved' }),
      },
      orderBy: { created_at: 'asc' }
    });

    if (documents.length === 0) {
      return res.status(404).json({ success: false, message: 'Belum ada data bersih (approved) untuk diexport' });
    }

    const docIds = documents.map(d => d.id);
    
    let answers = [];
    const CHUNK_SIZE = 50;
    for (let i = 0; i < docIds.length; i += CHUNK_SIZE) {
      const chunkIds = docIds.slice(i, i + CHUNK_SIZE);
      const chunkAnswers = await prisma.dokumenJawaban.findMany({
        where: { dokumen_id: { in: chunkIds } },
        select: { dokumen_id: true, question_id: true, value: true }
      });
      answers = answers.concat(chunkAnswers);
    }

    const answersMap = {};
    answers.forEach(ans => {
      if (!answersMap[ans.dokumen_id]) answersMap[ans.dokumen_id] = {};
      answersMap[ans.dokumen_id][ans.question_id] = ans.value;
    });

    const getParsedValue = (q, val) => {
      if (val === undefined || val === null || val === '') return '';
      
      let rawVal = val;

      if (Array.isArray(rawVal)) {
          return rawVal.join(', ');
      }

      if (typeof rawVal === 'string') {
        const trimmed = rawVal.trim();
        if (trimmed.startsWith('{')) {
          try {
            const parsed = JSON.parse(trimmed);
            rawVal = parsed.value !== undefined ? parsed.value : rawVal;
          } catch (e) {}
        } else if (trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              rawVal = parsed.join(', ');
            }
          } catch (e) {}
        }
      }
      
      return rawVal;
    };

    const getOrderedQuestionsInBlock = (blockId, allQuestions) => {
      const blockQs = allQuestions.filter(q => q.blok_id === blockId);
      const mainQs = blockQs.filter(q => !q.parent_id);

      const ordered = [];
      const addChildren = (parentId) => {
        const children = blockQs.filter(q => q.parent_id === parentId);
        children.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        children.forEach(child => {
          ordered.push(child);
          addChildren(child.id);
        });
      };

      mainQs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      mainQs.forEach(parent => {
        ordered.push(parent);
        addChildren(parent.id);
      });
      return ordered;
    };

    const allOrderedQs = [];
    allBlocks.forEach(b => {
      allOrderedQs.push(...getOrderedQuestionsInBlock(b.id, questions));
    });

    const masterQuestions = [];
    const loopQuestionsByBlock = {};

    allOrderedQs.forEach(q => {
      if (q.type === 'note') return; // Skip note questions

      let isLoop = false;
      try {
         const valObj = JSON.parse(q.validation || '{}');
         if (valObj.isLoop) isLoop = true;
      } catch(e) {}

      // Data-driven detection: if any doc has an array value for this question (and it's not a checkbox)
      if (!isLoop && q.type !== 'checkbox') {
          for (const doc of documents) {
              const rawVal = answersMap[doc.id]?.[q.id];
              if (rawVal && typeof rawVal === 'string' && rawVal.trim().startsWith('[')) {
                  try {
                      const arr = JSON.parse(rawVal);
                      if (Array.isArray(arr) && arr.length > 1) {
                          isLoop = true;
                          break;
                      }
                  } catch(e) {}
              }
          }
      }

      if (isLoop) {
        let blockName = 'Data_Perulangan';
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
        'No_KK': doc.no_kk,
        'Nama_KRT': doc.krt,
        'Kecamatan': doc.kecamatan,
        'Desa': doc.desa,
        'SLS': doc.sls,
        'Sub_SLS': doc.sub_sls,
      };

      masterQuestions.forEach(q => {
         const val = answersMap[doc.id]?.[q.id] ?? '';
         const qCode = getQuestionCode(q, questions, allBlocks);
         // Tambahkan spasi di awal agar urutan kolom (object keys insertion order) 
         // tidak diacak oleh JavaScript jika qCode berupa angka murni (misal "405")
         masterRow[` ${qCode}`] = getParsedValue(q, val);
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
              'No_KK': doc.no_kk,
              'Nama_KRT': doc.krt,
              'Isian_Ke': i + 1,
            };
            lQuestions.forEach(q => {
               const val = docAnswersForBlock[q.id][i] ?? '';
               const qCode = getQuestionCode(q, questions, allBlocks);
               loopRow[` ${qCode}`] = getParsedValue(q, val);
            });
            loopDataByBlock[blockName].push(loopRow);
         }
      });
    });

    const wb = xlsx.utils.book_new();

    const metadata = [
      { Parameter: 'Kegiatan', Value: kegiatan.name },
      { Parameter: 'Tahun', Value: kegiatan.tahun },
      { Parameter: 'Status', Value: kegiatan.status },
      { Parameter: 'Total Dokumen Bersih', Value: documents.length },
      { Parameter: 'Tanggal Export', Value: new Date().toLocaleString('id-ID') },
      { Parameter: '', Value: '' },
      { Parameter: '--- DAFTAR RINCIAN ---', Value: '--- PERTANYAAN ---' }
    ];

    allOrderedQs.forEach(q => {
      if (q.type === 'note') return;
      const qCode = getQuestionCode(q, questions, allBlocks);
      metadata.push({ Parameter: qCode, Value: q.label });
    });
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

    const safeFileName = kegiatan.name.replace(/[^a-zA-Z0-9]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="Export_${safeFileName}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buf);

  } catch(error) {
    console.error("Export Error:", error);
    return res.status(500).json({ success: false, message: 'Gagal melakukan export excel' });
  }
});

export default router;
