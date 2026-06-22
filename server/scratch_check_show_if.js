import prisma from './config/database.js';

async function main() {
  const activityId = 6;
  
  const blocks = await prisma.formBlok.findMany({
    where: { kegiatan_id: activityId },
    orderBy: { sort_order: 'asc' }
  });
  
  const questions = await prisma.formQuestion.findMany({
    where: { blok_id: { in: blocks.map(b => b.id) } }
  });

  const blockV = blocks.find(b => b.kode.includes("Blok V"));
  if (!blockV) {
    console.log("Block V not found");
    return;
  }

  const blockVQs = questions.filter(q => q.blok_id === blockV.id);
  console.log(`Questions in Blok V for Activity 6: ${blockVQs.length}`);
  
  blockVQs.forEach(q => {
    const showIf = q.show_if_value || q.showIfValue;
    const showIfParent = q.show_if_parent_id || q.showIfParentId;
    if (showIf || showIfParent) {
      console.log(`Question ID: ${q.id} | Label: ${q.label}`);
      console.log(`  show_if_value: ${showIf}`);
      console.log(`  show_if_parent_id: ${showIfParent}`);
      if (showIfParent) {
        const parentQ = questions.find(x => x.id === showIfParent);
        if (parentQ) {
          console.log(`  parent question: ID ${parentQ.id} | Label: ${parentQ.label} | Block ID: ${parentQ.blok_id}`);
        }
      }
      console.log(`---`);
    }
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
