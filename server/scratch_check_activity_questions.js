import prisma from './config/database.js';

async function main() {
  const activities = await prisma.kegiatan.findMany();
  console.log("Activities:", activities.map(a => ({ id: a.id, name: a.name })));

  for (const act of activities) {
    console.log(`\n=========================================`);
    console.log(`Activity: ${act.name} (ID: ${act.id})`);
    console.log(`=========================================`);
    
    const blocks = await prisma.formBlok.findMany({
      where: { kegiatan_id: act.id },
      orderBy: { sort_order: 'asc' }
    });
    
    for (const block of blocks) {
      console.log(`\n  Block: ${block.kode} | ID: ${block.id}`);
      const qs = await prisma.formQuestion.findMany({
        where: { blok_id: block.id },
        orderBy: { sort_order: 'asc' }
      });
      console.log(`  Questions count: ${qs.length}`);
      // Print first 5 questions of this block
      qs.slice(0, 5).forEach(q => {
        console.log(`    - ID: ${q.id} | parent_id: ${q.parent_id} | Label: ${q.label} | validation: ${q.validation}`);
      });
      if (qs.length > 5) {
        console.log(`    ... and ${qs.length - 5} more questions`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
