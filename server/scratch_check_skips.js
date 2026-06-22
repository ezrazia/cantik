import prisma from './config/database.js';

async function main() {
  const activityId = 10;
  const questions = await prisma.formQuestion.findMany({
    where: { form_blok: { kegiatan_id: activityId } },
    include: { form_blok: true }
  });

  const blockIVQs = questions.filter(q => q.form_blok.kode === "Blok IV");
  console.log("Block IV Questions Skip/Show-If Logic:");
  blockIVQs.forEach(q => {
    console.log(`ID: ${q.id} | Label: ${q.label.substring(0, 40)}`);
    console.log(`  skip_logic: ${q.skip_logic} | skip_target: ${q.skip_target}`);
    console.log(`  show_if_parent_id: ${q.show_if_parent_id} | show_if_value: ${q.show_if_value}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
