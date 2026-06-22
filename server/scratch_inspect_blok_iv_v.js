import prisma from './config/database.js';

async function main() {
  const activityId = 10;
  const blocks = await prisma.formBlok.findMany({
    where: { kegiatan_id: activityId },
    orderBy: { sort_order: 'asc' }
  });

  const blockIV = blocks.find(b => b.kode.includes("Blok IV"));
  const blockV = blocks.find(b => b.kode.includes("Blok V"));

  console.log("BLOCK IV:", blockIV);
  if (blockIV) {
    const qs = await prisma.formQuestion.findMany({
      where: { blok_id: blockIV.id },
      orderBy: { sort_order: 'asc' }
    });
    console.log("BLOCK IV Questions:");
    qs.forEach(q => console.log(`  ID: ${q.id} | parent_id: ${q.parent_id} | Label: ${q.label} | validation: ${q.validation}`));
  }

  console.log("\nBLOCK V:", blockV);
  if (blockV) {
    const qs = await prisma.formQuestion.findMany({
      where: { blok_id: blockV.id },
      orderBy: { sort_order: 'asc' }
    });
    console.log("BLOCK V Questions:");
    qs.forEach(q => console.log(`  ID: ${q.id} | parent_id: ${q.parent_id} | Label: ${q.label} | validation: ${q.validation}`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
