-- =============================================
-- DESA CANTIK (CAPI BPS) — Seed Data
-- Jalankan setelah schema.sql
-- =============================================

USE desa_cantik;

-- =============================================
-- 1. ADMIN (password: admin123)
-- =============================================
INSERT INTO admin (username, password, nama) VALUES
('admin', '$2b$10$YmVzdHBhc3N3b3JkZXZlcg$KqHZPKnXmMr8RQGJu0b.5eYmVzdHBhc3N3b3Jk', 'Administrator BPS');

-- =============================================
-- 2. PETUGAS (password: petugas123 untuk semua)
-- =============================================
INSERT INTO petugas (username, password, name, nik, phone, desa, target, selesai, last_sync, status) VALUES
('budi.santoso',    '$2b$10$placeholder_hash_budi',    'Budi Santoso',   '327101010101000001', '0812-7890-1234', 'Tideng Pale',    15, 12, DATE_SUB(NOW(), INTERVAL 2 HOUR), 'active'),
('siti.rahayu',     '$2b$10$placeholder_hash_siti',    'Siti Rahayu',    '327101010101000002', '0856-1234-5678', 'Tideng Pale',    12, 12, DATE_SUB(NOW(), INTERVAL 1 HOUR), 'done'),
('agus.prasetyo',   '$2b$10$placeholder_hash_agus',    'Agus Prasetyo',  '327101010101000003', '0813-9876-5432', 'Limbu Sedulun',  18,  7, DATE_SUB(NOW(), INTERVAL 5 HOUR), 'active'),
('dewi.lestari',    '$2b$10$placeholder_hash_dewi',    'Dewi Lestari',   '327101010101000004', '0878-5555-1234', 'Tideng Pale',    15,  9, DATE_SUB(NOW(), INTERVAL 3 HOUR), 'active'),
('rudi.hermawan',   '$2b$10$placeholder_hash_rudi',    'Rudi Hermawan',  '327101010101000005', '0821-4444-9876', 'Sesayap Hilir',  12,  3, DATE_SUB(NOW(), INTERVAL 8 HOUR), 'active');

-- =============================================
-- 3. KEGIATAN
-- =============================================
INSERT INTO kegiatan (name, description, progress, color, text_color, bg_color, start_date, status, lokus) VALUES
('Desa Cantik 2026',
 'Pembinaan statistik sektoral untuk desa/kelurahan berkinerja tinggi.',
 68, 'bg-blue-600', 'text-blue-600', 'bg-blue-50', '2026-05-15', 'published',
 '{"kecamatan":["Sesayap","Sesayap Hilir"],"desa":["Tideng Pale","Sesayap Hilir"],"sls":["SLS 01 Tideng Pale","SLS 02 Tideng Pale","SLS 01 Sesayap Hilir"],"subSls":["RT 01 A Tideng Pale","RT 01 B Tideng Pale"]}'),

('Survei Ekonomi 2026',
 'Survei komprehensif pelaku usaha mikro, kecil, dan menengah nasional.',
 54, 'bg-purple-600', 'text-purple-600', 'bg-purple-50', '2026-06-01', 'published',
 '{"kecamatan":["Sesayap"],"desa":["Limbu Sedulun"],"sls":["SLS 01 Limbu Sedulun","SLS 02 Limbu Sedulun"],"subSls":[]}'),

('Pendataan PLS 2026',
 'Pendataan potensi lokal dan sosial ekonomi tingkat wilayah terkecil.',
 75, 'bg-emerald-600', 'text-emerald-600', 'bg-emerald-50', '2026-04-10', 'published',
 '{"kecamatan":["Tana Lia"],"desa":["Tanah Merah"],"sls":["SLS 01 Tanah Merah"],"subSls":[]}'),

('Survei Demografi 2026',
 'Pengumpulan parameter kependudukan, fertilitas, dan mortalitas daerah.',
 0, 'bg-amber-600', 'text-amber-600', 'bg-amber-50', '2026-07-20', 'draft',
 '{"kecamatan":[],"desa":[],"sls":[],"subSls":[]}');

