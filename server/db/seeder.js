/**
 * @module server/db/seeder
 * Script untuk setup database: membuat tabel dan seed data awal.
 * Menjalankan schema.sql lalu seed.sql secara otomatis,
 * dengan bcrypt hash yang proper untuk password.
 *
 * Cara menjalankan:
 *   node db/seeder.js
 */

import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function seed() {
  // ── 0. Create database if it does not exist ──
  try {
    const tempConn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });
    await tempConn.query('CREATE DATABASE IF NOT EXISTS `' + (process.env.DB_NAME || 'desa_cantik') + '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    await tempConn.end();
    console.log('✅ Database created or already exists');
  } catch (err) {
    console.error('⚠️ Could not check/create database:', err.message);
  }

  let connection;
  try {
    connection = await pool.getConnection();
    console.log('✅ Connected to MySQL');

    // ── 1. Create database & tables ──
    const schemaSQL = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    const schemaLines = schemaSQL
      .split('\n')
      .map(line => line.trim())
      .filter(line => !line.startsWith('--'))
      .join('\n');
    const schemaStatements = schemaLines
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of schemaStatements) {
      await connection.query(stmt);
    }
    console.log('✅ Schema created');

    // ── 2. Clear existing data ──
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = [
      'dokumen_log', 'dokumen_jawaban', 'dokumen',
      'form_question', 'form_blok', 'desa_kegiatan',
      'wilayah', 'petugas_kegiatan', 'kegiatan', 'petugas', 'admin'
    ];
    for (const t of tables) {
      await connection.query(`TRUNCATE TABLE ${t}`);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Tables cleared');

    // ── 3. Hash passwords ──
    const adminHash = await bcrypt.hash('admin123', 10);
    const petugasHash = await bcrypt.hash('petugas123', 10);
    console.log('✅ Passwords hashed');

    // ── 4. Insert Admin ──
    await connection.query(
      'INSERT INTO admin (username, password, nama) VALUES (?, ?, ?)',
      ['admin', adminHash, 'Administrator BPS']
    );
    console.log('✅ Admin seeded');

    // ── 5. Insert Petugas ──
    const petugasList = [
      ['budi.santoso',  'Budi Santoso',  '327101010101000001', '0812-7890-1234', 'Tideng Pale',   15, 12, 'active'],
      ['siti.rahayu',   'Siti Rahayu',   '327101010101000002', '0856-1234-5678', 'Tideng Pale',   12, 12, 'done'],
      ['agus.prasetyo', 'Agus Prasetyo', '327101010101000003', '0813-9876-5432', 'Limbu Sedulun', 18,  7, 'active'],
      ['dewi.lestari',  'Dewi Lestari',  '327101010101000004', '0878-5555-1234', 'Tideng Pale',   15,  9, 'active'],
      ['rudi.hermawan', 'Rudi Hermawan', '327101010101000005', '0821-4444-9876', 'Sesayap Hilir', 12,  3, 'active'],
    ];

    for (const p of petugasList) {
      await connection.query(
        `INSERT INTO petugas (username, password, name, nik, phone, desa, target, selesai, last_sync, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR), ?)`,
        [p[0], petugasHash, p[1], p[2], p[3], p[4], p[5], p[6], Math.floor(Math.random() * 8) + 1, p[7]]
      );
    }
    console.log('✅ Petugas seeded (5 records)');

    // ── 6. Insert Kegiatan ──
    const kegiatanList = [
      ['Desa Cantik 2026', 'Pembinaan statistik sektoral untuk desa/kelurahan berkinerja tinggi.', 68, 'bg-blue-600', 'text-blue-600', 'bg-blue-50', '2026-05-15', 'published',
        JSON.stringify({kecamatan:["Sesayap","Sesayap Hilir"],desa:["Tideng Pale","Sesayap Hilir"],sls:["SLS 01 Tideng Pale","SLS 02 Tideng Pale","SLS 01 Sesayap Hilir"],subSls:["RT 01 A Tideng Pale","RT 01 B Tideng Pale"]})],
      ['Survei Ekonomi 2026', 'Survei komprehensif pelaku usaha mikro, kecil, dan menengah nasional.', 54, 'bg-purple-600', 'text-purple-600', 'bg-purple-50', '2026-06-01', 'published',
        JSON.stringify({kecamatan:["Sesayap"],desa:["Limbu Sedulun"],sls:["SLS 01 Limbu Sedulun","SLS 02 Limbu Sedulun"],subSls:[]})],
      ['Pendataan PLS 2026', 'Pendataan potensi lokal dan sosial ekonomi tingkat wilayah terkecil.', 75, 'bg-emerald-600', 'text-emerald-600', 'bg-emerald-50', '2026-04-10', 'published',
        JSON.stringify({kecamatan:["Tana Lia"],desa:["Tanah Merah"],sls:["SLS 01 Tanah Merah"],subSls:[]})],
      ['Survei Demografi 2026', 'Pengumpulan parameter kependudukan, fertilitas, dan mortalitas daerah.', 0, 'bg-amber-600', 'text-amber-600', 'bg-amber-50', '2026-07-20', 'draft',
        JSON.stringify({kecamatan:[],desa:[],sls:[],subSls:[]})],
    ];

    for (const k of kegiatanList) {
      await connection.query(
        `INSERT INTO kegiatan (name, description, progress, color, text_color, bg_color, start_date, status, lokus)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, k
      );
    }
    console.log('✅ Kegiatan seeded (4 records)');

    // ── 7. Insert Petugas-Kegiatan ──
    const pkList = [
      [1, 1, 'PCL', JSON.stringify(["SLS 01 Tideng Pale","RT 01 A Tideng Pale"]), 'Siti Rahayu'],
      [1, 3, 'PML', JSON.stringify(["SLS 01 Tanah Merah"]), 'Agus Prasetyo'],
      [2, 1, 'PML', null, null],
      [2, 2, 'PML', null, null],
      [3, 1, 'PCL', JSON.stringify(["SLS 02 Tideng Pale"]), 'Siti Rahayu'],
      [3, 3, 'PML', null, null],
      [4, 2, 'PML', null, null],
      [5, 2, 'PCL', JSON.stringify(["SLS 01 Limbu Sedulun"]), 'Dewi Lestari'],
      [5, 1, 'PCL', JSON.stringify(["SLS 01 Sesayap Hilir"]), 'Siti Rahayu'],
    ];

    for (const pk of pkList) {
      await connection.query(
        'INSERT INTO petugas_kegiatan (petugas_id, kegiatan_id, role, sls_assignments, pengawas) VALUES (?, ?, ?, ?, ?)', pk
      );
    }
    console.log('✅ Petugas-Kegiatan seeded (9 records)');

    // ── 8. Insert Wilayah ──
    const wilayahList = [
      ['Sesayap', 'Tideng Pale', 'SLS 01 Tideng Pale', 'RT 01 A Tideng Pale'],
      ['Sesayap', 'Tideng Pale', 'SLS 01 Tideng Pale', 'RT 01 B Tideng Pale'],
      ['Sesayap', 'Tideng Pale', 'SLS 02 Tideng Pale', null],
      ['Sesayap', 'Tideng Pale', 'SLS 03 Tideng Pale', null],
      ['Sesayap', 'Tideng Pale Timur', 'SLS 01 Tideng Pale Timur', null],
      ['Sesayap', 'Tideng Pale Timur', 'SLS 02 Tideng Pale Timur', null],
      ['Sesayap', 'Limbu Sedulun', 'SLS 01 Limbu Sedulun', null],
      ['Sesayap', 'Limbu Sedulun', 'SLS 02 Limbu Sedulun', null],
      ['Sesayap', 'Limbu Sedulun', 'SLS 03 Limbu Sedulun', null],
      ['Sesayap', 'Gunawan', 'SLS 01 Gunawan', null],
      ['Sesayap', 'Gunawan', 'SLS 02 Gunawan', null],
      ['Sesayap Hilir', 'Sesayap Hilir', 'SLS 01 Sesayap Hilir', null],
      ['Sesayap Hilir', 'Sesayap Hilir', 'SLS 02 Sesayap Hilir', null],
      ['Sesayap Hilir', 'Seludau', 'SLS 01 Seludau', null],
      ['Sesayap Hilir', 'Seludau', 'SLS 02 Seludau', null],
      ['Sesayap Hilir', 'Bebatu', 'SLS 01 Bebatu', null],
      ['Sesayap Hilir', 'Sepala Dalung', 'SLS 01 Sepala Dalung', null],
      ['Tana Lia', 'Tanah Merah', 'SLS 01 Tanah Merah', null],
      ['Tana Lia', 'Tanah Merah', 'SLS 02 Tanah Merah', null],
      ['Tana Lia', 'Sambungan', 'SLS 01 Sambungan', null],
      ['Tana Lia', 'Tengku Dacing', 'SLS 01 Tengku Dacing', null],
      ['Betayau', 'Kujau', 'SLS 01 Kujau', null],
      ['Betayau', 'Buong Baru', 'SLS 01 Buong Baru', null],
      ['Betayau', 'Betayau', 'SLS 01 Betayau', null],
      ['Muruk Rian', 'Rian', 'SLS 01 Rian', null],
      ['Muruk Rian', 'Kapuas', 'SLS 01 Kapuas', null],
      ['Muruk Rian', 'Belayan', 'SLS 01 Belayan', null],
    ];

    for (const w of wilayahList) {
      await connection.query(
        'INSERT INTO wilayah (kecamatan, desa, sls, sub_sls) VALUES (?, ?, ?, ?)', w
      );
    }
    console.log('✅ Wilayah seeded (27 records)');

    // ── 9. Insert Desa-Kegiatan Stats ──
    const dkList = [
      [1, 'Tideng Pale', 30, 24, '#2563eb'],
      [1, 'Sesayap Hilir', 24, 15, '#0891b2'],
      [2, 'Limbu Sedulun', 36, 19, '#7c3aed'],
      [3, 'Tanah Merah', 20, 15, '#10b981'],
    ];
    for (const dk of dkList) {
      await connection.query(
        'INSERT INTO desa_kegiatan (kegiatan_id, desa, target, selesai, color) VALUES (?, ?, ?, ?, ?)', dk
      );
    }
    console.log('✅ Desa-Kegiatan seeded (4 records)');

    // ── 10. Insert Form Blok (Desa Cantik 2026, kegiatan_id=1) ──
    const bloks = [
      [1, 'Blok I',   'Keterangan Tempat Tinggal', 1],
      [1, 'Blok II',  'Keterangan Perumahan', 2],
      [1, 'Blok III', 'Keterangan Anggota RT', 3],
      [1, 'Blok IV',  'Keterangan Sosial Ekonomi', 4],
      [1, 'Blok V',   'Keterangan Kepemilikan Aset', 5],
    ];
    for (const b of bloks) {
      await connection.query(
        'INSERT INTO form_blok (kegiatan_id, kode, title, sort_order) VALUES (?, ?, ?, ?)', b
      );
    }
    console.log('✅ Form Blok seeded (5 records)');

    // ── 11. Insert Form Questions ──
    // Blok I (blok_id=1): Lokasi
    const q_blok1 = [
      [1, null, 'Provinsi', 'text', true, null, null, null, null, 1],
      [1, null, 'Kabupaten / Kota', 'text', true, null, null, null, null, 2],
      [1, null, 'Kecamatan', 'text', true, null, null, null, null, 3],
      [1, null, 'Desa / Kelurahan', 'text', true, null, null, null, null, 4],
      [1, null, 'Satuan Lingkungan Setempat (SLS) / RT', 'text', false, null, null, null, null, 5],
      [1, null, 'Alamat / Jalan', 'text', false, null, null, null, null, 6],
    ];
    // Blok II (blok_id=2): Perumahan
    const q_blok2 = [
      [2, null, 'Status Kepemilikan Bangunan Tempat Tinggal', 'select', true,
        JSON.stringify([{value:"1",label:"Milik Sendiri"},{value:"2",label:"Kontrak/Sewa"},{value:"3",label:"Bebas Sewa"},{value:"4",label:"Lainnya"}]),
        null, null, null, 1],
      [2, null, 'Luas Lantai Bangunan (m²)', 'number', true, null, null, null, null, 2],
      [2, null, 'Jenis Lantai Terluas', 'select', true,
        JSON.stringify([{value:"1",label:"Keramik/Ubin"},{value:"2",label:"Semen/Plester"},{value:"3",label:"Kayu/Papan"},{value:"4",label:"Tanah"}]),
        null, null, null, 3],
      [2, null, 'Jenis Dinding Terluas', 'select', true,
        JSON.stringify([{value:"1",label:"Tembok"},{value:"2",label:"Semi Tembok"},{value:"3",label:"Kayu/Papan"},{value:"4",label:"Bambu/Lainnya"}]),
        null, null, null, 4],
    ];
    // Blok III (blok_id=3): Anggota RT
    const q_blok3 = [
      [3, null, 'Nama Kepala Rumah Tangga', 'text', true, null, null, null, null, 1],
      [3, null, 'Hubungan dengan KRT', 'select', true,
        JSON.stringify([{value:"1",label:"Kepala Rumah Tangga"},{value:"2",label:"Istri/Suami"},{value:"3",label:"Anak"},{value:"4",label:"Lainnya"}]),
        null, null, null, 2],
      [3, null, 'Jenis Kelamin', 'radio', true,
        JSON.stringify([{value:"1",label:"Laki-laki"},{value:"2",label:"Perempuan"}]),
        null, null, null, 3],
      [3, null, 'Umur (tahun)', 'number', true, null, 'range: 0-120', null, null, 4],
      [3, null, 'Status Perkawinan', 'radio', true,
        JSON.stringify([{value:"1",label:"Belum Kawin"},{value:"2",label:"Kawin"},{value:"3",label:"Cerai Hidup"},{value:"4",label:"Cerai Mati"}]),
        null, null, null, 5],
      [3, null, 'Pendidikan Tertinggi', 'select', true,
        JSON.stringify([{value:"1",label:"Tidak Sekolah"},{value:"2",label:"SD"},{value:"3",label:"SMP"},{value:"4",label:"SMA"},{value:"5",label:"Diploma/S1"}]),
        null, null, null, 6],
      [3, null, 'Bekerja seminggu terakhir?', 'radio', true,
        JSON.stringify([{value:"1",label:"Ya"},{value:"2",label:"Tidak"}]),
        null, null, null, 7],
      [3, null, 'Lapangan Usaha Utama', 'text', false, null, null, 'Aktif jika r307 = 1 (Ya)', null, 8],
    ];
    // Blok IV (blok_id=4): Sosial Ekonomi
    const q_blok4 = [
      [4, null, 'Sumber Penerangan Utama', 'select', true,
        JSON.stringify([{value:"1",label:"Listrik PLN"},{value:"2",label:"Listrik Non-PLN"},{value:"3",label:"Bukan Listrik"}]),
        null, null, null, 1],
      [4, null, 'Bahan Bakar Masak Utama', 'select', true,
        JSON.stringify([{value:"1",label:"Gas/Elpiji"},{value:"2",label:"Minyak Tanah"},{value:"3",label:"Kayu Bakar"},{value:"4",label:"Lainnya"}]),
        null, null, null, 2],
      [4, null, 'Sumber Air Minum Utama', 'select', true,
        JSON.stringify([{value:"1",label:"Air Kemasan/Isi Ulang"},{value:"2",label:"Ledeng/PAM"},{value:"3",label:"Sumur"},{value:"4",label:"Lainnya"}]),
        null, null, null, 3],
    ];
    // Blok V (blok_id=5): Kepemilikan Aset
    const q_blok5 = [
      [5, null, 'Tabungan/Emas', 'radio', true,
        JSON.stringify([{value:"1",label:"Ya"},{value:"2",label:"Tidak"}]), null, null, null, 1],
      [5, null, 'Sepeda Motor', 'radio', true,
        JSON.stringify([{value:"1",label:"Ya"},{value:"2",label:"Tidak"}]), null, null, null, 2],
      [5, null, 'Laptop/Komputer', 'radio', true,
        JSON.stringify([{value:"1",label:"Ya"},{value:"2",label:"Tidak"}]), null, null, null, 3],
      [5, null, 'HP Aktif', 'radio', true,
        JSON.stringify([{value:"1",label:"Ya"},{value:"2",label:"Tidak"}]), null, null, null, 4],
    ];

    const allQs = [...q_blok1, ...q_blok2, ...q_blok3, ...q_blok4, ...q_blok5];
    for (const q of allQs) {
      await connection.query(
        `INSERT INTO form_question (blok_id, parent_id, label, type, required, options, validation, skip_logic, skip_target, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, q
      );
    }
    // Set skip_target for question 17 (Bekerja) -> 18 (Lapangan Usaha)
    await connection.query(
      'UPDATE form_question SET skip_target = 18 WHERE id = 17'
    );
    console.log('✅ Form Questions seeded (25 records)');

    // ── 12. Insert Dokumen ──
    const dokumenList = [
      ['RT-001', 1, 1, 'Ahmad Subagyo',  'Jl. Melati No. 12',  'Sesayap', 'Tideng Pale', 'SLS 01 Tideng Pale', 'RT 01 A Tideng Pale', 'terkirim',  'approved', 0, true, true],
      ['RT-002', 1, 1, 'Slamet Widodo',  'Jl. Mangga No. 5',   'Sesayap', 'Tideng Pale', 'SLS 01 Tideng Pale', null,                   'tersimpan', 'draft',    0, false, false],
      ['RT-003', 1, 1, 'Ika Wahyuni',    'Jl. Rambutan No. 8', 'Sesayap', 'Tideng Pale', 'SLS 01 Tideng Pale', null,                   'draft',     'draft',    0, false, false],
      ['RT-004', 3, 1, 'Bambang Susilo', 'Jl. Durian No. 3',   'Sesayap', 'Tideng Pale', 'SLS 01 Tideng Pale', null,                   'draft',     'rejected', 0, false, false],
      ['RT-005', 3, 1, 'Nurhayati',      'Jl. Nangka No. 15',  'Sesayap', 'Tideng Pale', 'SLS 01 Tideng Pale', null,                   'tersimpan', 'draft',    0, false, false],
      ['RT-006', 3, 1, 'Sugeng Riyadi',  'Jl. Dahlia No. 10',  'Sesayap', 'Tideng Pale', 'SLS 01 Tideng Pale', null,                   'terkirim',  'draft',    0, false, true],
    ];
    for (const d of dokumenList) {
      await connection.query(
        `INSERT INTO dokumen (kode, kegiatan_id, petugas_id, krt, alamat, kecamatan, desa, sls, sub_sls, status, review_status, flag, is_prelist, sync)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, d
      );
    }
    console.log('✅ Dokumen seeded (6 records)');

    // ── 13. Insert Dokumen Jawaban ──
    // RT-001 (dok_id=1): full answers
    const j1 = [
      [1,1,'Kalimantan Utara'],[1,2,'Tana Tidung'],[1,3,'Sesayap'],[1,4,'Tideng Pale'],
      [1,5,'SLS 01 Tideng Pale'],[1,6,'Jl. Melati No. 12'],
      [1,7,'1'],[1,8,'80'],[1,9,'1'],[1,10,'1'],
      [1,11,'Ahmad Subagyo'],[1,12,'1'],[1,13,'1'],[1,14,'45'],[1,15,'2'],[1,16,'4'],[1,17,'1'],[1,18,'Pertanian'],
      [1,19,'1'],[1,20,'1'],[1,21,'1'],
      [1,22,'1'],[1,23,'1'],[1,24,'2'],[1,25,'1'],
    ];
    // RT-002 (dok_id=2)
    const j2 = [
      [2,1,'Kalimantan Utara'],[2,2,'Tana Tidung'],[2,3,'Sesayap'],[2,4,'Tideng Pale'],
      [2,5,'SLS 01 Tideng Pale'],[2,6,'Jl. Mangga No. 5'],
      [2,7,'1'],[2,8,'60'],[2,9,'1'],[2,10,'1'],
      [2,11,'Slamet Widodo'],[2,12,'1'],[2,13,'1'],[2,14,'38'],[2,15,'2'],[2,16,'4'],[2,17,'1'],[2,18,'Perdagangan'],
      [2,19,'1'],[2,20,'1'],[2,21,'2'],
      [2,22,'2'],[2,23,'1'],[2,24,'2'],[2,25,'1'],
    ];
    // RT-003 (dok_id=3): partial
    const j3 = [
      [3,1,'Kalimantan Utara'],[3,2,'Tana Tidung'],[3,3,'Sesayap'],[3,4,'Tideng Pale'],
      [3,11,'Ika Wahyuni'],[3,13,'2'],[3,14,'32'],[3,15,'1'],[3,17,'2'],
    ];
    // RT-004 (dok_id=4): full rejected
    const j4 = [
      [4,1,'Kalimantan Utara'],[4,2,'Tana Tidung'],[4,3,'Sesayap'],[4,4,'Tideng Pale'],
      [4,5,'SLS 01 Tideng Pale'],[4,6,'Jl. Durian No. 3'],
      [4,7,'1'],[4,8,'100'],[4,9,'1'],[4,10,'1'],
      [4,11,'Bambang Susilo'],[4,12,'1'],[4,13,'1'],[4,14,'50'],[4,15,'2'],[4,16,'4'],[4,17,'1'],[4,18,'Jasa Kebersihan'],
      [4,19,'1'],[4,20,'2'],[4,21,'1'],
      [4,22,'1'],[4,23,'1'],[4,24,'1'],[4,25,'1'],
    ];
    // RT-005 (dok_id=5)
    const j5 = [
      [5,1,'Kalimantan Utara'],[5,2,'Tana Tidung'],[5,3,'Sesayap'],[5,4,'Tideng Pale'],
      [5,5,'SLS 01 Tideng Pale'],[5,6,'Jl. Nangka No. 15'],
      [5,7,'1'],[5,8,'45'],[5,9,'1'],[5,10,'1'],
      [5,11,'Nurhayati'],[5,12,'1'],[5,13,'2'],[5,14,'28'],[5,15,'3'],[5,16,'4'],[5,17,'2'],[5,18,''],
      [5,19,'1'],[5,20,'1'],[5,21,'1'],
      [5,22,'1'],[5,23,'1'],[5,24,'2'],[5,25,'1'],
    ];
    // RT-006 (dok_id=6)
    const j6 = [
      [6,1,'Kalimantan Utara'],[6,2,'Tana Tidung'],[6,3,'Sesayap'],[6,4,'Tideng Pale'],
      [6,5,'SLS 01 Tideng Pale'],[6,6,'Jl. Dahlia No. 10'],
      [6,7,'1'],[6,8,'70'],[6,9,'1'],[6,10,'1'],
      [6,11,'Sugeng Riyadi'],[6,12,'1'],[6,13,'1'],[6,14,'42'],[6,15,'2'],[6,16,'4'],[6,17,'1'],[6,18,'Pertanian'],
      [6,19,'1'],[6,20,'1'],[6,21,'1'],
      [6,22,'1'],[6,23,'1'],[6,24,'2'],[6,25,'1'],
    ];

    const allJawaban = [...j1, ...j2, ...j3, ...j4, ...j5, ...j6];
    for (const j of allJawaban) {
      await connection.query(
        'INSERT INTO dokumen_jawaban (dokumen_id, question_id, value) VALUES (?, ?, ?)', j
      );
    }
    console.log('✅ Dokumen Jawaban seeded');

    // ── 14. Insert Dokumen Logs ──
    const logs = [
      [1, 'Kuesioner dibuat (Draft)', '2026-06-04 08:12:00'],
      [1, 'Kuesioner disimpan oleh PCL', '2026-06-04 09:30:00'],
      [1, 'Dokumen dikirim ke server (Terkirim)', '2026-06-04 10:00:00'],
      [1, 'Dokumen disetujui (Approved) oleh PML (Siti Rahayu)', '2026-06-04 14:15:00'],
      [2, 'Kuesioner dibuat (Draft)', '2026-06-04 11:20:00'],
      [2, 'Kuesioner disimpan oleh PCL (Tersimpan)', '2026-06-04 11:45:00'],
      [3, 'Kuesioner dibuat (Draft)', '2026-06-05 08:00:00'],
      [4, 'Kuesioner dibuat (Draft)', '2026-06-03 09:00:00'],
      [4, 'Kuesioner disimpan oleh PCL (Tersimpan)', '2026-06-03 10:30:00'],
      [4, 'Dokumen dikirim ke server (Terkirim)', '2026-06-03 11:00:00'],
      [4, 'Ditolak (Rejected) oleh PML (Agus Prasetyo): Keterangan Umur tidak sesuai dengan Jenis Dinding Bangunan yang tergolong mewah (Mohon cek ulang Blok II & Blok III).', '2026-06-03 15:45:00'],
      [5, 'Kuesioner dibuat (Draft)', '2026-06-05 08:22:00'],
      [5, 'Kuesioner disimpan oleh PCL (Tersimpan)', '2026-06-05 08:45:00'],
      [6, 'Kuesioner dibuat (Draft)', '2026-06-04 14:00:00'],
      [6, 'Kuesioner disimpan oleh PCL (Tersimpan)', '2026-06-04 15:30:00'],
      [6, 'Dokumen dikirim ke server (Terkirim)', '2026-06-04 16:00:00'],
    ];
    for (const l of logs) {
      await connection.query(
        'INSERT INTO dokumen_log (dokumen_id, message, created_at) VALUES (?, ?, ?)', l
      );
    }
    console.log('✅ Dokumen Logs seeded');

    console.log('\n🎉 Database seeded successfully!');
    console.log('   Admin login:   admin / admin123');
    console.log('   Petugas login:  budi.santoso / petugas123');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

seed();
