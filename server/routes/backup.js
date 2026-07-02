import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../config/database.js';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_DIR = path.join(__dirname, '../backups');
const LOGS_FILE = path.join(BACKUP_DIR, 'backup_logs.json');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Helper to write a log entry
function addLog(action, status, message, details = '') {
  let logs = [];
  if (fs.existsSync(LOGS_FILE)) {
    try {
      logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
    } catch (e) {
      logs = [];
    }
  }
  const logEntry = {
    id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    action, // 'backup' | 'restore' | 'delete'
    status, // 'success' | 'failed'
    message,
    details
  };
  logs.unshift(logEntry);
  if (logs.length > 200) {
    logs = logs.slice(0, 200);
  }
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf8');
}

// Execute raw SQL statements
async function executeSqlScript(sql) {
  // Execute raw query against PostgreSQL
  await prisma.$executeRawUnsafe(sql);
}

// GET /api/backup/history
router.get('/history', (req, res) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.sql'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          sizeBytes: stats.size,
          createdAt: stats.birthtime || stats.mtime
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    let logs = [];
    if (fs.existsSync(LOGS_FILE)) {
      try {
        logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
      } catch (e) {
        logs = [];
      }
    }

    res.json({ success: true, files, logs });
  } catch (error) {
    console.error('Error fetching backup history:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil riwayat backup' });
  }
});

// POST /api/backup/create
router.post('/create', async (req, res) => {
  try {
    let sqlDump = `-- Backup Database Desa Cantik (PostgreSQL)
-- Generated on: ${new Date().toISOString()}

SET session_replication_role = 'replica';

TRUNCATE TABLE "dokumen_log", "dokumen_jawaban", "dokumen", "form_question", "form_blok", "desa_kegiatan", "petugas_kegiatan", "kegiatan", "admin", "petugas", "wilayah", "freeform" RESTART IDENTITY CASCADE;

`;

    const TABLES = [
      { model: 'freeform', table: 'freeform', fields: ['id', 'kegiatan_id', 'type', 'key_name', 'payload', 'created_at', 'updated_at'] },
      { model: 'admin', table: 'admin', fields: ['id', 'username', 'password', 'plain_password', 'nama', 'role', 'kegiatan_id', 'created_at', 'updated_at'] },
      { model: 'petugas', table: 'petugas', fields: ['id', 'username', 'password', 'name', 'nik', 'phone', 'desa', 'target', 'selesai', 'last_sync', 'status', 'created_at', 'updated_at'] },
      { model: 'kegiatan', table: 'kegiatan', fields: ['id', 'name', 'description', 'progress', 'color', 'text_color', 'bg_color', 'start_date', 'status', 'lokus', 'fokus', 'prelist_mapping', 'created_at', 'updated_at'] },
      { model: 'petugasKegiatan', table: 'petugas_kegiatan', fields: ['id', 'petugas_id', 'kegiatan_id', 'role', 'sls_assignments', 'pengawas', 'created_at'] },
      { model: 'wilayah', table: 'wilayah', fields: ['id', 'kecamatan', 'desa', 'sls', 'sub_sls', 'kode_wilayah', 'kdprov', 'kdkab', 'kdkec', 'kddesa', 'kdsls', 'kdsubsls', 'created_at'] },
      { model: 'desaKegiatan', table: 'desa_kegiatan', fields: ['id', 'kegiatan_id', 'desa', 'target', 'selesai', 'color', 'created_at'] },
      { model: 'formBlok', table: 'form_blok', fields: ['id', 'kegiatan_id', 'kode', 'title', 'sort_order', 'hide_logic', 'created_at'] },
      { model: 'formQuestion', table: 'form_question', fields: ['id', 'blok_id', 'parent_id', 'label', 'type', 'required', 'options', 'validation', 'skip_logic', 'skip_target', 'show_if_parent_id', 'show_if_value', 'sort_order', 'created_at', 'updated_at'] },
      { model: 'dokumen', table: 'dokumen', fields: ['id', 'kode', 'kegiatan_id', 'petugas_id', 'krt', 'alamat', 'kecamatan', 'desa', 'sls', 'sub_sls', 'status', 'review_status', 'flag', 'is_prelist', 'sync', 'last_sent_data', 'no_kk', 'nik', 'hub_keluarga', 'backup_at', 'assigned_pcls', 'assigned_pmls', 'created_at', 'updated_at'] },
      { model: 'dokumenJawaban', table: 'dokumen_jawaban', fields: ['id', 'dokumen_id', 'question_id', 'value', 'created_at', 'updated_at'] },
      { model: 'dokumenLog', table: 'dokumen_log', fields: ['id', 'dokumen_id', 'message', 'created_at'] }
    ];

    function formatValue(val) {
      if (val === null || val === undefined) {
        return 'NULL';
      }
      if (typeof val === 'boolean') {
        return val ? 'true' : 'false';
      }
      if (typeof val === 'number') {
        return String(val);
      }
      if (val instanceof Date) {
        return `'${val.toISOString()}'`;
      }
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
        return `'${val}'`;
      }
      if (typeof val === 'object') {
        const jsonStr = JSON.stringify(val).replace(/'/g, "''");
        return `'${jsonStr}'::jsonb`;
      }
      const escaped = String(val).replace(/'/g, "''");
      return `'${escaped}'`;
    }

    for (const tInfo of TABLES) {
      const rows = await prisma[tInfo.model].findMany();
      if (rows.length > 0) {
        sqlDump += `-- Data for table: ${tInfo.table}\n`;
        const columns = tInfo.fields;
        
        for (const row of rows) {
          const vals = columns.map(col => formatValue(row[col]));
          sqlDump += `INSERT INTO "${tInfo.table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${vals.join(', ')});\n`;
        }
        sqlDump += `\n`;
      }
    }

    sqlDump += `SET session_replication_role = 'origin';\n\n`;
    sqlDump += `-- Reset Sequences\n`;
    for (const tInfo of TABLES) {
      sqlDump += `SELECT setval(pg_get_serial_sequence('"${tInfo.table}"', 'id'), coalesce(max("id"), 1), max("id") IS NOT NULL) FROM "${tInfo.table}";\n`;
    }

    const d = new Date();
    const timestamp = d.getFullYear().toString() +
      (d.getMonth() + 1).toString().padStart(2, '0') +
      d.getDate().toString().padStart(2, '0') + '_' +
      d.getHours().toString().padStart(2, '0') +
      d.getMinutes().toString().padStart(2, '0') +
      d.getSeconds().toString().padStart(2, '0');
      
    const filename = `backup_${timestamp}.sql`;
    const filePath = path.join(BACKUP_DIR, filename);

    fs.writeFileSync(filePath, sqlDump, 'utf8');

    addLog('backup', 'success', `Berhasil membuat backup: ${filename}`, `Ukuran file: ${sqlDump.length} byte`);

    res.json({
      success: true,
      message: 'Backup berhasil dibuat',
      filename,
      sizeBytes: sqlDump.length,
      sql: sqlDump
    });
  } catch (error) {
    console.error('Error generating backup:', error);
    addLog('backup', 'failed', 'Gagal membuat backup', error.message);
    res.status(500).json({ success: false, message: `Gagal membuat backup: ${error.message}` });
  }
});

// POST /api/backup/restore-file
router.post('/restore-file', async (req, res) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ success: false, message: 'Nama file harus disertakan' });
  }

  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File backup tidak ditemukan di server' });
  }

  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    await executeSqlScript(sql);
    
    addLog('restore', 'success', `Berhasil memulihkan database dari file: ${filename}`);
    res.json({ success: true, message: 'Database berhasil dipulihkan' });
  } catch (error) {
    console.error('Error restoring database from file:', error);
    addLog('restore', 'failed', `Gagal memulihkan dari file: ${filename}`, error.message);
    res.status(500).json({ success: false, message: `Gagal memulihkan database: ${error.message}` });
  }
});

