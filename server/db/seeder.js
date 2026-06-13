/**
 * @module server/db/seeder
 * Script untuk setup database: membuat tabel dan seed data awal.
 * Menggunakan Prisma Client agar kompatibel dengan PostgreSQL cloud.
 *
 * Cara menjalankan:
 *   node db/seeder.js
 */

import { readFileSync } from 'fs';
import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';

async function seed() {
  try {
    console.log('⏳ Starting database seeding...');

    // ── 1. Clear existing data with Prisma deleteMany ──
    console.log('🧹 Clearing existing data...');
    await prisma.dokumenLog.deleteMany();
    await prisma.dokumenJawaban.deleteMany();
    await prisma.dokumen.deleteMany();
    await prisma.formQuestion.deleteMany();
    await prisma.formBlok.deleteMany();
    await prisma.desaKegiatan.deleteMany();
    await prisma.wilayah.deleteMany();
    await prisma.petugasKegiatan.deleteMany();
    await prisma.kegiatan.deleteMany();
    await prisma.petugas.deleteMany();
    await prisma.admin.deleteMany();
    console.log('✅ Tables cleared via deleteMany');

    // ── 2. Hash passwords ──
    const adminHash = await bcrypt.hash('admin123', 10);
    const petugasHash = await bcrypt.hash('petugas123', 10);
    console.log('🔑 Passwords hashed');

    // ── 3. Insert Admin ──
    await prisma.admin.create({
      data: {
        id: 1,
        username: 'admin',
        password: adminHash,
        nama: 'Administrator BPS'
      }
    });
    console.log('👥 Admin seeded');

    // ── 4. Insert Petugas ──
    const petugasList = [
      { id: 1, username: 'budi.santoso',  name: 'Budi Santoso',  nik: '327101010101000001', phone: '0812-7890-1234', desa: 'Tideng Pale',   target: 15, selesai: 12, status: 'active' },
      { id: 2, username: 'siti.rahayu',   name: 'Siti Rahayu',   nik: '327101010101000002', phone: '0856-1234-5678', desa: 'Tideng Pale',   target: 12, selesai: 12, status: 'done' },
      { id: 3, username: 'agus.prasetyo', name: 'Agus Prasetyo', nik: '327101010101000003', phone: '0813-9876-5432', desa: 'Limbu Sedulun', target: 18, selesai: 7,  status: 'active' },
      { id: 4, username: 'dewi.lestari',  name: 'Dewi Lestari',  nik: '327101010101000004', phone: '0878-5555-1234', desa: 'Tideng Pale',   target: 15, selesai: 9,  status: 'active' },
      { id: 5, username: 'rudi.hermawan', name: 'Rudi Hermawan', nik: '327101010101000005', phone: '0821-4444-9876', desa: 'Sesayap Hilir', target: 12, selesai: 3,  status: 'active' }
    ];

    for (const p of petugasList) {
      const hoursBack = Math.floor(Math.random() * 8) + 1;
      const lastSyncDate = new Date();
      lastSyncDate.setHours(lastSyncDate.getHours() - hoursBack);

      await prisma.petugas.create({
        data: {
          id: p.id,
          username: p.username,
          password: petugasHash,
          name: p.name,
          nik: p.nik,
          phone: p.phone,
          desa: p.desa,
          target: p.target,
          selesai: p.selesai,
          last_sync: lastSyncDate,
          status: p.status
        }
      });
    }
    console.log('📋 Petugas seeded (5 records)');

    // ── 5. Insert Kegiatan ──
    const kegiatanList = [
      {
        id: 1,
        name: 'Desa Cantik 2026',
        description: 'Pembinaan statistik sektoral untuk desa/kelurahan berkinerja tinggi.',
        progress: 68,
        color: 'bg-blue-600',
        text_color: 'text-blue-600',
        bg_color: 'bg-blue-50',
        start_date: new Date('2026-05-15'),
        status: 'published',
        lokus: { kecamatan: ["Sesayap", "Sesayap Hilir"], desa: ["Tideng Pale", "Sesayap Hilir"], sls: ["SLS 01 Tideng Pale", "SLS 02 Tideng Pale", "SLS 01 Sesayap Hilir"], subSls: ["RT 01 A Tideng Pale", "RT 01 B Tideng Pale"] }
      },
      {
        id: 2,
        name: 'Survei Ekonomi 2026',
        description: 'Survei komprehensif pelaku usaha mikro, kecil, dan menengah nasional.',
        progress: 54,
        color: 'bg-purple-600',
        text_color: 'text-purple-600',
        bg_color: 'bg-purple-50',
        start_date: new Date('2026-06-01'),
        status: 'published',
        lokus: { kecamatan: ["Sesayap"], desa: ["Limbu Sedulun"], sls: ["SLS 01 Limbu Sedulun", "SLS 02 Limbu Sedulun"], subSls: [] }
      },
      {
        id: 3,
        name: 'Pendataan PLS 2026',
        description: 'Pendataan potensi lokal dan sosial ekonomi tingkat wilayah terkecil.',
        progress: 75,
        color: 'bg-emerald-600',
        text_color: 'text-emerald-600',
        bg_color: 'bg-emerald-50',
        start_date: new Date('2026-04-10'),
        status: 'published',
        lokus: { kecamatan: ["Tana Lia"], desa: ["Tanah Merah"], sls: ["SLS 01 Tanah Merah"], subSls: [] }
      },
      {
        id: 4,
        name: 'Survei Demografi 2026',
        description: 'Pengumpulan parameter kependudukan, fertilitas, dan mortalitas daerah.',
        progress: 0,
        color: 'bg-amber-600',
        text_color: 'text-amber-600',
        bg_color: 'bg-amber-50',
        start_date: new Date('2026-07-20'),
        status: 'draft',
        lokus: { kecamatan: [], desa: [], sls: [], subSls: [] }
      }
    ];

    for (const k of kegiatanList) {
      await prisma.kegiatan.create({
        data: k
      });
    }
    console.log('📅 Kegiatan seeded (4 records)');

    // ── 6. Insert Petugas-Kegiatan ──
    const pkList = [
      { id: 1, petugas_id: 1, kegiatan_id: 1, role: 'PCL', sls_assignments: ["SLS 01 Tideng Pale", "RT 01 A Tideng Pale"], pengawas: 'Siti Rahayu' },
      { id: 2, petugas_id: 1, kegiatan_id: 3, role: 'PML', sls_assignments: ["SLS 01 Tanah Merah"], pengawas: 'Agus Prasetyo' },
      { id: 3, petugas_id: 2, kegiatan_id: 1, role: 'PML', sls_assignments: null, pengawas: null },
      { id: 4, petugas_id: 2, kegiatan_id: 2, role: 'PML', sls_assignments: null, pengawas: null },
      { id: 5, petugas_id: 3, kegiatan_id: 1, role: 'PCL', sls_assignments: ["SLS 02 Tideng Pale"], pengawas: 'Siti Rahayu' },
      { id: 6, petugas_id: 3, kegiatan_id: 3, role: 'PML', sls_assignments: null, pengawas: null },
      { id: 7, petugas_id: 4, kegiatan_id: 2, role: 'PML', sls_assignments: null, pengawas: null },
      { id: 8, petugas_id: 5, kegiatan_id: 2, role: 'PCL', sls_assignments: ["SLS 01 Limbu Sedulun"], pengawas: 'Dewi Lestari' },
      { id: 9, petugas_id: 5, kegiatan_id: 1, role: 'PCL', sls_assignments: ["SLS 01 Sesayap Hilir"], pengawas: 'Siti Rahayu' }
    ];

    for (const pk of pkList) {
      await prisma.petugasKegiatan.create({
        data: pk
      });
    }
    console.log('📌 Petugas-Kegiatan seeded (9 records)');

    // ── 7. Insert Wilayah ──
    const wilayahList = JSON.parse(
      readFileSync(new URL('./wilayah_data.json', import.meta.url), 'utf8')
    );

    await prisma.wilayah.createMany({
      data: wilayahList
    });
    console.log('🗺️ Wilayah seeded (27 records)');

    // ── 8. Insert Desa-Kegiatan Stats ──
    const dkList = [
      { id: 1, kegiatan_id: 1, desa: 'Tideng Pale', target: 30, selesai: 24, color: '#2563eb' },
      { id: 2, kegiatan_id: 1, desa: 'Sesayap Hilir', target: 24, selesai: 15, color: '#0891b2' },
      { id: 3, kegiatan_id: 2, desa: 'Limbu Sedulun', target: 36, selesai: 19, color: '#7c3aed' },
      { id: 4, kegiatan_id: 3, desa: 'Tanah Merah', target: 20, selesai: 15, color: '#10b981' }
    ];

    for (const dk of dkList) {
      await prisma.desaKegiatan.create({
        data: dk
      });
    }
    console.log('📊 Desa-Kegiatan seeded (4 records)');

    // ── 9. Insert Form Blok (Desa Cantik 2026, kegiatan_id=1) ──
    const bloks = [
      { id: 1, kegiatan_id: 1, kode: 'Blok I',   title: 'Keterangan Tempat Tinggal', sort_order: 1 },
      { id: 2, kegiatan_id: 1, kode: 'Blok II',  title: 'Keterangan Perumahan', sort_order: 2 },
      { id: 3, kegiatan_id: 1, kode: 'Blok III', title: 'Keterangan Anggota RT', sort_order: 3 },
      { id: 4, kegiatan_id: 1, kode: 'Blok IV',  title: 'Keterangan Sosial Ekonomi', sort_order: 4 },
      { id: 5, kegiatan_id: 1, kode: 'Blok V',   title: 'Keterangan Kepemilikan Aset', sort_order: 5 }
    ];

    for (const b of bloks) {
      await prisma.formBlok.create({
        data: b
      });
    }
    console.log('📦 Form Blok seeded (5 records)');

    // ── 10. Insert Form Questions ──
    // Blok I (blok_id=1): Lokasi
    const q_blok1 = [
      { id: 1, blok_id: 1, parent_id: null, label: 'Provinsi', type: 'text', required: true, options: null, validation: null, skip_logic: null, skip_target: null, sort_order: 1 },
      { id: 2, blok_id: 1, parent_id: null, label: 'Kabupaten / Kota', type: 'text', required: true, options: null, validation: null, skip_logic: null, skip_target: null, sort_order: 2 },
      { id: 3, blok_id: 1, parent_id: null, label: 'Kecamatan', type: 'text', required: true, options: null, validation: null, skip_logic: null, skip_target: null, sort_order: 3 },
      { id: 4, blok_id: 1, parent_id: null, label: 'Desa / Kelurahan', type: 'text', required: true, options: null, validation: null, skip_logic: null, skip_target: null, sort_order: 4 },
      { id: 5, blok_id: 1, parent_id: null, label: 'Satuan Lingkungan Setempat (SLS) / RT', type: 'text', required: false, options: null, validation: null, skip_logic: null, skip_target: null, sort_order: 5 },
      { id: 6, blok_id: 1, parent_id: null, label: 'Alamat / Jalan', type: 'text', required: false, options: null, validation: null, skip_logic: null, skip_target: null, sort_order: 6 }
    ];
    // Blok II (blok_id=2): Perumahan
    const q_blok2 = [
      { id: 7, blok_id: 2, parent_id: null, label: 'Status Kepemilikan Bangunan Tempat Tinggal', type: 'select', required: true, options: [{value:"1",label:"Milik Sendiri"},{value:"2",label:"Kontrak/Sewa"},{value:"3",label:"Bebas Sewa"},{value:"4",label:"Lainnya"}], validation: null, skip_logic: null, skip_target: null, sort_order: 1 },
      { id: 8, blok_id: 2, parent_id: null, label: 'Luas Lantai Bangunan (m²)', type: 'number', required: true, options: null, validation: null, skip_logic: null, skip_target: null, sort_order: 2 },
      { id: 9, blok_id: 2, parent_id: null, label: 'Jenis Lantai Terluas', type: 'select', required: true, options: [{value:"1",label:"Keramik/Ubin"},{value:"2",label:"Semen/Plester"},{value:"3",label:"Kayu/Papan"},{value:"4",label:"Tanah"}], validation: null, skip_logic: null, skip_target: null, sort_order: 3 },
      { id: 10, blok_id: 2, parent_id: null, label: 'Jenis Dinding Terluas', type: 'select', required: true, options: [{value:"1",label:"Tembok"},{value:"2",label:"Semi Tembok"},{value:"3",label:"Kayu/Papan"},{value:"4",label:"Bambu/Lainnya"}], validation: null, skip_logic: null, skip_target: null, sort_order: 4 }
    ];
    // Blok III (blok_id=3): Anggota RT
    const q_blok3 = [
      { id: 11, blok_id: 3, parent_id: null, label: 'Nama Kepala Rumah Tangga', type: 'text', required: true, options: null, validation: null, skip_logic: null, skip_target: null, sort_order: 1 },
      { id: 12, blok_id: 3, parent_id: null, label: 'Hubungan dengan KRT', type: 'select', required: true, options: [{value:"1",label:"Kepala Rumah Tangga"},{value:"2",label:"Istri/Suami"},{value:"3",label:"Anak"},{value:"4",label:"Lainnya"}], validation: null, skip_logic: null, skip_target: null, sort_order: 2 },
      { id: 13, blok_id: 3, parent_id: null, label: 'Jenis Kelamin', type: 'radio', required: true, options: [{value:"1",label:"Laki-laki"},{value:"2",label:"Perempuan"}], validation: null, skip_logic: null, skip_target: null, sort_order: 3 },
      { id: 14, blok_id: 3, parent_id: null, label: 'Umur (tahun)', type: 'number', required: true, options: null, validation: 'range: 0-120', skip_logic: null, skip_target: null, sort_order: 4 },
      { id: 15, blok_id: 3, parent_id: null, label: 'Status Perkawinan', type: 'radio', required: true, options: [{value:"1",label:"Belum Kawin"},{value:"2",label:"Kawin"},{value:"3",label:"Cerai Hidup"},{value:"4",label:"Cerai Mati"}], validation: null, skip_logic: null, skip_target: null, sort_order: 5 },
      { id: 16, blok_id: 3, parent_id: null, label: 'Pendidikan Tertinggi', type: 'select', required: true, options: [{value:"1",label:"Tidak Sekolah"},{value:"2",label:"SD"},{value:"3",label:"SMP"},{value:"4",label:"SMA"},{value:"5",label:"Diploma/S1"}], validation: null, skip_logic: null, skip_target: null, sort_order: 6 },
      { id: 17, blok_id: 3, parent_id: null, label: 'Bekerja seminggu terakhir?', type: 'radio', required: true, options: [{value:"1",label:"Ya"},{value:"2",label:"Tidak"}], validation: null, skip_logic: null, skip_target: 18, sort_order: 7 },
      { id: 18, blok_id: 3, parent_id: null, label: 'Lapangan Usaha Utama', type: 'text', required: false, options: null, validation: null, skip_logic: 'Aktif jika r307 = 1 (Ya)', skip_target: null, sort_order: 8 }
    ];
    // Blok IV (blok_id=4): Sosial Ekonomi
    const q_blok4 = [
      { id: 19, blok_id: 4, parent_id: null, label: 'Sumber Penerangan Utama', type: 'select', required: true, options: [{value:"1",label:"Listrik PLN"},{value:"2",label:"Listrik Non-PLN"},{value:"3",label:"Bukan Listrik"}], validation: null, skip_logic: null, skip_target: null, sort_order: 1 },
      { id: 20, blok_id: 4, parent_id: null, label: 'Bahan Bakar Masak Utama', type: 'select', required: true, options: [{value:"1",label:"Gas/Elpiji"},{value:"2",label:"Minyak Tanah"},{value:"3",label:"Kayu Bakar"},{value:"4",label:"Lainnya"}], validation: null, skip_logic: null, skip_target: null, sort_order: 2 },
      { id: 21, blok_id: 4, parent_id: null, label: 'Sumber Air Minum Utama', type: 'select', required: true, options: [{value:"1",label:"Air Kemasan/Isi Ulang"},{value:"2",label:"Ledeng/PAM"},{value:"3",label:"Sumur"},{value:"4",label:"Lainnya"}], validation: null, skip_logic: null, skip_target: null, sort_order: 3 }
    ];
    // Blok V (blok_id=5): Kepemilikan Aset
    const q_blok5 = [
      { id: 22, blok_id: 5, parent_id: null, label: 'Tabungan/Emas', type: 'radio', required: true, options: [{value:"1",label:"Ya"},{value:"2",label:"Tidak"}], validation: null, skip_logic: null, skip_target: null, sort_order: 1 },
      { id: 23, blok_id: 5, parent_id: null, label: 'Sepeda Motor', type: 'radio', required: true, options: [{value:"1",label:"Ya"},{value:"2",label:"Tidak"}], validation: null, skip_logic: null, skip_target: null, sort_order: 2 },
      { id: 24, blok_id: 5, parent_id: null, label: 'Laptop/Komputer', type: 'radio', required: true, options: [{value:"1",label:"Ya"},{value:"2",label:"Tidak"}], validation: null, skip_logic: null, skip_target: null, sort_order: 3 },
      { id: 25, blok_id: 5, parent_id: null, label: 'HP Aktif', type: 'radio', required: true, options: [{value:"1",label:"Ya"},{value:"2",label:"Tidak"}], validation: null, skip_logic: null, skip_target: null, sort_order: 4 }
    ];

    const allQs = [...q_blok1, ...q_blok2, ...q_blok3, ...q_blok4, ...q_blok5];
    for (const q of allQs) {
      await prisma.formQuestion.create({
        data: q
      });
    }
    console.log('❓ Form Questions seeded (25 records)');

    // ── 11. Insert Dokumen ──
    const dokumenList = [
      { id: 1, kode: 'RT-001', kegiatan_id: 1, petugas_id: 1, krt: 'Ahmad Subagyo',  alamat: 'Jl. Melati No. 12',  kecamatan: 'Sesayap', desa: 'Tideng Pale', sls: 'SLS 01 Tideng Pale', sub_sls: 'RT 01 A Tideng Pale', status: 'terkirim',  review_status: 'approved', flag: 0, is_prelist: true, sync: true },
      { id: 2, kode: 'RT-002', kegiatan_id: 1, petugas_id: 1, krt: 'Slamet Widodo',  alamat: 'Jl. Mangga No. 5',   kecamatan: 'Sesayap', desa: 'Tideng Pale', sls: 'SLS 01 Tideng Pale', sub_sls: null,                   status: 'tersimpan', review_status: 'draft',    flag: 0, is_prelist: false, sync: false },
      { id: 3, kode: 'RT-003', kegiatan_id: 1, petugas_id: 1, krt: 'Ika Wahyuni',    alamat: 'Jl. Rambutan No. 8', kecamatan: 'Sesayap', desa: 'Tideng Pale', sls: 'SLS 01 Tideng Pale', sub_sls: null,                   status: 'draft',     review_status: 'draft',    flag: 0, is_prelist: false, sync: false },
      { id: 4, kode: 'RT-004', kegiatan_id: 1, petugas_id: 3, krt: 'Bambang Susilo', alamat: 'Jl. Durian No. 3',   kecamatan: 'Sesayap', desa: 'Tideng Pale', sls: 'SLS 01 Tideng Pale', sub_sls: null,                   status: 'draft',     review_status: 'rejected', flag: 0, is_prelist: false, sync: false },
      { id: 5, kode: 'RT-005', kegiatan_id: 1, petugas_id: 3, krt: 'Nurhayati',      alamat: 'Jl. Nangka No. 15',  kecamatan: 'Sesayap', desa: 'Tideng Pale', sls: 'SLS 01 Tideng Pale', sub_sls: null,                   status: 'tersimpan', review_status: 'draft',    flag: 0, is_prelist: false, sync: false },
      { id: 6, kode: 'RT-006', kegiatan_id: 1, petugas_id: 3, krt: 'Sugeng Riyadi',  alamat: 'Jl. Dahlia No. 10',  kecamatan: 'Sesayap', desa: 'Tideng Pale', sls: 'SLS 01 Tideng Pale', sub_sls: null,                   status: 'terkirim',  review_status: 'draft',    flag: 0, is_prelist: false, sync: true }
    ];
    for (const d of dokumenList) {
      await prisma.dokumen.create({
        data: d
      });
    }
    console.log('📄 Dokumen seeded (6 records)');

    // ── 12. Insert Dokumen Jawaban ──
    const j1 = [
      [1,1,'Kalimantan Utara'],[1,2,'Tana Tidung'],[1,3,'Sesayap'],[1,4,'Tideng Pale'],[1,5,'SLS 01 Tideng Pale'],[1,6,'Jl. Melati No. 12'],
      [1,7,'1'],[1,8,'80'],[1,9,'1'],[1,10,'1'],
      [1,11,'Ahmad Subagyo'],[1,12,'1'],[1,13,'1'],[1,14,'45'],[1,15,'2'],[1,16,'4'],[1,17,'1'],[1,18,'Pertanian'],
      [1,19,'1'],[1,20,'1'],[1,21,'1'],
      [1,22,'1'],[1,23,'1'],[1,24,'2'],[1,25,'1']
    ];
    const j2 = [
      [2,1,'Kalimantan Utara'],[2,2,'Tana Tidung'],[2,3,'Sesayap'],[2,4,'Tideng Pale'],[2,5,'SLS 01 Tideng Pale'],[2,6,'Jl. Mangga No. 5'],
      [2,7,'1'],[2,8,'60'],[2,9,'1'],[2,10,'1'],
      [2,11,'Slamet Widodo'],[2,12,'1'],[2,13,'1'],[2,14,'38'],[2,15,'2'],[2,16,'4'],[2,17,'1'],[2,18,'Perdagangan'],
      [2,19,'1'],[2,20,'1'],[2,21,'2'],
      [2,22,'2'],[2,23,'1'],[2,24,'2'],[2,25,'1']
    ];
    const j3 = [
      [3,1,'Kalimantan Utara'],[3,2,'Tana Tidung'],[3,3,'Sesayap'],[3,4,'Tideng Pale'],
      [3,11,'Ika Wahyuni'],[3,13,'2'],[3,14,'32'],[3,15,'1'],[3,17,'2']
    ];
    const j4 = [
      [4,1,'Kalimantan Utara'],[4,2,'Tana Tidung'],[4,3,'Sesayap'],[4,4,'Tideng Pale'],[4,5,'SLS 01 Tideng Pale'],[4,6,'Jl. Durian No. 3'],
      [4,7,'1'],[4,8,'100'],[4,9,'1'],[4,10,'1'],
      [4,11,'Bambang Susilo'],[4,12,'1'],[4,13,'1'],[4,14,'50'],[4,15,'2'],[4,16,'4'],[4,17,'1'],[4,18,'Jasa Kebersihan'],
      [4,19,'1'],[4,20,'2'],[4,21,'1'],
      [4,22,'1'],[4,23,'1'],[4,24,'1'],[4,25,'1']
    ];
    const j5 = [
      [5,1,'Kalimantan Utara'],[5,2,'Tana Tidung'],[5,3,'Sesayap'],[5,4,'Tideng Pale'],[5,5,'SLS 01 Tideng Pale'],[5,6,'Jl. Nangka No. 15'],
      [5,7,'1'],[5,8,'45'],[5,9,'1'],[5,10,'1'],
      [5,11,'Nurhayati'],[5,12,'1'],[5,13,'2'],[5,14,'28'],[5,15,'3'],[5,16,'4'],[5,17,'2'],[5,18,''],
      [5,19,'1'],[5,20,'1'],[5,21,'1'],
      [5,22,'1'],[5,23,'1'],[5,24,'2'],[5,25,'1']
    ];
    const j6 = [
      [6,1,'Kalimantan Utara'],[6,2,'Tana Tidung'],[6,3,'Sesayap'],[6,4,'Tideng Pale'],[6,5,'SLS 01 Tideng Pale'],[6,6,'Jl. Dahlia No. 10'],
      [6,7,'1'],[6,8,'70'],[6,9,'1'],[6,10,'1'],
      [6,11,'Sugeng Riyadi'],[6,12,'1'],[6,13,'1'],[6,14,'42'],[6,15,'2'],[6,16,'4'],[6,17,'1'],[6,18,'Pertanian'],
      [6,19,'1'],[6,20,'1'],[6,21,'1'],
      [6,22,'1'],[6,23,'1'],[6,24,'2'],[6,25,'1']
    ];

    const allJawaban = [...j1, ...j2, ...j3, ...j4, ...j5, ...j6];
    const jData = allJawaban.map((j, idx) => ({
      id: idx + 1,
      dokumen_id: j[0],
      question_id: j[1],
      value: j[2]
    }));

    await prisma.dokumenJawaban.createMany({
      data: jData
    });
    console.log('✍️ Dokumen Jawaban seeded');

    // ── 13. Insert Dokumen Logs ──
    const logs = [
      { id: 1, dokumen_id: 1, message: 'Kuesioner dibuat (Draft)', created_at: new Date('2026-06-04T08:12:00Z') },
      { id: 2, dokumen_id: 1, message: 'Kuesioner disimpan oleh PCL', created_at: new Date('2026-06-04T09:30:00Z') },
      { id: 3, dokumen_id: 1, message: 'Dokumen dikirim ke server (Terkirim)', created_at: new Date('2026-06-04T10:00:00Z') },
      { id: 4, dokumen_id: 1, message: 'Dokumen disetujui (Approved) oleh PML (Siti Rahayu)', created_at: new Date('2026-06-04T14:15:00Z') },
      { id: 5, dokumen_id: 2, message: 'Kuesioner dibuat (Draft)', created_at: new Date('2026-06-04T11:20:00Z') },
      { id: 6, dokumen_id: 2, message: 'Kuesioner disimpan oleh PCL (Tersimpan)', created_at: new Date('2026-06-04T11:45:00Z') },
      { id: 7, dokumen_id: 3, message: 'Kuesioner dibuat (Draft)', created_at: new Date('2026-06-05T08:00:00Z') },
      { id: 8, dokumen_id: 4, message: 'Kuesioner dibuat (Draft)', created_at: new Date('2026-06-03T09:00:00Z') },
      { id: 9, dokumen_id: 4, message: 'Kuesioner disimpan oleh PCL (Tersimpan)', created_at: new Date('2026-06-03T10:30:00Z') },
      { id: 10, dokumen_id: 4, message: 'Dokumen dikirim ke server (Terkirim)', created_at: new Date('2026-06-03T11:00:00Z') },
      { id: 11, dokumen_id: 4, message: 'Ditolak (Rejected) oleh PML (Agus Prasetyo): Keterangan Umur tidak sesuai dengan Jenis Dinding Bangunan yang tergolong mewah (Mohon cek ulang Blok II & Blok III).', created_at: new Date('2026-06-03T15:45:00Z') },
      { id: 12, dokumen_id: 5, message: 'Kuesioner dibuat (Draft)', created_at: new Date('2026-06-05T08:22:00Z') },
      { id: 13, dokumen_id: 5, message: 'Kuesioner disimpan oleh PCL (Tersimpan)', created_at: new Date('2026-06-05T08:45:00Z') },
      { id: 14, dokumen_id: 6, message: 'Kuesioner dibuat (Draft)', created_at: new Date('2026-06-04T14:00:00Z') },
      { id: 15, dokumen_id: 6, message: 'Kuesioner disimpan oleh PCL (Tersimpan)', created_at: new Date('2026-06-04T15:30:00Z') },
      { id: 16, dokumen_id: 6, message: 'Dokumen dikirim ke server (Terkirim)', created_at: new Date('2026-06-04T16:00:00Z') },
    ];
    for (const l of logs) {
      await prisma.dokumenLog.create({
        data: l
      });
    }
    console.log('📝 Dokumen Logs seeded');

    // ── 14. Reset sequences in PostgreSQL for all tables so auto-increment works ──
    console.log('🔄 Resetting PostgreSQL sequences...');
    const tablesToReset = [
      'admin', 'petugas', 'kegiatan', 'petugas_kegiatan', 'wilayah',
      'desa_kegiatan', 'form_blok', 'form_question', 'dokumen',
      'dokumen_jawaban', 'dokumen_log'
    ];
    for (const table of tablesToReset) {
      try {
        await prisma.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE(MAX(id), 1)) FROM "${table}";`
        );
      } catch (err) {
        console.warn(`⚠️ Warning: could not reset sequence for ${table}:`, err.message);
      }
    }
    console.log('✅ Sequences reset completed');

    console.log('\n🎉 Database seeded successfully!');
    console.log('   Admin login:   admin / admin123');
    console.log('   Petugas login:  budi.santoso / petugas123');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed();
