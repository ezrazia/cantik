import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. Give Herman a PML role
  const herman = await prisma.petugas.findFirst({ where: { username: 'limbu.herman' } });
  if (herman) {
    const kegiatan = await prisma.kegiatan.findFirst({ where: { name: 'Sensus Penduduk Limbu Sedulun' }}); // actually we can just find any doc's kegiatan_id
    const sampleDoc = await prisma.dokumen.findFirst({ where: { is_prelist: true, desa: { contains: 'Limbu Sedulun' } } });
    if (sampleDoc) {
      await prisma.petugasKegiatan.upsert({
        where: { uk_petugas_kegiatan: { petugas_id: herman.id, kegiatan_id: sampleDoc.kegiatan_id } },
        update: { role: 'PML' },
        create: { petugas_id: herman.id, kegiatan_id: sampleDoc.kegiatan_id, role: 'PML' }
      });
      console.log('Role PML Herman diperbarui.');
    }
  }

  // 2. Fix Indah Ayu Andiani
  const badIndah1 = await prisma.petugas.findFirst({ where: { username: 'limbu.indah' } });
  const goodIndah1 = await prisma.petugas.findFirst({ where: { username: 'limbu.indahayu' } });
  if (badIndah1 && goodIndah1) {
    const docs = await prisma.dokumen.findMany({ where: { petugas_id: badIndah1.id } });
    for (const doc of docs) {
      await prisma.dokumen.update({ where: { id: doc.id }, data: { petugas_id: goodIndah1.id } });
      
      // Make sure goodIndah1 has a PetugasKegiatan with pengawas = Herman
      await prisma.petugasKegiatan.upsert({
        where: { uk_petugas_kegiatan: { petugas_id: goodIndah1.id, kegiatan_id: doc.kegiatan_id } },
        update: { pengawas: herman.name },
        create: { petugas_id: goodIndah1.id, kegiatan_id: doc.kegiatan_id, role: 'PCL', pengawas: herman.name }
      });
    }
    console.log('Dokumen limbu.indah dipindahkan ke limbu.indahayu');
  }

  // 3. Fix Indah Sekar
  const badIndah2 = await prisma.petugas.findFirst({ where: { username: 'limbu.indah2' } });
  const goodIndah2 = await prisma.petugas.findFirst({ where: { username: 'limbu.indahsekar' } });
  if (badIndah2 && goodIndah2) {
    const docs = await prisma.dokumen.findMany({ where: { petugas_id: badIndah2.id } });
    for (const doc of docs) {
      await prisma.dokumen.update({ where: { id: doc.id }, data: { petugas_id: goodIndah2.id } });
      
      await prisma.petugasKegiatan.upsert({
        where: { uk_petugas_kegiatan: { petugas_id: goodIndah2.id, kegiatan_id: doc.kegiatan_id } },
        update: { pengawas: herman.name },
        create: { petugas_id: goodIndah2.id, kegiatan_id: doc.kegiatan_id, role: 'PCL', pengawas: herman.name }
      });
    }
    console.log('Dokumen limbu.indah2 dipindahkan ke limbu.indahsekar');
  }

  // Optional: delete bad accounts if we want
  // await prisma.petugas.deleteMany({ where: { username: { in: ['limbu.indah', 'limbu.indah2'] } } });
}

main().catch(console.error).finally(() => prisma.$disconnect());
