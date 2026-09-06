import prisma from './database.js';

// Helper to normalize string
const normalizeString = (str) => String(str || '').trim().toLowerCase();

// Helper to normalize SLS format
const normalizeSls = (sls) => {
  if (!sls) return '';
  const str = normalizeString(sls);
  const match = str.match(/\d+/);
  if (match) {
    return parseInt(match[0], 10).toString();
  }
  return str;
};

// Helper to parse assignment string
const parseAssignment = (asn) => {
  let subSls = '', sls = '', desa = '';
  const asnStr = String(asn).trim().toLowerCase();
  
  if (asnStr.includes(' [')) {
    const parts = asnStr.split(' [');
    const prefix = parts[0];
    const suffix = parts[1].replace(']', '');
    
    if (suffix.includes(' - ')) {
      const suffixParts = suffix.split(' - ');
      subSls = prefix;
      sls = suffixParts[0];
      desa = suffixParts[1];
    } else {
      sls = prefix;
      desa = suffix;
    }
  } else {
    desa = asnStr;
  }
  return { desa, sls, subSls };
};

/**
 * Synchronizes the PetugasKegiatan table based on current Dokumen assignments.
 * Useful when assignments are made in AdminDataReview.jsx (per SLS).
 */
export async function syncPetugasKegiatanFromDokumen(kegiatanId) {
  try {
    const kegiatan = await prisma.kegiatan.findUnique({
      where: { id: kegiatanId }
    });
    if (!kegiatan) return;

    let lokus = null;
    if (kegiatan.lokus) {
      lokus = typeof kegiatan.lokus === 'string' ? JSON.parse(kegiatan.lokus) : kegiatan.lokus;
    }

    // 1. Get all documents for this kegiatan
    const docs = await prisma.dokumen.findMany({
      where: { kegiatan_id: kegiatanId },
      select: {
        id: true,
        petugas_id: true,
        desa: true,
        sls: true,
        sub_sls: true,
        assigned_pcls: true,
        assigned_pmls: true
      }
    });

    // 2. Fetch all petugas
    const allPetugas = await prisma.petugas.findMany({
      include: {
        petugas_kegiatan: {
          where: { kegiatan_id: kegiatanId }
        }
      }
    });

    // Auto-fix petugas_id on Dokumen if it doesn't match the first PCL in assigned_pcls
    for (const doc of docs) {
      const pcls = Array.isArray(doc.assigned_pcls) ? doc.assigned_pcls : [];
      if (pcls.length > 0) {
        const firstPcl = pcls[0];
        const petugasRecord = allPetugas.find(p => p.username === firstPcl || p.name === firstPcl);
        if (petugasRecord) {
          if (doc.petugas_id !== petugasRecord.id) {
            await prisma.dokumen.update({
              where: { id: doc.id },
              data: { petugas_id: petugasRecord.id }
            });
            doc.petugas_id = petugasRecord.id;
          }
        }
      } else {
        if (doc.petugas_id !== null) {
          await prisma.dokumen.update({
            where: { id: doc.id },
            data: { petugas_id: null }
          });
          doc.petugas_id = null;
        }
      }
    }

    const pclsSlsAssignments = {};
    const pmlsSlsAssignments = {};
    const pclPengawasMap = {};

    function getAssignmentStringForDoc(doc, lokus) {
      if (!doc.desa) return null;

      const desaNorm = doc.desa.trim().toLowerCase();
      const slsNorm = normalizeSls(doc.sls);
      const subSlsNorm = normalizeSls(doc.sub_sls);

      if (subSlsNorm && lokus && Array.isArray(lokus.subSls)) {
        const match = lokus.subSls.find(s => {
          const isLegacy = s.includes('||');
          const cleanSub = isLegacy ? s.split('||')[0] : s.split(' [')[0];
          const cleanSls = isLegacy ? s.split('||')[1] : s.split(' [')[1]?.split(' - ')[0];
          const cleanDesa = isLegacy ? s.split('||')[2] : s.split(' [')[1]?.replace(']', '')?.split(' - ').pop();
          return normalizeSls(cleanSub) === subSlsNorm && 
                 (!cleanSls || normalizeSls(cleanSls) === slsNorm) &&
                 (!cleanDesa || cleanDesa.trim().toLowerCase() === desaNorm);
        });
        if (match) return match;
      }

      if (slsNorm && lokus && Array.isArray(lokus.sls)) {
        const match = lokus.sls.find(s => {
          const isLegacy = s.includes('||');
          const cleanSls = isLegacy ? s.split('||')[0] : s.split(' [')[0];
          const cleanDesa = isLegacy ? s.split('||')[1] : s.split(' [')[1]?.replace(']', '');
          return normalizeSls(cleanSls) === slsNorm && 
                 (!cleanDesa || cleanDesa.trim().toLowerCase() === desaNorm);
        });
        if (match) return match;
      }

      if (subSlsNorm && slsNorm) {
        return `${doc.sub_sls} [${doc.sls} - ${doc.desa}]`;
      }
      if (slsNorm) {
        return `${doc.sls} [${doc.desa}]`;
      }
      return doc.desa;
    }

    docs.forEach(doc => {
      const slsStr = getAssignmentStringForDoc(doc, lokus);
      if (!slsStr) return;

      const pcls = Array.isArray(doc.assigned_pcls) ? doc.assigned_pcls : [];
      const pmls = Array.isArray(doc.assigned_pmls) ? doc.assigned_pmls : [];

      pcls.forEach(pcl => {
        if (!pclsSlsAssignments[pcl]) pclsSlsAssignments[pcl] = new Set();
        pclsSlsAssignments[pcl].add(slsStr);
      });
      pmls.forEach(pml => {
        if (!pmlsSlsAssignments[pml]) pmlsSlsAssignments[pml] = new Set();
        pmlsSlsAssignments[pml].add(slsStr);
      });

      pcls.forEach(pcl => {
        if (!pclPengawasMap[pcl]) pclPengawasMap[pcl] = new Set();
        pmls.forEach(pml => pclPengawasMap[pcl].add(pml));
      });
    });

    for (const p of allPetugas) {
      const pk = p.petugas_kegiatan[0];
      if (!pk) continue;

      let nextSls = [];
      if (pk.role === 'PCL') {
        nextSls = pclsSlsAssignments[p.username] ? Array.from(pclsSlsAssignments[p.username]) : [];
      } else if (pk.role === 'PML') {
        nextSls = pmlsSlsAssignments[p.username] ? Array.from(pmlsSlsAssignments[p.username]) : [];
      }

      let nextPengawas = pk.pengawas;
      if (pk.role === 'PCL') {
        const pmlsForPcl = pclPengawasMap[p.username] ? Array.from(pclPengawasMap[p.username]) : [];
        if (pmlsForPcl.length > 0) {
          const pmlObj = allPetugas.find(x => x.username === pmlsForPcl[0]);
          nextPengawas = pmlObj ? pmlObj.name : pmlsForPcl[0];
        } else {
          nextPengawas = null;
        }
      }

      await prisma.petugasKegiatan.update({
        where: { id: pk.id },
        data: {
          sls_assignments: nextSls,
          pengawas: nextPengawas
        }
      });
    }
  } catch (error) {
    console.error('Error syncing PetugasKegiatan from Dokumen:', error);
  }
}

