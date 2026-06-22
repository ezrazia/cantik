import { Router } from 'express';
import prisma from '../config/database.js';

const router = Router();

// Helper to generate formatted document code: (kodeprov,kab,kec)-kegiatan(initials)-pcl(initials)-urutanPrelist
async function getFormattedKode(tx, docData) {
  const { kode, kegiatan_id, petugas_id, kecamatan, desa } = docData;
  
  // Only format if the code is a new/temporary offline code (starts with "NEW-")
  if (!kode || !kode.startsWith('NEW-')) {
    return kode;
  }

  // 1. Get region code (kodeprov + kab + kec)
  let kodeprov = '65';
  let kab = '03';
  let kec = '000';
  
  if (kecamatan || desa) {
    const cleanStr = (str) => {
      if (!str) return undefined;
      // Remove prefixes like "a. ", "A. ", "1. ", "01. "
      return String(str).replace(/^[a-zA-Z0-9]+\.\s*/, '').trim();
    };

    const cleanKec = cleanStr(kecamatan);
    const cleanDesa = cleanStr(desa);

    const wilayah = await tx.wilayah.findFirst({
      where: {
        ...(cleanKec ? { kecamatan: { contains: cleanKec } } : {}),
        ...(cleanDesa ? { desa: { contains: cleanDesa } } : {}),
      }
    });
    if (wilayah) {
      kodeprov = wilayah.kdprov || '65';
      kab = wilayah.kdkab || '03';
      kec = wilayah.kdkec || '000';
    }
  }
  const codeArea = `${kodeprov}${kab}${kec}`;

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

  // 3. Get PCL initials
  let pclInitials = 'PCL';
  const petugasIdInt = parseInt(petugas_id, 10);
  if (petugas_id && !isNaN(petugasIdInt)) {
    const petugas = await tx.petugas.findUnique({
      where: { id: petugasIdInt }
    });
    if (petugas && petugas.name) {
      const parts = petugas.name.trim().split(/\s+/);
      const initials = parts.map(part => {
        return part[0] ? part[0].toUpperCase() : '';
      }).join('').replace(/[^A-Z0-9]/g, '');
      // Append ID to guarantee uniqueness among officers with same initials
      pclInitials = `${initials}${petugasIdInt}`;
    }
  }

  // 4. Determine next prelist sequence number
  const prefix = `${codeArea}-${kegiatanInitials}-${pclInitials}-`;
  
  // Find all documents in this kegiatan that match this prefix
  const existingDocs = (kegiatan_id && !isNaN(kegiatanIdInt))
    ? await tx.dokumen.findMany({
        where: {
          kegiatan_id: kegiatanIdInt,
          kode: {
            startsWith: prefix
          }
        },
        select: { kode: true }
      })
    : [];

  let maxSeq = 0;
  existingDocs.forEach(d => {
    const parts = d.kode.split('-');
    const lastPart = parts[parts.length - 1];
    const seq = parseInt(lastPart, 10);
    if (!isNaN(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  });

  const nextSeq = maxSeq + 1;
  return `${prefix}${nextSeq}`;
}

/**
 * GET /api/dokumen/petugas/:petugasId
 * Mengambil semua dokumen yang dimiliki oleh petugas tertentu.
 */
router.get('/petugas/:petugasId', async (req, res) => {
  const { petugasId } = req.params;
  try {
    const rows = await prisma.dokumen.findMany({
      where: {
        petugas_id: parseInt(petugasId, 10),
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
        status: { in: ['tersimpan', 'terkirim'] },
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
        desa
      });

      let currentDocId = id;
      const isPrelistVal = !!is_prelist;
      const syncVal = !!sync;
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
        await tx.dokumen.update({
          where: { id: docIdInt },
          data: {
            ...dataObj,
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
    }, {
      maxWait: 15000,
      timeout: 15000,
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
    }, {
      maxWait: 15000,
      timeout: 15000,
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
          desa
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
          await tx.dokumen.update({
            where: { id: docId },
            data: {
              kode: finalKode,
              krt: krt || null,
              alamat: alamat || null,
              kecamatan: kecamatan || null,
              desa: desa || null,
              sls: sls || null,
              sub_sls: sub_sls || null,
              status: status || 'draft',
              is_prelist: isPrelistVal,
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
      maxWait: 15000,
      timeout: 15000,
    });

    return res.json({ success: true, message: `Sinkronisasi berhasil untuk ${documents.length} dokumen` });
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
  const { review_status, notes } = req.body;

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
      const logMsg = review_status === 'approved'
        ? 'Dokumen disetujui (Approved) oleh PML'
        : `Ditolak (Rejected) oleh PML: ${notes || ''}`;

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
    const familyGroups = {};
    rows.forEach(row => {
      const noKk = mapping?.no_kk ? String(row[mapping.no_kk] || '').trim() : '';
      if (!noKk) return; // Skip if no KK

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
        maxSeq++;
        const kode = `${codeArea}-${kegiatanInitials}-PL-${maxSeq}`;

        // Tentukan kepala keluarga (yang HUB nya "Kepala" atau urutan pertama)
        let kepalaKeluarga = null;
        let anggotaKeluarga = familyMembers;

        familyMembers.forEach((member, idx) => {
          const hub = mapping?.hub_keluarga ? String(member[mapping.hub_keluarga] || '').toLowerCase() : '';
          if (hub.includes('kepala') || hub === '1') {
            kepalaKeluarga = member;
          }
        });

        // Jika tidak ada yang ditandai sebagai kepala, gunakan yang pertama
        if (!kepalaKeluarga) {
          kepalaKeluarga = familyMembers[0];
          anggotaKeluarga = familyMembers.slice(1);
        }

        // Build values untuk auto-fill
        const values = {};

        // Map setiap kolom Excel ke pertanyaan form
        for (const [excelCol, questionId] of Object.entries(mapping || {})) {
          if (!questionId || questionId === '') continue;

          const qId = String(questionId).replace(/^R?\.?/, ''); // Hapus prefix R atau .

          // Untuk kepala keluarga
          if (kepalaKeluarga && excelCol !== mapping?.no_kk) {
            const val = kepalaKeluarga[excelCol];
            if (val !== undefined && val !== null && val !== '') {
              values[qId] = String(val);
            }
          }
        }

        // Tambah counter anggota keluarga untuk loop
        const anggotaCountKey = mapping?.nama ? String(mapping.nama).replace(/^R?\.?/, '') : null;
        if (anggotaCountKey) {
          values[`${anggotaCountKey}_loop_count`] = String(anggotaKeluarga.length);
        }

        // Map data anggota keluarga ke dalam array untuk loop
        if (anggotaCountKey && anggotaKeluarga.length > 0) {
          anggotaKeluarga.forEach((anggota, idx) => {
            for (const [excelCol, questionId] of Object.entries(mapping || {})) {
              if (!questionId || questionId === '') continue;
              const qId = String(questionId).replace(/^R?\.?/, '');

              // Skip fields yang sudah diassign ke kepala
              if (mapping?.nama && excelCol === mapping.nama) continue;
              if (mapping?.no_kk && excelCol === mapping.no_kk) continue;

              const val = anggota[excelCol];
              if (val !== undefined && val !== null && val !== '') {
                const existingVal = values[qId];
                if (existingVal) {
                  // Convert to array if needed
                  let arr = [];
                  if (typeof existingVal === 'string' && existingVal.startsWith('[')) {
                    try { arr = JSON.parse(existingVal); } catch { arr = [existingVal]; }
                  } else {
                    arr = [existingVal];
                  }
                  arr[idx] = String(val);
                  values[qId] = JSON.stringify(arr);
                } else {
                  values[qId] = JSON.stringify([String(val)]);
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
            petugas_id: 0, // Belum ditugaskan
            krt: kepalaKeluarga ? (mapping?.nama ? String(kepalaKeluarga[mapping.nama] || '') : '') : 'Tanpa Nama',
            alamat: kepalaKeluarga ? (mapping?.alamat ? String(kepalaKeluarga[mapping.alamat] || '') : '') : null,
            kecamatan: kepalaKeluarga ? (mapping?.kecamatan ? String(kepalaKeluarga[mapping.kecamatan] || '') : '') : null,
            desa: kepalaKeluarga ? (mapping?.desa ? String(kepalaKeluarga[mapping.desa] || '') : '') : null,
            sls: kepalaKeluarga ? (mapping?.sls ? String(kepalaKeluarga[mapping.sls] || '') : '') : null,
            sub_sls: kepalaKeluarga ? (mapping?.sub_sls ? String(kepalaKeluarga[mapping.sub_sls] || '') : '') : null,
            status: 'draft',
            review_status: 'draft',
            is_prelist: true,
            sync: false,
            no_kk: noKk,
            nik: kepalaKeluarga && mapping?.nik ? String(kepalaKeluarga[mapping.nik] || '') : null,
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
    });

    return res.json({
      success: true,
      message: `Import berhasil: ${imported} keluarga diimpor`,
      imported,
      skipped
    });

  } catch (error) {
    console.error('Error importing prelist:', error);
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
        // Prepare doc info for ID generation
        const tempDocInfo = {
          kode: 'NEW-PRELIST',
          kegiatan_id: parseInt(kegiatan_id, 10),
          petugas_id: null,
          kecamatan: doc.kecamatan || doc.answers?.find(a => a.question_label?.toLowerCase().includes('kecamatan'))?.value || '',
          desa: doc.desa || doc.answers?.find(a => a.question_label?.toLowerCase().includes('desa') || a.question_label?.toLowerCase().includes('kelurahan'))?.value || '',
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

export default router;