-- =============================================
-- 4. PETUGAS_KEGIATAN
-- =============================================
-- Budi Santoso: PCL di Desa Cantik, PML di Pendataan PLS
INSERT INTO petugas_kegiatan (petugas_id, kegiatan_id, role, sls_assignments, pengawas) VALUES
(1, 1, 'PCL', '["SLS 01 Tideng Pale","RT 01 A Tideng Pale"]', 'Siti Rahayu'),
(1, 3, 'PML', '["SLS 01 Tanah Merah"]', 'Agus Prasetyo');

-- Siti Rahayu: PML di Desa Cantik, PML di Survei Ekonomi
INSERT INTO petugas_kegiatan (petugas_id, kegiatan_id, role, sls_assignments, pengawas) VALUES
(2, 1, 'PML', NULL, NULL),
(2, 2, 'PML', NULL, NULL);

-- Agus Prasetyo: PCL di Desa Cantik, PML di Pendataan PLS
INSERT INTO petugas_kegiatan (petugas_id, kegiatan_id, role, sls_assignments, pengawas) VALUES
(3, 1, 'PCL', '["SLS 02 Tideng Pale"]', 'Siti Rahayu'),
(3, 3, 'PML', NULL, NULL);

-- Dewi Lestari: PML di Survei Ekonomi
INSERT INTO petugas_kegiatan (petugas_id, kegiatan_id, role, sls_assignments, pengawas) VALUES
(4, 2, 'PML', NULL, NULL);

-- Rudi Hermawan: PCL di Survei Ekonomi, PCL di Desa Cantik
INSERT INTO petugas_kegiatan (petugas_id, kegiatan_id, role, sls_assignments, pengawas) VALUES
(5, 2, 'PCL', '["SLS 01 Limbu Sedulun"]', 'Dewi Lestari'),
(5, 1, 'PCL', '["SLS 01 Sesayap Hilir"]', 'Siti Rahayu');

-- =============================================
-- 5. WILAYAH — Kab. Tana Tidung
-- =============================================
INSERT INTO wilayah (kecamatan, desa, sls, sub_sls) VALUES
-- Sesayap
('Sesayap', 'Tideng Pale', 'SLS 01 Tideng Pale', 'RT 01 A Tideng Pale'),
('Sesayap', 'Tideng Pale', 'SLS 01 Tideng Pale', 'RT 01 B Tideng Pale'),
('Sesayap', 'Tideng Pale', 'SLS 02 Tideng Pale', NULL),
('Sesayap', 'Tideng Pale', 'SLS 03 Tideng Pale', NULL),
('Sesayap', 'Tideng Pale Timur', 'SLS 01 Tideng Pale Timur', NULL),
('Sesayap', 'Tideng Pale Timur', 'SLS 02 Tideng Pale Timur', NULL),
('Sesayap', 'Limbu Sedulun', 'SLS 01 Limbu Sedulun', NULL),
('Sesayap', 'Limbu Sedulun', 'SLS 02 Limbu Sedulun', NULL),
('Sesayap', 'Limbu Sedulun', 'SLS 03 Limbu Sedulun', NULL),
('Sesayap', 'Gunawan', 'SLS 01 Gunawan', NULL),
('Sesayap', 'Gunawan', 'SLS 02 Gunawan', NULL),
-- Sesayap Hilir
('Sesayap Hilir', 'Sesayap Hilir', 'SLS 01 Sesayap Hilir', NULL),
('Sesayap Hilir', 'Sesayap Hilir', 'SLS 02 Sesayap Hilir', NULL),
('Sesayap Hilir', 'Seludau', 'SLS 01 Seludau', NULL),
('Sesayap Hilir', 'Seludau', 'SLS 02 Seludau', NULL),
('Sesayap Hilir', 'Bebatu', 'SLS 01 Bebatu', NULL),
('Sesayap Hilir', 'Sepala Dalung', 'SLS 01 Sepala Dalung', NULL),
-- Tana Lia
('Tana Lia', 'Tanah Merah', 'SLS 01 Tanah Merah', NULL),
('Tana Lia', 'Tanah Merah', 'SLS 02 Tanah Merah', NULL),
('Tana Lia', 'Sambungan', 'SLS 01 Sambungan', NULL),
('Tana Lia', 'Tengku Dacing', 'SLS 01 Tengku Dacing', NULL),
-- Betayau
('Betayau', 'Kujau', 'SLS 01 Kujau', NULL),
('Betayau', 'Buong Baru', 'SLS 01 Buong Baru', NULL),
('Betayau', 'Betayau', 'SLS 01 Betayau', NULL),
-- Muruk Rian
('Muruk Rian', 'Rian', 'SLS 01 Rian', NULL),
('Muruk Rian', 'Kapuas', 'SLS 01 Kapuas', NULL),
('Muruk Rian', 'Belayan', 'SLS 01 Belayan', NULL);

