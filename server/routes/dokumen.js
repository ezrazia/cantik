import { Router } from 'express';
import prisma from '../config/database.js';
import { syncPetugasKegiatanFromDokumen, syncDokumenFromPetugasKegiatan } from '../config/syncHelper.js';

const router = Router();

// Helper to generate formatted document code: (kodeprov,kab,kec)-kegiatan(initials)-pcl(initials)-urutanPrelist
async function getFormattedKode(tx, docData) {
  const { kode, kegiatan_id, petugas_id, kecamatan, desa, sls, values, answers, status } = docData;

  // Format if it's a temporary code OR if it's being submitted/saved (status is 'terkirim' or 'tersimpan')
  const isTempCode = kode && (kode.startsWith('NEW-') || kode.startsWith('PL-'));
  const isSubmittedOrSaved = status === 'terkirim' || status === 'tersimpan';

  if (!isTempCode && !isSubmittedOrSaved) {
    return kode;
  }

  // 1. Get region code (kodeprov + kab + kec + desa + sls)
  let kodeprov = '65';
  let kab = '03';
  let kec = '000';
  let kddesa = '000';
  let kdsls = '0000';

  const cleanStr = (str) => {
    if (!str) return undefined;
    return String(str).replace(/^[a-zA-Z0-9]+\.\s*/, '').trim();
  };

  const cleanKec = cleanStr(kecamatan);
  const cleanDesa = cleanStr(desa);
  const cleanSls = cleanStr(sls);

  if (cleanKec || cleanDesa || cleanSls) {
    const wilayah = await tx.wilayah.findFirst({
      where: {
        ...(cleanKec ? { kecamatan: { contains: cleanKec } } : {}),
        ...(cleanDesa ? { desa: { contains: cleanDesa } } : {}),
        ...(cleanSls ? { sls: { contains: cleanSls } } : {}),
      }
    });

    if (wilayah) {
      kodeprov = wilayah.kdprov || '65';
      kab = wilayah.kdkab || '03';
      kec = wilayah.kdkec || '000';
      kddesa = wilayah.kddesa || '000';
      kdsls = wilayah.kdsls || '0000';
    }
  }
  const codeArea = `${kodeprov}${kab}${kec}${kddesa}${kdsls}`;

  // 2. Get Kegiatan initials
  let kegiatanInitials = 'KG';
  const kegiatanIdInt = parseInt(kegiatan_id, 10);
  if (kegiatan_id && !isNaN(kegiatanIdInt)) {
    const kegiatan = await tx.kegiatan.findUnique({
      where: { id: kegiatanIdInt }
    });
    if (kegiatan && kegiatan.name) {
      const parts = kegiatan.name.trim().split(/\s+/);
      kegiatanInitials = parts.map(part => {
        if (/^\d+$/.test(part)) {
          return part; // keep year/number fully
        }
        return part[0] ? part[0].toUpperCase() : '';
      }).join('').replace(/[^A-Z0-9]/g, '');
    }
  }

  // 3. Get NIK and Nomor Bangunan from values or answers
  let nikVal = '';
  let bangunanVal = '';
  const petugasIdInt = petugas_id ? parseInt(petugas_id, 10) : 0;

  if (kegiatanIdInt && !isNaN(kegiatanIdInt)) {
    const formQuestions = await tx.formQuestion.findMany({
      where: {
        form_blok: {
          kegiatan_id: kegiatanIdInt
        }
      },
      select: {
        id: true,
        label: true,
        type: true
      }
    });

    const nikQ = formQuestions.find(q => {
      if (q.type === 'note') return false;
      const lbl = q.label.toLowerCase();
      return lbl.includes('nomor induk kependudukan') || lbl.includes('nik');
    });

    const hubQ = formQuestions.find(q => {
      if (q.type === 'note') return false;
      const lbl = q.label.toLowerCase();
      return lbl.includes('kedudukan dalam keluarga') || lbl.includes('hubungan dengan kepala keluarga') || lbl.includes('hubungan keluarga');
    });

    const bgnQ = formQuestions.find(q => {
      if (q.type === 'note') return false;
      const lbl = q.label.toLowerCase();
      return lbl.includes('nomor urut bangunan') || lbl.includes('urut bangunan') || lbl.includes('no. urut bangunan') || lbl.includes('nomor bangunan tempat tinggal');
    });

    const parseToArray = (val) => {
      if (val === undefined || val === null) return [];
      if (Array.isArray(val)) return val.map(String);
      const str = String(val).trim();
      if (str.startsWith('[')) {
        try {
          const parsed = JSON.parse(str);
          if (Array.isArray(parsed)) return parsed.map(String);
        } catch (e) {
          // ignore
        }
      }
      return [str];
    };

    let nikArr = [];
    let hubArr = [];

    // Try extracting from values map
    if (values && typeof values === 'object') {
      if (nikQ && values[nikQ.id] !== undefined) {
        nikArr = parseToArray(values[nikQ.id]);
      }
      if (hubQ && values[hubQ.id] !== undefined) {
        hubArr = parseToArray(values[hubQ.id]);
      }
      if (bgnQ && values[bgnQ.id] !== undefined) {
        bangunanVal = String(values[bgnQ.id]).trim();
      }
    }

    // Try extracting from answers array (e.g. for import/sync payloads if values structure is not direct)
    if (nikArr.length === 0 && Array.isArray(answers)) {
      const found = answers.find(a => {
        const idMatch = nikQ && (parseInt(a.question_id, 10) === nikQ.id);
        const lblMatch = a.question_label && (a.question_label.toLowerCase().includes('nomor induk kependudukan') || a.question_label.toLowerCase().includes('nik'));
        return idMatch || lblMatch;
      });
      if (found) nikArr = parseToArray(found.value);
    }

    if (hubArr.length === 0 && Array.isArray(answers)) {
      const found = answers.find(a => {
        const idMatch = hubQ && (parseInt(a.question_id, 10) === hubQ.id);
        const lblMatch = a.question_label && (a.question_label.toLowerCase().includes('kedudukan dalam keluarga') || a.question_label.toLowerCase().includes('hubungan dengan kepala keluarga') || a.question_label.toLowerCase().includes('hubungan keluarga'));
        return idMatch || lblMatch;
      });
      if (found) hubArr = parseToArray(found.value);
    }

    if (!bangunanVal && Array.isArray(answers)) {
      const found = answers.find(a => {
        const idMatch = bgnQ && (parseInt(a.question_id, 10) === bgnQ.id);
        const lblMatch = a.question_label && (a.question_label.toLowerCase().includes('nomor urut bangunan') || a.question_label.toLowerCase().includes('urut bangunan') || a.question_label.toLowerCase().includes('no. urut bangunan') || a.question_label.toLowerCase().includes('nomor bangunan tempat tinggal'));
        return idMatch || lblMatch;
      });
      if (found) bangunanVal = String(found.value).trim();
    }

    // Find the NIK of Kepala Keluarga (hubQ/404 value is "1")
    const kkIndex = hubArr.findIndex(val => val === '1');
    if (kkIndex !== -1 && nikArr[kkIndex]) {
      nikVal = nikArr[kkIndex].trim();
    } else if (nikArr.length > 0) {
      nikVal = nikArr[0].trim();
    }
  }

  let cleanNik = nikVal.replace(/[^a-zA-Z0-9]/g, '');
  if (!cleanNik) {
    // If NIK is empty, replace with [UrutanKosong]99999P[petugasIdInt]
    const count = await tx.dokumen.count({
      where: {
        petugas_id: petugasIdInt,
        kode: {
          contains: `99999P${petugasIdInt}`
        }
      }
    });
    cleanNik = `${count + 1}99999P${petugasIdInt}`;
  }

  const cleanBangunan = bangunanVal.replace(/[^a-zA-Z0-9]/g, '') || '0';
  const idPcl = petugas_id ? String(petugas_id) : '0';

  return `${codeArea}-${kegiatanInitials}-${cleanNik}-${idPcl}-${cleanBangunan}`;
}

