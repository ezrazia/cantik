import prisma from './config/database.js';

async function main() {
  const kegiatan = await prisma.kegiatan.findMany();
  for (const k of kegiatan) {
    const docCount = await prisma.dokumen.count({ where: { kegiatan_id: k.id } });
    const prelistCount = await prisma.dokumen.count({ where: { kegiatan_id: k.id, is_prelist: true } });
    console.log(`Kegiatan ID ${k.id} (${k.name}): ${docCount} total docs, ${prelistCount} prelist docs`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
