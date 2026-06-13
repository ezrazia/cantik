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
    const wilayah = await tx.wilayah.findFirst({
      where: {
        kecamatan: kecamatan ? String(kecamatan).trim() : undefined,
        desa: desa ? String(desa).trim() : undefined,
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
  if (kegiatan_id) {
    const kegiatan = await tx.kegiatan.findUnique({
      where: { id: parseInt(kegiatan_id, 10) }
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
  if (petugas_id) {
    const petugas = await tx.petugas.findUnique({
      where: { id: parseInt(petugas_id, 10) }
    });
    if (petugas && petugas.name) {
      const parts = petugas.name.trim().split(/\s+/);
      pclInitials = parts.map(part => {
        return part[0] ? part[0].toUpperCase() : '';
      }).join('').replace(/[^A-Z0-9]/g, '');
    }
  }

  // 4. Determine next prelist sequence number
  const prefix = `${codeArea}-${kegiatanInitials}-${pclInitials}-`;
  
  // Find all documents in this kegiatan and petugas that match this prefix
  const existingDocs = await tx.dokumen.findMany({
    where: {
      kegiatan_id: parseInt(kegiatan_id, 10),
      petugas_id: parseInt(petugas_id, 10),
      kode: {
        startsWith: prefix
      }
    },
    select: { kode: true }
  });

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
  try {
    const doc = await prisma.dokumen.findUnique({
      where: {
        id: parseInt(id, 10),
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

  if (!kode || !kegiatan_id || !petugas_id) {
    return res.status(400).json({ success: false, message: 'Kode, Kegiatan ID, dan Petugas ID wajib diisi' });
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
        kegiatan_id: parseInt(kegiatan_id, 10),
        petugas_id: parseInt(petugas_id, 10),
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

      if (currentDocId) {
        await tx.dokumen.update({
          where: { id: parseInt(currentDocId, 10) },
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

      // Simpan jawaban (EAV)
      if (values && Object.keys(values).length > 0) {
        for (const [qId, val] of Object.entries(values)) {
          const qIdInt = parseInt(qId, 10);
          const formattedVal = val !== undefined && val !== null ? String(val) : '';
          await tx.dokumenJawaban.upsert({
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
          });
        }
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
 * POST /api/dokumen/sync
 * Sinkronisasi data offline dari petugas (batch upload dokumen)
 */
router.post('/sync', async (req, res) => {
  const { petugas_id, documents } = req.body;
  if (!petugas_id || !documents || !Array.isArray(documents)) {
    return res.status(400).json({ success: false, message: 'Data sync tidak lengkap' });
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
        if (id) {
          existing = await tx.dokumen.findUnique({
            where: { id: parseInt(id, 10) }
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
              kegiatan_id: parseInt(kegiatan_id, 10),
              petugas_id: parseInt(petugas_id, 10),
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

        // Simpan jawaban
        if (values && Object.keys(values).length > 0) {
          for (const [qId, val] of Object.entries(values)) {
            const qIdInt = parseInt(qId, 10);
            const formattedVal = val !== undefined && val !== null ? String(val) : '';
            await tx.dokumenJawaban.upsert({
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
            });
          }
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
          last_sync: new Date(),
        },
      });
    });

    return res.json({ success: true, message: `Sinkronisasi berhasil untuk ${documents.length} dokumen` });
  } catch (error) {
    console.error('Error syncing documents:', error);
    return res.status(500).json({ success: false, message: 'Gagal melakukan sinkronisasi dokumen' });
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

export default router;
