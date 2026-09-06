import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const kegiatan = await prisma.kegiatan.findMany({
    select: { id: true, name: true, status: true, desa: true, fokus: true }
  });
  console.log('--- KEGIATAN AKTIF DI DATABASE ---');
  console.table(kegiatan);

  const desas = await prisma.user.findMany({
    where: { role: 'admin_desa' },
    select: { id: true, username: true, desa: true, kecamatan: true },
    orderBy: { desa: 'asc' }
  });
  console.log(`\n--- TOTAL AKUN ADMIN DESA: ${desas.length} DESA ---`);
  console.table(desas.map(d => ({ ID: d.id, Desa: d.desa, Kecamatan: d.kecamatan, Username: d.username, PasswordDefault: 'admin123' })));

  await prisma.$disconnect();
}

check().catch(console.error);
