import prisma from './config/database.js';

async function main() {
  const docs = await prisma.dokumen.findMany();
  console.log("Documents in DB:");
  docs.forEach(d => {
    console.log(`ID: ${d.id} | Kode: ${d.kode} | KRT: ${d.krt} | Kegiatan ID: ${d.kegiatan_id} | Status: ${d.status}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
