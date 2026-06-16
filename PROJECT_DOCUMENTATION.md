# 🏠 CANTIK — Sistem CAPI BPS Desa Cantik

> **Aplikasi Pencacahan Survei Berbasis Web untuk Badan Pusat Statistik**
> 
> Sistem CAPI (Computer-Assisted Personal Interviewing) untuk mendukung kegiatan survei lapangan BPS dengan fitur offline-first dan sinkronisasi data real-time.

---

## 📋 Daftar Isi

- [🌟 Gambaran Umum](#-gambaran-umum)
- [🏗️ Arsitektur Sistem](#️-arsitektur-sistem)
- [🗄️ Struktur Database (ERD)](#️-struktur-database-erd)
- [📊 Tabel Database](#-tabel-database)
- [👥 Pengguna & Peran](#-pengguna--peran)
- [✨ Fitur Utama](#-fitur-utama)
- [🔄 Alur Kerja](#-alur-kerja)
- [🛠️ Teknologi & Framework](#️-teknologi--framework)
- [📂 Struktur Proyek](#-struktur-proyek)
- [🔌 API Endpoints](#-api-endpoints)
- [📱 Fitur PWA & Offline](#-fitur-pwa--offline)

---

## 🌟 Gambaran Umum

### Tentang Aplikasi

**CANTIK** adalah aplikasi web progresif (PWA) untuk mendukung kegiatan pencacahan survei lapangan oleh Badan Pusat Statistik (BPS). Aplikasi ini dirancang untuk memungkinkan petugas lapangan melakukan pengumpulan data meskipun dalam kondisi koneksi internet yang terbatas atau tidak tersedia.

### Karakteristik Utama

| Karakteristik | Deskripsi |
|--------------|-----------|
| **Offline-First** | Dapat beroperasi tanpa koneksi internet |
| **Real-time Sync** | Sinkronisasi otomatis ketika koneksi tersedia |
| **Dynamic Forms** | Form kuesioner yang dapat dikonfigurasi per kegiatan |
| **Multi-role** | Mendukung peran Admin, PCL (Pencacah), dan PML (Pengawas) |
| **Responsive** | Desain mobile-first untuk penggunaan di lapangan |

### Tujuan Penggunaan

1. **Pendataan Survei Rumah Tangga** - Pengumpulan data households
2. **Pemantauan Progress** - Monitoring real-time dari pihak koordinasi
3. **Review & Validasi** - Proses approval oleh pengawas lapangan
4. **Tabulasi Data** - Export dan analisis data hasil survei

---

## 🏗️ Arsitektur Sistem

### Arsitektur High-Level

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (React PWA)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Admin UI   │  │  Petugas UI │  │   Service   │  │  IndexedDB  │        │
│  │  (Dashboard)│  │(Questionnaire)│ │   Worker    │  │  (Offline)  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS / REST API
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVER (Express.js)                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Auth API  │  │  Kegiatan   │  │   Form API  │  │ Dokumen API │        │
│  │   Routes    │  │   Routes    │  │   Routes    │  │   Routes    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                    │                                        │
│                                    ▼                                        │
│                            ┌─────────────┐                                  │
│                            │   Prisma    │                                  │
│                            │   Client    │                                  │
│                            └─────────────┘                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATABASE (PostgreSQL)                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │  Admin  │  │ Petugas │  │Kegiatan  │  │ Wilayah │  │ Dokumen │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Arsitektur Frontend

```
src/
├── components/          # Komponen UI reusable
│   ├── layouts/        # Layout wrapper (Admin, Petugas)
│   └── ui/             # UI atoms (Badge, Button, etc.)
├── pages/              # Halaman utama aplikasi
│   ├── admin/          # Halaman Administrator
│   ├── petugas/        # Halaman Petugas Lapangan
│   └── auth/           # Halaman Autentikasi
├── services/           # Service layer
│   ├── api.js          # API client terpusat
│   ├── offlineStorage.js# IndexedDB wrapper
│   └── syncQueue.js    # Queue sinkronisasi offline
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
└── App.jsx             # Root component
```

---

## 🗄️ Struktur Database (ERD)

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                     ADMIN                                            │
│  ┌──────────┐  ┌────────────┐  ┌────────┐  ┌──────────┐  ┌────────────────────┐   │
│  │    id    │──│  username  │──│password│──│   nama   │  │ plain_password     │   │
│  └──────────┘  └────────────┘  └────────┘  └──────────┘  └────────────────────┘   │
│  ┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌──────────────────────────────────┐│
│  │   role   │  │ kegiatan_id│  │  created_at  │  │        updated_at               ││
│  └──────────┘  └────────────┘  └──────────────┘  └──────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────────────┘
          │
          │ 1:N (kegiatan_id)
          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                     KEGIATAN                                         │
│  ┌──────────┐  ┌──────────────────┐  ┌──────────────────────────────────────────┐   │
│  │    id    │──│      name        │──│            description                   │   │
│  └──────────┘  └──────────────────┘  └──────────────────────────────────────────┘   │
│  ┌──────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐   │
│  │ progress │  │   status  │──│  lokus     │  │ start_date │  │    fokus    │   │
│  └──────────┘  └────────────┘  └────────────┘  └────────────┘  └─────────────┘   │
│  ┌──────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐                     │
│  │  color   │  │text_color │  │  bg_color  │  │ created_at │                     │
│  └──────────┘  └────────────┘  └────────────┘  └────────────┘                     │
└──────────────────────────────────────────────────────────────────────────────────────┘
          │
          │ 1:N                         │ 1:N                         │ 1:N
          ▼                             ▼                             ▼
┌─────────────────────┐    ┌─────────────────────────────────┐    ┌─────────────────────┐
│   PETUGAS_KEGIATAN │    │          FORM_BLOK              │    │       DOKUMEN       │
│ ┌───────┐ ┌────────┐│    │  ┌───────┐  ┌───────┐         │    │  ┌───────┐ ┌──────┐│
│ │petugas│ │kegiatan││    │  │  id   │──│kegiatan│         │    │  │  id   │ │kegiatan││
│ │  _id  │ │  _id   ││    │  └───────┘  └───────┘         │    │  └───────┘ └──────┘│
│ └───────┘ └────────┘│    │  ┌───────┐  ┌───────────┐     │    │  ┌───────┐ ┌──────┐│
│ ┌───────┐ ┌────────┐│    │  │ kode  │──│   title   │     │    │  │ kode  │ │petugas││
│ │  role │ │ sls_   ││    │  └───────┘  └───────────┘     │    │  └───────┘ └──────┘│
│ │(PCL/  │ │assign  ││    │  ┌─────────────┐              │    │  ┌────────┐ ┌──────┐│
│ │ PML)  │ │ments   ││    │  │ sort_order  │              │    │  │  krt   │ │alamat││
│ └───────┘ └────────┘│    │  └─────────────┘              │    │  └────────┘ └──────┘│
│ ┌───────┐ ┌────────┐│    └─────────────────────────────────┘    │  ┌────────┐ ┌──────┐│
│ │pengawas││created ││              │ 1:N                        │  │kecamatan│ │desa  ││
│ └───────┘ │   _at  ││              ▼                           │  └────────┘ └──────┘│
└───────────┴────────┘│    ┌─────────────────────────────────┐    │  ┌──────┐ ┌──────┐│
                       │    │       FORM_QUESTION              │    │  │  sls │ │sub_  ││
┌───────────┐          │    │  ┌───────┐  ┌───────────────┐  │    │  └──────┘ │ sls  ││
│   PETUGAS │          │    │  │  id   │──│    blok_id    │  │    │  ┌──────┐ └──────┘│
│┌───────┐ │          │    │  └───────┘  └───────────────┘  │    │  │status│ ┌───────┐│
││   id  │ │          │    │  ┌───────┐  ┌───────────────┐  │    │  └──────┘ │review ││
│└───────┘ │          │    │  │parent │  │    label     │  │    │            │_status││
│┌───────┐ │          │    │  │  _id  │  └───────────────┘  │    │            └───────┘│
││username│ │          │    │  └───────┘  ┌───────┐        │    │            ┌───────┐│
│└───────┘ │          │    │  │  type  │──│options│        │    │            │is_pre││
│┌───────┐ │          │    │  └───────┘  └───────┘        │    │            │ list  ││
││password│ │          │    │  ┌───────┐  ┌────────────┐  │    │            └───────┘│
│└───────┘ │          │    │  │required│  │validation  │  │    └───────────────────────┘│
│┌───────┐ │          │    │  └───────┘  └────────────┘  │              │ 1:N
││  name │ │          │    │  ┌───────┐  ┌────────────┐  │              ▼
│└───────┘ │          │    │  │skip_  │──│skip_target │  │    ┌───────────────────────┐
│┌───────┐ │          │    │  │logic  │  └────────────┘  │    │    DOKUMEN_JAWABAN   │
││  nik  │ │          │    │  └───────┘                   │    │  ┌────────┐ ┌────────┐│
│└───────┘ │          │    └──────────────────────────────┘    │  │dokumen │ │question││
│┌───────┐ │          │                                       │  │  _id   │ │  _id   ││
││ phone │ │          │                                       │  └────────┘ └────────┘│
│└───────┘ │          │                                       │  ┌──────────────────┐  │
│┌───────┐ │          │                                       │  │      value       │  │
││  desa │ │          │                                       │  └──────────────────┘  │
│└───────┘ │          │                                       └───────────────────────┘│
│┌───────┐ │          │                                       │
││ target│ │          │                                       │
│└───────┘ │          │                                       │
│┌───────┐ │          │                                       │
││selesai│ │          │                                       │
│└───────┘ │          │                                       │
│┌───────┐ │          │                                       │
││status │ │          │                                       │
│└───────┘ │          │                                       │
│┌───────┐ │          │                                       │
││last_  │ │          │                                       │
││sync   │ │          │                                       │
│└───────┘ │          │                                       │
└───────────┘          │                                       │
                       │                                       │
                       │ 1:N                                   │
                       ▼                                       │
              ┌─────────────────┐                               │
              │     WILAYAH      │                               │
              │ ┌───────┐ ┌─────┐│                              │
              │ │kecama-│ │desa ││                              │
              │ │  tan  │ └─────┘│                              │
              │ └───────┘ ┌─────┐│                              │
              │ │   sls   │ │sub ││                              │
              │ └─────────┘ │_sls││                              │
              │ ┌───────────┴─────┴─────────────────────────────┐│
              │ │              kode_wilayah                     ││
              │ └───────────────────────────────────────────────┘│
              │ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐       │
              │ │kdprov │ │ kdkab │ │ kdkec │ │kddesa │       │
              │ └───────┘ └───────┘ └───────┘ └───────┘       │
              └─────────────────────────────────────────────────┘
```

---

## 📊 Tabel Database

### 1. Admin Table

| Kolom | Tipe Data | Deskripsi |
|-------|-----------|-----------|
| `id` | INT (PK) | Primary key, auto-increment |
| `username` | VARCHAR(50) | Username unik untuk login |
| `password` | VARCHAR(255) | Password terenkripsi (bcrypt) |
| `plain_password` | VARCHAR(100) | Password plaintext (temporary) |
| `nama` | VARCHAR(100) | Nama lengkap admin |
| `role` | VARCHAR(20) | Peran: `superadmin`, `admin`, `admin_kegiatan` |
| `kegiatan_id` | INT (FK) | Relasi ke kegiatan (opsional) |
| `created_at` | TIMESTAMP | Waktu pembuatan |
| `updated_at` | TIMESTAMP | Waktu update terakhir |

### 2. Petugas Table

| Kolom | Tipe Data | Deskripsi |
|-------|-----------|-----------|
| `id` | INT (PK) | Primary key, auto-increment |
| `username` | VARCHAR(50) | Username unik untuk login |
| `password` | VARCHAR(255) | Password terenkripsi (bcrypt) |
| `name` | VARCHAR(100) | Nama lengkap petugas |
| `nik` | VARCHAR(20) | Nomor Induk Kependudukan |
| `phone` | VARCHAR(20) | Nomor telepon |
| `desa` | VARCHAR(100) | Desa penugasan |
| `target` | INT | Target jumlah dokumen |
| `selesai` | INT | Jumlah dokumen selesai |
| `last_sync` | DATETIME | Waktu sinkronisasi terakhir |
| `status` | ENUM | Status: `active`, `done`, `inactive` |
| `created_at` | TIMESTAMP | Waktu pembuatan |
| `updated_at` | TIMESTAMP | Waktu update terakhir |

### 3. Kegiatan Table

| Kolom | Tipe Data | Deskripsi |
|-------|-----------|-----------|
| `id` | INT (PK) | Primary key, auto-increment |
| `name` | VARCHAR(200) | Nama kegiatan survei |
| `description` | TEXT | Deskripsi kegiatan |
| `progress` | INT | Progress keseluruhan (0-100) |
| `color` | VARCHAR(30) | Warna UI (Tailwind class) |
| `text_color` | VARCHAR(30) | Warna teks UI |
| `bg_color` | VARCHAR(30) | Warna background UI |
| `start_date` | DATE | Tanggal mulai |
| `status` | ENUM | Status: `draft`, `published`, `uji_coba`, `selesai` |
| `lokus` | JSON | Lokus wilayah (kecamatan, desa, sls) |
| `fokus` | VARCHAR(50) | Fokus survei (e.g., "Rumah Tangga") |
| `created_at` | TIMESTAMP | Waktu pembuatan |
| `updated_at` | TIMESTAMP | Waktu update terakhir |

### 4. Petugas_Kegiatan Table (Junction)

| Kolom | Tipe Data | Deskripsi |
|-------|-----------|-----------|
| `id` | INT (PK) | Primary key, auto-increment |
| `petugas_id` | INT (FK) | Relasi ke petugas |
| `kegiatan_id` | INT (FK) | Relasi ke kegiatan |
| `role` | ENUM | Peran: `PCL` (Pencacah), `PML` (Pengawas) |
| `sls_assignments` | JSON | Daftar SLS yang ditugaskan |
| `pengawas` | VARCHAR(100) | Nama pengawas (untuk PCL) |
| `created_at` | TIMESTAMP | Waktu pembuatan |

> **Constraint**: Unique constraint pada `(petugas_id, kegiatan_id)`

### 5. Wilayah Table

| Kolom | Tipe Data | Deskripsi |
|-------|-----------|-----------|
| `id` | INT (PK) | Primary key, auto-increment |
| `kecamatan` | VARCHAR(100) | Nama kecamatan |
| `desa` | VARCHAR(100) | Nama desa |
| `sls` | VARCHAR(100) | Nama SLS (Sensus Lingkungan Sensus) |
| `sub_sls` | VARCHAR(100) | Nama Sub SLS |
| `kode_wilayah` | VARCHAR(16) | Kode wilayah BPS |
| `kdprov` | VARCHAR(2) | Kode provinsi |
| `kdkab` | VARCHAR(2) | Kode kabupaten |
| `kdkec` | VARCHAR(3) | Kode kecamatan |
| `kddesa` | VARCHAR(3) | Kode desa |
| `kdsls` | VARCHAR(4) | Kode SLS |
| `kdsubsls` | VARCHAR(2) | Kode Sub SLS |
| `created_at` | TIMESTAMP | Waktu pembuatan |

### 6. Form_Blok Table

| Kolom | Tipe Data | Deskripsi |
|-------|-----------|-----------|
| `id` | INT (PK) | Primary key, auto-increment |
| `kegiatan_id` | INT (FK) | Relasi ke kegiatan |
| `kode` | VARCHAR(20) | Kode blok (e.g., "Blok I") |
| `title` | VARCHAR(150) | Judul blok |
| `sort_order` | INT | Urutan tampil |
| `created_at` | TIMESTAMP | Waktu pembuatan |

### 7. Form_Question Table

| Kolom | Tipe Data | Deskripsi |
|-------|-----------|-----------|
| `id` | INT (PK) | Primary key, auto-increment |
| `blok_id` | INT (FK) | Relasi ke form_blok |
| `parent_id` | INT (FK) | Relasi ke pertanyaan induk (sub-question) |
| `label` | VARCHAR(500) | Label/keterangan pertanyaan |
| `type` | ENUM | Tipe input |
| `required` | BOOLEAN | Apakah wajib diisi |
| `options` | JSON | Opsi untuk select/radio |
| `validation` | TEXT | Rule validasi |
| `skip_logic` | TEXT | Logika skip condition |
| `skip_target` | INT (FK) | Target pertanyaan jika skip |
| `show_if_parent_id` | INT (FK) | Tampilkan jika parent memenuhi kondisi |
| `show_if_value` | TEXT | Nilai yang memicu tampil |
| `sort_order` | INT | Urutan tampil |
| `created_at` | TIMESTAMP | Waktu pembuatan |
| `updated_at` | TIMESTAMP | Waktu update terakhir |

### 8. Dokumen Table

| Kolom | Tipe Data | Deskripsi |
|-------|-----------|-----------|
| `id` | INT (PK) | Primary key, auto-increment |
| `kode` | VARCHAR(50) | Kode unik dokumen |
| `kegiatan_id` | INT (FK) | Relasi ke kegiatan |
| `petugas_id` | INT (FK) | Relasi ke petugas |
| `krt` | VARCHAR(100) | Nama Kepala Rumah Tangga |
| `alamat` | VARCHAR(200) | Alamat |
| `kecamatan` | VARCHAR(100) | Kecamatan |
| `desa` | VARCHAR(100) | Desa |
| `sls` | VARCHAR(100) | SLS |
| `sub_sls` | VARCHAR(100) | Sub SLS |
| `status` | ENUM | Status: `draft`, `tersimpan`, `terkirim` |
| `review_status` | ENUM | Review: `draft`, `approved`, `rejected` |
| `flag` | INT | Flag/kode khusus |
| `is_prelist` | BOOLEAN | Apakah prelist |
| `sync` | BOOLEAN | Status sinkronisasi |
| `last_sent_data` | JSON | Data terakhir yang dikirim |
| `created_at` | TIMESTAMP | Waktu pembuatan |
| `updated_at` | TIMESTAMP | Waktu update terakhir |

### 9. Dokumen_Jawaban Table (EAV Pattern)

| Kolom | Tipe Data | Deskripsi |
|-------|-----------|-----------|
| `id` | INT (PK) | Primary key, auto-increment |
| `dokumen_id` | INT (FK) | Relasi ke dokumen |
| `question_id` | INT (FK) | Relasi ke form_question |
| `value` | TEXT | Jawaban |
| `created_at` | TIMESTAMP | Waktu pembuatan |
| `updated_at` | TIMESTAMP | Waktu update terakhir |

> **Constraint**: Unique constraint pada `(dokumen_id, question_id)`

### 10. Dokumen_Log Table

| Kolom | Tipe Data | Deskripsi |
|-------|-----------|-----------|
| `id` | INT (PK) | Primary key, auto-increment |
| `dokumen_id` | INT (FK) | Relasi ke dokumen |
| `message` | TEXT | Pesan log |
| `created_at` | TIMESTAMP | Waktu pembuatan |

---

## 👥 Pengguna & Peran

### Jenis Pengguna

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SISTEM AUTHENTICATION                          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        ADMINISTRATOR                                 │   │
│  │  ├── Super Admin                                                     │   │
│  │  │   - Akses penuh ke semua fitur                                    │   │
│  │  │   - Kelola kegiatan, petugas, dan data                             │   │
│  │  │   - Akses tabulasi dan laporan                                    │   │
│  │  │                                                                    │   │
│  │  └── Admin Kegiatan                                                  │   │
│  │      - Akses terbatas per kegiatan                                    │   │
│  │      - Review data dan petugas kegiatan terkait                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        PETUGAS LAPANGAN                              │   │
│  │  ├── PCL (Pencacah)                                                  │   │
│  │  │   - Mengisi kuesioner di lapangan                                 │   │
│  │  │   - Membuat dan menyimpan dokumen                                 │   │
│  │  │   - Sinkronisasi data                                             │   │
│  │  │                                                                    │   │
│  │  └── PML (Pengawas)                                                  │   │
│  │      - Memeriksa dan mereview dokumen                                 │   │
│  │      - Approve/Reject dokumen                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Matriks Hak Akses

| Fitur | Super Admin | Admin Kegiatan | PCL | PML |
|-------|:-----------:|:-------------:|:---:|:---:|
| Kelola Kegiatan | ✅ | ❌ | ❌ | ❌ |
| Kelola Petugas | ✅ | ❌ | ❌ | ❌ |
| Form Builder | ✅ | ❌ | ❌ | ❌ |
| Monitoring Dashboard | ✅ | ✅ | ❌ | ❌ |
| Review Data | ✅ | ✅ | ❌ | ✅ |
| Approve/Reject | ✅ | ✅ | ❌ | ✅ |
| Tabulasi | ✅ | ❌ | ❌ | ❌ |
| Isi Kuesioner | ❌ | ❌ | ✅ | ❌ |

---

## ✨ Fitur Utama

### 1. 🔐 Sistem Login & Autentikasi

```
Login Flow:
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Pilih   │────▶│ Masukkan │────▶│ Verifikasi│────▶│Redirect  │
│  Peran   │     │Username/ │     │ Password  │     │ ke Role  │
│          │     │ Password │     │  (bcrypt) │     │ terkait  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

**Fitur:**
- Login terpisah untuk Admin dan Petugas
- Password terenkripsi dengan bcrypt
- Session management via localStorage
- Auto-login jika session masih valid

### 2. 📊 Dashboard Admin

**Komponen Dashboard:**

| Komponen | Deskripsi |
|----------|-----------|
| **Stat Cards** | Draft, Selesai, Review, Ditolak |
| **Progress Chart** | Bar chart kiriman harian |
| **Pie Chart** | Distribusi status dokumen |
| **Desa Progress** | Progress per desa |
| **Petugas Table** | Aktivitas petugas lapangan |

**Visualisasi Data:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │ 📝 Draft │  │  ✅ Selesai│  │  ⏳ Review│  │  ❌ Tolak │          │
│  │    24   │  │    156  │  │    18   │  │    5    │          │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
│                                                                 │
│  ┌───────────────────────────┐  ┌───────────────────────────────┐│
│  │     Progress per Desa     │  │      Kiriman Harian            ││
│  │  ▓▓▓▓▓▓▓▓░░░░░░  65%    │  │  ██                           ││
│  │  ▓▓▓▓▓▓░░░░░░░░  48%    │  │  ████                         ││
│  │  ▓▓▓▓░░░░░░░░░░  35%    │  │  ██████                       ││
│  │  ▓▓▓▓▓▓▓▓▓▓░░░░  78%    │  │  ████████                     ││
│  └───────────────────────────┘  └───────────────────────────────┘│
│                                                                 │
│  ┌─────────────┐  ┌───────────────────────────────────────────┐│
│  │  Status      │  │           Aktivitas Petugas                 ││
│  │  ┌───┐      │  │  ┌─────────────────────────────────────────┐││
│  │  │   │ 65%  │  │  │ Nama Petugas    │ Progress │ Status   │││
│  │  └───┘      │  │  │─────────────────┼──────────┼──────────│││
│  │             │  │  │ Budi Santoso    │ 12/20    │ Aktif    │││
│  │  ● Disetuji │  │  │ Siti Rahayu     │ 8/15     │ Aktif    │││
│  │  ● Pending  │  │  │ Ahmad Fauzi     │ 15/15    │ Selesai  │││
│  │  ● Ditolak  │  │  └─────────────────────────────────────────┘││
│  └─────────────┘  └───────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 3. 🏗️ Form Builder (Dynamic Questionnaire)

**Fitur Form Builder:**

| Fitur | Deskripsi |
|-------|-----------|
| **Blok Management** | Tambah, edit, hapus blok kuesioner |
| **Question Types** | text, number, select, radio, date, textarea, location, note, pcl, pml |
| **Parent-Child** | Pertanyaan bersarang/sub-pertanyaan |
| **Skip Logic** | Logika loncatan antar pertanyaan |
| **Validation Rules** | range, min, gt (greater than) |
| **Loop/Iteration** | Pengulangan pertanyaan berdasarkan jawaban |
| **Auto-fill Variables** | Variabel auto-calculate (SUM, AVG, MAX, MIN, LAST) |

**Question Types:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         QUESTION TYPES SUPPORTED                            │
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │   text   │  │  number  │  │  select  │  │  radio   │  │   date   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ textarea │  │location  │  │   note   │  │   pcl    │  │   pml    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4. 📝 Pengisian Kuesioner (Petugas)

**Alur Pengisian:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PETUGAS QUESTIONNAIRE FLOW                          │
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │ 1. Pilih        │    │ 2. Daftar       │    │ 3. Isi          │         │
│  │    Kegiatan     │───▶│    Prelist      │───▶│    Kuesioner    │         │
│  │                 │    │                 │    │                 │         │
│  │ [Pilih dari     │    │ [Lihat semua    │    │ [Multi-block    │         │
│  │  daftar kegiatan│    │  dokumen RT]     │    │  form dengan     │         │
│  │  yang assigned] │    │                 │    │  tab navigasi]   │         │
│  └─────────────────┘    │ [+ Tambah Baru] │    └─────────────────┘         │
│                          └─────────────────┘              │                │
│                                                              │                │
│                            ┌─────────────────┐               │                │
│                            │ 4. Summary      │◀──────────────┘                │
│                            │    Modal        │    ┌─────────────────┐         │
│                            │                 │    │ 5. Save Options │         │
│                            │ [Validasi &     │    │                 │         │
│                            │  Error Summary] │    │ - Draft         │         │
│                            └─────────────────┘    │ - Tersimpan     │         │
│                                                     │ - Batal Simpan  │         │
│                                                     └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Fitur Kuesioner:**

- **Auto-save** - Simpan otomatis setiap 1.1 detik
- **Block Navigation** - Navigasi antar blok dengan progress indicator
- **Validation** - Validasi real-time per blok
- **Status Banners** - Indikator read-only untuk dokumen approved/rejected
- **Log Activity** - Riwayat perubahan dokumen
- **Location Auto-fill** - Otomatis isi lokasi dari aktivitas

### 5. ✅ Review & Approval (PML)

**Workflow Review:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              REVIEW WORKFLOW                                │
│                                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐           │
│  │  Draft   │───▶│Tersimpan │───▶│Tertunda  │───▶│  Review  │           │
│  │          │    │ (PCL)    │    │ (Review) │    │  (PML)   │           │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘           │
│                                                        │                 │
│                                    ┌───────────────────┴───────────────┐   │
│                                    │                                   │   │
│                                    ▼                                   ▼   │
│                             ┌──────────┐                        ┌──────────┐│
│                             │Approved  │                        │ Rejected ││
│                             │   ✅     │                        │    ❌    ││
│                             └──────────┘                        └──────────┘│
│                                   │                                   │     │
│                                   ▼                                   ▼     │
│                        ┌──────────────────┐              ┌──────────────────┐│
│                        │ Update statistik │              │ Catatan rejection││
│                        │ desa_kegiatan    │              │ & kirim feedback ││
│                        └──────────────────┘              └──────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6. 📈 Tabulasi Data

**Fitur Tabulasi:**

| Fitur | Deskripsi |
|-------|-----------|
| **Dynamic Pivot** | Pivot data otomatis berdasarkan pertanyaan |
| **Filter** | Filter berdasarkan kegiatan |
| **Export** | Export ke format yang dapat diproses |
| **Aggregation** | Aggregate values per pertanyaan |

---

## 🔄 Alur Kerja

### Alur Lengkap Survei

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                              ALUR KERJA SURVEI                                    │
│                                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────────────┐ │
│  │                           PHASE 1: PERSIAPAN                                 │ │
│  │                                                                              │ │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │ │
│  │   │ 1. Admin   │───▶│ 2. Buat     │───▶│ 3. Assign   │───▶│ 4. Buat     │ │ │
│  │   │  Login     │    │  Kegiatan   │    │  Petugas    │    │  Form       │ │ │
│  │   └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │ │
│  │                                                                              │ │
│  └──────────────────────────────────────────────────────────────────────────────┘ │
│                                           │                                       │
│                                           ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────┐ │
│  │                           PHASE 2: PUBLIKASI                                  │ │
│  │                                                                              │ │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                       │ │
│  │   │ 1. Publish │───▶│ 2. Generate │───▶│ 3. Petugas  │                       │ │
│  │   │  Kegiatan  │    │  Admin      │    │  Download   │                       │ │
│  │   └─────────────┘    └─────────────┘    └─────────────┘                       │ │
│  │                                               │                                │ │
│  └───────────────────────────────────────────────┼────────────────────────────────┘ │
│                                                  ▼                                │
│  ┌──────────────────────────────────────────────────────────────────────────────┐ │
│  │                           PHASE 3: PENCACAHAN                                │ │
│  │                                                                              │ │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │ │
│  │   │ 1. Petugas  │───▶│ 2. Isi      │───▶│ 3. Simpan   │───▶│ 4. Sync     │ │ │
│  │   │  Login      │    │  Kuesioner  │    │  (Offline)  │    │  (Online)   │ │ │
│  │   └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │ │
│  │                                                                   │          │ │
│  │                                                                   ▼          │ │
│  │                                                     ┌─────────────────────┐ │ │
│  │                                                     │     Auto-Sync        │ │ │
│  │                                                     │  Ketika koneksi      │ │ │
│  │                                                     │  internet tersedia   │ │ │
│  │                                                     └─────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────────────────┘ │
│                                           │                                       │
│                                           ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────┐ │
│  │                           PHASE 4: REVIEW                                   │ │
│  │                                                                              │ │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                       │ │
│  │   │ 1. PML     │───▶│ 2. Review  │───▶│ 3. Approve/ │                       │ │
│  │   │  Login     │    │  Dokumen    │    │  Reject     │                       │ │
│  │   └─────────────┘    └─────────────┘    └─────────────┘                       │ │
│  │                                                                              │ │
│  └──────────────────────────────────────────────────────────────────────────────┘ │
│                                           │                                       │
│                                           ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────┐ │
│  │                           PHASE 5: TABULASI                                 │ │
│  │                                                                              │ │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                       │ │
│  │   │ 1. Admin    │───▶│ 2. Export   │───▶│ 3. Analisis│                       │ │
│  │   │  Tabulasi  │    │  Clean Data │    │  Data       │                       │ │
│  │   └─────────────┘    └─────────────┘    └─────────────┘                       │ │
│  │                                                                              │ │
│  └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### Alur Data Offline-First

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                           OFFLINE-FIRST DATA FLOW                                  │
│                                                                                    │
│                                    INTERNET                                        │
│                                       │                                            │
│                    ┌──────────────────┼──────────────────┐                        │
│                    │                  │                  │                        │
│                    ▼                  │                  ▼                        │
│            ┌───────────────┐          │          ┌───────────────┐                │
│            │   ONLINE      │          │          │   OFFLINE     │                │
│            │   User is     │          │          │   User is     │                │
│            │   Connected   │          │          │   Disconnected│                │
│            └───────┬───────┘          │          └───────┬───────┘                │
│                    │                  │                  │                        │
│                    ▼                  │                  ▼                        │
│            ┌───────────────┐          │          ┌───────────────┐                │
│            │ Real-time     │          │          │ Store to      │                │
│            │ Sync         │          │          │ IndexedDB     │                │
│            └───────┬───────┘          │          └───────┬───────┘                │
│                    │                  │                  │                        │
│                    │                  │                  │                        │
│                    ▼                  │                  ▼                        │
│            ┌───────────────┐          │          ┌───────────────┐                │
│            │ API Server    │          │          │ Local Cache   │                │
│            │ (PostgreSQL)  │◀─────────┼──────────│ + Sync Queue  │                │
│            └───────────────┘          │          └───────────────┘                │
│                    │                  │                  │                        │
│                    │                  │                  │                        │
│                    │                  │                  │                        │
│                    │                  │                  ▼                        │
│                    │                  │          ┌───────────────┐                │
│                    │                  │          │ Auto-sync     │                │
│                    │                  │          │ when online   │                │
│                    │                  │          └───────────────┘                │
│                    │                  │                  │                        │
│                    │                  │                  │                        │
│                    └──────────────────┼──────────────────┘                        │
│                                       │                                            │
│                              ┌────────┴────────┐                                   │
│                              │                 │                                   │
│                              ▼                 ▼                                   │
│                      ┌─────────────┐   ┌─────────────┐                             │
│                      │  Service    │   │   PWA      │                             │
│                      │  Worker     │   │  Prompt    │                             │
│                      │  (Caching)  │   │  Install   │                             │
│                      └─────────────┘   └─────────────┘                             │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Teknologi & Framework

### Frontend Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          React 19                                    │   │
│  │  ├── JSX for component structure                                     │   │
│  │  ├── Hooks (useState, useEffect, useCallback, useMemo)              │   │
│  │  └── Custom Hooks                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│  ┌─────────────────────────────────┼─────────────────────────────────────┐ │
│  │                                 ▼                                      │ │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐          │ │
│  │  │   Vite    │  │Tailwind  │  │  Lucide   │  │ Recharts  │          │ │
│  │  │    8.x    │  │  CSS 4.x │  │  React    │  │   3.x     │          │ │
│  │  │(Bundler) │  │  (UI)    │  │  (Icons)  │  │ (Charts)  │          │ │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘          │ │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          PWA Features                                │   │
│  │  ├── vite-plugin-pwa for service worker generation                   │   │
│  │  ├── Workbox for runtime caching                                     │   │
│  │  ├── IndexedDB for offline data storage                              │   │
│  │  └── Background sync for offline operations                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Library/Framework | Version | Purpose |
|-------------------|---------|---------|
| **React** | 19.2.5 | UI library |
| **Vite** | 8.0.16 | Build tool & dev server |
| **Tailwind CSS** | 4.3.0 | Utility-first CSS |
| **Lucide React** | 1.14.0 | Icon library |
| **Recharts** | 3.8.1 | Data visualization |
| **vite-plugin-pwa** | 1.3.0 | PWA support |

### Backend Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                         │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Express.js 5                                  │   │
│  │  ├── RESTful API routes                                             │   │
│  │  ├── CORS middleware                                                 │   │
│  │  └── JSON body parsing                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│  ┌─────────────────────────────────┼─────────────────────────────────────┐ │
│  │                                 ▼                                      │ │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐          │ │
│  │  │ Prisma    │  │ Bcryptjs  │  │   Cors    │  │  Dotenv   │          │ │
│  │  │ Client    │  │(Password) │  │(Cross-    │  │(Env Var)  │          │ │
│  │  │ 6.x      │  │           │  │ Origin)   │  │           │          │ │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘          │ │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       Database: PostgreSQL                           │   │
│  │  ├── Via Prisma ORM                                                 │   │
│  │  └── Supports JSON fields for flexible schema                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Library/Framework | Version | Purpose |
|-------------------|---------|---------|
| **Express** | 5.1.0 | Web framework |
| **Prisma** | 6.19.3 | ORM |
| **bcryptjs** | 3.0.3 | Password hashing |
| **cors** | 2.8.5 | Cross-origin resource sharing |
| **dotenv** | 16.5.0 | Environment variables |

### Development Tools

| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting |
| **PostCSS** | CSS processing |
| **Autoprefixer** | CSS vendor prefixes |
| **sharp** | Image processing for PWA icons |

---

## 📂 Struktur Proyek

```
cantik/
├── src/                          # Frontend React application
│   ├── components/
│   │   ├── ErrorBoundary.jsx    # Error boundary wrapper
│   │   ├── layouts/
│   │   │   ├── AdminLayout.jsx  # Admin page wrapper
│   │   │   └── PetugasLayout.jsx # Petugas page wrapper
│   │   └── ui/
│   │       ├── Badge.jsx         # Status badge component
│   │       ├── ConfirmModal.jsx  # Confirmation dialog
│   │       ├── Dropdown.jsx      # Dropdown select
│   │       ├── PWAPrompt.jsx     # PWA install prompt
│   │       ├── QCard.jsx         # Question card wrapper
│   │       └── SearchableSelect.jsx # Searchable dropdown
│   ├── constants/
│   │   └── navigation.js        # Navigation config
│   ├── hooks/
│   │   ├── useAutoSave.js       # Auto-save functionality
│   │   └── useDropdown.js        # Dropdown state hook
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── AdminBeranda.jsx      # Homepage
│   │   │   ├── AdminDashboard.jsx     # Monitoring dashboard
│   │   │   ├── AdminDataReview.jsx   # Document review
│   │   │   ├── AdminFormBuilder.jsx  # Form builder tool
│   │   │   ├── AdminKegiatan.jsx     # Activity management
│   │   │   ├── AdminMasterPetugas.jsx # Master petugas
│   │   │   ├── AdminPetugasKegiatan.jsx # Petugas assignment
│   │   │   └── AdminTabulasi.jsx     # Data tabulation
│   │   ├── auth/
│   │   │   └── LoginScreen.jsx       # Login page
│   │   └── petugas/
│   │       ├── PetugasHome.jsx       # Petugas homepage
│   │       ├── PetugasQuestionnaire.jsx # Kuesioner page
│   │       ├── PetugasSettings.jsx   # Settings page
│   │       └── PetugasSync.jsx       # Sync page
│   ├── services/
│   │   ├── api.js               # Centralized API client
│   │   ├── offlineStorage.js     # IndexedDB wrapper
│   │   └── syncQueue.js          # Sync queue manager
│   ├── styles/
│   │   └── GlobalStyles.jsx      # Global CSS styles
│   ├── utils/
│   │   ├── formatters.js         # Formatting utilities
│   │   └── jsonHelpers.js        # JSON parsing helpers
│   ├── App.jsx                  # Root component
│   └── main.jsx                 # Entry point
│
├── server/                       # Backend Express application
│   ├── config/
│   │   └── database.js           # Prisma client config
│   ├── db/
│   │   ├── schema.sql           # MySQL schema (legacy)
│   │   ├── seed.sql             # Seed data
│   │   ├── seeder.js            # Seeder script
│   │   └── wilayah_data.json    # Region reference data
│   ├── prisma/
│   │   └── schema.prisma        # Prisma schema
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── dashboard.js         # Dashboard stats routes
│   │   ├── desa.js              # Village stats routes
│   │   ├── dokumen.js           # Document routes
│   │   ├── form.js              # Form builder routes
│   │   ├── index.js             # Route aggregator
│   │   ├── kegiatan.js          # Activity routes
│   │   ├── petugas.js           # Petugas routes
│   │   ├── tabulasi.js          # Tabulation routes
│   │   └── wilayah.js          # Region routes
│   └── index.js                 # Server entry point
│
├── public/                      # Static assets
│
├── package.json                 # Frontend dependencies
├── vite.config.js              # Vite configuration
├── tailwind.config.js          # Tailwind configuration
├── eslint.config.js            # ESLint configuration
└── DOKUMENTASI.md              # Documentation
```

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login/admin` | Login sebagai admin |
| POST | `/api/auth/login/petugas` | Login sebagai petugas |

### Petugas

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/petugas` | Ambil semua petugas |
| POST | `/api/petugas` | Tambah petugas baru |
| PUT | `/api/petugas/:id` | Update petugas |
| DELETE | `/api/petugas/:id` | Hapus petugas |
| POST | `/api/petugas/assign` | Assign petugas ke kegiatan |
| POST | `/api/petugas/unassign` | Unassign petugas |

### Kegiatan

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/kegiatan` | Ambil semua kegiatan |
| POST | `/api/kegiatan` | Buat kegiatan baru |
| PUT | `/api/kegiatan/:id` | Update kegiatan |
| DELETE | `/api/kegiatan/:id` | Hapus kegiatan |

### Form

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/form/:kegiatanId` | Ambil struktur form |
| POST | `/api/form/blok` | Tambah blok |
| PUT | `/api/form/blok/:id` | Update blok |
| DELETE | `/api/form/blok/:id` | Hapus blok |
| POST | `/api/form/question` | Tambah pertanyaan |
| PUT | `/api/form/question/:id` | Update pertanyaan |
| DELETE | `/api/form/question/:id` | Hapus pertanyaan |

### Dokumen

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dokumen/petugas/:petugasId` | Ambil dokumen petugas |
| GET | `/api/dokumen/review/:kegiatanId` | Ambil untuk review |
| GET | `/api/dokumen/:id` | Ambil detail dokumen |
| POST | `/api/dokumen` | Simpan dokumen |
| POST | `/api/dokumen/sync` | Sync batch dokumen |
| POST | `/api/dokumen/review/:id` | Review dokumen |
| DELETE | `/api/dokumen/:id` | Hapus dokumen |

### Dashboard & Statistik

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Statistik dashboard |
| GET | `/api/desa/:kegiatanId` | Statistik per desa |
| POST | `/api/desa` | Simpan target desa |
| PUT | `/api/desa/:id` | Update target desa |
| DELETE | `/api/desa/:id` | Hapus target desa |

### Wilayah

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wilayah` | Ambil semua wilayah |
| GET | `/api/wilayah/kecamatan` | Ambil daftar kecamatan |
| GET | `/api/wilayah/desa` | Ambil daftar desa |
| GET | `/api/wilayah/sls` | Ambil daftar SLS |
| GET | `/api/wilayah/sub_sls` | Ambil daftar Sub SLS |

### Tabulasi

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tabulasi/:kegiatanId` | Ambil data bersih |

---

## 📱 Fitur PWA & Offline

### Service Worker Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CACHING STRATEGY                                  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  API GET: /api/form/*, /api/wilayah/*                                 │ │
│  │  Strategy: StaleWhileRevalidate                                       │ │
│  │  Cache: 7 days                                                         │ │
│  │  Purpose: Always serve fresh form & wilayah data                      │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  API GET: /api/kegiatan, /api/petugas, /api/dashboard, /api/desa      │ │
│  │  Strategy: NetworkFirst                                               │ │
│  │  Cache: 1 day, Network timeout: 5s                                    │ │
│  │  Purpose: Fresh data when online, cached when offline                 │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  API GET: /api/dokumen/*                                              │ │
│  │  Strategy: NetworkFirst                                               │ │
│  │  Cache: 3 days, Network timeout: 5s                                   │ │
│  │  Purpose: Dokumen data with offline fallback                         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  External: Google Fonts                                                │ │
│  │  Strategy: CacheFirst                                                 │ │
│  │  Cache: 1 year                                                        │ │
│  │  Purpose: Offline font availability                                  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### IndexedDB Schema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INDEXEDDB STORES                                  │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │  form_structure │  │    wilayah      │  │    dokumen      │            │
│  │─────────────────│  │─────────────────│  │─────────────────│            │
│  │ Key: kegiatan_id│  │ Key: key        │  │ Key: kode       │            │
│  │                 │  │                 │  │ Index: kegiatan │            │
│  │ Stores blocks   │  │ Stores region   │  │ Index: petugas  │            │
│  │ & questions     │  │ data            │  │ Index: sync     │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │   sync_queue    │  │    kegiatan     │  │    petugas      │            │
│  │─────────────────│  │─────────────────│  │─────────────────│            │
│  │ Key: id (auto) │  │ Key: id         │  │ Key: id         │            │
│  │ Index: status   │  │                 │  │                 │            │
│  │ Index: created  │  │ Cached kegiatan │  │ Cached petugas  │            │
│  │                 │  │ list            │  │ list            │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                             │
│  ┌─────────────────┐                                                        │
│  │      meta       │                                                        │
│  │─────────────────│                                                        │
│  │ Key: key        │                                                        │
│  │                 │                                                        │
│  │ Sync timestamps │                                                        │
│  │ & metadata      │                                                        │
│  └─────────────────┘                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Auto-Sync Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AUTO-SYNC WORKFLOW                                │
│                                                                             │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                │
│  │   Online?   │─────▶│   Queue     │─────▶│   Process   │                │
│  │             │ Yes  │   Check     │      │   Queue     │                │
│  └─────────────┘      └─────────────┘      └──────┬──────┘                │
│       │                                             │                       │
│       │ No                                         │                       │
│       ▼                                            ▼                       │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                │
│  │   Add to    │◀─────│   Failed    │◀─────│   Success   │                │
│  │   Queue     │      │             │      │  & Remove   │                │
│  └─────────────┘      └─────────────┘      └─────────────┘                │
│                                                                             │
│  Configuration:                                                             │
│  - Interval: Setiap 30 detik                                               │
│  - Retry: Unlimited dengan exponential backoff                              │
│  - Max batch: 10 items per iteration                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Statistics

### Package Sizes

| Component | Size | Description |
|-----------|------|-------------|
| React + ReactDOM | ~45KB | UI Library (gzipped) |
| Vite | Dev only | Build tool |
| Tailwind CSS | ~15KB | CSS Framework |
| Lucide Icons | ~30KB | Icon set |
| Recharts | ~75KB | Chart library |
| **Total App** | ~165KB | Estimated total |

### Database Statistics

| Table | Purpose |
|-------|---------|
| admin | Administrator accounts |
| petugas | Field officers |
| kegiatan | Survey activities |
| petugas_kegiatan | Officer-Activity assignments |
| wilayah | Regional reference data |
| form_blok | Questionnaire blocks |
| form_question | Questionnaire questions |
| dokumen | Survey documents |
| dokumen_jawaban | Document answers (EAV) |
| dokumen_log | Activity logs |

---

## 🔮 Roadmap & Pengembangan

### Fitur yang Dapat Ditambahkan

1. **Export Data** - Export ke Excel/CSV/PDF
2. **Real-time Collaboration** - WebSocket untuk update real-time
3. **Analytics Dashboard** - Visualisasi analytics lanjutan
4. **Multi-language Support** - Dukungan bahasa daerah
5. **Offline Maps** - Integrasi peta offline
6. **Photo Capture** - Unggah foto dokumentasi
7. **Digital Signature** - Tanda tangan digital
8. **Notification System** - Push notifications
9. **Audit Trail** - Log audit lengkap
10. **Data Validation** - Validasi rules yang lebih kompleks

---

## 📞 Kontak & Dukungan

Untuk pertanyaan atau bantuan mengenai aplikasi ini, silakan hubungi:

- **Email**: [ BPS Tana Tidung ]
- **Website**: [bpsktt.com]

---

## 📄 Lisensi

Project ini adalah proprietary software milik Badan Pusat Statistik (BPS).

---

<div align="center">
  
  **Made with ❤️ by Ezra for BPS Indonesia**
  
  *CANTIK v2.1.0 - Computer-Assisted Personal Interviewing for Indonesia*

</div>
