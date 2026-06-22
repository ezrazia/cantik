import prisma from './config/database.js';

async function main() {
  const blocks = await prisma.formBlok.findMany({
    where: { kegiatan_id: 10 },
    orderBy: { sort_order: 'asc' }
  });

  console.log("Blocks in DB ordered by sort_order asc:");
  blocks.forEach(b => {
    console.log(`ID: ${b.id} | Kode: ${b.kode} | Title: ${b.title} | Sort Order: ${b.sort_order}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
