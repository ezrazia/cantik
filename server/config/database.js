/**
 * @module server/config/database
 * Konfigurasi koneksi database MySQL menggunakan connection pool.
 * Semua kredensial diambil dari environment variables (.env file).
 *
 * Pool pattern digunakan agar koneksi dapat di-reuse secara efisien
 * tanpa perlu membuka/menutup koneksi setiap kali ada request.
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Connection pool MySQL.
 * Menggunakan environment variables untuk keamanan kredensial.
 *
 * @type {import('mysql2/promise').Pool}
 *
 * @example
 * import pool from './config/database.js';
 *
 * const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'desa_cantik',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Menguji koneksi ke database.
 * Dipanggil saat server pertama kali dijalankan untuk memastikan
 * konfigurasi database sudah benar.
 *
 * @returns {Promise<boolean>} True jika koneksi berhasil.
 * @throws {Error} Jika koneksi gagal.
 */
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
}

export default pool;