/**
 * GET /api/dokumen/petugas/:petugasId
 * Mengambil semua dokumen yang dimiliki oleh petugas tertentu.
 */
router.get('/petugas/:petugasId', async (req, res) => {
  const { petugasId } = req.params;
  try {
    const pId = parseInt(petugasId, 10);
    if (isNaN(pId)) {
      return res.status(400).json({ success: false, message: 'ID petugas tidak valid' });
    }

    const petugas = await prisma.petugas.findUnique({
      where: { id: pId }
    });
    const petugasName = petugas ? petugas.name : '';
    const petugasUsername = petugas ? petugas.username : '';

    const rows = await prisma.dokumen.findMany({
      where: {
        OR: [
          { petugas_id: pId },
          ...(petugasName ? [
            { assigned_pcls: { array_contains: petugasName } },
            { assigned_pmls: { array_contains: petugasName } }
          ] : []),
          ...(petugasUsername ? [
            { assigned_pcls: { array_contains: petugasUsername } },
            { assigned_pmls: { array_contains: petugasUsername } }
          ] : [])
        ]
      },
      include: {
        kegiatan: {
          select: { name: true },
        },
        petugas: {
          select: { name: true },
        },
        dokumen_log: {
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    const formatted = rows.map(doc => ({
      ...doc,
      activity_name: doc.kegiatan?.name || '',
      petugas_name: doc.petugas?.name || '',
      logs: doc.dokumen_log.map(l => `${l.created_at.toLocaleString('id-ID')}: ${l.message}`),
      sync: !!doc.sync,
      is_prelist: !!doc.is_prelist,
    }));

    return res.json(formatted);
  } catch (error) {
    console.error('Error fetching petugas documents:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil dokumen petugas' });
  }
});

/**
 * GET /api/dokumen/review/:kegiatanId
 * Mengambil semua dokumen untuk direview oleh Admin/PML berdasarkan kegiatan.
 */
router.get('/review/:kegiatanId', async (req, res) => {
  const { kegiatanId } = req.params;
  try {
    const rows = await prisma.dokumen.findMany({
      where: {
        kegiatan_id: parseInt(kegiatanId, 10),
        status: { in: ['draft', 'tersimpan', 'terkirim'] },
      },
      include: {
        kegiatan: {
          select: { name: true },
        },
        petugas: {
          select: {
            name: true,
            petugas_kegiatan: {
              where: { kegiatan_id: parseInt(kegiatanId, 10) },
              select: { pengawas: true }
            }
          },
        },
        dokumen_log: {
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    const formatted = rows.map(doc => {
      const pclsVal = doc.assigned_pcls;
      const pmlsVal = doc.assigned_pmls;
      const fallbackPcls = doc.petugas?.name && doc.petugas.name !== "Belum Ditugaskan" ? [doc.petugas.name] : [];
      const fallbackPmls = doc.petugas?.petugas_kegiatan?.[0]?.pengawas ? [doc.petugas.petugas_kegiatan[0].pengawas] : [];
      return {
        ...doc,
        activity_name: doc.kegiatan?.name || '',
        petugas_name: doc.petugas?.name || '',
        pengawas: doc.petugas?.petugas_kegiatan?.[0]?.pengawas || null,
        assigned_pcls: Array.isArray(pclsVal) ? pclsVal : fallbackPcls,
        assigned_pmls: Array.isArray(pmlsVal) ? pmlsVal : fallbackPmls,
        logs: doc.dokumen_log.map(l => `${l.created_at.toLocaleString('id-ID')}: ${l.message}`),
        sync: !!doc.sync,
        is_prelist: !!doc.is_prelist,
      };
    });

    return res.json(formatted);
  } catch (error) {
    console.error('Error fetching review documents:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data review dokumen' });
  }
});

/**
 * GET /api/dokumen/:id
 * Mengambil detail satu dokumen beserta jawaban dan logs.
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const docId = parseInt(id, 10);
  if (isNaN(docId)) {
    return res.status(400).json({ success: false, message: 'ID dokumen tidak valid' });
  }
  try {
    const doc = await prisma.dokumen.findUnique({
      where: {
        id: docId,
      },
      include: {
        kegiatan: {
          select: { name: true },
        },
        petugas: {
          select: { name: true },
        },
        dokumen_jawaban: {
          include: {
            form_question: {
              select: { label: true },
            },
          },
        },
        dokumen_log: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan' });
    }

    const values = {};
    doc.dokumen_jawaban.forEach(a => {
      values[a.question_id] = a.value;
    });

    return res.json({
      success: true,
      dokumen: {
        ...doc,
        activity_name: doc.kegiatan?.name || '',
        petugas_name: doc.petugas?.name || '',
        sync: !!doc.sync,
        is_prelist: !!doc.is_prelist,
      },
      values,
      logs: doc.dokumen_log.map(l => `${l.created_at.toLocaleString('id-ID')}: ${l.message}`),
    });
  } catch (error) {
    console.error('Error fetching document detail:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil detail dokumen' });
  }
});

/**
 * POST /api/dokumen
 * Menyimpan atau mengirim kuesioner baru/edit.
 * Digunakan untuk simpan draft, tersimpan (lokal), atau terkirim (online).
 */
router.post('/', async (req, res) => {
  const {
    id,
    kode,
    kegiatan_id,
    petugas_id,
    krt,
    alamat,
    kecamatan,
    desa,
    sls,
    sub_sls,
    status,
    is_prelist,
    sync,
    values,
    log_message,
  } = req.body;

  const kegiatanIdInt = parseInt(kegiatan_id, 10);
  const petugasIdInt = parseInt(petugas_id, 10);
  if (!kode || !kegiatan_id || isNaN(kegiatanIdInt) || !petugas_id || isNaN(petugasIdInt)) {
    return res.status(400).json({ success: false, message: 'Kode, Kegiatan ID, dan Petugas ID wajib diisi dengan benar' });
  }

  try {
    const docId = await prisma.$transaction(async (tx) => {
      const finalKode = await getFormattedKode(tx, {
        kode,
        kegiatan_id,
        petugas_id,
        kecamatan,
        desa,
        sls,
        values,
        status
      });

      let currentDocId = id;
      const isPrelistVal = !!is_prelist;
      const syncVal = true;
      const lastSentDataJson = status === 'terkirim' ? (values || null) : undefined;

      const dataObj = {
        kode: finalKode,
        kegiatan_id: kegiatanIdInt,
        petugas_id: petugasIdInt,
        krt: krt || null,
        alamat: alamat || null,
        kecamatan: kecamatan || null,
        desa: desa || null,
        sls: sls || null,
        sub_sls: sub_sls || null,
        status: status || 'draft',
        is_prelist: isPrelistVal,
        sync: syncVal,
        last_sent_data: lastSentDataJson,
        review_status: 'draft',
      };

      const docIdInt = parseInt(currentDocId, 10);
      if (currentDocId && !isNaN(docIdInt)) {
        const existingDoc = await tx.dokumen.findUnique({
          where: { id: docIdInt }
        });

        let finalKodeToUse = finalKode;
        if (existingDoc && finalKode !== existingDoc.kode) {
          const duplicate = await tx.dokumen.findFirst({
            where: {
              kode: finalKode,
              id: { not: docIdInt }
            }
          });
          if (duplicate) {
            console.warn(`[SAVE] Duplicate code detected for finalKode "${finalKode}". Falling back to original code "${existingDoc.kode}".`);
            finalKodeToUse = existingDoc.kode;
          }
        }

        await tx.dokumen.update({
          where: { id: docIdInt },
          data: {
            ...dataObj,
            kode: finalKodeToUse,
            last_sent_data: status === 'terkirim' ? (values || null) : undefined, // If update, only set when 'terkirim'
          },
        });
      } else {
        const existing = await tx.dokumen.findUnique({
          where: { kode: finalKode },
        });

        if (existing) {
          currentDocId = existing.id;
          await tx.dokumen.update({
            where: { id: currentDocId },
            data: {
              krt: krt || null,
              alamat: alamat || null,
              kecamatan: kecamatan || null,
              desa: desa || null,
              sls: sls || null,
              sub_sls: sub_sls || null,
              status: status || 'draft',
              is_prelist: isPrelistVal,
              sync: syncVal,
              last_sent_data: status === 'terkirim' ? (values || null) : undefined,
              review_status: 'draft',
            },
          });
        } else {
          const newDoc = await tx.dokumen.create({
            data: {
              ...dataObj,
              last_sent_data: status === 'terkirim' ? (values || null) : null,
            },
          });
          currentDocId = newDoc.id;
        }
      }

      // Simpan jawaban (EAV) - Concurrent execution
      if (values && Object.keys(values).length > 0) {
        const upsertPromises = [];
        for (const [qId, val] of Object.entries(values)) {
          if (!/^\d+$/.test(qId)) continue; // Skip non-numeric keys like _loop_count
          const qIdInt = parseInt(qId, 10);
          const formattedVal = val !== undefined && val !== null ? String(val) : '';
          upsertPromises.push(
            tx.dokumenJawaban.upsert({
              where: {
                uk_dok_jawaban: {
                  dokumen_id: currentDocId,
                  question_id: qIdInt,
                },
              },
              update: { value: formattedVal },
              create: {
                dokumen_id: currentDocId,
                question_id: qIdInt,
                value: formattedVal,
              },
            })
          );
        }
        await Promise.all(upsertPromises);
      }

      // Tambah log aktivitas
      const msg = log_message || `Kuesioner disimpan sebagai ${status}`;
      await tx.dokumenLog.create({
        data: {
          dokumen_id: currentDocId,
          message: msg,
        },
      });

      // Update target/selesai petugas secara otomatis jika disubmit
      if (status === 'terkirim' || status === 'tersimpan') {
        const total = await tx.dokumen.count({
          where: { petugas_id: parseInt(petugas_id, 10) },
        });
        const selesaiCount = await tx.dokumen.count({
          where: {
            petugas_id: parseInt(petugas_id, 10),
            status: { in: ['tersimpan', 'terkirim'] },
          },
        });
        await tx.petugas.update({
          where: { id: parseInt(petugas_id, 10) },
          data: {
            target: total,
            selesai: selesaiCount,
          },
        });
      }

      return currentDocId;
    });

    return res.json({ success: true, message: 'Dokumen berhasil disimpan', id: docId });
  } catch (error) {
    console.error('Error saving document:', error);
    return res.status(500).json({ success: false, message: 'Gagal menyimpan dokumen' });
  }
});

/**
 * POST /api/dokumen/backup
 * Backup otomatis data dari petugas ke server (invisible ke petugas).
 * Tidak mengubah status dokumen, hanya menyimpan data terkini.
 * Jika dokumen sudah ada, update jawaban saja.
 */
router.post('/backup', async (req, res) => {
  const { petugas_id, documents } = req.body;

  if (!petugas_id || !documents || !Array.isArray(documents)) {
    return res.status(400).json({ success: false, message: 'Data backup tidak lengkap' });
  }

  try {
    let backedUp = 0;
    let failed = 0;

    await prisma.$transaction(async (tx) => {
      for (const doc of documents) {
        try {
          const {
            kode,
            kegiatan_id,
            krt,
            alamat,
            kecamatan,
            desa,
            sls,
            sub_sls,
            status,
            is_prelist,
            values,
          } = doc;

          // Cek apakah dokumen sudah ada
          let existing = await tx.dokumen.findUnique({
            where: { kode: kode }
          });

          if (existing) {
            // Dokumen sudah ada, update backup_at saja
            // JANGAN ubah status atau review_status karena ini hanya backup
            await tx.dokumen.update({
              where: { id: existing.id },
              data: {
                backup_at: new Date(),
                krt: krt || existing.krt,
                alamat: alamat || existing.alamat,
                kecamatan: kecamatan || existing.kecamatan,
                desa: desa || existing.desa,
                sls: sls || existing.sls,
                sub_sls: sub_sls || existing.sub_sls,
              },
            });

            // Update jawaban juga - Concurrent execution
            if (values && Object.keys(values).length > 0) {
              const upsertPromises = [];
              for (const [qId, val] of Object.entries(values)) {
                if (!/^\d+$/.test(qId)) continue; // Skip non-numeric keys like _loop_count
                const qIdInt = parseInt(qId, 10);
                const formattedVal = val !== undefined && val !== null ? String(val) : '';

                upsertPromises.push(
                  tx.dokumenJawaban.upsert({
                    where: {
                      uk_dok_jawaban: {
                        dokumen_id: existing.id,
                        question_id: qIdInt,
                      },
                    },
                    update: { value: formattedVal },
                    create: {
                      dokumen_id: existing.id,
                      question_id: qIdInt,
                      value: formattedVal,
                    },
                  })
                );
              }
              await Promise.all(upsertPromises);
            }
          } else {
            // Dokumen belum ada, buat baru dengan status 'draft'
            // Dokumen ini adalah backup dari dokumen yang dibuat offline tapi belum dikirim
            const newDoc = await tx.dokumen.create({
              data: {
                kode: kode,
                kegiatan_id: parseInt(kegiatan_id, 10),
                petugas_id: parseInt(petugas_id, 10),
                krt: krt || null,
                alamat: alamat || null,
                kecamatan: kecamatan || null,
                desa: desa || null,
                sls: sls || null,
                sub_sls: sub_sls || null,
                status: 'draft', // Status awal adalah draft
                review_status: 'draft',
                is_prelist: !!is_prelist,
                sync: false,
                backup_at: new Date(),
              },
            });

            // Simpan jawaban - Concurrent execution
            if (values && Object.keys(values).length > 0) {
              const createPromises = [];
              for (const [qId, val] of Object.entries(values)) {
                if (!/^\d+$/.test(qId)) continue; // Skip non-numeric keys like _loop_count
                const qIdInt = parseInt(qId, 10);
                const formattedVal = val !== undefined && val !== null ? String(val) : '';

                createPromises.push(
                  tx.dokumenJawaban.create({
                    data: {
                      dokumen_id: newDoc.id,
                      question_id: qIdInt,
                      value: formattedVal,
                    },
                  })
                );
              }
              await Promise.all(createPromises);
            }

            // Tambah log
            await tx.dokumenLog.create({
              data: {
                dokumen_id: newDoc.id,
                message: 'Backup otomatis dari perangkat petugas',
              },
            });
          }

          backedUp++;
        } catch (docError) {
          console.error('Error backing up document:', docError);
          failed++;
        }
      }
    });

    return res.json({
      success: true,
      message: `Backup berhasil: ${backedUp} dokumen${failed > 0 ? `, ${failed} gagal` : ''}`,
      backedUp,
      failed,
    });
  } catch (error) {
    console.error('Error in backup transaction:', error);
    return res.status(500).json({ success: false, message: 'Gagal melakukan backup' });
  }
});

/**
 * POST /api/dokumen/sync
 * Sinkronisasi data offline dari petugas (batch upload dokumen)
 */
router.post('/sync', async (req, res) => {
  const { petugas_id, documents } = req.body;
  const petugasIdInt = parseInt(petugas_id, 10);
  if (!petugas_id || isNaN(petugasIdInt) || !documents || !Array.isArray(documents)) {
    return res.status(400).json({ success: false, message: 'Data sync tidak lengkap atau Petugas ID tidak valid' });
  }

  const syncResults = [];
  try {
    await prisma.$transaction(async (tx) => {
      for (const doc of documents) {
        const {
          id,
          kode,
          kegiatan_id,
          krt,
          alamat,
          kecamatan,
          desa,
          sls,
          sub_sls,
          status,
          is_prelist,
          values,
        } = doc;

        const finalKode = await getFormattedKode(tx, {
          kode,
          kegiatan_id,
          petugas_id,
          kecamatan,
          desa,
          sls,
          values,
          status
        });

        let existing = null;
        const idInt = parseInt(id, 10);
        if (id && !isNaN(idInt)) {
          existing = await tx.dokumen.findUnique({
            where: { id: idInt }
          });
        }
        if (!existing) {
          existing = await tx.dokumen.findUnique({
            where: { kode: finalKode }
          });
        }

        let docId;
        const isPrelistVal = !!is_prelist;
        const lastSentDataJson = status === 'terkirim' ? (values || null) : undefined;

        const kegiatanIdInt = parseInt(kegiatan_id, 10);
        if (isNaN(kegiatanIdInt)) {
          throw new Error(`Kegiatan ID tidak valid untuk dokumen ${kode}`);
        }

        if (existing) {
          docId = existing.id;

          let finalKodeToUse = finalKode;
          if (finalKode !== existing.kode) {
            const duplicate = await tx.dokumen.findFirst({
              where: {
                kode: finalKode,
                id: { not: docId }
              }
            });
            if (duplicate) {
              console.warn(`[SYNC] Duplicate code detected for finalKode "${finalKode}". Falling back to original code "${existing.kode}".`);
              finalKodeToUse = existing.kode;
            }
          }

          await tx.dokumen.update({
            where: { id: docId },
            data: {
              kode: finalKodeToUse,
              krt: krt || null,
              alamat: alamat || null,
              kecamatan: kecamatan || null,
              desa: desa || null,
              sls: sls || null,
              sub_sls: sub_sls || null,
              status: status || 'draft',
              is_prelist: isPrelistVal,
              petugas_id: petugasIdInt,
              sync: true,
              last_sent_data: lastSentDataJson,
              review_status: 'draft',
            },
          });
        } else {
          const newDoc = await tx.dokumen.create({
            data: {
              kode: finalKode,
              kegiatan_id: kegiatanIdInt,
              petugas_id: petugasIdInt,
              krt: krt || null,
              alamat: alamat || null,
              kecamatan: kecamatan || null,
              desa: desa || null,
              sls: sls || null,
              sub_sls: sub_sls || null,
              status: status || 'draft',
              is_prelist: isPrelistVal,
              sync: true,
              last_sent_data: status === 'terkirim' ? (values || null) : null,
            },
          });
          docId = newDoc.id;
        }

        // Simpan jawaban (concurrently)
        if (values && Object.keys(values).length > 0) {
          const upsertPromises = [];
          for (const [qId, val] of Object.entries(values)) {
            if (!/^\d+$/.test(qId)) continue; // Skip non-numeric keys like _loop_count
            const qIdInt = parseInt(qId, 10);
            const formattedVal = val !== undefined && val !== null ? String(val) : '';
            upsertPromises.push(
              tx.dokumenJawaban.upsert({
                where: {
                  uk_dok_jawaban: {
                    dokumen_id: docId,
                    question_id: qIdInt,
                  },
                },
                update: { value: formattedVal },
                create: {
                  dokumen_id: docId,
                  question_id: qIdInt,
                  value: formattedVal,
                },
              })
            );
          }
          await Promise.all(upsertPromises);
        }

        // Catat log sync
        await tx.dokumenLog.create({
          data: {
            dokumen_id: docId,
            message: `Sinkronisasi dokumen dari offline (Status: ${status})`,
          },
        });

        syncResults.push({
          tempKode: kode,
          id: docId,
          kode: finalKode
        });
      }

      // Update stats petugas
      if (!isNaN(petugasIdInt)) {
        const total = await tx.dokumen.count({
          where: { petugas_id: petugasIdInt },
        });
        const selesaiCount = await tx.dokumen.count({
          where: {
            petugas_id: petugasIdInt,
            status: { in: ['tersimpan', 'terkirim'] },
          },
        });

        await tx.petugas.update({
          where: { id: petugasIdInt },
          data: {
            target: total,
            selesai: selesaiCount,
            last_sync: new Date(),
          },
        });
      }
    }, {
      maxWait: 5000,
      timeout: 10000
    });

    return res.json({
      success: true,
      message: `Sinkronisasi berhasil untuk ${documents.length} dokumen`,
      syncResults
    });
  } catch (error) {
    console.error('Error syncing documents:', error);
    try {
      const fs = await import('fs');
      fs.writeFileSync('c:/xampp/htdocs/Node-Project/cantik/server/sync_error.log', error.stack || String(error));
    } catch (e) {
      console.error('Failed to write log:', e);
    }
    return res.status(500).json({ success: false, message: 'Gagal melakukan sinkronisasi dokumen: ' + error.message });
  }
});

/**
 * POST /api/dokumen/review/:id
 * Menyetujui (Approve) atau Menolak (Reject) dokumen.
 */
router.post('/review/:id', async (req, res) => {
  const { id } = req.params;
  const { review_status, notes, role } = req.body;

  if (!review_status || !['approved', 'rejected'].includes(review_status)) {
    return res.status(400).json({ success: false, message: 'Status review harus approved atau rejected' });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.dokumen.findUnique({
        where: { id: parseInt(id, 10) },
      });

      if (!existing) {
        throw new Error('Dokumen tidak ditemukan');
      }

      // Update status review
      await tx.dokumen.update({
        where: { id: parseInt(id, 10) },
        data: {
          review_status: review_status,
        },
      });

      // Tambah log review
      const isByAdmin = role === 'admin' || role === 'superadmin' || role === 'admin_kegiatan';
      const logMsg = review_status === 'approved'
        ? (isByAdmin ? 'Dokumen disetujui (Approved) oleh Admin' : 'Dokumen disetujui (Approved) oleh PML')
        : (isByAdmin ? `Ditolak (Rejected) oleh Admin: ${notes || ''}` : `Ditolak (Rejected) oleh PML: ${notes || ''}`);

      await tx.dokumenLog.create({
        data: {
          dokumen_id: parseInt(id, 10),
          message: logMsg,
        },
      });

      // Jika disetujui, update status desa_kegiatan
      if (review_status === 'approved') {
        await tx.desaKegiatan.upsert({
          where: {
            uk_desa_kegiatan: {
              kegiatan_id: existing.kegiatan_id,
              desa: existing.desa || '',
            },
          },
          update: {
            selesai: { increment: 1 },
          },
          create: {
            kegiatan_id: existing.kegiatan_id,
            desa: existing.desa || '',
            selesai: 1,
            target: 0,
          },
        });
      }
    });

    return res.json({ success: true, message: `Dokumen berhasil di-${review_status}` });
  } catch (error) {
    console.error('Error updating review status:', error);
    if (error.message === 'Dokumen tidak ditemukan') {
      return res.status(404).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: 'Gagal memperbarui status review dokumen' });
  }
});

/**
 * DELETE /api/dokumen/:id
 * Menghapus satu dokumen beserta jawaban dan logs (jika status !== 'terkirim' atau review_status === 'rejected').
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const docId = parseInt(id, 10);
    const existing = await prisma.dokumen.findUnique({
      where: { id: docId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan' });
    }

    if (existing.status === 'terkirim' && existing.review_status !== 'rejected') {
      return res.status(400).json({ success: false, message: 'Dokumen yang sudah terkirim tidak dapat dihapus' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.dokumenJawaban.deleteMany({ where: { dokumen_id: docId } });
      await tx.dokumenLog.deleteMany({ where: { dokumen_id: docId } });
      await tx.dokumen.delete({ where: { id: docId } });

      const total = await tx.dokumen.count({
        where: { petugas_id: existing.petugas_id },
      });
      const selesaiCount = await tx.dokumen.count({
        where: {
          petugas_id: existing.petugas_id,
          status: { in: ['tersimpan', 'terkirim'] },
        },
      });

      await tx.petugas.update({
        where: { id: existing.petugas_id },
        data: {
          target: total,
          selesai: selesaiCount,
        },
      });
    });

    return res.json({ success: true, message: 'Dokumen berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus dokumen' });
  }
});

/**
 * POST /api/dokumen/prelist/import
 * Import prelist dari Excel dengan column mapping.
 *
 * Request body:
 * {
 *   kegiatan_id: number,
 *   mapping: {
 *     excelColumn: "question_id"  // e.g., { "NO_KK": "101", "NIK": "102", "NAMA": "201", ... }
 *   },
 *   rows: [
 *     { "NO_KK": "1234", "NIK": "5678", "NAMA": "John Doe", "HUB": "Kepala", ... },
 *     ...
 *   ]
 * }
 */
router.post('/prelist/import', async (req, res) => {
  const { kegiatan_id, mapping, rows } = req.body;

  if (!kegiatan_id || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Kegiatan ID dan data rows wajib diisi'
    });
  }

  try {
    // 1. Simpan mapping ke kegiatan
    await prisma.kegiatan.update({
      where: { id: parseInt(kegiatan_id, 10) },
      data: {
        prelist_mapping: mapping || {}
      }
    });

    // 2. Generate kode wilayah
    let kodeprov = '65';
    let kab = '03';
    let kec = '000';

    // Ambil sample row untuk dapat kecamatan/desa
    const sampleRow = rows[0];
    const sampleDesa = mapping?.desa ? sampleRow[mapping.desa] : (mapping?.Dusun ? sampleRow[mapping.Dusun] : null);

    if (sampleDesa) {
      const wilayah = await prisma.wilayah.findFirst({
        where: {
          OR: [
            { desa: sampleDesa },
            { desa: String(sampleDesa).trim() }
          ]
        }
      });
      if (wilayah) {
        kodeprov = wilayah.kdprov || '65';
        kab = wilayah.kdkab || '03';
        kec = wilayah.kdkec || '000';
      }
    }

    const codeArea = `${kodeprov}${kab}${kec}`;

    // 3. Ambil kegiatan untuk initials
    const kegiatan = await prisma.kegiatan.findUnique({
      where: { id: parseInt(kegiatan_id, 10) }
    });
    let kegiatanInitials = 'KG';
    if (kegiatan && kegiatan.name) {
      const parts = kegiatan.name.trim().split(/\s+/);
      kegiatanInitials = parts.map(part => {
        if (/^\d+$/.test(part)) return part;
        return part[0] ? part[0].toUpperCase() : '';
      }).join('').replace(/[^A-Z0-9]/g, '');
    }

    // 4. Get existing prelist untuk generate sequence
    const existingDocs = await prisma.dokumen.findMany({
      where: { kegiatan_id: parseInt(kegiatan_id, 10) },
      select: { kode: true }
    });

    let maxSeq = 0;
    existingDocs.forEach(d => {
      const parts = d.kode.split('-');
      const lastPart = parts[parts.length - 1];
      const seq = parseInt(lastPart, 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    });

    // 5. Group rows by No. KK untuk buat 1 dokumen per keluarga
    const firstRowKeys = Object.keys(rows[0] || {});
    const noKkColHeuristic = firstRowKeys.find(c => ['no_kk', 'nokk', 'nomor_kk', 'no kk', 'nomor kk', 'kartu_keluarga'].includes(c.toLowerCase())) || firstRowKeys.find(c => c.toLowerCase().includes('kk') && !c.toLowerCase().includes('nik'));

    const familyGroups = {};
    rows.forEach((row, index) => {
      const noKkColName = mapping?.no_kk || noKkColHeuristic;
      let noKk = noKkColName ? String(row[noKkColName] || '').trim() : '';

      if (!noKk) {
        noKk = `AUTO-${index}-${Math.random().toString(36).substr(2, 6)}`; // Fallback if still no KK
      }

      if (!familyGroups[noKk]) {
        familyGroups[noKk] = [];
      }
      familyGroups[noKk].push(row);
    });

    // 6. Create documents per family
    let imported = 0;
    let skipped = 0;

    await prisma.$transaction(async (tx) => {
      for (const [noKk, familyMembers] of Object.entries(familyGroups)) {
        // Find column names heuristically from the first row's keys
        const keys = Object.keys(familyMembers[0]);
        const nikCol = keys.find(c => ['nik', 'no_nik', 'nomor_nik'].includes(c.toLowerCase())) || keys.find(c => c.toLowerCase().includes('nik'));
        const namaCol = keys.find(c => ['nama_krt', 'krt', 'nama', 'kepala_keluarga'].includes(c.toLowerCase())) || keys.find(c => c.toLowerCase().includes('nama'));
        const alamatCol = keys.find(c => c.toLowerCase().includes('alamat'));
        const desaCol = keys.find(c => c.toLowerCase().includes('desa') || c.toLowerCase().includes('kelurahan'));
        const kecamatanCol = keys.find(c => c.toLowerCase().includes('kec') || c.toLowerCase().includes('kecamatan'));
        const slsCol = keys.find(c => c.toLowerCase().includes('sls') || c.toLowerCase().includes('rt'));
        const subSlsCol = keys.find(c => c.toLowerCase().includes('sub_sls') || c.toLowerCase().includes('sub sls') || c.toLowerCase().includes('rw'));
        const hubCol = keys.find(c => c.toLowerCase().includes('hub') || c.toLowerCase().includes('kedudukan'));

        // Tentukan kepala keluarga (yang HUB nya "Kepala" atau urutan pertama)
        let kepalaKeluarga = null;
        let anggotaKeluarga = familyMembers;

        familyMembers.forEach((member, idx) => {
          const hub = hubCol ? String(member[hubCol] || '').toLowerCase() : '';
          if (hub.includes('kepala') || hub === '1') {
            kepalaKeluarga = member;
          }
        });

        // Jika tidak ada yang ditandai sebagai kepala, gunakan yang pertama
        if (!kepalaKeluarga) {
          kepalaKeluarga = familyMembers[0];
          anggotaKeluarga = familyMembers;
        }

        // Format ID: PL-[NIK Kepala keluarga]-[NoRT]
        const nikKK = nikCol ? String(kepalaKeluarga[nikCol] || '').trim() : '';
        const rtKK = slsCol ? String(kepalaKeluarga[slsCol] || '').trim() : '';

        maxSeq++;
        const safeNik = nikKK || maxSeq;
        const safeRt = rtKK || '00';
        const kode = `PL-${safeNik}-${safeRt}`;

        // Build values untuk auto-fill
        const values = {};

        // Map setiap kolom Excel ke pertanyaan form
        for (const [excelCol, questionId] of Object.entries(mapping || {})) {
          if (!questionId || questionId === '') continue;

          const qId = String(questionId).replace(/^R?\.?/, ''); // Hapus prefix R atau .

          // Untuk kepala keluarga (digunakan sbg initial value)
          if (kepalaKeluarga) {
            const val = kepalaKeluarga[excelCol];
            if (val !== undefined && val !== null && val !== '') {
              values[qId] = String(val);
            }
          }
        }

        // Map data anggota keluarga ke dalam array untuk loop
        if (familyMembers.length > 0) {
          familyMembers.forEach((anggota, idx) => {
            for (const [excelCol, questionId] of Object.entries(mapping || {})) {
              if (!questionId || questionId === '') continue;
              const qId = String(questionId).replace(/^R?\.?/, '');

              // Skip household level fields (biarkan sebagai string tunggal)
              const isHouseholdField =
                excelCol === mapping?.no_kk ||
                excelCol === mapping?.alamat ||
                excelCol === mapping?.kecamatan ||
                excelCol === mapping?.desa ||
                excelCol === mapping?.sls ||
                excelCol === mapping?.sub_sls;

              if (isHouseholdField) continue;

              const val = anggota[excelCol];
              if (val !== undefined && val !== null && val !== '') {
                const existingVal = values[qId];
                if (existingVal !== undefined) {
                  // Convert to array if needed
                  let arr = [];
                  if (typeof existingVal === 'string' && existingVal.startsWith('[')) {
                    try { arr = JSON.parse(existingVal); } catch { arr = [existingVal]; }
                  } else {
                    // existingVal adalah string milik kepalaKeluarga
                    arr = Array(familyMembers.length).fill('');
                    const kepalaIdx = familyMembers.indexOf(kepalaKeluarga);
                    if (kepalaIdx !== -1) arr[kepalaIdx] = existingVal;
                  }
                  arr[idx] = String(val);
                  values[qId] = JSON.stringify(arr);
                } else {
                  // If it doesn't exist yet, create array with empty strings for previous members
                  const arr = Array(familyMembers.length).fill('');
                  arr[idx] = String(val);
                  values[qId] = JSON.stringify(arr);
                }
              }
            }
          });
        }

        // Create dokumen
        const doc = await tx.dokumen.create({
          data: {
            kode,
            kegiatan_id: parseInt(kegiatan_id, 10),
            petugas_id: null, // Belum ditugaskan
            krt: kepalaKeluarga && namaCol ? String(kepalaKeluarga[namaCol] || '').trim() : 'Tanpa Nama',
            alamat: kepalaKeluarga && alamatCol ? String(kepalaKeluarga[alamatCol] || '').trim() : null,
            kecamatan: kepalaKeluarga && kecamatanCol ? String(kepalaKeluarga[kecamatanCol] || '').trim() : null,
            desa: kepalaKeluarga && desaCol ? String(kepalaKeluarga[desaCol] || '').trim() : null,
            sls: kepalaKeluarga && slsCol ? String(kepalaKeluarga[slsCol] || '').trim() : null,
            sub_sls: kepalaKeluarga && subSlsCol ? String(kepalaKeluarga[subSlsCol] || '').trim() : null,
            status: 'draft',
            review_status: 'draft',
            is_prelist: true,
            sync: false,
            no_kk: noKk,
            nik: nikKK || null,
            hub_keluarga: 'Kepala',
          }
        });

        // Simpan jawaban
        for (const [qId, val] of Object.entries(values)) {
          const qIdInt = parseInt(qId, 10);
          if (isNaN(qIdInt)) continue;

          const formattedVal = val !== undefined && val !== null ? String(val) : '';
          if (formattedVal === '') continue;

          await tx.dokumenJawaban.create({
            data: {
              dokumen_id: doc.id,
              question_id: qIdInt,
              value: formattedVal,
            }
          });
        }

        // Tambah log
        await tx.dokumenLog.create({
          data: {
            dokumen_id: doc.id,
            message: `Import prelist dari Excel (${familyMembers.length} anggota keluarga)`,
          }
        });

        imported++;
      }
    }, {
      maxWait: 5000,
      timeout: 10000
    });

    require('fs').appendFileSync('prelist_debug.log', `[${new Date().toISOString()}] Imported: ${imported}, Skipped: ${skipped}, rows: ${rows.length}, groups: ${Object.keys(familyGroups).length}\n`);

    return res.json({
      success: true,
      message: `Import berhasil: ${imported} keluarga diimpor`,
      imported,
      skipped
    });

  } catch (error) {
    console.error('Error importing prelist:', error);
    require('fs').appendFileSync('prelist_debug.log', `[${new Date().toISOString()}] ERROR: ${error.message}\n${error.stack}\n`);
    return res.status(500).json({
      success: false,
      message: 'Gagal import prelist: ' + error.message
    });
  }
});

/**
 * GET /api/dokumen/prelist/mapping/:kegiatanId
 * Ambil column mapping untuk kegiatan tertentu.
 */
router.get('/prelist/mapping/:kegiatanId', async (req, res) => {
  const { kegiatanId } = req.params;

  try {
    const kegiatan = await prisma.kegiatan.findUnique({
      where: { id: parseInt(kegiatanId, 10) },
      select: { prelist_mapping: true }
    });

    return res.json({
      success: true,
      mapping: kegiatan?.prelist_mapping || null
    });
  } catch (error) {
    console.error('Error fetching prelist mapping:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil mapping prelist'
    });
  }
});

router.post('/batch-prelist', async (req, res) => {
  try {
    const { kegiatan_id, documents } = req.body;

    if (!kegiatan_id || !Array.isArray(documents)) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    const insertedDocs = [];

    await prisma.$transaction(async (tx) => {
      for (const doc of documents) {
        const tempDocInfo = {
          kode: 'NEW-PRELIST',
          kegiatan_id: parseInt(kegiatan_id, 10),
          petugas_id: null,
          kecamatan: doc.kecamatan || doc.answers?.find(a => {
            const l = a.question_label?.toLowerCase() || '';
            return l === 'kecamatan' || l === 'nama kecamatan';
          })?.value || '',
          desa: doc.desa || doc.answers?.find(a => {
            const l = a.question_label?.toLowerCase() || '';
            return (l === 'desa/kelurahan' || l === 'desa' || l === 'kelurahan' || l === 'nama desa' || l === 'nama kelurahan') ||
              ((l.includes('desa') || l.includes('kelurahan')) && !l.includes('klasifikasi') && !l.includes('status') && !l.includes('apakah') && !l.includes('lahan'));
          })?.value || '',
          sls: doc.sls || doc.answers?.find(a => {
            const l = a.question_label?.toLowerCase() || '';
            return l === 'sls' || l === 'rt' || l === 'rw' || l === 'nama sls' || l === 'rt/rw' || l === 'dusun' || l === 'lingkungan';
          })?.value || '',
          answers: doc.answers || null
        };

        const finalKode = await getFormattedKode(tx, tempDocInfo);

        const newDoc = await tx.dokumen.create({
          data: {
            kode: finalKode,
            kegiatan_id: parseInt(kegiatan_id, 10),
            petugas_id: null,
            status: 'draft',
            created_by: 'admin',
            is_prelist: true,
            latitude: null,
            longitude: null,
            start_time: new Date(),
            end_time: new Date(),
            krt: doc.krt || null,
            desa: doc.desa || null,
            sls: doc.sls || null,
            sub_sls: doc.sub_sls || null,
            flag: 0,
            answers: {
              create: doc.answers.map(ans => ({
                question_id: ans.question_id,
                value: ans.value,
                is_valid: true
              }))
            }
          }
        });
        insertedDocs.push(newDoc);
      }
    }, {
      maxWait: 5000,
      timeout: 10000
    });

    return res.json({
      success: true,
      message: `${insertedDocs.length} dokumen prelist berhasil ditambahkan`,
      count: insertedDocs.length
    });
  } catch (error) {
    console.error('Error batch prelist:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memproses batch prelist: ' + error.message
    });
  }
});