// POST /api/backup/restore-upload
router.post('/restore-upload', async (req, res) => {
  const { sqlContent } = req.body;
  if (!sqlContent) {
    return res.status(400).json({ success: false, message: 'Konten SQL harus disertakan' });
  }

  try {
    await executeSqlScript(sqlContent);
    
    const d = new Date();
    const timestamp = d.getFullYear().toString() +
      (d.getMonth() + 1).toString().padStart(2, '0') +
      d.getDate().toString().padStart(2, '0') + '_' +
      d.getHours().toString().padStart(2, '0') +
      d.getMinutes().toString().padStart(2, '0') +
      d.getSeconds().toString().padStart(2, '0');
    
    const filename = `uploaded_backup_${timestamp}.sql`;
    const filePath = path.join(BACKUP_DIR, filename);
    fs.writeFileSync(filePath, sqlContent, 'utf8');

    addLog('restore', 'success', `Berhasil memulihkan database dari upload: ${filename}`);
    res.json({ success: true, message: 'Database berhasil dipulihkan dari data yang diunggah' });
  } catch (error) {
    console.error('Error restoring database from upload:', error);
    addLog('restore', 'failed', 'Gagal memulihkan database dari upload', error.message);
    res.status(500).json({ success: false, message: `Gagal memulihkan database: ${error.message}` });
  }
});

// DELETE /api/backup/delete/:filename
router.delete('/delete/:filename', (req, res) => {
  const { filename } = req.params;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ success: false, message: 'Nama file tidak valid' });
  }

  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File tidak ditemukan' });
  }

  try {
    fs.unlinkSync(filePath);
    addLog('delete', 'success', `Berhasil menghapus backup: ${filename}`);
    res.json({ success: true, message: 'File backup berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting backup file:', error);
    addLog('delete', 'failed', `Gagal menghapus backup: ${filename}`, error.message);
    res.status(500).json({ success: false, message: 'Gagal menghapus file backup' });
  }
});

// GET /api/backup/download/:filename
router.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ success: false, message: 'Nama file tidak valid' });
  }

  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File tidak ditemukan' });
  }

  res.download(filePath, filename);
});

export default router;
