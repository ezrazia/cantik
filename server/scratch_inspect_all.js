import prisma from './config/database.js';

async function main() {
  const activityId = 10;
  const blocks = await prisma.formBlok.findMany({
    where: { kegiatan_id: activityId },
    orderBy: { sort_order: 'asc' }
  });

  for (const block of blocks) {
    console.log(`\n=======================`);
    console.log(`BLOCK: ${block.kode} - ${block.title} (ID: ${block.id})`);
    console.log(`=======================`);
    
    const questions = await prisma.formQuestion.findMany({
      where: { blok_id: block.id },
      orderBy: { sort_order: 'asc' }
    });
    
    for (const q of questions) {
      console.log(`  ID: ${q.id} | parent_id: ${q.parent_id} | Label: ${q.label.substring(0, 80)}`);
      if (q.validation) console.log(`    Validation: ${q.validation}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
