import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const petugasList = await prisma.petugas.findMany({
    take: 5
  });
  console.log('Petugas:');
  petugasList.forEach(p => {
    console.log(`- ID: ${p.id}, Username: ${p.username}, Name: ${p.name}`);
  });

  const kegiatanList = await prisma.kegiatan.findMany({
    take: 5
  });
  console.log('\nKegiatan:');
  kegiatanList.forEach(k => {
    console.log(`- ID: ${k.id}, Name: ${k.name}`);
  });

  const documents = await prisma.dokumen.findMany({
    take: 5
  });
  console.log('\nDocuments:');
  documents.forEach(d => {
    console.log(`- ID: ${d.id}, Kode: ${d.kode}, KegiatanID: ${d.kegiatan_id}, PetugasID: ${d.petugas_id}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