-- =============================================
-- 6. DESA_KEGIATAN — Stats per desa per kegiatan
-- =============================================
-- Desa Cantik 2026
INSERT INTO desa_kegiatan (kegiatan_id, desa, target, selesai, color) VALUES
(1, 'Tideng Pale', 30, 24, '#2563eb'),
(1, 'Sesayap Hilir', 24, 15, '#0891b2');

-- Survei Ekonomi 2026
INSERT INTO desa_kegiatan (kegiatan_id, desa, target, selesai, color) VALUES
(2, 'Limbu Sedulun', 36, 19, '#7c3aed');

-- Pendataan PLS 2026
INSERT INTO desa_kegiatan (kegiatan_id, desa, target, selesai, color) VALUES
(3, 'Tanah Merah', 20, 15, '#10b981');

-- =============================================
-- 7. FORM_BLOK — Blok kuesioner untuk "Desa Cantik 2026" (kegiatan_id=1)
-- =============================================
INSERT INTO form_blok (kegiatan_id, kode, title, sort_order) VALUES
(1, 'Blok I',   'Keterangan Tempat Tinggal', 1),
(1, 'Blok II',  'Keterangan Perumahan', 2),
(1, 'Blok III', 'Keterangan Anggota RT', 3),
(1, 'Blok IV',  'Keterangan Sosial Ekonomi', 4),
(1, 'Blok V',   'Keterangan Kepemilikan Aset', 5);

-- =============================================
-- 8. FORM_QUESTION — Pertanyaan per blok (Desa Cantik 2026)
-- =============================================
-- Blok I (blok_id=1): Lokasi
INSERT INTO form_question (blok_id, label, type, required, options, sort_order) VALUES
(1, 'Provinsi',                 'text',   TRUE,  NULL, 1),
(1, 'Kabupaten / Kota',         'text',   TRUE,  NULL, 2),
(1, 'Kecamatan',                'text',   TRUE,  NULL, 3),
(1, 'Desa / Kelurahan',         'text',   TRUE,  NULL, 4),
(1, 'Satuan Lingkungan Setempat (SLS) / RT', 'text', FALSE, NULL, 5),
(1, 'Alamat / Jalan',           'text',   FALSE, NULL, 6);

-- Blok II (blok_id=2): Perumahan
INSERT INTO form_question (blok_id, label, type, required, options, sort_order) VALUES
(2, 'Status Kepemilikan Bangunan Tempat Tinggal', 'select', TRUE,
  '[{"value":"1","label":"Milik Sendiri"},{"value":"2","label":"Kontrak/Sewa"},{"value":"3","label":"Bebas Sewa"},{"value":"4","label":"Lainnya"}]', 1),
(2, 'Luas Lantai Bangunan (m²)',     'number', TRUE, NULL, 2),
(2, 'Jenis Lantai Terluas',           'select', TRUE,
  '[{"value":"1","label":"Keramik/Ubin"},{"value":"2","label":"Semen/Plester"},{"value":"3","label":"Kayu/Papan"},{"value":"4","label":"Tanah"}]', 3),
(2, 'Jenis Dinding Terluas',          'select', TRUE,
  '[{"value":"1","label":"Tembok"},{"value":"2","label":"Semi Tembok"},{"value":"3","label":"Kayu/Papan"},{"value":"4","label":"Bambu/Lainnya"}]', 4);

