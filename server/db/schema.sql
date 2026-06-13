-- =============================================
-- DESA CANTIK (CAPI BPS) — Database Schema
-- MySQL 8.x / MariaDB 10.x
-- =============================================

-- Buat database jika belum ada
CREATE DATABASE IF NOT EXISTS desa_cantik
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE desa_cantik;

-- =============================================
-- 1. ADMIN — Akun administrator (1 akun)
-- =============================================
CREATE TABLE IF NOT EXISTS admin (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(50)  NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  nama        VARCHAR(100) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =============================================
-- 2. PETUGAS — Petugas lapangan
-- =============================================
CREATE TABLE IF NOT EXISTS petugas (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(50)  NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  name        VARCHAR(100) NOT NULL,
  nik         VARCHAR(20)  DEFAULT NULL,
  phone       VARCHAR(20)  DEFAULT NULL,
  desa        VARCHAR(100) DEFAULT NULL,
  target      INT          DEFAULT 0,
  selesai     INT          DEFAULT 0,
  last_sync   DATETIME     DEFAULT NULL,
  status      ENUM('active','done','inactive') DEFAULT 'active',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_petugas_status (status),
  INDEX idx_petugas_desa (desa)
) ENGINE=InnoDB;

-- =============================================
-- 3. KEGIATAN — Aktivitas/proyek survei
-- =============================================
CREATE TABLE IF NOT EXISTS kegiatan (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  description TEXT         DEFAULT NULL,
  progress    INT          DEFAULT 0,
  color       VARCHAR(30)  DEFAULT 'bg-blue-600',
  text_color  VARCHAR(30)  DEFAULT 'text-blue-600',
  bg_color    VARCHAR(30)  DEFAULT 'bg-blue-50',
  start_date  DATE         DEFAULT NULL,
  status      ENUM('draft','published','uji_coba','selesai') DEFAULT 'draft',
  lokus       JSON         DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_kegiatan_status (status)
) ENGINE=InnoDB;

-- =============================================
-- 4. PETUGAS_KEGIATAN — Junction (petugas ↔ kegiatan)
-- =============================================
CREATE TABLE IF NOT EXISTS petugas_kegiatan (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  petugas_id      INT NOT NULL,
  kegiatan_id     INT NOT NULL,
  role            ENUM('PCL','PML') DEFAULT 'PCL',
  sls_assignments JSON     DEFAULT NULL,
  pengawas        VARCHAR(100) DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_petugas_kegiatan (petugas_id, kegiatan_id),
  INDEX idx_pk_kegiatan (kegiatan_id),

  CONSTRAINT fk_pk_petugas
    FOREIGN KEY (petugas_id) REFERENCES petugas(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_pk_kegiatan
    FOREIGN KEY (kegiatan_id) REFERENCES kegiatan(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================
-- 5. WILAYAH — Referensi wilayah flat
-- =============================================
CREATE TABLE IF NOT EXISTS wilayah (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  kecamatan     VARCHAR(100) NOT NULL,
  desa          VARCHAR(100) NOT NULL,
  sls           VARCHAR(100) DEFAULT NULL,
  sub_sls       VARCHAR(100) DEFAULT NULL,
  kode_wilayah  VARCHAR(16) DEFAULT NULL,
  kdprov        VARCHAR(2) DEFAULT NULL,
  kdkab         VARCHAR(2) DEFAULT NULL,
  kdkec         VARCHAR(3) DEFAULT NULL,
  kddesa        VARCHAR(3) DEFAULT NULL,
  kdsls         VARCHAR(4) DEFAULT NULL,
  kdsubsls      VARCHAR(2) DEFAULT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_wilayah_kecamatan (kecamatan),
  INDEX idx_wilayah_desa (desa),
  INDEX idx_wilayah_kode (kode_wilayah)
) ENGINE=InnoDB;

-- =============================================
-- 6. DESA_KEGIATAN — Stats target/selesai per desa per kegiatan
-- =============================================
CREATE TABLE IF NOT EXISTS desa_kegiatan (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  kegiatan_id INT NOT NULL,
  desa        VARCHAR(100) NOT NULL,
  target      INT DEFAULT 0,
  selesai     INT DEFAULT 0,
  color       VARCHAR(10)  DEFAULT '#2563eb',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_desa_kegiatan (kegiatan_id, desa),

  CONSTRAINT fk_dk_kegiatan
    FOREIGN KEY (kegiatan_id) REFERENCES kegiatan(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================
-- 7. FORM_BLOK — Blok kuesioner per kegiatan
-- =============================================
CREATE TABLE IF NOT EXISTS form_blok (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  kegiatan_id INT NOT NULL,
  kode        VARCHAR(20)  NOT NULL,
  title       VARCHAR(150) NOT NULL,
  sort_order  INT          DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_fb_kegiatan (kegiatan_id),

  CONSTRAINT fk_fb_kegiatan
    FOREIGN KEY (kegiatan_id) REFERENCES kegiatan(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================
-- 8. FORM_QUESTION — Pertanyaan per blok
-- =============================================
CREATE TABLE IF NOT EXISTS form_question (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  blok_id     INT NOT NULL,
  parent_id   INT DEFAULT NULL,
  label       VARCHAR(300) NOT NULL,
  type        ENUM('text','number','select','radio','date','textarea','location','note','pcl','pml') DEFAULT 'text',
  required    BOOLEAN DEFAULT FALSE,
  options     JSON DEFAULT NULL,
  validation  TEXT DEFAULT NULL,
  skip_logic  TEXT DEFAULT NULL,
  skip_target INT DEFAULT NULL,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_fq_blok (blok_id),
  INDEX idx_fq_parent (parent_id),

  CONSTRAINT fk_fq_blok
    FOREIGN KEY (blok_id) REFERENCES form_blok(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_fq_parent
    FOREIGN KEY (parent_id) REFERENCES form_question(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================
-- 9. DOKUMEN — Header dokumen RT
-- =============================================
CREATE TABLE IF NOT EXISTS dokumen (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  kode          VARCHAR(20)  NOT NULL UNIQUE,
  kegiatan_id   INT NOT NULL,
  petugas_id    INT NOT NULL,
  krt           VARCHAR(100) DEFAULT NULL,
  alamat        VARCHAR(200) DEFAULT NULL,
  kecamatan     VARCHAR(100) DEFAULT NULL,
  desa          VARCHAR(100) DEFAULT NULL,
  sls           VARCHAR(100) DEFAULT NULL,
  sub_sls       VARCHAR(100) DEFAULT NULL,
  status        ENUM('draft','tersimpan','terkirim') DEFAULT 'draft',
  review_status ENUM('draft','approved','rejected') DEFAULT 'draft',
  flag          INT DEFAULT 0,
  is_prelist    BOOLEAN DEFAULT FALSE,
  sync          BOOLEAN DEFAULT FALSE,
  last_sent_data JSON DEFAULT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_dok_kegiatan (kegiatan_id),
  INDEX idx_dok_petugas (petugas_id),
  INDEX idx_dok_status (status),
  INDEX idx_dok_review (review_status),

  CONSTRAINT fk_dok_kegiatan
    FOREIGN KEY (kegiatan_id) REFERENCES kegiatan(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_dok_petugas
    FOREIGN KEY (petugas_id) REFERENCES petugas(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================
-- 10. DOKUMEN_JAWABAN — Jawaban dinamis (EAV)
-- =============================================
CREATE TABLE IF NOT EXISTS dokumen_jawaban (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  dokumen_id  INT NOT NULL,
  question_id INT NOT NULL,
  value       TEXT DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_dok_jawaban (dokumen_id, question_id),
  INDEX idx_dj_question (question_id),

  CONSTRAINT fk_dj_dokumen
    FOREIGN KEY (dokumen_id) REFERENCES dokumen(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_dj_question
    FOREIGN KEY (question_id) REFERENCES form_question(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================
-- 11. DOKUMEN_LOG — Activity log per dokumen
-- =============================================
CREATE TABLE IF NOT EXISTS dokumen_log (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  dokumen_id  INT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_dl_dokumen (dokumen_id),

  CONSTRAINT fk_dl_dokumen
    FOREIGN KEY (dokumen_id) REFERENCES dokumen(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
