import prisma from './config/database.js';

async function main() {
  const kegiatan = await prisma.kegiatan.findMany();
  console.log("Kegiatan in DB:");
  kegiatan.forEach(k => {
    console.log(`ID: ${k.id} | Name: ${k.name} | Status: ${k.status}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