/**
 * POST /api/dokumen/assign-multiple
 * Menyimpan penugasan banyak petugas (PCL) dan pengawas (PML) untuk satu dokumen.
 */
router.post('/assign-multiple', async (req, res) => {
  const { dbId, assigned_pcls, assigned_pmls } = req.body;
  try {
    const docId = parseInt(dbId, 10);
    if (isNaN(docId)) {
      return res.status(400).json({ success: false, message: 'ID dokumen tidak valid' });
    }

    const doc = await prisma.dokumen.findUnique({
      where: { id: docId }
    });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan' });
    }

    // fallback/update petugas_id utama ke PCL pertama (jika ada) untuk kompabilitas offline sync
    let primaryPetugasId = doc.petugas_id;
    if (assigned_pcls && assigned_pcls.length > 0) {
      const firstName = assigned_pcls[0];
      const p = await prisma.petugas.findFirst({
        where: {
          OR: [
            { username: firstName },
            { name: firstName }
          ]
        }
      });
      if (p) {
        primaryPetugasId = p.id;
      }
    } else {
      primaryPetugasId = null; // Belum ditugaskan
    }

    await prisma.dokumen.update({
      where: { id: docId },
      data: {
        assigned_pcls: assigned_pcls || [],
        assigned_pmls: assigned_pmls || [],
        petugas_id: primaryPetugasId
      }
    });

    // Sync changes to PetugasKegiatan
    await syncPetugasKegiatanFromDokumen(doc.kegiatan_id);

    return res.json({
      success: true,
      message: 'Penugasan petugas berhasil disimpan'
    });
  } catch (error) {
    console.error('Error assigning multiple officers:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menyimpan penugasan petugas: ' + error.message
    });
  }
});

