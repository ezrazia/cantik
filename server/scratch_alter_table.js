import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'desa_cantik'
  });

  try {
    console.log("Altering form_question table...");
    await conn.execute("ALTER TABLE form_question MODIFY COLUMN type ENUM('text','number','select','radio','date','textarea','location','note','pcl','pml','search','signature') DEFAULT 'text';");
    
    // Also, update any existing question named 'Tanda Tangan' to be type 'signature'
    console.log("Updating existing Tanda Tangan questions...");
    const [result] = await conn.execute("UPDATE form_question SET type = 'signature' WHERE label LIKE '%Tanda Tangan%';");
    console.log(`Updated ${result.affectedRows} rows.`);
    console.log("Success!");
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await conn.end();
  }
}

run();
