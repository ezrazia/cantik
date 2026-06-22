import prisma from './config/database.js';

async function main() {
  const activityId = 10;
  const questions = await prisma.formQuestion.findMany({
    where: {
      form_blok: { kegiatan_id: activityId }
    },
    include: {
      form_blok: true
    }
  });

  const r400s = questions.filter(q => {
    let code = "";
    if (q.validation) {
      try {
        const parsed = JSON.parse(q.validation);
        code = parsed.custom_code || parsed.customCode || "";
      } catch (e) {}
    }
    const label = q.label || "";
    return code.startsWith("4") || label.includes("R40") || label.includes("R41") || label.includes("R.4");
  });

  console.log(`Found ${r400s.length} potential R400 questions:`);
  for (const q of r400s) {
    console.log({
      id: q.id,
      blok_id: q.blok_id,
      blok_kode: q.form_blok.kode,
      blok_title: q.form_blok.title,
      label: q.label,
      validation: q.validation
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