-- Blok III (blok_id=3): Anggota RT
INSERT INTO form_question (blok_id, label, type, required, options, validation, skip_logic, sort_order) VALUES
(3, 'Nama Kepala Rumah Tangga',       'text',   TRUE,  NULL, NULL, NULL, 1),
(3, 'Hubungan dengan KRT',            'select', TRUE,
  '[{"value":"1","label":"Kepala Rumah Tangga"},{"value":"2","label":"Istri/Suami"},{"value":"3","label":"Anak"},{"value":"4","label":"Lainnya"}]',
  NULL, NULL, 2),
(3, 'Jenis Kelamin',                  'radio',  TRUE,
  '[{"value":"1","label":"Laki-laki"},{"value":"2","label":"Perempuan"}]',
  NULL, NULL, 3),
(3, 'Umur (tahun)',                   'number', TRUE,  NULL, 'range: 0-120', NULL, 4),
(3, 'Status Perkawinan',              'radio',  TRUE,
  '[{"value":"1","label":"Belum Kawin"},{"value":"2","label":"Kawin"},{"value":"3","label":"Cerai Hidup"},{"value":"4","label":"Cerai Mati"}]',
  NULL, NULL, 5),
(3, 'Pendidikan Tertinggi',           'select', TRUE,
  '[{"value":"1","label":"Tidak Sekolah"},{"value":"2","label":"SD"},{"value":"3","label":"SMP"},{"value":"4","label":"SMA"},{"value":"5","label":"Diploma/S1"}]',
  NULL, NULL, 6),
(3, 'Bekerja seminggu terakhir?',     'radio',  TRUE,
  '[{"value":"1","label":"Ya"},{"value":"2","label":"Tidak"}]',
  NULL, NULL, 7),
(3, 'Lapangan Usaha Utama',           'text',   FALSE, NULL, NULL, 'Aktif jika r307 = 1 (Ya)', 8);

-- Blok IV (blok_id=4): Sosial Ekonomi
INSERT INTO form_question (blok_id, label, type, required, options, sort_order) VALUES
(4, 'Sumber Penerangan Utama',        'select', TRUE,
  '[{"value":"1","label":"Listrik PLN"},{"value":"2","label":"Listrik Non-PLN"},{"value":"3","label":"Bukan Listrik"}]', 1),
(4, 'Bahan Bakar Masak Utama',        'select', TRUE,
  '[{"value":"1","label":"Gas/Elpiji"},{"value":"2","label":"Minyak Tanah"},{"value":"3","label":"Kayu Bakar"},{"value":"4","label":"Lainnya"}]', 2),
(4, 'Sumber Air Minum Utama',         'select', TRUE,
  '[{"value":"1","label":"Air Kemasan/Isi Ulang"},{"value":"2","label":"Ledeng/PAM"},{"value":"3","label":"Sumur"},{"value":"4","label":"Lainnya"}]', 3);

-- Blok V (blok_id=5): Kepemilikan Aset
INSERT INTO form_question (blok_id, label, type, required, options, sort_order) VALUES
(5, 'Tabungan/Emas',                  'radio', TRUE,
  '[{"value":"1","label":"Ya"},{"value":"2","label":"Tidak"}]', 1),
(5, 'Sepeda Motor',                   'radio', TRUE,
  '[{"value":"1","label":"Ya"},{"value":"2","label":"Tidak"}]', 2),
(5, 'Laptop/Komputer',                'radio', TRUE,
  '[{"value":"1","label":"Ya"},{"value":"2","label":"Tidak"}]', 3),
(5, 'HP Aktif',                       'radio', TRUE,
  '[{"value":"1","label":"Ya"},{"value":"2","label":"Tidak"}]', 4);

