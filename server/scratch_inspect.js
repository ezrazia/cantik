import prisma from './config/database.js';

async function main() {
  const activityId = 10;
  const blocks = await prisma.formBlok.findMany({
    where: { kegiatan_id: activityId }
  });
  const blockV = blocks.find(b => b.kode.includes("Blok V") || b.title.includes("Blok V"));
  if (!blockV) {
    console.log("Block V not found");
    return;
  }
  
  const questions = await prisma.formQuestion.findMany({
    where: { blok_id: blockV.id }
  });
  
  console.log(`Questions in Block V (ID ${blockV.id}):`);
  for (const q of questions) {
    console.log({
      id: q.id,
      parent_id: q.parent_id,
      label: q.label,
      validation: q.validation
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
