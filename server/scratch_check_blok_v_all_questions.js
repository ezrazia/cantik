import prisma from './config/database.js';

async function main() {
  const activityId = 10;
  const blockV = await prisma.formBlok.findFirst({
    where: { kegiatan_id: activityId, kode: 'Blok V' }
  });

  if (blockV) {
    const qs = await prisma.formQuestion.findMany({
      where: { blok_id: blockV.id },
      orderBy: { sort_order: 'asc' }
    });
    console.log(`Questions in Blok V (ID: ${blockV.id}):`);
    qs.forEach(q => {
      console.log(`  ID: ${q.id} | parent_id: ${q.parent_id} | Label: ${q.label.substring(0, 40)} | show_if_parent_id: ${q.show_if_parent_id} | show_if_value: ${q.show_if_value}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