-- =============================================
-- 9. DOKUMEN — Header dokumen RT
-- =============================================
-- Desa Cantik 2026: Budi Santoso (petugas_id=1, kegiatan_id=1)
INSERT INTO dokumen (kode, kegiatan_id, petugas_id, krt, alamat, kecamatan, desa, sls, sub_sls, status, review_status, flag, is_prelist, sync) VALUES
('RT-001', 1, 1, 'Ahmad Subagyo',   'Jl. Melati No. 12',   'Sesayap', 'Tideng Pale', 'SLS 01 Tideng Pale', 'RT 01 A Tideng Pale', 'terkirim',  'approved', 0, TRUE,  TRUE),
('RT-002', 1, 1, 'Slamet Widodo',   'Jl. Mangga No. 5',    'Sesayap', 'Tideng Pale', 'SLS 01 Tideng Pale', NULL,                  'tersimpan', 'draft',    0, FALSE, FALSE),
('RT-003', 1, 1, 'Ika Wahyuni',     'Jl. Rambutan No. 8',  'Sesayap', 'Tideng Pale', 'SLS 01 Tideng Pale', NULL,                  'draft',     'draft',    0, FALSE, FALSE);

-- Pendataan PLS 2026: Budi Santoso (petugas_id=1, kegiatan_id=3)
INSERT INTO dokumen (kode, kegiatan_id, petugas_id, krt, alamat, kecamatan, desa, sls, sub_sls, status, review_status, flag, is_prelist, sync) VALUES
('RT-004', 3, 1, 'Bambang Susilo',  'Jl. Durian No. 3',    'Sesayap', 'Tideng Pale', 'SLS 01 Tideng Pale', NULL, 'draft',     'rejected', 0, FALSE, FALSE),
('RT-005', 3, 1, 'Nurhayati',       'Jl. Nangka No. 15',   'Sesayap', 'Tideng Pale', 'SLS 01 Tideng Pale', NULL, 'tersimpan', 'draft',    0, FALSE, FALSE),
('RT-006', 3, 1, 'Sugeng Riyadi',   'Jl. Dahlia No. 10',   'Sesayap', 'Tideng Pale', 'SLS 01 Tideng Pale', NULL, 'terkirim',  'draft',    0, FALSE, TRUE);

-- Response-style documents (for admin data review)
INSERT INTO dokumen (kode, kegiatan_id, petugas_id, krt, alamat, kecamatan, desa, sls, sub_sls, status, review_status, flag, is_prelist, sync) VALUES
('R-0231', 1, 1, 'Ahmad Subagyo',   NULL, NULL, 'Tideng Pale',    'SLS 01 Tideng Pale',    'RT 01 A Tideng Pale', 'terkirim', 'draft',        2, TRUE,  TRUE),
('R-0232', 1, 2, 'Joko Widodo',     NULL, NULL, 'Tideng Pale',    'SLS 01 Tideng Pale',    'RT 01 B Tideng Pale', 'terkirim', 'approved',     0, TRUE,  TRUE),
('R-0233', 1, 3, 'Sri Wahyuni',     NULL, NULL, 'Limbu Sedulun',  'SLS 01 Limbu Sedulun',  NULL,                  'terkirim', 'approved',     5, TRUE,  TRUE),
('R-0234', 1, 4, 'Mulyono',         NULL, NULL, 'Tideng Pale',    'SLS 02 Tideng Pale',    NULL,                  'terkirim', 'draft',        1, FALSE, TRUE),
('R-0235', 1, 5, 'Slamet Riyadi',   NULL, NULL, 'Sesayap Hilir',  'SLS 01 Sesayap Hilir',  NULL,                  'terkirim', 'draft',        0, TRUE,  TRUE),
('R-0236', 1, 1, 'Budi Prasetya',   NULL, NULL, 'Tideng Pale',    'SLS 01 Tideng Pale',    'RT 01 A Tideng Pale', 'terkirim', 'draft',        0, TRUE,  TRUE),
('R-0237', 1, 2, 'Wati Susanti',    NULL, NULL, 'Tideng Pale',    'SLS 02 Tideng Pale',    NULL,                  'terkirim', 'approved',     1, FALSE, TRUE),
('R-0238', 1, 3, 'Agung Nugroho',   NULL, NULL, 'Limbu Sedulun',  'SLS 02 Limbu Sedulun',  NULL,                  'terkirim', 'approved',     0, FALSE, TRUE);