/**
 * Synchronizes the Dokumen table based on current PetugasKegiatan assignments.
 * Useful when assignments are made in AdminPetugasKegiatan.jsx.
 */
export async function syncDokumenFromPetugasKegiatan(kegiatanId) {
  try {
    // 1. Get all petugasKegiatan for this activity
    const petugasKegiatan = await prisma.petugasKegiatan.findMany({
      where: { kegiatan_id: kegiatanId },
      include: { petugas: true }
    });

    if (petugasKegiatan.length === 0) return 0;

    // 2. Map assignments by PCL and PML
    const petugasAssignments = [];
    for (const pk of petugasKegiatan) {
      let pmlUsernames = [];
      if (pk.pengawas) {
        // find PML by name or username
        const pmlPk = petugasKegiatan.find(x => x.petugas.name === pk.pengawas || x.petugas.username === pk.pengawas);
        if (pmlPk) {
          pmlUsernames.push(pmlPk.petugas.username);
        } else {
          pmlUsernames.push(pk.pengawas);
        }
      }

      petugasAssignments.push({
        pName: pk.petugas.name,
        pUsername: pk.petugas.username,
        role: pk.role,
        assignments: pk.sls_assignments || [],
        pmls: pmlUsernames
      });
    }

    // 3. Get all documents for this activity
    const docs = await prisma.dokumen.findMany({
      where: { kegiatan_id: kegiatanId, is_prelist: true },
      select: { id: true, sls: true, sub_sls: true, desa: true }
    });

    let updatedCount = 0;

    // 4. Update each document
    const tx = prisma;
    for (const doc of docs) {
      const docDesaNorm = normalizeString(doc.desa);
      const docSlsNorm = normalizeSls(doc.sls);

      const assignedPcls = [];
      const assignedPmls = new Set();

      for (const pa of petugasAssignments) {
        let isMatch = false;
        for (const asn of pa.assignments) {
          const parsed = parseAssignment(asn);
          
          if (parsed.subSls) {
            if (normalizeSls(parsed.subSls) === normalizeSls(doc.sub_sls) &&
                normalizeSls(parsed.sls) === docSlsNorm &&
                parsed.desa === docDesaNorm) {
              isMatch = true;
              break;
            }
          } else if (parsed.sls) {
            if (normalizeSls(parsed.sls) === docSlsNorm &&
                parsed.desa === docDesaNorm) {
              isMatch = true;
              break;
            }
          } else if (parsed.desa) {
            if (parsed.desa === docDesaNorm) {
              isMatch = true;
              break;
            }
          }
        }

        if (isMatch) {
          assignedPcls.push(pa.pUsername);
          pa.pmls.forEach(pml => assignedPmls.add(pml));
        }
      }

      let primaryPetugasId = null;
      if (assignedPcls.length > 0) {
        const p = await tx.petugas.findFirst({
          where: {
            OR: [
              { username: assignedPcls[0] },
              { name: assignedPcls[0] }
            ]
          }
        });
        if (p) primaryPetugasId = p.id;
      }

      await tx.dokumen.update({
        where: { id: doc.id },
        data: {
          assigned_pcls: assignedPcls,
          assigned_pmls: Array.from(assignedPmls),
          petugas_id: primaryPetugasId
        }
      });
      updatedCount++;
    }

    return updatedCount;
  } catch (error) {
    console.error('Error syncing Dokumen from PetugasKegiatan:', error);
    return 0;
  }
}