router.post('/auto-assign-lokus', async (req, res) => {
  const { kegiatan_id } = req.body;
  try {
    const kegId = parseInt(kegiatan_id, 10);
    if (isNaN(kegId)) return res.status(400).json({ success: false, message: 'ID kegiatan tidak valid' });

    const updatedCount = await syncDokumenFromPetugasKegiatan(kegId);

    return res.json({ success: true, message: `Berhasil meng-assign ${updatedCount} dokumen berdasarkan lokus` });
  } catch (error) {
    console.error('Error auto-assign lokus:', error);
    return res.status(500).json({ success: false, message: 'Gagal auto-assign lokus' });
  }
});

/**
 * POST /api/dokumen/assign-sls
 * Menyimpan penugasan banyak petugas (PCL) dan pengawas (PML) untuk semua dokumen dalam satu SLS.
 */
router.post('/assign-sls', async (req, res) => {
  const { kegiatan_id, sls, assigned_pcls, assigned_pmls } = req.body;
  try {
    const kegId = parseInt(kegiatan_id, 10);
    if (isNaN(kegId)) {
      return res.status(400).json({ success: false, message: 'ID kegiatan tidak valid' });
    }
    if (!sls) {
      return res.status(400).json({ success: false, message: 'SLS wajib diisi' });
    }

    // fallback/update petugas_id utama ke PCL pertama (jika ada) untuk kompabilitas offline sync
    let primaryPetugasId = null; // null = belum ditugaskan (aman untuk FK)
    if (assigned_pcls && assigned_pcls.length > 0) {
      const firstName = assigned_pcls[0];
      const p = await prisma.petugas.findFirst({
        where: {
          OR: [
            { username: firstName },
            { name: firstName }
          ]
        }
      });
      if (p) {
        primaryPetugasId = p.id;
      }
    }

    const result = await prisma.dokumen.updateMany({
      where: {
        kegiatan_id: kegId,
        sls: sls,
      },
      data: {
        assigned_pcls: assigned_pcls || [],
        assigned_pmls: assigned_pmls || [],
        petugas_id: primaryPetugasId
      }
    });

    // Sync changes to PetugasKegiatan
    await syncPetugasKegiatanFromDokumen(kegId);

    return res.json({
      success: true,
      message: `Berhasil menugaskan petugas untuk ${result.count} dokumen di SLS ${sls}`
    });
  } catch (error) {
    console.error('Error assigning SLS officers:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menugaskan petugas per SLS: ' + error.message
    });
  }
});

export default router;
