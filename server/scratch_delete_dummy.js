import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.petugasKegiatan.deleteMany({
    where: {
      petugas: {
        username: { in: ['limbu.indah', 'limbu.indah2'] }
      }
    }
  });

  await prisma.petugas.deleteMany({
    where: {
      username: { in: ['limbu.indah', 'limbu.indah2'] }
    }
  });
  console.log('Akun duplikat berhasil dihapus.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
