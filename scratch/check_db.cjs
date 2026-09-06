const pool = require('../server/config/database');

async function check() {
  const [kegiatan] = await pool.query('SELECT id, name, status, desa FROM kegiatan');
  console.log('Kegiatan Aktif di Database:');
  console.table(kegiatan);

  const [desas] = await pool.query('SELECT id, username, desa, role FROM users WHERE role = "admin_desa" ORDER BY desa ASC');
  console.log(`\nTotal Akun Admin Desa: ${desas.length}`);
  console.table(desas.map(d => ({ ID: d.id, Desa: d.desa, Username: d.username, PasswordDefault: 'admin123' })));

  process.exit(0);
}

check().catch(console.error);