/**
 * Mengkloning form kuesioner dan seluruh dokumen beserta isian jawaban tiap pertanyaan
 * dari kegiatan sumber ke kegiatan target untuk desa tertentu.
 * Menjamin seluruh isian tiap pertanyaan hingga ujung blok terisi secara otomatis.
 *
 * @param {Object} tx - Prisma transaction instance atau PrismaClient
 * @param {number} sourceKegiatanId - ID kegiatan sumber
 * @param {number} targetKegiatanId - ID kegiatan target
 * @param {string} targetDesa - Nama desa target (opsional, jika kosong menyalin semua desa di kegiatan sumber)
 * @returns {Promise<{ success: boolean, clonedDocsCount: number, clonedQuestionsCount: number }>}
 */
export async function cloneFormAndPrelist(tx, sourceKegiatanId, targetKegiatanId, targetDesa = null) {
  const sId = parseInt(sourceKegiatanId, 10);
  const tId = parseInt(targetKegiatanId, 10);

  if (isNaN(sId) || isNaN(tId)) {
    throw new Error('sourceKegiatanId dan targetKegiatanId harus angka valid');
  }

  const db = tx || prisma;

  // 1. Ambil kegiatan sumber
  const sourceKegiatan = await db.kegiatan.findUnique({
    where: { id: sId },
    include: {
      form_blok: {
        include: {
          form_question: {
            orderBy: { sort_order: 'asc' }
          }
        },
        orderBy: { sort_order: 'asc' }
      }
    }
  });

  if (!sourceKegiatan) {
    throw new Error(`Kegiatan sumber ID ${sId} tidak ditemukan`);
  }

  // 2. Periksa apakah target kegiatan sudah memiliki form blocks
  const targetBlocks = await db.formBlok.findMany({
    where: { kegiatan_id: tId },
    include: { form_question: true }
  });

  const questionIdMap = new Map(); // oldQuestionId -> newQuestionId

  if (targetBlocks.length === 0) {
    // Kloning seluruh FormBlok dan FormQuestion dari sumber ke target
    const blockIdMap = new Map(); // oldBlokId -> newBlokId

    for (const oldBlok of sourceKegiatan.form_blok) {
      const newBlok = await db.formBlok.create({
        data: {
          kegiatan_id: tId,
          kode: oldBlok.kode,
          title: oldBlok.title,
          sort_order: oldBlok.sort_order,
          hide_logic: oldBlok.hide_logic
        }
      });
      blockIdMap.set(oldBlok.id, newBlok.id);
    }

    // Kloning FormQuestion tahap 1 (buat record tanpa relasi self-referencing terlebih dahulu)
    const questionsToLink = [];
    for (const oldBlok of sourceKegiatan.form_blok) {
      const newBlokId = blockIdMap.get(oldBlok.id);
      for (const oldQ of oldBlok.form_question) {
        const newQ = await db.formQuestion.create({
          data: {
            blok_id: newBlokId,
            label: oldQ.label,
            type: oldQ.type,
            required: oldQ.required,
            options: oldQ.options,
            validation: oldQ.validation,
            skip_logic: oldQ.skip_logic,
            show_if_value: oldQ.show_if_value,
            sort_order: oldQ.sort_order
          }
        });
        questionIdMap.set(oldQ.id, newQ.id);

        if (oldQ.parent_id || oldQ.show_if_parent_id || oldQ.skip_target) {
          questionsToLink.push({
            newId: newQ.id,
            oldParentId: oldQ.parent_id,
            oldShowIfId: oldQ.show_if_parent_id,
            oldSkipTarget: oldQ.skip_target
          });
        }
      }
    }

    // Kloning FormQuestion tahap 2 (hubungkan parent_id, show_if_parent_id, skip_target)
    for (const item of questionsToLink) {
      const updateData = {};
      if (item.oldParentId && questionIdMap.has(item.oldParentId)) {
        updateData.parent_id = questionIdMap.get(item.oldParentId);
      }
      if (item.oldShowIfId && questionIdMap.has(item.oldShowIfId)) {
        updateData.show_if_parent_id = questionIdMap.get(item.oldShowIfId);
      }
      if (item.oldSkipTarget && questionIdMap.has(item.oldSkipTarget)) {
        updateData.skip_target = questionIdMap.get(item.oldSkipTarget);
      }
      if (Object.keys(updateData).length > 0) {
        await db.formQuestion.update({
          where: { id: item.newId },
          data: updateData
        });
      }
    }
  } else {
    // Target sudah memiliki pertanyaan, bangun pemetaan berdasarkan kesamaan blok kode dan label/sort_order
    for (const oldBlok of sourceKegiatan.form_blok) {
      const matchedTargetBlok = targetBlocks.find(tb => tb.kode.trim().toLowerCase() === oldBlok.kode.trim().toLowerCase());
      if (matchedTargetBlok) {
        for (const oldQ of oldBlok.form_question) {
          const matchedTargetQ = matchedTargetBlok.form_question.find(tq =>
            tq.label.trim().toLowerCase() === oldQ.label.trim().toLowerCase() ||
            tq.sort_order === oldQ.sort_order
          );
          if (matchedTargetQ) {
            questionIdMap.set(oldQ.id, matchedTargetQ.id);
          }
        }
      }
    }
  }

  // 2.5 Ambil targetKegiatan untuk memeriksa filter lokus SLS dan penugasan PCL/PML
  const targetKegiatan = await db.kegiatan.findUnique({
    where: { id: tId },
    include: {
      petugas_kegiatan: {
        include: {
          petugas: { select: { id: true, name: true, username: true } }
        }
      }
    }
  });

  let targetSlsList = [];
  if (targetKegiatan && targetKegiatan.lokus) {
    const tLokus = typeof targetKegiatan.lokus === 'string' ? JSON.parse(targetKegiatan.lokus) : targetKegiatan.lokus;
    if (Array.isArray(tLokus.sls) && tLokus.sls.length > 0) {
      targetSlsList = tLokus.sls;
    }
  }

  let slsAssignments = {};
  if (targetKegiatan && targetKegiatan.prelist_mapping) {
    const pMapping = typeof targetKegiatan.prelist_mapping === 'string'
      ? JSON.parse(targetKegiatan.prelist_mapping)
      : targetKegiatan.prelist_mapping;
    if (pMapping && pMapping.sls_assignments) {
      slsAssignments = pMapping.sls_assignments;
    }
  }

  const matchSls = (slsA, slsB) => {
    if (!slsA || !slsB) return false;
    const numA = String(slsA).replace(/\D/g, '');
    const numB = String(slsB).replace(/\D/g, '');
    if (numA && numB) {
      return parseInt(numA, 10) === parseInt(numB, 10);
    }
    return String(slsA).trim().toLowerCase() === String(slsB).trim().toLowerCase();
  };

  // 3. Ambil dokumen dari kegiatan sumber untuk desa terkait (tanpa include berat)
  const whereDoc = { kegiatan_id: sId };
  if (targetDesa && targetDesa.trim() !== '') {
    const cleanDesa = targetDesa.trim();
    whereDoc.OR = [
      { desa: cleanDesa },
      { desa: { contains: cleanDesa, mode: 'insensitive' } }
    ];
  }

  let sourceDocs = await db.dokumen.findMany({
    where: whereDoc,
    select: {
      id: true,
      kode: true,
      krt: true,
      alamat: true,
      kecamatan: true,
      desa: true,
      sls: true,
      sub_sls: true,
      no_kk: true,
      nik: true,
      hub_keluarga: true
    }
  });

  // Filter dokumen sumber jika kegiatan target hanya memilih lokus SLS tertentu
  if (targetSlsList.length > 0) {
    sourceDocs = sourceDocs.filter(doc => {
      return targetSlsList.some(tsls => matchSls(doc.sls, tsls) || matchSls(doc.sub_sls, tsls));
    });
  }

  // Ambil dokumen_jawaban per chunk 25 dokumen agar response payload ringan (< 500KB) dan aman dari limit 5MB Accelerate
  const docIds = sourceDocs.map(d => d.id);
  const answersByDocId = new Map();
  const CHUNK_FETCH_DOCS = 25;

  for (let i = 0; i < docIds.length; i += CHUNK_FETCH_DOCS) {
    const chunkIds = docIds.slice(i, i + CHUNK_FETCH_DOCS);
    const chunkAnswers = await db.dokumenJawaban.findMany({
      where: { dokumen_id: { in: chunkIds } },
      select: {
        dokumen_id: true,
        question_id: true,
        value: true
      }
    });

    for (const ans of chunkAnswers) {
      if (!answersByDocId.has(ans.dokumen_id)) {
        answersByDocId.set(ans.dokumen_id, []);
      }
      answersByDocId.get(ans.dokumen_id).push(ans);
    }
  }

  let clonedDocsCount = 0;
  let docIndex = 1;
  const allAnswersToInsert = [];
  const allLogsToInsert = [];

  for (const oldDoc of sourceDocs) {
    const safeNik = oldDoc.nik ? String(oldDoc.nik).replace(/[^a-zA-Z0-9]/g, '') : `RT${docIndex}`;
    const safeRt = oldDoc.sls ? String(oldDoc.sls).replace(/[^a-zA-Z0-9]/g, '').padStart(2, '0') : '00';
    const newKode = `PL-${safeNik}-${safeRt}-${targetKegiatanId}`;

    // Cek agar kode unik di target
    const existing = await db.dokumen.findUnique({ where: { kode: newKode } });
    const finalKode = existing ? `${newKode}-${docIndex}` : newKode;

    // Siapkan seluruh isian jawaban tiap pertanyaan sampai ujung blok
    const docAnswers = answersByDocId.get(oldDoc.id) || [];
    const docValues = {};
    for (const ans of docAnswers) {
      const targetQId = questionIdMap.get(ans.question_id);
      if (targetQId) {
        docValues[targetQId] = ans.value;
      }
    }

    // Tentukan petugas penugasan (PCL dan PML) untuk dokumen ini
    let docPcls = [];
    let docPml = null;
    let docPrimaryPetugasId = null;

    // 1. Ambil dari slsAssignments di prelist_mapping
    for (const [slsKey, assignObj] of Object.entries(slsAssignments)) {
      if (matchSls(oldDoc.sls, slsKey) || matchSls(oldDoc.sub_sls, slsKey)) {
        if (Array.isArray(assignObj.pcls) && assignObj.pcls.length > 0) {
          docPcls = assignObj.pcls;
        }
        if (assignObj.pml) {
          docPml = assignObj.pml;
        }
        if (Array.isArray(assignObj.pcl_ids) && assignObj.pcl_ids.length > 0) {
          docPrimaryPetugasId = assignObj.pcl_ids[0];
        }
        break;
      }
    }

    // 2. Fallback dari targetKegiatan.petugas_kegiatan jika belum terpetakan
    if (docPcls.length === 0 && targetKegiatan && targetKegiatan.petugas_kegiatan) {
      targetKegiatan.petugas_kegiatan.forEach(pk => {
        let pSls = [];
        if (pk.sls_assignments) {
          pSls = typeof pk.sls_assignments === 'string' ? JSON.parse(pk.sls_assignments) : pk.sls_assignments;
        }
        if (Array.isArray(pSls) && pSls.some(s => matchSls(oldDoc.sls, s) || matchSls(oldDoc.sub_sls, s))) {
          if (pk.role === 'PCL' && pk.petugas) {
            const name = pk.petugas.name || pk.petugas.username;
            if (!docPcls.includes(name)) docPcls.push(name);
            if (!docPrimaryPetugasId) docPrimaryPetugasId = pk.petugas_id;
          }
          if (pk.role === 'PML' && pk.petugas && !docPml) {
            docPml = pk.petugas.name || pk.petugas.username;
          }
        }
      });
    }

    // Buat dokumen prelist baru langsung menyertakan snapshot values lengkap di last_sent_data
    const newDoc = await db.dokumen.create({
      data: {
        kode: finalKode,
        kegiatan_id: tId,
        petugas_id: docPrimaryPetugasId || null,
        assigned_pcls: docPcls.length > 0 ? docPcls : null,
        assigned_pmls: docPml ? [docPml] : null,
        krt: oldDoc.krt,
        alamat: oldDoc.alamat,
        kecamatan: oldDoc.kecamatan,
        desa: oldDoc.desa,
        sls: oldDoc.sls,
        sub_sls: oldDoc.sub_sls,
        no_kk: oldDoc.no_kk,
        nik: oldDoc.nik,
        hub_keluarga: oldDoc.hub_keluarga || 'Kepala',
        status: 'draft',
        review_status: 'draft',
        is_prelist: true,
        last_sent_data: Object.keys(docValues).length > 0 ? docValues : null,
        sync: false
      }
    });

    // Kumpulkan jawaban untuk batch insert
    for (const [qId, val] of Object.entries(docValues)) {
      allAnswersToInsert.push({
        dokumen_id: newDoc.id,
        question_id: parseInt(qId, 10),
        value: val
      });
    }

    // Kumpulkan log dokumen
    allLogsToInsert.push({
      dokumen_id: newDoc.id,
      message: `Prelist otomatis dikloning dari kegiatan "${sourceKegiatan.name}" (${Object.keys(docValues).length} isian pertanyaan tersalin)`
    });

    clonedDocsCount++;
    docIndex++;
  }

  // 4. Batch insert seluruh jawaban kuesioner dalam chunk 500
  const ANSWER_CHUNK_SIZE = 500;
  for (let i = 0; i < allAnswersToInsert.length; i += ANSWER_CHUNK_SIZE) {
    const chunk = allAnswersToInsert.slice(i, i + ANSWER_CHUNK_SIZE);
    await db.dokumenJawaban.createMany({
      data: chunk,
      skipDuplicates: true
    });
  }

  // 5. Batch insert dokumen logs dalam chunk 500
  for (let i = 0; i < allLogsToInsert.length; i += ANSWER_CHUNK_SIZE) {
    const chunk = allLogsToInsert.slice(i, i + ANSWER_CHUNK_SIZE);
    await db.dokumenLog.createMany({
      data: chunk,
      skipDuplicates: true
    });
  }

  // 6. Sinkronkan ke PetugasKegiatan agar penugasan konsisten
  try {
    await syncPetugasKegiatanFromDokumen(tId);
  } catch (syncErr) {
    console.warn('Gagal sync PetugasKegiatan setelah kloning:', syncErr);
  }

  return {
    success: true,
    clonedQuestionsCount: questionIdMap.size,
    clonedDocsCount,
    totalAnswersCloned: allAnswersToInsert.length
  };
}
