/**
 * @module server/config/database
 * Konfigurasi koneksi database menggunakan Prisma Client.
 * Semua kredensial diambil dari environment variables (.env file).
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Singleton instance Prisma Client.
 */
const prisma = new PrismaClient({
  log: ['info', 'warn', 'error'],
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
    await prisma.$connect();
    console.log('✅ Database connected successfully via Prisma');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed via Prisma:', error.message);
    throw error;
  }
}

export default prisma;
