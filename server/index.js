/**
 * @module server
 * Entry point untuk backend Express server aplikasi Desa Cantik.
 *
 * Server ini menyediakan REST API untuk komunikasi dengan frontend React
 * dan mengelola koneksi ke database MySQL (via XAMPP).
 *
 * Cara menjalankan:
 *   1. cd server
 *   2. npm install
 *   3. Salin .env.example ke .env dan isi kredensial
 *   4. npm run dev
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import { testConnection } from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

/* ─── Middleware ────────────────────────────────────── */

/** Mengizinkan request dari frontend (Vite dev server). */
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

/** Parse JSON request body. */
app.use(express.json());

/* ─── Routes ───────────────────────────────────────── */

app.use('/api', routes);

/* ─── Start Server ─────────────────────────────────── */

/**
 * Menjalankan server dan menguji koneksi database.
 * Jika koneksi database gagal, server tetap berjalan dengan peringatan.
 */
async function start() {
  try {
    await testConnection();
  } catch {
    console.warn('⚠️  Server berjalan tanpa koneksi database.');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
  });
}

start();
