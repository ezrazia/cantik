# Informasi Proyek: Desa Cantik (CAPI BPS)

Aplikasi **CAPI BPS (Computer-Assisted Personal Interviewing)** untuk program **Desa Cantik (Desa Cinta Statistik)** adalah sebuah platform pencatatan dan pengelolaan survei berbasis web. Aplikasi ini dirancang agar responsif, modern, dan mendukung produktivitas baik di sisi petugas lapangan (pendataan) maupun administrator (pengawasan dan manajemen).

---

## 🛠️ Teknologi & Framework yang Digunakan

Proyek ini menggunakan arsitektur *Client-Server* dengan pemisahan antara aplikasi *Frontend* (antarmuka pengguna) dan *Backend* (penyedia API dan database). 

### 1. Frontend (Antarmuka Pengguna)
Aplikasi frontend dibangun menggunakan ekosistem React modern yang berfokus pada kecepatan dan performa antarmuka.
- **Framework & Library Utama**:
  - **React (v19.2.5)**: Library antarmuka berbasis komponen generasi terbaru.
  - **Vite**: *Build tool* dan *Development server* yang sangat cepat.
- **Styling & UI**:
  - **Tailwind CSS (v4.3.0)**: *Utility-first CSS framework* untuk desain UI yang responsif dan elegan secara dinamis.
  - **Lucide React**: Kumpulan ikon modern, konsisten, dan ringan.
  - **Recharts**: Library pembuatan grafik dan visualisasi data interaktif pada dashboard.
- **Arsitektur Utama**: *Single Page Application (SPA)*.

### 2. Backend (Server & API)
Backend berfungsi sebagai pusat kontrol data, logika bisnis, dan penyedia RESTful API bagi aplikasi Frontend.
- **Runtime & Framework**:
  - **Node.js (ES Modules)**: Runtime JavaScript di sisi server yang asinkron dan efisien.
  - **Express.js (v5.1.0)**: Framework web server Node.js yang minimalis dan cepat.
- **Database & Integrasi**:
  - **MySQL2**: Driver *database* berbasis Promise untuk menghubungkan aplikasi ke server MySQL.
  - **CORS & Dotenv**: Untuk penanganan kontrol akses lintas domain dan manajemen *environment variable*.

---

## 🚀 Fitur-Fitur Utama

Proyek ini menyediakan dua mode operasional (Tampilan) berdasarkan jenis pengguna:

### A. Fitur Administrator (Admin)
Platform pusat bagi penyelia (PML) dan administrator dalam mengelola operasional sensus/survei.
- **Dashboard Eksekutif**: Ringkasan progres pencacahan secara *real-time* dengan visualisasi grafis (Recharts) serta daftar aktivitas.
- **Manajemen & Master Petugas**: Mengatur daftar petugas yang ditugaskan, memantau *status* keaktifan (Progres/Selesai), dan mengalokasikan lokasi survei per desa.
- **Review Data**: Validasi hasil pencacahan petugas yang masuk. Admin dapat melakukan penyetujuan (*Approve*), menunggu, atau menolak kiriman berdasarkan standar data. List *pre-list* (daftar nama keluarga yang disurvei) juga tersedia di dalam menu ini.
- **Form Builder**: Pembuat *template* kuisioner secara dinamis (*drag-and-drop*) yang nantinya akan digunakan oleh petugas lapangan untuk survei.

### B. Fitur Petugas Lapangan
Aplikasi dengan antarmuka *mobile-friendly* yang dirancang untuk pengumpulan data langsung di lapangan.
- **Kuisioner Dinamis**: Pengisian form survei sesuai dengan format yang telah dibuat oleh Admin di *Form Builder*.
- **Manajemen Draft & Offline**: Petugas dapat menyimpan progres survei sebagai *Draft* jika belum selesai. Mendukung sinkronisasi (*Sync*) pengiriman massal saat koneksi internet memadai.
- **Monitoring Progres**: Petugas dapat melihat seberapa jauh pencapaian target survei yang telah dilakukan.

---

## 📂 Struktur Folder Utama

Proyek diatur ke dalam dua entitas besar: Frontend (`/src`) dan Backend (`/server`).

```text
Node-Project/
├── Informasi.md               # File dokumentasi utama ini (Root)
└── cantik/                    # Folder Utama Proyek (Frontend & Backend)
    ├── package.json           # Konfigurasi dependensi Frontend (React/Vite/Tailwind)
    ├── vite.config.js         # Konfigurasi *bundler* Vite
    │
    ├── src/                   # 💻 SOURCE CODE FRONTEND
    │   ├── assets/            # File aset statis (gambar, font, ilustrasi)
    │   ├── components/        # Komponen React yang dapat digunakan ulang (Reusable UI)
    │   ├── constants/         # Variabel konstanta global (seperti Data Dummy / mockData.js)
    │   ├── hooks/             # Custom React Hooks (misal: useDropdown, useAutoSave)
    │   ├── pages/             # Komponen level Halaman (Pages)
    │   │   ├── admin/         # Kumpulan halaman Admin (Dashboard, Master Petugas, dll)
    │   │   ├── petugas/       # Kumpulan halaman Petugas Lapangan
    │   │   └── auth/          # Halaman Otentikasi (Login/Register)
    │   ├── styles/            # File CSS atau utilitas styling khusus
    │   ├── utils/             # Fungsi *helper* bantuan (format data, dll)
    │   ├── App.jsx            # Komponen Router & Root Layout
    │   └── main.jsx           # *Entry point* (titik masuk) aplikasi React
    │
    └── server/                # ⚙️ SOURCE CODE BACKEND
        ├── package.json       # Konfigurasi dependensi Backend (Express/MySQL2)
        ├── .env.example       # Contoh variabel lingkungan untuk koneksi DB
        ├── config/            # Konfigurasi infrastruktur (Koneksi Database)
        ├── routes/            # Definisi REST API *Endpoints* (Routing HTTP)
        └── index.js           # *Entry point* server Express
```

---

*Dokumen ini merupakan pedoman dasar struktural dan fungsionalitas dari Proyek Desa Cantik untuk keperluan tim pengembang dan manajemen proyek.*
