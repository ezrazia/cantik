import prisma from './config/database.js';

async function main() {
  const activityId = 6;
  const questions = await prisma.formQuestion.findMany({
    where: {
      form_blok: { kegiatan_id: activityId },
      skip_logic: { not: null }
    },
    include: { form_blok: true }
  });

  console.log("All questions with skip logic in activity 6:");
  questions.forEach(q => {
    console.log(`ID: ${q.id} | Kode: ${q.form_blok.kode} | Label: ${q.label.substring(0, 40)}`);
    console.log(`  skip_logic: ${q.skip_logic} | skip_target: ${q.skip_target}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