-- =============================================
-- 10. DOKUMEN_JAWABAN — Jawaban untuk RT-001 (Ahmad Subagyo)
-- =============================================
-- Asumsi question IDs: Blok I = 1-6, Blok II = 7-10, Blok III = 11-18, Blok IV = 19-21, Blok V = 22-25
INSERT INTO dokumen_jawaban (dokumen_id, question_id, value) VALUES
-- RT-001: Blok I
(1, 1, 'Kalimantan Utara'), (1, 2, 'Tana Tidung'), (1, 3, 'Sesayap'), (1, 4, 'Tideng Pale'),
(1, 5, 'SLS 01 Tideng Pale'), (1, 6, 'Jl. Melati No. 12'),
-- RT-001: Blok II
(1, 7, '1'), (1, 8, '80'), (1, 9, '1'), (1, 10, '1'),
-- RT-001: Blok III
(1, 11, 'Ahmad Subagyo'), (1, 12, '1'), (1, 13, '1'), (1, 14, '45'), (1, 15, '2'), (1, 16, '4'), (1, 17, '1'), (1, 18, 'Pertanian'),
-- RT-001: Blok IV
(1, 19, '1'), (1, 20, '1'), (1, 21, '1'),
-- RT-001: Blok V
(1, 22, '1'), (1, 23, '1'), (1, 24, '2'), (1, 25, '1');

-- RT-002: Slamet Widodo
INSERT INTO dokumen_jawaban (dokumen_id, question_id, value) VALUES
(2, 1, 'Kalimantan Utara'), (2, 2, 'Tana Tidung'), (2, 3, 'Sesayap'), (2, 4, 'Tideng Pale'),
(2, 5, 'SLS 01 Tideng Pale'), (2, 6, 'Jl. Mangga No. 5'),
(2, 7, '1'), (2, 8, '60'), (2, 9, '1'), (2, 10, '1'),
(2, 11, 'Slamet Widodo'), (2, 12, '1'), (2, 13, '1'), (2, 14, '38'), (2, 15, '2'), (2, 16, '4'), (2, 17, '1'), (2, 18, 'Perdagangan'),
(2, 19, '1'), (2, 20, '1'), (2, 21, '2'),
(2, 22, '2'), (2, 23, '1'), (2, 24, '2'), (2, 25, '1');

-- RT-003: Ika Wahyuni (draft, partial answers)
INSERT INTO dokumen_jawaban (dokumen_id, question_id, value) VALUES
(3, 1, 'Kalimantan Utara'), (3, 2, 'Tana Tidung'), (3, 3, 'Sesayap'), (3, 4, 'Tideng Pale'),
(3, 11, 'Ika Wahyuni'), (3, 13, '2'), (3, 14, '32'), (3, 15, '1'), (3, 17, '2');

-- RT-004: Bambang Susilo (rejected)
INSERT INTO dokumen_jawaban (dokumen_id, question_id, value) VALUES
(4, 1, 'Kalimantan Utara'), (4, 2, 'Tana Tidung'), (4, 3, 'Sesayap'), (4, 4, 'Tideng Pale'),
(4, 5, 'SLS 01 Tideng Pale'), (4, 6, 'Jl. Durian No. 3'),
(4, 7, '1'), (4, 8, '100'), (4, 9, '1'), (4, 10, '1'),
(4, 11, 'Bambang Susilo'), (4, 12, '1'), (4, 13, '1'), (4, 14, '50'), (4, 15, '2'), (4, 16, '4'), (4, 17, '1'), (4, 18, 'Jasa Kebersihan'),
(4, 19, '1'), (4, 20, '2'), (4, 21, '1'),
(4, 22, '1'), (4, 23, '1'), (4, 24, '1'), (4, 25, '1');

