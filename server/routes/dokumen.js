import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

/**
 * GET /api/dokumen/petugas/:petugasId
 * Mengambil semua dokumen yang dimiliki oleh petugas tertentu.
 */
router.get('/petugas/:petugasId', async (req, res) => {
  const { petugasId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT d.*, k.name as activity_name, p.name as petugas_name
       FROM dokumen d
       JOIN kegiatan k ON d.kegiatan_id = k.id
       JOIN petugas p ON d.petugas_id = p.id
       WHERE d.petugas_id = ?
       ORDER BY d.updated_at DESC`,
      [petugasId]
    );

    // Ambil logs untuk setiap dokumen
    const formatted = [];
    for (const doc of rows) {
      const [logs] = await pool.query(
        'SELECT message, created_at FROM dokumen_log WHERE dokumen_id = ? ORDER BY created_at ASC',
        [doc.id]
      );
      
      formatted.push({
        ...doc,
        logs: logs.map(l => `${l.created_at.toLocaleString('id-ID')}: ${l.message}`),
        sync: !!doc.sync,
        is_prelist: !!doc.is_prelist
      });
    }

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
    const [rows] = await pool.query(
      `SELECT d.*, k.name as activity_name, p.name as petugas_name
       FROM dokumen d
       JOIN kegiatan k ON d.kegiatan_id = k.id
       JOIN petugas p ON d.petugas_id = p.id
       WHERE d.kegiatan_id = ? AND d.status IN ('tersimpan', 'terkirim')
       ORDER BY d.updated_at DESC`,
      [kegiatanId]
    );

    const formatted = [];
    for (const doc of rows) {
      const [logs] = await pool.query(
        'SELECT message, created_at FROM dokumen_log WHERE dokumen_id = ? ORDER BY created_at ASC',
        [doc.id]
      );
      formatted.push({
        ...doc,
        logs: logs.map(l => `${l.created_at.toLocaleString('id-ID')}: ${l.message}`),
        sync: !!doc.sync,
        is_prelist: !!doc.is_prelist
      });
    }

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
    const [docRows] = await pool.query(
      `SELECT d.*, k.name as activity_name, p.name as petugas_name
       FROM dokumen d
       JOIN kegiatan k ON d.kegiatan_id = k.id
       JOIN petugas p ON d.petugas_id = p.id
       WHERE d.id = ?`,
      [id]
    );

    if (docRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan' });
    }

    const doc = docRows[0];

    // Ambil jawaban
    const [ansRows] = await pool.query(
      `SELECT dj.question_id, dj.value, q.label
       FROM dokumen_jawaban dj
       JOIN form_question q ON dj.question_id = q.id
       WHERE dj.dokumen_id = ?`,
      [id]
    );

    // Ambil logs
    const [logRows] = await pool.query(
      'SELECT message, created_at FROM dokumen_log WHERE dokumen_id = ? ORDER BY created_at ASC',
      [id]
    );

    // Format jawaban ke key-value map
    const values = {};
    ansRows.forEach(a => {
      values[a.question_id] = a.value;
    });

    return res.json({
      success: true,
      dokumen: {
        ...doc,
        sync: !!doc.sync,
        is_prelist: !!doc.is_prelist
      },
      values,
      logs: logRows.map(l => `${l.created_at.toLocaleString('id-ID')}: ${l.message}`)
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
    id, // Optional, if exists then it is an update
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
    values, // Object { question_id: value }
    log_message
  } = req.body;

  if (!kode || !kegiatan_id || !petugas_id) {
    return res.status(400).json({ success: false, message: 'Kode, Kegiatan ID, dan Petugas ID wajib diisi' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let docId = id;
    const isPrelistVal = is_prelist ? 1 : 0;
    const syncVal = sync ? 1 : 0;
    const lastSentDataJson = status === 'terkirim' ? JSON.stringify(values) : null;

    if (docId) {
      // Update dokumen header
      await connection.query(
        `UPDATE dokumen 
         SET kode = ?, krt = ?, alamat = ?, kecamatan = ?, desa = ?, sls = ?, sub_sls = ?, 
             status = ?, is_prelist = ?, sync = ?, last_sent_data = IFNULL(?, last_sent_data)
         WHERE id = ?`,
        [kode, krt || null, alamat || null, kecamatan || null, desa || null, sls || null, sub_sls || null, status || 'draft', isPrelistVal, syncVal, lastSentDataJson, docId]
      );
    } else {
      // Cek apakah kode sudah ada
      const [existing] = await connection.query('SELECT id FROM dokumen WHERE kode = ?', [kode]);
      if (existing.length > 0) {
        docId = existing[0].id;
        // Update saja
        await connection.query(
          `UPDATE dokumen 
           SET krt = ?, alamat = ?, kecamatan = ?, desa = ?, sls = ?, sub_sls = ?, 
               status = ?, is_prelist = ?, sync = ?, last_sent_data = IFNULL(?, last_sent_data)
           WHERE id = ?`,
          [krt || null, alamat || null, kecamatan || null, desa || null, sls || null, sub_sls || null, status || 'draft', isPrelistVal, syncVal, lastSentDataJson, docId]
        );
      } else {
        // Insert dokumen header baru
        const [result] = await connection.query(
          `INSERT INTO dokumen (kode, kegiatan_id, petugas_id, krt, alamat, kecamatan, desa, sls, sub_sls, status, is_prelist, sync, last_sent_data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [kode, kegiatan_id, petugas_id, krt || null, alamat || null, kecamatan || null, desa || null, sls || null, sub_sls || null, status || 'draft', isPrelistVal, syncVal, lastSentDataJson]
        );
        docId = result.insertId;
      }
    }

    // Simpan jawaban (EAV)
    if (values && Object.keys(values).length > 0) {
      const insertData = [];
      Object.entries(values).forEach(([qId, val]) => {
        // Hanya simpan jika value tidak null
        const formattedVal = val !== undefined && val !== null ? String(val) : '';
        insertData.push([docId, parseInt(qId, 10), formattedVal]);
      });

      if (insertData.length > 0) {
        await connection.query(
          `INSERT INTO dokumen_jawaban (dokumen_id, question_id, value)
           VALUES ?
           ON DUPLICATE KEY UPDATE value = VALUES(value)`,
          [insertData]
        );
      }
    }

    // Tambah log aktivitas
    const msg = log_message || `Kuesioner disimpan sebagai ${status}`;
    await connection.query(
      'INSERT INTO dokumen_log (dokumen_id, message) VALUES (?, ?)',
      [docId, msg]
    );

    // Update target/selesai petugas secara otomatis jika disubmit
    if (status === 'terkirim' || status === 'tersimpan') {
      const [allDocs] = await connection.query(
        "SELECT COUNT(*) as total, SUM(CASE WHEN status IN ('tersimpan', 'terkirim') THEN 1 ELSE 0 END) as selesai FROM dokumen WHERE petugas_id = ?",
        [petugas_id]
      );
      await connection.query(
        "UPDATE petugas SET target = ?, selesai = ? WHERE id = ?",
        [allDocs[0].total || 0, allDocs[0].selesai || 0, petugas_id]
      );
    }

    await connection.commit();
    return res.json({ success: true, message: 'Dokumen berhasil disimpan', id: docId });
  } catch (error) {
    await connection.rollback();
    console.error('Error saving document:', error);
    return res.status(500).json({ success: false, message: 'Gagal menyimpan dokumen' });
  } finally {
    connection.release();
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

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const doc of documents) {
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
        values
      } = doc;

      // Cek apakah dokumen dengan kode ini sudah ada
      const [existing] = await connection.query('SELECT id FROM dokumen WHERE kode = ?', [kode]);
      let docId;

      const isPrelistVal = is_prelist ? 1 : 0;
      const lastSentDataJson = status === 'terkirim' ? JSON.stringify(values) : null;

      if (existing.length > 0) {
        docId = existing[0].id;
        await connection.query(
          `UPDATE dokumen 
           SET krt = ?, alamat = ?, kecamatan = ?, desa = ?, sls = ?, sub_sls = ?, 
               status = ?, is_prelist = ?, sync = 1, last_sent_data = IFNULL(?, last_sent_data)
           WHERE id = ?`,
          [krt || null, alamat || null, kecamatan || null, desa || null, sls || null, sub_sls || null, status || 'draft', isPrelistVal, lastSentDataJson, docId]
        );
      } else {
        const [result] = await connection.query(
          `INSERT INTO dokumen (kode, kegiatan_id, petugas_id, krt, alamat, kecamatan, desa, sls, sub_sls, status, is_prelist, sync, last_sent_data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          [kode, kegiatan_id, petugas_id, krt || null, alamat || null, kecamatan || null, desa || null, sls || null, sub_sls || null, status || 'draft', isPrelistVal, lastSentDataJson]
        );
        docId = result.insertId;
      }

      // Simpan jawaban
      if (values && Object.keys(values).length > 0) {
        const insertData = [];
        Object.entries(values).forEach(([qId, val]) => {
          const formattedVal = val !== undefined && val !== null ? String(val) : '';
          insertData.push([docId, parseInt(qId, 10), formattedVal]);
        });

        if (insertData.length > 0) {
          await connection.query(
            `INSERT INTO dokumen_jawaban (dokumen_id, question_id, value)
             VALUES ?
             ON DUPLICATE KEY UPDATE value = VALUES(value)`,
            [insertData]
          );
        }
      }

      // Catat log sync
      await connection.query(
        'INSERT INTO dokumen_log (dokumen_id, message) VALUES (?, ?)',
        [docId, `Sinkronisasi dokumen dari offline (Status: ${status})`]
      );
    }

    // Update stats petugas
    const [allDocs] = await connection.query(
      "SELECT COUNT(*) as total, SUM(CASE WHEN status IN ('tersimpan', 'terkirim') THEN 1 ELSE 0 END) as selesai FROM dokumen WHERE petugas_id = ?",
      [petugas_id]
    );
    await connection.query(
      "UPDATE petugas SET target = ?, selesai = ?, last_sync = NOW() WHERE id = ?",
      [allDocs[0].total || 0, allDocs[0].selesai || 0, petugas_id]
    );

    await connection.commit();
    return res.json({ success: true, message: `Sinkronisasi berhasil untuk ${documents.length} dokumen` });
  } catch (error) {
    await connection.rollback();
    console.error('Error syncing documents:', error);
    return res.status(500).json({ success: false, message: 'Gagal melakukan sinkronisasi dokumen' });
  } finally {
    connection.release();
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

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existing] = await connection.query('SELECT * FROM dokumen WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan' });
    }

    const doc = existing[0];

    // Update status review
    await connection.query(
      'UPDATE dokumen SET review_status = ? WHERE id = ?',
      [review_status, id]
    );

    // Tambah log review
    const logMsg = review_status === 'approved' 
      ? 'Dokumen disetujui (Approved) oleh PML'
      : `Ditolak (Rejected) oleh PML: ${notes || ''}`;
    
    await connection.query(
      'INSERT INTO dokumen_log (dokumen_id, message) VALUES (?, ?)',
      [id, logMsg]
    );

    // Jika disetujui, update status desa_kegiatan
    if (review_status === 'approved') {
      await connection.query(
        `INSERT INTO desa_kegiatan (kegiatan_id, desa, selesai)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE selesai = selesai + 1`,
        [doc.kegiatan_id, doc.desa]
      );
    }

    await connection.commit();
    return res.json({ success: true, message: `Dokumen berhasil di-${review_status}` });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating review status:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui status review dokumen' });
  } finally {
    connection.release();
  }
});

export default router;