-- RT-005: Nurhayati
INSERT INTO dokumen_jawaban (dokumen_id, question_id, value) VALUES
(5, 1, 'Kalimantan Utara'), (5, 2, 'Tana Tidung'), (5, 3, 'Sesayap'), (5, 4, 'Tideng Pale'),
(5, 5, 'SLS 01 Tideng Pale'), (5, 6, 'Jl. Nangka No. 15'),
(5, 7, '1'), (5, 8, '45'), (5, 9, '1'), (5, 10, '1'),
(5, 11, 'Nurhayati'), (5, 12, '1'), (5, 13, '2'), (5, 14, '28'), (5, 15, '3'), (5, 16, '4'), (5, 17, '2'), (5, 18, ''),
(5, 19, '1'), (5, 20, '1'), (5, 21, '1'),
(5, 22, '1'), (5, 23, '1'), (5, 24, '2'), (5, 25, '1');

-- RT-006: Sugeng Riyadi
INSERT INTO dokumen_jawaban (dokumen_id, question_id, value) VALUES
(6, 1, 'Kalimantan Utara'), (6, 2, 'Tana Tidung'), (6, 3, 'Sesayap'), (6, 4, 'Tideng Pale'),
(6, 5, 'SLS 01 Tideng Pale'), (6, 6, 'Jl. Dahlia No. 10'),
(6, 7, '1'), (6, 8, '70'), (6, 9, '1'), (6, 10, '1'),
(6, 11, 'Sugeng Riyadi'), (6, 12, '1'), (6, 13, '1'), (6, 14, '42'), (6, 15, '2'), (6, 16, '4'), (6, 17, '1'), (6, 18, 'Pertanian'),
(6, 19, '1'), (6, 20, '1'), (6, 21, '1'),
(6, 22, '1'), (6, 23, '1'), (6, 24, '2'), (6, 25, '1');

-- =============================================
-- 11. DOKUMEN_LOG — Activity logs
-- =============================================
-- RT-001 logs
INSERT INTO dokumen_log (dokumen_id, message, created_at) VALUES
(1, 'Kuesioner dibuat (Draft)',                                      '2026-06-04 08:12:00'),
(1, 'Kuesioner disimpan oleh PCL',                                   '2026-06-04 09:30:00'),
(1, 'Dokumen dikirim ke server (Terkirim)',                           '2026-06-04 10:00:00'),
(1, 'Dokumen disetujui (Approved) oleh PML (Siti Rahayu)',           '2026-06-04 14:15:00');

-- RT-002 logs
INSERT INTO dokumen_log (dokumen_id, message, created_at) VALUES
(2, 'Kuesioner dibuat (Draft)',                '2026-06-04 11:20:00'),
(2, 'Kuesioner disimpan oleh PCL (Tersimpan)', '2026-06-04 11:45:00');

-- RT-003 logs
INSERT INTO dokumen_log (dokumen_id, message, created_at) VALUES
(3, 'Kuesioner dibuat (Draft)', '2026-06-05 08:00:00');

-- RT-004 logs
INSERT INTO dokumen_log (dokumen_id, message, created_at) VALUES
(4, 'Kuesioner dibuat (Draft)',                                                                        '2026-06-03 09:00:00'),
(4, 'Kuesioner disimpan oleh PCL (Tersimpan)',                                                          '2026-06-03 10:30:00'),
(4, 'Dokumen dikirim ke server (Terkirim)',                                                              '2026-06-03 11:00:00'),
(4, 'Ditolak (Rejected) oleh PML (Agus Prasetyo): Keterangan Umur tidak sesuai dengan Jenis Dinding Bangunan yang tergolong mewah (Mohon cek ulang Blok II & Blok III).', '2026-06-03 15:45:00');

-- RT-005 logs
INSERT INTO dokumen_log (dokumen_id, message, created_at) VALUES
(5, 'Kuesioner dibuat (Draft)',                '2026-06-05 08:22:00'),
(5, 'Kuesioner disimpan oleh PCL (Tersimpan)', '2026-06-05 08:45:00');

-- RT-006 logs
INSERT INTO dokumen_log (dokumen_id, message, created_at) VALUES
(6, 'Kuesioner dibuat (Draft)',                '2026-06-04 14:00:00'),
(6, 'Kuesioner disimpan oleh PCL (Tersimpan)', '2026-06-04 15:30:00'),
(6, 'Dokumen dikirim ke server (Terkirim)',     '2026-06-04 16:00:00');
